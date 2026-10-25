-- BNK School OS v5.12.9.9 : Admin Data Center Phase 2 (strict limited reset)
-- INSTALL AFTER v5.12.9.8. NO DATA RESET IS EXECUTED BY INSTALLING THIS MIGRATION.
-- IMPORTANT: student registry, auth, school_classes, exam scores, payments, documents are NEVER mutation targets.
BEGIN;

-- Private state: cannot be queried or written directly through public REST API.
CREATE TABLE IF NOT EXISTS private.admin_data_reset_previews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 actor_id uuid NOT NULL,
 scope_code text NOT NULL CHECK(scope_code IN ('preschool_units','preschool_roster')),
 academic_year integer NOT NULL,
 semester smallint NOT NULL,
 preview_count integer NOT NULL CHECK(preview_count >= 0),
 breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
 issued_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
 consumed_at timestamptz
);
CREATE TABLE IF NOT EXISTS private.admin_data_reset_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 preview_id uuid NOT NULL UNIQUE REFERENCES private.admin_data_reset_previews(id),
 actor_id uuid NOT NULL,
 scope_code text NOT NULL,
 academic_year integer NOT NULL,
 semester smallint NOT NULL,
 deleted_records integer NOT NULL,
 breakdown jsonb NOT NULL,
 backup_reference text NOT NULL,
 backup_self_confirmed boolean NOT NULL,
 executed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_data_reset_history_time_idx ON private.admin_data_reset_history(executed_at DESC);
ALTER TABLE private.admin_data_reset_previews ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.admin_data_reset_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.admin_data_reset_previews,private.admin_data_reset_history FROM PUBLIC,anon,authenticated;

-- A small immutable allowlist. Aborts if another migration adds inbound FKs or triggers.
CREATE OR REPLACE FUNCTION private.admin_reset_check_target(p_table text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_oid oid;
BEGIN
 IF p_table NOT IN ('preschool_shared_weekly_units','preschool_weekly_units','preschool_staff_roster') THEN
   RAISE EXCEPTION 'Target table is not reset-allowlisted' USING ERRCODE='42501';
 END IF;
 SELECT c.oid INTO v_oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relname=p_table AND c.relkind='r';
 IF v_oid IS NULL THEN RAISE EXCEPTION 'Required table not found: %',p_table; END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_constraint WHERE confrelid=v_oid AND contype='f') THEN
   RAISE EXCEPTION 'Reset refused: another table references %',p_table USING ERRCODE='23503';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid=v_oid AND NOT tgisinternal) THEN
   RAISE EXCEPTION 'Reset refused: new trigger found on %',p_table USING ERRCODE='42501';
 END IF;
