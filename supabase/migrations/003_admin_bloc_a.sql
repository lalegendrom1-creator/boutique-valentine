/*
  003_admin_bloc_a.sql
  Bloc A — Administration (Partie 1) : Gestion avancée des salons

  RÈGLES D'EXÉCUTION
  ──────────────────
  - Incrémental et relançable sans erreur.
  - Jamais de DROP TABLE / TRUNCATE / DELETE.
  - ADD COLUMN IF NOT EXISTS partout.
*/

-- ═══════════════════════════════════════════════════════════════════
-- 1. NOUVELLES COLONNES SUR "salons"
-- ═══════════════════════════════════════════════════════════════════

-- is_featured : badge "Recommandé" pour mettre en avant sur l'accueil
ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

-- correction_request : note visible par le salon si on lui demande des corrections
-- (le statut reste 'pending')
ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS correction_request text;

-- suspension_reason : motif si le salon est suspendu
ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS suspension_reason text;


-- ═══════════════════════════════════════════════════════════════════
-- 2. AJUSTEMENT DU TRIGGER DE PROTECTION DU STATUT
-- ═══════════════════════════════════════════════════════════════════
-- On vérifie que la fonction protect_salon_status existe (créée en 002)
-- et on l'adapte pour s'assurer que seuls les admins modifient 
-- is_featured, correction_request et suspension_reason (en plus de status et rejection_reason).

CREATE OR REPLACE FUNCTION public.protect_salon_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si on n'est pas admin, on bloque toute modification des champs sensibles
  IF NOT public.is_admin() THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      RAISE EXCEPTION 'Modification du statut non autorisée.';
    END IF;
    IF OLD.is_featured IS DISTINCT FROM NEW.is_featured THEN
      RAISE EXCEPTION 'Modification du badge "Recommandé" non autorisée.';
    END IF;
    IF OLD.rejection_reason IS DISTINCT FROM NEW.rejection_reason THEN
      RAISE EXCEPTION 'Modification du motif de refus non autorisée.';
    END IF;
    IF OLD.correction_request IS DISTINCT FROM NEW.correction_request THEN
      RAISE EXCEPTION 'Modification de la demande de correction non autorisée.';
    END IF;
    IF OLD.suspension_reason IS DISTINCT FROM NEW.suspension_reason THEN
      RAISE EXCEPTION 'Modification du motif de suspension non autorisée.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
