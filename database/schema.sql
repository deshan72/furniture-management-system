-- ==========================================================
-- D & D FURNITURE MANAGEMENT SYSTEM
-- SUPABASE POSTGRESQL DATABASE SCHEMA
-- ==========================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PRODUCTS / INVENTORY TABLE
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'Living Room', 'Bedroom', 'Dining', 'Office', 'Custom'
    wood_type VARCHAR(100),         -- 'Teak', 'Mahogany', 'Mara', 'Melamine', 'Steel'
    dimensions VARCHAR(100),        -- '6x3x2.5 ft', etc.
    cost_price NUMERIC(12, 2) DEFAULT 0.00,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    stock_quantity INT NOT NULL DEFAULT 0,
    image_url TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    whatsapp VARCHAR(20),
    address TEXT,
    nic VARCHAR(20),
    outstanding_balance NUMERIC(12, 2) DEFAULT 0.00, -- Amount customer owes
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ORDERS TABLE (Ready Stock & Made-to-order)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    order_type VARCHAR(50) DEFAULT 'ready_stock', -- 'ready_stock', 'custom_order'
    order_status VARCHAR(50) DEFAULT 'confirmed', -- 'draft', 'confirmed', 'in_production', 'ready_for_delivery', 'delivered', 'cancelled'
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    delivery_charge NUMERIC(12, 2) DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    advance_paid NUMERIC(12, 2) DEFAULT 0.00,
    balance_due NUMERIC(12, 2) DEFAULT 0.00,
    payment_status VARCHAR(50) DEFAULT 'unpaid', -- 'unpaid', 'partial', 'paid'
    delivery_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,
    custom_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ORDER PAYMENTS (Installments / Advances / Settlements)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL,
    payment_type VARCHAR(50) NOT NULL, -- 'advance', 'balance_payment', 'full_payment'
    payment_method VARCHAR(50) DEFAULT 'cash', -- 'cash', 'bank_transfer', 'cheque', 'card'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CASH TRANSACTIONS & DAY-TO-DAY EXPENSES (Cash Book)
CREATE TABLE IF NOT EXISTS cash_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_type VARCHAR(20) NOT NULL, -- 'cash_in', 'cash_out'
    category VARCHAR(100) NOT NULL, 
    -- Cash In: 'order_advance', 'order_balance', 'direct_sale', 'capital_deposit', 'other_income'
    -- Cash Out: 'timber_raw_material', 'carpenter_wages', 'transport_fuel', 'hardware_varnish', 'tea_petty_cash', 'utilities', 'shop_rent', 'other_expense'
    amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'cash',
    recipient_or_source VARCHAR(255),
    reference_id UUID, -- Optional link to order or customer
    receipt_image_url TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. HELPER FUNCTION: DECREMENT PRODUCT STOCK SAFELY
CREATE OR REPLACE FUNCTION decrement_product_stock(prod_id UUID, qty INT)
RETURNS VOID AS $$
BEGIN
    UPDATE products
    SET stock_quantity = GREATEST(0, stock_quantity - qty),
        updated_at = NOW()
    WHERE id = prod_id;
END;
$$ LANGUAGE plpgsql;

-- 9. INDICES FOR HIGH PERFORMANCE QUERYING
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_created_at ON cash_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_type ON cash_transactions(transaction_type);
