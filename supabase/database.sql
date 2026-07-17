-- ========================================================
-- StayDesk CRM / HotelFlow CRM Database Schema
-- Location: supabase/database.sql
-- ========================================================

-- Enable extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 1. Hotels Table
CREATE TABLE IF NOT EXISTS hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_name VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50) NOT NULL,
  subscription_plan VARCHAR(50) NOT NULL DEFAULT '30 Days', -- '30 Days', '90 Days', '1 Year'
  subscription_status VARCHAR(50) NOT NULL DEFAULT 'Active', -- 'Active', 'Expired', 'Suspended'
  cms_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Users Table (Extensions auth.users connection)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY, -- Links to auth.users.id
  hotel_id UUID REFERENCES hotels(id) ON DELETE SET NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'hotel_owner', -- 'superadmin', 'hotel_owner', 'receptionist'
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  room_number VARCHAR(50) NOT NULL,
  room_type VARCHAR(100) NOT NULL, -- 'Single Deluxe', 'Double Suite', 'Family Suite', 'Executive Suite'
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  floor VARCHAR(100) NOT NULL DEFAULT 'Ground Floor',
  capacity INTEGER NOT NULL DEFAULT 2,
  status VARCHAR(50) NOT NULL DEFAULT 'Ready', -- 'Ready', 'Occupied', 'Maintenance', 'Cleaning'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Customers Table (Permanent database)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  gender VARCHAR(20) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) NOT NULL DEFAULT 'India',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Customer Documents Table (Stored in Supabase Storage)
CREATE TABLE IF NOT EXISTS customer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL, -- 'Aadhar', 'Driving License', 'Passport', 'Voter ID'
  document_number VARCHAR(100) NOT NULL,
  front_image TEXT, -- Base64 data URI or storage path
  back_image TEXT,  -- Base64 data URI or storage path
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure text columns on existing deployments
ALTER TABLE customer_documents ALTER COLUMN front_image TYPE TEXT;
ALTER TABLE customer_documents ALTER COLUMN back_image TYPE TEXT;

-- 6. Check Ins (Bookings / Stays)
CREATE TABLE IF NOT EXISTS check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  primary_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  number_of_guests INTEGER NOT NULL DEFAULT 1,
  check_in TIMESTAMP WITH TIME ZONE NOT NULL,
  expected_checkout TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Active', -- 'Active', 'Completed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Check In Guests (Multiple guests per check-in)
CREATE TABLE IF NOT EXISTS check_in_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID REFERENCES check_ins(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  relationship VARCHAR(50) NOT NULL, -- 'Self', 'Friend', 'Family', 'Wife', 'Husband', 'GF', 'BF', 'Child'
  document_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id UUID REFERENCES check_ins(id) ON DELETE CASCADE,
  room_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  advance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  pending NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  payment_method VARCHAR(50) NOT NULL, -- 'UPI', 'Cash', 'Card'
  final_payment_method VARCHAR(50),    -- 'UPI', 'Cash', 'Card'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================

-- -- Drop existing policies to allow re-running the script safely
DROP POLICY IF EXISTS "Super Admins can manage all hotels" ON hotels;
DROP POLICY IF EXISTS "Hotel Owners can view their own hotel details" ON hotels;
DROP POLICY IF EXISTS "Super Admins can select hotels" ON hotels;
DROP POLICY IF EXISTS "Super Admins can insert hotels" ON hotels;
DROP POLICY IF EXISTS "Super Admins can update hotels" ON hotels;
DROP POLICY IF EXISTS "Super Admins can delete hotels" ON hotels;

DROP POLICY IF EXISTS "Super Admins can manage all user records" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Super Admins can select users" ON users;
DROP POLICY IF EXISTS "Super Admins can insert users" ON users;
DROP POLICY IF EXISTS "Super Admins can update users" ON users;
DROP POLICY IF EXISTS "Super Admins can delete users" ON users;

DROP POLICY IF EXISTS "Users can manage rooms of their hotel" ON rooms;
DROP POLICY IF EXISTS "Users can select rooms of their hotel" ON rooms;
DROP POLICY IF EXISTS "Users can insert rooms of their hotel" ON rooms;
DROP POLICY IF EXISTS "Users can update rooms of their hotel" ON rooms;
DROP POLICY IF EXISTS "Users can delete rooms of their hotel" ON rooms;

DROP POLICY IF EXISTS "Users can manage customers of their hotel" ON customers;
DROP POLICY IF EXISTS "Users can select customers of their hotel" ON customers;
DROP POLICY IF EXISTS "Users can insert customers of their hotel" ON customers;
DROP POLICY IF EXISTS "Users can update customers of their hotel" ON customers;
DROP POLICY IF EXISTS "Users can delete customers of their hotel" ON customers;

DROP POLICY IF EXISTS "Users can manage documents of their hotel's customers" ON customer_documents;
DROP POLICY IF EXISTS "Users can select documents of their hotel" ON customer_documents;
DROP POLICY IF EXISTS "Users can insert documents of their hotel" ON customer_documents;
DROP POLICY IF EXISTS "Users can update documents of their hotel" ON customer_documents;
DROP POLICY IF EXISTS "Users can delete documents of their hotel" ON customer_documents;

DROP POLICY IF EXISTS "Users can manage check-ins of their hotel" ON check_ins;
DROP POLICY IF EXISTS "Users can select check-ins of their hotel" ON check_ins;
DROP POLICY IF EXISTS "Users can insert check-ins of their hotel" ON check_ins;
DROP POLICY IF EXISTS "Users can update check-ins of their hotel" ON check_ins;
DROP POLICY IF EXISTS "Users can delete check-ins of their hotel" ON check_ins;

DROP POLICY IF EXISTS "Users can manage guests of their hotel's check-ins" ON check_in_guests;
DROP POLICY IF EXISTS "Users can select guests of their hotel" ON check_in_guests;
DROP POLICY IF EXISTS "Users can insert guests of their hotel" ON check_in_guests;
DROP POLICY IF EXISTS "Users can update guests of their hotel" ON check_in_guests;
DROP POLICY IF EXISTS "Users can delete guests of their hotel" ON check_in_guests;

DROP POLICY IF EXISTS "Users can manage payments of their hotel's check-ins" ON payments;
DROP POLICY IF EXISTS "Users can select payments of their hotel" ON payments;
DROP POLICY IF EXISTS "Users can insert payments of their hotel" ON payments;
DROP POLICY IF EXISTS "Users can update payments of their hotel" ON payments;
DROP POLICY IF EXISTS "Users can delete payments of their hotel" ON payments;

-- Enable RLS on all operational tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_in_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get the current user's hotel_id
CREATE OR REPLACE FUNCTION get_user_hotel_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'hotel_id', '')::uuid,
    (SELECT hotel_id FROM public.users WHERE id = auth.uid())
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to check if the user is a Super Admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'role') = 'superadmin',
    COALESCE((SELECT role = 'superadmin' FROM public.users WHERE id = auth.uid()), false)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to check access to customer documents (bypasses soft delete check of customers table RLS)
