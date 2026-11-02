-- Preschool substitute coverage: dated acknowledgement and central-signature export.
-- Existing acknowledgements are never re-dated or impersonated.
ALTER TABLE public.preschool_group_cover_members
 ADD COLUMN IF NOT EXISTS ack_signature_method text,
 ADD COLUMN IF NOT EXISTS ack_signature_id uuid REFERENCES public.signatures(id) ON DELETE SET NULL,
 ADD COLUMN IF NOT EXISTS ack_signed_at timestamptz;
ALTER TABLE public.preschool_group_cover_members
 DROP CONSTRAINT IF EXISTS preschool_cover_member_signature_method_check;
ALTER TABLE public.preschool_group_cover_members
 ADD CONSTRAINT preschool_cover_member_signature_method_check
 CHECK (ack_signature_method IS NULL OR ack_signature_method IN ('stored','drawn','upload','paper'));

CREATE OR REPLACE FUNCTION private.can_read_preschool_cover_signature(p_cover uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='pg_catalog','public','private'
AS $bnk$
 SELECT private.is_active_user() AND EXISTS(
   SELECT 1 FROM public.preschool_group_covers g
   WHERE g.id=p_cover AND g.status='active'
    AND (g.absent_teacher_id=(SELECT auth.uid())
      OR private.can_manage_timetable_class(g.class_id)
      OR private.current_role() IN ('director','super_admin')
      OR EXISTS(SELECT 1 FROM public.preschool_group_cover_members m
                WHERE m.cover_id=g.id AND m.teacher_id=(SELECT auth.uid()))
      OR EXISTS(SELECT 1 FROM public.preschool_staff_roster r
                WHERE r.teacher_id=(SELECT auth.uid())
                  AND r.academic_year=g.academic_year AND r.semester=g.semester)
    )
 );
$bnk$;
REVOKE ALL ON FUNCTION private.can_read_preschool_cover_signature(uuid) FROM PUBLIC,anon,authenticated;

-- Only staff who previously acknowledged are eligible; explicit paper signatures
-- remain blank, and historical acknowledgements can use the current saved image.
CREATE OR REPLACE FUNCTION public.get_preschool_cover_signature_assets(p_cover_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path='pg_catalog','public','private'
AS $bnk$
DECLARE result jsonb;
BEGIN
 IF NOT private.can_read_preschool_cover_signature(p_cover_id) THEN
   RAISE EXCEPTION 'No permission to view this preschool coverage document';
 END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'teacher_id',m.teacher_id,
      'acknowledged_at',m.acknowledged_at,
      'method',COALESCE(m.ack_signature_method,'profile'),
      'signed_at',m.ack_signed_at,
      'signature_created_at',sig.created_at,
      'bucket_id',sig.bucket_id,
      'storage_path',sig.storage_path,
      'source_kind',CASE WHEN m.ack_signature_method IS NULL THEN 'profile_current' ELSE 'confirmed' END
   ) ORDER BY m.teacher_name),'[]'::jsonb)
 INTO result
 FROM public.preschool_group_cover_members m
 LEFT JOIN public.user_signature_preferences prefs ON prefs.user_id=m.teacher_id
 LEFT JOIN LATERAL(
   SELECT s.id,s.bucket_id,s.storage_path,s.created_at
   FROM public.signatures s
   WHERE s.user_id=m.teacher_id
     AND (
       (m.ack_signature_method IS NULL
        AND COALESCE(prefs.preferred_method,'saved')<>'paper')
       OR
       (m.ack_signature_method IN ('stored','drawn','upload') AND s.id=m.ack_signature_id)
     )
   ORDER BY
     CASE WHEN m.ack_signature_id IS NOT NULL AND s.id=m.ack_signature_id THEN 0
          WHEN prefs.default_signature_id IS NOT NULL AND s.id=prefs.default_signature_id THEN 1
          WHEN s.is_default THEN 2 ELSE 3 END,
     s.created_at DESC
   LIMIT 1
 ) sig ON m.ack_signature_method IS DISTINCT FROM 'paper'
 WHERE m.cover_id=p_cover_id
   AND m.acknowledged_at IS NOT NULL
   AND m.is_available AND m.is_current_staff;
 RETURN result;
