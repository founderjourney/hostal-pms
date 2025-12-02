# ALMANIK PMS - REDISEÑO DE ARQUITECTURA DE PRODUCTO

**Documento:** Product Architecture & User Flow Redesign
**Versión:** 1.0
**Fecha:** 2025-11-27
**Autor:** Senior Product Analyst
**Estado:** CRÍTICO - Requiere implementación inmediata

---

## RESUMEN EJECUTIVO

Este documento presenta el rediseño completo de la arquitectura de producto de Almanik PMS, basado en una auditoría exhaustiva que reveló **fragmentación severa** en la lógica del negocio, flujos de usuario rotos, y ausencia de diseño de producto coherente.

### Problema Central
El sistema actual fue construido **módulo por módulo** sin un diseño de producto integral. Resultado: el usuario no sabe qué hacer, dónde ver la información, ni cómo completar tareas básicas.

### Objetivo de este Rediseño
Crear un sistema donde un recepcionista nuevo pueda hacer check-in en **menos de 3 minutos** sin training, y donde cualquier usuario pueda responder "¿Quién está hospedado ahora?" en **5 segundos**.

---

## PARTE 1: MODELO MENTAL DEL NEGOCIO

### 1.1 Las 4 Entidades Fundamentales

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MODELO DE NEGOCIO                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   HUÉSPED ────────► RESERVA ────────► CAMA ────────► PAGO          │
│   (¿Quién?)         (¿Cuándo?)        (¿Dónde?)      (¿Cuánto?)    │
│                                                                     │
│   Registrar         Crear/Confirmar   Asignar        Cobrar        │
│   Buscar            Check-in          Estado         Balance       │
│   Historial         Check-out         Limpieza       Recibo        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Estados del Ciclo de Vida de una Estancia

```
RESERVA CREADA ──► CONFIRMADA ──► CHECK-IN ──► HOSPEDADO ──► CHECK-OUT ──► COMPLETADO
      │                │              │            │              │            │
      ▼                ▼              ▼            ▼              ▼            ▼
   [pending]      [confirmed]   [checked_in]  [active]     [checking_out] [completed]
      │                │              │            │              │            │
      │                │              │            │              │            │
   Cama:           Cama:          Cama:        Cama:          Cama:        Cama:
   reserved        reserved       occupied     occupied       occupied     dirty→clean
```

### 1.3 La Pregunta Clave que el Sistema DEBE Responder

| Pregunta del Usuario | Respuesta del Sistema | Vista Actual | Vista Correcta |
|---------------------|----------------------|--------------|----------------|
| "¿Quién está hospedado?" | Lista de huéspedes activos | **NO EXISTE** | Dashboard principal |
| "¿Esta cama está libre?" | Estado + reservas futuras | Parcial (solo estado) | Vista de cama con calendario |
| "¿Cuánto debe este huésped?" | Balance de cuenta | **NO EXISTE** | Perfil de huésped |
| "¿Qué check-outs tengo hoy?" | Lista con balances | Existe pero incompleto | Panel operativo |

---

## PARTE 2: FLUJOS DE USUARIO CORRECTOS

