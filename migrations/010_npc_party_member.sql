-- ==============================================================================
-- D&D Campaign Manager - Migration 010
-- ==============================================================================
-- Add support for NPCs that are part of the player party

ALTER TABLE public.npcs 
ADD COLUMN IF NOT EXISTS is_party_member BOOLEAN DEFAULT FALSE;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
