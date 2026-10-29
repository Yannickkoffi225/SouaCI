-- Run after backup. No legacy account/password is deleted or automatically linked.
BEGIN;
-- Stop rather than silently combining new protections with unknown permissive policies.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename IN ('annonces','utilisateurs')) THEN
    RAISE EXCEPTION 'Des anciennes policies existent encore. Faire auditer leurs définitions avant de poursuivre.';
  END IF;
END $$;

ALTER TABLE public.annonces ADD COLUMN owner_auth_id uuid REFERENCES auth.users(id);
ALTER TABLE public.annonces ADD COLUMN owner_phone text NOT NULL DEFAULT '';
CREATE INDEX annonces_owner_auth_idx ON public.annonces(owner_auth_id);
-- Legacy user_id and all rows remain intact. New ads have no legacy owner.
ALTER TABLE public.annonces ALTER COLUMN user_id DROP NOT NULL;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  prenom text NOT NULL DEFAULT '',
  nom text NOT NULL DEFAULT '',
  telephone text NOT NULL DEFAULT '',
  ville text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utilisateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annonces ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.utilisateurs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (prenom, nom, telephone, ville) ON public.profiles TO authenticated;
CREATE POLICY profile_read_own ON public.profiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));
CREATE POLICY profile_update_own ON public.profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));

-- Metadata is untrusted text, never an administrator role or legacy account ID.
CREATE FUNCTION public.create_auth_profile() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles(id, prenom, nom, telephone, ville)
  VALUES (NEW.id, left(coalesce(NEW.raw_user_meta_data->>'prenom',''),100),
    left(coalesce(NEW.raw_user_meta_data->>'nom',''),100),
    left(coalesce(NEW.raw_user_meta_data->>'telephone',''),30),
    left(coalesce(NEW.raw_user_meta_data->>'ville',''),100));
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.create_auth_profile() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER souaci_auth_profile AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.create_auth_profile();
INSERT INTO public.profiles(id) SELECT id FROM auth.users ON CONFLICT DO NOTHING;

REVOKE ALL ON public.annonces FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.annonces TO anon, authenticated;
GRANT INSERT (owner_auth_id, owner_phone, titre, operation, type_bien, description,
 ville, commune, prix, surface, pieces, salles_de_bain, photo, photos_supplementaires)
 ON public.annonces TO authenticated;
GRANT DELETE ON public.annonces TO authenticated;
CREATE POLICY annonces_public_read ON public.annonces FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY annonces_owner_insert ON public.annonces FOR INSERT TO authenticated
 WITH CHECK (owner_auth_id = (SELECT auth.uid()) AND user_id IS NULL);
CREATE POLICY annonces_owner_delete ON public.annonces FOR DELETE TO authenticated
 USING (owner_auth_id = (SELECT auth.uid()));
-- Only the actual sequence for annonces.id, not all database sequences.
DO $$ DECLARE seq text;
BEGIN
 seq := pg_get_serial_sequence('public.annonces','id');
 IF seq IS NOT NULL THEN EXECUTE format('GRANT USAGE ON SEQUENCE %s TO authenticated',seq); END IF;
END $$;
COMMIT;