### 2.1 FLUJO: Check-in de Huésped con Reserva

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FLUJO: CHECK-IN CON RESERVA (Target: 2 minutos)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PASO 1: IDENTIFICAR (30 seg)                                               │
│  ┌─────────────────────────────────────────┐                                │
│  │ [Campo de búsqueda universal]           │                                │
│  │                                         │                                │
│  │  🔍 Buscar: "Juan" o "ALM-2024..."     │                                │
│  │                                         │                                │
│  │  Resultados:                            │                                │
│  │  ┌─────────────────────────────────┐   │                                │
│  │  │ ✓ Juan Pérez                    │   │                                │
│  │  │   Reserva: ALM-20251127-1430    │   │                                │
│  │  │   Check-in: Hoy | Cama: 1-A     │   │                                │
│  │  │   Total: $150 | Pagado: $50     │   │                                │
│  │  │   [HACER CHECK-IN]              │   │                                │
│  │  └─────────────────────────────────┘   │                                │
│  └─────────────────────────────────────────┘                                │
│                                                                             │
│  PASO 2: VERIFICAR Y CONFIRMAR (30 seg)                                     │
│  ┌─────────────────────────────────────────┐                                │
│  │ CONFIRMAR CHECK-IN                      │                                │
│  │                                         │                                │
│  │ Huésped: Juan Pérez                     │                                │
│  │ Documento: 12345678                     │                                │
│  │ Cama: 1-A (Dormitorio Mixto)           │                                │
│  │ Noches: 3 (Nov 27 - Nov 30)            │                                │
│  │                                         │                                │
│  │ Balance:                                │                                │
│  │   Total: $150.00                        │                                │
│  │   Pagado: $50.00                        │                                │
│  │   Pendiente: $100.00                    │                                │
│  │                                         │                                │
│  │ Estado cama: ✓ LIMPIA                   │                                │
│  │                                         │                                │
│  │ [CANCELAR]  [CONFIRMAR CHECK-IN ✓]     │                                │
│  └─────────────────────────────────────────┘                                │
│                                                                             │
│  PASO 3: RESULTADO (automático)                                             │
│  ┌─────────────────────────────────────────┐                                │
│  │ ✅ CHECK-IN EXITOSO                     │                                │
│  │                                         │                                │
│  │ Juan Pérez está ahora en Cama 1-A      │                                │
│  │ Check-out: Noviembre 30, 2025          │                                │
│  │                                         │                                │
│  │ Pendiente por cobrar: $100.00          │                                │
│  │                                         │                                │
│  │ [IMPRIMIR COMPROBANTE] [CERRAR]        │                                │
│  └─────────────────────────────────────────┘                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 FLUJO: Check-in Walk-in (Sin Reserva)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FLUJO: WALK-IN / CHECK-IN SIN RESERVA (Target: 4 minutos)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PASO 1: VER DISPONIBILIDAD (15 seg)                                        │
│  ┌─────────────────────────────────────────┐                                │
│  │ CAMAS DISPONIBLES HOY                   │                                │
│  │                                         │                                │
│  │ Dormitorio Mixto:                       │                                │
│  │   [1-A ✓] [1-B ✓] [1-C ✗] [1-D ✓]     │ ✓ = disponible                 │
│  │   $25/noche                             │ ✗ = ocupada                    │
│  │                                         │                                │
│  │ Dormitorio Femenino:                    │                                │
│  │   [2-A ✓] [2-B ✗] [2-C ✓] [2-D ✓]     │                                │
│  │   $25/noche                             │                                │
│  │                                         │                                │
│  │ Privada:                                │                                │
│  │   [P-1 ✓] $80/noche                    │                                │
│  │   [P-2 ✗] ocupada hasta Nov 29         │                                │
│  │                                         │                                │
│  │ Click en cama para seleccionar →        │                                │
│  └─────────────────────────────────────────┘                                │
│                                                                             │
│  PASO 2: REGISTRAR HUÉSPED (2 min)                                          │
│  ┌─────────────────────────────────────────┐                                │
│  │ NUEVO HUÉSPED - Cama 1-A seleccionada   │                                │
│  │                                         │                                │
│  │ Nombre*: [___________________]          │                                │
│  │ Documento*: [_______________]           │                                │
│  │ Email: [_____________________]          │                                │
│  │ Teléfono: [_________________]           │                                │
│  │ Nacionalidad: [Colombia ▼]              │                                │
│  │                                         │                                │
│  │ Check-in*: [27/11/2025]                 │                                │
│  │ Check-out*: [30/11/2025]                │                                │
│  │ Noches: 3                               │                                │
│  │                                         │                                │
│  │ Total: $75.00 ($25 x 3 noches)         │                                │
│  │                                         │                                │
│  │ [CANCELAR]  [REGISTRAR Y CHECK-IN ✓]   │                                │
│  └─────────────────────────────────────────┘                                │
│                                                                             │
│  PASO 3: COBRO INICIAL (1 min)                                              │
│  ┌─────────────────────────────────────────┐                                │
│  │ PAGO - Juan Pérez                       │                                │
│  │                                         │                                │
│  │ Total estancia: $75.00                  │                                │
│  │                                         │                                │
│  │ ¿Cobrar ahora?                          │                                │
│  │   ○ Total ($75.00)                      │                                │
│  │   ○ Primera noche ($25.00)              │                                │
│  │   ○ Otro monto: [____]                  │                                │
│  │   ○ No cobrar ahora                     │                                │
│  │                                         │                                │
│  │ Método: [Efectivo ▼]                    │                                │
│  │                                         │                                │
│  │ [ATRÁS]  [COMPLETAR CHECK-IN ✓]        │                                │
│  └─────────────────────────────────────────┘                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 FLUJO: Check-out

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FLUJO: CHECK-OUT (Target: 2 minutos)                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  INICIO: Dashboard muestra check-outs del día                               │
│  ┌─────────────────────────────────────────┐                                │
│  │ 🚪 CHECK-OUTS HOY (3)                   │                                │
│  │                                         │                                │
│  │ ┌─────────────────────────────────┐     │                                │
│  │ │ Juan Pérez | Cama 1-A          │     │                                │
│  │ │ Pendiente: $50.00 ⚠️            │     │                                │
│  │ │ [HACER CHECK-OUT]              │     │                                │
│  │ └─────────────────────────────────┘     │                                │
│  │                                         │                                │
│  │ ┌─────────────────────────────────┐     │                                │
│  │ │ María García | Cama 2-B        │     │                                │
│  │ │ Pendiente: $0.00 ✓             │     │                                │
│  │ │ [HACER CHECK-OUT]              │     │                                │
│  │ └─────────────────────────────────┘     │                                │
│  └─────────────────────────────────────────┘                                │
│                                                                             │
│  PASO 1: REVISAR CUENTA                                                     │
│  ┌─────────────────────────────────────────┐                                │
│  │ CHECK-OUT: Juan Pérez                   │                                │
│  │ Cama: 1-A | Noches: 3                   │                                │
│  │                                         │                                │
│  │ CUENTA:                                 │                                │
│  │ ├─ Alojamiento (3 noches)    $75.00    │                                │
│  │ ├─ Cerveza x2                 $8.00    │                                │
│  │ ├─ Lavandería                 $5.00    │                                │
│  │ ├─ TOTAL CARGOS             $88.00    │                                │
│  │ │                                       │                                │
│  │ ├─ Pago efectivo (Nov 27)   -$25.00    │                                │
│  │ ├─ Pago tarjeta (Nov 28)    -$13.00    │                                │
│  │ ├─ TOTAL PAGADO             -$38.00    │                                │
│  │ │                                       │                                │
│  │ └─ BALANCE PENDIENTE         $50.00 ⚠️ │                                │
│  │                                         │                                │
│  │ [AGREGAR CARGO] [AGREGAR PAGO]         │                                │
│  │                                         │                                │
│  │ [CANCELAR]  [COBRAR Y CHECK-OUT →]     │                                │
│  └─────────────────────────────────────────┘                                │
│                                                                             │
│  PASO 2: COBRAR PENDIENTE                                                   │
│  ┌─────────────────────────────────────────┐                                │
│  │ COBRAR: $50.00                          │                                │
│  │                                         │                                │
│  │ Método: [Efectivo ▼]                    │                                │
│  │                                         │                                │
│  │ □ Imprimir recibo                       │                                │
│  │ □ Enviar recibo por email               │                                │
│  │                                         │                                │
│  │ [ATRÁS]  [COMPLETAR CHECK-OUT ✓]       │                                │
│  └─────────────────────────────────────────┘                                │
│                                                                             │
│  RESULTADO:                                                                 │
│  - Booking marcado como 'completed'                                         │
│  - Cama marcada como 'dirty' (pendiente limpieza)                          │
│  - Transacción de pago registrada                                           │
│  - Notificación a limpieza (si está configurado)                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PARTE 3: REDISEÑO DEL DASHBOARD