CREATE OR REPLACE FUNCTION check_document_access(p_customer_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.customers
    WHERE id = p_customer_id
    AND hotel_id = get_user_hotel_id()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to check access to payments (bypasses soft delete check of check_ins table RLS)
CREATE OR REPLACE FUNCTION check_payment_access(p_checkin_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.check_ins
    WHERE id = p_checkin_id
    AND hotel_id = get_user_hotel_id()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Policies for Hotels
CREATE POLICY "Super Admins can select hotels" ON hotels 
  FOR SELECT TO authenticated USING (is_super_admin());

CREATE POLICY "Super Admins can insert hotels" ON hotels 
  FOR INSERT TO authenticated WITH CHECK (is_super_admin());

CREATE POLICY "Super Admins can update hotels" ON hotels 
  FOR UPDATE TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "Super Admins can delete hotels" ON hotels 
  FOR DELETE TO authenticated USING (is_super_admin());

CREATE POLICY "Hotel Owners can view their own hotel details" ON hotels 
  FOR SELECT TO authenticated USING (id = get_user_hotel_id());

DROP POLICY IF EXISTS "Hotel Owners can update their own hotel details" ON hotels;
CREATE POLICY "Hotel Owners can update their own hotel details" ON hotels 
  FOR UPDATE TO authenticated USING (id = get_user_hotel_id()) WITH CHECK (id = get_user_hotel_id());

DROP POLICY IF EXISTS "Allow public select hotels" ON hotels;
CREATE POLICY "Allow public select hotels" ON hotels 
  FOR SELECT TO anon, authenticated USING (true);

-- Policies for Users
CREATE POLICY "Super Admins can select users" ON users 
  FOR SELECT TO authenticated USING (is_super_admin());

CREATE POLICY "Super Admins can insert users" ON users 
  FOR INSERT TO authenticated WITH CHECK (is_super_admin());

CREATE POLICY "Super Admins can update users" ON users 
  FOR UPDATE TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "Super Admins can delete users" ON users 
  FOR DELETE TO authenticated USING (is_super_admin());

CREATE POLICY "Users can view their own profile" ON users 
  FOR SELECT TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
CREATE POLICY "Users can insert their own profile" ON users 
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Policies for Rooms
CREATE POLICY "Users can select rooms of their hotel" ON rooms 
  FOR SELECT TO authenticated USING (hotel_id = get_user_hotel_id() OR is_super_admin());

DROP POLICY IF EXISTS "Allow public select rooms" ON rooms;
CREATE POLICY "Allow public select rooms" ON rooms 
  FOR SELECT TO anon, authenticated USING (deleted_at IS NULL);

CREATE POLICY "Users can insert rooms of their hotel" ON rooms 
  FOR INSERT TO authenticated WITH CHECK (hotel_id = get_user_hotel_id() OR is_super_admin());

CREATE POLICY "Users can update rooms of their hotel" ON rooms 
  FOR UPDATE TO authenticated USING (hotel_id = get_user_hotel_id() OR is_super_admin()) WITH CHECK (hotel_id = get_user_hotel_id() OR is_super_admin());

CREATE POLICY "Users can delete rooms of their hotel" ON rooms 
  FOR DELETE TO authenticated USING (hotel_id = get_user_hotel_id() OR is_super_admin());

-- Policies for Customers
CREATE POLICY "Users can select customers of their hotel" ON customers 
  FOR SELECT TO authenticated USING (hotel_id = get_user_hotel_id());

CREATE POLICY "Users can insert customers of their hotel" ON customers 
  FOR INSERT TO authenticated WITH CHECK (hotel_id = get_user_hotel_id());

CREATE POLICY "Users can update customers of their hotel" ON customers 
  FOR UPDATE TO authenticated USING (hotel_id = get_user_hotel_id()) WITH CHECK (hotel_id = get_user_hotel_id());

CREATE POLICY "Users can delete customers of their hotel" ON customers 
  FOR DELETE TO authenticated USING (hotel_id = get_user_hotel_id());

-- Policies for Customer Documents
CREATE POLICY "Users can select documents of their hotel" ON customer_documents 
  FOR SELECT TO authenticated USING (check_document_access(customer_id));

CREATE POLICY "Users can insert documents of their hotel" ON customer_documents 
  FOR INSERT TO authenticated WITH CHECK (check_document_access(customer_id));

CREATE POLICY "Users can update documents of their hotel" ON customer_documents 
  FOR UPDATE TO authenticated USING (check_document_access(customer_id)) WITH CHECK (check_document_access(customer_id));

CREATE POLICY "Users can delete documents of their hotel" ON customer_documents 
  FOR DELETE TO authenticated USING (check_document_access(customer_id));

-- Policies for Check-Ins
CREATE POLICY "Users can select check-ins of their hotel" ON check_ins 
  FOR SELECT TO authenticated USING (hotel_id = get_user_hotel_id());

CREATE POLICY "Users can insert check-ins of their hotel" ON check_ins 
  FOR INSERT TO authenticated WITH CHECK (hotel_id = get_user_hotel_id());

CREATE POLICY "Users can update check-ins of their hotel" ON check_ins 
  FOR UPDATE TO authenticated USING (hotel_id = get_user_hotel_id()) WITH CHECK (hotel_id = get_user_hotel_id());

CREATE POLICY "Users can delete check-ins of their hotel" ON check_ins 
  FOR DELETE TO authenticated USING (hotel_id = get_user_hotel_id());

-- Policies for Check-In Guests
CREATE POLICY "Users can select guests of their hotel" ON check_in_guests 
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM check_ins
      WHERE check_ins.id = check_in_guests.checkin_id
      AND check_ins.hotel_id = get_user_hotel_id()
    )
  );

