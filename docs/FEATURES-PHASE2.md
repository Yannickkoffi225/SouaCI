# Tableau de bord SouaCI : État de livraison (Phase 2)

## 1. Sécurité du stockage (TERMINÉ)
- **Transaction SQL exécutée :**
  - Suppression de la politique publique `Upload public d'images`.
  - Limitation du bucket `images-annonces` à **5 Mo** (JPEG/PNG).
  - Création de la politique `souaci_photos_insert` (Utilisateur authentifié uniquement, dossier propre `auth.uid()`).
- **Statut :** Vérifié par l'utilisateur. Le stockage est maintenant sécurisé.

## 2. Authentification & Resend (TERMINÉ)
- **Domaine :** `auth.souaci.com` (Vérifié sur Resend).
- **Expéditeur :** `noreply@auth.souaci.com` (Configuré dans Supabase SMTP).
- **Clé API Resend :** Créée et activée (Permissions : Sending, Domaine restreint).
- **Base de données :** Liaisons manuelles supprimées, déclencheur `public.create_auth_profile()` fonctionnel.
- **Statut :** Inscription et récupération fonctionnent via Supabase Auth + Resend.

## 3. Code : Tableaux de bord & Modération (EN COURS)
**Objectif :** Créer les interfaces pour Propriétaires et Administrateurs sur la branche `arena/5f6a3678-souaci`.

### A. Tableau de bord Propriétaire (`dashboard-proprietaire.html`)
- **Accès :** Uniquement si `owner_auth_id` correspond à `auth.uid()`.
- **Fonctionnalités :**
  - Liste des annonces propres (via RLS `annonces_owner_insert` / `annonces_owner_delete`).
  - Modification du profil (`public.profiles` via RLS `profile_update_own`).
  - Disponibilité (champ à ajouter dans `annonces` ou table séparée).
  - Statut des visites (stockées dans une nouvelle table `visites`).

### B. Tableau de bord Administrateur (`dashboard-admin.html`)
- **Accès :** Rôle serveur (à simuler via un champ `is_admin` dans `public.profiles` ou liste blanche).
- **Fonctionnalités :**
  - Modération des annonces (Approbation/Refus).
  - Vue globale des signalements (stockés dans une nouvelle table `signalements`).
  - Contact WhatsApp de secours : `+2250789948925`.

### C. Nouvelles tables SQL (À exécuter)
- `visites` : `id`, `annonce_id`, `client_name`, `client_phone`, `date`, `time`, `message`, `status` (demandé/confirmé/refusé/proposition), `owner_auth_id`, `client_auth_id`.
- `signalements` : `id`, `annonce_id`, `client_auth_id`, `motif`, `statut` (en attente/traité).
- `alertes_email` : `id`, `client_auth_id`, `critères` (ville, type, prix), `consentement`, `dernier_envoi`.

### D. Alertes Email (Resend + Supabase)
- **Service :** Planification (cron ou tâche serveur) pour envoyer les alertes basées sur `alertes_email`.
- **Expéditeur :** `noreply@auth.souaci.com`.
- **Contenu :** Liste des nouvelles annonces correspondant aux critères.

---

## Plan d'action immédiat (Branche arena/5f6a3678-souaci)

1. **Créer les tables SQL manquantes** (`visites`, `signalements`, `alertes_email`) via une migration `003_features.sql`.
2. **Ajouter les fichiers HTML/JS pour les tableaux de bord** (`dashboard-proprietaire.html`, `dashboard-admin.html`, `dashboard.js`).
3. **Mettre à jour `index.html`** pour inclure les liens vers les tableaux de bord (si connecté).
4. **Mettre à jour `docs/FEATURES.md`** pour refléter les livraisons.

---

## Étape 1 : Migration SQL 003 (Tables fonctionnalités)

**Copie et exécute ce script dans l'éditeur SQL de Supabase (SQL Editor) :**

