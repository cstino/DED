-- ============================================
-- Migration: Add advanced character sheet columns
-- Run in Supabase SQL Editor
-- ============================================

ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS hp_temp INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS speed INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS hit_dice_total INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS hit_dice_current INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS death_saves JSONB DEFAULT '{"successes": 0, "failures": 0}',
  ADD COLUMN IF NOT EXISTS money JSONB DEFAULT '{"mp": 0, "mo": 0, "ma": 0, "mr": 0, "me": 0}',
  ADD COLUMN IF NOT EXISTS saving_throw_prof JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS skill_proficiencies JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS spell_slots_used JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS known_spells JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS personality JSONB DEFAULT '{"traits":"","ideals":"","bonds":"","flaws":""}';
