-- Nullable on purpose: uploads from before this column existed have no recorded owner.
ALTER TABLE public.inbox_attachments
  ADD COLUMN IF NOT EXISTS uploaded_by INTEGER;
