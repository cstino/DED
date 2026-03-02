-- ==============================================================================
-- D&D Campaign Manager - Migration 006 (Fixing PGVector for Gemini)
-- ==============================================================================
-- Drop the existing Match function that depends on the vector column
DROP FUNCTION IF EXISTS public.match_documents(vector(1536), float, int);
DROP FUNCTION IF EXISTS public.match_documents(vector(768), float, int);

-- Alter the column to match Gemini's default embedding size (768)
ALTER TABLE public.document_chunks ALTER COLUMN embedding TYPE vector(768);

-- Recreate the function expecting a 768 dimension vector
CREATE OR REPLACE FUNCTION public.match_documents (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  document_name text,
  chunk_content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  select
    document_chunks.id,
    document_chunks.document_name,
    document_chunks.chunk_content,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  where 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
$$;