### 3.1 Dashboard Principal - Vista del Día

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ALMANIK PMS                                    👤 María (Admin) | 🔔 | ⚙️  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📊 RESUMEN DEL DÍA - Miércoles 27 Nov 2025                                │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐               │
│  │ OCUPACIÓN  │ │ CHECK-INS  │ │ CHECK-OUTS │ │ INGRESOS   │               │
│  │    68%     │ │     3      │ │     2      │ │  $340.00   │               │
│  │  17/25     │ │   hoy      │ │   hoy      │ │   hoy      │               │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘               │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  🔍 BÚSQUEDA RÁPIDA                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Buscar huésped, reserva, o número de cama...                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
├──────────────────────────────────┬──────────────────────────────────────────┤
│                                  │                                          │
│  🏨 HUÉSPEDES ACTUALES (17)      │  📋 OPERACIONES DEL DÍA                  │
│                                  │                                          │
│  ┌────────────────────────────┐  │  CHECK-INS ESPERADOS (3)                 │
│  │ Juan Pérez                 │  │  ┌────────────────────────────────────┐  │
│  │ Cama: 1-A | Check-out: Hoy │  │  │ ⏰ Pedro López                     │  │
│  │ Balance: $50 ⚠️            │  │  │    Cama 1-D | Reserva confirmada   │  │
│  │ [Ver] [Check-out]          │  │  │    [HACER CHECK-IN]                │  │
│  └────────────────────────────┘  │  └────────────────────────────────────┘  │
│                                  │  ┌────────────────────────────────────┐  │
│  ┌────────────────────────────┐  │  │ ⏰ Ana Martínez                    │  │
│  │ María García               │  │  │    Cama 2-A | Reserva confirmada   │  │
│  │ Cama: 2-B | Check-out: Nov29│  │  │    [HACER CHECK-IN]                │  │
│  │ Balance: $0 ✓              │  │  └────────────────────────────────────┘  │
│  │ [Ver]                      │  │                                          │
│  └────────────────────────────┘  │  CHECK-OUTS PENDIENTES (2)               │
│                                  │  ┌────────────────────────────────────┐  │
│  ┌────────────────────────────┐  │  │ 🚪 Juan Pérez | Cama 1-A          │  │
│  │ Carlos Ruiz                │  │  │    Debe: $50.00                    │  │
│  │ Cama: P-1 | Check-out: Dic2│  │  │    [HACER CHECK-OUT]               │  │
│  │ Balance: $0 ✓              │  │  └────────────────────────────────────┘  │
│  │ [Ver]                      │  │  ┌────────────────────────────────────┐  │
│  └────────────────────────────┘  │  │ 🚪 María García | Cama 2-B        │  │
│                                  │  │    Pagado ✓                        │  │
│  [Ver todos →]                   │  │    [HACER CHECK-OUT]               │  │
│                                  │  └────────────────────────────────────┘  │
│                                  │                                          │
│                                  │  [+ NUEVO CHECK-IN WALK-IN]             │
│                                  │                                          │
├──────────────────────────────────┴──────────────────────────────────────────┤
│                                                                             │
│  🛏️ ESTADO DE CAMAS                                                        │
│                                                                             │
│  Dormitorio Mixto          Dormitorio Femenino       Privadas              │
│  ┌────┬────┬────┬────┐    ┌────┬────┬────┬────┐    ┌────┬────┐            │
│  │1-A │1-B │1-C │1-D │    │2-A │2-B │2-C │2-D │    │P-1 │P-2 │            │
│  │ 🔴 │ 🟢 │ 🔴 │ 🟡 │    │ 🟡 │ 🔴 │ 🟢 │ 🟢 │    │ 🔴 │ 🟢 │            │
│  │Juan│    │Ana │res.│    │res.│Mar.│    │    │    │Carl│    │            │
│  └────┴────┴────┴────┘    └────┴────┴────┴────┘    └────┴────┘            │
│                                                                             │
│  🔴 Ocupada (8)  🟢 Disponible (6)  🟡 Reservada (2)  🟠 Limpieza (1)      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Leyenda de Estados de Cama

