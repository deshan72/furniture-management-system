-- ==========================================================
-- D&S FURNITURE MANAGEMENT SYSTEM
-- SUPABASE POSTGRESQL DATABASE MIGRATION
-- MIGRATION: DAILY PAYMENTS, MONTHLY PAYMENTS & ORDERS ENHANCEMENT
--
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/fpeeywjfvbhglhadwwog/sql
-- ==========================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREATE DAILY PAYMENTS TABLE (දිනපතා මධ්‍යස්ථාන මුදල් එකතු කිරීම්)
CREATE TABLE IF NOT EXISTS daily_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_no VARCHAR(50) UNIQUE NOT NULL,
    collection_date DATE NOT NULL,
    center_code VARCHAR(20) NOT NULL,
    branch_code VARCHAR(20) DEFAULT 'MHG',
    contract_no VARCHAR(100),
    order_id VARCHAR(100),
    customer_id VARCHAR(100),
    customer_name VARCHAR(255) NOT NULL,
    customer_nic VARCHAR(50),
    customer_phone VARCHAR(50),
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(50) DEFAULT 'cash',
    collected_by VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_payments_date ON daily_payments(collection_date);
CREATE INDEX IF NOT EXISTS idx_daily_payments_center ON daily_payments(center_code);
CREATE INDEX IF NOT EXISTS idx_daily_payments_contract ON daily_payments(contract_no);
CREATE INDEX IF NOT EXISTS idx_daily_payments_nic ON daily_payments(customer_nic);

ALTER TABLE daily_payments DISABLE ROW LEVEL SECURITY;

-- 3. CREATE MONTHLY PAYMENTS TABLE (මාසික ණය වාරික සහ අත්තිකාරම් පියවීම්)
CREATE TABLE IF NOT EXISTS monthly_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_no VARCHAR(50) UNIQUE NOT NULL,
    payment_date DATE NOT NULL,
    payment_month VARCHAR(20), -- e.g. '2026-11'
    contract_no VARCHAR(100),
    order_id VARCHAR(100),
    customer_id VARCHAR(100),
    customer_name VARCHAR(255) NOT NULL,
    customer_nic VARCHAR(50),
    customer_phone VARCHAR(50),
    center_code VARCHAR(20),
    installment_term INT DEFAULT 1,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    previous_balance NUMERIC(12, 2) DEFAULT 0.00,
    new_balance NUMERIC(12, 2) DEFAULT 0.00,
    payment_type VARCHAR(50) DEFAULT 'Installment Loan', -- 'Installment Loan', 'Order Advance', 'Full Settlement'
    payment_method VARCHAR(50) DEFAULT 'cash',
    reference_no VARCHAR(100),
    collected_by VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monthly_payments_date ON monthly_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_monthly_payments_contract ON monthly_payments(contract_no);
CREATE INDEX IF NOT EXISTS idx_monthly_payments_nic ON monthly_payments(customer_nic);
CREATE INDEX IF NOT EXISTS idx_monthly_payments_center ON monthly_payments(center_code);

ALTER TABLE monthly_payments DISABLE ROW LEVEL SECURITY;

-- 4. ENHANCE ORDERS TABLE WITH NATIVE COLUMNS
-- This eliminates fragile metadata string escaping and enables fast, direct queries
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_no VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS contract_no VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS passbook_no VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_nic VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS branch_code VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS center_code VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS item_code VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS item_name VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity INT DEFAULT 1;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50) DEFAULT 'installment';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS loan_frequency VARCHAR(50) DEFAULT 'monthly';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS loan_terms INT DEFAULT 12;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS installment_value NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS first_due_date DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS installments_paid INT DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active Loan';

CREATE INDEX IF NOT EXISTS idx_orders_contract_no ON orders(contract_no);
CREATE INDEX IF NOT EXISTS idx_orders_customer_nic ON orders(customer_nic);
CREATE INDEX IF NOT EXISTS idx_orders_center_code ON orders(center_code);

-- 5. SEED INITIAL DATA FOR DAILY PAYMENTS
INSERT INTO daily_payments (
    receipt_no, collection_date, center_code, branch_code, contract_no,
    customer_name, customer_nic, customer_phone, amount, payment_method, collected_by, notes
) VALUES
(
    'DS-RCP-2026-D001', '2026-11-14', 'C003', 'MHG', 'PN/C003/WD-101',
    'Sachintha Deshan', '200127502100', '0771234567', 23133.00, 'cash', 'Himala (Officer)',
    'Maththegoda daily center collection payment received'
),
(
    'DS-RCP-2026-D002', '2026-11-10', 'C001', 'MHG', 'PN/C001/WD-001',
    'Sunil Jayawardena', '197814502391', '0771234567', 6542.00, 'cash', 'Cashier Anura',
    'Maharagama center field collection'
)
ON CONFLICT (receipt_no) DO NOTHING;

-- 6. SEED INITIAL DATA FOR MONTHLY PAYMENTS
INSERT INTO monthly_payments (
    receipt_no, payment_date, payment_month, contract_no, customer_name, customer_nic,
    customer_phone, center_code, installment_term, amount, previous_balance, new_balance,
    payment_type, payment_method, reference_no, collected_by, notes
) VALUES
(
    'DS-RCP-2026-M001', '2026-10-12', '2026-10', 'PN/C001/WD-001', 'Sunil Jayawardena', '197814502391',
    '0771234567', 'C001', 0, 20000.00, 98500.00, 78500.00,
    'Order Advance', 'Bank Transfer', 'BOC-TX-98412', 'Cashier Anura',
    'Down payment for Royal Teak 6-Seater Dining Table'
),
(
    'DS-RCP-2026-M002', '2026-10-18', '2026-10', 'PN-002/C002/WD-002', 'Chamari Perera', '198578901234',
    '0718899221', 'C002', 1, 78000.00, 78000.00, 0.00,
    'Full Settlement', 'Cash', 'CSH-0192', 'Cashier Anura',
    'Full cash payment on showroom delivery for Mahogany Wardrobe'
),
(
    'DS-RCP-2026-M003', '2026-10-24', '2026-10', 'PN-003/C001/MEL-001', 'Nimal Karunaratne', '196923405678',
    '0763344552', 'C001', 0, 50000.00, 135000.00, 85000.00,
    'Order Advance', 'Cash', 'CSH-0210', 'Officer Kamal',
    'Advance booking for Modern Melamine Modular Pantry Unit'
),
(
    'DS-RCP-2026-M004', '2026-11-01', '2026-11', 'PN-003/C001/MEL-001', 'Nimal Karunaratne', '196923405678',
    '0763344552', 'C001', 1, 5313.00, 85000.00, 79687.00,
    'Installment Loan', 'Bank Transfer', 'COMB-DEP-4491', 'Accounts Team',
    'Monthly installment #1 of 16 weekly terms received'
),
(
    'DS-RCP-2026-M005', '2026-11-10', '2026-11', 'PN/C001/WD-001', 'Sunil Jayawardena', '197814502391',
    '0771234567', 'C001', 1, 6542.00, 78500.00, 71958.00,
    'Installment Loan', 'Cash', 'CSH-0248', 'Cashier Anura',
    'Monthly installment #1 of 12 terms collected at showroom'
)
ON CONFLICT (receipt_no) DO NOTHING;

