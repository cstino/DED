-- ==============================================================================
-- D&D Campaign Manager - Database Schema
-- Run this script in the Supabase SQL Editor
-- ==============================================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Core App Tables
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    master_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    invite_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.campaign_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL DEFAULT 'player', -- 'master' or 'player'
    UNIQUE(campaign_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.characters (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    race TEXT NOT NULL,
    class TEXT NOT NULL,
    subclass TEXT,
    level INTEGER NOT NULL DEFAULT 1,
    ability_scores JSONB NOT NULL DEFAULT '{"str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10}',
    hp_current INTEGER NOT NULL DEFAULT 10,
    hp_max INTEGER NOT NULL DEFAULT 10,
    ac INTEGER NOT NULL DEFAULT 10,
    initiative_bonus INTEGER NOT NULL DEFAULT 0,
    spell_slots JSONB DEFAULT '{}',
    proficiencies JSONB DEFAULT '[]',
    equipment JSONB DEFAULT '[]',
    features JSONB DEFAULT '[]',
    background TEXT,
    alignment TEXT,
    notes TEXT,
    portrait_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
    session_number INTEGER NOT NULL,
    title TEXT,
    notes TEXT,
    played_at TIMESTAMPTZ DEFAULT NOW()
);


-- 3. D&D Read-Only Tables (Populated from Prism)
CREATE TABLE IF NOT EXISTS public.spells (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    level INTEGER NOT NULL,
    school TEXT,
    casting_time TEXT,
    range TEXT,
    components TEXT,
    duration TEXT,
    description TEXT,
    is_concentration BOOLEAN DEFAULT FALSE,
    is_ritual BOOLEAN DEFAULT FALSE,
    casters JSONB DEFAULT '{}',
    damage_dice JSONB DEFAULT '[]',
    source_book TEXT
);

CREATE TABLE IF NOT EXISTS public.classes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    hit_dice INTEGER,
    saving_throws JSONB DEFAULT '{}',
    proficiencies JSONB DEFAULT '[]',
    features JSONB DEFAULT '[]',
    spell_table JSONB DEFAULT '{}',
    source_book TEXT
);

CREATE TABLE IF NOT EXISTS public.subclasses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    class_name TEXT NOT NULL,
    description TEXT,
    features JSONB DEFAULT '[]',
    source_book TEXT
);

CREATE TABLE IF NOT EXISTS public.races (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    ability_bonuses JSONB DEFAULT '{}',
    features JSONB DEFAULT '[]',
    movement JSONB DEFAULT '{}',
    languages JSONB DEFAULT '[]',
    sizes JSONB DEFAULT '[]',
    source_book TEXT
);

CREATE TABLE IF NOT EXISTS public.monsters (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    ac INTEGER,
    ac_string TEXT,
    hp INTEGER,
    hp_dice JSONB DEFAULT '{}',
    stats JSONB DEFAULT '{}',
    movement JSONB DEFAULT '{}',
    actions JSONB DEFAULT '[]',
    traits JSONB DEFAULT '[]',
    challenge_rating FLOAT,
    experience_points INTEGER,
    description TEXT,
    source_book TEXT
);

CREATE TABLE IF NOT EXISTS public.feats (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    effects JSONB DEFAULT '[]',
    source_book TEXT
);

CREATE TABLE IF NOT EXISTS public.backgrounds (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    skills JSONB DEFAULT '[]',
    features JSONB DEFAULT '[]',
    source_book TEXT
);


-- 4. Enable Row Level Security (RLS)
-- We will keep the D&D tables completely open for reading to all users.
-- To allow testing/importing from the anon/public key without a server role, 
-- we will also allow INSERT/UPDATE on D&D tables temporarily.

-- Disable RLS on D&D tables so the import script can populate them!
ALTER TABLE public.spells DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subclasses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.races DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.monsters DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.feats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.backgrounds DISABLE ROW LEVEL SECURITY;
