-- Deux administrateurs séparés, chacun lié à son propre compte Stripe Connect.
-- Les adresses sont comparées côté serveur après vérification par Supabase Auth.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    CASE
      WHEN lower(NEW.email) IN (
        'visdar@outlook.fr',
        'anna.mecatronics@gmail.com'
      ) THEN 'admin'
      ELSE 'user'
    END,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.email
    )
  )
  ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role,
      full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);
  RETURN NEW;
END;
$$;

-- Promote the two accounts as soon as they exist. Future invitations are
-- handled by handle_new_user above.
UPDATE public.profiles AS profile
SET role = 'admin'
FROM auth.users AS auth_user
WHERE profile.id = auth_user.id
  AND lower(auth_user.email) IN (
    'visdar@outlook.fr',
    'anna.mecatronics@gmail.com'
  );

-- A signed-in user only needs their own profile to route after login.
DROP POLICY IF EXISTS "Authenticated users can view all profiles"
  ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile"
  ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Profiles are created by the auth trigger. A client cannot insert a forged
-- administrator profile or update the role column.
REVOKE INSERT ON public.profiles FROM anon, authenticated;
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (
  full_name,
  phone,
  address,
  city,
  postal_code,
  country
) ON public.profiles TO authenticated;
