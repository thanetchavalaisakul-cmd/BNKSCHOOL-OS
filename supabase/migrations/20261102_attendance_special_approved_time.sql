-- BNK SCHOOL OS — pre-authorized special attendance time (FY/academic years unaffected).
-- The signed GPS/QR/Face check-in timestamp is never changed. The approved working
-- time is separately stored and used for the ordinary on-time assessment/report.
CREATE TABLE public.official_attendance_special_permissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.profiles(id),
 attendance_date date NOT NULL,
 credited_time time without time zone NOT NULL,
 reason text NOT NULL,
 is_active boolean NOT NULL DEFAULT true,
 created_by uuid NOT NULL REFERENCES public.profiles(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid NOT NULL REFERENCES public.profiles(id),
 updated_at timestamptz NOT NULL DEFAULT now(),
 revoked_by uuid REFERENCES public.profiles(id),
 revoked_at timestamptz,
 CONSTRAINT official_attendance_special_permissions_unique UNIQUE (user_id,attendance_date),
 CONSTRAINT special_permission_reason_length CHECK (char_length(reason) BETWEEN 3 AND 500),
 CONSTRAINT special_permission_revocation CHECK (
   (is_active AND revoked_by IS NULL AND revoked_at IS NULL)
   OR (NOT is_active AND revoked_by IS NOT NULL AND revoked_at IS NOT NULL))
);
CREATE INDEX official_attendance_special_permissions_date_idx
 ON public.official_attendance_special_permissions(attendance_date,is_active);

CREATE TABLE private.official_attendance_special_permission_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 permission_id uuid NOT NULL REFERENCES public.official_attendance_special_permissions(id),
 action text NOT NULL CHECK (action IN ('create','edit','revoke')),
 before_data jsonb,
 after_data jsonb,
 actor_id uuid NOT NULL REFERENCES public.profiles(id),
 action_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE private.official_attendance_special_permission_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.official_attendance_special_permission_audit FROM PUBLIC,anon,authenticated;

ALTER TABLE public.official_attendance_special_permissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.official_attendance_special_permissions FROM PUBLIC,anon,authenticated;
GRANT SELECT ON TABLE public.official_attendance_special_permissions TO authenticated;
CREATE POLICY official_attendance_special_read
 ON public.official_attendance_special_permissions
 FOR SELECT TO authenticated
 USING (user_id=(select auth.uid()) OR private.can_manage_official_attendance());

ALTER TABLE public.official_attendance_records
 ADD COLUMN credited_checkin_time time without time zone,
 ADD COLUMN special_permission_id uuid REFERENCES public.official_attendance_special_permissions(id);

CREATE OR REPLACE FUNCTION public.save_official_attendance_special_permission(
 p_user_id uuid, p_date date, p_time time without time zone, p_reason text
) RETURNS public.official_attendance_special_permissions
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE
 v_row public.official_attendance_special_permissions%rowtype;
 v_old public.official_attendance_special_permissions%rowtype;
 v_reason text:=btrim(coalesce(p_reason,''));
 v_today date:=(clock_timestamp() at time zone 'Asia/Bangkok')::date;
