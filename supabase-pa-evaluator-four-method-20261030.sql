-- PA signature choice: paper is a completed evaluator decision but still needs physical ink.
ALTER TABLE public.personnel_pa_evaluator_accounts ADD COLUMN IF NOT EXISTS signature_method text NOT NULL DEFAULT 'upload';
ALTER TABLE public.personnel_pa_evaluator_accounts ADD COLUMN IF NOT EXISTS signature_method_selected_at timestamptz;
ALTER TABLE public.personnel_pa_evaluator_accounts ADD CONSTRAINT personnel_pa_evaluator_signature_method_check CHECK(signature_method IN('paper','stored','drawn','upload'));
ALTER TABLE public.personnel_pa_assessments ADD COLUMN IF NOT EXISTS evaluator_signature_method_snapshot text;
ALTER TABLE public.personnel_pa_evaluator_accounts DROP CONSTRAINT IF EXISTS personnel_pa_evaluator_signature_pair;
ALTER TABLE public.personnel_pa_evaluator_accounts ADD CONSTRAINT personnel_pa_evaluator_signature_pair CHECK(
 (signature_bucket IS NULL AND signature_path IS NULL AND signature_mime_type IS NULL)
 OR (signature_bucket='personnel-pa-signatures' AND signature_path IS NOT NULL AND signature_mime_type='image/png')
 OR (signature_bucket='signatures' AND signature_path IS NOT NULL AND signature_mime_type IN('image/png','image/jpeg','image/webp'))
);
CREATE OR REPLACE FUNCTION public.save_my_personnel_pa_evaluator_profile_signed(
 p_full_name text,p_position_title text,p_organization text,p_method text,
 p_signature_path text DEFAULT NULL,p_signature_id uuid DEFAULT NULL
) RETURNS public.personnel_pa_evaluator_accounts
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $function$
DECLARE v_uid uuid:=auth.uid(); v_row public.personnel_pa_evaluator_accounts; v_sig public.signatures%ROWTYPE; v_bucket text; v_path text; v_mime text;
BEGIN
 IF v_uid IS NULL OR NOT private.is_pa_evaluator() THEN RAISE EXCEPTION 'Permission denied'; END IF;
 IF NULLIF(BTRIM(p_full_name),'') IS NULL OR NULLIF(BTRIM(p_position_title),'') IS NULL
    OR NULLIF(BTRIM(p_organization),'') IS NULL THEN RAISE EXCEPTION 'Name, position and organization required'; END IF;
 IF p_method NOT IN ('paper','stored','drawn','upload') THEN RAISE EXCEPTION 'Invalid signature method'; END IF;
 IF p_method='stored' THEN
   IF p_signature_id IS NULL OR p_signature_path IS NOT NULL THEN RAISE EXCEPTION 'Select one saved signature'; END IF;
   SELECT * INTO v_sig FROM public.signatures s WHERE s.id=p_signature_id AND s.user_id=v_uid;
   IF v_sig.id IS NULL OR v_sig.bucket_id<>'signatures' OR v_sig.storage_path IS NULL
      OR NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id=v_sig.bucket_id AND o.name=v_sig.storage_path)
     THEN RAISE EXCEPTION 'Saved signature not found or does not belong to this evaluator'; END IF;
   v_bucket:=v_sig.bucket_id; v_path:=v_sig.storage_path;
   SELECT COALESCE(NULLIF(o.metadata->>'mimetype',''),'image/png') INTO v_mime FROM storage.objects o
    WHERE o.bucket_id=v_bucket AND o.name=v_path;
   IF v_mime NOT IN('image/png','image/jpeg','image/webp') THEN RAISE EXCEPTION 'Saved signature image type not supported'; END IF;
 ELSIF p_method='paper' THEN
   IF p_signature_id IS NOT NULL OR p_signature_path IS NOT NULL THEN RAISE EXCEPTION 'Paper selection cannot contain a digital signature'; END IF;
   v_bucket:=null;v_path:=null;v_mime:=null;
 ELSE
   IF p_signature_id IS NOT NULL OR p_signature_path IS NULL
      OR split_part(p_signature_path,'/',1)<>v_uid::text OR split_part(p_signature_path,'/',2)<>'signature'
      OR NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='personnel-pa-signatures' AND o.name=p_signature_path) THEN
      RAISE EXCEPTION 'PA evaluator signature image is missing or not owned by this account';
   END IF;
   v_bucket:='personnel-pa-signatures';v_path:=p_signature_path;v_mime:='image/png';
 END IF;
 UPDATE public.personnel_pa_evaluator_accounts
 SET full_name=btrim(p_full_name),position_title=btrim(p_position_title),
     organization=btrim(p_organization),signature_bucket=v_bucket,
     signature_path=v_path,signature_mime_type=v_mime,signature_method=p_method,
     signature_method_selected_at=now(),profile_completed_at=now(),updated_at=now()
 WHERE auth_user_id=v_uid RETURNING * INTO v_row;
 IF v_row.slot_no IS NULL THEN RAISE EXCEPTION 'PA evaluator account is not registered'; END IF;
 UPDATE public.profiles SET full_name=v_row.full_name,role='pa_evaluator',
   account_status='active',updated_at=now() WHERE id=v_uid;
 UPDATE public.personnel_pa_period_committee_members cm
 SET evaluator_name_snapshot=v_row.full_name,evaluator_position_snapshot=v_row.position_title,
     evaluator_organization_snapshot=v_row.organization,
     evaluator_signature_bucket_snapshot=v_row.signature_bucket,
     evaluator_signature_path_snapshot=v_row.signature_path,
     evaluator_signature_mime_snapshot=v_row.signature_mime_type,updated_at=now()
 WHERE cm.evaluator_user_id=v_uid
 AND NOT EXISTS(SELECT 1 FROM public.personnel_pa_assessments a WHERE a.committee_member_id=cm.id AND a.status='submitted');
 RETURN v_row;
