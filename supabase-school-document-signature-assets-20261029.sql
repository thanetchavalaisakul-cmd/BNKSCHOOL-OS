
-- Show a signer's private signature image only on documents the viewer
-- is already authorized to read. Never expose the rest of their signature library.
DROP POLICY IF EXISTS school_document_signature_assets_read ON storage.objects;
CREATE POLICY school_document_signature_assets_read
ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id='signatures' AND EXISTS(
    SELECT 1
    FROM public.school_document_signatures d
    JOIN public.signatures s ON s.id=d.signature_id
    WHERE s.bucket_id=objects.bucket_id AND s.storage_path=objects.name
      AND private.can_view_school_document_signatures(
        d.document_kind,d.document_id,d.document_date
      )
  )
);
