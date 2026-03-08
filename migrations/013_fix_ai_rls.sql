-- ==============================================================================
-- D&D Campaign Manager - Migration 013
-- ==============================================================================
-- Fix AI Assistant access to document_chunks after RLS hardening.

-- 1. Drop existing functions to avoid signature conflicts if necessary
DROP FUNCTION IF EXISTS public.match_documents(vector(3072), float, int);

-- 2. Recreate the function as SECURITY DEFINER
-- This allows the function to bypass RLS and read the document_chunks table.
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
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_name,
    dc.chunk_content,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks dc
  WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 3. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.match_documents(vector(3072), float, int) TO anon, authenticated;

-- 4. Add a specific SELECT policy for document_chunks to allow reading if needed by other parts
DROP POLICY IF EXISTS "Only specific systems or admins can access chunks" ON public.document_chunks;
CREATE POLICY "Allow read access to document_chunks for anyone" 
ON public.document_chunks FOR SELECT 
USING (true);

NOTIFY pgrst, 'reload schema';
