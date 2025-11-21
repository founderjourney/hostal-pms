-- Users table for authentication and role management
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'volunteer', -- 'admin', 'manager', 'volunteer'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Guests table for guest profiles
CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  date_of_birth DATE,
  nationality VARCHAR(100),
  passport_number VARCHAR(100),
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  dietary_restrictions TEXT,
  notes TEXT,
  total_stays INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Rooms table
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  room_type VARCHAR(100) NOT NULL, -- 'dorm', 'private', 'suite'
  capacity INTEGER NOT NULL,
  base_price DOUBLE PRECISION NOT NULL,
  description TEXT,
  amenities TEXT[], -- array of amenity strings
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Beds table for individual bed tracking
CREATE TABLE beds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  number VARCHAR(50) NOT NULL,
  bed_type VARCHAR(50) NOT NULL DEFAULT 'standard', -- 'standard', 'bunk_top', 'bunk_bottom'
  status VARCHAR(50) NOT NULL DEFAULT 'clean', -- 'occupied', 'clean', 'dirty', 'maintenance', 'out_of_order'
  price_modifier DOUBLE PRECISION DEFAULT 0, -- additional price for this specific bed
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(room_id, number)
);

-- Reservations table
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_code VARCHAR(20) UNIQUE NOT NULL,
  guest_id UUID NOT NULL REFERENCES guests(id),
  room_id UUID NOT NULL REFERENCES rooms(id),
  bed_id UUID REFERENCES beds(id),
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  guests_count INTEGER NOT NULL DEFAULT 1,
  total_amount DOUBLE PRECISION NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'confirmed', -- 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'
  source VARCHAR(100), -- 'walk_in', 'online', 'phone', 'booking.com', etc.
  special_requests TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Folios table for guest charges and payments
CREATE TABLE folios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id),
  guest_id UUID NOT NULL REFERENCES guests(id),
  total_charges DOUBLE PRECISION DEFAULT 0,
  total_payments DOUBLE PRECISION DEFAULT 0,
  balance DOUBLE PRECISION DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'open', -- 'open', 'closed', 'pending'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Folio items for individual charges and payments
CREATE TABLE folio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio_id UUID NOT NULL REFERENCES folios(id) ON DELETE CASCADE,
  item_type VARCHAR(50) NOT NULL, -- 'accommodation', 'product', 'service', 'tax', 'payment', 'refund'
  description VARCHAR(255) NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  quantity INTEGER DEFAULT 1,
  date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Products table for POS system
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL, -- 'food', 'beverage', 'merchandise', 'service'
  price DOUBLE PRECISION NOT NULL,
  cost DOUBLE PRECISION DEFAULT 0,
  sku VARCHAR(100) UNIQUE,
  barcode VARCHAR(100),
  stock_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inventory transactions for stock tracking
CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  transaction_type VARCHAR(50) NOT NULL, -- 'purchase', 'sale', 'adjustment', 'waste'
  quantity INTEGER NOT NULL,
  unit_cost DOUBLE PRECISION DEFAULT 0,
  reference_type VARCHAR(50), -- 'folio_item', 'purchase_order', 'adjustment'
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payments table for payment tracking
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folio_id UUID NOT NULL REFERENCES folios(id),
  amount DOUBLE PRECISION NOT NULL,
  payment_method VARCHAR(50) NOT NULL, -- 'cash', 'card', 'bank_transfer', 'online'
  payment_reference VARCHAR(255), -- external payment ID
  status VARCHAR(50) NOT NULL DEFAULT 'completed', -- 'pending', 'completed', 'failed', 'refunded'
  processed_by UUID REFERENCES users(id),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pre-authorizations for card holds
CREATE TABLE preauthorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id),
  amount DOUBLE PRECISION NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  authorization_code VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'captured', 'released', 'expired'
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_guests_email ON guests(email);
CREATE INDEX idx_reservations_confirmation_code ON reservations(confirmation_code);
CREATE INDEX idx_reservations_dates ON reservations(check_in_date, check_out_date);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_beds_room_id ON beds(room_id);
CREATE INDEX idx_beds_status ON beds(status);
CREATE INDEX idx_folio_items_folio_id ON folio_items(folio_id);
CREATE INDEX idx_inventory_transactions_product_id ON inventory_transactions(product_id);
CREATE INDEX idx_payments_folio_id ON payments(folio_id);
