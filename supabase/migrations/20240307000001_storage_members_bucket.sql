-- ============================================================
-- VINEA — Policies du Storage Bucket "members"
-- À exécuter dans Supabase > SQL Editor
--
-- Ce fichier crée les policies manquantes pour le bucket "members"
-- (photos de membres). Sans ces policies, le remplacement de photo
-- échoue car Supabase Storage ne permet pas l'UPDATE/DELETE par défaut.
--
-- La fonction uploadMemberPhoto() utilise { upsert: true }, ce qui
-- nécessite les permissions INSERT + UPDATE sur le bucket.
-- ============================================================

-- 1. S'assurer que le bucket existe (public pour les URLs directes)
INSERT INTO storage.buckets (id, name, public)
VALUES ('members', 'members', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Supprimer les anciennes policies si elles existent (pour éviter les conflits)
DROP POLICY IF EXISTS "members_bucket_select" ON storage.objects;
DROP POLICY IF EXISTS "members_bucket_insert" ON storage.objects;
DROP POLICY IF EXISTS "members_bucket_update" ON storage.objects;
DROP POLICY IF EXISTS "members_bucket_delete" ON storage.objects;

-- 3. Lecture publique (pour afficher les photos sans token)
CREATE POLICY "members_bucket_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'members');

-- 4. Upload (INSERT) — utilisateurs authentifiés
CREATE POLICY "members_bucket_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'members'
  AND auth.role() = 'authenticated'
);

-- 5. Remplacement de photo (UPDATE) — utilisateurs authentifiés
--    Nécessaire pour { upsert: true } dans uploadMemberPhoto()
CREATE POLICY "members_bucket_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'members'
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'members'
  AND auth.role() = 'authenticated'
);

-- 6. Suppression de photo (DELETE) — utilisateurs authentifiés
CREATE POLICY "members_bucket_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'members'
  AND auth.role() = 'authenticated'
);
