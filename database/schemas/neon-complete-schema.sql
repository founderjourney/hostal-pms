-- ============================================
-- ALMANIK PMS - NEON POSTGRESQL COMPLETE SCHEMA
-- Version: 2.0 - Complete (20 tables)
-- Database: PostgreSQL 16
-- Platform: Neon Serverless
-- Created: 2025-11-19
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables (CUIDADO: Esto elimina datos!)
-- Solo usar en database nueva o para recrear
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS bed_blocks CASCADE;
DROP TABLE IF EXISTS guest_group_members CASCADE;
DROP TABLE IF EXISTS guest_groups CASCADE;
DROP TABLE IF EXISTS cashbox_movements CASCADE;
DROP TABLE IF EXISTS cashbox_shifts CASCADE;
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS tour_commissions CASCADE;
DROP TABLE IF EXISTS tour_clicks CASCADE;
DROP TABLE IF EXISTS tours CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS beds CASCADE;
DROP TABLE IF EXISTS guests CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- CORE TABLES (Sistema base)
-- ============================================

-- USERS: Sistema de autenticación y roles
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'voluntario', -- admin, recepcionista, voluntario
  permissions TEXT, -- JSON string de permisos granulares
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GUESTS: Huéspedes (mejorado con campos legales)
CREATE TABLE guests (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  document VARCHAR(100) UNIQUE NOT NULL,

  -- Legal fields (check-in form)
  nationality VARCHAR(100) DEFAULT 'Colombia',
  passport_number VARCHAR(100),
  passport_expiry DATE,
  visa_expiry DATE,

  -- Emergency contact
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  emergency_contact_relationship VARCHAR(50),

  -- Preferences
  preferences TEXT, -- JSON: {room_type, dietary_restrictions, allergies}
  notes TEXT, -- Staff notes/observaciones

  -- Blacklist
  is_blacklisted BOOLEAN DEFAULT false,
  blacklist_reason TEXT,
  blacklisted_at TIMESTAMP,
  blacklisted_by INTEGER REFERENCES users(id),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- BEDS: Camas (mejorado con maintenance)
CREATE TABLE beds (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL, -- "1-A", "2-B", "Private-1"
  room VARCHAR(100), -- Habitacion 1, 2, 3, Private 1, etc
  bed_type VARCHAR(50) DEFAULT 'dorm', -- dorm, private, bunk, single, double

  price DECIMAL(10,2) NOT NULL, -- Precio base por noche

  status VARCHAR(20) DEFAULT 'clean', -- clean, dirty, occupied, blocked, maintenance

  -- Maintenance mode
  maintenance_reason TEXT,
  maintenance_start DATE,
  maintenance_end DATE,

  -- Current guest (if occupied)
  guest_id INTEGER REFERENCES guests(id) ON DELETE SET NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- BOOKINGS: Reservas (mejorado)
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  guest_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  bed_id INTEGER NOT NULL REFERENCES beds(id) ON DELETE CASCADE,

  confirmation_code VARCHAR(20) UNIQUE, -- ALM + timestamp

  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights INTEGER NOT NULL DEFAULT 1,

  total DECIMAL(10,2) NOT NULL, -- Total amount to pay

  status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, checked_in, checked_out, cancelled, no_show

  source VARCHAR(50) DEFAULT 'walkin', -- walkin, phone, email, booking.com, etc

  -- Timestamps
  checked_in_at TIMESTAMP,
  checked_out_at TIMESTAMP,
  cancelled_at TIMESTAMP,

  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TRANSACTIONS: Transacciones financieras
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,

  type VARCHAR(20) NOT NULL, -- payment, charge, refund
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,

  method VARCHAR(50) DEFAULT 'cash', -- cash, card, transfer, stripe

  -- Reference (for cards/stripe)
  reference VARCHAR(255),

  -- Link to sale (if POS sale)
  sale_id INTEGER,

  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- POS MODULE (Ventas)
-- ============================================

-- PRODUCTS: Productos para POS
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  price DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2), -- Costo (para profit margin)

  category VARCHAR(100) NOT NULL, -- Bebidas, Comida, Snacks, Souvenirs

  stock INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,

  sku VARCHAR(100) UNIQUE, -- Stock Keeping Unit
  barcode VARCHAR(100), -- Para barcode scanner

  image_url TEXT,

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SALE_ITEMS: Items de cada venta (junction table)
CREATE TABLE sale_items (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL, -- Precio al momento de venta
  discount DECIMAL(10,2) DEFAULT 0, -- Descuento aplicado

  subtotal DECIMAL(10,2) NOT NULL, -- quantity * unit_price - discount

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STAFF MODULE (Personal)
-- ============================================

-- STAFF: Personal del hostal
CREATE TABLE staff (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,

  position VARCHAR(100) NOT NULL, -- Recepcionista, Limpieza, Seguridad, Mantenimiento, Cocinero

  phone VARCHAR(50),
  email VARCHAR(255),

  -- Emergency contact
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),

  -- Salary
  salary DECIMAL(10,2), -- Salario mensual o por hora
  salary_type VARCHAR(20) DEFAULT 'monthly', -- monthly, hourly, daily

  schedule TEXT, -- Horario (texto o JSON)

  -- Contract
  hire_date DATE,
  contract_end_date DATE,

  -- Documents
  document VARCHAR(100) UNIQUE,

  active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ATTENDANCE: Asistencia de staff
CREATE TABLE attendance (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,

  date DATE NOT NULL,

  clock_in TIMESTAMP,
  clock_out TIMESTAMP,

  status VARCHAR(20) DEFAULT 'present', -- present, absent, late, sick_leave, vacation

  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(staff_id, date) -- Un registro por día por staff
);

-- TASKS: Tareas asignadas a staff
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,

  task_type VARCHAR(50) NOT NULL, -- cleaning, maintenance, check_in, other

  entity_type VARCHAR(50), -- bed, room, booking
  entity_id INTEGER, -- ID de la entidad (bed_id, booking_id, etc)

  description TEXT NOT NULL,

  status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, cancelled

  due_date TIMESTAMP,
  completed_at TIMESTAMP,

  assigned_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- CASHBOX MODULE (Caja)
-- ============================================

-- CASHBOX_SHIFTS: Turnos de caja
CREATE TABLE cashbox_shifts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),

  opening_amount DECIMAL(10,2) NOT NULL, -- Monto inicial
  closing_amount DECIMAL(10,2), -- Monto final contado
  expected_closing DECIMAL(10,2), -- Monto esperado calculado
  discrepancy DECIMAL(10,2), -- Diferencia (closing - expected)

  status VARCHAR(20) DEFAULT 'open', -- open, closed

  opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP,

  notes TEXT, -- Notas de apertura/cierre

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CASHBOX_MOVEMENTS: Movimientos de caja
CREATE TABLE cashbox_movements (
  id SERIAL PRIMARY KEY,
  shift_id INTEGER NOT NULL REFERENCES cashbox_shifts(id) ON DELETE CASCADE,

  type VARCHAR(20) NOT NULL, -- income, expense, deposit
  category VARCHAR(100), -- venta, gasto_operacional, deposito_banco, compra_suministros, etc

  amount DECIMAL(10,2) NOT NULL,
  method VARCHAR(50) DEFAULT 'cash', -- cash, card, transfer

  description TEXT NOT NULL,
  receipt_url TEXT, -- URL del comprobante escaneado

  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TOURS MODULE (Paseos)
-- ============================================

-- TOURS: Tours/paseos
CREATE TABLE tours (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  price DECIMAL(10,2) NOT NULL,
  duration VARCHAR(100), -- "4 horas", "Día completo"

  provider VARCHAR(255) NOT NULL, -- Proveedor/agencia
  commission_rate DECIMAL(5,2) DEFAULT 10, -- % de comisión

  capacity INTEGER, -- Cupo máximo

  booking_url TEXT, -- URL de booking externo

  images TEXT, -- JSON array de URLs

  categories TEXT, -- JSON array: ["Adventure", "Culture", "Food"]

  clicks INTEGER DEFAULT 0, -- Tracking de clicks

  active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TOUR_CLICKS: Tracking de clicks en tours
CREATE TABLE tour_clicks (
  id SERIAL PRIMARY KEY,
  tour_id INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  guest_id INTEGER REFERENCES guests(id) ON DELETE SET NULL,

  clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TOUR_COMMISSIONS: Comisiones ganadas por tours
CREATE TABLE tour_commissions (
  id SERIAL PRIMARY KEY,
  tour_id INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  guest_id INTEGER REFERENCES guests(id) ON DELETE SET NULL,

  amount DECIMAL(10,2) NOT NULL,
  booking_reference VARCHAR(255),

  status VARCHAR(20) DEFAULT 'pending', -- pending, paid
  paid_at TIMESTAMP,

  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- REVIEWS: Reviews de tours
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  tour_id INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  guest_id INTEGER REFERENCES guests(id) ON DELETE SET NULL,

  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ADDITIONAL FEATURES
-- ============================================

-- GUEST_GROUPS: Grupos de huéspedes (familias, grupos de amigos)
CREATE TABLE guest_groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL, -- "Familia Pérez", "Grupo de bachillerato"

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- GUEST_GROUP_MEMBERS: Miembros de grupos
CREATE TABLE guest_group_members (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES guest_groups(id) ON DELETE CASCADE,
  guest_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,

  UNIQUE(group_id, guest_id)
);

-- BED_BLOCKS: Bloqueos temporales de camas
CREATE TABLE bed_blocks (
  id SERIAL PRIMARY KEY,
  bed_id INTEGER NOT NULL REFERENCES beds(id) ON DELETE CASCADE,

  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  reason TEXT NOT NULL, -- "Mantenimiento", "Reservado para evento", etc

  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ACTIVITY_LOG: Log de todas las actividades del sistema
CREATE TABLE activity_log (
  id SERIAL PRIMARY KEY,

  action_type VARCHAR(50) NOT NULL, -- create, update, delete, login, logout, checkin, checkout
  module VARCHAR(50) NOT NULL, -- guests, beds, bookings, pos, etc

  description TEXT NOT NULL, -- "User admin checked in guest Juan to Bed 1-A"

  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

  entity_type VARCHAR(50), -- guest, bed, booking, product
  entity_id INTEGER, -- ID de la entidad afectada

  details TEXT, -- JSON con detalles adicionales

  ip_address VARCHAR(50),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES for Performance
-- ============================================

-- Users
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Guests
CREATE INDEX idx_guests_document ON guests(document);
CREATE INDEX idx_guests_email ON guests(email);
CREATE INDEX idx_guests_name ON guests(name);
CREATE INDEX idx_guests_blacklisted ON guests(is_blacklisted);

-- Beds
CREATE INDEX idx_beds_status ON beds(status);
CREATE INDEX idx_beds_room ON beds(room);
CREATE INDEX idx_beds_guest_id ON beds(guest_id);

-- Bookings
CREATE INDEX idx_bookings_guest_id ON bookings(guest_id);
CREATE INDEX idx_bookings_bed_id ON bookings(bed_id);
CREATE INDEX idx_bookings_dates ON bookings(check_in, check_out);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_confirmation ON bookings(confirmation_code);

-- Transactions
CREATE INDEX idx_transactions_booking_id ON transactions(booking_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

-- Products
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_active ON products(is_active);

-- Sale Items
CREATE INDEX idx_sale_items_transaction_id ON sale_items(transaction_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);

-- Staff
CREATE INDEX idx_staff_position ON staff(position);
CREATE INDEX idx_staff_active ON staff(active);

-- Attendance
CREATE INDEX idx_attendance_staff_id ON attendance(staff_id);
CREATE INDEX idx_attendance_date ON attendance(date);

-- Tasks
CREATE INDEX idx_tasks_staff_id ON tasks(staff_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_entity ON tasks(entity_type, entity_id);

-- Cashbox
CREATE INDEX idx_cashbox_shifts_user_id ON cashbox_shifts(user_id);
CREATE INDEX idx_cashbox_shifts_status ON cashbox_shifts(status);
CREATE INDEX idx_cashbox_movements_shift_id ON cashbox_movements(shift_id);
CREATE INDEX idx_cashbox_movements_type ON cashbox_movements(type);

-- Tours
CREATE INDEX idx_tours_active ON tours(active);
CREATE INDEX idx_tour_clicks_tour_id ON tour_clicks(tour_id);
CREATE INDEX idx_tour_commissions_tour_id ON tour_commissions(tour_id);
CREATE INDEX idx_tour_commissions_status ON tour_commissions(status);

-- Reviews
CREATE INDEX idx_reviews_tour_id ON reviews(tour_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);

-- Activity Log
CREATE INDEX idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX idx_activity_log_module ON activity_log(module);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON guests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_beds_updated_at BEFORE UPDATE ON beds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tours_updated_at BEFORE UPDATE ON tours
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED DATA (Demo data básico)
-- ============================================

-- Demo guests
INSERT INTO guests (name, email, phone, document, nationality) VALUES
('Juan Carlos Pérez', 'juan.perez@gmail.com', '+57 310 234 5678', '1012345678', 'Colombia'),
('María González', 'maria.gonzalez@hotmail.com', '+57 311 987 6543', '1098765432', 'Colombia'),
('Carlos Silva', 'carlos.silva@gmail.com', '+57 312 555 1234', '1023456789', 'Colombia'),
('Ana Rodríguez', 'ana.rodriguez@yahoo.com', '+57 315 888 9999', '1087654321', 'Colombia'),
('Diego Martínez', 'diego.martinez@gmail.com', '+57 318 777 2222', '1034567890', 'Colombia'),
('Valentina Morales', 'valentina.morales@gmail.com', '+57 319 444 3333', '1056789012', 'Colombia');

-- Demo beds (27 camas en 6 habitaciones según habitaciones.txt)
INSERT INTO beds (name, room, price, status) VALUES
-- Habitacion 1 (6 camas)
('1-A', 'Habitacion 1', 25.00, 'clean'),
('1-B', 'Habitacion 1', 25.00, 'clean'),
('1-C', 'Habitacion 1', 25.00, 'clean'),
('1-D', 'Habitacion 1', 25.00, 'clean'),
('1-E', 'Habitacion 1', 25.00, 'clean'),
('1-F', 'Habitacion 1', 25.00, 'clean'),
-- Habitacion 2 (6 camas)
('2-A', 'Habitacion 2', 25.00, 'clean'),
('2-B', 'Habitacion 2', 25.00, 'clean'),
('2-C', 'Habitacion 2', 25.00, 'clean'),
('2-D', 'Habitacion 2', 25.00, 'clean'),
('2-E', 'Habitacion 2', 25.00, 'clean'),
('2-F', 'Habitacion 2', 25.00, 'clean'),
-- Habitacion 3 (4 camas)
('3-A', 'Habitacion 3', 25.00, 'clean'),
('3-B', 'Habitacion 3', 25.00, 'clean'),
('3-C', 'Habitacion 3', 25.00, 'clean'),
('3-D', 'Habitacion 3', 25.00, 'clean'),
-- Habitacion 4 (5 camas)
('4-A', 'Habitacion 4', 25.00, 'clean'),
('4-B', 'Habitacion 4', 25.00, 'clean'),
('4-C', 'Habitacion 4', 25.00, 'clean'),
('4-D', 'Habitacion 4', 25.00, 'clean'),
('4-E', 'Habitacion 4', 25.00, 'clean'),
-- Priv 1 (3 camas)
('P1-A', 'Priv 1', 40.00, 'clean'),
('P1-B', 'Priv 1', 40.00, 'clean'),
('P1-C', 'Priv 1', 40.00, 'clean'),
-- Priv 2 (3 camas)
('P2-A', 'Priv 2', 40.00, 'clean'),
('P2-B', 'Priv 2', 40.00, 'clean'),
('P2-C', 'Priv 2', 40.00, 'clean');

-- Demo products (POS)
INSERT INTO products (name, price, category, stock, sku) VALUES
('Cerveza Águila', 3.50, 'Bebidas', 50, 'BEB-001'),
('Agua Cristal 500ml', 1.00, 'Bebidas', 100, 'BEB-002'),
('Gaseosa Colombiana', 2.00, 'Bebidas', 40, 'BEB-003'),
('Café Colombiano', 2.00, 'Bebidas', 80, 'BEB-004'),
('Arepa con Queso', 5.00, 'Comida', 30, 'COM-001'),
('Empanada', 2.50, 'Comida', 40, 'COM-002'),
('Bandeja Paisa Mini', 12.00, 'Comida', 20, 'COM-003'),
('Papas Fritas', 3.00, 'Snacks', 50, 'SNK-001'),
('Chocolatina Jet', 1.50, 'Snacks', 60, 'SNK-002'),
('Galletas Festival', 2.00, 'Snacks', 50, 'SNK-003');

-- Demo staff
INSERT INTO staff (name, position, phone, email, salary, active) VALUES
('Laura Gómez', 'Recepcionista', '+57 320 111 2222', 'laura@hostal.com', 1200000, true),
('Pedro Ramírez', 'Limpieza', '+57 321 333 4444', 'pedro@hostal.com', 1000000, true),
('Sofia Castro', 'Seguridad', '+57 322 555 6666', 'sofia@hostal.com', 1100000, true),
('Miguel Torres', 'Mantenimiento', '+57 323 777 8888', 'miguel@hostal.com', 1150000, true);

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

-- Contar tablas creadas
SELECT COUNT(*) as total_tables
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Listar todas las tablas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Mensaje de éxito
SELECT '✅ Neon database setup completed successfully! 20 tables created.' as status;
