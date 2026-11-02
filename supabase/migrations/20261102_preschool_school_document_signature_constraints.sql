-- Existing central document-signature table supports leave and substitute.
-- Extend its exact-check constraints for preschool acknowledgement ONLY.
-- The leave and substitute conditions remain identical.
ALTER TABLE public.school_document_signatures
 DROP CONSTRAINT IF EXISTS school_document_signatures_document_kind_check;
ALTER TABLE public.school_document_signatures
 ADD CONSTRAINT school_document_signatures_document_kind_check
 CHECK (document_kind IN ('leave','substitute','preschool'));
ALTER TABLE public.school_document_signatures
 DROP CONSTRAINT IF EXISTS school_doc_signatures_kind_date_ck;
ALTER TABLE public.school_document_signatures
 ADD CONSTRAINT school_doc_signatures_kind_date_ck
 CHECK (
    (document_kind='leave' AND document_date=DATE '1900-01-01')
    OR (document_kind='substitute' AND document_date<>DATE '1900-01-01')
    OR (document_kind='preschool' AND document_date<>DATE '1900-01-01')
 );