# 🏗️ SENIOR ARCHITECT TECHNICAL AUDIT - ALMANIK PMS
## Sistema de Gestión para Hostales - Evaluación Integral

---

**Auditor:** Senior Solutions Architect (15+ años en PMS Hoteleros)
**Fecha:** 2025-11-19
**Sistema:** Almanik PMS v2.0
**URL Producción:** https://hostal-pms.vercel.app
**Alcance:** Auditoría completa de 8 módulos core del sistema

---

## 📊 RESUMEN EJECUTIVO

### Calificación General del Sistema: **6.2/10** ⚠️

**Veredicto:** Sistema funcional con **fundamentos sólidos** pero **incompleto** para operación hotelera profesional. Tiene buena arquitectura base pero le faltan características críticas de negocio y flujos operacionales completos.

### Fortalezas Identificadas:
✅ **Arquitectura de datos sólida** - 11 tablas bien diseñadas
✅ **Autenticación robusta** - Sistema de roles (admin, recepcionista, voluntario)
✅ **UI moderna y responsive** - Diseño profesional con glass-morphism
✅ **Base de código limpia** - PostgreSQL + SQLite híbrido funcional
✅ **Módulos de Huéspedes y Camas** - 85% completos y funcionales

### Debilidades Críticas Identificadas:
❌ **Check-in/Check-out roto** - Frontend y backend desconectados (URLs diferentes)
❌ **Módulo de Caja inexistente** - Solo UI mockup, 0% backend implementado
❌ **Sistema de reservas ausente** - Solo check-in inmediato, no reservas futuras
❌ **Gestión de transacciones incompleta** - No hay vista de cuentas por cobrar
❌ **Reportes con datos simulados** - POS data no real en analytics

---

## 🎯 EVALUACIÓN POR MÓDULO

### 1. DASHBOARD (Tablero) - **6.5/10** ⚠️

#### ✅ Funcionalidades Implementadas:
- KPIs básicos (camas ocupadas, disponibles, sucias, revenue hoy)
- Auto-refresh cada 30 segundos
- UI profesional con estadísticas visuales
- Reloj y fecha en tiempo real

#### ❌ Funcionalidades Faltantes CRÍTICAS:
- **Activity Feed** - Placeholder vacío, no muestra eventos recientes
- **Gráficos de tendencias** - Chart.js incluido pero sin datos
- **Alertas operacionales** - No hay sistema de notificaciones
- **Quick Actions** - Sin botones de check-in rápido, venta rápida
- **Staff on duty** - No muestra quién está trabajando
- **Checkins/Checkouts del día** - No hay lista de movimientos
- **Comparativas período anterior** - Sin contexto de performance

#### 🔧 Requerimientos para 100% Funcional:
1. Feed de actividad en tiempo real (últimas 10 acciones)
2. Gráfico de revenue últimos 7 días
3. Gráfico de ocupación últimos 30 días
4. Lista de check-ins esperados hoy
5. Lista de check-outs esperados hoy
6. Alertas: camas sucias >2hrs, pagos pendientes
7. Botones de acción rápida (Quick Check-in, Quick Sale)
8. Widget de staff actual en turno

**Prioridad:** MEDIA - El dashboard funciona pero no es informativo
**Tiempo estimado:** 3-4 días de desarrollo

---

### 2. CAMAS (Beds) - **8.5/10** ✅ ROBUSTO

#### ✅ Funcionalidades Implementadas:
- **CRUD completo** - Create, Read, Update, Delete funcionando
- **Gestión de estados** - Clean, Dirty, Occupied con lógica correcta
- **Agrupación por habitación** - Vista organizada por rooms
- **Validaciones** - No permite borrar cama ocupada
- **UI excelente** - Color-coding claro (verde, rojo, naranja)
- **Guest linking** - Muestra guest_id en camas ocupadas

#### ❌ Funcionalidades Faltantes (Nice-to-have):
- **Maintenance mode** - Estado "en mantenimiento" para reparaciones
- **Housekeeping assignment** - Asignar staff de limpieza a cama
- **Bed blocking** - Bloquear cama temporalmente (no disponible)
- **Historial de cama** - Log de ocupaciones anteriores
- **Bulk operations** - Cambiar estado de múltiples camas
- **Bed types advanced** - Distinción bunk/single/double/queen

#### 🔧 Requerimientos para 100% Funcional:
1. Estado "maintenance" + razón de mantenimiento
2. Asignar staff a limpieza de cama
3. Bloqueo temporal de camas (con fechas)
4. Historial: últimos 10 guests de cada cama
5. Bulk update: marcar múltiples como "dirty" o "clean"
6. Tipo de cama detallado (no solo price)

**Prioridad:** BAJA - Módulo ya muy funcional
**Tiempo estimado:** 2-3 días para nice-to-haves

