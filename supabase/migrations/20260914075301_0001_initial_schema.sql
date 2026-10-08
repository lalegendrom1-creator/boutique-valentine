/*
# BeautyNear — Initial Database Schema

## Overview
Creates the complete database schema for the BeautyNear beauty salon marketplace platform.
This migration sets up all core tables with PostGIS geographic support, row-level security,
and proper relationships.

## Extensions
- Enables `postgis` for geographic distance queries.

## New Tables
1. profiles — extends auth.users with name, phone, role, avatar
2. salons — salon listings with geo_point (PostGIS), status (pending/approved/suspended/rejected)
3. services — salon services with price and duration
4. business_hours — weekly opening hours per salon
5. staff — salon employees
6. appointments — bookings linking client, salon, service, staff
7. reviews — client reviews tied to completed appointments
8. favorites — client favorite salons
9. salon_images — gallery photos

## Security (RLS)
- All tables have RLS enabled.
- Profiles: users read/update their own; admins read all.
- Salons: public read for approved; owners CRUD their own; admins full.
- Services/business_hours/staff/salon_images: public read for approved salons; owner manages own.
- Appointments: clients and salon owners see relevant ones; clients create their own.
- Reviews: public read for approved salons; clients create after completed appointment; owners respond.
- Favorites: users manage their own only.

## Indexes
- salons.city, salons.neighborhood, salons.status, salons.geo_point (GIST)
- services.salon_id, appointments.salon_id, appointments.user_id, appointments.date
- reviews.salon_id, favorites.user_id, favorites.salon_id
*/

-- =============================================
-- Extensions
-- =============================================
CREATE EXTENSION IF NOT EXISTS postgis;

-- =============================================
-- 1. profiles
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text,
  role text NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'salon_owner', 'admin')),
  avatar text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_select_public" ON profiles;
CREATE POLICY "profiles_select_public" ON profiles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "profiles_insert_self" ON profiles;
CREATE POLICY "profiles_insert_self" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =============================================
-- 2. salons
-- =============================================
CREATE TABLE IF NOT EXISTS salons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  phone text,
  whatsapp text,
  address text,
  city text,
  neighborhood text,
  latitude double precision,
  longitude double precision,
  geo_point geometry(Point, 4326),
  logo text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_salon_geo_point()
RETURNS trigger AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geo_point = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_salon_geo_point ON salons;
CREATE TRIGGER trg_set_salon_geo_point
  BEFORE INSERT OR UPDATE OF latitude, longitude ON salons
  FOR EACH ROW EXECUTE FUNCTION set_salon_geo_point();

CREATE INDEX IF NOT EXISTS idx_salons_city ON salons(city);
CREATE INDEX IF NOT EXISTS idx_salons_neighborhood ON salons(neighborhood);
CREATE INDEX IF NOT EXISTS idx_salons_status ON salons(status);
CREATE INDEX IF NOT EXISTS idx_salons_geo_point ON salons USING GIST (geo_point);
CREATE INDEX IF NOT EXISTS idx_salons_owner ON salons(owner_id);

ALTER TABLE salons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "salons_select_approved" ON salons;
CREATE POLICY "salons_select_approved" ON salons FOR SELECT
  TO anon, authenticated USING (status = 'approved');

DROP POLICY IF EXISTS "salons_select_own" ON salons;
CREATE POLICY "salons_select_own" ON salons FOR SELECT
  TO authenticated USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "salons_select_admin" ON salons;
CREATE POLICY "salons_select_admin" ON salons FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "salons_insert_own" ON salons;
CREATE POLICY "salons_insert_own" ON salons FOR INSERT
  TO authenticated WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "salons_update_own" ON salons;
CREATE POLICY "salons_update_own" ON salons FOR UPDATE
  TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "salons_update_admin" ON salons;
CREATE POLICY "salons_update_admin" ON salons FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "salons_delete_own" ON salons;
CREATE POLICY "salons_delete_own" ON salons FOR DELETE
  TO authenticated USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "salons_delete_admin" ON salons;
CREATE POLICY "salons_delete_admin" ON salons FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- =============================================
-- 3. services
-- =============================================
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(10, 2) NOT NULL DEFAULT 0,
  duration integer NOT NULL DEFAULT 30 CHECK (duration > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_services_salon ON services(salon_id);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "services_select" ON services;
CREATE POLICY "services_select" ON services FOR SELECT
  TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM salons WHERE salons.id = services.salon_id AND salons.status = 'approved')
    OR EXISTS (SELECT 1 FROM salons WHERE salons.id = services.salon_id AND salons.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "services_insert_own" ON services;
CREATE POLICY "services_insert_own" ON services FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM salons WHERE salons.id = services.salon_id AND salons.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "services_update_own" ON services;
CREATE POLICY "services_update_own" ON services FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM salons WHERE salons.id = services.salon_id AND salons.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM salons WHERE salons.id = services.salon_id AND salons.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "services_delete_own" ON services;
CREATE POLICY "services_delete_own" ON services FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM salons WHERE salons.id = services.salon_id AND salons.owner_id = auth.uid())
  );

-- =============================================
-- 4. business_hours
-- =============================================
CREATE TABLE IF NOT EXISTS business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  day integer NOT NULL CHECK (day >= 0 AND day <= 6),
  opening_time time,
  closing_time time,
  is_closed boolean NOT NULL DEFAULT false,
  UNIQUE (salon_id, day)
);

