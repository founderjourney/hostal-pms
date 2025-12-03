# 🚀 START HERE - GUÍA DE IMPLEMENTACIÓN DÍA A DÍA

**Sistema:** Almanik PMS
**Versión:** 1.12.4
**Estado:** ✅ EN PRODUCCIÓN
**URL Producción:** https://almanik-pms-viajero.vercel.app
**Fecha deploy:** 2025-12-02

---

## 🔑 CREDENCIALES DE ACCESO

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| admin | admin123 | Administrador |
| recepcion | recepcion123 | Recepcionista |
| voluntario | voluntario123 | Voluntario |

---

## 📊 STACK TECNOLÓGICO

- **Frontend:** HTML/CSS/JavaScript (vanilla)
- **Backend:** Node.js + Express
- **Base de datos:** PostgreSQL (Neon) en producción / SQLite en desarrollo
- **Hosting:** Vercel (serverless)
- **Notificaciones:** Web Push (VAPID)

---

---

## 📋 CÓMO USAR ESTE DOCUMENTO

Este documento es tu **guía diaria de implementación**. Cada mañana:

1. ✅ Abre este archivo
2. ✅ Ve a la sección del día actual
3. ✅ Sigue las instrucciones paso a paso
4. ✅ Marca como completado: `[ ]` → `[x]`
5. ✅ Al terminar el día, actualiza el checkbox de progreso

**Archivos importantes:**

- 📋 Plan completo: `docs/02-planning/DEVELOPMENT-PLAN-2025-UPDATED.md`
- 📊 Auditoría: `docs/04-reports/SENIOR-ARCHITECT-AUDIT-2025-11-19.md`
- 🗄️ Migración Neon: `docs/03-deployment/NEON-MIGRATION-PLAN.md`
- 💾 Schema SQL: `database/schemas/neon-complete-schema.sql`

---

## 🎯 ROADMAP GENERAL

```
DÍA 1 → FASE 0: Migración Neon + Database completa (20 tablas)
         ⬇️
DÍAS 2-6 → FASE 1 Sprint 1: Fix bugs críticos
         ⬇️
DÍAS 7-16 → FASE 1 Sprint 2: Sistema de reservas
         ⬇️
DÍAS 17-26 → FASE 1 Sprint 3: Módulo de Caja
         ⬇️
DÍAS 27-31 → FASE 2 Sprint 4: Guest Experience
         ⬇️
DÍAS 32-36 → FASE 2 Sprint 5: POS Improvements
         ⬇️
DÍAS 37-41 → FASE 2 Sprint 6: Dashboard & Reports
         ⬇️
DÍAS 42-46 → FASE 3 Sprint 7: Staff Management
         ⬇️
DÍAS 47-51 → FASE 3 Sprint 8: Tours Completion
         ⬇️
DÍAS 52-56 → FASE 3 Sprint 9: Beds Advanced
         ⬇️
         ✅ SISTEMA 100% COMPLETO
```

---

# 🗄️ FASE 0: MIGRACIÓN A NEON

## DÍA 1 - Migración Database a Neon 🔥

**⚠️ PREREQUISITO CRÍTICO - No continuar sin completar esto**

**Duración:** 6-8 horas

**Objetivo:** Database production-ready con 20 tablas en Neon

### CHECKLIST DÍA 1:

#### MAÑANA (9:00 - 12:00)

**Paso 1: Setup Neon (30 min)**
- [ ] Ir a https://neon.tech
- [ ] Sign up con GitHub
- [ ] Crear proyecto: `almanik-pms-production`
  - Región: US East (Ohio)
  - PostgreSQL: 16
  - Plan: Free tier
- [ ] Copiar **Pooled Connection String** y guardar
- [ ] Copiar **Direct Connection String** y guardar
- [ ] Guardar credenciales en 1Password/gestor seguro

**Paso 2: Ejecutar Schema Completo (1-2 hrs)**
- [ ] Abrir Neon Dashboard → SQL Editor
- [ ] Abrir archivo local: `database/schemas/neon-complete-schema.sql`
- [ ] Copiar TODO el contenido (21 KB, ~670 líneas)
- [ ] Pegar en Neon SQL Editor
- [ ] Click "Run"
- [ ] Esperar completar (puede tomar 2-3 minutos)
- [ ] Verificar mensaje: "✅ 20 tables created"
- [ ] Verificar conteo de tablas:
  ```sql
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  ```
- [ ] Debe retornar: **20**

**Paso 3: Backup Supabase (30 min)**
- [ ] Instalar pg_dump si no está instalado:
  ```bash
  # Ubuntu/Debian
  sudo apt-get install postgresql-client

  # Mac
  brew install libpq
  ```
