-- ==============================================================================
-- D&D Campaign Manager - Migration 007 (Fixing PGVector EXACT dimension for Gemini)
-- ==============================================================================
-- Google's gemini-embedding-001 model outputs exactly 3072 dimensions.
-- Since the database is hosted remotely, we must recreate the column with this exact size.

-- 1. Drop the existing Match functions that depend on the vector column
DROP FUNCTION IF EXISTS public.match_documents(vector(1536), float, int);
DROP FUNCTION IF EXISTS public.match_documents(vector(768), float, int);
DROP FUNCTION IF EXISTS public.match_documents(vector(3072), float, int);

-- 2. Drop the column and recreate it to wipe existing constraints
ALTER TABLE public.document_chunks DROP COLUMN IF EXISTS embedding CASCADE;
ALTER TABLE public.document_chunks ADD COLUMN embedding vector(3072);

-- 3. Recreate the search function expecting a 3072 dimension vector
CREATE OR REPLACE FUNCTION public.match_documents (
  query_embedding vector(3072),
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