---

### 3. HUÉSPEDES (Guests) - **8.0/10** ✅ MUY BUENO

#### ✅ Funcionalidades Implementadas:
- **CRUD completo** - Todos los endpoints funcionando
- **Búsqueda potente** - Por nombre, documento, email, phone
- **Validaciones** - Documento único, no delete con booking activo
- **Guest details modal** - Muestra historial de estadías
- **Booking history** - Lista todas las reservas del guest
- **Guest stats** - Estadísticas agregadas

#### ❌ Funcionalidades Faltantes CRÍTICAS:
- **Formulario de check-in** - No hay form legal de entrada
- **Upload de documentos** - Sin escaneo de ID/passport
- **Guest preferences** - No guarda preferencias (dieta, alergias, room type)
- **Blacklist funcional** - Campo exists pero sin UI
- **Notas/comentarios** - No hay campo de observaciones
- **Emergency contact** - Dato crítico para hostales
- **Nacionalidad tracking** - Solo simulado en reportes
- **Email/SMS integration** - Sin comunicación automatizada
- **Guest groups** - No vincula familias/grupos

#### 🔧 Requerimientos para 100% Funcional:
1. Formulario legal de check-in (nombre, nacionalidad, passport, emergency contact)
2. Upload de foto ID (OCR opcional)
3. Campo de notas/observaciones por guest
4. Blacklist toggle con razón
5. Preferencias: tipo de cama, alergias, dieta
6. Emergency contact (nombre, teléfono, relación)
7. Tracking de nacionalidad real (no simulado)
8. Guest groups (vincular múltiples guests)
9. Tags customizables (VIP, problematic, regular)

**Prioridad:** ALTA - Datos legales y operacionales críticos
**Tiempo estimado:** 4-5 días de desarrollo

---

### 4. VENTAS/POS (Sales) - **7.0/10** ⚠️ FUNCIONAL CON GAPS

#### ✅ Funcionalidades Implementadas:
- **CRUD de productos** - Completo con categorías
- **Stock tracking** - Deducción automática en venta
- **Shopping cart** - Sistema de carrito funcional
- **Multiple payment methods** - Cash, card, room charge
- **Sale recording** - Transacciones guardadas correctamente
- **Sales history** - Con filtro por fecha

#### ❌ Funcionalidades Faltantes CRÍTICAS:
- **Low stock alerts** - No avisa cuando stock bajo
- **Receipt printing** - Sin impresión de recibo
- **Refunds/returns** - No hay proceso de devolución
- **Discounts** - Sin sistema de descuentos
- **Split payments** - No divide pago en múltiples métodos
- **Tax calculation** - Sin IVA configurado
- **Shift management** - No controla turnos de caja
- **Cash drawer tracking** - No reconcilia efectivo
- **Product images** - Campo text, sin UI para imágenes
- **Barcode scanning** - Sin integración scanner
- **Combos/bundles** - Sin productos agrupados
- **Open tabs** - No hay cuentas abiertas (pedidos pendientes)

#### 🔧 Requerimientos para 100% Funcional:
1. Alert visual cuando stock < 5 unidades
2. Generar recibo imprimible (HTML → Print)
3. Proceso de refund (agregar transaction type 'refund')
4. Sistema de descuentos (%, monto fijo, por producto)
5. Split payment: pagar mitad cash, mitad card
6. Tax configuration (IVA %) y aplicación
7. Apertura/cierre de turno con conteo inicial
8. Reconciliación de efectivo vs ventas
9. Product images (upload y display)
10. Open tabs: iniciar venta, completar después

**Prioridad:** MEDIA-ALTA - Operacionalmente necesario
**Tiempo estimado:** 5-6 días de desarrollo

---

### 5. PERSONAL (Staff) - **6.0/10** ⚠️ BÁSICO

#### ✅ Funcionalidades Implementadas:
- **CRUD completo** - Crear, editar, listar, borrar staff
- **Campos básicos** - Nombre, posición, contacto, salario, horario
- **Active status** - Toggle activo/inactivo
- **Positions** - Recepcionista, Limpieza, Seguridad, Mantenimiento

#### ❌ Funcionalidades Faltantes CRÍTICAS:
- **Attendance tracking** - No hay sistema de asistencia
- **Clock in/out** - Sin registro de entrada/salida
- **Shift scheduling** - Horario es texto, no calendar
- **Payroll calculation** - No calcula nómina
- **Performance tracking** - Sin métricas de performance
- **Task assignment** - No asigna tareas
- **Leave management** - Sin solicitud de vacaciones
- **Overtime tracking** - No controla horas extra
- **Commission tracking** - Sin comisiones por ventas
- **Document management** - Sin contratos, certificados
- **Emergency contacts** - Datos no capturados
- **Training records** - Sin historial de capacitación

