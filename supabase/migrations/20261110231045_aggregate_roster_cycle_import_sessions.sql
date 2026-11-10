-- Aggregate all reviewed import sessions in a semester cycle.
-- The latest file remains the display reference, but counts represent unique
-- students across every file uploaded for that cycle.

CREATE OR REPLACE FUNCTION public.student_roster_cycle_overview(p_academic_year text DEFAULT NULL::text)
RETURNS TABLE(
 academic_year text,semester integer,due_date date,cycle_label text,cycle_status text,
 latest_session_id uuid,latest_session_status text,latest_source_filename text,
 latest_created_at timestamp with time zone,completed_at timestamp with time zone,
 missing_count integer,pending_count integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  v_year text:=nullif(btrim(coalesce(p_academic_year,'')),'');
  v_today date:=timezone('Asia/Bangkok',clock_timestamp())::date;
BEGIN
  IF auth.uid() IS NULL OR NOT private.can_manage_student_master() THEN
    RAISE EXCEPTION 'ไม่มีสิทธิ์ดูรอบการอัปเดตรายชื่อนักเรียน';
  END IF;
  IF v_year IS NULL THEN
    SELECT t.academic_year INTO v_year FROM public.academic_terms t
    WHERE t.is_current=true ORDER BY t.academic_year DESC,t.semester DESC LIMIT 1;
  END IF;
  IF v_year IS NULL THEN
    v_year:=(extract(year FROM timezone('Asia/Bangkok',clock_timestamp()))::integer+543)::text;
  END IF;
  IF v_year !~ '^[0-9]{4}$' OR v_year::integer<2500 OR v_year::integer>3000 THEN
    RAISE EXCEPTION 'ปีการศึกษาไม่ถูกต้อง';
  END IF;

  RETURN QUERY
  WITH cycles AS (
    SELECT 1::integer AS term,make_date(v_year::integer-543,6,10) AS due
    UNION ALL SELECT 2::integer,make_date(v_year::integer-543,11,10)
  ),
  ranked_sessions AS (
    SELECT s.*,
      row_number() OVER(PARTITION BY s.semester ORDER BY s.created_at DESC,s.id DESC) AS rn
    FROM public.student_import_reconciliation_sessions s
    WHERE s.academic_year=v_year
  ),
  latest AS (
    SELECT * FROM ranked_sessions WHERE rn=1
  ),
  cycle_totals AS (
    SELECT s.semester,
      count(DISTINCT i.student_id) FILTER (WHERE i.issue_type='missing_from_file')::integer AS missing_count,
      count(DISTINCT i.student_id) FILTER (
        WHERE i.issue_type='missing_from_file' AND i.resolved_at IS NULL
      )::integer AS pending_count,
      count(*) FILTER (WHERE s.status<>'reviewed')::integer AS unreviewed_sessions,
      max(s.completed_at) FILTER (WHERE s.status='reviewed') AS all_reviewed_completed_at
    FROM public.student_import_reconciliation_sessions s
    LEFT JOIN public.student_import_reconciliation_items i ON i.session_id=s.id
    WHERE s.academic_year=v_year
    GROUP BY s.semester
  )
  SELECT v_year,c.term,c.due,
    CASE WHEN c.term=1 THEN '10 มิถุนายน' ELSE '10 พฤศจิกายน' END,
    CASE
      WHEN l.id IS NULL THEN CASE WHEN v_today>=c.due THEN 'due' ELSE 'upcoming' END
      WHEN coalesce(t.unreviewed_sessions,0)=0 AND coalesce(t.pending_count,0)=0 THEN 'completed'
      ELSE 'reviewing'
    END,
    l.id,l.status,l.source_filename,l.created_at,
    CASE
      WHEN l.id IS NOT NULL AND coalesce(t.unreviewed_sessions,0)=0 AND coalesce(t.pending_count,0)=0
      THEN t.all_reviewed_completed_at
      ELSE NULL
    END,
    coalesce(t.missing_count,0)::integer,
    coalesce(t.pending_count,0)::integer
  FROM cycles c
  LEFT JOIN latest l ON l.semester=c.term
  LEFT JOIN cycle_totals t ON t.semester=c.term
  ORDER BY c.term;
END;
$function$;
REVOKE ALL ON FUNCTION public.student_roster_cycle_overview(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.student_roster_cycle_overview(text) TO authenticated;