| Color | Estado | Significado | Acción disponible |
|-------|--------|-------------|-------------------|
| 🔴 Rojo | `occupied` | Huésped actualmente hospedado | Check-out, Ver perfil |
| 🟢 Verde | `clean` | Disponible para check-in | Reservar, Check-in directo |
| 🟡 Amarillo | `reserved` | Reserva confirmada (no llegó aún) | Ver reserva, Check-in |
| 🟠 Naranja | `dirty` | Necesita limpieza | Marcar como limpia |
| ⚫ Gris | `maintenance` | En mantenimiento | Ver razón, Habilitar |

---

## PARTE 4: MODELO DE DATOS CORREGIDO

### 4.1 Esquema de Base de Datos Unificado

```sql
-- =============================================
-- TABLA: guests (Huéspedes)
-- Información personal del huésped
-- =============================================
CREATE TABLE guests (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    document VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    nationality VARCHAR(100) DEFAULT 'Colombia',
    notes TEXT,
    is_blacklisted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLA: beds (Camas)
-- Estado actual de cada cama
-- =============================================
CREATE TABLE beds (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,        -- "1-A", "P-1"
    room VARCHAR(100) NOT NULL,              -- "Dormitorio Mixto", "Privada 1"
    bed_type VARCHAR(20) DEFAULT 'dorm',     -- dorm, private
    price DECIMAL(10,2) NOT NULL,

    -- Estado actual (snapshot)
    status VARCHAR(20) DEFAULT 'clean',      -- clean, occupied, reserved, dirty, maintenance
    current_booking_id INTEGER,              -- FK a booking activo (si ocupada)

    -- Metadata
    maintenance_reason TEXT,
    last_cleaned_at TIMESTAMP,
    last_cleaned_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (current_booking_id) REFERENCES bookings(id)
);

-- =============================================
-- TABLA: bookings (Reservas/Estancias)
-- TABLA CENTRAL - Todo pasa por aquí
-- =============================================
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    confirmation_code VARCHAR(30) UNIQUE NOT NULL,  -- ALM-20251127-143022

    -- Relaciones
    guest_id INTEGER NOT NULL,
    bed_id INTEGER NOT NULL,

    -- Fechas
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    nights INTEGER NOT NULL,

    -- Financiero
    price_per_night DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    balance DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,

    -- Estado del ciclo de vida
    status VARCHAR(20) DEFAULT 'pending',
    -- pending     → Reserva creada, esperando confirmación
    -- confirmed   → Confirmada, esperando llegada
    -- checked_in  → Huésped llegó, actualmente hospedado
    -- checked_out → Check-out realizado
    -- cancelled   → Cancelada
    -- no_show     → No se presentó

    -- Timestamps del ciclo
    confirmed_at TIMESTAMP,
    checked_in_at TIMESTAMP,
    checked_out_at TIMESTAMP,
    cancelled_at TIMESTAMP,

    -- Metadata
    source VARCHAR(20) DEFAULT 'walkin',     -- walkin, phone, email, booking_com, airbnb
    created_by INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (guest_id) REFERENCES guests(id),
    FOREIGN KEY (bed_id) REFERENCES beds(id)
);

-- =============================================
-- TABLA: transactions (Movimientos financieros)
-- Cada pago o cargo
-- =============================================
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL,

    type VARCHAR(20) NOT NULL,               -- charge, payment, refund
    category VARCHAR(50),                    -- room, product, service, deposit
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,

    payment_method VARCHAR(20),              -- cash, card, transfer (solo para payments)

    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

-- =============================================
-- ÍNDICES CRÍTICOS
-- =============================================
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_dates ON bookings(check_in, check_out);
CREATE INDEX idx_bookings_guest ON bookings(guest_id);
CREATE INDEX idx_bookings_bed ON bookings(bed_id);
CREATE INDEX idx_beds_status ON beds(status);
CREATE INDEX idx_transactions_booking ON transactions(booking_id);

-- =============================================
-- VISTA: current_occupancy (Ocupación actual)
-- La respuesta a "¿Quién está hospedado?"
-- =============================================
CREATE VIEW current_occupancy AS
SELECT
    b.id as booking_id,
    b.confirmation_code,
    g.id as guest_id,
    g.name as guest_name,
    g.document as guest_document,
    g.phone as guest_phone,
    bd.id as bed_id,
    bd.name as bed_name,
    bd.room as room_name,
    b.check_in,
    b.check_out,
    b.nights,
    b.total_amount,
    b.amount_paid,
    b.balance,
    b.checked_in_at
FROM bookings b
JOIN guests g ON b.guest_id = g.id
JOIN beds bd ON b.bed_id = bd.id
WHERE b.status = 'checked_in'
ORDER BY bd.room, bd.name;

-- =============================================
-- VISTA: todays_operations (Operaciones del día)
-- Check-ins y check-outs programados
-- =============================================
CREATE VIEW todays_operations AS
SELECT
    'checkin' as operation_type,
    b.id as booking_id,
    b.confirmation_code,
    g.name as guest_name,
    bd.name as bed_name,
    bd.room as room_name,
    b.check_in as operation_date,
    b.balance as amount_pending,
    b.status
FROM bookings b
JOIN guests g ON b.guest_id = g.id
JOIN beds bd ON b.bed_id = bd.id
WHERE b.check_in = CURRENT_DATE
  AND b.status IN ('pending', 'confirmed')

UNION ALL

SELECT
    'checkout' as operation_type,
    b.id as booking_id,
    b.confirmation_code,
    g.name as guest_name,
    bd.name as bed_name,
    bd.room as room_name,
    b.check_out as operation_date,
    b.balance as amount_pending,
    b.status
FROM bookings b
JOIN guests g ON b.guest_id = g.id
JOIN beds bd ON b.bed_id = bd.id
WHERE b.check_out = CURRENT_DATE
  AND b.status = 'checked_in'

ORDER BY operation_type, operation_date;
```

