# CASHBOX/FINANCE API

## Overview

Modulo de gestion de caja para control de ingresos, egresos y flujo de efectivo del hostal.

## Concepto de Sesiones

El sistema de caja funciona con **sesiones**:
1. Se abre una sesion de caja con un monto inicial
2. Durante la sesion se registran ingresos y egresos
3. Al cerrar, se compara el monto real con el esperado

## Tipos de Transaccion

| Type | Descripcion |
|------|-------------|
| `income` | Dinero que entra |
| `expense` | Dinero que sale |
| `adjustment` | Ajustes de caja |

## Categorias de Ingreso

| Category | Label |
|----------|-------|
| `reservation_payment` | Pago de Reserva |
| `walk_in` | Huesped Directo |
| `extra_service` | Servicio Extra |
| `bar_restaurant` | Bar/Restaurante |
| `laundry` | Lavanderia |
| `other_income` | Otros Ingresos |

## Categorias de Egreso

| Category | Label |
|----------|-------|
| `supplies` | Suministros |
| `maintenance` | Mantenimiento |
| `utilities` | Servicios Publicos |
| `payroll` | Nomina |
| `food_beverage` | Alimentos/Bebidas |
| `cleaning` | Limpieza |
| `petty_cash` | Caja Menor |
| `other_expense` | Otros Gastos |

## Metodos de Pago

| Method | Label |
|--------|-------|
| `cash` | Efectivo |
| `card` | Tarjeta |
| `transfer` | Transferencia |
| `other` | Otro |

---

## Endpoints

### SESSION MANAGEMENT

#### GET /api/cashbox/sessions

Listar sesiones de caja.

**Query Parameters:**
- `status` - Filtrar por estado (open/closed)
- `limit` - Limite de resultados (default: 30)

**Response:**
```json
{
  "success": true,
  "count": 5,
  "sessions": [
    {
      "id": 1,
      "opened_by": 1,
      "closed_by": 1,
      "opening_amount": 500000,
      "closing_amount": 625000,
      "expected_amount": 625000,
      "difference": 0,
      "status": "closed",
      "opened_at": "2025-11-27T08:00:00",
      "closed_at": "2025-11-27T18:00:00",
      "opened_by_name": "Admin",
      "closed_by_name": "Admin",
      "transaction_count": 15,
      "total_income": 150000,
      "total_expense": 25000
    }
  ]
}
```

---

#### GET /api/cashbox/sessions/current

Obtener sesion de caja actualmente abierta.

**Response (sesion abierta):**
```json
{
  "success": true,
  "has_open_session": true,
  "session": {
    "id": 2,
    "opening_amount": 500000,
    "total_income": 75000,
    "total_expense": 10000,
    "total_adjustments": 0,
    "current_balance": 565000,
    "opened_at": "2025-11-27T08:00:00",
    "opened_by_name": "Admin"
  }
}
```

**Response (sin sesion):**
```json
{
  "success": true,
  "has_open_session": false,
  "session": null
}
```

---

#### POST /api/cashbox/sessions/open

Abrir nueva sesion de caja.

**Request Body:**
```json
{
  "opening_amount": 500000,
  "notes": "Apertura turno manana"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cash session opened successfully",
  "session": { ... }
}
```

**Errores:**
- 400: "There is already an open cash session"

---

#### POST /api/cashbox/sessions/close

Cerrar sesion de caja actual.

**Request Body:**
```json
{
  "closing_amount": 625000,
  "notes": "Cierre sin novedades"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cash session closed successfully",
  "session": { ... },
  "summary": {
    "opening_amount": 500000,
    "total_income": 150000,
    "total_expense": 25000,
    "total_adjustments": 0,
    "expected_amount": 625000,
    "closing_amount": 625000,
    "difference": 0
  }
}
```

---

#### GET /api/cashbox/sessions/:id

Obtener detalle de una sesion con sus transacciones.

**Response:**
```json
{
  "success": true,
  "session": { ... },
  "transactions": [ ... ],
  "totals": {
    "income": 150000,
    "expense": 25000,
    "adjustments": 0
  },
  "transaction_count": 10
}
```

---

### TRANSACTIONS

#### GET /api/cashbox/transactions

Listar transacciones.

**Query Parameters:**
- `session_id` - Filtrar por sesion
- `transaction_type` - Filtrar por tipo (income/expense/adjustment)
- `category` - Filtrar por categoria
- `payment_method` - Filtrar por metodo de pago
- `date` - Filtrar por fecha (YYYY-MM-DD)
- `limit` - Limite de resultados (default: 50)

**Response:**
```json
{
  "success": true,
  "count": 10,
  "transaction_types": ["income", "expense", "adjustment"],
  "income_categories": [...],
  "expense_categories": [...],
  "category_labels": {...},
  "payment_methods": ["cash", "card", "transfer", "other"],
  "payment_method_labels": {...},
  "transactions": [
    {
      "id": 1,
      "session_id": 1,
      "transaction_type": "income",
      "category": "reservation_payment",
      "amount": 150000,
      "description": "Pago reserva #123",
      "payment_method": "cash",
      "reference_type": "booking",
      "reference_id": 123,
      "created_by": 1,
      "created_at": "2025-11-27T10:30:00",
      "created_by_name": "Admin"
    }
  ]
}
```

---

#### POST /api/cashbox/transactions