- [ ] Ejecutar backup:
  ```bash
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
    > backup-supabase-$(date +%Y%m%d).sql
  ```
- [ ] Verificar archivo creado: `backup-supabase-YYYYMMDD.sql`
- [ ] Abrir archivo y verificar que tiene datos (no vacío)

#### ALMUERZO (12:00 - 13:00)

#### TARDE (13:00 - 17:00)

**Paso 4: Importar Datos a Neon (1-2 hrs)**
- [ ] Obtener tu Neon connection string (direct, no pooled)
- [ ] Importar data:
  ```bash
  psql "postgres://[USER]:[PASSWORD]@[HOST]/main?sslmode=require" \
    -f backup-supabase-$(date +%Y%m%d).sql
  ```
- [ ] Si hay errores de foreign keys, es normal (omitir y continuar)
- [ ] Verificar import exitoso

**Paso 5: Resetear Sequences (15 min)**
- [ ] Conectar a Neon SQL Editor
- [ ] Copiar y ejecutar TODAS estas líneas:
  ```sql
  -- Resetear sequences existentes
  SELECT setval('guests_id_seq', COALESCE((SELECT MAX(id) FROM guests), 1));
  SELECT setval('beds_id_seq', COALESCE((SELECT MAX(id) FROM beds), 1));
  SELECT setval('bookings_id_seq', COALESCE((SELECT MAX(id) FROM bookings), 1));
  SELECT setval('transactions_id_seq', COALESCE((SELECT MAX(id) FROM transactions), 1));
  SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));
  SELECT setval('tours_id_seq', COALESCE((SELECT MAX(id) FROM tours), 1));
  SELECT setval('tour_clicks_id_seq', COALESCE((SELECT MAX(id) FROM tour_clicks), 1));
  SELECT setval('tour_commissions_id_seq', COALESCE((SELECT MAX(id) FROM tour_commissions), 1));
  SELECT setval('activity_log_id_seq', COALESCE((SELECT MAX(id) FROM activity_log), 1));

  -- Inicializar sequences nuevas
  SELECT setval('products_id_seq', 1, false);
  SELECT setval('sale_items_id_seq', 1, false);
  SELECT setval('staff_id_seq', 1, false);
  SELECT setval('attendance_id_seq', 1, false);
  SELECT setval('tasks_id_seq', 1, false);
  SELECT setval('cashbox_shifts_id_seq', 1, false);
  SELECT setval('cashbox_movements_id_seq', 1, false);
  SELECT setval('guest_groups_id_seq', 1, false);
  SELECT setval('guest_group_members_id_seq', 1, false);
  SELECT setval('bed_blocks_id_seq', 1, false);
  SELECT setval('reviews_id_seq', 1, false);
  ```
- [ ] Verificar que todas ejecutaron sin error

**Paso 6: Verificar Migración (15 min)**
- [ ] Contar registros por tabla:
  ```sql
  SELECT 'guests' as table, COUNT(*) as count FROM guests
  UNION ALL SELECT 'beds', COUNT(*) FROM beds
  UNION ALL SELECT 'bookings', COUNT(*) FROM bookings
  UNION ALL SELECT 'transactions', COUNT(*) FROM transactions
  UNION ALL SELECT 'users', COUNT(*) FROM users
  UNION ALL SELECT 'tours', COUNT(*) FROM tours
  UNION ALL SELECT 'products', COUNT(*) FROM products
  UNION ALL SELECT 'staff', COUNT(*) FROM staff;
  ```
- [ ] Comparar conteos con Supabase (deben coincidir)
- [ ] Verificar seed data existe:
  - Guests: >= 6
  - Beds: >= 27
  - Products: >= 10
  - Staff: >= 4

**Paso 7: Configurar Vercel + Neon (30 min)**

**Opción A: Neon Integration (Recomendado)**
- [ ] Ir a Vercel Dashboard
- [ ] Proyecto: almanik-pms → Settings → Integrations
- [ ] Browse Marketplace → Buscar "Neon"
- [ ] Install Neon Integration
- [ ] Autorizar con cuenta Neon
- [ ] Seleccionar proyecto: `almanik-pms-production`
- [ ] Seleccionar environments: Production, Preview
- [ ] Confirmar instalación
- [ ] Verificar variable `DATABASE_URL` creada automáticamente

**Opción B: Manual (Si integración falla)**
- [ ] Ir a Vercel Dashboard → Settings → Environment Variables
- [ ] Agregar nueva variable:
  - Key: `DATABASE_URL`
  - Value: `postgres://[pooled-connection-string]`
  - Environments: Production, Preview
