-- ==============================================================================
-- D&D Campaign Manager - Migration 004
-- ==============================================================================
-- Add custom NPCs table for Dungeon Masters

CREATE TABLE IF NOT EXISTS public.npcs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    race TEXT,
    role TEXT,
    alignment TEXT,
    is_alive BOOLEAN DEFAULT TRUE,
    stats JSONB DEFAULT '{"str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10}',
    traits JSONB DEFAULT '[]',
    notes TEXT,
    portrait_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Force schema cache reload (Supabase specific trick if needed via SQL)
NOTIFY pgrst, 'reload schema';
