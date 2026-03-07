-- Add is_party_member column to characters table
ALTER TABLE characters ADD COLUMN IF NOT EXISTS is_party_member BOOLEAN DEFAULT FALSE;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