- [ ] Save

**Paso 8: Test Local (30 min)**
- [ ] Crear/editar `.env.local`:
  ```
  DATABASE_URL="postgres://[NEON_POOLED_CONNECTION]"
  NODE_ENV=production
  ```
- [ ] Iniciar servidor local:
  ```bash
  npm start
  ```
- [ ] Verificar console output:
  - `✅ Connected to PostgreSQL (Production)`
  - `✅ PostgreSQL tables initialized`
- [ ] Abrir http://localhost:3000
- [ ] Login: admin / admin123
- [ ] Verificar que carga dashboard
- [ ] Ir a Camas → Ver 27 camas
- [ ] Ir a Huéspedes → Ver 6+ guests
- [ ] Ir a Ventas → Ver 10 productos
- [ ] Si todo funciona → Continuar

**Paso 9: Deploy a Vercel (15 min)**
- [ ] Commit cambios (si hiciste alguno):
  ```bash
  git status
  git add .
  git commit -m "Migrate to Neon PostgreSQL - 20 tables complete"
  git push origin main
  ```
- [ ] Vercel auto-deploy (esperar 2-3 minutos)
- [ ] O manual: `vercel --prod`

**Paso 10: Verificación Producción (30 min)**
- [x] Abrir https://almanik-pms-viajero.vercel.app
- [ ] Login: admin / admin123
- [ ] Test completo:
  - [ ] Dashboard carga correctamente
  - [ ] Camas muestra 27 camas
  - [ ] Crear nuevo guest → Save → Verificar guardado
  - [ ] Crear nuevo producto → Save → Verificar guardado
  - [ ] Generar reporte → Verificar funciona
- [ ] Verificar Vercel Logs:
  - Vercel Dashboard → Deployments → Latest → Runtime Logs
  - Buscar: "Connected to PostgreSQL"
- [ ] Verificar Neon Dashboard:
  - Neon Dashboard → Queries (ver queries ejecutándose)
  - Connections: ~5-10 activas
  - Storage: ~10-50 MB

**Paso 11: Post-Migration (15 min)**
- [ ] Hacer backup inmediato de Neon:
  ```bash
  pg_dump "postgres://[NEON_DIRECT_CONNECTION]" > neon-backup-initial-$(date +%Y%m%d).sql
  ```
- [ ] Guardar backup en lugar seguro (Google Drive, Dropbox, etc)
- [ ] Documentar credentials Neon en gestor de passwords
- [ ] Configurar Neon backups automáticos:
  - Neon Dashboard → Project Settings → Backups → Enable
- [ ] Mantener Supabase activo por 1 semana (rollback plan)

### ✅ CHECKLIST FINAL DÍA 1:
- [ ] Neon proyecto creado y configurado
- [ ] 20 tablas creadas en Neon
- [ ] Datos migrados desde Supabase
- [ ] Sequences reseteadas correctamente
- [ ] Vercel configurado con DATABASE_URL
- [ ] Deploy exitoso en producción
- [ ] Tests funcionales completados
- [ ] Backup inicial realizado
- [ ] Documentación de credentials completa

**Resultado esperado:** Database production-ready con 20 tablas funcionando en Neon + Vercel.

**Si completaste TODO lo anterior:** ✅ DÍA 1 COMPLETO - Continuar a DÍA 2

---

# 🔥 FASE 1: CRÍTICO - FUNCIONALIDAD CORE

## DÍA 2 - Fix Check-in/Checkout (Parte 1)

**Objetivo:** Reparar URLs desconectadas entre frontend y backend

**Documentación:** `docs/02-planning/DEVELOPMENT-PLAN-2025-UPDATED.md` línea 390-456

### CHECKLIST DÍA 2:

#### MAÑANA (9:00 - 12:00)

**Análisis del Problema (1 hora)**
- [ ] Abrir `public/index.html`
- [ ] Buscar función `checkinGuest` (Ctrl+F)
- [ ] Identificar URL llamada: `/api/beds/${bedId}/checkin`
- [ ] Abrir `server/server-simple.js`
- [ ] Buscar endpoint checkin (Ctrl+F "checkin")
- [ ] Identificar URL backend: `POST /api/checkin`
- [ ] Confirmar: URLs NO coinciden ✗

**Decisión de Diseño (30 min)**
- [ ] Decidir qué URLs usar (recomendado: las del backend)
  - `POST /api/checkin` (body: {guest_id, bed_id, check_in, check_out})
  - `POST /api/checkout/:bed_id`
- [ ] Documentar decisión en comentario