Registrar nueva transaccion.

**Request Body (Ingreso):**
```json
{
  "transaction_type": "income",
  "category": "reservation_payment",
  "amount": 150000,
  "payment_method": "cash",
  "description": "Pago reserva habitacion privada",
  "reference_type": "booking",
  "reference_id": 123
}
```

**Request Body (Egreso):**
```json
{
  "transaction_type": "expense",
  "category": "supplies",
  "amount": 25000,
  "payment_method": "cash",
  "description": "Compra articulos de limpieza"
}
```

**Required Fields:**
- `transaction_type` - income, expense, o adjustment
- `category` - Categoria valida segun el tipo
- `amount` - Monto mayor a 0

**Optional Fields:**
- `payment_method` - Metodo de pago (default: 'cash')
- `description` - Descripcion
- `reference_type` - Tipo de entidad relacionada
- `reference_id` - ID de entidad relacionada

**Response:**
```json
{
  "success": true,
  "message": "Income registered successfully",
  "transaction": { ... }
}
```

---

#### GET /api/cashbox/transactions/:id

Obtener detalle de una transaccion.

**Response:**
```json
{
  "success": true,
  "transaction": { ... }
}
```

---

#### DELETE /api/cashbox/transactions/:id

Anular transaccion (solo si la sesion esta abierta).

**Response:**
```json
{
  "success": true,
  "message": "Transaction voided successfully"
}
```

**Errores:**
- 400: "Cannot delete transaction from a closed session"

---

### STATS & REPORTS

#### GET /api/cashbox/stats

Estadisticas generales de caja.

**Response:**
```json
{
  "success": true,
  "stats": {
    "has_open_session": true,
    "current_session": {
      "id": 1,
      "opening_amount": 500000,
      "current_balance": 625000,
      "total_income": 150000,
      "total_expense": 25000,
      "transaction_count": 10
    },
    "today": {
      "income": 150000,
      "expense": 25000,
      "net": 125000,
      "transactions": 10
    },
    "month": {
      "income": 4500000,
      "expense": 800000,
      "net": 3700000
    },
    "by_category": [
      { "transaction_type": "income", "category": "reservation_payment", "total": 3500000 },
      { "transaction_type": "expense", "category": "supplies", "total": 200000 }
    ]
  }
}
```

---

#### GET /api/cashbox/daily-report

Reporte diario de caja.

**Query Parameters:**
- `date` - Fecha del reporte (YYYY-MM-DD, default: hoy)

**Response:**
```json
{
  "success": true,
  "report_date": "2025-11-27",
  "sessions_count": 1,
  "sessions": [...],
  "transactions_count": 15,
  "transactions": [...],
  "totals": {
    "income": {
      "total": 450000,
      "by_category": {
        "reservation_payment": 300000,
        "walk_in": 100000,
        "extra_service": 50000
      },
      "by_payment_method": {
        "cash": 350000,
        "card": 100000
      }
    },
    "expense": {
      "total": 75000,
      "by_category": {
        "supplies": 50000,
        "food_beverage": 25000
      }
    },
    "adjustments": 0
  },
  "net_result": 375000,
  "category_labels": {...},
  "payment_method_labels": {...}
}
```

---

## Frontend

### Acceso

```
http://localhost:3000/cashbox.html
```

### Funcionalidades

1. **Banner de sesion** - Estado actual de la caja (abierta/cerrada)
2. **Estadisticas** - Ingresos, egresos, neto del dia
3. **Lista de transacciones** - Movimientos del dia con filtros
4. **Acciones rapidas** - Botones para registrar ingreso/egreso
5. **Resumen mensual** - Totales del mes actual
6. **Apertura/Cierre** - Modales para abrir y cerrar caja

---

## Migracion

### SQLite (Desarrollo)

```bash
node server/migrate-cashbox.js
```

### PostgreSQL (Neon - Produccion)

Ejecutar en Neon SQL Editor:
```sql
-- Ver archivo: database/migrations/004-cashbox.sql
```

---

## Archivos del Modulo

```
server/
├── modules/cashbox.js         # Backend module
├── migrate-cashbox.js         # SQLite migration

public/
├── cashbox.html               # Frontend page
├── js/cashbox.js             # Frontend JavaScript

database/migrations/
├── 004-cashbox.sql           # Neon PostgreSQL migration

docs/05-api/
├── CASHBOX-API.md            # Esta documentacion
```

---

## Flujo de Trabajo Tipico

1. **Apertura de turno:**
   - El encargado abre la caja con el monto inicial
   - Se registra quien abrio y a que hora

2. **Durante el turno:**
   - Se registran ingresos (pagos de reservas, ventas, etc.)
   - Se registran egresos (compras, pagos, etc.)
   - El balance se actualiza automaticamente

3. **Cierre de turno:**
   - Se cuenta el dinero en caja
   - Se ingresa el monto real
   - El sistema calcula la diferencia (si hay)
   - Se cierra la sesion con notas si es necesario

---

## Integracion con Otros Modulos

### Reservations
- Los pagos de reservas se pueden vincular usando `reference_type: 'booking'`
- El ID de reserva se guarda en `reference_id`

### Activity Log
- Todas las acciones se registran en `activity_log`
- Acciones: cashbox_opened, cashbox_closed, transaction_created, transaction_voided

---

*Documentacion generada: 2025-11-27*
