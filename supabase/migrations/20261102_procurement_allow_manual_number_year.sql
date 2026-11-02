-- BNK SCHOOL OS: fiscal-year filter stays 2570; user-entered numbers may be 1/2569.
-- Keep all pre-existing permission checks, linkage by parent ID, same-series uniqueness
-- scoped to fiscal year, and audit/history behavior. Numeric portions update counters.
-- No procurement data rows are modified by this migration.
CREATE OR REPLACE FUNCTION public.create_procurement_control_number(p_series text, p_control_year integer, p_primary_number text, p_secondary_number text DEFAULT NULL::text, p_subject text DEFAULT NULL::text, p_parent_control_id uuid DEFAULT NULL::uuid, p_procurement_kind text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS procurement_control_numbers
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_primary_text text;
  v_secondary_text text;
  v_primary integer;
  v_secondary integer;
  v_primary_year integer;
  v_secondary_year integer;
  v_subject text;
  v_kind text;
  v_parent public.procurement_control_numbers;
  v_row public.procurement_control_numbers;
begin
  if (select auth.uid()) is null or not (select private.has_procurement_module_access('control')) then
    raise exception 'permission denied';
  end if;

  if p_series not in ('request_approval','order','purchase_order','disbursement','inventory_issue') then
    raise exception 'invalid series';
  end if;
  if p_control_year < 2500 or p_control_year > 3000 then
    raise exception 'invalid control year';
  end if;

  v_primary_text := translate(btrim(coalesce(p_primary_number,'')), '๐๑๒๓๔๕๖๗๘๙', '0123456789');
  if v_primary_text !~ '^[0-9]+/[0-9]{4}$' then
    raise exception 'รูปแบบเลขคุมไม่ถูกต้อง กรุณากรอกเช่น 1/2569';
  end if;
  v_primary := split_part(v_primary_text,'/',1)::integer;
  v_primary_year := split_part(v_primary_text,'/',2)::integer;
  if v_primary < 1 then raise exception 'เลขคุมต้องมากกว่า 0'; end if;
  -- Entered number year is independent from fiscal-year grouping.
  v_primary_text := v_primary::text || '/' || v_primary_year::text;

  if p_series = 'request_approval' then
    v_secondary_text := translate(btrim(coalesce(p_secondary_number,'')), '๐๑๒๓๔๕๖๗๘๙', '0123456789');
    if v_secondary_text !~ '^[0-9]+/[0-9]{4}$' then
      raise exception 'กรุณากรอกเลขอนุมัติ เช่น 2/2569';
    end if;
    v_secondary := split_part(v_secondary_text,'/',1)::integer;
    v_secondary_year := split_part(v_secondary_text,'/',2)::integer;
    if v_secondary < 1 then raise exception 'เลขอนุมัติต้องมากกว่า 0'; end if;
    v_secondary_text := v_secondary::text || '/' || v_secondary_year::text;
    if v_secondary_text = v_primary_text then
      raise exception 'เลขรายงานและเลขอนุมัติต้องไม่ซ้ำกัน';
    end if;
  else
    v_secondary := null;
    v_secondary_text := null;
  end if;

  if p_series='request_approval' then
    v_subject:=nullif(btrim(coalesce(p_subject,'')),'');
    if v_subject is null then raise exception 'subject is required'; end if;
    if p_procurement_kind not in ('purchase','hire') then raise exception 'procurement kind is required'; end if;
    if p_parent_control_id is not null then raise exception 'Set 1 must not have a parent control'; end if;
    v_kind:=p_procurement_kind;
  elsif p_series='inventory_issue' then
    v_subject:=nullif(btrim(coalesce(p_subject,'')),'');
    if v_subject is null then raise exception 'subject is required'; end if;
    if p_parent_control_id is not null then raise exception 'Set 5 is independent and must not have a parent control'; end if;
    v_kind:=null;
  else
    if p_parent_control_id is null then raise exception 'parent control is required'; end if;
    select * into v_parent
    from public.procurement_control_numbers
    where id=p_parent_control_id
      and series='request_approval'
      and control_year=p_control_year
      and status='active'
    for update;
    if not found then raise exception 'active parent control not found'; end if;

    if exists(
      select 1
      from public.procurement_control_numbers
      where parent_control_id=v_parent.id
        and series=p_series
        and status='active'
    ) then
      raise exception 'active child number already exists for this subject and series';
    end if;
    v_subject:=v_parent.subject;
    v_kind:=v_parent.procurement_kind;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('procurement-control:' || p_series || ':' || p_control_year::text, 0)
  );

  if exists (
    select 1
    from public.procurement_control_numbers n
    where n.series=p_series
      and n.control_year=p_control_year
      and n.status='active'
      and (
        n.primary_number=v_primary_text
        or n.secondary_number=v_primary_text
        or (
          v_secondary_text is not null
          and (n.primary_number=v_secondary_text or n.secondary_number=v_secondary_text)
        )
      )
  ) then
    raise exception 'เลขคุมนี้มีรายการที่ใช้งานอยู่แล้วในชุดและปีงบประมาณเดียวกัน';
  end if;

  insert into public.procurement_control_series_settings(
    series,control_year,start_number,last_number,updated_by,updated_at
  )
  values(
    p_series,p_control_year,1,greatest(v_primary,coalesce(v_secondary,0)),(select auth.uid()),clock_timestamp()
  )
  on conflict(series,control_year) do update
  set last_number=greatest(
        public.procurement_control_series_settings.last_number,
        excluded.last_number
      ),
      updated_by=(select auth.uid()),
      updated_at=clock_timestamp();

  insert into public.procurement_control_numbers(
    series,control_year,primary_sequence,secondary_sequence,
    primary_number,secondary_number,subject,procurement_kind,
    parent_control_id,status,notes,created_by,updated_by
  ) values(
    p_series,p_control_year,v_primary,v_secondary,
    v_primary_text,v_secondary_text,v_subject,v_kind,
    p_parent_control_id,'active',nullif(btrim(coalesce(p_notes,'')),''),
    (select auth.uid()),(select auth.uid())
  )
  returning * into v_row;

  return v_row;
end;
$function$
;
