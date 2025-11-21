# 📋 PLAN DE DESARROLLO ALMANIK PMS - ACTUALIZADO 2025-11-19

**Status:** Post-Auditoría Senior Architect + Migración Neon
**Baseline:** Sistema en producción con fundamentos sólidos pero gaps críticos
**Objetivo:** Sistema 100% funcional y robusto para operación hotelera profesional

---

## 🎯 RESUMEN EJECUTIVO

**Situación Actual:** 6.2/10 - Funcional pero incompleto
**Meta:** 10/10 - Sistema completo y robusto con database robusta
**Tiempo Total Estimado:** 8-11 semanas (40-55 días de desarrollo)

### Fases del Proyecto:

| Fase | Descripción | Tiempo | Prioridad |
|------|-------------|--------|-----------|
| **FASE 0** | **Migración a Neon + Schema Completo** | **1 día** | **CRÍTICA** |
| **FASE 1** | **Bugs Críticos + Reservas + Caja** | **3-4 semanas** | **CRÍTICA** |
| **FASE 2** | **Mejoras Operacionales** | **2-3 semanas** | **ALTA** |
| **FASE 3** | **Features Avanzadas** | **2-3 semanas** | **MEDIA** |

### Módulos por Estado:

| Módulo | Estado Actual | Meta | Prioridad |
|--------|---------------|------|-----------|
| **Camas** | 85% ✅ | 100% | BAJA |
| **Huéspedes** | 80% ✅ | 100% | ALTA |
| **Dashboard** | 65% ⚠️ | 100% | MEDIA |
| **Ventas/POS** | 70% ⚠️ | 100% | MEDIA-ALTA |
| **Reportes** | 75% ✅ | 100% | MEDIA |
| **Paseos** | 65% ⚠️ | 100% | BAJA-MEDIA |
| **Personal** | 60% ⚠️ | 100% | MEDIA |
| **Caja** | 10% ❌ | 100% | **CRÍTICA** |
| **Reservas** | 0% ❌ | 100% | **CRÍTICA** |
| **Database** | Supabase (9 tablas) | Neon (20 tablas) | **CRÍTICA** |

---

## 🗄️ FASE 0: MIGRACIÓN A NEON + DATABASE COMPLETA (1 DÍA) 🔥

### ⚠️ PREREQUISITO CRÍTICO - EJECUTAR PRIMERO

**Objetivo:** Migrar de Supabase a Neon PostgreSQL con schema completo de 20 tablas.

**Por qué hacerlo primero:**
- ✅ Neon tiene integración nativa con Vercel (mejor que Supabase)
- ✅ True serverless: escala a 0, más económico
- ✅ Schema completo incluye las 11 tablas nuevas necesarias (products, cashbox, staff, etc)
- ✅ Database branching (dev/staging/prod como Git)
- ✅ PostgreSQL 16 (más reciente)
- ✅ Fast cold starts (<1s vs 3-5s)

**Documentación completa:** `docs/03-deployment/NEON-MIGRATION-PLAN.md`

---

### PASO 0.1: Setup Neon (30 minutos)

#### Tareas:
- [ ] Crear cuenta en https://neon.tech (sign up con GitHub)
- [ ] Crear nuevo proyecto: **almanik-pms-production**
  - Región: US East (Ohio) - cerca de Vercel Edge
  - PostgreSQL: 16 (latest)
  - Plan: Free tier (suficiente para empezar)
- [ ] Copiar connection strings (pooled y direct)
- [ ] Guardar credenciales de forma segura

**Expected output:**
```
Pooled connection (para Vercel):
postgres://[user]:[pass]@[host]/main?sslmode=require

Direct connection (para admin):
postgres://[user]:[pass]@[host]/main?sslmode=require
```

---

### PASO 0.2: Crear Schema Completo en Neon (2-3 horas)

#### Ejecutar Schema SQL:

**Archivo:** `database/schemas/neon-complete-schema.sql` (ya creado - 21 KB)

**Opción A: Neon SQL Editor (Web)**
```bash
1. Ir a Neon Dashboard → SQL Editor
2. Copiar contenido de neon-complete-schema.sql
3. Click "Run"
4. Verificar: "✅ 20 tables created"
```

**Opción B: psql desde terminal**
```bash
psql "postgres://[user]:[pass]@[host]/main?sslmode=require" \
  -f database/schemas/neon-complete-schema.sql
```

#### Schema incluye:

**Tablas Existentes (9 - Mejoradas):**
1. users - Sistema de auth
2. guests - Huéspedes + campos legales (nationality, emergency_contact, blacklist)
3. beds - Camas + maintenance mode
4. bookings - Reservas + confirmation_code, source, status avanzado
5. transactions - Transacciones financieras
6. tours - Tours + capacity, categories
7. tour_clicks - Tracking
8. tour_commissions - Comisiones + status paid/pending
9. activity_log - Log de actividades

**Tablas NUEVAS (11):**
10. **products** - Productos POS con stock, SKU, barcode
11. **sale_items** - Items de ventas (junction table)
12. **staff** - Personal del hostal
13. **attendance** - Asistencia de staff (clock in/out)
14. **tasks** - Tareas asignadas
15. **cashbox_shifts** - Turnos de caja
16. **cashbox_movements** - Movimientos de caja
17. **guest_groups** - Grupos de huéspedes
18. **guest_group_members** - Miembros de grupos
19. **bed_blocks** - Bloqueos temporales de camas
20. **reviews** - Reviews de tours

