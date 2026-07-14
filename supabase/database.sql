-- ========================================================
-- StayDesk CRM / HotelFlow CRM Database Schema
-- Location: supabase/database.sql
-- ========================================================

-- Enable extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Hotels Table
CREATE TABLE IF NOT EXISTS hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_name VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50) NOT NULL,
  subscription_plan VARCHAR(50) NOT NULL DEFAULT '30 Days', -- '30 Days', '90 Days', '1 Year'
  subscription_status VARCHAR(50) NOT NULL DEFAULT 'Active', -- 'Active', 'Expired', 'Suspended'
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (hotel_id, room_number)
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (hotel_id, phone)
);

-- 5. Customer Documents Table (Stored in Supabase Storage)
CREATE TABLE IF NOT EXISTS customer_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL, -- 'Aadhar', 'Driving License', 'Passport', 'Voter ID'
  document_number VARCHAR(100) NOT NULL,
  front_image VARCHAR(1024), -- URL or path inside Supabase storage bucket 'documents'
  back_image VARCHAR(1024),  -- URL or path inside Supabase storage bucket 'documents'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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

-- Helper function to get the current user's hotel_id
CREATE OR REPLACE FUNCTION get_user_hotel_id()
RETURNS UUID AS $$
  SELECT hotel_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to check if the user is a Super Admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT role = 'superadmin' FROM users WHERE id = auth.uid()), false);
$$ LANGUAGE sql SECURITY DEFINER;

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

-- Policies for Rooms
CREATE POLICY "Users can select rooms of their hotel" ON rooms 
  FOR SELECT TO authenticated USING (hotel_id = get_user_hotel_id() OR is_super_admin());

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
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_documents.customer_id
      AND customers.hotel_id = get_user_hotel_id()
    )
  );

CREATE POLICY "Users can insert documents of their hotel" ON customer_documents 
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_documents.customer_id
      AND customers.hotel_id = get_user_hotel_id()
    )
  );

CREATE POLICY "Users can update documents of their hotel" ON customer_documents 
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_documents.customer_id
      AND customers.hotel_id = get_user_hotel_id()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_documents.customer_id
      AND customers.hotel_id = get_user_hotel_id()
    )
  );

CREATE POLICY "Users can delete documents of their hotel" ON customer_documents 
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_documents.customer_id
      AND customers.hotel_id = get_user_hotel_id()
    )
  );

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
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM check_ins
      WHERE check_ins.id = payments.checkin_id
      AND check_ins.hotel_id = get_user_hotel_id()
    )
  );

CREATE POLICY "Users can insert payments of their hotel" ON payments 
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM check_ins
      WHERE check_ins.id = payments.checkin_id
      AND check_ins.hotel_id = get_user_hotel_id()
    )
  );

CREATE POLICY "Users can update payments of their hotel" ON payments 
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM check_ins
      WHERE check_ins.id = payments.checkin_id
      AND check_ins.hotel_id = get_user_hotel_id()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM check_ins
      WHERE check_ins.id = payments.checkin_id
      AND check_ins.hotel_id = get_user_hotel_id()
    )
  );

CREATE POLICY "Users can delete payments of their hotel" ON payments 
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM check_ins
      WHERE check_ins.id = payments.checkin_id
      AND check_ins.hotel_id = get_user_hotel_id()
    )
  );

-- Automatically sync auth.users to public.users on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_hotel_id UUID;
BEGIN
  -- Look up if there is a hotel registered with this owner email
  SELECT id INTO v_hotel_id FROM public.hotels WHERE email = new.email LIMIT 1;

  INSERT INTO public.users (id, email, role, hotel_id)
  VALUES (
    new.id,
    new.email,
    CASE 
      WHEN new.email = 'wasimhavaldar70@gmail.com' OR new.email = 'admin@staydesk.com' THEN 'superadmin'
      ELSE 'hotel_owner'
    END,
    v_hotel_id
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


