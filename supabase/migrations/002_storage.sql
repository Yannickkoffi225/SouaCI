-- Independent transaction. Does not delete existing photos or bucket policies.
-- If policies already exist, stop for review: PostgreSQL permissive policies combine with OR.
BEGIN;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects') THEN
  RAISE EXCEPTION 'Policies Storage existantes : audit requis. Ne pas les supprimer à l’aveugle.';
 END IF;
END $$;
UPDATE storage.buckets SET file_size_limit=5242880, allowed_mime_types=ARRAY['image/jpeg','image/png']
 WHERE id='images-annonces';
CREATE POLICY souaci_photos_insert ON storage.objects FOR INSERT TO authenticated
 WITH CHECK (bucket_id='images-annonces' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
-- Public bucket URLs retain existing photo links. No new UPDATE/DELETE permissions.
COMMIT;
