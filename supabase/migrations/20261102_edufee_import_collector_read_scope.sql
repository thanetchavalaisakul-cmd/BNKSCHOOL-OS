-- Finance managers/leaders may view full imported ledgers.
-- Collection staff may only see matched 2569 term1 students in their authorized classes.
DROP POLICY IF EXISTS edufee_import_read ON public.edufee_import_rows;
CREATE POLICY edufee_import_read ON public.edufee_import_rows FOR SELECT TO authenticated
USING (
 public.edufee_is_manager()
 OR public.edufee_is_leader()
 OR (
   academic_year='2569' AND student_id IS NOT NULL
   AND EXISTS (
    SELECT 1 FROM public.student_enrollments e
    WHERE e.student_id=edufee_import_rows.student_id
      AND e.academic_year='2569' AND e.semester=1
      AND e.enrollment_status='active'
      AND public.edufee_can_collect(e.class_id)
   )
 )
);
DROP POLICY IF EXISTS edufee_import_receipt_read ON public.edufee_import_receipts;
CREATE POLICY edufee_import_receipt_read ON public.edufee_import_receipts FOR SELECT TO authenticated
USING (
 public.edufee_is_manager()
 OR public.edufee_is_leader()
 OR EXISTS (
  SELECT 1 FROM public.edufee_import_rows r
  JOIN public.student_enrollments e ON e.student_id=r.student_id
  WHERE r.id=edufee_import_receipts.import_row_id
    AND r.academic_year='2569'
    AND e.academic_year='2569'
    AND e.semester=1 AND e.enrollment_status='active'
    AND public.edufee_can_collect(e.class_id)
 )
);