**Fix Frontend Check-in (2 horas)**
- [ ] Abrir `public/index.html`
- [ ] Buscar función `checkinGuest` (aproximadamente línea ~3900)
- [ ] Cambiar:
  ```javascript
  // ANTES:
  const response = await fetch(`/api/beds/${bedId}/checkin`, {

  // DESPUÉS:
  const response = await fetch(`/api/checkin`, {
  ```
- [ ] Agregar date pickers al modal de check-in
- [ ] Buscar modal HTML de check-in
- [ ] Agregar campos:
  ```html
  <label>Fecha Check-in:</label>
  <input type="date" id="checkin-date" required>

  <label>Fecha Check-out:</label>
  <input type="date" id="checkout-date" required>
  ```
- [ ] Actualizar función checkinGuest para incluir fechas:
  ```javascript
  const checkInDate = document.getElementById('checkin-date').value;
  const checkOutDate = document.getElementById('checkout-date').value;

  // Validar
  if (new Date(checkOutDate) <= new Date(checkInDate)) {
    alert('Fecha checkout debe ser después de check-in');
    return;
  }

  // Calcular noches
  const nights = Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24));

  // Body request
  body: JSON.stringify({
    guest_id: selectedGuestId,
    bed_id: bedId,
    check_in: checkInDate,
    check_out: checkOutDate,
    nights: nights,
    total: bed.price * nights
  })
  ```
- [ ] Test en navegador (modo dev)

#### ALMUERZO (12:00 - 13:00)

#### TARDE (13:00 - 17:00)

**Verificar Backend Check-in (1 hora)**
- [ ] Abrir `server/server-simple.js`
- [ ] Buscar `app.post('/api/checkin'`
- [ ] Verificar que acepta: guest_id, bed_id, check_in, check_out, nights, total
- [ ] Si falta algún campo, agregarlo al endpoint
- [ ] Verificar que actualiza bed.status = 'occupied'
- [ ] Verificar que actualiza bed.guest_id

**Fix Frontend Check-out (2 horas)**
- [ ] Buscar función checkout en `public/index.html`
- [ ] Verificar URL: debe ser `/api/checkout/${bedId}`
- [ ] Si es diferente, corregir
- [ ] Agregar confirmación antes de checkout:
  ```javascript
  if (!confirm('¿Confirmar check-out? Se calculará balance final.')) {
    return;
  }
  ```
- [ ] Verificar que después de checkout muestra balance final

**Testing Completo (1 hora)**
- [ ] Test check-in walk-in (hoy):
  - Seleccionar cama disponible
  - Click "Check-in"
  - Seleccionar guest
  - Fecha check-in: HOY
  - Fecha checkout: MAÑANA
  - Verificar calcula 1 noche
  - Verificar calcula total = bed.price × 1
  - Save
  - Verificar cama ahora muestra "Occupied"
  - Verificar muestra nombre del guest
- [ ] Test check-in futuro:
  - Fecha check-in: +3 días
  - Fecha checkout: +5 días
  - Verificar calcula 2 noches
  - Save
  - ¿Funciona? (puede requerir sistema de reservas)
- [ ] Test checkout:
  - Seleccionar cama occupied
  - Click "Check-out"
  - Confirmar
  - Verificar muestra balance
  - Verificar cama vuelve a "dirty"
- [ ] Documentar bugs encontrados

### ✅ CHECKLIST FINAL DÍA 2:
- [ ] URLs frontend y backend coinciden
- [ ] Date pickers agregados a check-in
- [ ] Validación de fechas funciona
- [ ] Cálculo de noches correcto
- [ ] Check-in walk-in funciona
- [ ] Check-out funciona
- [ ] Tests básicos completados

**Si completaste TODO:** ✅ DÍA 2 COMPLETO - Continuar a DÍA 3

---

## DÍA 3 - Fix Check-in/Checkout (Parte 2) + Mensajes

**Objetivo:** Mejorar UX con mensajes claros y validaciones

### CHECKLIST DÍA 3:

#### MAÑANA (9:00 - 12:00)

**Agregar Validaciones Robustas (2 horas)**
- [ ] Frontend validaciones check-in:
  ```javascript
  // Validar fechas
  if (!checkInDate || !checkOutDate) {
    showError('Por favor selecciona fechas de check-in y check-out');
    return;
  }

  // Validar check-out > check-in
  if (new Date(checkOutDate) <= new Date(checkInDate)) {
    showError('Fecha de check-out debe ser posterior a check-in');
    return;
  }

  // Validar check-in no es pasado
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(checkInDate) < today) {
    showError('Fecha de check-in no puede ser en el pasado');
    return;
  }

  // Validar guest seleccionado
  if (!selectedGuestId) {
    showError('Por favor selecciona un huésped');
    return;
  }
  ```
