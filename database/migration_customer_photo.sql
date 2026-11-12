-- ==========================================================
-- D N S HOME SOLUTIONS
-- MIGRATION: ADD CUSTOMER PHOTO & IMAGE COLUMNS
-- 
-- Run this script in your Supabase SQL Editor to support
-- customer profile photos in the database.
-- ==========================================================

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS photo TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN customers.photo IS 'Optimized Base64 Data URL or hosted URL of customer profile photo';
COMMENT ON COLUMN customers.image_url IS 'Alternate image URL reference for customer';

