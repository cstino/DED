-- ==============================================================================
-- Combat Sessions - Initiative Tracker
-- Run this in the Supabase SQL Editor
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.combat_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    current_turn_index INTEGER DEFAULT 0,
    round_number INTEGER DEFAULT 1,
    combatants JSONB DEFAULT '[]',
    -- combatants structure:
    -- [
    --   {
    --     "id": "uuid",           -- unique per combatant in this session
    --     "source_id": "uuid",    -- ID from characters/npcs table
    --     "name": "string",
    --     "type": "pc" | "npc",   -- player character or NPC/monster
    --     "initiative": 15,
    --     "hp_current": 45,
    --     "hp_max": 45,
    --     "ac": 16,
    --     "portrait_url": "string|null",
    --     "user_id": "uuid|null", -- only for PCs, to identify the player
    --     "race": "string",
    --     "class_or_role": "string",
    --     "conditions": []        -- status conditions (poisoned, stunned, etc.)
    --   }
    -- ]
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only one active combat per campaign at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_combat 
    ON public.combat_sessions(campaign_id) 
    WHERE is_active = TRUE;

-- Disable RLS for now (like other tables in the app)
ALTER TABLE public.combat_sessions DISABLE ROW LEVEL SECURITY;