### 4.2 Reglas de Negocio en Base de Datos

```sql
-- =============================================
-- TRIGGER: Actualizar estado de cama en check-in
-- =============================================
CREATE OR REPLACE FUNCTION update_bed_on_checkin()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'checked_in' AND OLD.status != 'checked_in' THEN
        UPDATE beds
        SET status = 'occupied',
            current_booking_id = NEW.id
        WHERE id = NEW.bed_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bed_checkin
AFTER UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION update_bed_on_checkin();

-- =============================================
-- TRIGGER: Actualizar estado de cama en check-out
-- =============================================
CREATE OR REPLACE FUNCTION update_bed_on_checkout()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'checked_out' AND OLD.status = 'checked_in' THEN
        UPDATE beds
        SET status = 'dirty',
            current_booking_id = NULL
        WHERE id = NEW.bed_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bed_checkout
AFTER UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION update_bed_on_checkout();

-- =============================================
-- TRIGGER: Actualizar amount_paid en booking
-- =============================================
CREATE OR REPLACE FUNCTION update_booking_payments()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.type = 'payment' THEN
        UPDATE bookings
        SET amount_paid = amount_paid + NEW.amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.booking_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_payments
AFTER INSERT ON transactions
FOR EACH ROW EXECUTE FUNCTION update_booking_payments();
```

