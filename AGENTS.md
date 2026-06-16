<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Authorization model

T-Vault has one user role: **authenticated owner**. Users may only access their own jobs, documents, expenses, and invoices. Reject unauthenticated requests before any database or API call. See `CLAUDE.md` for full rules.

## File uploads

Trucking documents only: `image/jpeg`, `image/png`, `application/pdf`. Validate magic bytes server-side (not MIME/extension). Max 10 MB before upload; compress images to under 1 MB after upload. Regenerate filenames server-side from user ID + timestamp. Return generic errors on rejection. See `CLAUDE.md` for full rules.
