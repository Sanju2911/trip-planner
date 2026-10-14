-- Update Profiles table to include is_approved and username
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;

-- Automatically approve the admin if already exists
UPDATE public.profiles SET is_approved = TRUE WHERE email = 'admin@example.com';

-- Update the new user trigger to assign approval to admin instantly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, username, role, is_approved)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'username',
    CASE WHEN NEW.email = 'admin@example.com' THEN 'admin' ELSE 'user' END,
    CASE WHEN NEW.email = 'admin@example.com' THEN TRUE ELSE FALSE END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