**Plus:**
- ✅ Todos los índices de performance
- ✅ Foreign keys con CASCADE
- ✅ Triggers de updated_at automáticos
- ✅ Seed data (6 guests, 27 beds, 10 products, 4 staff)

#### Verificar creación:

```sql
-- Contar tablas
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- Debe retornar: 20

-- Listar todas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

---

### PASO 0.3: Migrar Datos de Supabase (2-3 horas)

#### Backup de Supabase:

**Opción A: pg_dump (Recomendado)**
```bash
# Exportar solo datos (sin schema)
pg_dump "postgresql://postgres.lporxeeojhszfldluprv:UYseBroWcG1sf3J3@aws-1-us-east-2.pooler.supabase.com:5432/postgres" \
  --data-only \
  --table=guests \
  --table=beds \
  --table=bookings \
  --table=transactions \
  --table=users \
  --table=tours \
  --table=tour_clicks \
  --table=tour_commissions \
  --table=activity_log \
  > backup-supabase-data.sql
```

**Opción B: Manual por tabla (si pg_dump falla)**
```sql
-- Conectar a Supabase y ejecutar COPY para cada tabla
COPY guests TO '/tmp/guests.csv' WITH CSV HEADER;
COPY beds TO '/tmp/beds.csv' WITH CSV HEADER;
-- etc...
```

#### Importar a Neon:

```bash
# Importar data
psql "postgres://[neon-user]:[password]@[neon-host]/main?sslmode=require" \
  -f backup-supabase-data.sql
```

#### Resetear Sequences (IMPORTANTE):

Después de importar, resetear sequences para que SERIAL funcione:

```sql
-- Ejecutar en Neon
SELECT setval('guests_id_seq', (SELECT MAX(id) FROM guests));
SELECT setval('beds_id_seq', (SELECT MAX(id) FROM beds));
SELECT setval('bookings_id_seq', (SELECT MAX(id) FROM bookings));
SELECT setval('transactions_id_seq', (SELECT MAX(id) FROM transactions));
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('tours_id_seq', (SELECT MAX(id) FROM tours));
SELECT setval('tour_clicks_id_seq', (SELECT MAX(id) FROM tour_clicks));
SELECT setval('tour_commissions_id_seq', (SELECT MAX(id) FROM tour_commissions));
SELECT setval('activity_log_id_seq', (SELECT MAX(id) FROM activity_log));

-- Para tablas nuevas (inician en 1)
SELECT setval('products_id_seq', 1, false);
SELECT setval('sale_items_id_seq', 1, false);
SELECT setval('staff_id_seq', 1, false);
-- etc...
```

#### Verificar migración:

```sql
-- Contar registros por tabla
SELECT 'guests' as table, COUNT(*) as count FROM guests
UNION ALL SELECT 'beds', COUNT(*) FROM beds
UNION ALL SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL SELECT 'users', COUNT(*) FROM users;

-- Comparar con conteo de Supabase
```

---

### PASO 0.4: Configurar Vercel + Neon (30 minutos)

#### Opción A: Neon Integration (Recomendado)

**Pasos:**
1. Ir a Vercel Dashboard → Proyecto almanik-pms
2. Settings → Integrations → Browse Marketplace
3. Buscar "Neon" → Install
4. Autorizar conexión con tu cuenta Neon
5. Seleccionar proyecto: `almanik-pms-production`
6. Seleccionar environments: Production, Preview
7. Confirmar

**Resultado:** Variables automáticas creadas:
- `DATABASE_URL`
- `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

#### Opción B: Manual

Si no usas integración:
1. Vercel Dashboard → Settings → Environment Variables
2. Agregar:
```
DATABASE_URL = postgres://[user]:[pass]@[neon-host]/main?sslmode=require
NODE_ENV = production
```

#### Código ya compatible:

**El código actual NO requiere cambios** porque:
- ✅ `db-adapter.js` ya usa `pg` Pool
- ✅ Ya maneja PostgreSQL en producción
- ✅ SSL ya configurado
- ✅ Lee `DATABASE_URL` de environment

**Opcional - Optimización para Neon:**

Si quieres optimizar, editar `server/db-adapter.js`:

```javascript
// Línea ~18-27
this.pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },

  // Neon optimizations
  max: 20, // Neon soporta más connections que Supabase
  idleTimeoutMillis: 10000, // Cerrar idle connections más rápido
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000, // 30 segundos max por query
});
```

---

### PASO 0.5: Deploy y Verificación (30 minutos)

#### Test local primero:

```bash
# Configurar .env.local con Neon
DATABASE_URL="postgres://[neon-connection]"
NODE_ENV=production

# Test
npm start

# Verificar console output:
# "✅ Connected to PostgreSQL (Production)"
# "✅ PostgreSQL tables initialized"
```

#### Deploy a Vercel:

```bash
# Commit cambios (si hiciste optimizaciones)
git add .
git commit -m "Migrate to Neon PostgreSQL with complete schema (20 tables)"
git push origin main

# Vercel auto-deploy

# O manual:
vercel --prod
```

#### Verificar en Producción:

