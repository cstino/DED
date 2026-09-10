-- Base AC for player characters is 10 + Dexterity modifier.
-- Equipment and shield bonuses remain in the equipment JSON and are added by the UI.
UPDATE public.characters
SET ac = 10 + FLOOR((COALESCE((ability_scores->>'dex')::int, 10) - 10) / 2)
WHERE ac = 10;

NOTIFY pgrst, 'reload schema';
