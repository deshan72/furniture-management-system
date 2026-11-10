-- ==========================================================
-- D&S FURNITURE MANAGEMENT SYSTEM
-- MIGRATION: ADD CUSTOMER ID FORMAT & EXTENDED PROFILE FIELDS
-- 
-- Run this script in your Supabase SQL Editor if you already
-- have an existing "customers" table in your PostgreSQL database.
-- ==========================================================

-- 1. Add new columns to customers table if they don't already exist
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS customer_id VARCHAR(50) UNIQUE,
  ADD COLUMN IF NOT EXISTS branch_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS center_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS contract_no VARCHAR(20) DEFAULT '1',
  ADD COLUMN IF NOT EXISTS item_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS civil_status VARCHAR(50) DEFAULT 'Single',
  ADD COLUMN IF NOT EXISTS dob DATE,
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'custom_order',
  ADD COLUMN IF NOT EXISTS total_spent NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS total_orders INT DEFAULT 1;

-- 2. Create performance indexes for search and ID lookups
CREATE INDEX IF NOT EXISTS idx_customers_customer_id ON customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_nic ON customers(nic);
CREATE INDEX IF NOT EXISTS idx_customers_branch_center ON customers(branch_code, center_code);

-- 3. Comment explanations
COMMENT ON COLUMN customers.customer_id IS 'Unique composite ID formatted as: BRANCH/CENTER/CONTRACT/ITEM (e.g. MHG/C001/1/DT001)';
COMMENT ON COLUMN customers.contract_no IS 'Nth item or contract count for this customer (e.g. 1, 2, 3...)';
COMMENT ON COLUMN customers.item_code IS 'Inventory item or product code (e.g. DT001)';