- [ ] Backend validaciones:
  ```javascript
  // En /api/checkin
  if (!guest_id || !bed_id || !check_in || !check_out) {
    return res.status(400).json({error: 'Campos requeridos faltantes'});
  }

  if (new Date(check_out) <= new Date(check_in)) {
    return res.status(400).json({error: 'Check-out debe ser después de check-in'});
  }

  // Verificar cama disponible
  const bed = await dbGet('SELECT * FROM beds WHERE id = ?', [bed_id]);
  if (bed.status !== 'clean') {
    return res.status(400).json({error: 'Cama no disponible'});
  }
  ```

**Agregar Mensajes de Éxito/Error (1 hora)**
- [ ] Crear función helper para mostrar mensajes:
  ```javascript
  function showMessage(message, type = 'success') {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message message-${type}`;
    msgDiv.textContent = message;
    msgDiv.style.cssText = `
      position: fixed; top: 20px; right: 20px; z-index: 10000;
      padding: 15px 20px; border-radius: 8px;
      background: ${type === 'success' ? '#4caf50' : '#f44336'};
      color: white; font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(msgDiv);
    setTimeout(() => msgDiv.remove(), 3000);
  }

  function showError(message) {
    showMessage(message, 'error');
  }

  function showSuccess(message) {
    showMessage(message, 'success');
  }
  ```
- [ ] Agregar estas funciones antes de las funciones de check-in
- [ ] Usar en check-in exitoso:
  ```javascript
  showSuccess(`Check-in exitoso: ${guestName} en cama ${bedName}`);
  ```
- [ ] Usar en errores:
  ```javascript
  showError(result.error || 'Error al hacer check-in');
  ```

#### ALMUERZO (12:00 - 13:00)

#### TARDE (13:00 - 17:00)

**Mejorar Display de Info (2 horas)**
- [ ] Al hacer check-in exitoso, actualizar UI inmediatamente:
  ```javascript
  // Después de response OK
  const bedCard = document.querySelector(`[data-bed-id="${bedId}"]`);
  bedCard.classList.remove('status-clean');
  bedCard.classList.add('status-occupied');
  bedCard.querySelector('.bed-status').textContent = 'Ocupada';
  bedCard.querySelector('.guest-name').textContent = guestName;
  ```
- [ ] Agregar tooltip con info completa:
  ```html
  <div class="bed-tooltip">
    <div>Guest: Juan Pérez</div>
    <div>Check-in: 2025-11-20</div>
    <div>Check-out: 2025-11-22</div>
    <div>Noches: 2</div>
    <div>Total: $50.00</div>
  </div>
  ```

**Testing Exhaustivo (2 horas)**
- [ ] Test casos válidos:
  - [ ] Check-in mismo día
  - [ ] Check-in para mañana
  - [ ] Check-in 1 semana adelante
  - [ ] Estadía de 1 noche
  - [ ] Estadía de 7 noches
  - [ ] Checkout normal
- [ ] Test casos inválidos:
  - [ ] Check-out antes de check-in → Ver error
  - [ ] Check-in sin guest seleccionado → Ver error
  - [ ] Check-in en cama occupied → Ver error
  - [ ] Check-in en fecha pasada → Ver error
  - [ ] Check-out de cama clean → Ver error
- [ ] Verificar mensajes claros en todos los casos

### ✅ CHECKLIST FINAL DÍA 3:
- [ ] Validaciones frontend completas
- [ ] Validaciones backend completas
- [ ] Mensajes de éxito/error funcionando
- [ ] UI se actualiza inmediatamente
- [ ] Todos los test cases pasan

**Si completaste TODO:** ✅ DÍA 3 COMPLETO - Continuar a DÍA 4

---

## DÍA 4 - Implementar Vista de Balance

**Objetivo:** Staff puede ver balance de cada guest ocupado

**Documentación:** `docs/02-planning/DEVELOPMENT-PLAN-2025-UPDATED.md` línea 461-542

### CHECKLIST DÍA 4:

#### MAÑANA (9:00 - 12:00)

