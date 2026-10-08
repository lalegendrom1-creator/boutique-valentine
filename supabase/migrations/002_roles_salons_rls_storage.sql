/*
  002_roles_salons_rls_storage.sql
  Phase 1 — Rôles, colonnes manquantes, triggers de protection, RLS renforcée, Storage

  ⚠️  CONFLITS SIGNALÉS
  ─────────────────────
  1. profiles.role a actuellement CHECK (role IN ('client', 'salon_owner', 'admin')).
     Votre demande utilise 'salon' (pas 'salon_owner').
     → Ce fichier DROP la contrainte existante et la recrée avec
       ('client', 'salon', 'admin').
       Si vous avez déjà des lignes avec role = 'salon_owner', mettez-les à jour
       AVANT d'exécuter ce fichier :
         UPDATE public.profiles SET role = 'salon' WHERE role = 'salon_owner';

  2. salons_insert_own n'imposait pas status = 'pending' → remplacée.
  3. Le trigger handle_new_user ne lisait pas le rôle des metadata → remplacé.

  RÈGLES D'EXÉCUTION
  ──────────────────
  - Incrémental et relançable sans erreur.
  - Jamais de DROP TABLE / TRUNCATE / DELETE.
  - ADD COLUMN IF NOT EXISTS partout.
  - DROP POLICY IF EXISTS avant chaque CREATE POLICY.
  - DROP TRIGGER IF EXISTS avant chaque CREATE TRIGGER.
*/

-- ═══════════════════════════════════════════════════════════════════
-- 1. FONCTION is_admin()
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;


-- ═══════════════════════════════════════════════════════════════════
-- 2. TABLE profiles — colonnes manquantes + contrainte role
-- ═══════════════════════════════════════════════════════════════════

-- Colonne full_name (la migration 001 n'a que "name")
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS full_name text;

-- ⚠️ Remplacement de la contrainte role pour accepter 'salon'
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_role_check2'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check2
      CHECK (role IN ('client', 'salon', 'admin'));
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════
-- 3. TABLE salons — colonnes manquantes
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS district          text,
  ADD COLUMN IF NOT EXISTS manager_name      text,
  ADD COLUMN IF NOT EXISTS categories        text[],
  ADD COLUMN IF NOT EXISTS opening_hours     text,
  ADD COLUMN IF NOT EXISTS photos            text[],
  ADD COLUMN IF NOT EXISTS proof_url         text,
  ADD COLUMN IF NOT EXISTS rejection_reason  text,
  ADD COLUMN IF NOT EXISTS reviewed_at       timestamptz;

-- UNIQUE sur owner_id (un compte = un salon max)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'salons_owner_id_key'
      AND conrelid = 'public.salons'::regclass
  ) THEN
    ALTER TABLE public.salons
      ADD CONSTRAINT salons_owner_id_key UNIQUE (owner_id);
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════
-- 4. TRIGGER handle_new_user — remplacé pour gérer le rôle
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  raw_role  text;
  safe_role text;
BEGIN
  raw_role := NEW.raw_user_meta_data->>'role';

  -- Seuls 'client' et 'salon' sont acceptés — JAMAIS 'admin'
  IF raw_role = 'salon' THEN
    safe_role := 'salon';
  ELSE
    safe_role := 'client';
  END IF;

  INSERT INTO public.profiles (id, name, email, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',
             NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, ''),
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    safe_role
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ═══════════════════════════════════════════════════════════════════
-- 5. PROFILS pour les comptes existants sans profil
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO public.profiles (id, name, email, role)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name',
           u.raw_user_meta_data->>'name', ''),
  COALESCE(u.email, ''),
  'client'
FROM auth.users u
WHERE u.id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════
-- 6. TRIGGER : protection du champ role dans profiles
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Modification du rôle non autorisée.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_role ON public.profiles;
CREATE TRIGGER guard_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();