#### 🔧 Requerimientos para 100% Funcional:
1. Clock in/out system con timestamps
2. Attendance calendar (presente, ausente, tarde, licencia)
3. Shift scheduler visual (calendar view)
4. Payroll calculator: días trabajados × salario diario
5. Task assignment: asignar limpieza de habitación
6. Leave requests con approval workflow
7. Overtime calculation (horas > 40 semanales)
8. Commission tracking (% de ventas POS)
9. Document upload (contrato, cédula, certif)
10. Emergency contact per staff member
11. Performance reviews (ratings, comentarios)

**Prioridad:** MEDIA - No crítico día 1 pero importante largo plazo
**Tiempo estimado:** 6-7 días de desarrollo

---

### 6. CAJA (Cashbox) - **1.0/10** ❌ CRÍTICO - CASI INEXISTENTE

#### ✅ Funcionalidades Implementadas:
- **Solo UI mockup** - Números estáticos ($1,245 efectivo, $890 tarjeta)
- **Botón "Nuevo Movimiento"** - Alert "En desarrollo"

#### ❌ Funcionalidades Faltantes CRÍTICAS (TODO):
- **Cash opening** - Apertura de caja con monto inicial
- **Cash closing** - Cierre de caja con conteo final
- **Cash movements** - Registro de entradas/salidas
- **Expense recording** - Gastos operacionales
- **Petty cash** - Caja chica con justificantes
- **Bank deposits** - Registro de depósitos bancarios
- **Cash reconciliation** - Cuadre: esperado vs real
- **Discrepancy tracking** - Gestión de faltantes/sobrantes
- **Shift reports** - Reporte por turno
- **Payment method breakdown** - Detalle cash/card/transfer
- **Float management** - Control de cambio disponible
- **Receipt attachments** - Upload de comprobantes
- **Approval workflows** - Aprobar gastos grandes

#### 🎯 **ESTE ES EL MÓDULO MÁS CRÍTICO Y MENOS DESARROLLADO**

#### 🔧 Requerimientos para 100% Funcional:
1. **API Backend completa:**
   - `POST /api/cashbox/open` - Abrir caja con monto inicial
   - `POST /api/cashbox/close` - Cerrar caja con conteo
   - `POST /api/cashbox/movement` - Registrar entrada/salida
   - `GET /api/cashbox/status` - Estado actual de caja
   - `GET /api/cashbox/movements` - Historial de movimientos
   - `POST /api/cashbox/deposit` - Registrar depósito banco
   - `GET /api/cashbox/reconciliation` - Cuadre de caja

2. **Tabla database:**
   ```sql
   CREATE TABLE cashbox_movements (
     id,
     type (opening, income, expense, deposit, closing),
     amount,
     method (cash, card, transfer),
     category (venta, gasto, deposito),
     description,
     receipt_url,
     shift_id,
     user_id,
     expected_amount (for closing),
     actual_amount (for closing),
     discrepancy (actual - expected),
     created_at
   )
   ```

3. **Frontend completo:**
   - Modal apertura caja (monto inicial + shift start time)
   - Form nuevo movimiento (tipo, monto, método, descripción)
   - Form cierre caja (conteo por denominación)
   - Vista movimientos del día (tabla filtrable)
   - Vista reconciliación (expected vs actual)
   - Reporte de turno (PDF download)
   - Alert de discrepancia >$10

4. **Business logic:**
   - Solo 1 caja abierta a la vez por usuario
   - Validar: cierre solo si opening exists
   - Calcular expected: opening + income - expense - deposits
   - Alert si discrepancy >5%
   - Bloquear opening si caja anterior no cerrada

**Prioridad:** ⚠️ **CRÍTICA MÁXIMA** - Sin esto no hay control financiero
**Tiempo estimado:** 8-10 días de desarrollo completo

---

### 7. REPORTES (Reports) - **7.5/10** ✅ BUENO CON MEJORAS

#### ✅ Funcionalidades Implementadas:
- **Comprehensive API** - `/api/reports` con múltiples tipos
- **Date range filtering** - Custom dates + quick buttons
- **Report types:**
  - Overview (KPIs generales)
  - Revenue (análisis financiero)
  - Occupancy (utilización de camas)
  - Guests (analytics de huéspedes)
  - POS (ventas - simulado)
- **Export CSV** - Descarga de datos
- **Visual KPI cards** - Presentación clara
- **Top lists** - Top guests, top products

