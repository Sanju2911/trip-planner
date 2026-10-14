-- Add the meeting options array onto the Trips table
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS meeting_options TEXT[] DEFAULT '{}';


-- 1) Meeting Votes Table
DROP TABLE IF EXISTS public.trip_meeting_votes CASCADE;

CREATE TABLE public.trip_meeting_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    voted_option TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trip_id, user_id) -- Only one vote per user per trip
);
-- Disable RLS for our custom auth flow (same as other tables)
ALTER TABLE public.trip_meeting_votes DISABLE ROW LEVEL SECURITY;


-- 2) Trip Comments Table
DROP TABLE IF EXISTS public.trip_comments CASCADE;

CREATE TABLE public.trip_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.trip_comments DISABLE ROW LEVEL SECURITY;


-- 3) Gallery Links Table
DROP TABLE IF EXISTS public.trip_links CASCADE;

CREATE TABLE public.trip_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.trip_links DISABLE ROW LEVEL SECURITY;


-- 4) Upgraded Food Stops Coordinates and Times
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS breakfast_lat FLOAT;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS breakfast_lng FLOAT;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS breakfast_time TEXT;

ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS lunch_lat FLOAT;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS lunch_lng FLOAT;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS lunch_time TEXT;

ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS dinner_lat FLOAT;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS dinner_lng FLOAT;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS dinner_time TEXT;


-- 5) Profile Settings Lockdown
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name_changed BOOLEAN DEFAULT FALSE;


-- 6) Budget Planning
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS budget_per_person TEXT;


-- 7) Transport Mode Tracking
ALTER TABLE public.trip_members ADD COLUMN IF NOT EXISTS transport_modes TEXT[] DEFAULT '{}';
ALTER TABLE public.trip_members ADD COLUMN IF NOT EXISTS carpool_user_id UUID REFERENCES public.profiles(id);



-- 8) Multi-Day Trips & Accommodations Array
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS accommodations JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.trips DROP COLUMN IF EXISTS stay_location;
ALTER TABLE public.trips DROP COLUMN IF EXISTS stay_lat;
ALTER TABLE public.trips DROP COLUMN IF EXISTS stay_lng;
ALTER TABLE public.trips DROP COLUMN IF EXISTS stay_reach_time;
ALTER TABLE public.trips DROP COLUMN IF EXISTS stay_cost;
ALTER TABLE public.trips DROP COLUMN IF EXISTS stay_link;

-- 9) Total Days for Multi-Day Planning
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS total_days INTEGER DEFAULT 1;