-- ═══════════════════════════════════════════════════════════════════
-- 7. TRIGGER : protection du champ status dans salons
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.protect_salon_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Modification du statut non autorisée.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_salon_status ON public.salons;
CREATE TRIGGER guard_salon_status
  BEFORE UPDATE ON public.salons
  FOR EACH ROW EXECUTE FUNCTION public.protect_salon_status();


-- ═══════════════════════════════════════════════════════════════════
-- 8. RLS — profiles (remplacement des politiques existantes)
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own"    ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "profiles: lecture"      ON public.profiles;
CREATE POLICY "profiles: lecture" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own"   ON public.profiles;
DROP POLICY IF EXISTS "profiles: mise à jour" ON public.profiles;
CREATE POLICY "profiles: mise à jour" ON public.profiles
  FOR UPDATE
  USING  (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles: suppression admin" ON public.profiles;
CREATE POLICY "profiles: suppression admin" ON public.profiles
  FOR DELETE USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════════
-- 9. RLS — salons (remplacement des politiques existantes)
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "salons_select_approved" ON public.salons;
DROP POLICY IF EXISTS "salons_select_own"      ON public.salons;
DROP POLICY IF EXISTS "salons_select_admin"    ON public.salons;
DROP POLICY IF EXISTS "salons: lecture"        ON public.salons;
CREATE POLICY "salons: lecture" ON public.salons
  FOR SELECT USING (
    status = 'approved'
    OR owner_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "salons_insert_own"  ON public.salons;
DROP POLICY IF EXISTS "salons: insertion"  ON public.salons;
CREATE POLICY "salons: insertion" ON public.salons
  FOR INSERT WITH CHECK (
    owner_id = auth.uid()
    AND status = 'pending'
  );

DROP POLICY IF EXISTS "salons_update_own"   ON public.salons;
DROP POLICY IF EXISTS "salons_update_admin" ON public.salons;
DROP POLICY IF EXISTS "salons: mise à jour" ON public.salons;
CREATE POLICY "salons: mise à jour" ON public.salons
  FOR UPDATE
  USING  (owner_id = auth.uid() OR public.is_admin())
  WITH CHECK (owner_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "salons_delete_own"   ON public.salons;
DROP POLICY IF EXISTS "salons_delete_admin" ON public.salons;
DROP POLICY IF EXISTS "salons: suppression" ON public.salons;
CREATE POLICY "salons: suppression" ON public.salons
  FOR DELETE USING (public.is_admin());


-- ═══════════════════════════════════════════════════════════════════
-- 10. STORAGE — bucket public 'salon-photos'
--     Chaque utilisateur écrit uniquement dans le dossier <uid>/
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public)
VALUES ('salon-photos', 'salon-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "salon-photos: lecture publique" ON storage.objects;
CREATE POLICY "salon-photos: lecture publique" ON storage.objects
  FOR SELECT USING (bucket_id = 'salon-photos');

DROP POLICY IF EXISTS "salon-photos: upload dossier propre" ON storage.objects;
CREATE POLICY "salon-photos: upload dossier propre" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'salon-photos'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

DROP POLICY IF EXISTS "salon-photos: update dossier propre" ON storage.objects;
CREATE POLICY "salon-photos: update dossier propre" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'salon-photos'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

DROP POLICY IF EXISTS "salon-photos: delete dossier propre" ON storage.objects;
CREATE POLICY "salon-photos: delete dossier propre" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'salon-photos'
    AND (
      auth.uid()::text = (string_to_array(name, '/'))[1]
      OR public.is_admin()
    )
  );


-- ═══════════════════════════════════════════════════════════════════
-- POUR SE PASSER ADMIN MANUELLEMENT
-- Exécutez cette requête dans le SQL Editor en remplaçant l'e-mail
-- ═══════════════════════════════════════════════════════════════════
/*
UPDATE public.profiles
SET role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = '<votre-email@exemple.com>'
);
*/
