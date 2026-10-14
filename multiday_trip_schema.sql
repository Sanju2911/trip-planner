-- Multi-Day Trip Planning Features
-- Run this to add comprehensive trip planning capabilities

-- Day-wise Itinerary Table
CREATE TABLE IF NOT EXISTS trip_itinerary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  date DATE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIME,
  end_time TIME,
  location TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  activity_type TEXT, -- sightseeing, food, travel, rest, adventure, shopping, etc.
  estimated_cost DECIMAL(10, 2),
  booking_link TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Expenses Tracker
CREATE TABLE IF NOT EXISTS trip_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- transport, food, accommodation, activities, misc
  subcategory TEXT, -- train, flight, bus, breakfast, lunch, hotel, etc.
  amount DECIMAL(10, 2) NOT NULL,
  paid_by UUID REFERENCES profiles(id),
  shared_with UUID[], -- array of user IDs who share this expense
  description TEXT,
  date DATE,
  receipt_url TEXT,
  is_settled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Transport/Tickets Management
CREATE TABLE IF NOT EXISTS trip_transport (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  transport_type TEXT NOT NULL, -- train, flight, bus, taxi, rental-car
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  departure_time TIMESTAMP,
  arrival_time TIMESTAMP,
  pnr_number TEXT,
  booking_reference TEXT,
  ticket_url TEXT,
  seat_numbers TEXT,
  platform_gate TEXT,
  cost_per_person DECIMAL(10, 2),
  total_cost DECIMAL(10, 2),
  booked_by UUID REFERENCES profiles(id),
  passengers UUID[], -- array of member IDs traveling together
  how_to_reach TEXT, -- instructions to reach station/airport
  pickup_point TEXT,
  pickup_time TIME,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Group Coordination (who's traveling together)
CREATE TABLE IF NOT EXISTS trip_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL, -- e.g., "Train Group 1", "Flight Group", "Local Group"
  members UUID[] NOT NULL, -- array of user IDs
  transport_id UUID REFERENCES trip_transport(id),
  meeting_point TEXT,
  meeting_time TIME,
  coordinator_id UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Packing List
CREATE TABLE IF NOT EXISTS trip_packing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  item_name TEXT NOT NULL,
  category TEXT, -- clothes, toiletries, electronics, documents, medicines, etc.
  quantity INTEGER DEFAULT 1,
  is_packed BOOLEAN DEFAULT FALSE,
  is_shared BOOLEAN DEFAULT FALSE, -- if true, visible to all members
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Emergency Contacts
CREATE TABLE IF NOT EXISTS trip_emergency_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL, -- hotel, hospital, police, embassy, local-contact
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  notes TEXT,
  added_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Weather & Conditions
CREATE TABLE IF NOT EXISTS trip_conditions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weather_forecast TEXT,
  temperature_high INTEGER,
  temperature_low INTEGER,
  conditions TEXT, -- sunny, rainy, cloudy, etc.
  special_notes TEXT, -- festivals, holidays, peak season, etc.
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_itinerary_trip ON trip_itinerary(trip_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_day ON trip_itinerary(trip_id, day_number);
CREATE INDEX IF NOT EXISTS idx_expenses_trip ON trip_expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_transport_trip ON trip_transport(trip_id);
CREATE INDEX IF NOT EXISTS idx_groups_trip ON trip_groups(trip_id);
CREATE INDEX IF NOT EXISTS idx_packing_trip_user ON trip_packing(trip_id, user_id);

-- Add new columns to existing trips table if they don't exist
ALTER TABLE trips ADD COLUMN IF NOT EXISTS total_days INTEGER;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS trip_type TEXT; -- leisure, business, adventure, religious, etc.
ALTER TABLE trips ADD COLUMN IF NOT EXISTS difficulty_level TEXT; -- easy, moderate, challenging
ALTER TABLE trips ADD COLUMN IF NOT EXISTS group_size_limit INTEGER;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS booking_deadline DATE;

COMMENT ON TABLE trip_itinerary IS 'Day-wise activities and plans for multi-day trips';
COMMENT ON TABLE trip_expenses IS 'Track all trip expenses and split bills';
COMMENT ON TABLE trip_transport IS 'Manage tickets, transport, and how to reach';
COMMENT ON TABLE trip_groups IS 'Coordinate groups of people traveling together';
COMMENT ON TABLE trip_packing IS 'Personal and shared packing lists';
COMMENT ON TABLE trip_emergency_contacts IS 'Important contacts for the trip';
COMMENT ON TABLE trip_conditions IS 'Weather and special conditions during the trip';