CREATE POLICY "Users can insert guests of their hotel" ON check_in_guests 
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM check_ins
      WHERE check_ins.id = check_in_guests.checkin_id
      AND check_ins.hotel_id = get_user_hotel_id()
    )
  );

CREATE POLICY "Users can update guests of their hotel" ON check_in_guests 
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM check_ins
      WHERE check_ins.id = check_in_guests.checkin_id
      AND check_ins.hotel_id = get_user_hotel_id()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM check_ins
      WHERE check_ins.id = check_in_guests.checkin_id
      AND check_ins.hotel_id = get_user_hotel_id()
    )
  );

CREATE POLICY "Users can delete guests of their hotel" ON check_in_guests 
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM check_ins
      WHERE check_ins.id = check_in_guests.checkin_id
      AND check_ins.hotel_id = get_user_hotel_id()
    )
  );

-- Policies for Payments
CREATE POLICY "Users can select payments of their hotel" ON payments 
  FOR SELECT TO authenticated USING (check_payment_access(checkin_id));

CREATE POLICY "Users can insert payments of their hotel" ON payments 
  FOR INSERT TO authenticated WITH CHECK (check_payment_access(checkin_id));

CREATE POLICY "Users can update payments of their hotel" ON payments 
  FOR UPDATE TO authenticated USING (check_payment_access(checkin_id)) WITH CHECK (check_payment_access(checkin_id));

CREATE POLICY "Users can delete payments of their hotel" ON payments 
  FOR DELETE TO authenticated USING (check_payment_access(checkin_id));

-- Automatically sync auth.users to public.users on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_hotel_id UUID;
  v_role VARCHAR(50);
