-- ==========================================
-- SCHEMA SQL COMPLET POUR VINEA (ERP ÉGLISE)
-- Base de données : PostgreSQL (Compatible Supabase)
-- Note : Tous les identifiants utilisent le type TEXT.
-- ==========================================

-- NETTOYAGE DES TABLES EXISTANTES (Pour éviter les conflits de types)
DROP TABLE IF EXISTS church_events CASCADE;
DROP TABLE IF EXISTS ai_config CASCADE;
DROP TABLE IF EXISTS system_notifications CASCADE;
DROP TABLE IF EXISTS meditations CASCADE;
DROP TABLE IF EXISTS meetings CASCADE;
DROP TABLE IF EXISTS discipleship_pairs CASCADE;
DROP TABLE IF EXISTS discipleship_enrollments CASCADE;
DROP TABLE IF EXISTS spiritual_points CASCADE;
DROP TABLE IF EXISTS spiritual_goals CASCADE;
DROP TABLE IF EXISTS department_activities CASCADE;
DROP TABLE IF EXISTS departments_info CASCADE;
DROP TABLE IF EXISTS attendance_sessions CASCADE;
DROP TABLE IF EXISTS church_services CASCADE;
DROP TABLE IF EXISTS donation_promises CASCADE;
DROP TABLE IF EXISTS financial_records CASCADE;
DROP TABLE IF EXISTS donation_campaigns CASCADE;
DROP TABLE IF EXISTS visitors CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS church_settings CASCADE;