END;
$function$;
REVOKE ALL ON FUNCTION public.save_my_personnel_pa_evaluator_profile_signed(text,text,text,text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_my_personnel_pa_evaluator_profile_signed(text,text,text,text,text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION private.personnel_pa_assessment_before_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_member public.personnel_pa_period_committee_members;
  v_report public.personnel_pa_reports;
  v_account public.personnel_pa_evaluator_accounts;
  v_key text;
  v_level integer;
  v_s1 numeric := 0;
  v_s2 numeric := 0;
  v_s1_count integer := 0;
  v_s2_count integer := 0;
  v_required1 text[] := array['1.1','1.2','1.3','1.4','1.5','1.6','1.7','1.8','2.1','2.2','2.3','2.4','3.1','3.2','3.3'];
  v_required2 text[] := array['method','quantitative','qualitative'];
begin
  if v_uid is null then raise exception 'authentication required'; end if;

  select * into v_member
  from public.personnel_pa_period_committee_members
  where id=new.committee_member_id;
  if v_member.id is null then raise exception 'annual PA2 committee member not found'; end if;
  if v_member.evaluator_user_id<>v_uid then raise exception 'this PA2 assessment belongs to another evaluator'; end if;

  select * into v_account
  from public.personnel_pa_evaluator_accounts
  where auth_user_id=v_uid;
  if v_account.profile_completed_at is null or (v_account.signature_path is null AND COALESCE(v_account.signature_method,'upload')<>'paper') then
    raise exception 'complete evaluator profile and signature before assessment';
  end if;

  select * into v_report
  from public.personnel_pa_reports r
  where r.period_id=v_member.period_id
    and r.user_id=new.evaluatee_user_id
    and r.status='submitted';
  if v_report.id is null then raise exception 'submitted end-year PA report is required before assessment'; end if;

  if tg_op='INSERT' then
    new.created_by:=v_uid;
    new.created_at:=now();
  else
    if new.committee_member_id is distinct from old.committee_member_id
       or new.evaluatee_user_id is distinct from old.evaluatee_user_id
       or new.period_id is distinct from old.period_id
       or new.pa_report_id is distinct from old.pa_report_id then
      raise exception 'PA2 assessment identity cannot be changed';
    end if;
    if old.status='submitted' then
      raise exception 'submitted PA2 assessment is locked; reset it before reassessment';
    end if;
  end if;

  if not private.personnel_pa_assessment_window_open(v_member.period_id) then
    raise exception 'PA2 assessment window is not open';
  end if;

  new.period_id:=v_member.period_id;
  new.pa_report_id:=v_report.id;
  new.entry_mode:='self';

  new.evaluator_name_snapshot:=v_account.full_name;
  new.evaluator_position_snapshot:=v_account.position_title;
  new.evaluator_organization_snapshot:=v_account.organization;
  new.committee_slot_snapshot:=v_member.slot_no;
  new.committee_role_snapshot:=v_member.member_role;
  new.evaluator_signature_bucket_snapshot:=v_account.signature_bucket;
  new.evaluator_signature_path_snapshot:=v_account.signature_path;
  new.evaluator_signature_mime_snapshot:=v_account.signature_mime_type;
  new.evaluator_signature_method_snapshot:=coalesce(v_account.signature_method,'upload');

  new.entered_by:=v_uid;
  new.updated_by:=v_uid;
  new.updated_at:=now();

  if jsonb_typeof(coalesce(new.section1_levels,'{}'::jsonb))<>'object'
     or jsonb_typeof(coalesce(new.section2_levels,'{}'::jsonb))<>'object' then
    raise exception 'invalid PA2 rubric data';
  end if;

  select count(*) into v_s1_count
  from jsonb_each(coalesce(new.section1_levels,'{}'::jsonb));

  select count(*) into v_s2_count
  from jsonb_each(coalesce(new.section2_levels,'{}'::jsonb));

  for v_key,v_level in
    select key,(value #>> '{}')::integer
    from jsonb_each(coalesce(new.section1_levels,'{}'::jsonb))
  loop
    if not(v_key=any(v_required1)) or v_level not between 1 and 4 then
      raise exception 'invalid section 1 rubric level';
    end if;
    v_s1:=v_s1+v_level;
  end loop;

  for v_key,v_level in
    select key,(value #>> '{}')::integer
    from jsonb_each(coalesce(new.section2_levels,'{}'::jsonb))
  loop
    if not(v_key=any(v_required2)) or v_level not between 1 and 4 then
      raise exception 'invalid section 2 rubric level';
    end if;
    if v_key='method' then
      v_s2:=v_s2+(v_level*5);
    else
      v_s2:=v_s2+(v_level*2.5);
    end if;
  end loop;

  if new.status='submitted' then
    if new.workload_compliant is null then raise exception 'workload compliance decision is required'; end if;
    if v_s1_count<>15 then raise exception 'all 15 section 1 indicators must be assessed'; end if;
    if v_s2_count<>3 then raise exception 'all 3 section 2 criteria must be assessed'; end if;

    foreach v_key in array v_required1 loop
      if not(new.section1_levels?v_key) then raise exception 'missing section 1 indicator %',v_key; end if;
    end loop;

    foreach v_key in array v_required2 loop
      if not(new.section2_levels?v_key) then raise exception 'missing section 2 criterion %',v_key; end if;
    end loop;

    new.submitted_at:=now();
  end if;

  new.section1_total:=v_s1;
  new.section2_total:=v_s2;
  new.total_score:=v_s1+v_s2;
  new.passed:=coalesce(new.workload_compliant,false) and (v_s1+v_s2)>=70;
  return new;

exception
  when invalid_text_representation then
    raise exception 'rubric levels must be integers from 1 to 4';
end;
$function$;

DROP POLICY IF EXISTS pa_evaluator_saved_signature_view ON storage.objects;
CREATE POLICY pa_evaluator_saved_signature_view ON storage.objects FOR SELECT TO authenticated
USING(bucket_id='signatures' AND EXISTS(
 SELECT 1 FROM public.personnel_pa_assessments a
 WHERE a.evaluator_signature_bucket_snapshot=objects.bucket_id
 AND a.evaluator_signature_path_snapshot=objects.name
 AND a.status='submitted'
 AND (a.evaluatee_user_id=auth.uid() OR a.entered_by=auth.uid() OR private.can_review_personnel_pa())
));
