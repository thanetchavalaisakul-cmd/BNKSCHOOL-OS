-- Historical fee plan from the supplied 2568 Google Sheet.
-- This is scoped to edufee only, not the student registry/academic terms.
-- No changes to any settings for academic year 2569 semester 2.
INSERT INTO public.edufee_cycles(academic_year,category,cycle,updated_by)
VALUES
 ('2568','tuition','semester','244418ff-7ae9-4536-a69e-243bec5c432d'::uuid),
 ('2568','water','annual','244418ff-7ae9-4536-a69e-243bec5c432d'::uuid),
 ('2568','deposit','annual','244418ff-7ae9-4536-a69e-243bec5c432d'::uuid)
ON CONFLICT(academic_year,category) DO NOTHING;

INSERT INTO public.edufee_rates(academic_year,semester,category,amount,updated_by)
VALUES
 ('2568',0,'tuition',0,'244418ff-7ae9-4536-a69e-243bec5c432d'::uuid),
 ('2568',1,'tuition',170,'244418ff-7ae9-4536-a69e-243bec5c432d'::uuid),
 ('2568',2,'tuition',170,'244418ff-7ae9-4536-a69e-243bec5c432d'::uuid),
 ('2568',0,'water',20,'244418ff-7ae9-4536-a69e-243bec5c432d'::uuid),
 ('2568',1,'water',0,'244418ff-7ae9-4536-a69e-243bec5c432d'::uuid),
 ('2568',2,'water',0,'244418ff-7ae9-4536-a69e-243bec5c432d'::uuid),
 ('2568',0,'deposit',0,'244418ff-7ae9-4536-a69e-243bec5c432d'::uuid),
 ('2568',1,'deposit',0,'244418ff-7ae9-4536-a69e-243bec5c432d'::uuid),
 ('2568',2,'deposit',0,'244418ff-7ae9-4536-a69e-243bec5c432d'::uuid)
ON CONFLICT(academic_year,semester,category) DO NOTHING;

INSERT INTO public.edufee_windows(academic_year,semester,category,enabled,updated_by)
VALUES
 ('2568',1,'tuition',true,'244418ff-7ae9-4536-a69e-243bec5c432d'::uuid),
 ('2568',2,'tuition',true,'244418ff-7ae9-4536-a69e-243bec5c432d'::uuid),
 ('2568',1,'water',true,'244418ff-7ae9-4536-a69e-243bec5c432d'::uuid),
 ('2568',2,'water',false,'244418ff-7ae9-4536-a69e-243bec5c432d'::uuid),
 ('2568',1,'deposit',false,'244418ff-7ae9-4536-a69e-243bec5c432d'::uuid),
 ('2568',2,'deposit',false,'244418ff-7ae9-4536-a69e-243bec5c432d'::uuid)
ON CONFLICT(academic_year,semester,category) DO NOTHING;

-- Only turn 2569 TERM ONE collection back on; do not update term two rows.
UPDATE public.edufee_windows
 SET enabled=true,updated_by='244418ff-7ae9-4536-a69e-243bec5c432d'::uuid,updated_at=clock_timestamp()
 WHERE academic_year='2569' AND semester=1
   AND category IN ('tuition','water') AND enabled=false;