#### ❌ Funcionalidades Faltantes:
- **Real POS data** - Actualmente usa datos simulados
- **Charts visualization** - Chart.js incluido pero no usado
- **Trend charts** - Revenue por día, ocupación por semana
- **Comparative analysis** - YoY, MoM, WoW
- **Profitability** - Revenue - costs = profit (no hay costs)
- **Payment method breakdown** - % cash vs card vs transfer
- **Channel analysis** - Source de bookings (walk-in, booking.com, etc)
- **Cancellation reports** - No hay tracking de cancellations
- **No-show reports** - No hay data de no-shows
- **Forecast** - Proyecciones basadas en histórico
- **PDF export** - Solo CSV disponible
- **Schedule reports** - Email automático semanal/mensual
- **Custom reports** - Report builder

#### 🔧 Requerimientos para 100% Funcional:
1. Integrar real POS data (eliminar simulación)
2. Implementar Chart.js:
   - Line chart: revenue últimos 30 días
   - Bar chart: ocupación por día de semana
   - Pie chart: revenue por payment method
   - Bar chart: top 10 productos vendidos
3. Comparative analysis: "Revenue este mes vs mes pasado (+15%)"
4. Payment method breakdown real (queries a transactions)
5. Cancellation tracking (agregar campo cancellation_reason)
6. No-show tracking (status 'no_show' en bookings)
7. PDF export con jsPDF (reporte formateado)
8. Email scheduled reports (cron job + nodemailer)
9. Custom report builder (seleccionar campos, filtros, grouping)

**Prioridad:** MEDIA - Reportes funcionan pero pueden ser mejores
**Tiempo estimado:** 5-6 días para completar

---

### 8. PASEOS (Tours) - **6.5/10** ⚠️ FUNCIONAL CON GAPS

#### ✅ Funcionalidades Implementadas:
- **CRUD parcial** - Create y Read funcionando
- **Click tracking** - Contador de clicks por tour
- **Commission recording** - Manual commission entry
- **Stats dashboard** - Tours, clicks, commissions totales
- **Frontend UI** - List view con modal de agregar
- **Database completo** - 3 tablas (tours, tour_clicks, tour_commissions)

#### ❌ Funcionalidades Faltantes CRÍTICAS:
- **UPDATE endpoint** - `PUT /api/tours/:id` NO EXISTE en server
- **DELETE endpoint** - `DELETE /api/tours/:id` NO EXISTE en server
- **Tour booking integration** - Solo links externos, no booking interno
- **Availability calendar** - No hay calendario de disponibilidad
- **Capacity management** - Sin límite de cupo por tour
- **Guest tour history** - No muestra tours tomados por guest
- **Reviews/ratings** - Sin sistema de reviews
- **Photo gallery** - Campo images existe pero sin UI
- **Categories/tags** - Sin categorización (aventura, cultura, etc)
- **Seasonal pricing** - Precio fijo, sin variación por temporada
- **Guide assignment** - No asigna guía a tour
- **Departure schedule** - Sin horarios de salida
- **Pickup locations** - No maneja pickup points
- **Cancellation policy** - Sin política configurada
- **Group bookings** - No maneja grupos
- **Profitability report** - No calcula profit por tour
- **Commission payment** - No marca comisiones como pagadas

#### 🔧 Requerimientos para 100% Funcional:
1. **Agregar endpoints faltantes:**
   - `PUT /api/tours/:id` - Editar tour
   - `DELETE /api/tours/:id` - Eliminar tour (soft delete)

2. **Mejorar funcionalidad core:**
   - Booking interno (no solo external link)
   - Capacity field + booking count validation
   - Guest tour history tab en guest details
   - Reviews: rating 1-5 + comment
   - Photo gallery UI (multiple image upload)
   - Categories (Aventura, Cultura, Comida, Naturaleza)
   - Seasonal pricing table (precio por fecha range)

3. **Features operacionales:**
   - Guide assignment (vincular con staff)
   - Departure schedule (múltiples horarios por día)
   - Pickup locations (direcciones configurables)
   - Cancellation policy text field
   - Group bookings (descuento por >5 personas)
   - Commission status (pending, paid, cancelled)
   - Auto-commission calc en booking (no manual)

**Prioridad:** BAJA-MEDIA - Feature secundaria pero con potencial revenue
**Tiempo estimado:** 4-5 días para completar

---

## 🚨 PROBLEMAS CRÍTICOS IDENTIFICADOS

### 1. CHECK-IN/CHECK-OUT SYSTEM ROTO ⚠️ CRÍTICO

**Problema:** Frontend y Backend usan URLs diferentes, sistema NO FUNCIONA correctamente.

**Frontend llama:**
- `POST /api/beds/${bedId}/checkin`
- `POST /api/beds/${bedId}/checkout`

**Backend expone:**
- `POST /api/checkin` (sin :id en path)
- `POST /api/checkout/:bed_id`

**Impacto:** Check-in/check-out probablemente falla en producción.

**Solución requerida:**
1. Unificar URLs: usar `POST /api/checkin` y `POST /api/checkout/:bed_id`
2. O cambiar backend para que coincida con frontend
3. Agregar validaciones de fechas en frontend
4. Agregar cálculo de pricing en check-in
5. Agregar confirmación visual de éxito/error