**Tests funcionales:**
1. Ir a https://hostal-pms.vercel.app
2. Login: admin / admin123
3. Verificar módulos:
   - ✅ Dashboard carga
   - ✅ Camas se muestran (27 camas)
   - ✅ Huéspedes se listan (6 guests demo)
   - ✅ Crear nuevo guest → Save → Verificar guardado
   - ✅ POS muestra productos (10 productos demo)
   - ✅ Staff se lista (4 staff demo)
   - ✅ Reportes se generan

**Verificar logs:**
```
Vercel Dashboard → Deployments → Latest → Runtime Logs
Buscar: "Connected to PostgreSQL"
```

**Verificar en Neon Dashboard:**
- Neon Dashboard → Queries
- Ver queries ejecutándose
- Connections: ~5-10 activas
- Storage: ~10-50 MB usado

---

### PASO 0.6: Post-Migration Checklist

- [ ] **Backup Neon inmediato** (primer backup completo)
- [ ] **Documentar credentials** en lugar seguro (1Password, etc)
- [ ] **Mantener Supabase activo 1 semana** (rollback plan)
- [ ] **Monitorear performance** primeras 24 horas
- [ ] **Test stress** (crear 10 bookings, 20 ventas POS)
- [ ] **Verificar todas las tablas** tienen data esperada
- [ ] **Configurar Neon backups automáticos** (Settings → Backups)
- [ ] **Agregar a monitoring** (opcional: Datadog, Sentry)

---

### 💰 Costos Neon

**Free Tier (Actual):**
- Storage: 0.5 GB (suficiente para ~100K bookings)
- Compute: 191.9 hours/month
- **Costo: $0/mes**

**Scale Tier (Cuando crezcas):**
- Storage: 10 GB
- Compute: 750 hours/month
- **Costo: $19/mes + usage**

**Cuándo migrar a Scale:** Cuando >50 bookings/día o >5GB storage.

---

### ✅ Checklist Final Fase 0

- [ ] Cuenta Neon creada
- [ ] Proyecto Neon: almanik-pms-production creado
- [ ] Schema completo ejecutado (20 tablas)
- [ ] Datos migrados desde Supabase
- [ ] Sequences reseteadas
- [ ] Test local con Neon exitoso
- [ ] Vercel configurado con DATABASE_URL
- [ ] Deploy a producción exitoso
- [ ] Verificación funcional completa (todos los módulos)
- [ ] Backup Neon realizado
- [ ] Monitoring activo

**Tiempo total FASE 0:** 6-8 horas (1 día completo)

**Resultado:** Database production-ready con 20 tablas, lista para desarrollo de features.

---

## 🔥 FASE 1: CRÍTICO - Funcionalidad Core (3-4 SEMANAS)

### SPRINT 1: Critical Bug Fixes (5 días)

#### Día 1-2: Fix Check-in/Check-out System
**Problema:** URLs frontend/backend no coinciden. Sistema roto.

**Tareas:**
- [ ] Decidir URL estándar: usar `POST /api/checkin` y `POST /api/checkout/:bed_id`
- [ ] Actualizar frontend para coincidir con backend
- [ ] Agregar date pickers en check-in modal (check_in_date, check_out_date)
- [ ] Calcular total: (check_out - check_in) × bed.price
- [ ] Validar: check_out > check_in
- [ ] Mostrar confirmación visual de éxito
- [ ] Mostrar errores claros si falla
- [ ] Test completo: seleccionar bed → checkin → ver occupied → checkout

**Archivos a modificar:**
- `public/index.html` (líneas check-in/checkout functions)
- `server/server-simple.js` (endpoints /api/checkin y /api/checkout)

**Testing:**
- ✅ Check-in con fechas futuras
- ✅ Check-in walk-in (hoy)
- ✅ Check-out con balance
- ✅ Validaciones de fechas

---

#### Día 3-4: Implementar Vista de Balance
**Problema:** Balance API exists pero no hay UI. Staff no puede ver cuentas.

**Tareas:**
- [ ] Agregar botón "View Account" en occupied bed cards
- [ ] Crear modal `showAccountModal(bedId)`
- [ ] Llamar `GET /api/balance/${bedId}`
- [ ] Mostrar tabla de transactions (charges y payments)
- [ ] Calcular y mostrar balance total
- [ ] Botón "Add Charge" con form (description, amount)
- [ ] Botón "Add Payment" con form (amount, method)
- [ ] Integrar con checkout: mostrar balance antes de confirmar

**Archivos a modificar:**
- `public/index.html` (agregar modal y funciones)
- Usar endpoints existentes (ya están en backend)

**Testing:**
- ✅ Ver balance de guest ocupado
- ✅ Agregar cargo manual
- ✅ Agregar pago parcial
- ✅ Balance se actualiza correctamente
- ✅ Checkout muestra balance final

---

#### Día 5: Fix Reportes - Real POS Data
**Problema:** Reportes usan datos simulados para POS analytics.

**Tareas:**
- [ ] Eliminar array hardcoded de productos en `/api/reports`
- [ ] Query real:
  ```sql
  SELECT p.name, SUM(si.quantity) as total_sold,
         SUM(si.quantity * si.unit_price) as revenue
  FROM sale_items si
  JOIN products p ON si.product_id = p.id
  WHERE si.created_at BETWEEN ? AND ?
  GROUP BY p.id
  ORDER BY revenue DESC LIMIT 10
  ```
