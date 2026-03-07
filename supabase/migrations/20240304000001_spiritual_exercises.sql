-- ============================================================
-- Migration : Exercices Spirituels des Membres
-- ============================================================

-- 1. Compte membre dans la table members
ALTER TABLE members ADD COLUMN IF NOT EXISTS member_account_active BOOLEAN DEFAULT FALSE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS member_username TEXT;

-- 2. Types d'exercices spirituels (configurable par l'admin)
CREATE TABLE IF NOT EXISTS spiritual_exercise_types (
  id           TEXT PRIMARY KEY,
  label        TEXT NOT NULL,
  field_type   TEXT NOT NULL CHECK (field_type IN ('text', 'boolean')),
  position     INTEGER DEFAULT 0,
  active       BOOLEAN DEFAULT TRUE,
  has_detail   BOOLEAN DEFAULT FALSE,
  detail_label TEXT,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Soumissions quotidiennes (une par membre par jour)
CREATE TABLE IF NOT EXISTS daily_spiritual_exercises (
  id         TEXT PRIMARY KEY,
  member_id  TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (member_id, date)
);

-- 4. Valeurs par exercice
CREATE TABLE IF NOT EXISTS daily_exercise_entries (
  id          TEXT PRIMARY KEY,
  exercise_id TEXT NOT NULL REFERENCES daily_spiritual_exercises(id) ON DELETE CASCADE,
  type_id     TEXT NOT NULL,
  value_text  TEXT,
  value_bool  BOOLEAN,
  detail_text TEXT,
  UNIQUE (exercise_id, type_id)
);

-- RLS
ALTER TABLE spiritual_exercise_types   ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_spiritual_exercises  ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_exercise_entries     ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='spiritual_exercise_types' AND policyname='Allow all spiritual_exercise_types'
  ) THEN
    CREATE POLICY "Allow all spiritual_exercise_types" ON spiritual_exercise_types FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='daily_spiritual_exercises' AND policyname='Allow all daily_spiritual_exercises'
  ) THEN
    CREATE POLICY "Allow all daily_spiritual_exercises" ON daily_spiritual_exercises FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='daily_exercise_entries' AND policyname='Allow all daily_exercise_entries'
  ) THEN
    CREATE POLICY "Allow all daily_exercise_entries" ON daily_exercise_entries FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Exercices par défaut
INSERT INTO spiritual_exercise_types (id, label, field_type, position, active, has_detail, detail_label) VALUES
  ('priere',            'Temps de prière',                              'text',    1,  true,  false, null),
  ('jeune',             'Jeûne',                                        'boolean', 2,  true,  false, null),
  ('lecture_biblique',  'Lecture biblique (nombre de chapitres)',        'text',    3,  true,  true,  'Passage lu (facultatif)'),
  ('verset_memorise',   'Verset mémorisé',                              'boolean', 4,  true,  true,  'Lequel ?'),
  ('lecture_chretienne','Lecture des livres chrétiens',                  'boolean', 5,  true,  false, null),
  ('meditation',        'Méditation',                                   'boolean', 6,  true,  true,  'Sur quoi ?'),
  ('evangelisation',    'Évangélisation',                               'boolean', 7,  true,  false, null),
  ('veillee',           'Veillée',                                      'boolean', 8,  true,  false, null),
  ('forum_whatsapp',    'Affichage dans le forum WhatsApp MIDC',        'boolean', 9,  true,  false, null)
ON CONFLICT (id) DO NOTHING;