**Prioridad:** 🔥 **MÁXIMA URGENCIA**
**Tiempo:** 1 día

---

### 2. SISTEMA DE RESERVAS AUSENTE ⚠️ CRÍTICO

**Problema:** Solo existe check-in inmediato. No hay forma de crear reservas futuras.

**Consecuencias:**
- No se pueden tomar reservas con anticipación
- No hay calendario de ocupación futura
- No se pueden bloquear camas
- No hay confirmaciones de reserva
- No hay tracking de no-shows

**Solución requerida:**
1. Crear `POST /api/bookings` - Crear booking futuro
2. Crear `GET /api/bookings` - Listar todos los bookings
3. Crear `PUT /api/bookings/:id` - Modificar booking
4. Crear `DELETE /api/bookings/:id` - Cancelar booking
5. Agregar calendario visual en frontend
6. Proceso: Booking → Check-in (al llegar) → Check-out
7. Estados: pending, confirmed, checked_in, checked_out, cancelled, no_show

**Prioridad:** 🔥 **MÁXIMA URGENCIA**
**Tiempo:** 6-7 días

---

### 3. MÓDULO DE CAJA 100% INCOMPLETO ⚠️ CRÍTICO

**Problema:** Solo UI mockup, cero backend. Sin esto no hay control financiero.

**Consecuencias:**
- No se puede abrir/cerrar caja
- No se registran gastos operacionales
- No hay cuadre de caja
- No se detectan faltantes/sobrantes
- Auditoría imposible

**Solución:** Ver sección completa de Caja arriba (punto 6).

**Prioridad:** 🔥 **MÁXIMA URGENCIA**
**Tiempo:** 8-10 días

---

### 4. TRANSACCIONES SIN VISTA DE USUARIO ⚠️ ALTA

**Problema:** API `/api/balance/:bed_id` existe pero nunca se llama desde frontend.

**Consecuencias:**
- Staff no puede ver balance de guest
- No hay lista de cargos pendientes
- No hay vista de "cuentas por cobrar"
- No se pueden agregar cargos manuales a room

**Solución requerida:**
1. Crear vista "Account" en cada guest occupied bed
2. Mostrar lista de transactions (cargos y pagos)
3. Balance visible: total charges - total payments
4. Botón "Add Charge" (agregar cargo manual)
5. Botón "Add Payment" (registrar pago parcial)
6. Al checkout, mostrar balance final para cobrar

**Prioridad:** 🔥 **ALTA**
**Tiempo:** 2-3 días

---

### 5. REPORTES CON DATOS SIMULADOS ⚠️ MEDIA

**Problema:** Reports module usa datos simulados para POS analytics.

**Ubicación:** `server-simple.js` línea ~1355-1380 (productos hardcoded simulados)

**Consecuencias:**
- Top products no refleja realidad
- POS analytics no confiables
- Revenue POS puede estar incorrecto

**Solución requerida:**
1. Eliminar arrays hardcoded de productos
2. Query real: `SELECT p.name, SUM(si.quantity), SUM(si.quantity * si.unit_price) FROM sale_items si JOIN products p ...`
3. Nacionalidades: agregar campo nationality a guests table

**Prioridad:** MEDIA
**Tiempo:** 1 día

---

## 📋 PLAN DE DESARROLLO COMPLETO - PRIORIZADO

### 🔥 FASE 1: CRÍTICO - FUNCIONALIDAD CORE (3-4 SEMANAS)

#### SPRINT 1: Fixing Critical Bugs (1 semana)
**Objetivo:** Sistema core operando correctamente

1. **Fix Check-in/Check-out URLs** [CRÍTICO]
   - [ ] Unificar endpoints frontend/backend
   - [ ] Agregar date pickers en frontend
   - [ ] Calcular total price (nights × bed.price)
   - [ ] Validar: check_out > check_in
   - [ ] Show success/error messages
   - [ ] Test completo del flujo
   - **Tiempo:** 2 días

2. **Implementar Vista de Balance** [CRÍTICO]
   - [ ] Botón "View Account" en occupied beds
   - [ ] Modal mostrando transactions del guest
   - [ ] Calcular y mostrar balance
   - [ ] Botón "Add Charge" con form
   - [ ] Botón "Add Payment" con form
   - [ ] Integrar con checkout (mostrar balance final)
   - **Tiempo:** 2 días

3. **Fix POS Data en Reportes** [IMPORTANTE]
   - [ ] Eliminar productos hardcoded
   - [ ] Query real sale_items + products
   - [ ] Top products real data
   - [ ] Revenue POS real data
   - **Tiempo:** 1 día

**Entregable Sprint 1:** Check-in/out funcionando + Balance visible + Reportes reales

