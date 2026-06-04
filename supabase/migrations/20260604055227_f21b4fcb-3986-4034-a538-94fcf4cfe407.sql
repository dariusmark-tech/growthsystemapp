-- 1. Restrict EXECUTE on SECURITY DEFINER trigger functions (they only run as triggers)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- 2. Replace broad public listing policy on plant-photos with owner-scoped listing.
-- Public object URLs still work (public bucket); this only restricts the list/SELECT API.
DROP POLICY IF EXISTS "Plant photos are publicly viewable" ON storage.objects;

CREATE POLICY "Users can list their own plant photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'plant-photos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);