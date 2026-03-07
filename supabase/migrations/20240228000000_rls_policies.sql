-- ============================================================
-- VINEA — Correction des politiques RLS (Row Level Security)
-- À exécuter dans Supabase > SQL Editor AVANT d'utiliser l'app.
-- Permet aux utilisateurs authentifiés de faire toutes les opérations.
-- ============================================================

-- Suppression des anciennes politiques trop restrictives
DROP POLICY IF EXISTS "Authenticated users can read members" ON members;
DROP POLICY IF EXISTS "Authenticated users can read financial_records" ON financial_records;

-- ─── MEMBERS ───
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_all" ON members FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ─── VISITORS ───
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "visitors_all" ON visitors FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ─── FINANCIAL RECORDS ───
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "financial_records_all" ON financial_records FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ─── DONATION CAMPAIGNS ───
ALTER TABLE donation_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "donation_campaigns_all" ON donation_campaigns FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ─── DONATION PROMISES ───
ALTER TABLE donation_promises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "donation_promises_all" ON donation_promises FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ─── CHURCH SERVICES ───
ALTER TABLE church_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "church_services_all" ON church_services FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ─── ATTENDANCE SESSIONS ───
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendance_sessions_all" ON attendance_sessions FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ─── DEPARTMENTS INFO ───
ALTER TABLE departments_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "departments_info_all" ON departments_info FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ─── DEPARTMENT ACTIVITIES ───
ALTER TABLE department_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "department_activities_all" ON department_activities FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ─── SPIRITUAL GOALS ───
ALTER TABLE spiritual_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spiritual_goals_all" ON spiritual_goals FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ─── SPIRITUAL POINTS ───
ALTER TABLE spiritual_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spiritual_points_all" ON spiritual_points FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ─── DISCIPLESHIP ENROLLMENTS ───
ALTER TABLE discipleship_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "discipleship_enrollments_all" ON discipleship_enrollments FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ─── DISCIPLESHIP PAIRS ───
ALTER TABLE discipleship_pairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "discipleship_pairs_all" ON discipleship_pairs FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ─── MEETINGS ───
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meetings_all" ON meetings FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ─── MEDITATIONS ───
ALTER TABLE meditations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meditations_all" ON meditations FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ─── SYSTEM NOTIFICATIONS ───
ALTER TABLE system_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_notifications_all" ON system_notifications FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ─── AI CONFIG ───
ALTER TABLE ai_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_config_all" ON ai_config FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ─── CHURCH EVENTS ───
ALTER TABLE church_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "church_events_all" ON church_events FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ─── CHURCH SETTINGS ───
ALTER TABLE church_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "church_settings_all" ON church_settings FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ─── ADMIN USERS (lecture seule pour authentifiés, modifications par service role) ───
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_users_select" ON admin_users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin_users_all" ON admin_users FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- CRÉATION DU PREMIER UTILISATEUR ADMINISTRATEUR
-- Remplacez 'admin@votreeglise.com' par votre email réel.
-- Le mot de passe se définit dans Supabase > Authentication > Users.
-- ============================================================
INSERT INTO admin_users (id, full_name, email, role, status, permissions)
VALUES (
  gen_random_uuid()::text,
  'Super Administrateur',
  'admin@vinea.org',
  'Super Admin',
  'Actif',
  ARRAY['dashboard','members','visitors','spiritual','discipleship','attendance','planning','services','meetings','events','finances','meditations','reports','settings','admin']
) ON CONFLICT (email) DO NOTHING;