- [ ] Actualizar response de report type 'pos'
- [ ] Test: generar reporte POS y verificar datos reales

**Archivos a modificar:**
- `server/server-simple.js` (línea ~1355-1380, endpoint /api/reports)

---

### SPRINT 2: Sistema de Reservas (10 días)

#### Backend: Bookings API (3 días)

**Tabla nueva (opcional si bookings existe):**
```sql
-- Si bookings table ya existe, skip create
-- Verificar que tenga estos campos:
ALTER TABLE bookings ADD COLUMN confirmation_code VARCHAR(20) UNIQUE;
ALTER TABLE bookings ADD COLUMN source VARCHAR(50) DEFAULT 'walkin';
```

**Endpoints a crear:**

1. **POST /api/bookings** - Crear reserva futura
```javascript
// Body: { guest_id, bed_id, check_in, check_out, total, source }
// Response: { booking_id, confirmation_code }
// Validar: bed disponible en fechas, check_out > check_in
```

2. **GET /api/bookings** - Listar todas las reservas
```javascript
// Query params: ?status=, ?start_date=, ?end_date=
// Response: [{ id, guest_name, bed_name, dates, status, total }]
```

3. **GET /api/bookings/:id** - Detalle de una reserva
```javascript
// Response: { booking, guest, bed, transactions }
```

4. **PUT /api/bookings/:id** - Modificar reserva
```javascript
// Body: { check_in, check_out, bed_id }
// Validar: nueva bed disponible, fechas válidas
```

5. **DELETE /api/bookings/:id** - Cancelar reserva
```javascript
// Soft delete: UPDATE bookings SET status='cancelled'
// Solo permitir si status != 'checked_in'
```

6. **GET /api/bookings/calendar** - Datos para calendario
```javascript
// Query: ?year=2025&month=11
// Response: [{ date, bed_id, guest_name, status }]
```

**Tareas:**
- [ ] Crear 6 endpoints arriba
- [ ] Agregar validación overlap detection
- [ ] Generar confirmation_code automático (ALM + timestamp)
- [ ] Activity logging para todas las acciones
- [ ] Error handling robusto

**Testing:**
- ✅ Crear booking futuro
- ✅ Prevenir overlap (misma cama, fechas solapadas)
- ✅ Listar bookings con filtros
- ✅ Modificar fechas de booking
- ✅ Cancelar booking
- ✅ API calendar devuelve datos correctos

---

#### Frontend: Bookings UI (4 días)

**Nueva sección en navegación:**
- [ ] Agregar botón "📅 Reservas" en sidebar
- [ ] Crear `<div id="bookings-section">` en HTML

**Lista de Bookings:**
- [ ] Tabla con columnas: Confirmation Code, Guest, Bed, Check-in, Check-out, Nights, Total, Status, Actions
- [ ] Filtros: status (all, pending, confirmed, checked_in, cancelled), date range
- [ ] Color badges por status:
  - Pending: amarillo
  - Confirmed: azul
  - Checked_in: verde
  - Cancelled: rojo
  - Completed: gris
- [ ] Botones: View, Edit, Cancel, Check-in (si hoy)

**Modal Crear Booking:**
- [ ] Form campos:
  - Guest (dropdown con search o "Create new guest")
  - Bed (dropdown de camas disponibles en fechas)
  - Check-in date (date picker)
  - Check-out date (date picker)
  - Nights (auto-calculated)
  - Price per night (auto-filled from bed)
  - Total (auto-calculated)
  - Payment method (optional)
  - Advance payment amount (optional)
  - Notes
- [ ] Validaciones en tiempo real
- [ ] Check availability al seleccionar fechas
- [ ] Confirmation code generado y mostrado

**Modal Editar Booking:**
- [ ] Pre-cargar datos existentes
- [ ] Permitir cambiar: fechas, cama
- [ ] Re-calcular total si cambian fechas
- [ ] Show warning si bed no disponible en nuevas fechas

**Tareas:**
- [ ] Implementar UI completa
- [ ] Integrar con APIs del backend
- [ ] Validaciones frontend
- [ ] Error handling y mensajes claros

**Testing:**
- ✅ Crear booking para fecha futura
- ✅ Verificar cama se marca como reservada
- ✅ Editar fechas de booking existente
- ✅ Cancelar booking
- ✅ Filtros funcionan correctamente
- ✅ No permitir bookings solapados

---

#### Calendario Visual (2 días)

**Librería recomendada:** FullCalendar.js (MIT license)

**Implementación:**
- [ ] Agregar FullCalendar CDN a index.html
- [ ] Crear vista "📅 Calendario" en bookings section
- [ ] Fetch data: `GET /api/bookings/calendar`
- [ ] Render eventos:
  - Color por status
  - Título: "Guest Name - Bed X"
  - Click: abrir booking details modal
- [ ] Filtro por habitación (sidebar)
- [ ] Botones: Today, Prev Month, Next Month
- [ ] Click en fecha vacía: crear booking para ese día

**Tareas:**
- [ ] Setup FullCalendar
- [ ] Integrar con API
- [ ] Styling personalizado
- [ ] Event handlers (click, date select)

