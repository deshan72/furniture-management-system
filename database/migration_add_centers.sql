-- ==========================================================
-- D&S FURNITURE MANAGEMENT SYSTEM
-- MIGRATION: ADD REGIONAL CENTERS TABLE (මධ්‍යස්ථාන)
-- 
-- Run this script in your Supabase SQL Editor to support the
-- Center Management module and Center creation feature.
-- ==========================================================

CREATE TABLE IF NOT EXISTS centers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    center_code VARCHAR(20) NOT NULL, -- e.g. C001, C002, C003
    branch_code VARCHAR(20) NOT NULL, -- e.g. MHG, MRT, CMB
    name VARCHAR(255) NOT NULL,
    name_si VARCHAR(255),
    city VARCHAR(100),
    address TEXT,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(branch_code, center_code)
);

CREATE INDEX IF NOT EXISTS idx_centers_branch_code ON centers(branch_code);
CREATE INDEX IF NOT EXISTS idx_centers_center_code ON centers(center_code);
CREATE INDEX IF NOT EXISTS idx_centers_status ON centers(status);

ALTER TABLE centers DISABLE ROW LEVEL SECURITY;

-- Insert default regional seed centers
INSERT INTO centers (center_code, branch_code, name, name_si, city, address, contact_person, phone, status)
VALUES
  ('C001', 'MHG', 'Maharagama Main Center', 'මහරගම ප්‍රධාන මධ්‍යස්ථානය', 'Maharagama', 'No. 120, High Level Road, Maharagama', 'Sarath Gunawardena', '0772345671', 'active'),
  ('C002', 'MHG', 'Kottawa Town Center', 'කොට්ටාව නගර මධ්‍යස්ථානය', 'Kottawa', '45, Kottawa Road, Kottawa', 'Nuwan Perera', '0715566778', 'active'),
  ('C001', 'MRT', 'Moratuwa Woodcraft Center', 'මොරටුව දැව කර්මාන්ත මධ්‍යස්ථානය', 'Moratuwa', '88, Galle Road, Rawathawatta, Moratuwa', 'Nalaka Fernando', '0768899001', 'active'),
  ('C001', 'NGB', 'Negombo Coastal Center', 'මීගමුව මධ්‍යස්ථානය', 'Negombo', '24/B, Lewis Place, Negombo', 'Rohan Silva', '0704455667', 'active'),
  ('C001', 'DHW', 'Dehiwala Urban Center', 'දෙහිවල නාගරික මධ්‍යස්ථානය', 'Dehiwala', '104, Hill Street, Dehiwala', 'Dinesh Kumara', '0785566778', 'active'),
  ('C003', 'CMB', 'Colombo Central Center', 'කොළඹ මධ්‍යම මධ්‍යස්ථානය', 'Colombo', '56/1, Havelock Road, Colombo 05', 'Chaminda Wickrama', '0751122334', 'active')
ON CONFLICT (branch_code, center_code) DO NOTHING;

