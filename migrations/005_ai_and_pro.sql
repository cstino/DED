-- ==============================================================================
-- D&D Campaign Manager - Migration 005
-- ==============================================================================
-- Add PRO user flag and enable Vector extension for AI

-- 1. Add `is_pro` field to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT FALSE;

-- 2. Enable pgvector for RAG AI Assistant
CREATE EXTENSION IF NOT EXISTS vector;

-- 3. Create document chunks table for AI knowledge base
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_name TEXT NOT NULL,
    chunk_content TEXT NOT NULL,
    embedding VECTOR(1536), -- 1536 is the default for OpenAI text-embedding-ada-002 and text-embedding-3-small
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Function to match similar documents
CREATE OR REPLACE FUNCTION public.match_documents (
  query_embedding vector(1536),
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

NOTIFY pgrst, 'reload schema';