---

#### SPRINT 2: Sistema de Reservas (2 semanas)
**Objetivo:** Bookings completo con calendario

1. **Backend Bookings API** [CRÍTICO]
   - [ ] `POST /api/bookings` - Create booking
   - [ ] `GET /api/bookings` - List all
   - [ ] `GET /api/bookings/:id` - Get one
   - [ ] `PUT /api/bookings/:id` - Update
   - [ ] `DELETE /api/bookings/:id` - Cancel
   - [ ] `GET /api/bookings/calendar` - Occupancy calendar
   - [ ] Estados: pending → confirmed → checked_in → checked_out
   - [ ] Validaciones: overlap detection, bed availability
   - **Tiempo:** 3 días

2. **Frontend Bookings UI** [CRÍTICO]
   - [ ] Nueva sección "Reservas" en nav
   - [ ] Lista de bookings (tabla con filtros)
   - [ ] Modal crear booking (guest, bed, dates, price)
   - [ ] Modal editar booking
   - [ ] Función cancelar booking
   - [ ] Visual: badges por estado (pending/confirmed/etc)
   - **Tiempo:** 3 días

3. **Calendario de Ocupación** [IMPORTANTE]
   - [ ] Instalar librería calendar (FullCalendar.js o similar)
   - [ ] Vista mensual con bookings
   - [ ] Color por estado (pending=amarillo, confirmed=azul, checked_in=verde)
   - [ ] Click en fecha: crear booking para ese día
   - [ ] Click en booking: ver detalles/editar
   - [ ] Filtrar por habitación
   - **Tiempo:** 3 días

4. **Integrar Bookings con Check-in** [CRÍTICO]
   - [ ] En check-in: buscar booking por guest name o confirmation code
   - [ ] Si existe booking: pre-cargar datos
   - [ ] Al check-in: actualizar booking.status = 'checked_in'
   - [ ] Si no hay booking: crear booking + check-in simultáneo (walk-in)
   - **Tiempo:** 1 día

**Entregable Sprint 2:** Sistema de reservas completo + calendario visual

---

#### SPRINT 3: Módulo de Caja (2 semanas)
**Objetivo:** Control financiero completo

1. **Database Schema** [CRÍTICO]
   - [ ] Crear tabla cashbox_shifts
   - [ ] Crear tabla cashbox_movements
   - [ ] Migración de datos
   - **Tiempo:** 1 día

2. **Backend Cashbox API** [CRÍTICO]
   - [ ] `POST /api/cashbox/open` - Abrir caja
   - [ ] `POST /api/cashbox/close` - Cerrar caja
   - [ ] `POST /api/cashbox/movement` - Nuevo movimiento
   - [ ] `GET /api/cashbox/status` - Estado actual
   - [ ] `GET /api/cashbox/movements?shift_id=` - Movimientos
   - [ ] `POST /api/cashbox/deposit` - Depósito bancario
   - [ ] `GET /api/cashbox/reconciliation` - Cuadre
   - [ ] Validaciones: 1 caja abierta por user, cierre solo si existe opening
   - **Tiempo:** 4 días

3. **Frontend Cashbox UI** [CRÍTICO]
   - [ ] Reemplazar mockup con datos reales
   - [ ] Modal abrir caja (monto inicial, shift start)
   - [ ] Modal cerrar caja (conteo por denominación, shift end)
   - [ ] Form nuevo movimiento (tipo, monto, método, descripción, receipt upload)
   - [ ] Tabla movimientos del día (filtrable)
   - [ ] Vista reconciliación (expected vs actual con discrepancy)
   - [ ] Alert si discrepancy >5%
   - [ ] Export shift report (PDF)
   - **Tiempo:** 4 días

4. **Business Logic & Testing** [CRÍTICO]
   - [ ] Calcular expected closing (opening + income - expense - deposits)
   - [ ] Alert automática si discrepancy >$10
   - [ ] Bloquear opening si shift anterior no cerrado
   - [ ] Test completo: open → movements → close → reconcile
   - **Tiempo:** 1 día

**Entregable Sprint 3:** Módulo de Caja 100% funcional

---

### ✅ FASE 2: MEJORAS OPERACIONALES (2-3 SEMANAS)

#### SPRINT 4: Guest Experience (1 semana)

1. **Formulario Legal Check-in** [IMPORTANTE]
   - [ ] Agregar campos: nationality, passport_number, emergency_contact_name, emergency_contact_phone
   - [ ] Update guests table schema
   - [ ] Form completo en check-in modal
   - [ ] Validaciones: passport required para extranjeros
   - **Tiempo:** 2 días

2. **Guest Preferences & Notes** [IMPORTANTE]
   - [ ] Campo preferences (JSON: room_type, dietary, allergies)
   - [ ] Campo notes (TEXT: observaciones)
   - [ ] UI en guest details modal
   - [ ] UI en edit guest modal
   - **Tiempo:** 1 día

