-- Migration: Création de la table registry_events
-- Module : Registre (Mariage, Sortie d'enfant, Baptême)

CREATE TABLE IF NOT EXISTS registry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('Mariage', 'Sortie d''enfant', 'Baptême')),

  -- Lien principal au membre
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,

  -- Mariage : époux & épouse (obligatoires)
  groom_id UUID REFERENCES members(id) ON DELETE SET NULL,
  groom_name TEXT,
  bride_id UUID REFERENCES members(id) ON DELETE SET NULL,
  bride_name TEXT,

  -- Mariage : témoins (facultatifs, membres ou non)
  godfather_id UUID REFERENCES members(id) ON DELETE SET NULL,
  godfather_name TEXT,
  godmother_id UUID REFERENCES members(id) ON DELETE SET NULL,
  godmother_name TEXT,

  -- Pasteur célébrant (commun à tous les types)
  celebrating_pastor_id UUID REFERENCES members(id) ON DELETE SET NULL,
  celebrating_pastor_name TEXT,

  -- Dates mariage
  celebration_date DATE,
  civil_marriage_date DATE,
  traditional_marriage_date DATE,

  -- Sortie d'enfant
  child_full_name TEXT,
  father_id UUID REFERENCES members(id) ON DELETE SET NULL,
  father_name TEXT,
  mother_id UUID REFERENCES members(id) ON DELETE SET NULL,
  mother_name TEXT,
  dedication_date DATE,

  -- Baptême
  baptism_date DATE,

  -- Commun
  observations TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour les recherches par membre
CREATE INDEX IF NOT EXISTS idx_registry_events_member_id ON registry_events(member_id);
CREATE INDEX IF NOT EXISTS idx_registry_events_groom_id ON registry_events(groom_id);
CREATE INDEX IF NOT EXISTS idx_registry_events_bride_id ON registry_events(bride_id);
CREATE INDEX IF NOT EXISTS idx_registry_events_father_id ON registry_events(father_id);
CREATE INDEX IF NOT EXISTS idx_registry_events_mother_id ON registry_events(mother_id);
CREATE INDEX IF NOT EXISTS idx_registry_events_type ON registry_events(type);
CREATE INDEX IF NOT EXISTS idx_registry_events_created_at ON registry_events(created_at DESC);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_registry_events_updated_at ON registry_events;
CREATE TRIGGER update_registry_events_updated_at
  BEFORE UPDATE ON registry_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (activer si nécessaire)
ALTER TABLE registry_events ENABLE ROW LEVEL SECURITY;

-- Politique : accès complet pour les utilisateurs authentifiés
CREATE POLICY IF NOT EXISTS "registry_events_policy"
  ON registry_events
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