**Crear Modal de Balance (2 horas)**
- [ ] Agregar HTML para modal balance en `public/index.html`:
  ```html
  <!-- Balance Modal -->
  <div id="balance-modal" class="modal" style="display: none;">
    <div class="modal-content">
      <span class="close" onclick="closeBalanceModal()">&times;</span>
      <h2>💰 Cuenta de Huésped</h2>

      <div id="guest-info"></div>

      <h3>Transacciones</h3>
      <table id="transactions-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Descripción</th>
            <th>Monto</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>

      <div class="balance-summary">
        <div class="balance-row">
          <span>Total Cargos:</span>
          <span id="total-charges">$0.00</span>
        </div>
        <div class="balance-row">
          <span>Total Pagos:</span>
          <span id="total-payments">$0.00</span>
        </div>
        <div class="balance-row balance-total">
          <span>Balance:</span>
          <span id="balance-amount">$0.00</span>
        </div>
      </div>

      <div class="modal-actions">
        <button onclick="showAddChargeForm()">+ Agregar Cargo</button>
        <button onclick="showAddPaymentForm()">+ Agregar Pago</button>
        <button onclick="closeBalanceModal()">Cerrar</button>
      </div>
    </div>
  </div>
  ```

**Crear Función JavaScript (1 hora)**
- [ ] Agregar función showBalanceModal:
  ```javascript
  async function showBalanceModal(bedId) {
    const modal = document.getElementById('balance-modal');
    modal.style.display = 'block';

    // Fetch balance
    const response = await fetch(`/api/balance/${bedId}`);
    const data = await response.json();

    // Display guest info
    document.getElementById('guest-info').innerHTML = `
      <div class="guest-card">
        <h3>${data.guest_name}</h3>
        <p>Cama: ${data.bed_name}</p>
        <p>Check-in: ${data.check_in}</p>
        <p>Check-out: ${data.check_out}</p>
      </div>
    `;

    // Display transactions
    const tbody = document.querySelector('#transactions-table tbody');
    tbody.innerHTML = '';
    data.transactions.forEach(t => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td>${new Date(t.created_at).toLocaleDateString()}</td>
        <td>${t.type === 'charge' ? '🔴 Cargo' : '🟢 Pago'}</td>
        <td>${t.description}</td>
        <td class="${t.type === 'charge' ? 'text-red' : 'text-green'}">
          ${t.type === 'charge' ? '+' : '-'}$${t.amount.toFixed(2)}
        </td>
      `;
    });

    // Display balance
    document.getElementById('total-charges').textContent = `$${data.totalCharges.toFixed(2)}`;
    document.getElementById('total-payments').textContent = `$${data.totalPayments.toFixed(2)}`;
    document.getElementById('balance-amount').textContent = `$${data.balance.toFixed(2)}`;

    // Store bedId for later use
    window.currentBedId = bedId;
  }

  function closeBalanceModal() {
    document.getElementById('balance-modal').style.display = 'none';
  }
  ```

#### ALMUERZO (12:00 - 13:00)

#### TARDE (13:00 - 17:00)

**Agregar Botón "Ver Cuenta" en Camas (1 hora)**
- [ ] En cada bed card occupied, agregar botón:
  ```html
  <button onclick="showBalanceModal(${bed.id})" class="btn-secondary">
    💰 Ver Cuenta
  </button>
  ```
- [ ] O agregar en actions dropdown si ya existe

**Implementar Add Charge (1 hora)**
- [ ] Crear modal para agregar cargo:
  ```html
  <div id="add-charge-modal" class="modal" style="display: none;">
    <div class="modal-content small">
      <h3>Agregar Cargo</h3>
      <form onsubmit="addCharge(event)">
        <label>Descripción:</label>
        <input type="text" id="charge-description" required>

        <label>Monto:</label>
        <input type="number" id="charge-amount" step="0.01" min="0" required>

        <button type="submit">Agregar</button>
        <button type="button" onclick="closeAddChargeModal()">Cancelar</button>
      </form>
    </div>
  </div>
  ```
- [ ] Función addCharge:
  ```javascript
  async function addCharge(event) {
    event.preventDefault();

    const description = document.getElementById('charge-description').value;
    const amount = parseFloat(document.getElementById('charge-amount').value);

    // Get booking_id from balance data
    const response = await fetch(`/api/transactions`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        booking_id: window.currentBookingId,
        type: 'charge',
        description,
        amount
      })
    });

    if (response.ok) {
      showSuccess('Cargo agregado exitosamente');
      closeAddChargeModal();
      showBalanceModal(window.currentBedId); // Refresh
    } else {
      showError('Error al agregar cargo');
    }
  }
  ```

**Implementar Add Payment (1 hora)**
- [ ] Similar a Add Charge, crear modal y función
- [ ] type: 'payment'
- [ ] Agregar selector de método de pago:
  ```html
  <select id="payment-method" required>
    <option value="cash">Efectivo</option>
    <option value="card">Tarjeta</option>
    <option value="transfer">Transferencia</option>
  </select>
  ```

**Testing Completo (1 hora)**
- [ ] Test view balance:
  - Cama occupied → Click "Ver Cuenta"
  - Ver guest info
  - Ver transacciones listadas
  - Ver balance calculado
- [ ] Test add charge:
  - Click "Agregar Cargo"
  - Descripción: "Agua botella"
  - Monto: 1.50
  - Save
  - Verificar aparece en lista
  - Verificar balance aumenta
- [ ] Test add payment:
  - Click "Agregar Pago"
  - Monto: 10.00
  - Método: Efectivo
  - Save
  - Verificar aparece en lista
  - Verificar balance disminuye

### ✅ CHECKLIST FINAL DÍA 4:
- [ ] Modal de balance funcional
- [ ] Muestra todas las transacciones
- [ ] Balance calculado correctamente
- [ ] Botón "Ver Cuenta" en camas occupied
- [ ] Add charge funciona
- [ ] Add payment funciona
- [ ] Tests completos

**Si completaste TODO:** ✅ DÍA 4 COMPLETO - Continuar a DÍA 5

---

## DÍA 5 - Fix Reportes + Integrar Balance con Checkout

**Objetivo:** Reportes con datos reales + Balance visible en checkout

### CHECKLIST DÍA 5:

#### MAÑANA (9:00 - 12:00)

**Fix Reportes POS Data (2 horas)**
- [ ] Abrir `server/server-simple.js`
- [ ] Buscar endpoint `/api/reports` (aproximadamente línea 1200)
- [ ] Buscar sección de POS data simulada (línea ~1355-1380)
- [ ] Identificar array hardcoded de productos
- [ ] Reemplazar con query real:
  ```javascript
  // ELIMINAR datos hardcoded
  // const topProducts = [
  //   {name: 'Cerveza Águila', revenue: 245, ...},
  //   ...
  // ];

  // AGREGAR query real
  const topProductsQuery = `
    SELECT
      p.name,
      SUM(si.quantity) as total_sold,
      SUM(si.quantity * si.unit_price) as revenue
    FROM sale_items si
    JOIN products p ON si.product_id = p.id
    JOIN transactions t ON si.transaction_id = t.id
    WHERE t.created_at BETWEEN ? AND ?
    GROUP BY p.id, p.name
    ORDER BY revenue DESC
    LIMIT 10
  `;

  const topProducts = await dbAll(topProductsQuery, [startDate, endDate]);
  ```
- [ ] Guardar y reiniciar servidor
- [ ] Test: Generar reporte → Ver que productos son reales

**Agregar Nationality Real (1 hora)**
- [ ] Verificar que tabla guests tiene campo nationality
- [ ] En reportes, query de nacionalidades:
  ```javascript
  const nationalitiesQuery = `
    SELECT
      nationality,
      COUNT(*) as count
    FROM guests
    WHERE created_at BETWEEN ? AND ?
    GROUP BY nationality
    ORDER BY count DESC
    LIMIT 5
  `;

  const topNationalities = await dbAll(nationalitiesQuery, [startDate, endDate]);
  ```

#### ALMUERZO (12:00 - 13:00)

#### TARDE (13:00 - 17:00)

**Integrar Balance en Checkout (2 horas)**
- [ ] Modificar función checkout para mostrar balance ANTES de confirmar
- [ ] Buscar función checkout en `public/index.html`
- [ ] Antes de ejecutar checkout, hacer:
  ```javascript
  async function checkoutBed(bedId) {
    // Primero fetch balance
    const balanceResponse = await fetch(`/api/balance/${bedId}`);
    const balanceData = await balanceResponse.json();

    // Mostrar modal de confirmación con balance
    const confirmed = confirm(`
      Checkout: ${balanceData.guest_name}

      Total Cargos: $${balanceData.totalCharges.toFixed(2)}
      Total Pagos: $${balanceData.totalPayments.toFixed(2)}

      BALANCE PENDIENTE: $${balanceData.balance.toFixed(2)}

      ${balanceData.balance > 0 ? '⚠️ Cobrar balance antes de checkout' : '✅ Balance pagado'}

      ¿Confirmar checkout?
    `);

    if (!confirmed) return;

    // Si hay balance pendiente, preguntar si pagó
    if (balanceData.balance > 0) {
      const paid = confirm('¿El huésped pagó el balance?');
      if (paid) {
        // Registrar pago
        await fetch('/api/transactions', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            booking_id: balanceData.booking.id,
            type: 'payment',
            amount: balanceData.balance,
            method: 'cash',
            description: 'Pago final en checkout'
          })
        });
      }
    }

    // Proceder con checkout
    const checkoutResponse = await fetch(`/api/checkout/${bedId}`, {
      method: 'POST'
    });

    if (checkoutResponse.ok) {
      showSuccess('Checkout exitoso');
      loadBeds(); // Refresh
    }
  }
  ```

**Testing Completo (2 horas)**
- [ ] Test reportes:
  - Generar reporte de 30 días
  - Verificar top products son reales (no hardcoded)
  - Verificar nacionalidades son reales
  - Si no hay ventas, crear algunas para test
- [ ] Test checkout con balance:
  - Hacer check-in de guest
  - Agregar cargo: "Cerveza", $3.50
  - Agregar cargo: "Agua", $1.00
  - Total charges: $4.50
  - NO agregar pago
  - Intentar checkout
  - Verificar muestra balance: $4.50
  - Confirmar que pagó
  - Verificar checkout exitoso
  - Verificar transaction de pago creada

### ✅ CHECKLIST FINAL DÍA 5:
- [ ] Reportes usan datos reales
- [ ] No hay datos hardcoded en reportes
- [ ] Checkout muestra balance antes de confirmar
- [ ] Checkout registra pago final si hay balance
- [ ] Tests completados

**Si completaste TODO:** ✅ DÍA 5 COMPLETO - Continuar a DÍA 6

**🎉 SPRINT 1 COMPLETO - Critical bugs fijados**

---

## DÍAS 6-56: SIGUIENTE FASE

**Continuar con:**
- Días 6-16: Sistema de Reservas (Sprint 2)
- Días 17-26: Módulo de Caja (Sprint 3)
- Días 27-56: Fases 2 y 3

**Consultar plan completo en:** `docs/02-planning/DEVELOPMENT-PLAN-2025-UPDATED.md`

---

## 📊 TRACKING DE PROGRESO

### FASE 0: MIGRACIÓN NEON
- [ ] Día 1: Migración completa a Neon

### FASE 1 SPRINT 1: CRITICAL BUGS (5 días)
- [ ] Día 2: Fix check-in/checkout (parte 1)
- [ ] Día 3: Fix check-in/checkout (parte 2)
- [ ] Día 4: Vista de balance
- [ ] Día 5: Fix reportes + balance checkout

### FASE 1 SPRINT 2: SISTEMA DE RESERVAS (10 días)
- [ ] Días 6-8: Backend bookings API
- [ ] Días 9-12: Frontend bookings UI
- [ ] Días 13-14: Calendario visual
- [ ] Días 15-16: Integración check-in

### FASE 1 SPRINT 3: MÓDULO DE CAJA (10 días)
- [ ] Día 17: Database schema caja
- [ ] Días 18-21: Backend cashbox API
- [ ] Días 22-25: Frontend cashbox UI
- [ ] Día 26: Business logic & testing

### FASE 2: MEJORAS OPERACIONALES (15 días)
- [ ] Días 27-31: Guest experience
- [ ] Días 32-36: POS improvements
- [ ] Días 37-41: Dashboard & reports

### FASE 3: FEATURES AVANZADAS (15 días)
- [ ] Días 42-46: Staff management
- [ ] Días 47-51: Tours completion
- [ ] Días 52-56: Beds advanced

---

## 🎯 MÉTRICAS DE ÉXITO

Al completar todos los días:
- ✅ 0 errores críticos en producción
- ✅ Check-in/check-out < 3 minutos
- ✅ Reservas futuras funcionando
- ✅ Caja con cuadre diario exitoso
- ✅ Reportes con datos 100% reales
- ✅ Balance de guests visible y correcto
- ✅ 0 overbookings (imposible por sistema)
- ✅ Staff puede operar sin training extenso

---

## 📞 AYUDA Y SOPORTE

**Documentos de referencia:**
- Plan completo: `docs/02-planning/DEVELOPMENT-PLAN-2025-UPDATED.md`
- Auditoría técnica: `docs/04-reports/SENIOR-ARCHITECT-AUDIT-2025-11-19.md`
- Migración Neon: `docs/03-deployment/NEON-MIGRATION-PLAN.md`

**Si encuentras problemas:**
1. Revisar documentación del día específico en el plan
2. Buscar función/endpoint en el código
3. Verificar logs del servidor (console)
4. Verificar logs de Vercel (production)
5. Verificar Neon dashboard (queries, connections)

---

**Documento creado:** 2025-11-19
**Última actualización:** 2025-11-19
**Versión:** 1.0

**¡Éxito en tu implementación!** 🚀