3. **Blacklist Funcional** [IMPORTANTE]
   - [ ] UI toggle blacklist en guest details
   - [ ] Modal: razón de blacklist
   - [ ] Alert al intentar check-in de blacklisted guest
   - [ ] Tabla blacklist_reasons (guest_id, reason, created_by, date)
   - **Tiempo:** 1 día

4. **Guest Groups** [NICE-TO-HAVE]
   - [ ] Tabla guest_groups (group_id, name, created_at)
   - [ ] Tabla guest_group_members (group_id, guest_id)
   - [ ] UI: vincular guests a grupo
   - [ ] Show group members en guest details
   - **Tiempo:** 1 día

**Entregable Sprint 4:** Gestión de guests profesional y completa

---

#### SPRINT 5: POS Improvements (1 semana)

1. **Low Stock Alerts** [IMPORTANTE]
   - [ ] Alert visual en product card si stock < 5
   - [ ] Badge rojo "Low Stock" en lista
   - [ ] Notificación en dashboard
   - **Tiempo:** 1 día

2. **Discounts System** [IMPORTANTE]
   - [ ] Tabla discount_rules (type, value, applicable_to)
   - [ ] UI: aplicar descuento en cart (%, monto fijo)
   - [ ] Discount per product
   - [ ] Discount en total
   - [ ] Save discount en sale_items
   - **Tiempo:** 2 días

3. **Receipt Generation** [IMPORTANTE]
   - [ ] Template HTML para recibo
   - [ ] Botón "Print Receipt" después de venta
   - [ ] window.print() con styling
   - [ ] Campos: items, quantities, prices, subtotal, tax, total, payment method, timestamp
   - **Tiempo:** 1 día

4. **Split Payments** [NICE-TO-HAVE]
   - [ ] UI: agregar multiple payment methods
   - [ ] Example: $50 cash + $50 card = $100 total
   - [ ] Guardar multiple transactions
   - **Tiempo:** 1 día

**Entregable Sprint 5:** POS robusto con alertas y descuentos

---

#### SPRINT 6: Dashboard & Reports (1 semana)

1. **Dashboard Activity Feed** [IMPORTANTE]
   - [ ] Query: últimas 10 acciones de activity_log
   - [ ] Display: "Juan checked in to Bed 1-A" (2 mins ago)
   - [ ] Auto-refresh cada 30 seg
   - **Tiempo:** 1 día

2. **Dashboard Charts** [IMPORTANTE]
   - [ ] Chart.js: Revenue últimos 7 días (line chart)
   - [ ] Chart.js: Ocupación últimos 7 días (bar chart)
   - [ ] Update dashboard API para incluir chart data
   - **Tiempo:** 2 días

3. **Reports Charts** [IMPORTANTE]
   - [ ] Line chart: revenue trend
   - [ ] Bar chart: top 10 productos
   - [ ] Pie chart: payment methods distribution
   - [ ] Bar chart: ocupación por día de semana
   - **Tiempo:** 2 días

**Entregable Sprint 6:** Dashboard informativo + Reportes visuales

---

### 🚀 FASE 3: FEATURES AVANZADAS (2-3 SEMANAS)

#### SPRINT 7: Staff Management (1 semana)

1. **Clock In/Out System** [IMPORTANTE]
   - [ ] Tabla attendance (staff_id, clock_in, clock_out, date)
   - [ ] `POST /api/staff/clock-in`
   - [ ] `POST /api/staff/clock-out`
   - [ ] UI: botón "Clock In" en Staff section
   - [ ] Lista: staff actualmente en turno
   - **Tiempo:** 2 días

2. **Attendance Calendar** [NICE-TO-HAVE]
   - [ ] Vista mensual de asistencia por staff
   - [ ] Estados: presente, ausente, tarde, licencia
   - [ ] Calcular total días trabajados
   - **Tiempo:** 2 días

3. **Task Assignment** [NICE-TO-HAVE]
   - [ ] Tabla tasks (staff_id, task_type, entity_id, status)
   - [ ] Asignar limpieza de cama a staff
   - [ ] UI: botón "Assign to" en bed card
   - [ ] Lista tareas pendientes por staff
   - **Tiempo:** 1 día

**Entregable Sprint 7:** Staff management operacional

---

#### SPRINT 8: Tours Completion (1 semana)

1. **Missing CRUD Endpoints** [CRÍTICO]
   - [ ] `PUT /api/tours/:id` - Update tour
   - [ ] `DELETE /api/tours/:id` - Delete tour (soft)
   - **Tiempo:** 1 día

