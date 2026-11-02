# Parent column repair and certificate approval PDF

Confirmed: 625 students. A specific historic import shifted parent columns in 610 rows; 609 can be unambiguously repaired, 1 ambiguous row needs manual investigation. 15 other rows already correct.

A private backup contains the old 609 records; anonymous and authenticated Data API roles have no access to this backup. Migration guards ensure only exact matching rows are repaired. Missing guardian surnames are not invented.

Father and mother name, surname and occupation are restored to separate fields. Disadvantage status is restored from the misplaced field. Future imports with this specific shifted layout are corrected before saving.

Previously submitted and approved school documents are not mutated; the interface strips recognized trailing occupation words from historic name snapshots only. This preserves original approval audit.

The three certificate PDF signoff cells use a flex layout with reserved signer area and no clipping of wrapped names. CSS version and application version updated. 184 regression tests passed in sandbox.

Still require acceptance test with real browser PDF export, including signed document images and Thai glyphs.