**Testing:**
- ✅ Calendario muestra bookings correctos
- ✅ Colores indican status
- ✅ Click en evento abre detalles
- ✅ Click en fecha vacía permite crear booking
- ✅ Filtro por habitación funciona

---

#### Integración Check-in con Bookings (1 día)

**Modificar Check-in Flow:**
- [ ] Agregar search: "Search by confirmation code or guest name"
- [ ] Si existe booking: pre-cargar datos (guest, bed, fechas, price)
- [ ] Al hacer check-in:
  - Si viene de booking: `PUT /api/bookings/:id` status='checked_in'
  - Si es walk-in: `POST /api/bookings` + check-in simultáneo
- [ ] Update bed.status = 'occupied'
- [ ] Link: booking.bed_id = bed.id

**Tareas:**
- [ ] Modificar showGuestSelectionForCheckin()
- [ ] Agregar búsqueda de bookings
- [ ] Pre-cargar form si booking exists
- [ ] Actualizar booking status en check-in
- [ ] Test completo del flujo

**Testing:**
- ✅ Check-in desde booking existente
- ✅ Check-in walk-in sin booking
- ✅ Booking status se actualiza
- ✅ Bed status se actualiza
- ✅ No permitir check-in si ya checked-in

---

### SPRINT 3: Módulo de Caja Completo (10 días)

#### Database Schema (1 día)

**Tablas nuevas:**

