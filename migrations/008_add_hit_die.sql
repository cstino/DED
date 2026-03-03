-- Migration 008: Add hit_die column to characters table
-- This column stores the hit die type (e.g., 8 for d8, 10 for d10) for the character's class

ALTER TABLE public.characters
ADD COLUMN IF NOT EXISTS hit_die INTEGER NOT NULL DEFAULT 8;
