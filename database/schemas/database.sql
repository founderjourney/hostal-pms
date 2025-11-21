-- ALMANIK PMS - DATABASE ULTRA SIMPLE
-- 4 TABLAS ÚNICAMENTE - MÁXIMA SIMPLICIDAD

-- Crear database
-- CREATE DATABASE almanik_simple;
-- \c almanik_simple;

-- TABLA 1: guests (huéspedes básico)
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS beds CASCADE;
DROP TABLE IF EXISTS guests CASCADE;

CREATE TABLE guests (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  phone VARCHAR(50),
  document VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABLA 2: beds (camas con estado)
CREATE TABLE beds (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,     -- "1-A", "2-B", "Private-1"
  price DECIMAL(10,2) NOT NULL,         -- precio fijo por noche
  status VARCHAR(20) DEFAULT 'clean',   -- clean, dirty, occupied
  guest_id INTEGER REFERENCES guests(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABLA 3: bookings (reservas simples)
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  guest_id INTEGER REFERENCES guests(id),
  bed_id INTEGER REFERENCES beds(id),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights INTEGER NOT NULL DEFAULT 1,
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',  -- active, completed, cancelled
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABLA 4: transactions (todo: pagos, cargos, ventas)
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id),
  type VARCHAR(20) NOT NULL,            -- payment, charge, sale
  description VARCHAR(200) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  method VARCHAR(50) DEFAULT 'cash',    -- cash, card
  created_at TIMESTAMP DEFAULT NOW()
);

-- SEED DATA BÁSICO
INSERT INTO guests (name, email, phone, document) VALUES
('Juan Pérez', 'juan@email.com', '+1234567890', 'DOC123456'),
('Maria González', 'maria@email.com', '+0987654321', 'DOC789012'),
('Carlos Silva', 'carlos@email.com', '+1122334455', 'DOC345678');

INSERT INTO beds (name, price, status) VALUES
('1-A', 25.00, 'clean'),
('1-B', 25.00, 'clean'),
('2-A', 25.00, 'clean'),
('2-B', 25.00, 'clean'),
('Private-1', 50.00, 'clean'),
('Private-2', 50.00, 'clean');

-- Índices básicos para performance
CREATE INDEX idx_beds_status ON beds(status);
CREATE INDEX idx_bookings_dates ON bookings(check_in, check_out);
CREATE INDEX idx_transactions_booking ON transactions(booking_id);

-- Verificación
SELECT 'Database setup completed successfully!' as status;