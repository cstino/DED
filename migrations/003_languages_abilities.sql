-- Migration: Add languages and class_abilities columns to characters
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '[]';
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS class_abilities JSONB DEFAULT '[]';
