-- Adds a `type` column to documents so a single "document" row can represent
-- either a Tiptap text document or a whiteboard. Both are just a Yjs doc
-- syncing through the same Hocuspocus room (see socket/index.ts) and the
-- same saveDocument/loadDocument persistence — the only thing that differs
-- is which React component renders the room's contents on the frontend.

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'text';

ALTER TABLE documents
  ADD CONSTRAINT documents_type_check CHECK (type IN ('text', 'whiteboard'));