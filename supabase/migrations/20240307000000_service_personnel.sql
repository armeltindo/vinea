-- ============================================================
-- MIGRATION : Ajout de la colonne service_personnel
-- À exécuter dans l'éditeur SQL de Supabase
-- ============================================================

-- 1. Ajouter la colonne service_personnel à church_services
ALTER TABLE church_services
  ADD COLUMN IF NOT EXISTS service_personnel JSONB DEFAULT NULL;

-- 2. Rendre speaker et theme facultatifs (si créés avec NOT NULL)
ALTER TABLE church_services
  ALTER COLUMN speaker DROP NOT NULL;

ALTER TABLE church_services
  ALTER COLUMN theme DROP NOT NULL;

-- Vérification : lister les colonnes de la table
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'church_services'
-- ORDER BY ordinal_position;
