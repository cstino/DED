-- ==============================================================================
-- D&D Campaign Manager - Migration 009
-- ==============================================================================
-- Add support for Monsters in the NPCs table

-- Alter npcs table to add new columns
ALTER TABLE public.npcs 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'npc',
ADD COLUMN IF NOT EXISTS hp INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS ac INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS challenge_rating TEXT;

-- Update existing records to have standard hp/ac based on con/dex if possible, or defaults
-- (Assuming stats JSONB structure has con and dex)
UPDATE public.npcs
SET 
    hp = COALESCE((stats->>'con')::int, 10),
    ac = 10 + FLOOR((COALESCE((stats->>'dex')::int, 10) - 10) / 2)
WHERE hp IS NULL OR hp = 10 AND type = 'npc';

-- Force schema cache reload (Supabase specific trick if needed via SQL)
NOTIFY pgrst, 'reload schema';