END;
$bnk$;
REVOKE ALL ON FUNCTION public.get_preschool_cover_signature_assets(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_preschool_cover_signature_assets(uuid) TO authenticated;

-- The signature storage is private: grant SELECT for this exact document's
-- acknowledged staff image only, not general access to a user's saved signatures.
CREATE OR REPLACE FUNCTION private.can_read_preschool_cover_signature_storage(p_bucket text,p_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='pg_catalog','public','private'
AS $bnk$
  SELECT private.is_active_user()
    AND p_bucket='signatures'
    AND EXISTS (
      SELECT 1
      FROM public.preschool_group_cover_members m
      JOIN public.preschool_group_covers g ON g.id=m.cover_id
      JOIN public.signatures s ON s.user_id=m.teacher_id
        AND s.bucket_id=p_bucket AND s.storage_path=p_path
      LEFT JOIN public.user_signature_preferences prefs ON prefs.user_id=m.teacher_id
      WHERE m.acknowledged_at IS NOT NULL
        AND m.is_available AND m.is_current_staff
        AND (
          (m.ack_signature_method IS NULL
           AND COALESCE(prefs.preferred_method,'saved')<>'paper'
           AND s.id=COALESCE(prefs.default_signature_id,
                  (SELECT ss.id FROM public.signatures ss
                   WHERE ss.user_id=m.teacher_id
                   ORDER BY ss.is_default DESC,ss.created_at DESC LIMIT 1)))
          OR
          (m.ack_signature_method IN ('stored','drawn','upload')
            AND s.id=m.ack_signature_id)
        )
        AND private.can_read_preschool_cover_signature(g.id)
     );
$bnk$;
REVOKE ALL ON FUNCTION private.can_read_preschool_cover_signature_storage(text,text) FROM PUBLIC,anon,authenticated;

DROP POLICY IF EXISTS bnk_preschool_acknowledged_signatures_read ON storage.objects;
CREATE POLICY bnk_preschool_acknowledged_signatures_read
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='signatures'
       AND private.can_read_preschool_cover_signature_storage(bucket_id,name));

-- New confirmations may select one of the four central signature methods.
-- This function uses the established acknowledgement RPC to preserve all its
-- leave and staff-availability checks, inside the SAME transaction.
CREATE OR REPLACE FUNCTION public.acknowledge_preschool_group_cover_signed(
 p_cover_id uuid, p_acknowledge boolean, p_method text DEFAULT 'stored', p_signature_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path='pg_catalog','public','private'
AS $bnk$
DECLARE sig record; result jsonb; v_signed_at timestamptz;
BEGIN
 IF NOT private.is_active_user() OR auth.uid() IS NULL THEN RAISE EXCEPTION 'Permission denied'; END IF;
 IF p_acknowledge THEN
   IF p_method NOT IN ('stored','drawn','upload','paper') THEN
     RAISE EXCEPTION 'กรุณาเลือกวิธีลงลายเซ็น';
   END IF;
   IF p_method<>'paper' THEN
     SELECT id,source INTO sig
     FROM public.signatures
     WHERE id=p_signature_id AND user_id=auth.uid();
     IF sig.id IS NULL THEN RAISE EXCEPTION 'ต้องใช้ลายเซ็นที่เป็นของบัญชีตนเอง'; END IF;
     IF p_method IN ('drawn','upload') AND sig.source<>p_method THEN
       RAISE EXCEPTION 'วิธีลายเซ็นไม่ตรงกับภาพที่เลือก';
     END IF;
     v_signed_at:=now();
   END IF;
 END IF;
 result:=public.acknowledge_preschool_group_cover(p_cover_id,p_acknowledge);
 UPDATE public.preschool_group_cover_members
 SET ack_signature_method=CASE WHEN p_acknowledge THEN p_method ELSE NULL END,
     ack_signature_id=CASE WHEN p_acknowledge AND p_method<>'paper' THEN p_signature_id ELSE NULL END,
     ack_signed_at=CASE WHEN p_acknowledge AND p_method<>'paper' THEN v_signed_at ELSE NULL END
 WHERE cover_id=p_cover_id AND teacher_id=auth.uid()
   AND is_available AND is_current_staff;
 RETURN result;
END;
$bnk$;
REVOKE ALL ON FUNCTION public.acknowledge_preschool_group_cover_signed(uuid,boolean,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.acknowledge_preschool_group_cover_signed(uuid,boolean,text,uuid) TO authenticated;