```sql
CREATE TABLE cashbox_shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  opening_amount DECIMAL(10,2) NOT NULL,
  closing_amount DECIMAL(10,2),
  expected_closing DECIMAL(10,2),
  discrepancy DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'open', -- open, closed
  opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  closed_at DATETIME,
  notes TEXT
);

CREATE TABLE cashbox_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shift_id INTEGER NOT NULL,
  type VARCHAR(20) NOT NULL, -- income, expense, deposit
  category VARCHAR(50), -- venta, gasto_operacional, deposito_banco
  amount DECIMAL(10,2) NOT NULL,
  method VARCHAR(20), -- cash, card, transfer
  description TEXT NOT NULL,
  receipt_url TEXT,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Migration:**
- [ ] Crear archivo `database/migrations/add-cashbox-tables.sql`
- [ ] Ejecutar migration en dev y producción

---

#### Backend API (4 días)

**Endpoints a crear:**

1. **POST /api/cashbox/open** - Abrir caja
```javascript
// Body: { opening_amount, notes }
// Validar: no hay shift open para este user
// Create: cashbox_shifts con status='open'
// Response: { shift_id }
```

2. **POST /api/cashbox/close** - Cerrar caja
```javascript
// Body: { shift_id, closing_amount, notes }
// Calcular expected: opening + total_income - total_expense - total_deposits
// Calcular discrepancy: closing_amount - expected_closing
// Update shift: status='closed', closing_amount, expected_closing, discrepancy, closed_at
// Response: { expected, actual, discrepancy }
```

3. **POST /api/cashbox/movement** - Registrar movimiento
```javascript
// Body: { shift_id, type, category, amount, method, description, receipt_url }
// Validar: shift debe estar open
// Insert cashbox_movements
// Response: { movement_id }
```

4. **GET /api/cashbox/status** - Estado actual
```javascript
// Response: {
//   shift: { id, opened_at, opening_amount },
//   cash_in_hand: opening + income - expense - deposits,
//   total_income: SUM(type='income'),
//   total_expenses: SUM(type='expense'),
//   total_deposits: SUM(type='deposit')
// }
```

5. **GET /api/cashbox/movements** - Historial
```javascript
// Query: ?shift_id=, ?start_date=, ?end_date=
// Response: [{ id, type, category, amount, description, created_at }]
```

6. **POST /api/cashbox/deposit** - Depósito bancario
```javascript
// Body: { shift_id, amount, description, receipt_url }
// Insert movement type='deposit'
// Response: { movement_id }
```

7. **GET /api/cashbox/reconciliation** - Cuadre
```javascript
// Query: ?shift_id=
// Response: {
//   opening, total_income, total_expense, total_deposits,
//   expected_closing, actual_closing, discrepancy,
//   movements: [ ... ]
// }
```

**Tareas:**
- [ ] Implementar 7 endpoints
- [ ] Validaciones robustas
- [ ] Business logic: cálculos correctos
- [ ] Activity logging
- [ ] Error handling

**Testing:**
- ✅ Abrir caja
- ✅ No permitir 2 cajas abiertas por user
- ✅ Registrar movimientos (income, expense, deposit)
- ✅ Calcular expected closing correctamente
- ✅ Cerrar caja con discrepancy
- ✅ Ver status en tiempo real
- ✅ Reconciliación correcta

---

#### Frontend UI (4 días)

**Reemplazar mockup actual con funcionalidad real:**

**Sección Caja:**
- [ ] Mostrar estado: "Caja Abierta" o "Caja Cerrada"
- [ ] Si cerrada: botón "Abrir Caja"
- [ ] Si abierta: mostrar datos en tiempo real (actualizar cada 30 seg)

**Datos en tiempo real:**
- [ ] Efectivo en caja: $X.XX (opening + income - expense - deposits)
- [ ] Ingresos del turno: $X.XX
- [ ] Gastos del turno: $X.XX
- [ ] Depósitos realizados: $X.XX
- [ ] Shift abierto desde: HH:MM

**Botones:**
- [ ] "Nuevo Movimiento" (income, expense, deposit)
- [ ] "Cerrar Caja"
- [ ] "Ver Historial"

**Modal Abrir Caja:**
- [ ] Monto inicial (number input)
- [ ] Notas (textarea opcional)
- [ ] Confirmar → POST /api/cashbox/open

**Modal Nuevo Movimiento:**
- [ ] Tipo: Income, Expense, Deposit (radio buttons)
- [ ] Categoría:
  - Income: Venta directa, Pago room, Otro
  - Expense: Compra suministros, Servicio, Pago staff, Otro
  - Deposit: Depósito banco
- [ ] Monto (number input)
- [ ] Método: Cash, Card, Transfer (si aplica)
- [ ] Descripción (textarea required)
- [ ] Upload recibo (file input opcional)
- [ ] Confirmar → POST /api/cashbox/movement

**Modal Cerrar Caja:**
- [ ] Mostrar expected closing: $X.XX
- [ ] Input: conteo físico de efectivo (number)
- [ ] Tabla conteo por denominación (opcional):
  - $50,000 × qty = $X
  - $20,000 × qty = $X
  - ... (auto-suma al input principal)
- [ ] Mostrar discrepancy en tiempo real: actual - expected
- [ ] Alert si discrepancy > $10
- [ ] Notas de cierre (textarea)
- [ ] Confirmar → POST /api/cashbox/close

**Vista Historial:**
- [ ] Tabla: Fecha, Tipo, Categoría, Método, Monto, Descripción
- [ ] Filtro por tipo y fecha
- [ ] Total por tipo en footer
- [ ] Botón "Export CSV"

**Vista Reconciliación:**
- [ ] Sección con desglose:
  - Apertura: $X
  - + Ingresos: $X
  - - Gastos: $X
  - - Depósitos: $X
  - = Esperado: $X
  - Conteo real: $X
  - **Discrepancy: $X** (destacado si >$10)
- [ ] Lista detallada de movimientos
- [ ] Botón "Export Shift Report" (PDF)

**Tareas:**
- [ ] Implementar todos los modals
- [ ] Integrar con APIs backend
- [ ] Real-time updates (polling cada 30 seg)
- [ ] Validaciones frontend
- [ ] Alerts visuales
- [ ] Styling profesional

**Testing:**
- ✅ Abrir caja correctamente
- ✅ Registrar income/expense/deposit
- ✅ Cash en caja se actualiza en tiempo real
- ✅ Cerrar caja con conteo
- ✅ Ver discrepancy calculada correctamente
- ✅ Alert si discrepancy alta
- ✅ No permitir abrir caja si ya abierta
- ✅ Export CSV funciona
- ✅ Historial se filtra correctamente

---

#### Business Logic & Alerts (1 día)

**Implementar:**
- [ ] Auto-register POS sales como cashbox income
  - Al hacer venta POS método=cash → auto-create cashbox_movement type='income'
- [ ] Alert si discrepancy >5% al cerrar
- [ ] Email notification a admin si discrepancy >$50 (opcional)
- [ ] Bloquear nuevo shift si anterior no cerrado
- [ ] Dashboard widget: "⚠️ Caja abierta desde hace X horas"

**Testing:**
- ✅ Venta POS cash se registra en cashbox
- ✅ Alerts se disparan correctamente
- ✅ No permitir shift si anterior abierto

---

## ✅ FASE 2: MEJORAS OPERACIONALES (2-3 SEMANAS)

### SPRINT 4: Guest Experience (5 días)

#### Día 1-2: Formulario Legal Check-in
- [ ] Agregar campos a guests table: nationality, passport_number, passport_expiry, visa_expiry, emergency_contact_name, emergency_contact_phone
- [ ] Migration SQL
- [ ] Actualizar form check-in con campos nuevos
- [ ] Validaciones: passport required si nationality != Colombia
- [ ] Test: crear guest con datos completos

#### Día 3: Guest Preferences & Notes
- [ ] Agregar campos: preferences (JSON), notes (TEXT)
- [ ] UI en guest details modal
- [ ] UI en edit guest modal
- [ ] Preferences: room_type (dormitory/private), dietary_restrictions, allergies
- [ ] Test: guardar y mostrar preferences

#### Día 4: Blacklist Funcional
- [ ] Toggle blacklist en guest details
- [ ] Modal blacklist: reason (textarea)
- [ ] Tabla blacklist_log (guest_id, reason, created_by, created_at)
- [ ] Alert roja al intentar check-in de blacklisted guest
- [ ] Test: blacklist guest, intentar check-in

#### Día 5: Guest Groups
- [ ] Tablas: guest_groups, guest_group_members
- [ ] UI: link guests to group
- [ ] Show group members en guest details
- [ ] Test: crear grupo, vincular guests

---

### SPRINT 5: POS Improvements (5 días)

#### Día 1: Low Stock Alerts
- [ ] Badge "Low Stock" si product.stock < 5
- [ ] Alert visual en product card
- [ ] Dashboard notification: "3 productos con stock bajo"
- [ ] Test: producto con stock 2 muestra alert

#### Día 2-3: Discounts System
- [ ] Tabla discount_rules (opcional, o solo aplicar manual)
- [ ] UI: input descuento en cart (% o monto fijo)
- [ ] Aplicar descuento en subtotal
- [ ] Guardar descuento en sale_items
- [ ] Test: aplicar 10% descuento, verificar total

#### Día 4: Receipt Generation
- [ ] Template HTML recibo
- [ ] Botón "Print Receipt" post-venta
- [ ] window.print() con CSS print-friendly
- [ ] Campos: logo, items, subtotal, tax, total, timestamp
- [ ] Test: imprimir recibo, verificar formato

#### Día 5: Split Payments (Opcional)
- [ ] UI: agregar multiple payment entries
- [ ] Example: $50 cash + $50 card
- [ ] Validar: total payments = total sale
- [ ] Guardar 2 transactions
- [ ] Test: split payment funciona

---

### SPRINT 6: Dashboard & Reports (5 días)

#### Día 1: Dashboard Activity Feed
- [ ] Query: SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 10
- [ ] Display: "Juan checked in to Bed 1-A (2 mins ago)"
- [ ] Format: relative time (moment.js o similar)
- [ ] Auto-refresh cada 30 seg
- [ ] Test: realizar acción, ver en feed

#### Día 2-3: Dashboard Charts
- [ ] Chart.js line: revenue últimos 7 días
- [ ] Chart.js bar: ocupación últimos 7 días
- [ ] Backend: agregar chart data a /api/dashboard
- [ ] Test: gráficos muestran datos correctos

#### Día 4-5: Reports Charts
- [ ] Line chart: revenue trend (report range)
- [ ] Bar chart: top 10 productos
- [ ] Pie chart: payment methods %
- [ ] Bar chart: ocupación por día de semana
- [ ] Test: generar report, verificar charts

---

## 🚀 FASE 3: FEATURES AVANZADAS (2-3 SEMANAS)

### SPRINT 7: Staff Management (5 días)

#### Día 1-2: Clock In/Out System
- [ ] Tabla attendance (staff_id, clock_in, clock_out, date)
- [ ] POST /api/staff/clock-in
- [ ] POST /api/staff/clock-out
- [ ] UI: botón Clock In/Out en Staff section
- [ ] Lista: "Staff en turno ahora"
- [ ] Test: clock in, verificar en lista, clock out

#### Día 3-4: Attendance Calendar
- [ ] Calendar view: attendance por staff
- [ ] Estados: presente, ausente, tarde, licencia
- [ ] Calcular días trabajados en mes
- [ ] Test: ver asistencia de staff en noviembre

#### Día 5: Task Assignment
- [ ] Tabla tasks (staff_id, task_type, entity_id, status, due_date)
- [ ] Botón "Assign Cleaning" en bed card (dirty)
- [ ] Vista tareas pendientes por staff
- [ ] Mark task complete
- [ ] Test: asignar limpieza, staff completa, bed → clean

---

### SPRINT 8: Tours Completion (5 días)

#### Día 1: Missing CRUD Endpoints
- [ ] PUT /api/tours/:id
- [ ] DELETE /api/tours/:id (soft delete)
- [ ] Test: editar tour, eliminar tour

#### Día 2-4: Tour Enhancements
- [ ] Campo capacity + validation al click
- [ ] Campo categories (multi-select: Adventure, Culture, Food, Nature)
- [ ] Reviews table + API + UI
- [ ] Photo gallery UI (multiple upload)
- [ ] Guest tour history tab
- [ ] Test: agregar review, ver gallery

#### Día 5: Commission Improvements
- [ ] Auto-calculate commission en tour booking (si implementado)
- [ ] Commission status: pending, paid
- [ ] Mark as paid button
- [ ] Commission payment report
- [ ] Test: generar comisión, marcar pagada

---

### SPRINT 9: Beds Advanced Features (5 días)

#### Día 1-2: Maintenance Mode
- [ ] Status "maintenance" + razón + fecha_inicio + fecha_fin
- [ ] Modal set maintenance
- [ ] Prevent booking si en maintenance
- [ ] Auto-return to clean después de fecha_fin
- [ ] Test: marcar maintenance, intentar booking

#### Día 3-4: Bed Blocking
- [ ] Tabla bed_blocks (bed_id, start_date, end_date, reason)
- [ ] UI: block bed temporalmente
- [ ] Validation: no booking en fechas bloqueadas
- [ ] Test: block bed, intentar booking en fecha

#### Día 5: Bed History
- [ ] Query: últimos 10 guests de bed
- [ ] Vista modal: bed history
- [ ] Mostrar: guest name, dates, nights, revenue
- [ ] Test: ver historial de Bed 1-A

---

## 📊 CHECKLIST FINAL - SISTEMA 100% FUNCIONAL

### Módulo 1: Dashboard ✅
- [x] KPIs básicos funcionando
- [ ] Activity feed con datos reales
- [ ] Revenue chart últimos 7 días
- [ ] Ocupación chart últimos 7 días
- [ ] Alerts operacionales
- [ ] Quick action buttons

### Módulo 2: Camas ✅
- [x] CRUD completo
- [x] Status management
- [x] Room grouping
- [ ] Maintenance mode
- [ ] Bed blocking
- [ ] Bed history
- [ ] Bulk operations

### Módulo 3: Huéspedes ✅
- [x] CRUD completo
- [x] Search potente
- [x] Booking history
- [ ] Legal check-in form (nationality, passport, etc)
- [ ] Guest preferences
- [ ] Blacklist funcional
- [ ] Guest notes
- [ ] Emergency contact
- [ ] Guest groups

### Módulo 4: Reservas ✅
- [ ] CRUD completo de bookings
- [ ] Calendario visual
- [ ] Overlap prevention
- [ ] Confirmation codes
- [ ] Integración con check-in
- [ ] Booking modifications
- [ ] Cancellation management

### Módulo 5: Ventas/POS ✅
- [x] CRUD productos
- [x] Shopping cart
- [x] Stock tracking
- [x] Multiple payment methods
- [ ] Low stock alerts
- [ ] Discounts system
- [ ] Receipt printing
- [ ] Split payments
- [ ] Refunds

### Módulo 6: Caja ✅
- [ ] Apertura/cierre de caja
- [ ] Registro de movimientos
- [ ] Cash reconciliation
- [ ] Expense tracking
- [ ] Deposit management
- [ ] Discrepancy alerts
- [ ] Shift reports
- [ ] Integration con POS

### Módulo 7: Personal ✅
- [x] CRUD staff
- [ ] Clock in/out system
- [ ] Attendance tracking
- [ ] Task assignment
- [ ] Shift scheduling
- [ ] Payroll calculation (básico)

### Módulo 8: Reportes ✅
- [x] Analytics API completo
- [x] Date range filtering
- [x] Export CSV
- [ ] Real POS data (no simulado)
- [ ] Charts visualization
- [ ] Comparative analysis
- [ ] PDF export

### Módulo 9: Paseos ✅
- [x] CRUD (parcial, falta UPDATE/DELETE)
- [x] Click tracking
- [x] Commission recording
- [ ] UPDATE/DELETE endpoints
- [ ] Capacity management
- [ ] Reviews system
- [ ] Photo gallery
- [ ] Categories

---

## 🎯 PRIORIZACIÓN EJECUTIVA

### 🔥 HACER PRIMERO - FASE 0 (Día 1):
**⚠️ PREREQUISITO CRÍTICO - No empezar FASE 1 sin completar esto**

0. ✅ **Migración a Neon + Schema Completo (1 día)**
   - Setup Neon account y proyecto
   - Ejecutar schema completo (20 tablas)
   - Migrar datos de Supabase
   - Configurar Vercel + Neon
   - Deploy y verificación

**Resultado:** Database production-ready con todas las tablas necesarias para features futuras.

**Total FASE 0: 1 día**

---

### ⚠️ HACER AHORA - FASE 1 (Próximas 3-4 semanas):
1. ✅ Fix check-in/check-out (2 días)
2. ✅ Vista de balance (2 días)
3. ✅ Fix reportes real data (1 día)
4. ✅ Sistema de reservas completo (10 días)
5. ✅ Módulo de Caja completo (10 días)

**Total FASE 1: ~25 días**

### ✅ HACER DESPUÉS (Semanas 3-5):
6. Guest improvements (legal form, preferences)
7. POS improvements (alerts, discounts, receipts)
8. Dashboard enhancements (feed, charts)

**Total: ~15 días**

### 🚀 HACER AL FINAL (Mes 2-3):
9. Staff advanced features
10. Tours enhancements
11. Beds advanced features

**Total: ~15 días**

---

## 📈 MÉTRICAS DE ÉXITO

**Sistema considerado 100% funcional cuando:**
- ✅ 0 errores críticos en producción
- ✅ Check-in/check-out < 3 minutos
- ✅ Reservas futuras funcionando
- ✅ Caja con cuadre diario exitoso
- ✅ Reportes con datos 100% reales
- ✅ Balance de guests visible y correcto
- ✅ 0 overbookings (imposible por sistema)
- ✅ Staff puede operar sin training extenso

---

---

## 📊 RESUMEN FINAL DE TIEMPOS

| Fase | Descripción | Días | Semanas |
|------|-------------|------|---------|
| **FASE 0** | Migración Neon + Schema | 1 día | - |
| **FASE 1** | Crítico (bugs + reservas + caja) | 25 días | 3-4 sem |
| **FASE 2** | Operacional (guest, POS, dashboard) | 15 días | 2-3 sem |
| **FASE 3** | Avanzado (staff, tours, beds) | 15 días | 2-3 sem |
| **TOTAL** | **Sistema 100% completo** | **56 días** | **8-11 sem** |

**Con 1 desarrollador full-time:** 2.5-3 meses
**Con 2 desarrolladores:** 1.5-2 meses

---

## 📁 DOCUMENTOS RELACIONADOS

- **Auditoría Técnica:** `docs/04-reports/SENIOR-ARCHITECT-AUDIT-2025-11-19.md`
- **Plan Migración Neon:** `docs/03-deployment/NEON-MIGRATION-PLAN.md`
- **Schema SQL Completo:** `database/schemas/neon-complete-schema.sql`
- **PRD Simplificado:** `docs/01-product/PRD-v3-SIMPLIFICADO.md`

---

**Documento actualizado:** 2025-11-19
**Próxima revisión:** Post-FASE 0 (después de migración Neon)
**Owner:** Development Team
**Stakeholder:** Almanik PMS Management

**⚠️ IMPORTANTE:** Ejecutar FASE 0 (Migración Neon) ANTES de empezar desarrollo de features.
