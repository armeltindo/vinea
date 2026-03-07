-- ============================================================
-- VINEA — Policies du Storage Bucket "avatars"
-- À exécuter dans Supabase > SQL Editor
--
-- Ce fichier crée les policies nécessaires pour le bucket "avatars"
-- (photos de profil des comptes utilisateurs / administrateurs).
-- ============================================================

-- 1. S'assurer que le bucket existe (public pour les URLs directes)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Supprimer les anciennes policies si elles existent (pour éviter les conflits)
DROP POLICY IF EXISTS "avatars_bucket_select" ON storage.objects;
DROP POLICY IF EXISTS "avatars_bucket_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_bucket_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_bucket_delete" ON storage.objects;

-- 3. Lecture publique (pour afficher les avatars sans token)
CREATE POLICY "avatars_bucket_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 4. Upload (INSERT) — utilisateurs authentifiés
CREATE POLICY "avatars_bucket_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
);

-- 5. Remplacement d'avatar (UPDATE) — utilisateurs authentifiés
--    Nécessaire pour { upsert: true } lors du remplacement de photo
CREATE POLICY "avatars_bucket_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
);

-- 6. Suppression d'avatar (DELETE) — utilisateurs authentifiés
CREATE POLICY "avatars_bucket_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
);
