-- FRESH, DISPOSABLE SUPABASE PROJECTS ONLY.
-- Matches the current custom-auth React client. It deliberately grants anonymous
-- access because the client does not issue Supabase Auth sessions.
-- This is NOT a production security model. Do not use real passwords or personal data.
-- Do not combine with the destructive historical SQL scripts in the repository root.
BEGIN;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  display_name text,
  username text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_approved boolean DEFAULT false,
  avatar_url text,
  display_name_changed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  created_by uuid CONSTRAINT trips_created_by_custom_fkey REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_location text, target_lat double precision, target_lng double precision,
  finalized_date date, end_date date, total_days integer DEFAULT 1,
  possible_dates text[] DEFAULT '{}', reschedule_dates text[] DEFAULT '{}',
  home_exit_time text, return_home_time text, starting_point text,
  meeting_options text[] DEFAULT '{}', meet_condition text, home_permission_excuse text,
  breakfast_point text, breakfast_lat double precision, breakfast_lng double precision, breakfast_time text,
  lunch_point text, lunch_lat double precision, lunch_lng double precision, lunch_time text,
  dinner_point text, dinner_lat double precision, dinner_lng double precision, dinner_time text,
  budget_per_person text, cover_image_url text,
  accommodations jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.trip_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL CONSTRAINT trip_members_trip_id_fkey REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL CONSTRAINT trip_members_user_id_custom_fkey REFERENCES public.profiles(id) ON DELETE CASCADE,
  transport_modes text[] DEFAULT '{}', carpool_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(), UNIQUE (trip_id, user_id)
);

CREATE TABLE public.trip_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  uploaded_by uuid CONSTRAINT trip_images_uploaded_custom_fkey REFERENCES public.profiles(id) ON DELETE SET NULL,
  storage_path text NOT NULL, public_url text NOT NULL, created_at timestamptz DEFAULT now()
);

CREATE TABLE public.trip_meeting_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  voted_option text NOT NULL, created_at timestamptz DEFAULT now(), UNIQUE (trip_id, user_id)
);

CREATE TABLE public.trip_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL, created_at timestamptz DEFAULT now()
);

CREATE TABLE public.trip_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  url text NOT NULL, title text, created_at timestamptz DEFAULT now()
);

CREATE TABLE public.trip_itinerary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  day_number integer NOT NULL, title text NOT NULL, description text,
  start_time time, end_time time, location text, activity_type text,
  estimated_cost numeric(10,2), created_at timestamptz DEFAULT now()
);

CREATE TABLE public.trip_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  title text NOT NULL, category text NOT NULL, amount numeric(10,2) NOT NULL,
  paid_by uuid REFERENCES public.profiles(id), split_with uuid[] DEFAULT '{}',
  description text, created_at timestamptz DEFAULT now()
);

CREATE TABLE public.trip_transport (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  type text NOT NULL, booking_details text, departure_time timestamp,
  arrival_time timestamp, pickup_location text, cost_per_person numeric(10,2),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.trip_packing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  item_name text NOT NULL, type text DEFAULT 'personal', is_checked boolean DEFAULT false,
  added_by uuid REFERENCES public.profiles(id), created_at timestamptz DEFAULT now()
);

CREATE INDEX ON public.trip_members (user_id, trip_id);
CREATE INDEX ON public.trip_itinerary (trip_id, day_number);
CREATE INDEX ON public.trip_expenses (trip_id);
CREATE INDEX ON public.trip_transport (trip_id);
CREATE INDEX ON public.trip_packing (trip_id);

-- Explicit demo-only access; replace with authenticated policies before deployment.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.profiles, public.trips, public.trip_members, public.trip_images,
  public.trip_meeting_votes, public.trip_comments, public.trip_links,
  public.trip_itinerary, public.trip_expenses, public.trip_transport, public.trip_packing
  TO anon, authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('trip-images', 'trip-images', true);
CREATE POLICY "Demo image reads" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'trip-images');
CREATE POLICY "Demo image uploads" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'trip-images');
CREATE POLICY "Demo image deletes" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'trip-images');

COMMIT;