```sql
BEGIN;

-- 1. Table des visites (stockées, pas seulement WhatsApp)
CREATE TABLE public.visites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  annonce_id uuid REFERENCES public.annonces(id) ON DELETE CASCADE,
  client_auth_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  proprietaire_auth_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  nom text NOT NULL,
  telephone text NOT NULL,
  date date NOT NULL,
  heure time NOT NULL,
  message text,
  statut text DEFAULT 'demandé' CHECK (statut IN ('demandé', 'confirmé', 'refusé', 'proposition')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.visites ENABLE ROW LEVEL SECURITY;
-- Client peut voir/modifier sa propre visite
CREATE POLICY visite_client_read_own ON public.visites FOR SELECT TO authenticated USING (client_auth_id = (SELECT auth.uid()));
CREATE POLICY visite_client_update_own ON public.visites FOR UPDATE TO authenticated USING (client_auth_id = (SELECT auth.uid())) WITH CHECK (client_auth_id = (SELECT auth.uid()));
-- Propriétaire peut voir/modifier les visites de ses annonces
CREATE POLICY visite_proprietaire_read ON public.visites FOR SELECT TO authenticated USING (proprietaire_auth_id = (SELECT auth.uid()));
CREATE POLICY visite_proprietaire_update ON public.visites FOR UPDATE TO authenticated USING (proprietaire_auth_id = (SELECT auth.uid())) WITH CHECK (proprietaire_auth_id = (SELECT auth.uid()));
-- Admin peut tout voir (à définir via rôle ou liste blanche plus tard)

-- 2. Table des signalements (stockés)
CREATE TABLE public.signalements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  annonce_id uuid REFERENCES public.annonces(id) ON DELETE CASCADE,
  client_auth_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  motif text NOT NULL,
  details text,
  statut text DEFAULT 'en attente' CHECK (statut IN ('en attente', 'traité', 'rejeté')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.signalements ENABLE ROW LEVEL SECURITY;
CREATE POLICY signalement_client_insert ON public.signalements FOR INSERT TO authenticated WITH CHECK (client_auth_id = (SELECT auth.uid()));
CREATE POLICY signalement_client_read ON public.signalements FOR SELECT TO authenticated USING (client_auth_id = (SELECT auth.uid()));
-- Admin peut tout lire (à définir)

-- 3. Table des alertes email (consentement & préférences)
CREATE TABLE public.alertes_email (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_auth_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  criteres jsonb NOT NULL, -- {ville, type, prix_max, etc.}
  consentement boolean DEFAULT true,
  dernier_envoi timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.alertes_email ENABLE ROW LEVEL SECURITY;
CREATE POLICY alerte_client_own ON public.alertes_email FOR ALL TO authenticated USING (client_auth_id = (SELECT auth.uid())) WITH CHECK (client_auth_id = (SELECT auth.uid()));

-- 5. Mise à jour de la table annonces pour la disponibilité (si nécessaire)
-- Déjà existant : owner_auth_id, owner_phone, etc.
-- Ajoutons un champ de disponibilité si besoin (optionnel, on peut utiliser une table séparée)
-- ALTER TABLE public.annonces ADD COLUMN disponibilite text DEFAULT 'Disponible';

COMMIT;
```

**Action :** Exécute ce script dans l'éditeur SQL de Supabase.

---

## Étape 2 : Création des fichiers de tableau de bord (Code)

Je vais maintenant créer les fichiers suivants dans la branche `arena/5f6a3678-souaci` :
1. `dashboard-proprietaire.html` (Interface propriétaire)
2. `dashboard-admin.html` (Interface admin)
3. `dashboard.js` (Logique commune)
4. Mise à jour de `index.html` (Liens vers les tableaux de bord)
5. Mise à jour de `docs/FEATURES.md`

**Veux-tu que je commence par la création de la migration SQL 003 (ci-dessus) ou directement par les fichiers HTML/JS ?**

(Puisque tu as déjà exécuté le SQL de stockage, je suppose que tu peux exécuter celui-ci aussi. Dis-moi si tu veux que je génère les fichiers de code maintenant !)

---

**Que veux-tu faire, mon ami ?**

1. **Exécuter la migration SQL 003** (Tables visites, signalements, alertes) ?
2. **Créer les fichiers HTML/JS des tableaux de bord** ?
3. **Mettre à jour `index.html`** pour inclure les liens ?

**Dis-moi ta priorité ! Le stockage est sécurisé, l'auth fonctionne, on attaque les fonctionnalités !**