CREATE INDEX IF NOT EXISTS idx_business_hours_salon ON business_hours(salon_id);

ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "business_hours_select" ON business_hours;
CREATE POLICY "business_hours_select" ON business_hours FOR SELECT
  TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM salons WHERE salons.id = business_hours.salon_id AND salons.status = 'approved')
    OR EXISTS (SELECT 1 FROM salons WHERE salons.id = business_hours.salon_id AND salons.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "business_hours_insert_own" ON business_hours;
CREATE POLICY "business_hours_insert_own" ON business_hours FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM salons WHERE salons.id = business_hours.salon_id AND salons.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "business_hours_update_own" ON business_hours;
CREATE POLICY "business_hours_update_own" ON business_hours FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM salons WHERE salons.id = business_hours.salon_id AND salons.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM salons WHERE salons.id = business_hours.salon_id AND salons.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "business_hours_delete_own" ON business_hours;
CREATE POLICY "business_hours_delete_own" ON business_hours FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM salons WHERE salons.id = business_hours.salon_id AND salons.owner_id = auth.uid())
  );

-- =============================================
-- 5. staff
-- =============================================
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  name text NOT NULL,
  specialty text,
  phone text,
  photo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_salon ON staff(salon_id);

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_select" ON staff;
CREATE POLICY "staff_select" ON staff FOR SELECT
  TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM salons WHERE salons.id = staff.salon_id AND salons.status = 'approved')
    OR EXISTS (SELECT 1 FROM salons WHERE salons.id = staff.salon_id AND salons.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "staff_insert_own" ON staff;
CREATE POLICY "staff_insert_own" ON staff FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM salons WHERE salons.id = staff.salon_id AND salons.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "staff_update_own" ON staff;
CREATE POLICY "staff_update_own" ON staff FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM salons WHERE salons.id = staff.salon_id AND salons.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM salons WHERE salons.id = staff.salon_id AND salons.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "staff_delete_own" ON staff;
CREATE POLICY "staff_delete_own" ON staff FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM salons WHERE salons.id = staff.salon_id AND salons.owner_id = auth.uid())
  );

-- =============================================
-- 6. appointments
-- =============================================
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  salon_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'no_show')),
  total_price numeric(10, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_user ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_salon ON appointments(salon_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointments_select" ON appointments;
CREATE POLICY "appointments_select" ON appointments FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM salons WHERE salons.id = appointments.salon_id AND salons.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "appointments_insert_own" ON appointments;
CREATE POLICY "appointments_insert_own" ON appointments FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "appointments_update" ON appointments;
CREATE POLICY "appointments_update" ON appointments FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM salons WHERE salons.id = appointments.salon_id AND salons.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM salons WHERE salons.id = appointments.salon_id AND salons.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "appointments_delete_own" ON appointments;
CREATE POLICY "appointments_delete_own" ON appointments FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- =============================================
-- 7. reviews
-- =============================================
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  salon_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  owner_response text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_salon ON reviews(salon_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select" ON reviews;
CREATE POLICY "reviews_select" ON reviews FOR SELECT
  TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM salons WHERE salons.id = reviews.salon_id AND salons.status = 'approved')
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM salons WHERE salons.id = reviews.salon_id AND salons.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "reviews_insert_own" ON reviews;
CREATE POLICY "reviews_insert_own" ON reviews FOR INSERT
  TO authenticated WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = reviews.appointment_id
      AND a.user_id = auth.uid()
      AND a.status = 'completed'
    )
  );

DROP POLICY IF EXISTS "reviews_update_owner" ON reviews;
CREATE POLICY "reviews_update_owner" ON reviews FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM salons WHERE salons.id = reviews.salon_id AND salons.owner_id = auth.uid())
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM salons WHERE salons.id = reviews.salon_id AND salons.owner_id = auth.uid())
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "reviews_delete_admin" ON reviews;
CREATE POLICY "reviews_delete_admin" ON reviews FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- =============================================
-- 8. favorites
-- =============================================
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  salon_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, salon_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_salon ON favorites(salon_id);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites_select_own" ON favorites;
CREATE POLICY "favorites_select_own" ON favorites FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "favorites_insert_own" ON favorites;
CREATE POLICY "favorites_insert_own" ON favorites FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "favorites_delete_own" ON favorites;
CREATE POLICY "favorites_delete_own" ON favorites FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- =============================================
-- 9. salon_images
-- =============================================
CREATE TABLE IF NOT EXISTS salon_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_salon_images_salon ON salon_images(salon_id);

ALTER TABLE salon_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "salon_images_select" ON salon_images;
CREATE POLICY "salon_images_select" ON salon_images FOR SELECT
  TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM salons WHERE salons.id = salon_images.salon_id AND salons.status = 'approved')
    OR EXISTS (SELECT 1 FROM salons WHERE salons.id = salon_images.salon_id AND salons.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "salon_images_insert_own" ON salon_images;
CREATE POLICY "salon_images_insert_own" ON salon_images FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM salons WHERE salons.id = salon_images.salon_id AND salons.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "salon_images_delete_own" ON salon_images;
CREATE POLICY "salon_images_delete_own" ON salon_images FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM salons WHERE salons.id = salon_images.salon_id AND salons.owner_id = auth.uid())
  );

-- =============================================
-- Auto-update updated_at trigger
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_salons_updated_at ON salons;
CREATE TRIGGER trg_salons_updated_at BEFORE UPDATE ON salons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_services_updated_at ON services;
CREATE TRIGGER trg_services_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- Auto-create profile on user signup
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
