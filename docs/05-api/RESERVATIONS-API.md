# 📋 API DOCUMENTATION - RESERVATIONS MODULE

**Version:** 1.0.0
**Created:** 2025-11-20
**Base URL:** `/api/reservations`
**Authentication:** Required (session-id header)

---

## 📊 OVERVIEW

El módulo de reservations permite gestionar completamente las reservas del hostal, incluyendo:
- Crear, listar, actualizar y cancelar reservas
- Verificar disponibilidad de camas
- Confirmar reservas pendientes
- Generar códigos de confirmación únicos
- Tracking completo de estados

---

## 🔐 AUTHENTICATION

Todos los endpoints requieren autenticación mediante header:
```
session-id: [your-session-id]
```

Obtener session-id:
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

## 📍 ENDPOINTS

### 1. GET /api/reservations
**Listar todas las reservas**

**Query Parameters (opcional):**
- `status` (string): Filtrar por estado (pending, confirmed, checked_in, checked_out, cancelled, no_show)
- `guest_id` (integer): Filtrar por ID de huésped
- `bed_id` (integer): Filtrar por ID de cama
- `date_from` (date): Filtrar reservas desde esta fecha (YYYY-MM-DD)
- `date_to` (date): Filtrar reservas hasta esta fecha (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "count": 2,
  "reservations": [
    {
      "id": 3,
      "guest_id": 3,
      "bed_id": 5,
      "check_in": "2025-11-25",
      "check_out": "2025-11-28",
      "nights": 3,
      "total": 75,
      "status": "confirmed",
      "confirmation_code": "ALM-20251120-181424",
      "source": "phone",
      "created_at": "2025-11-21 04:14:24",
      "guest_name": "Carlos Eduardo Silva",
      "guest_document": "1023456789",
      "guest_email": "carlos.silva@gmail.com",
      "guest_phone": "+57 312 555 1234",
      "bed_name": "1-5",
      "room_name": "Habitacion 1",
      "bed_price": 25
    }
  ]
}
```

**Example:**
```bash
# Listar todas las reservas
curl http://localhost:3000/api/reservations \
  -H "session-id: YOUR_SESSION_ID"

# Filtrar por estado
curl "http://localhost:3000/api/reservations?status=pending" \
  -H "session-id: YOUR_SESSION_ID"

# Filtrar por rango de fechas
curl "http://localhost:3000/api/reservations?date_from=2025-11-25&date_to=2025-11-30" \
  -H "session-id: YOUR_SESSION_ID"
```

---

### 2. POST /api/reservations
**Crear nueva reserva**

**Request Body:**
```json
{
  "guest_id": 1,
  "bed_id": 5,
  "check_in": "2025-11-25",
  "check_out": "2025-11-28",
  "source": "phone"
}
```

**Fields:**
- `guest_id` (integer, required): ID del huésped
- `bed_id` (integer, required): ID de la cama
- `check_in` (date, required): Fecha de entrada (YYYY-MM-DD)
- `check_out` (date, required): Fecha de salida (YYYY-MM-DD)
- `source` (string, optional): Origen de la reserva (walkin, phone, email, booking.com, etc.)

**Response:**
```json
{
  "success": true,
  "message": "Reservation created successfully",
  "reservation": {
    "id": 3,
    "guest_id": 3,
    "bed_id": 5,
    "check_in": "2025-11-25",
    "check_out": "2025-11-28",
    "nights": 3,
    "total": 75,
    "status": "pending",
    "confirmation_code": "ALM-20251120-181424",
    "source": "phone",
    "created_at": "2025-11-21 04:14:24",
    "created_by": 1,
    "guest_name": "Carlos Eduardo Silva",
    "bed_name": "1-5",
    "room_name": "Habitacion 1"
  }
}
```

**Validations:**
- Check-in debe ser hoy o en el futuro
- Check-out debe ser después de check-in
- La cama debe existir y estar disponible
- El huésped debe existir

**Errors:**
```json
// 400 - Missing fields
{
  "success": false,
  "error": "Missing required fields: guest_id, bed_id, check_in, check_out"
}