---

## PARTE 5: API ENDPOINTS UNIFICADOS

### 5.1 Endpoints Core

```
OPERACIONES DE CHECK-IN/CHECK-OUT
=================================

POST   /api/bookings                    → Crear reserva
GET    /api/bookings                    → Listar (con filtros)
GET    /api/bookings/:id                → Detalle de reserva
PUT    /api/bookings/:id                → Actualizar reserva
DELETE /api/bookings/:id                → Cancelar reserva

POST   /api/bookings/:id/checkin        → Hacer check-in
POST   /api/bookings/:id/checkout       → Hacer check-out
POST   /api/bookings/:id/payment        → Registrar pago

DASHBOARD Y VISTAS
==================

GET    /api/dashboard/today             → Resumen del día
GET    /api/dashboard/occupancy         → Ocupación actual (quién está hospedado)
GET    /api/dashboard/arrivals          → Check-ins esperados hoy
GET    /api/dashboard/departures        → Check-outs programados hoy

BÚSQUEDA UNIVERSAL
==================

GET    /api/search?q=texto              → Buscar huésped, reserva, o cama

GESTIÓN DE CAMAS
================

GET    /api/beds                        → Estado actual de todas las camas
GET    /api/beds/:id                    → Detalle de cama con calendario
PUT    /api/beds/:id/status             → Cambiar estado (clean, dirty, maintenance)
GET    /api/beds/availability           → Disponibilidad para fechas
```

