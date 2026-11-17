-- ==========================================================
-- D N S HOME SOLUTIONS / D&S FURNITURE MANAGEMENT SYSTEM
-- EXACT MINIMAL SYNC FOR EXISTING SUPABASE PROJECT
--
-- Project: https://fpeeywjfvbhglhadwwog.supabase.co
--
-- This script does NOT delete, wipe, or replace ANY existing data!
-- It only adds the few missing columns and tables needed by the core system.
--
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/fpeeywjfvbhglhadwwog/sql
-- ==========================================================

-- 1. ADD MISSING COLUMNS TO EXISTING "customers" TABLE
-- (Preserves your 3 existing customers safely)
ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS customer_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS branch_code VARCHAR(20) DEFAULT 'MHG',
    ADD COLUMN IF NOT EXISTS center_code VARCHAR(20) DEFAULT 'C001',
    ADD COLUMN IF NOT EXISTS contract_no VARCHAR(20) DEFAULT '1',
    ADD COLUMN IF NOT EXISTS item_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS civil_status VARCHAR(50) DEFAULT 'Single',
    ADD COLUMN IF NOT EXISTS dob DATE,
    ADD COLUMN IF NOT EXISTS city VARCHAR(100),
    ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'custom_order',
    ADD COLUMN IF NOT EXISTS photo TEXT,
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS total_spent NUMERIC(12, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS total_orders INT DEFAULT 1,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_customers_customer_id ON customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_branch_center ON customers(branch_code, center_code);

-- 2. ADD MISSING COLUMNS TO EXISTING "products" TABLE
-- (Preserves your 4 existing furniture products safely)
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS finish VARCHAR(100),
    ADD COLUMN IF NOT EXISTS reorder_level INT NOT NULL DEFAULT 2;

-- 3. CREATE "centers" TABLE (REGIONAL DISTRIBUTION CENTERS)
CREATE TABLE IF NOT EXISTS centers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    center_code VARCHAR(20) NOT NULL,
    branch_code VARCHAR(20) NOT NULL DEFAULT 'MHG',
    name VARCHAR(255) NOT NULL,
    name_si VARCHAR(255),
    city VARCHAR(100),
    address TEXT,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active',
    due_date VARCHAR(50),
    cash_collect_date VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(branch_code, center_code)
);

CREATE INDEX IF NOT EXISTS idx_centers_branch_code ON centers(branch_code);
CREATE INDEX IF NOT EXISTS idx_centers_center_code ON centers(center_code);

-- Insert Default Centers if not already inserted
INSERT INTO centers (center_code, branch_code, name, name_si, city, address, contact_person, phone, due_date, cash_collect_date, status)
VALUES
('C001', 'MHG', 'Maharagama Main Center', 'මහරගම ප්‍රධාන මධ්‍යස්ථානය', 'Maharagama', 'No. 120, High Level Road, Maharagama', 'Sarath Gunawardena', '0772345671', '2026-11-10', '2026-11-14', 'active'),
('C002', 'MHG', 'Kottawa Town Center', 'කොට්ටාව නගර මධ්‍යස්ථානය', 'Kottawa', '45, Kottawa Road, Kottawa', 'Nuwan Perera', '0715566778', '2026-11-12', '2026-11-15', 'active'),
('C003', 'MHG', 'Maththegoda Regional Center', 'මත්තේගොඩ මධ්‍යස්ථානය', 'Maththegoda', '14/15, Kudamaduwa Road, Maththegoda', 'Sachintha Deshan', '0703119860', '2026-11-15', '2026-11-17', 'active'),
('C001', 'MRT', 'Moratuwa Woodcraft Center', 'මොරටුව දැව කර්මාන්ත මධ්‍යස්ථානය', 'Moratuwa', '88, Galle Road, Rawathawatta, Moratuwa', 'Nalaka Fernando', '0768899001', '2026-11-10', '2026-11-14', 'active'),
('C001', 'NGB', 'Negombo Coastal Center', 'මීගමුව මධ්‍යස්ථානය', 'Negombo', '24/B, Lewis Place, Negombo', 'Rohan Silva', '0704455667', '2026-11-15', '2026-11-20', 'active')
ON CONFLICT (branch_code, center_code) DO NOTHING;

-- 4. CREATE "staff_users" TABLE (MULTI-DEVICE STAFF LOGINS)
CREATE TABLE IF NOT EXISTS staff_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_code VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'executive',
    nic VARCHAR(50),
    dob DATE,
    age INT,
    gender VARCHAR(20) DEFAULT 'Not Specified',
    photo TEXT,
    branch_code VARCHAR(20) DEFAULT 'MHG',
    center_code VARCHAR(20) DEFAULT 'C001',
    assigned_center VARCHAR(100) DEFAULT 'all',
    status VARCHAR(20) DEFAULT 'Active',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_users_username ON staff_users(username);
CREATE INDEX IF NOT EXISTS idx_staff_users_role ON staff_users(role);

-- Insert Default Staff Logins
INSERT INTO staff_users (user_code, name, username, email, phone, password, role, nic, dob, age, gender, branch_code, center_code, assigned_center, status)
VALUES
('usr_admin_001', 'D N S Administrator', 'admin', 'admin@dnshomesolutions.lk', '0771234567', 'admin123', 'admin', '198512345678', '1985-05-03', 41, 'Male', 'MHG', 'C001', 'all', 'Active'),
('usr_exec_001', 'Executive Staff', 'executive', 'executive@dnshomesolutions.lk', '0779876543', 'exec123', 'executive', '199214567890', '1992-05-24', 34, 'Male', 'MHG', 'C001', 'MHG/C001', 'Active'),
('usr_cashier_001', 'Showroom Cashier', 'cashier', 'cashier@dnshomesolutions.lk', '0773344556', 'cashier123', 'cashier', '199518901234', '1995-07-08', 31, 'Male', 'MHG', 'C001', 'MHG/C001', 'Active')
ON CONFLICT (username) DO NOTHING;

-- 5. DISABLE ROW LEVEL SECURITY (RLS) FOR INTERNAL PORTAL
-- (Prevents 401/403 permission errors when accessed from deployed domain)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE centers DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff_users DISABLE ROW LEVEL SECURITY;

-- 6. ENABLE STORAGE ACCESS FOR "project product image" BUCKET
-- (Allows uploading customer and product photos directly without 403 permission denied)
INSERT INTO storage.buckets (id, name, public)
VALUES ('project product image', 'project product image', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Access" ON storage.objects;
    CREATE POLICY "Public Access" ON storage.objects
        FOR SELECT USING (bucket_id = 'project product image');

    DROP POLICY IF EXISTS "Public Uploads" ON storage.objects;
    CREATE POLICY "Public Uploads" ON storage.objects
        FOR INSERT WITH CHECK (bucket_id = 'project product image');

    DROP POLICY IF EXISTS "Public Updates" ON storage.objects;
    CREATE POLICY "Public Updates" ON storage.objects
        FOR UPDATE USING (bucket_id = 'project product image');

    DROP POLICY IF EXISTS "Public Deletes" ON storage.objects;
    CREATE POLICY "Public Deletes" ON storage.objects
        FOR DELETE USING (bucket_id = 'project product image');
END $$;
