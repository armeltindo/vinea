-- Migration : ajout des colonnes first_name et last_name dans admin_users
-- Applique cette migration via : supabase db push
-- ou directement dans l'éditeur SQL du tableau de bord Supabase

ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Peupler depuis full_name pour les lignes existantes
UPDATE admin_users
SET
  first_name = split_part(full_name, ' ', 1),
  last_name  = trim(substr(full_name, length(split_part(full_name, ' ', 1)) + 2))
WHERE first_name IS NULL OR first_name = '';