### 5.2 Ejemplo: Endpoint de Check-in

```javascript
/**
 * POST /api/bookings/:id/checkin
 *
 * Proceso de check-in completo:
 * 1. Validar que booking existe y está en estado correcto
 * 2. Validar que cama está disponible (clean o reserved para este booking)
 * 3. Actualizar booking → checked_in
 * 4. Actualizar cama → occupied
 * 5. Registrar pago inicial si se proporciona
 * 6. Registrar en activity_log
 * 7. Retornar confirmación con detalles
 */
router.post('/:id/checkin', async (req, res) => {
    const { id } = req.params;
    const { payment_amount, payment_method } = req.body;

    try {
        // 1. Obtener booking con validaciones
        const booking = await db.get(`
            SELECT b.*, g.name as guest_name, bd.name as bed_name, bd.status as bed_status
            FROM bookings b
            JOIN guests g ON b.guest_id = g.id
            JOIN beds bd ON b.bed_id = bd.id
            WHERE b.id = $1
        `, [id]);

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        if (!['pending', 'confirmed'].includes(booking.status)) {
            return res.status(400).json({
                error: `Cannot check-in booking with status: ${booking.status}`
            });
        }

        // 2. Validar estado de cama
        if (!['clean', 'reserved'].includes(booking.bed_status)) {
            return res.status(400).json({
                error: `Bed is not ready: ${booking.bed_status}`
            });
        }

        // 3. Actualizar booking
        await db.run(`
            UPDATE bookings
            SET status = 'checked_in',
                checked_in_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [id]);

        // 4. Actualizar cama (trigger lo hace automáticamente, pero por seguridad)
        await db.run(`
            UPDATE beds
            SET status = 'occupied',
                current_booking_id = $1
            WHERE id = $2
        `, [id, booking.bed_id]);

        // 5. Registrar pago si se proporciona
        if (payment_amount && payment_amount > 0) {
            await db.run(`
                INSERT INTO transactions (booking_id, type, category, description, amount, payment_method)
                VALUES ($1, 'payment', 'room', 'Check-in payment', $2, $3)
            `, [id, payment_amount, payment_method || 'cash']);
        }

        // 6. Log de actividad
        await db.run(`
            INSERT INTO activity_log (action_type, module, description, entity_type, entity_id)
            VALUES ('checkin', 'bookings', $1, 'booking', $2)
        `, [`Check-in: ${booking.guest_name} → ${booking.bed_name}`, id]);

        // 7. Retornar resultado
        const result = await db.get(`
            SELECT b.*, g.name as guest_name, bd.name as bed_name
            FROM bookings b
            JOIN guests g ON b.guest_id = g.id
            JOIN beds bd ON b.bed_id = bd.id
            WHERE b.id = $1
        `, [id]);

        res.json({
            success: true,
            message: 'Check-in completed successfully',
            booking: result
        });

    } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({ error: 'Check-in failed' });
    }
});
```

---

## PARTE 6: PLAN DE IMPLEMENTACIÓN

### 6.1 Fase 1: Fundamentos (Crítico - 3 días)

```
DÍA 1: Base de Datos
├── [ ] Crear migración para nuevo esquema
├── [ ] Crear vistas SQL (current_occupancy, todays_operations)
├── [ ] Migrar datos existentes al nuevo esquema
└── [ ] Validar integridad de datos

DÍA 2: API Core
├── [ ] Implementar endpoint /api/bookings/:id/checkin
├── [ ] Implementar endpoint /api/bookings/:id/checkout
├── [ ] Implementar endpoint /api/dashboard/occupancy
├── [ ] Implementar endpoint /api/search
└── [ ] Eliminar endpoints duplicados

DÍA 3: Dashboard Mínimo
├── [ ] Crear componente "Huéspedes Actuales"
├── [ ] Crear componente "Check-ins del Día"
├── [ ] Crear componente "Check-outs del Día"
├── [ ] Integrar búsqueda universal
└── [ ] Probar flujo completo check-in → check-out
```

### 6.2 Fase 2: Flujos Completos (5 días)

```
DÍA 4-5: Flujo de Check-in
├── [ ] Modal de check-in con reserva
├── [ ] Flujo walk-in completo
├── [ ] Validaciones en frontend
├── [ ] Manejo de errores
└── [ ] Confirmación visual

