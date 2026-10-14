-- Drop previous policies to clean up
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view trips they are part of" ON public.trips;
DROP POLICY IF EXISTS "Users can create trips" ON public.trips;
DROP POLICY IF EXISTS "Trip creators and admins can update trips" ON public.trips;
DROP POLICY IF EXISTS "Trip creators and admins can delete trips" ON public.trips;

-- Drop storage policies that rely on auth.uid() or that we are about to create
DROP POLICY IF EXISTS "Users can upload trip images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view trip images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own trip images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads for custom auth" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes for custom auth" ON storage.objects;
DROP POLICY IF EXISTS "Allow public viewing of images" ON storage.objects;

CREATE POLICY "Allow public uploads for custom auth" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'trip-images');
CREATE POLICY "Allow public deletes for custom auth" ON storage.objects FOR DELETE USING (bucket_id = 'trip-images');
CREATE POLICY "Allow public viewing of images" ON storage.objects FOR SELECT USING (bucket_id = 'trip-images');

-- Drop foreign keys depending on auth.users
ALTER TABLE IF EXISTS public.trips DROP CONSTRAINT IF EXISTS trips_created_by_fkey;
ALTER TABLE IF EXISTS public.trip_members DROP CONSTRAINT IF EXISTS trip_members_user_id_fkey;
ALTER TABLE IF EXISTS public.trip_images DROP CONSTRAINT IF EXISTS trip_images_uploaded_by_fkey;
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Drop trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate Profiles table with an independent UUID primary key and password field
DROP TABLE IF EXISTS public.profiles CASCADE;
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  display_name TEXT,
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_approved BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recreate Foreign Keys to link to the new independent profiles table
ALTER TABLE public.trips 
  ADD CONSTRAINT trips_created_by_custom_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.trip_members 
  ADD CONSTRAINT trip_members_user_id_custom_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.trip_images 
  ADD CONSTRAINT trip_images_uploaded_custom_fkey 
  FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Insert your root admin
INSERT INTO public.profiles (email, password, display_name, username, role, is_approved)
VALUES (
  'admin@example.com',
  'REPLACE_WITH_A_UNIQUE_DEMO_PASSWORD',
  'Demo Admin',
  'demo_admin',
  'admin',
  TRUE
) ON CONFLICT (email) DO NOTHING;

-- Critically ensure RLS is disabled AFTER tables are created so the website can read/write them!
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_images DISABLE ROW LEVEL SECURITY;