// 400 - Invalid dates
{
  "success": false,
  "error": "Check-in date cannot be in the past"
}

// 404 - Guest not found
{
  "success": false,
  "error": "Guest not found"
}

// 409 - Bed not available
{
  "success": false,
  "error": "Bed is not available for the selected dates",
  "conflictingBookings": [...]
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -H "session-id: YOUR_SESSION_ID" \
  -d '{
    "guest_id": 1,
    "bed_id": 5,
    "check_in": "2025-11-25",
    "check_out": "2025-11-28",
    "source": "phone"
  }'
```

---

### 3. GET /api/reservations/:id
**Obtener una reserva específica**

**URL Parameters:**
- `id` (integer): ID de la reserva

**Response:**
```json
{
  "success": true,
  "reservation": {
    "id": 3,
    "guest_id": 3,
    "bed_id": 5,
    "check_in": "2025-11-25",
    "check_out": "2025-11-28",
    "nights": 3,
    "total": 75,
    "status": "confirmed",
    "confirmation_code": "ALM-20251120-181424",
    "source": "phone",
    "created_at": "2025-11-21 04:14:24",
    "guest_name": "Carlos Eduardo Silva",
    "guest_document": "1023456789",
    "bed_name": "1-5",
    "room_name": "Habitacion 1",
    "created_by_name": "Administrador Principal"
  },
  "transactions": [
    {
      "id": 10,
      "booking_id": 3,
      "type": "charge",
      "description": "Room charge - 3 nights",
      "amount": 75,
      "method": "pending",
      "created_at": "2025-11-21 04:15:00"
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:3000/api/reservations/3 \
  -H "session-id: YOUR_SESSION_ID"
```

---

### 4. PUT /api/reservations/:id
**Actualizar una reserva existente**

**URL Parameters:**
- `id` (integer): ID de la reserva

**Request Body (todos opcionales):**
```json
{
  "check_in": "2025-11-26",
  "check_out": "2025-11-29",
  "bed_id": 10,
  "status": "confirmed"
}
```

**Fields:**
- `check_in` (date, optional): Nueva fecha de entrada
- `check_out` (date, optional): Nueva fecha de salida
- `bed_id` (integer, optional): Nueva cama
- `status` (string, optional): Nuevo estado

**Response:**
```json
{
  "success": true,
  "message": "Reservation updated successfully",
  "reservation": {
    "id": 5,
    "check_in": "2025-12-05",
    "check_out": "2025-12-10",
    "nights": 5,
    "total": 125,
    "status": "pending",
    "updated_at": "2025-11-21 04:15:13"
  }
}
```

**Validations:**
- No se pueden editar reservas completed, cancelled, o no_show
- La nueva cama debe estar disponible para las nuevas fechas
- Recalcula automáticamente noches y total

**Example:**
```bash
# Extender check-out
curl -X PUT http://localhost:3000/api/reservations/5 \
  -H "Content-Type: application/json" \
  -H "session-id: YOUR_SESSION_ID" \
  -d '{"check_out": "2025-12-10"}'

# Cambiar cama
curl -X PUT http://localhost:3000/api/reservations/5 \
  -H "Content-Type: application/json" \
  -H "session-id: YOUR_SESSION_ID" \
  -d '{"bed_id": 10}'
```

---

### 5. DELETE /api/reservations/:id
**Cancelar una reserva**

**URL Parameters:**
- `id` (integer): ID de la reserva

**Request Body (opcional):**
```json
{
  "reason": "Cliente canceló por teléfono"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Reservation cancelled successfully"
}
```

**Effects:**
- Actualiza status a "cancelled"
- Registra cancelled_at timestamp
- Libera la cama si estaba reservada/ocupada
- Registra en activity_log

**Errors:**
```json
// 400 - Already completed
{
  "success": false,
  "error": "Cannot cancel completed reservations"
}

// 400 - Already cancelled
{
  "success": false,
  "error": "Reservation is already cancelled"
}
```

**Example:**
```bash
curl -X DELETE http://localhost:3000/api/reservations/4 \
  -H "Content-Type: application/json" \
  -H "session-id: YOUR_SESSION_ID" \
  -d '{"reason": "Cliente canceló"}'
```

---

### 6. POST /api/reservations/:id/confirm
**Confirmar una reserva pendiente**

**URL Parameters:**
- `id` (integer): ID de la reserva

**Response:**
```json
{
  "success": true,
  "message": "Reservation confirmed successfully",
  "reservation": {
    "id": 3,
    "status": "confirmed",
    "confirmation_code": "ALM-20251120-181424",
    "updated_at": "2025-11-21 04:15:00"
  }
}
```

**Effects:**
- Cambia status de "pending" a "confirmed"
- Verifica disponibilidad nuevamente
- Crea transacción automática (cargo por habitación)
- Registra en activity_log

**Validations:**
- Solo se pueden confirmar reservas con status "pending"
- La cama debe seguir disponible

**Example:**
```bash
curl -X POST http://localhost:3000/api/reservations/3/confirm \
  -H "Content-Type: application/json" \
  -H "session-id: YOUR_SESSION_ID"
```

---

### 7. GET /api/reservations/availability/check
**Verificar disponibilidad de camas**

**Query Parameters:**
- `check_in` (date, required): Fecha de entrada (YYYY-MM-DD)
- `check_out` (date, required): Fecha de salida (YYYY-MM-DD)
- `bed_id` (integer, optional): Si se especifica, verifica solo esa cama

**Response (todas las camas):**
```json
{
  "success": true,
  "check_in": "2025-11-25",
  "check_out": "2025-11-28",
  "nights": 3,
  "total_beds": 27,
  "available_beds_count": 26,
  "occupied_beds_count": 1,
  "available_beds": [
    {
      "bed_id": 1,
      "bed_name": "1-1",
      "room": "Habitacion 1",
      "price": 25,
      "available": true,
      "conflictingBookings": []
    },
    ...
  ],
  "occupied_beds": [
    {
      "bed_id": 5,
      "bed_name": "1-5",
      "room": "Habitacion 1",
      "price": 25,
      "available": false,
      "conflictingBookings": [
        {
          "id": 3,
          "confirmation_code": "ALM-20251120-181424",
          "check_in": "2025-11-25",
          "check_out": "2025-11-28",
          "status": "confirmed"
        }
      ]
    }
  ]
}
```

**Response (cama específica):**
```json
{
  "success": true,
  "bed_id": 5,
  "bed_name": "1-5",
  "available": false,
  "conflictingBookings": [...]
}
```

**Example:**
```bash
# Verificar todas las camas
curl "http://localhost:3000/api/reservations/availability/check?check_in=2025-11-25&check_out=2025-11-28" \
  -H "session-id: YOUR_SESSION_ID"

# Verificar una cama específica
curl "http://localhost:3000/api/reservations/availability/check?check_in=2025-11-25&check_out=2025-11-28&bed_id=5" \
  -H "session-id: YOUR_SESSION_ID"
```

---

## 📊 DATA MODELS

### Reservation Object
```typescript
{
  id: number;
  guest_id: number;
  bed_id: number;
  check_in: string; // YYYY-MM-DD
  check_out: string; // YYYY-MM-DD
  nights: number;
  total: number;
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
  confirmation_code: string; // "ALM-YYYYMMDD-HHMMSS"
  source: string; // 'walkin', 'phone', 'email', 'booking.com', etc.
  created_by: number | null;
  created_at: string;
  updated_at: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  cancelled_at: string | null;

  // Joined fields
  guest_name: string;
  guest_document: string;
  guest_email: string;
  guest_phone: string;
  bed_name: string;
  room_name: string;
  bed_price: number;
  created_by_name: string;
}
```

### Reservation Status Flow
```
pending → confirmed → checked_in → checked_out
   ↓
cancelled / no_show
```

---

## 🔧 BUSINESS LOGIC

### Availability Check
Una cama está disponible si NO hay reservas con status `pending`, `confirmed`, o `checked_in` que se superpongan con las fechas solicitadas.

**Overlap conditions:**
```sql
WHERE (
  (check_in <= requested_check_in AND check_out > requested_check_in) OR
  (check_in < requested_check_out AND check_out >= requested_check_out) OR
  (check_in >= requested_check_in AND check_out <= requested_check_out)
)
```

### Price Calculation
```
total = bed.price × nights
nights = (check_out_date - check_in_date) in days
```

### Confirmation Code Format
```
ALM-YYYYMMDD-HHMMSS
Example: ALM-20251120-181424
```

### Auto-transactions
Cuando se confirma una reserva:
```json
{
  "booking_id": 3,
  "type": "charge",
  "description": "Room charge - 3 nights",
  "amount": 75.00,
  "method": "pending"
}
```

---

## ❌ ERROR CODES

| Status | Error | Cause |
|--------|-------|-------|
| 400 | Missing required fields | Faltan campos requeridos |
| 400 | Invalid date range | Fechas inválidas |
| 400 | Cannot modify completed reservations | Intentar editar reserva finalizada |
| 401 | Not authenticated | Falta session-id o es inválido |
| 404 | Reservation not found | ID de reserva no existe |
| 404 | Guest not found | ID de huésped no existe |
| 404 | Bed not found | ID de cama no existe |
| 409 | Bed is not available | Conflicto de disponibilidad |
| 500 | Internal server error | Error en servidor |

---

## 📝 NOTES

### Testing
Para testing manual, usar los scripts provistos en:
- `docs/04-daily-plans/DIA-2-PLAN.md`

### Database
- **Desarrollo:** SQLite (server/almanik.db)
- **Producción:** PostgreSQL (Neon)

### Activity Logging
Todas las operaciones importantes se registran en `activity_log`:
- create: Nueva reserva creada
- update: Reserva actualizada o confirmada
- delete: Reserva cancelada

---

## 🚀 EXAMPLES COLLECTION

### Complete Workflow Example
```bash
# 1. Login
SESSION_ID=$(curl -s -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.sessionId')

# 2. Check availability
curl -s "http://localhost:3000/api/reservations/availability/check?check_in=2025-12-01&check_out=2025-12-03" \
  -H "session-id: $SESSION_ID" | jq '.available_beds_count'

# 3. Create reservation
RESERVATION_ID=$(curl -s -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -H "session-id: $SESSION_ID" \
  -d '{
    "guest_id": 1,
    "bed_id": 5,
    "check_in": "2025-12-01",
    "check_out": "2025-12-03",
    "source": "phone"
  }' | jq -r '.reservation.id')

# 4. Confirm reservation
curl -s -X POST http://localhost:3000/api/reservations/$RESERVATION_ID/confirm \
  -H "Content-Type: application/json" \
  -H "session-id: $SESSION_ID" | jq '.success'

# 5. Get reservation details
curl -s http://localhost:3000/api/reservations/$RESERVATION_ID \
  -H "session-id: $SESSION_ID" | jq '.'

# 6. Update reservation
curl -s -X PUT http://localhost:3000/api/reservations/$RESERVATION_ID \
  -H "Content-Type: application/json" \
  -H "session-id: $SESSION_ID" \
  -d '{"check_out": "2025-12-05"}' | jq '.reservation.nights'

# 7. Cancel reservation (if needed)
curl -s -X DELETE http://localhost:3000/api/reservations/$RESERVATION_ID \
  -H "Content-Type: application/json" \
  -H "session-id: $SESSION_ID" \
  -d '{"reason": "Test cancellation"}' | jq '.success'
```

---

**Created:** 2025-11-20
**Status:** Complete and tested ✅
**Module Version:** 1.0.0
**Last Updated:** 2025-11-20