DÍA 6-7: Flujo de Check-out
├── [ ] Modal de check-out con cuenta
├── [ ] Agregar cargos adicionales
├── [ ] Procesar pago final
├── [ ] Marcar cama como dirty
└── [ ] Generar recibo

DÍA 8: Vista de Camas Mejorada
├── [ ] Grid de camas con colores correctos
├── [ ] Click → ver detalle/calendario
├── [ ] Acciones contextuales por estado
└── [ ] Integración con reservas
```

### 6.3 Fase 3: Pulido (2 días)

```
DÍA 9: UX y Feedback
├── [ ] Notificaciones de éxito/error
├── [ ] Loading states
├── [ ] Confirmaciones antes de acciones críticas
├── [ ] Keyboard shortcuts

DÍA 10: Testing y Documentación
├── [ ] Pruebas de flujos completos
├── [ ] Documentar nuevos endpoints
├── [ ] Actualizar manual de usuario
└── [ ] Capacitación básica
```

---

## PARTE 7: MÉTRICAS DE ÉXITO

### 7.1 Métricas Técnicas

| Métrica | Actual | Objetivo | Cómo medir |
|---------|--------|----------|------------|
| Tiempo de check-in | ~8-10 min | < 3 min | Cronómetro en pruebas |
| Clicks para check-in | 10+ | 3-4 | Conteo manual |
| Errores de estado cama | Frecuentes | 0 | Logs de errores |
| Tiempo para ver ocupación | N/A (no existe) | < 5 seg | Cronómetro |

### 7.2 Métricas de Usabilidad

| Pregunta | Actual | Objetivo |
|----------|--------|----------|
| "¿Puedo hacer check-in sin ayuda?" | No | Sí |
| "¿Sé quién está hospedado?" | No claro | Inmediato |
| "¿Entiendo los estados de las camas?" | Confuso | Obvio (colores) |
| "¿Sé cuánto debe cada huésped?" | No visible | En dashboard |

---

## PARTE 8: CÓDIGO A ELIMINAR

### 8.1 Funciones Duplicadas en Frontend (index.html)

```javascript
// ELIMINAR - Funciones duplicadas/confusas:
- startCheckin()           // línea 5116
- processCheckin()         // línea 5162
- selectGuestForCheckin()  // línea 3494, 5109 (duplicada!)
- showGuestSelectionForCheckin() // línea 5133
- pendingCheckinBedId      // variable global confusa

// REEMPLAZAR CON:
- handleCheckin(bookingId)  // Un solo punto de entrada
- handleCheckout(bookingId) // Un solo punto de entrada
```

### 8.2 Campos de Base de Datos a Deprecar

```sql
-- En tabla beds, ELIMINAR:
- guest_id                  -- Usar current_booking_id en su lugar
- reserved_for_guest_id     -- Redundante con bookings
- reserved_until            -- Redundante con bookings.check_out

-- MANTENER solo:
- current_booking_id        -- FK a booking activo
- status                    -- Estado actual
```

---

## CONCLUSIÓN

Este rediseño transforma Almanik PMS de un conjunto de módulos desconectados a un **sistema coherente centrado en el flujo del huésped**.

La clave es entender que todo gira alrededor de la entidad **BOOKING**:
- Un booking conecta huésped + cama + fechas + dinero
- El estado del booking determina el estado de la cama
- Todas las operaciones son transiciones de estado del booking

Con este diseño, cualquier recepcionista nuevo puede:
1. Ver quién está hospedado (5 segundos)
2. Hacer un check-in (3 minutos)
3. Hacer un check-out (2 minutos)
4. Saber cuánto debe cada huésped (1 click)

**Sin training. Sin confusión. Sin errores.**

---

*Documento preparado por Senior Product Analyst*
*Fecha: 2025-11-27*
*Para: Equipo de Desarrollo Almanik PMS*
