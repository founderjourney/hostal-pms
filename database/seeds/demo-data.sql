-- ALMANIK PMS - DATOS DE DEMO COMPLETOS
-- Para testing y demostración del sistema

-- Clear existing data
DELETE FROM transactions;
DELETE FROM bookings;
DELETE FROM beds;
DELETE FROM guests;

-- GUESTS DE DEMO (más realistas)
INSERT INTO guests (name, email, phone, document) VALUES
('Juan Pérez', 'juan.perez@email.com', '+1-555-0123', 'PASS123456'),
('Maria González', 'maria.gonzalez@gmail.com', '+1-555-0456', 'ID789012'),
('Carlos Silva', 'carlos.silva@hotmail.com', '+1-555-0789', 'DOC345678'),
('Ana Rodríguez', 'ana.rodriguez@yahoo.com', '+1-555-0321', 'PASS987654'),
('Diego Martín', 'diego.martin@email.com', '+1-555-0654', 'ID567890'),
('Laura Torres', 'laura.torres@gmail.com', '+1-555-0987', 'DOC123987'),
('Pedro Sánchez', 'pedro.sanchez@email.com', '+1-555-0147', 'PASS456123'),
('Sofia Herrera', 'sofia.herrera@gmail.com', '+1-555-0258', 'ID852741');

-- BEDS CONFIGURACIÓN REALISTA (hostal típico)
INSERT INTO beds (name, price, status) VALUES
-- Dorm Room 1 (4 beds)
('1-A', 25.00, 'clean'),
('1-B', 25.00, 'occupied'),
('1-C', 25.00, 'clean'),
('1-D', 25.00, 'dirty'),

-- Dorm Room 2 (4 beds)
('2-A', 25.00, 'occupied'),
('2-B', 25.00, 'clean'),
('2-C', 25.00, 'occupied'),
('2-D', 25.00, 'clean'),

-- Private Rooms
('Private-1', 50.00, 'occupied'),
('Private-2', 50.00, 'clean'),
('Private-3', 55.00, 'dirty'),
('Private-4', 55.00, 'clean');

-- RESERVAS ACTIVAS (guests currently checked in)
-- Guest Juan Pérez in bed 1-B
INSERT INTO bookings (guest_id, bed_id, check_in, check_out, nights, total, status) VALUES
((SELECT id FROM guests WHERE document = 'PASS123456'),
 (SELECT id FROM beds WHERE name = '1-B'),
 CURRENT_DATE - INTERVAL '1 day',
 CURRENT_DATE + INTERVAL '2 days',
 3, 75.00, 'active');

-- Guest Maria González in bed 2-A
INSERT INTO bookings (guest_id, bed_id, check_in, check_out, nights, total, status) VALUES
((SELECT id FROM guests WHERE document = 'ID789012'),
 (SELECT id FROM beds WHERE name = '2-A'),
 CURRENT_DATE,
 CURRENT_DATE + INTERVAL '3 days',
 3, 75.00, 'active');

-- Guest Carlos Silva in bed 2-C
INSERT INTO bookings (guest_id, bed_id, check_in, check_out, nights, total, status) VALUES
((SELECT id FROM guests WHERE document = 'DOC345678'),
 (SELECT id FROM beds WHERE name = '2-C'),
 CURRENT_DATE - INTERVAL '2 days',
 CURRENT_DATE + INTERVAL '1 day',
 3, 75.00, 'active');

-- Guest Ana Rodríguez in Private-1
INSERT INTO bookings (guest_id, bed_id, check_in, check_out, nights, total, status) VALUES
((SELECT id FROM guests WHERE document = 'PASS987654'),
 (SELECT id FROM beds WHERE name = 'Private-1'),
 CURRENT_DATE,
 CURRENT_DATE + INTERVAL '4 days',
 4, 200.00, 'active');

-- UPDATE beds to show current guests
UPDATE beds SET guest_id = (SELECT id FROM guests WHERE document = 'PASS123456')
WHERE name = '1-B';

UPDATE beds SET guest_id = (SELECT id FROM guests WHERE document = 'ID789012')
WHERE name = '2-A';

UPDATE beds SET guest_id = (SELECT id FROM guests WHERE document = 'DOC345678')
WHERE name = '2-C';

UPDATE beds SET guest_id = (SELECT id FROM guests WHERE document = 'PASS987654')
WHERE name = 'Private-1';

-- TRANSACCIONES DE DEMO (cargos y pagos)
-- Juan Pérez transactions (bed 1-B)
INSERT INTO transactions (booking_id, type, description, amount, method) VALUES
((SELECT id FROM bookings WHERE guest_id = (SELECT id FROM guests WHERE document = 'PASS123456') AND status = 'active'),
 'charge', 'Room charge - 3 nights', 75.00, 'cash'),
((SELECT id FROM bookings WHERE guest_id = (SELECT id FROM guests WHERE document = 'PASS123456') AND status = 'active'),
 'charge', 'Beer x2', 7.00, 'cash'),