BEGIN
  -- Look up if there is a hotel registered with this owner email (case-insensitive)
  SELECT id INTO v_hotel_id FROM public.hotels WHERE LOWER(email) = LOWER(new.email) LIMIT 1;

  v_role := CASE 
    WHEN LOWER(new.email) = 'wasimhavaldar70@gmail.com' OR LOWER(new.email) = 'admin@staydesk.com' THEN 'superadmin'
    ELSE 'hotel_owner'
  END;

  INSERT INTO public.users (id, email, role, hotel_id)
  VALUES (
    new.id,
    LOWER(new.email),
    v_role,
    v_hotel_id
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email, role = EXCLUDED.role, hotel_id = EXCLUDED.hotel_id;

  -- Set custom JWT claims in auth.users app_metadata
  UPDATE auth.users 
  SET raw_app_meta_data = jsonb_set(
    jsonb_set(
      coalesce(raw_app_meta_data, '{}'::jsonb),
      '{hotel_id}',
      to_jsonb(v_hotel_id)
    ),
    '{role}',
    to_jsonb(v_role)
  )
  WHERE id = new.id;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sync existing user claims into raw_app_meta_data
UPDATE auth.users 
SET raw_app_meta_data = jsonb_set(
  jsonb_set(
    coalesce(raw_app_meta_data, '{}'::jsonb),
    '{hotel_id}',
    coalesce(to_jsonb(public.users.hotel_id), 'null'::jsonb)
  ),
  '{role}',
  to_jsonb(public.users.role)
)
FROM public.users
WHERE auth.users.id = public.users.id;


-- ========================================================
-- DATABASE INDEXES (Optimization for joins & queries)
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_rooms_hotel_id ON rooms(hotel_id);
CREATE INDEX IF NOT EXISTS idx_customers_hotel_id ON customers(hotel_id);
CREATE INDEX IF NOT EXISTS idx_customer_documents_customer_id ON customer_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_hotel_id ON check_ins(hotel_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_room_id ON check_ins(room_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_primary_customer_id ON check_ins(primary_customer_id);
CREATE INDEX IF NOT EXISTS idx_check_in_guests_checkin_id ON check_in_guests(checkin_id);
CREATE INDEX IF NOT EXISTS idx_check_in_guests_customer_id ON check_in_guests(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_checkin_id ON payments(checkin_id);


-- ========================================================
-- TRANSACTIONAL & AGGREGATION PROCEDURES (RPCs)
-- ========================================================

-- Atomic Check-In transaction function
CREATE OR REPLACE FUNCTION check_in_guests_transactional(
  p_hotel_id UUID,
  p_room_id UUID,
  p_primary_customer_id UUID,
  p_number_of_guests INT,
  p_expected_checkout TIMESTAMP WITH TIME ZONE,
  p_room_price NUMERIC(10,2),
  p_advance NUMERIC(10,2),
  p_pending NUMERIC(10,2),
  p_payment_method VARCHAR(50),
  p_guests JSONB
) RETURNS UUID AS $$
DECLARE
  v_checkin_id UUID;
  v_guest JSONB;
BEGIN
  -- 1. Insert check-in record
  INSERT INTO public.check_ins (hotel_id, room_id, primary_customer_id, number_of_guests, check_in, expected_checkout, status)
  VALUES (p_hotel_id, p_room_id, p_primary_customer_id, p_number_of_guests, timezone('utc'::text, now()), p_expected_checkout, 'Active')
  RETURNING id INTO v_checkin_id;

  -- 2. Insert payment record
  INSERT INTO public.payments (checkin_id, room_price, advance, pending, payment_method)
  VALUES (v_checkin_id, p_room_price, p_advance, p_pending, p_payment_method);

  -- 3. Insert guests from JSON list
  IF p_guests IS NOT NULL AND jsonb_array_length(p_guests) > 0 THEN
    FOR v_guest IN SELECT * FROM jsonb_array_elements(p_guests) LOOP
      INSERT INTO public.check_in_guests (checkin_id, customer_id, relationship, document_verified)
      VALUES (
        v_checkin_id, 
        (v_guest->>'customer_id')::UUID, 
        v_guest->>'relationship', 
        COALESCE((v_guest->>'document_verified')::BOOLEAN, false)
      );
    END LOOP;
  END IF;

  -- 4. Update Room status to Occupied
  UPDATE public.rooms SET status = 'Occupied' WHERE id = p_room_id;

  RETURN v_checkin_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- High performance metrics pre-aggregation function
CREATE OR REPLACE FUNCTION get_hotel_reports(p_hotel_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_occupancy_rate INT;
  v_daily_revenue JSONB;
  v_monthly_revenue JSONB;
  v_repeat_customers JSONB;
  v_pending_payments JSONB;
  v_most_used_rooms JSONB;
BEGIN
  -- 1. Occupancy Rate
  SELECT COALESCE(
    ROUND((COUNT(CASE WHEN status = 'Occupied' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100), 
    0
  ) INTO v_occupancy_rate
  FROM rooms WHERE hotel_id = p_hotel_id;

  -- 2. Daily Revenue (last 7 days of advance payments)
  SELECT jsonb_agg(d) INTO v_daily_revenue
  FROM (
    SELECT 
      to_char(p.created_at AT TIME ZONE 'Asia/Kolkata', 'DD Mon') as date,
      SUM(p.advance)::numeric::float as amount
    FROM payments p
    JOIN check_ins c ON p.checkin_id = c.id
    WHERE c.hotel_id = p_hotel_id AND p.advance > 0
    GROUP BY date, date_trunc('day', p.created_at)
    ORDER BY date_trunc('day', p.created_at) DESC
    LIMIT 7
  ) d;

  -- 3. Monthly Revenue
  SELECT jsonb_agg(m) INTO v_monthly_revenue
  FROM (
    SELECT 
      to_char(p.created_at AT TIME ZONE 'Asia/Kolkata', 'Month YYYY') as month,
      SUM(p.advance)::numeric::float as amount
    FROM payments p
    JOIN check_ins c ON p.checkin_id = c.id
    WHERE c.hotel_id = p_hotel_id AND p.advance > 0
    GROUP BY month, date_trunc('month', p.created_at)
    ORDER BY date_trunc('month', p.created_at) DESC
  ) m;

  -- 4. Repeat Customers
  SELECT jsonb_agg(rc) INTO v_repeat_customers
  FROM (
    SELECT 
      cust.full_name as name,
      cust.phone,
      COUNT(*)::int as visits
    FROM check_ins c
    JOIN customers cust ON c.primary_customer_id = cust.id
    WHERE c.hotel_id = p_hotel_id
    GROUP BY cust.id, cust.full_name, cust.phone
    HAVING COUNT(*) > 1
    ORDER BY visits DESC
  ) rc;

  -- 5. Pending Payments
  SELECT jsonb_agg(pp) INTO v_pending_payments
  FROM (
    SELECT 
      cust.full_name as guest,
      cust.phone,
      r.room_number as room,
      p.pending::numeric::float as amount
    FROM payments p
    JOIN check_ins c ON p.checkin_id = c.id
    JOIN customers cust ON c.primary_customer_id = cust.id
    JOIN rooms r ON c.room_id = r.id
    WHERE c.hotel_id = p_hotel_id AND c.status = 'Active' AND p.pending > 0
  ) pp;

  -- 6. Most Used Rooms
  SELECT jsonb_agg(mur) INTO v_most_used_rooms
  FROM (
    SELECT 
      r.room_number as room,
      COUNT(*)::int as "usageCount"
    FROM check_ins c
    JOIN rooms r ON c.room_id = r.id
    WHERE c.hotel_id = p_hotel_id
    GROUP BY r.room_number
    ORDER BY "usageCount" DESC
  ) mur;

  RETURN json_build_object(
    'occupancyRate', v_occupancy_rate,
    'dailyRevenue', COALESCE(v_daily_revenue, '[]'::jsonb),
    'monthlyRevenue', COALESCE(v_monthly_revenue, '[]'::jsonb),
    'repeatCustomers', COALESCE(v_repeat_customers, '[]'::jsonb),
    'pendingPayments', COALESCE(v_pending_payments, '[]'::jsonb),
    'mostUsedRooms', COALESCE(v_most_used_rooms, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- High performance dashboard stats pre-aggregation function
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_hotel_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_today_revenue NUMERIC(10,2);
  v_checkins_count INT;
  v_checkouts_count INT;
  v_occupied INT;
  v_available INT;
  v_maintenance INT;
  v_cleaning INT;
BEGIN
  -- 1. Today's Revenue (sum of advances paid today)
  SELECT COALESCE(SUM(p.advance), 0.00) INTO v_today_revenue
  FROM public.payments p
  JOIN public.check_ins c ON p.checkin_id = c.id
  WHERE c.hotel_id = p_hotel_id 
    AND p.created_at AT TIME ZONE 'Asia/Kolkata'::text >= date_trunc('day', timezone('Asia/Kolkata'::text, now()))
    AND c.deleted_at IS NULL;

  -- 2. Check-ins Count Today
  SELECT COUNT(*)::INT INTO v_checkins_count
  FROM public.check_ins
  WHERE hotel_id = p_hotel_id
    AND check_in AT TIME ZONE 'Asia/Kolkata'::text >= date_trunc('day', timezone('Asia/Kolkata'::text, now()))
    AND deleted_at IS NULL;

  -- 3. Checkouts Count Today (status completed and expected_checkout is today)
  SELECT COUNT(*)::INT INTO v_checkouts_count
  FROM public.check_ins
  WHERE hotel_id = p_hotel_id
    AND status = 'Completed'
    AND expected_checkout AT TIME ZONE 'Asia/Kolkata'::text >= date_trunc('day', timezone('Asia/Kolkata'::text, now()))
    AND expected_checkout AT TIME ZONE 'Asia/Kolkata'::text < date_trunc('day', timezone('Asia/Kolkata'::text, now())) + INTERVAL '1 day'
    AND deleted_at IS NULL;

  -- 4. Room Counts
  SELECT COALESCE(COUNT(CASE WHEN status = 'Occupied' THEN 1 END)::INT, 0),
         COALESCE(COUNT(CASE WHEN status = 'Ready' THEN 1 END)::INT, 0),
         COALESCE(COUNT(CASE WHEN status = 'Maintenance' THEN 1 END)::INT, 0),
         COALESCE(COUNT(CASE WHEN status = 'Cleaning' THEN 1 END)::INT, 0)
  INTO v_occupied, v_available, v_maintenance, v_cleaning
  FROM public.rooms
  WHERE hotel_id = p_hotel_id AND deleted_at IS NULL;

  RETURN json_build_object(
    'todayRevenue', v_today_revenue,
    'checkInsCount', v_checkins_count,
    'checkOutsCount', v_checkouts_count,
    'occupiedRooms', v_occupied,
    'availableRooms', v_available,
    'maintenanceRooms', v_maintenance,
    'cleaningRooms', v_cleaning
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ========================================================
-- DATABASE CONSISTENCY & SECURITY ENHANCEMENTS (MIGRATIONS)
-- ========================================================

-- 1. Create native ENUM types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'room_status_enum') THEN
    CREATE TYPE room_status_enum AS ENUM ('Ready', 'Occupied', 'Maintenance', 'Cleaning');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status_enum') THEN
    CREATE TYPE booking_status_enum AS ENUM ('Reserved', 'Active', 'Completed', 'Cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
    CREATE TYPE user_role_enum AS ENUM ('superadmin', 'hotel_owner', 'receptionist');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_enum') THEN
    CREATE TYPE payment_method_enum AS ENUM ('UPI', 'Cash', 'Card');
  END IF;
END $$;

-- 2. Add Soft Delete fields, Room Image URL, and Hotel CMS Data
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.check_ins ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS cms_data JSONB DEFAULT '{}'::jsonb;

-- 3. Add Arithmetic Check Constraints
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS chk_room_price_positive;
ALTER TABLE public.rooms ADD CONSTRAINT chk_room_price_positive CHECK (price >= 0.00);

ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS chk_room_capacity_positive;
ALTER TABLE public.rooms ADD CONSTRAINT chk_room_capacity_positive CHECK (capacity > 0);

ALTER TABLE public.check_ins DROP CONSTRAINT IF EXISTS chk_number_of_guests_positive;
ALTER TABLE public.check_ins ADD CONSTRAINT chk_number_of_guests_positive CHECK (number_of_guests > 0);

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS chk_payment_price_positive;
ALTER TABLE public.payments ADD CONSTRAINT chk_payment_price_positive CHECK (room_price >= 0.00);

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS chk_payment_advance_positive;
ALTER TABLE public.payments ADD CONSTRAINT chk_payment_advance_positive CHECK (advance >= 0.00);

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS chk_payment_pending_positive;
ALTER TABLE public.payments ADD CONSTRAINT chk_payment_pending_positive CHECK (pending >= 0.00);

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS chk_payment_math_matching;
ALTER TABLE public.payments ADD CONSTRAINT chk_payment_math_matching CHECK (pending = room_price - advance);

-- 4. Replace Cascade Nullifications with Deletion Restrictions and Enforce Composite Tenancy Isolation
ALTER TABLE public.check_ins DROP CONSTRAINT IF EXISTS check_ins_room_id_fkey;
ALTER TABLE public.check_ins DROP CONSTRAINT IF EXISTS check_ins_hotel_id_room_id_fkey;

ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_hotel_id_id_key;
ALTER TABLE public.rooms ADD CONSTRAINT rooms_hotel_id_id_key UNIQUE (hotel_id, id);

ALTER TABLE public.check_ins ADD CONSTRAINT check_ins_hotel_id_room_id_fkey FOREIGN KEY (hotel_id, room_id) REFERENCES rooms(hotel_id, id) ON DELETE RESTRICT;

ALTER TABLE public.check_ins DROP CONSTRAINT IF EXISTS check_ins_primary_customer_id_fkey;
ALTER TABLE public.check_ins ADD CONSTRAINT check_ins_primary_customer_id_fkey FOREIGN KEY (primary_customer_id) REFERENCES customers(id) ON DELETE RESTRICT;

-- Enforce Uniqueness on checkin payments to prevent duplicate billing invoices
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_checkin_id_key;
ALTER TABLE public.payments ADD CONSTRAINT payments_checkin_id_key UNIQUE (checkin_id);

-- 5. Add Double-Booking & Room Conflict Exclusion Constraint (GIST)
ALTER TABLE public.check_ins DROP CONSTRAINT IF EXISTS exclude_overlapping_stays;
ALTER TABLE public.check_ins ADD CONSTRAINT exclude_overlapping_stays 
EXCLUDE USING gist (room_id WITH =, tstzrange(check_in, expected_checkout) WITH &&)
WHERE (status IN ('Active', 'Reserved') AND deleted_at IS NULL);

-- 6. Enforce Strict Tenancy Isolation (FORCE RLS)
ALTER TABLE public.hotels FORCE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rooms FORCE ROW LEVEL SECURITY;
ALTER TABLE public.customers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.customer_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins FORCE ROW LEVEL SECURITY;
ALTER TABLE public.check_in_guests FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- Audit logs policies
DROP POLICY IF EXISTS "Super admins can select audit logs" ON public.audit_logs;
CREATE POLICY "Super admins can select audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (is_super_admin());

-- Cleanup existing constraints for soft-deletes unique indexing on operational databases
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_hotel_id_room_number_key;
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_hotel_id_phone_key;

-- Create partial unique indexes to safely enforce uniqueness excluding soft-deleted rows
CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_hotel_room_unique ON public.rooms (hotel_id, room_number) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_hotel_phone_unique ON public.customers (hotel_id, phone) WHERE deleted_at IS NULL;

-- 7. Add Audit Logging Infrastructure
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(100) NOT NULL,
  action VARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  row_id UUID NOT NULL,
  old_data JSONB,
  new_data JSONB,
  changed_by UUID, -- Can be NULL if system trigger
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Audit Logging Trigger Function
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  BEGIN
    v_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_logs (table_name, action, row_id, old_data, changed_by)
    VALUES (TG_TABLE_NAME, TG_OP, OLD.id, to_jsonb(OLD), v_user_id);
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_logs (table_name, action, row_id, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, to_jsonb(OLD), to_jsonb(NEW), v_user_id);
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_logs (table_name, action, row_id, new_data, changed_by)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, to_jsonb(NEW), v_user_id);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind Audit Triggers
DROP TRIGGER IF EXISTS audit_rooms_trigger ON public.rooms;
CREATE TRIGGER audit_rooms_trigger AFTER INSERT OR UPDATE OR DELETE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS audit_customers_trigger ON public.customers;
CREATE TRIGGER audit_customers_trigger AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS audit_check_ins_trigger ON public.check_ins;
CREATE TRIGGER audit_check_ins_trigger AFTER INSERT OR UPDATE OR DELETE ON public.check_ins
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS audit_payments_trigger ON public.payments;
CREATE TRIGGER audit_payments_trigger AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- 8. Enforce Soft Delete filters in SELECT policies and Role-Based restrictions for destructive actions
-- Rooms policies
DROP POLICY IF EXISTS "Users can select rooms of their hotel" ON rooms;
CREATE POLICY "Users can select rooms of their hotel" ON rooms 
  FOR SELECT TO authenticated USING ((hotel_id = get_user_hotel_id() OR is_super_admin()) AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Owners can insert rooms of their hotel" ON rooms;
DROP POLICY IF EXISTS "Users can insert rooms of their hotel" ON rooms;
CREATE POLICY "Owners can insert rooms of their hotel" ON rooms 
  FOR INSERT TO authenticated WITH CHECK (
    (hotel_id = get_user_hotel_id() AND (SELECT role FROM users WHERE id = auth.uid()) IN ('hotel_owner', 'superadmin')) 
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "Owners can update rooms of their hotel" ON rooms;
DROP POLICY IF EXISTS "Users can update rooms of their hotel" ON rooms;
CREATE POLICY "Owners can update rooms of their hotel" ON rooms 
  FOR UPDATE TO authenticated USING (
    (hotel_id = get_user_hotel_id() AND (SELECT role FROM users WHERE id = auth.uid()) IN ('hotel_owner', 'superadmin')) 
    OR is_super_admin()
  ) WITH CHECK (
    (hotel_id = get_user_hotel_id() AND (SELECT role FROM users WHERE id = auth.uid()) IN ('hotel_owner', 'superadmin')) 
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "Owners can delete rooms of their hotel" ON rooms;
DROP POLICY IF EXISTS "Users can delete rooms of their hotel" ON rooms;
CREATE POLICY "Owners can delete rooms of their hotel" ON rooms 
  FOR DELETE TO authenticated USING (
    (hotel_id = get_user_hotel_id() AND (SELECT role FROM users WHERE id = auth.uid()) IN ('hotel_owner', 'superadmin')) 
    OR is_super_admin()
  );

-- Customers policies
DROP POLICY IF EXISTS "Users can select customers of their hotel" ON customers;
CREATE POLICY "Users can select customers of their hotel" ON customers 
  FOR SELECT TO authenticated USING (hotel_id = get_user_hotel_id() AND deleted_at IS NULL);

-- Check-ins policies
DROP POLICY IF EXISTS "Users can select check-ins of their hotel" ON check_ins;
CREATE POLICY "Users can select check-ins of their hotel" ON check_ins 
  FOR SELECT TO authenticated USING (hotel_id = get_user_hotel_id() AND deleted_at IS NULL);

-- Payments policies (owners-only role guard)
DROP POLICY IF EXISTS "Owners can update payments of their hotel" ON payments;
DROP POLICY IF EXISTS "Users can update payments of their hotel" ON payments;
CREATE POLICY "Owners can update payments of their hotel" ON payments 
  FOR UPDATE TO authenticated USING (
    check_payment_access(checkin_id) AND (SELECT role FROM users WHERE id = auth.uid()) IN ('hotel_owner', 'superadmin')
  ) WITH CHECK (
    check_payment_access(checkin_id) AND (SELECT role FROM users WHERE id = auth.uid()) IN ('hotel_owner', 'superadmin')
  );

DROP POLICY IF EXISTS "Owners can delete payments of their hotel" ON payments;
DROP POLICY IF EXISTS "Users can delete payments of their hotel" ON payments;
CREATE POLICY "Owners can delete payments of their hotel" ON payments 
  FOR DELETE TO authenticated USING (
    check_payment_access(checkin_id) AND (SELECT role FROM users WHERE id = auth.uid()) IN ('hotel_owner', 'superadmin')
  );

-- ========================================================
-- RETURNING CUSTOMER MANAGEMENT & CUSTOMER HISTORY EXTENSIONS
-- ========================================================

-- 1. Extend customers table with new search and dossier fields
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(50);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS nationality VARCHAR(100) DEFAULT 'Indian';

-- 2. Extend customer_documents with audit metadata and primary flag
ALTER TABLE customer_documents ADD COLUMN IF NOT EXISTS upload_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
ALTER TABLE customer_documents ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE customer_documents ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE customer_documents ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false NOT NULL;

-- 3. Create customer history tracking table for change log
CREATE TABLE IF NOT EXISTS customer_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  reason TEXT
);

-- Enable RLS on new table
ALTER TABLE customer_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can select customer_history of their hotel" ON customer_history;
CREATE POLICY "Users can select customer_history of their hotel" ON customer_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_history.customer_id
      AND c.hotel_id = get_user_hotel_id()
    )
  );

-- 4. Create trigger to automatically capture customer updates
CREATE OR REPLACE FUNCTION log_customer_changes()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Obtain authenticated user UID
  current_user_id := auth.uid();

  IF OLD.full_name IS DISTINCT FROM NEW.full_name THEN
    INSERT INTO customer_history (customer_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'full_name', OLD.full_name, NEW.full_name, current_user_id);
  END IF;

  IF OLD.phone IS DISTINCT FROM NEW.phone THEN
    INSERT INTO customer_history (customer_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'phone', OLD.phone, NEW.phone, current_user_id);
  END IF;

  IF OLD.email IS DISTINCT FROM NEW.email THEN
    INSERT INTO customer_history (customer_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'email', OLD.email, NEW.email, current_user_id);
  END IF;

  IF OLD.address IS DISTINCT FROM NEW.address THEN
    INSERT INTO customer_history (customer_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'address', OLD.address, NEW.address, current_user_id);
  END IF;

  IF OLD.city IS DISTINCT FROM NEW.city OR OLD.state IS DISTINCT FROM NEW.state OR OLD.country IS DISTINCT FROM NEW.country THEN
    INSERT INTO customer_history (customer_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'location', 
            coalesce(OLD.city, '') || ', ' || coalesce(OLD.state, '') || ', ' || coalesce(OLD.country, ''),
            coalesce(NEW.city, '') || ', ' || coalesce(NEW.state, '') || ', ' || coalesce(NEW.country, ''),
            current_user_id);
  END IF;

  IF OLD.vehicle_number IS DISTINCT FROM NEW.vehicle_number THEN
    INSERT INTO customer_history (customer_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'vehicle_number', OLD.vehicle_number, NEW.vehicle_number, current_user_id);
  END IF;

  IF OLD.emergency_contact IS DISTINCT FROM NEW.emergency_contact THEN
    INSERT INTO customer_history (customer_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'emergency_contact', OLD.emergency_contact, NEW.emergency_contact, current_user_id);
  END IF;

  IF OLD.nationality IS DISTINCT FROM NEW.nationality THEN
    INSERT INTO customer_history (customer_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'nationality', OLD.nationality, NEW.nationality, current_user_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_customer_changes ON customers;
CREATE TRIGGER trigger_log_customer_changes
  AFTER UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION log_customer_changes();


-- 5. Booking Requests Table (Website pending submissions)
CREATE TABLE IF NOT EXISTS booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  check_in TIMESTAMP WITH TIME ZONE NOT NULL,
  expected_checkout TIMESTAMP WITH TIME ZONE NOT NULL,
  number_of_guests INTEGER NOT NULL DEFAULT 1,
  room_type VARCHAR(100) NOT NULL,
  special_requests TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can insert booking requests" ON booking_requests;
DROP POLICY IF EXISTS "Users can manage booking requests of their hotel" ON booking_requests;
DROP POLICY IF EXISTS "Super Admins can select booking requests" ON booking_requests;

-- Policies for Booking Requests
CREATE POLICY "Anyone can insert booking requests" ON booking_requests 
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Users can manage booking requests of their hotel" ON booking_requests 
  FOR ALL TO authenticated USING (hotel_id = get_user_hotel_id()) WITH CHECK (hotel_id = get_user_hotel_id());

CREATE POLICY "Super Admins can select booking requests" ON booking_requests 
  FOR SELECT TO authenticated USING (is_super_admin());


-- 6. Transactional RPC for atomic booking check-in
CREATE OR REPLACE FUNCTION check_in_booking_transactional(
  p_hotel_id UUID,
  p_booking_id UUID
) RETURNS VOID AS $$
DECLARE
  v_room_id UUID;
BEGIN
  -- 1. Get room_id associated with the check-in
  SELECT room_id INTO v_room_id FROM public.check_ins 
  WHERE id = p_booking_id AND hotel_id = p_hotel_id;
  
  IF v_room_id IS NULL THEN
    RAISE EXCEPTION 'No room allocated for this booking';
  END IF;

  -- 2. Update booking check-in status to Active
  UPDATE public.check_ins 
  SET status = 'Active', check_in = timezone('utc'::text, now())
  WHERE id = p_booking_id AND hotel_id = p_hotel_id;

  -- 3. Update room status to Occupied
  UPDATE public.rooms SET status = 'Occupied' WHERE id = v_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Transactional RPC for atomic booking cancellation
CREATE OR REPLACE FUNCTION cancel_booking_transactional(
  p_hotel_id UUID,
  p_booking_id UUID
) RETURNS VOID AS $$
DECLARE
  v_room_id UUID;
  v_status VARCHAR(50);
BEGIN
  SELECT room_id, status INTO v_room_id, v_status 
  FROM public.check_ins 
  WHERE id = p_booking_id AND hotel_id = p_hotel_id;

  -- Update booking check-in status to Cancelled
  UPDATE public.check_ins 
  SET status = 'Cancelled'
  WHERE id = p_booking_id AND hotel_id = p_hotel_id;

  -- If it was Active, set room back to Ready
  IF v_status = 'Active' AND v_room_id IS NOT NULL THEN
    UPDATE public.rooms SET status = 'Ready' WHERE id = v_room_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure new column is added to payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS final_payment_method VARCHAR(50);

-- 8. Transactional RPC for atomic stay check-out and billing settlement
CREATE OR REPLACE FUNCTION checkout_stay_transactional(
  p_hotel_id UUID,
  p_checkin_id UUID,
  p_final_payment_method VARCHAR(50)
) RETURNS VOID AS $$
DECLARE
  v_room_id UUID;
  v_room_price NUMERIC(10, 2);
BEGIN
  -- 1. Get room_id
  SELECT room_id INTO v_room_id FROM public.check_ins
  WHERE id = p_checkin_id AND hotel_id = p_hotel_id;

  -- 2. Set Check-In status to Completed
  UPDATE public.check_ins SET status = 'Completed'
  WHERE id = p_checkin_id AND hotel_id = p_hotel_id;

  -- 3. Settle payment
  SELECT room_price INTO v_room_price FROM public.payments
  WHERE checkin_id = p_checkin_id;

  IF v_room_price IS NOT NULL THEN
    UPDATE public.payments 
    SET advance = v_room_price, pending = 0.00, final_payment_method = p_final_payment_method
    WHERE checkin_id = p_checkin_id;
  END IF;

  -- 4. Set Room status to Cleaning
  IF v_room_id IS NOT NULL THEN
    UPDATE public.rooms SET status = 'Cleaning' WHERE id = v_room_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ========================================================
-- 9. SCHEMA MIGRATION VERSION TRACKING
-- ========================================================
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.schema_migrations (version)
VALUES ('20260717_database_consistency_upgrades')
ON CONFLICT (version) DO NOTHING;


-- Ensure the customer-documents bucket exists and is private
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-documents', 'customer-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Ensure the hotel-assets bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('hotel-assets', 'hotel-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;


-- 10. STORAGE BUCKET ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================

-- Drop existing storage policies if exist
DROP POLICY IF EXISTS "Enforce tenant storage folder isolation" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read of documents" ON storage.objects;
DROP POLICY IF EXISTS "Enforce tenant storage select isolation" ON storage.objects;
DROP POLICY IF EXISTS "Enforce tenant assets modify isolation" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read of hotel assets" ON storage.objects;

-- Create policy to restrict modification access to owner folders only
CREATE POLICY "Enforce tenant storage folder isolation" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'customer-documents' AND
    (storage.foldername(name))[1] = coalesce(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'hotel_id', '')
  )
  WITH CHECK (
    bucket_id = 'customer-documents' AND
    (storage.foldername(name))[1] = coalesce(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'hotel_id', '')
  );

-- Create policy to allow ONLY authenticated users to select documents of their hotel folder
CREATE POLICY "Enforce tenant storage select isolation" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'customer-documents' AND
    (storage.foldername(name))[1] = coalesce(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'hotel_id', '')
  );

-- Create policy to allow authenticated users to modify their hotel assets
CREATE POLICY "Enforce tenant assets modify isolation" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'hotel-assets' AND
    (storage.foldername(name))[1] = coalesce(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'hotel_id', '')
  )
  WITH CHECK (
    bucket_id = 'hotel-assets' AND
    (storage.foldername(name))[1] = coalesce(current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'hotel_id', '')
  );

-- Create policy to allow public select operations on hotel assets
CREATE POLICY "Allow public read of hotel assets" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'hotel-assets');