-- 1. CONFIGURATION & RÉGLAGES DE L'ÉGLISE
CREATE TABLE church_settings (
    id TEXT PRIMARY KEY,
    name TEXT DEFAULT 'Vinea',
    slogan TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#4f46e5',
    currency TEXT DEFAULT 'F CFA',
    timezone TEXT DEFAULT 'UTC',
    language TEXT DEFAULT 'Français',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. GESTION DES UTILISATEURS (ADMINISTRATEURS)
CREATE TABLE admin_users (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'Administrateur',
    status TEXT DEFAULT 'Actif',
    avatar TEXT,
    permissions TEXT[] DEFAULT '{dashboard,spiritual}',
    last_active TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. REGISTRE DES MEMBRES
CREATE TABLE members (
    id TEXT PRIMARY KEY,
    last_name TEXT NOT NULL,
    first_name TEXT NOT NULL,
    nickname TEXT,
    gender TEXT CHECK (gender IN ('Masculin', 'Féminin')),
    birth_date DATE,
    marital_status TEXT,
    wedding_date DATE,
    spouse_name TEXT,
    phone TEXT,
    secondary_phone TEXT,
    email TEXT,
    whatsapp_phone TEXT,
    whatsapp BOOLEAN DEFAULT FALSE,
    address TEXT,
    emergency_contact JSONB DEFAULT '{"name": "", "phone": "", "relation": ""}',
    type TEXT DEFAULT 'Membre simple',
    status TEXT DEFAULT 'Actif',
    is_disciple_maker BOOLEAN DEFAULT FALSE,
    baptized BOOLEAN DEFAULT FALSE,
    baptized_date DATE,
    baptized_by TEXT,
    baptized_church TEXT,
    join_date DATE DEFAULT CURRENT_DATE,
    departments TEXT[] DEFAULT '{}',
    profession TEXT,
    skills TEXT,
    notes TEXT,
    source TEXT,
    invited_by TEXT,
    assigned_disciple_maker_id TEXT REFERENCES members(id) ON DELETE SET NULL,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. REGISTRE DES VISITEURS
CREATE TABLE visitors (
    id TEXT PRIMARY KEY,
    last_name TEXT NOT NULL,
    first_name TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('Masculin', 'Féminin')),
    phone TEXT,
    whatsapp_phone TEXT,
    address TEXT,
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    service TEXT,
    source TEXT,
    invited_by TEXT,
    status TEXT DEFAULT 'En attente',
    notes TEXT,
    qualification JSONB DEFAULT '{"seekingChurch": false, "needsPrayer": false, "livesNearby": false, "hasChildren": false, "firstTimeChristian": false, "wantsToServe": false}',
    follow_up_history JSONB DEFAULT '[]',
    parrain_id TEXT REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. FINANCES : CAMPAGNES ET ENGAGEMENTS
CREATE TABLE donation_campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    goal NUMERIC,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE financial_records (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('Revenu', 'Dépense')),
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
    external_name TEXT,
    campaign_id TEXT REFERENCES donation_campaigns(id) ON DELETE SET NULL,
    payment_method TEXT DEFAULT 'Espèces',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE donation_promises (
    id TEXT PRIMARY KEY,
    campaign_id TEXT REFERENCES donation_campaigns(id) ON DELETE CASCADE,
    member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
    external_name TEXT,
    amount NUMERIC NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. CULTES ET PRÉDICATIONS
CREATE TABLE church_services (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TEXT,
    service_type TEXT NOT NULL,
    series TEXT,
    speaker TEXT NOT NULL,
    worship_leader TEXT,
    praise_leader TEXT,
    moderator TEXT,
    theme TEXT NOT NULL,
    scripture TEXT,
    content TEXT,
    ai_analysis TEXT,
    social_summary TEXT,
    tags TEXT[] DEFAULT '{}',
    youtube_link TEXT,
    facebook_link TEXT,
    audio_link TEXT,
    attendance INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. PRÉSENCES ET ABSENCES
CREATE TABLE attendance_sessions (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    service TEXT NOT NULL,
    men INTEGER DEFAULT 0,
    women INTEGER DEFAULT 0,
    children INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
    absent_members TEXT[] DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. PLANNING ET DÉPARTEMENTS
CREATE TABLE departments_info (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    president_id TEXT REFERENCES members(id) ON DELETE SET NULL,
    member_ids TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'Actif',
    color TEXT DEFAULT '#4f46e5',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE department_activities (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    dept_id TEXT REFERENCES departments_info(id) ON DELETE CASCADE,
    responsible_id TEXT REFERENCES members(id) ON DELETE SET NULL,
    associate_name TEXT,
    cost NUMERIC DEFAULT 0,
    deadline DATE,
    status TEXT DEFAULT 'Planifiée',
    observations TEXT,
    recurrence TEXT DEFAULT 'Ponctuelle',
    last_realized_at DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. CROISSANCE SPIRITUELLE & REDEVABILITÉ
CREATE TABLE spiritual_goals (
    id TEXT PRIMARY KEY,
    member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    objectives JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(member_id, year)
);

CREATE TABLE spiritual_points (
    id TEXT PRIMARY KEY,
    member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
    month INTEGER NOT NULL, -- 0-11
    year INTEGER NOT NULL,
    results JSONB NOT NULL DEFAULT '{}',
    score NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(member_id, month, year)
);

-- 10. DISCIPOLAT & ACCOMPAGNEMENT
CREATE TABLE discipleship_enrollments (
    id TEXT PRIMARY KEY,
    member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
    pathway_id TEXT NOT NULL,
    progress INTEGER DEFAULT 0,
    start_date DATE DEFAULT CURRENT_DATE,
    last_update DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE discipleship_pairs (
    id TEXT PRIMARY KEY,
    mentor_id TEXT REFERENCES members(id) ON DELETE CASCADE,
    disciple_id TEXT REFERENCES members(id) ON DELETE CASCADE,
    start_date DATE DEFAULT CURRENT_DATE,
    progress INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Actif',
    last_meeting DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. RÉUNIONS ET DÉCISIONS
CREATE TABLE meetings (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TEXT,
    location TEXT,
    category TEXT,
    status TEXT DEFAULT 'Programmé',
    attendee_ids TEXT[] DEFAULT '{}',
    absentee_ids TEXT[] DEFAULT '{}',
    priority TEXT DEFAULT 'Moyenne',
    summary TEXT,
    decisions JSONB DEFAULT '[]',
    ai_pv TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. MÉDITATIONS & ÉDIFICATION
CREATE TABLE meditations (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    scripture TEXT,
    questions TEXT,
    title TEXT NOT NULL,
    excerpt TEXT,
    likes INTEGER DEFAULT 0,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. CONFIGURATION SYSTÈME & NOTIFICATIONS
CREATE TABLE system_notifications (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL, -- 'birthday', 'event', 'followup', 'system'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    is_read BOOLEAN DEFAULT FALSE,
    link TEXT,
    target_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE ai_config (
    id TEXT PRIMARY KEY,
    tone TEXT DEFAULT 'Chaleureux & Pastoral',
    auto_suggest BOOLEAN DEFAULT TRUE,
    language TEXT DEFAULT 'Français',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. ÉVÉNEMENTS
CREATE TABLE church_events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    location TEXT,
    category TEXT,
    status TEXT DEFAULT 'Programmé',
    registered_count INTEGER DEFAULT 0,
    target_count INTEGER DEFAULT 100,
    budget NUMERIC DEFAULT 0,
    expenses NUMERIC DEFAULT 0,
    description TEXT,
    image TEXT, -- Correspond à 'image' dans le type Event
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. INDEXATION POUR LA PERFORMANCE
CREATE INDEX idx_members_full_name ON members (last_name, first_name);
CREATE INDEX idx_finances_date_type ON financial_records (date, type);
CREATE INDEX idx_services_date ON church_services (date);
CREATE INDEX idx_attendance_date ON attendance_sessions (date);
CREATE INDEX idx_activities_deadline ON department_activities (deadline);
CREATE INDEX idx_meditations_date ON meditations (date);

-- 16. SECURITÉ : ROW LEVEL SECURITY (RLS)
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read members" ON members FOR SELECT USING (auth.role() = 'authenticated');

ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read financial_records" ON financial_records FOR SELECT USING (auth.role() = 'authenticated');
