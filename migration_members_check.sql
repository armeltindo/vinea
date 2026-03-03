-- ============================================================
-- VINEA — Migration & Vérification de la table members
-- À exécuter dans Supabase > SQL Editor
-- Utilise ADD COLUMN IF NOT EXISTS (safe, idempotent)
-- ============================================================

-- ── 1. VÉRIFICATION AVANT (colonnes actuellement présentes) ──
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'members'
ORDER BY ordinal_position;

-- ── 2. AJOUT DES COLONNES MANQUANTES ─────────────────────────
-- Champs identité
ALTER TABLE members ADD COLUMN IF NOT EXISTS nickname          TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS gender            TEXT CHECK (gender IN ('Masculin', 'Féminin'));

-- Champs état civil
ALTER TABLE members ADD COLUMN IF NOT EXISTS marital_status    TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS wedding_date      DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS spouse_name       TEXT;

-- Champs contact
ALTER TABLE members ADD COLUMN IF NOT EXISTS phone             TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS secondary_phone   TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS email             TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS whatsapp_phone    TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS whatsapp          BOOLEAN DEFAULT FALSE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS address           TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{"name": "", "phone": "", "relation": ""}';

-- Champs rôle & statut
ALTER TABLE members ADD COLUMN IF NOT EXISTS type              TEXT DEFAULT 'Membre simple';
ALTER TABLE members ADD COLUMN IF NOT EXISTS status            TEXT DEFAULT 'Actif';
ALTER TABLE members ADD COLUMN IF NOT EXISTS is_disciple_maker BOOLEAN DEFAULT FALSE;

-- Champs spirituels & baptême
ALTER TABLE members ADD COLUMN IF NOT EXISTS baptized          BOOLEAN DEFAULT FALSE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS baptized_date     DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS baptized_by       TEXT;   -- qui a baptisé
ALTER TABLE members ADD COLUMN IF NOT EXISTS baptized_church   TEXT;   -- église du baptême

-- Champs adhésion & profession
ALTER TABLE members ADD COLUMN IF NOT EXISTS birth_date        DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS join_date         DATE DEFAULT CURRENT_DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS profession        TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS skills            TEXT;   -- compétences
ALTER TABLE members ADD COLUMN IF NOT EXISTS notes             TEXT;   -- notes internes

-- Champs source & suivi
ALTER TABLE members ADD COLUMN IF NOT EXISTS source            TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS invited_by        TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS departments       TEXT[] DEFAULT '{}';

-- Champs photo & disciple-maker
ALTER TABLE members ADD COLUMN IF NOT EXISTS photo_url                    TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS assigned_disciple_maker_id   TEXT REFERENCES members(id) ON DELETE SET NULL;

-- Champs filiation (père / mère)
ALTER TABLE members ADD COLUMN IF NOT EXISTS mother_id         TEXT REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE members ADD COLUMN IF NOT EXISTS mother_name       TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS father_id         TEXT REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE members ADD COLUMN IF NOT EXISTS father_name       TEXT;

-- Champs horodatage
ALTER TABLE members ADD COLUMN IF NOT EXISTS created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE members ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ── 3. VÉRIFICATION APRÈS ────────────────────────────────────
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'members'
ORDER BY ordinal_position;

-- ── 4. RÉSUMÉ : colonnes ATTENDUES vs PRÉSENTES ──────────────
-- Toutes ces colonnes doivent apparaître dans la liste ci-dessus :
-- id, last_name, first_name, nickname, gender,
-- birth_date, marital_status, wedding_date, spouse_name,
-- phone, secondary_phone, email, whatsapp_phone, whatsapp, address,
-- emergency_contact, type, status, is_disciple_maker,
-- baptized, baptized_date, baptized_by, baptized_church,
-- join_date, departments, profession, skills, notes,
-- source, invited_by, assigned_disciple_maker_id, photo_url,
-- mother_id, mother_name, father_id, father_name,
-- created_at, updated_at
