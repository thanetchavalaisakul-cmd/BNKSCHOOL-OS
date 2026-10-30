# BNK SCHOOL OS — Modularization architecture (v5.12.9.58)

The legacy app.js entry point keeps shared state, permissions, central signatures, routing and core services. Refactoring splits exactly 35 original functions by source boundaries into 12 independent lazy-loaded modules under modules/. The original function bodies are preserved byte-for-byte, with dependencies provided explicitly through feature factories.

Feature groups: academic-report-pdf, academic-dialogs, personnel-dialogs, timetable-dialogs, student-dialogs, dashboard-events, procurement-pdf-templates, procurement-dialogs, academic-forms, school-lunch-dialogs, learning-source-dialogs, exam-dialogs.

The event binder is loaded and awaited on first dashboard render. PDF templates are loaded only when exporting a document. Dialog modules load on demand. Shared authorization / signing RPC semantics and database are unchanged.

Before: app.min.js 2,456,297 bytes, gzip approx 530,366 bytes. After local verification: app.min.js 2,025,215 bytes, gzip approx 445,928 bytes (measured with gzip -9). Dynamic modules add transfer only on demand. This does not imply a complete removal of legacy app.js, and further module splitting can follow as a separate, tested architectural change.

Regression gate: 160/160 tests passed locally including four new lazy-module tests, every source module passed node --check and the 35 migrated function bodies matched original source (SHA256). The generator is versioned as an archive to enable reconstruction, and the generated module sources are committed as ordinary readable files. Do not edit source modules without running the full verification suite.

No Supabase schema change is needed for this refactor. Production release is only after a successful GitHub run and the exact Git commit is deployed to Vercel production.