((SELECT id FROM bookings WHERE guest_id = (SELECT id FROM guests WHERE document = 'PASS123456') AND status = 'active'),
 'payment', 'Partial payment', 50.00, 'cash');

-- Maria González transactions (bed 2-A)
INSERT INTO transactions (booking_id, type, description, amount, method) VALUES
((SELECT id FROM bookings WHERE guest_id = (SELECT id FROM guests WHERE document = 'ID789012') AND status = 'active'),
 'charge', 'Room charge - 3 nights', 75.00, 'card'),
((SELECT id FROM bookings WHERE guest_id = (SELECT id FROM guests WHERE document = 'ID789012') AND status = 'active'),
 'charge', 'Coffee', 2.00, 'cash'),
((SELECT id FROM bookings WHERE guest_id = (SELECT id FROM guests WHERE document = 'ID789012') AND status = 'active'),
 'payment', 'Credit card payment', 77.00, 'card');

-- Carlos Silva transactions (bed 2-C) - has pending balance
INSERT INTO transactions (booking_id, type, description, amount, method) VALUES
((SELECT id FROM bookings WHERE guest_id = (SELECT id FROM guests WHERE document = 'DOC345678') AND status = 'active'),
 'charge', 'Room charge - 3 nights', 75.00, 'cash'),
((SELECT id FROM bookings WHERE guest_id = (SELECT id FROM guests WHERE document = 'DOC345678') AND status = 'active'),
 'charge', 'Sandwich', 5.00, 'cash'),
((SELECT id FROM bookings WHERE guest_id = (SELECT id FROM guests WHERE document = 'DOC345678') AND status = 'active'),
 'charge', 'Water x2', 2.00, 'cash'),
((SELECT id FROM bookings WHERE guest_id = (SELECT id FROM guests WHERE document = 'DOC345678') AND status = 'active'),
 'payment', 'Partial payment', 30.00, 'cash');
-- Carlos has pending balance of $52.00

-- Ana Rodríguez transactions (Private-1)
INSERT INTO transactions (booking_id, type, description, amount, method) VALUES
((SELECT id FROM bookings WHERE guest_id = (SELECT id FROM guests WHERE document = 'PASS987654') AND status = 'active'),
 'charge', 'Room charge - 4 nights', 200.00, 'card'),
((SELECT id FROM bookings WHERE guest_id = (SELECT id FROM guests WHERE document = 'PASS987654') AND status = 'active'),
 'payment', 'Credit card payment', 200.00, 'card');

-- VENTAS DIRECTAS DE DEMO (no asociadas a rooms)
INSERT INTO transactions (type, description, amount, method, created_at) VALUES
('sale', 'Beer x3', 10.50, 'cash', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
('sale', 'Coffee x2', 4.00, 'cash', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
('sale', 'Snack', 2.50, 'cash', CURRENT_TIMESTAMP - INTERVAL '30 minutes'),
('sale', 'Water', 1.00, 'cash', CURRENT_TIMESTAMP - INTERVAL '15 minutes');

-- RESERVAS COMPLETADAS (historial)
INSERT INTO bookings (guest_id, bed_id, check_in, check_out, nights, total, status) VALUES
((SELECT id FROM guests WHERE document = 'ID567890'),
 (SELECT id FROM beds WHERE name = '1-A'),
 CURRENT_DATE - INTERVAL '5 days',
 CURRENT_DATE - INTERVAL '3 days',
 2, 50.00, 'completed'),
((SELECT id FROM guests WHERE document = 'DOC123987'),
 (SELECT id FROM beds WHERE name = 'Private-2'),
 CURRENT_DATE - INTERVAL '7 days',
 CURRENT_DATE - INTERVAL '4 days',
 3, 150.00, 'completed');

-- TRANSACCIONES COMPLETADAS
INSERT INTO transactions (booking_id, type, description, amount, method) VALUES
((SELECT id FROM bookings WHERE guest_id = (SELECT id FROM guests WHERE document = 'ID567890') AND status = 'completed'),
 'charge', 'Room charge - 2 nights', 50.00, 'cash'),
((SELECT id FROM bookings WHERE guest_id = (SELECT id FROM guests WHERE document = 'ID567890') AND status = 'completed'),
 'payment', 'Cash payment', 50.00, 'cash'),
((SELECT id FROM bookings WHERE guest_id = (SELECT id FROM guests WHERE document = 'DOC123987') AND status = 'completed'),
 'charge', 'Room charge - 3 nights', 150.00, 'card'),
((SELECT id FROM bookings WHERE guest_id = (SELECT id FROM guests WHERE document = 'DOC123987') AND status = 'completed'),
 'payment', 'Credit card payment', 150.00, 'card');

-- Verificación final
SELECT 'Demo data loaded successfully!' as status,
       (SELECT COUNT(*) FROM guests) as total_guests,
       (SELECT COUNT(*) FROM beds) as total_beds,
       (SELECT COUNT(*) FROM bookings WHERE status = 'active') as active_bookings,
       (SELECT COUNT(*) FROM transactions) as total_transactions;