2. **Tour Enhancements** [NICE-TO-HAVE]
   - [ ] Campo capacity + validation
   - [ ] Campo categories (multi-select)
   - [ ] Reviews table + API + UI
   - [ ] Photo gallery UI (multiple images)
   - [ ] Guest tour history tab
   - **Tiempo:** 3 días

3. **Commission Improvements** [NICE-TO-HAVE]
   - [ ] Auto-calculate commission en booking
   - [ ] Commission status (pending, paid)
   - [ ] Mark as paid functionality
   - [ ] Commission payment report
   - **Tiempo:** 1 día

**Entregable Sprint 8:** Tours module completo

---

#### SPRINT 9: Beds Advanced Features (1 semana)

1. **Maintenance Mode** [NICE-TO-HAVE]
   - [ ] Status "maintenance" + razón
   - [ ] Fecha inicio/fin mantenimiento
   - [ ] UI: modal set maintenance
   - [ ] Prevent booking si en maintenance
   - **Tiempo:** 2 días

2. **Bed Blocking** [NICE-TO-HAVE]
   - [ ] Tabla bed_blocks (bed_id, start_date, end_date, reason)
   - [ ] UI: block bed temporalmente
   - [ ] Validation: no booking en fechas bloqueadas
   - **Tiempo:** 2 días

3. **Bed History** [NICE-TO-HAVE]
   - [ ] Vista: últimos 10 guests de cama
   - [ ] Dates, duration, revenue per guest
   - **Tiempo:** 1 día

**Entregable Sprint 9:** Beds features avanzadas

---

## 📊 RESUMEN DE ESFUERZO ESTIMADO

| Fase | Sprints | Semanas | Días de Dev |
|------|---------|---------|-------------|
| **Fase 1: Crítico** | 3 sprints | 3-4 semanas | 15-20 días |
| **Fase 2: Operacional** | 3 sprints | 2-3 semanas | 10-15 días |
| **Fase 3: Avanzado** | 3 sprints | 2-3 semanas | 10-15 días |
| **TOTAL** | 9 sprints | **7-10 semanas** | **35-50 días** |

**Con 1 desarrollador full-time:** 2-2.5 meses
**Con 2 desarrolladores:** 1-1.5 meses

---

## 🎯 PRIORIZACIÓN RECOMENDADA

### DO FIRST (Próximas 2 semanas):
1. ✅ Fix check-in/check-out endpoints
2. ✅ Implementar vista de balance/account
3. ✅ Sistema de reservas completo
4. ✅ Módulo de Caja completo

### DO NEXT (Semanas 3-4):
5. ✅ Guest preferences & legal data
6. ✅ POS improvements (alerts, discounts, receipts)
7. ✅ Dashboard activity feed & charts

### DO LATER (Mes 2):
8. ✅ Staff clock-in/out y attendance
9. ✅ Tours enhancements
10. ✅ Beds advanced features

---

## 🔍 RECOMENDACIONES DE ARQUITECTURA

### Refactoring Sugerido (Largo Plazo):

1. **Modularizar server-simple.js** (1820 líneas)
   - Separar en: `routes/`, `controllers/`, `middleware/`
   - Mejorar mantenibilidad

2. **Modularizar public/index.html** (4370 líneas)
   - Considerar framework (React/Vue) o al menos separar en múltiples archivos
   - HTML + CSS + JS separados

3. **Agregar Testing**
   - Unit tests para business logic
   - Integration tests para APIs
   - E2E tests para flujos críticos

4. **Mejorar Error Handling**
   - Centralizar error responses
   - Log errors a servicio externo (Sentry)

5. **Performance Optimization**
   - Agregar indexes a database
   - Implementar caching (Redis)
   - Optimize queries (agregar EXPLAIN)

6. **Security Hardening**
   - Rate limiting en APIs
   - Input sanitization más estricta
   - CSRF protection
   - Security headers

---

## ✅ CONCLUSIÓN

**Estado Actual:** Sistema funcional pero incompleto (6.2/10)

**Para alcanzar 10/10:**
- Completar Fase 1 (crítico) - 3-4 semanas
- Completar Fase 2 (operacional) - 2-3 semanas adicionales
- Considerar Fase 3 (avanzado) - 2-3 semanas adicionales

**Riesgo Mayor:** Módulo de Caja inexistente es un gap crítico de control financiero.

**Fortaleza Mayor:** Módulos de Guests y Beds muy bien implementados.

**ROI Recomendado:**
1. Invertir en Fase 1 primero (máximo impacto)
2. Evaluar ROI antes de Fase 2
3. Fase 3 solo si negocio escala

---

**Auditoría realizada por:** Senior Solutions Architect
**Contacto para consultas:** [Stakeholder]
**Próxima revisión:** Post Fase 1 (4 semanas)

**Documento:** `docs/04-reports/SENIOR-ARCHITECT-AUDIT-2025-11-19.md`