END $fn$;
REVOKE ALL ON FUNCTION private.admin_reset_check_target(text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.admin_data_center_reset_preview(
 p_scope text,p_academic_year integer,p_semester integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_a integer:=0;v_b integer:=0;v_id uuid;v_detail jsonb;
BEGIN
 IF NOT (SELECT private.is_super_admin()) OR NOT (SELECT private.is_active_user()) THEN
   RAISE EXCEPTION 'Super Admin only' USING ERRCODE='42501';
 END IF;
 IF p_scope IS NULL OR p_scope NOT IN ('preschool_units','preschool_roster') OR p_academic_year IS NULL
 OR p_academic_year NOT BETWEEN 2500 AND 2700 OR p_semester IS NULL OR p_semester NOT BETWEEN 1 AND 3 THEN
   RAISE EXCEPTION 'Invalid reset scope or period' USING ERRCODE='22023';
 END IF;
 IF p_scope='preschool_units' THEN
   PERFORM private.admin_reset_check_target('preschool_shared_weekly_units');
   PERFORM private.admin_reset_check_target('preschool_weekly_units');
   SELECT count(*) INTO v_a FROM public.preschool_shared_weekly_units
    WHERE academic_year=p_academic_year AND semester=p_semester;
   SELECT count(*) INTO v_b FROM public.preschool_weekly_units u
    JOIN public.school_classes c ON c.id=u.class_id
    WHERE c.stage_code='early_childhood' AND c.academic_year=p_academic_year::text AND c.semester=p_semester;
   v_detail:=pg_catalog.jsonb_build_object('preschool_shared_weekly_units',v_a,'preschool_weekly_units',v_b);
 ELSE
   PERFORM private.admin_reset_check_target('preschool_staff_roster');
   SELECT count(*) INTO v_a FROM public.preschool_staff_roster WHERE academic_year=p_academic_year AND semester=p_semester;
   v_detail:=pg_catalog.jsonb_build_object('preschool_staff_roster',v_a);
 END IF;
 IF (v_a+v_b)=0 THEN
   RETURN pg_catalog.jsonb_build_object('ok',true,'empty',true,'count',0,'scope',p_scope,'breakdown',v_detail);
 END IF;
 INSERT INTO private.admin_data_reset_previews(actor_id,scope_code,academic_year,semester,preview_count,breakdown)
 VALUES(auth.uid(),p_scope,p_academic_year,p_semester,v_a+v_b,v_detail) RETURNING id INTO v_id;
 RETURN pg_catalog.jsonb_build_object('ok',true,'empty',false,'preview_id',v_id,
   'scope',p_scope,'academic_year',p_academic_year,'semester',p_semester,
   'count',v_a+v_b,'breakdown',v_detail,'expires_in_minutes',10,
   'backup_verified_automatically',false,
   'warning','ระบบไม่สามารถยืนยันไฟล์สำรองจากภายนอกได้ ต้องสำรองและทดสอบกู้คืนด้วยตนเองก่อนดำเนินการ');
END $fn$;
REVOKE ALL ON FUNCTION public.admin_data_center_reset_preview(text,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_data_center_reset_preview(text,integer,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_data_center_execute_reset(
 p_preview_id uuid,p_backup_reference text,p_backup_confirmed boolean,p_confirmation text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_preview private.admin_data_reset_previews%ROWTYPE;v_a integer:=0;v_b integer:=0;
 v_deleted_a integer:=0;v_deleted_b integer:=0;v_detail jsonb;v_history_id uuid;
BEGIN
 IF NOT (SELECT private.is_super_admin()) OR NOT (SELECT private.is_active_user()) THEN
   RAISE EXCEPTION 'Super Admin only' USING ERRCODE='42501';
 END IF;
 IF p_preview_id IS NULL THEN RAISE EXCEPTION 'Preview required' USING ERRCODE='22023'; END IF;
 SELECT * INTO v_preview FROM private.admin_data_reset_previews WHERE id=p_preview_id FOR UPDATE;
 IF NOT FOUND OR v_preview.actor_id IS DISTINCT FROM auth.uid() OR v_preview.consumed_at IS NOT NULL
   OR v_preview.expires_at<=now() THEN
   RAISE EXCEPTION 'Preview expired, used, or belongs to another user. Generate a new preview.' USING ERRCODE='42501';
 END IF;
 IF p_backup_confirmed IS DISTINCT FROM true OR length(pg_catalog.btrim(coalesce(p_backup_reference,'')))<8
   OR length(p_backup_reference)>180 THEN
   RAISE EXCEPTION 'Confirm tested backup and enter an 8-180 character backup reference' USING ERRCODE='22023';
 END IF;
 IF p_confirmation IS DISTINCT FROM ('รีเซต '||v_preview.academic_year||'/'||v_preview.semester) THEN
   RAISE EXCEPTION 'Confirmation phrase mismatch' USING ERRCODE='22023';
 END IF;
 IF v_preview.scope_code='preschool_units' THEN
   PERFORM private.admin_reset_check_target('preschool_shared_weekly_units');
   PERFORM private.admin_reset_check_target('preschool_weekly_units');
   LOCK TABLE public.school_classes IN SHARE MODE;
   LOCK TABLE public.preschool_shared_weekly_units,public.preschool_weekly_units IN SHARE ROW EXCLUSIVE MODE;
   SELECT count(*) INTO v_a FROM public.preschool_shared_weekly_units
     WHERE academic_year=v_preview.academic_year AND semester=v_preview.semester;
   SELECT count(*) INTO v_b FROM public.preschool_weekly_units u
     JOIN public.school_classes c ON c.id=u.class_id
     WHERE c.stage_code='early_childhood' AND c.academic_year=v_preview.academic_year::text AND c.semester=v_preview.semester;
   v_detail:=pg_catalog.jsonb_build_object('preschool_shared_weekly_units',v_a,'preschool_weekly_units',v_b);
 ELSIF v_preview.scope_code='preschool_roster' THEN
   PERFORM private.admin_reset_check_target('preschool_staff_roster');
   LOCK TABLE public.preschool_staff_roster IN SHARE ROW EXCLUSIVE MODE;
   SELECT count(*) INTO v_a FROM public.preschool_staff_roster
     WHERE academic_year=v_preview.academic_year AND semester=v_preview.semester;
   v_detail:=pg_catalog.jsonb_build_object('preschool_staff_roster',v_a);
 ELSE RAISE EXCEPTION 'Reset scope not allowed' USING ERRCODE='42501'; END IF;
 IF v_a+v_b<>v_preview.preview_count OR v_detail<>v_preview.breakdown THEN
    RAISE EXCEPTION 'Data changed since preview; recheck before reset' USING ERRCODE='40001';
 END IF;
 IF v_preview.scope_code='preschool_units' THEN
   DELETE FROM public.preschool_shared_weekly_units WHERE academic_year=v_preview.academic_year AND semester=v_preview.semester;
   GET DIAGNOSTICS v_deleted_a=ROW_COUNT;
   DELETE FROM public.preschool_weekly_units u WHERE EXISTS(
     SELECT 1 FROM public.school_classes c WHERE c.id=u.class_id
       AND c.stage_code='early_childhood' AND c.academic_year=v_preview.academic_year::text
       AND c.semester=v_preview.semester);
   GET DIAGNOSTICS v_deleted_b=ROW_COUNT;
 ELSE
   DELETE FROM public.preschool_staff_roster WHERE academic_year=v_preview.academic_year AND semester=v_preview.semester;
   GET DIAGNOSTICS v_deleted_a=ROW_COUNT;
 END IF;
 IF v_deleted_a+v_deleted_b<>v_preview.preview_count THEN
   RAISE EXCEPTION 'Unexpected row count; transaction rolled back' USING ERRCODE='40001';
 END IF;
 UPDATE private.admin_data_reset_previews SET consumed_at=now() WHERE id=v_preview.id;
 INSERT INTO private.admin_data_reset_history(preview_id,actor_id,scope_code,academic_year,semester,
   deleted_records,breakdown,backup_reference,backup_self_confirmed)
 VALUES(v_preview.id,auth.uid(),v_preview.scope_code,v_preview.academic_year,v_preview.semester,
   v_deleted_a+v_deleted_b,v_detail,pg_catalog.btrim(p_backup_reference),true) RETURNING id INTO v_history_id;
 RETURN pg_catalog.jsonb_build_object('ok',true,'deleted',v_deleted_a+v_deleted_b,'history_id',v_history_id,
   'scope',v_preview.scope_code,'year',v_preview.academic_year,'semester',v_preview.semester,
   'protected_student_registry_untouched',true,'backup_self_confirmed_only',true);
END $fn$;
REVOKE ALL ON FUNCTION public.admin_data_center_execute_reset(uuid,text,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_data_center_execute_reset(uuid,text,boolean,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_data_center_reset_history()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_history jsonb;
BEGIN
 IF NOT (SELECT private.is_super_admin()) OR NOT (SELECT private.is_active_user()) THEN
   RAISE EXCEPTION 'Super Admin only' USING ERRCODE='42501';
 END IF;
 SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
   'id',h.id,'scope',h.scope_code,'academic_year',h.academic_year,'semester',h.semester,
   'deleted',h.deleted_records,'executed_at',h.executed_at,'backup_reference',h.backup_reference,
   'actor_id',h.actor_id) ORDER BY h.executed_at DESC),'[]'::jsonb)
 INTO v_history
 FROM (SELECT * FROM private.admin_data_reset_history ORDER BY executed_at DESC LIMIT 100) h;
 RETURN v_history;
END $fn$;
REVOKE ALL ON FUNCTION public.admin_data_center_reset_history() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_data_center_reset_history() TO authenticated;

-- Ownership: functions are intended to be installed as database owner via Supabase SQL Editor.
COMMIT;