BEGIN
 IF NOT private.can_manage_official_attendance() THEN RAISE EXCEPTION 'ไม่มีสิทธิ์จัดการการลงเวลาพิเศษ'; END IF;
 IF p_user_id IS NULL OR NOT private.is_operational_workflow_user(p_user_id) THEN
   RAISE EXCEPTION 'บุคลากรที่เลือกไม่อยู่ในระบบลงเวลาราชการ';
 END IF;
 IF p_date IS NULL OR p_date < v_today OR p_date > v_today+366 THEN
   RAISE EXCEPTION 'กำหนดได้เฉพาะวันนี้หรือวันล่วงหน้าไม่เกินหนึ่งปี';
 END IF;
 IF p_time IS NULL THEN RAISE EXCEPTION 'กรุณากำหนดเวลาที่ได้รับการรับรอง'; END IF;
 IF char_length(v_reason)<3 OR char_length(v_reason)>500 THEN
   RAISE EXCEPTION 'กรุณาระบุภารกิจหรือเหตุผล 3–500 ตัวอักษร';
 END IF;
 -- Serialize concurrent approval edits/check-ins for this personnel/day.
 PERFORM pg_advisory_xact_lock(hashtextextended('special-attendance:'||p_user_id::text||':'||p_date::text,0));
 IF EXISTS(SELECT 1 FROM public.official_attendance_records r
           WHERE r.user_id=p_user_id AND r.attendance_date=p_date) THEN
   RAISE EXCEPTION 'บุคลากรลงเวลาแล้ว ไม่สามารถเปลี่ยนการรับรองย้อนหลังได้';
 END IF;
 IF EXISTS(SELECT 1 FROM public.official_attendance_duty_records d
           WHERE d.user_id=p_user_id AND d.duty_date=p_date) THEN
   RAISE EXCEPTION 'วันนี้บันทึกไปราชการแบบยกเว้นลงเวลาไว้แล้ว';
 END IF;
 SELECT * INTO v_old FROM public.official_attendance_special_permissions
  WHERE user_id=p_user_id AND attendance_date=p_date FOR UPDATE;
 INSERT INTO public.official_attendance_special_permissions(
   user_id,attendance_date,credited_time,reason,created_by,updated_by,
   is_active,revoked_by,revoked_at)
 VALUES(p_user_id,p_date,p_time,v_reason,(select auth.uid()),(select auth.uid()),true,null,null)
 ON CONFLICT(user_id,attendance_date) DO UPDATE
 SET credited_time=excluded.credited_time,reason=excluded.reason,
     updated_by=(select auth.uid()),updated_at=now(),
     is_active=true,revoked_by=null,revoked_at=null
 RETURNING * INTO v_row;
 INSERT INTO private.official_attendance_special_permission_audit(
   permission_id,action,before_data,after_data,actor_id)
 VALUES(v_row.id,CASE WHEN v_old.id IS NULL THEN 'create' ELSE 'edit' END,
        CASE WHEN v_old.id IS NULL THEN NULL ELSE to_jsonb(v_old) END,
        to_jsonb(v_row),(select auth.uid()));
 RETURN v_row;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.revoke_official_attendance_special_permission(
 p_user_id uuid, p_date date
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE
 v_old public.official_attendance_special_permissions%rowtype;
 v_row public.official_attendance_special_permissions%rowtype;
BEGIN
 IF NOT private.can_manage_official_attendance() THEN RAISE EXCEPTION 'ไม่มีสิทธิ์จัดการการลงเวลาพิเศษ'; END IF;
 IF p_user_id IS NULL OR p_date IS NULL THEN RAISE EXCEPTION 'โปรดเลือกบุคลากรและวันที่'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('special-attendance:'||p_user_id::text||':'||p_date::text,0));
 IF EXISTS(SELECT 1 FROM public.official_attendance_records
     WHERE user_id=p_user_id AND attendance_date=p_date) THEN
   RAISE EXCEPTION 'ลงเวลาแล้ว ไม่สามารถยกเลิกสิทธิ์ย้อนหลังได้';
 END IF;
 SELECT * INTO v_old FROM public.official_attendance_special_permissions
   WHERE user_id=p_user_id AND attendance_date=p_date AND is_active FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบสิทธิ์ลงเวลาพิเศษที่ยังใช้งานอยู่'; END IF;
 UPDATE public.official_attendance_special_permissions
 SET is_active=false,revoked_by=(select auth.uid()),revoked_at=clock_timestamp(),
     updated_by=(select auth.uid()),updated_at=clock_timestamp()
 WHERE id=v_old.id RETURNING * INTO v_row;
 INSERT INTO private.official_attendance_special_permission_audit(
   permission_id,action,before_data,after_data,actor_id)
 VALUES(v_row.id,'revoke',to_jsonb(v_old),to_jsonb(v_row),(select auth.uid()));
 RETURN true;
END;
$fn$;

REVOKE ALL ON FUNCTION public.save_official_attendance_special_permission(uuid,date,time,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_official_attendance_special_permission(uuid,date,time,text) TO authenticated;
REVOKE ALL ON FUNCTION public.revoke_official_attendance_special_permission(uuid,date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_official_attendance_special_permission(uuid,date) TO authenticated;

CREATE OR REPLACE FUNCTION private.apply_official_attendance_special_permission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_perm public.official_attendance_special_permissions%rowtype;
BEGIN
 -- Check-in is always a real verified visit, never generated by this feature.
 PERFORM pg_advisory_xact_lock(hashtextextended(
  'special-attendance:'||NEW.user_id::text||':'||NEW.attendance_date::text,0));
 SELECT * INTO v_perm FROM public.official_attendance_special_permissions
  WHERE user_id=NEW.user_id AND attendance_date=NEW.attendance_date AND is_active
  FOR SHARE;
 -- Reject forged "approved" fields in arbitrary inserts.
 NEW.credited_checkin_time:=NULL;
 NEW.special_permission_id:=NULL;
 IF FOUND THEN
   NEW.credited_checkin_time:=v_perm.credited_time;
   NEW.special_permission_id:=v_perm.id;
   NEW.status:='on_time';
 END IF;
 RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION private.apply_official_attendance_special_permission() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER zz_official_attendance_special_checkin
 BEFORE INSERT ON public.official_attendance_records
 FOR EACH ROW EXECUTE FUNCTION private.apply_official_attendance_special_permission();

COMMENT ON COLUMN public.official_attendance_records.checkin_at IS
 'Actual authenticated GPS/QR/Face check-in timestamp; never replaced by approved-time adjustments';
COMMENT ON COLUMN public.official_attendance_records.credited_checkin_time IS
 'Recognized working time authorized BEFORE actual check-in; not the physical arrival timestamp';
