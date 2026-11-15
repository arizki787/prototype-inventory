-- Supabase PostgreSQL Schema for Thrift Shop Inventory Tracker
-- Run this in the Supabase SQL Editor

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Categories (Clothing Types)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Grades (Condition / Quality Tiers)
CREATE TABLE IF NOT EXISTS grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'Grade A', 'Grade B', 'Grade C', 'Head'
    sort_order INT NOT NULL DEFAULT 0,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Bales (Physical Sourced Bundles)
CREATE TABLE IF NOT EXISTS bales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bal_code VARCHAR(100) NOT NULL UNIQUE, -- e.g. "BAL-2024-001"
    description VARCHAR(255),               -- e.g. "Vintage Jackets USA 100kg"
    purchase_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'unopened' CHECK (status IN ('unopened', 'opened', 'completed')),
    opened_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Current Inventory Stock (Category x Grade Pair)
CREATE TABLE IF NOT EXISTS inventory_stocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    grade_id UUID NOT NULL REFERENCES grades(id) ON DELETE RESTRICT,
    current_quantity INT NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
    default_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    low_stock_threshold INT NOT NULL DEFAULT 5,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_category_grade UNIQUE (category_id, grade_id)
);

-- 6. Bal Unpack Items (Stock In records per bal)
CREATE TABLE IF NOT EXISTS bal_unpack_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bal_id UUID NOT NULL REFERENCES bales(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    grade_id UUID NOT NULL REFERENCES grades(id) ON DELETE RESTRICT,
    quantity INT NOT NULL CHECK (quantity > 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Sales (Stock Out Transactions)
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_no VARCHAR(50),
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'qris', 'transfer', 'debit', 'other')),
    sale_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Sale Items
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    grade_id UUID NOT NULL REFERENCES grades(id) ON DELETE RESTRICT,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- 9. Stock Adjustments (Damage, Loss, Recounts)
CREATE TABLE IF NOT EXISTS stock_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    grade_id UUID NOT NULL REFERENCES grades(id) ON DELETE RESTRICT,
    quantity_change INT NOT NULL, -- e.g. -2 for damage, +1 for found item
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('damaged', 'lost', 'audit_correction', 'donated', 'regraded', 'other')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Stock Movements Audit Ledger
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    grade_id UUID NOT NULL REFERENCES grades(id) ON DELETE RESTRICT,
    movement_type VARCHAR(30) NOT NULL CHECK (movement_type IN ('STOCK_IN_BAL', 'STOCK_OUT_SALE', 'ADJUSTMENT')),
    quantity_change INT NOT NULL, -- positive (+) or negative (-)
    reference_id UUID,
    reference_type VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_inventory_stocks_pair ON inventory_stocks(category_id, grade_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_pair ON stock_movements(category_id, grade_id);
CREATE INDEX IF NOT EXISTS idx_bal_unpack_items_bal ON bal_unpack_items(bal_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);

-- Optional: Initial Seed Data for Thrift Shop
INSERT INTO categories (name, description) VALUES
    ('Jeans', 'Denim pants & trousers'),
    ('T-Shirt', 'Short and long sleeve graphic tees'),
    ('Flannel Shirt', 'Button down plaid & flannel shirts'),
    ('Jacket', 'Windbreakers, leather, and bomber jackets'),
    ('Hoodie / Crewneck', 'Sweatshirts and hoodies')
ON CONFLICT (name) DO NOTHING;

INSERT INTO grades (code, sort_order, description) VALUES
    ('Grade A / Head', 1, 'Top tier vintage / pristine condition, high value'),
    ('Grade B / Regular', 2, 'Good wearable condition, minor signs of wear'),
    ('Grade C / Reject', 3, 'Flawed, stain, distress or bargain bin')
ON CONFLICT (code) DO NOTHING;
