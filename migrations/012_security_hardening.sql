-- ==============================================================================
-- D&D Campaign Manager - Migration 012
-- ==============================================================================
-- Security Hardening: Enable Row Level Security (RLS) and define access policies

-- 1. PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- 2. CAMPAIGNS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members/Master can view campaigns" 
ON public.campaigns FOR SELECT 
USING (
  auth.uid() = master_id OR 
  EXISTS (
    SELECT 1 FROM public.campaign_members 
    WHERE campaign_id = campaigns.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can create campaigns" 
ON public.campaigns FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = master_id);

CREATE POLICY "Only the master can update/delete campaigns" 
ON public.campaigns FOR ALL 
USING (auth.uid() = master_id);

-- 3. CAMPAIGN MEMBERS
ALTER TABLE public.campaign_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view other members in the same campaign" 
ON public.campaign_members FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.campaign_members AS cm 
    WHERE cm.campaign_id = public.campaign_members.campaign_id AND cm.user_id = auth.uid()
  ) OR 
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = public.campaign_members.campaign_id AND campaigns.master_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can join campaigns" 
ON public.campaign_members FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Master or member can remove members" 
ON public.campaign_members FOR DELETE 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = public.campaign_members.campaign_id AND campaigns.master_id = auth.uid()
  )
);

-- 4. CHARACTERS
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaign members can view characters" 
ON public.characters FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.campaign_members 
    WHERE campaign_id = characters.campaign_id AND user_id = auth.uid()
  ) OR 
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = characters.campaign_id AND campaigns.master_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can create characters" 
ON public.characters FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner or Master can update/delete characters" 
ON public.characters FOR ALL 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = characters.campaign_id AND campaigns.master_id = auth.uid()
  )
);

-- 5. SESSIONS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaign members can view sessions" 
ON public.sessions FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.campaign_members 
    WHERE campaign_id = sessions.campaign_id AND user_id = auth.uid()
  ) OR 
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = sessions.campaign_id AND campaigns.master_id = auth.uid()
  )
);

CREATE POLICY "Only the master can manage sessions" 
ON public.sessions FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = sessions.campaign_id AND campaigns.master_id = auth.uid()
  )
);

-- 6. NPCs
ALTER TABLE public.npcs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Campaign members can view NPCs" 
ON public.npcs FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.campaign_members 
    WHERE campaign_id = npcs.campaign_id AND user_id = auth.uid()
  ) OR 
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = npcs.campaign_id AND campaigns.master_id = auth.uid()
  )
);

CREATE POLICY "Only the master can manage NPCs" 
ON public.npcs FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns 
    WHERE campaigns.id = npcs.campaign_id AND campaigns.master_id = auth.uid()
  )
);

-- 7. LORE TABLES (Read-only for authenticated users)
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('spells', 'classes', 'subclasses', 'races', 'monsters', 'feats', 'backgrounds')
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
        EXECUTE format('DROP POLICY IF EXISTS "Public access to %I" ON public.%I;', t, t);
        EXECUTE format('CREATE POLICY "Public access to %I" ON public.%I FOR SELECT USING (true);', t, t);
    END LOOP;
END $$;

-- 8. DOCUMENT CHUNKS (AI Knowledge Base)
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only specific systems or admins can access chunks" 
ON public.document_chunks FOR ALL 
USING (false); -- Default to deny for service role only, or specific policy if app reads it directly.
-- If the app uses match_documents function, that bypasses RLS if defined as SECURITY DEFINER.

NOTIFY pgrst, 'reload schema';
