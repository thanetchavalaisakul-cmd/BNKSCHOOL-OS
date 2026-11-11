-- Use a temporary number range disjoint from both the current 1,000,000+ range
-- and the final 1..N range while the class is being renumbered.
CREATE OR REPLACE FUNCTION private.renumber_student_class(p_class_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
begin
  -- Phase 1: move active numbers into a reserved high range to avoid unique-index collisions.
  with ranked as (
    select e.id,
           row_number() over (
             order by
               case
                 when lower(coalesce(s.gender,'')) in ('male','m','ชาย') then 0
                 when lower(coalesce(s.gender,'')) in ('female','f','หญิง') then 1
                 else 2
               end,
               case when s.student_code ~ '^[0-9]+$' then s.student_code::integer else 999999999 end,
               s.student_code,
               s.id
           ) as rn
    from public.student_enrollments e
    join public.students s on s.id=e.student_id
    where e.class_id=p_class_id
      and e.enrollment_status='active'
  )
  update public.student_enrollments e
  set student_number=2000000000+ranked.rn
  from ranked
  where e.id=ranked.id;

  -- Phase 2: apply the global BNK order: boys first, then girls, student code ascending.
  with ranked as (
    select e.id,
           row_number() over (
             order by
               case
                 when lower(coalesce(s.gender,'')) in ('male','m','ชาย') then 0
                 when lower(coalesce(s.gender,'')) in ('female','f','หญิง') then 1
                 else 2
               end,
               case when s.student_code ~ '^[0-9]+$' then s.student_code::integer else 999999999 end,
               s.student_code,
               s.id
           ) as rn
    from public.student_enrollments e
    join public.students s on s.id=e.student_id
    where e.class_id=p_class_id
      and e.enrollment_status='active'
  )
  update public.student_enrollments e
  set student_number=ranked.rn
  from ranked
  where e.id=ranked.id;
end;
$function$
;