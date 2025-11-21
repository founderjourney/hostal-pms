# 📅 DÍA 2 - PLAN DE TRABAJO DETALLADO

**Fecha:** 2025-11-20
**Status Día 1:** ✅ Completado - Migración Neon + Login funcionando
**Objetivo Día 2:** Setup de módulos base + Primera funcionalidad crítica

---

## ✅ ESTADO ACTUAL (Día 1 Completado)

- ✅ Sistema desplegado en Vercel: https://hostal-pms.vercel.app
- ✅ Base de datos Neon con 20 tablas funcionando
- ✅ Login operativo (admin/admin123)
- ✅ Frontend básico funcionando
- ✅ Errores JavaScript corregidos

---

## 🎯 OBJETIVO DÍA 2

**Meta Principal:** Comenzar FASE 1 - Implementar Sistema de Reservas (Backend)

**Por qué Reservas primero:**
- Es la funcionalidad MÁS crítica según PRD
- Actualmente NO existe (prioridad 0% ❌)
- Bloquea otras funcionalidades (check-in desde reserva)
- Alto impacto operacional

---

## 📋 DIVISIÓN DE TAREAS

### 🤖 TAREAS CLAUDE (No Delegables) - 4-5 horas

#### TAREA 1.1: Crear Módulo Backend de Reservas (3 horas)
**Archivo:** `server/modules/reservations.js`

**Endpoints a implementar:**
```javascript
// 1. GET /api/reservations - Listar todas las reservas
// 2. POST /api/reservations - Crear nueva reserva
// 3. GET /api/reservations/:id - Obtener reserva específica
// 4. PUT /api/reservations/:id - Actualizar reserva
// 5. DELETE /api/reservations/:id - Cancelar reserva
// 6. POST /api/reservations/:id/confirm - Confirmar reserva
// 7. GET /api/reservations/availability - Check disponibilidad
```

**Lógica de negocio incluir:**
- Validar disponibilidad de cama para fechas solicitadas
- Generar código de confirmación único (ALM + timestamp)
- Calcular precio total basado en: (precio_cama × noches)
- Verificar conflictos de reservas (misma cama, fechas superpuestas)
- Estados: pending, confirmed, checked_in, checked_out, cancelled, no_show
- Crear transacción automática al confirmar (tipo: charge)
- Actualizar estado de cama al confirmar reserva
- Permitir reservas múltiples (grupo)

**Checklist de implementación:**
- [ ] Crear archivo `server/modules/reservations.js`
- [ ] Importar dependencias (db-adapter)
- [ ] Implementar validación de disponibilidad
- [ ] Implementar generador de código de confirmación
- [ ] Implementar POST /api/reservations
- [ ] Implementar GET /api/reservations (con filtros)
- [ ] Implementar GET /api/reservations/:id
- [ ] Implementar PUT /api/reservations/:id
- [ ] Implementar DELETE /api/reservations/:id (cancelar)
- [ ] Implementar POST /api/reservations/:id/confirm
- [ ] Implementar GET /api/reservations/availability
- [ ] Agregar manejo de errores
- [ ] Agregar logging de actividades

**Testing manual:**
```bash
# 1. Crear reserva
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -H "session-id: [tu-session-id]" \
  -d '{
    "guest_id": 1,
    "bed_id": 1,
    "check_in": "2025-11-25",
    "check_out": "2025-11-28",
    "source": "phone"
  }'

# 2. Listar reservas
curl http://localhost:3000/api/reservations \
  -H "session-id: [tu-session-id]"

# 3. Confirmar reserva
curl -X POST http://localhost:3000/api/reservations/1/confirm \
  -H "Content-Type: application/json" \
  -H "session-id: [tu-session-id]"
```

---

#### TAREA 1.2: Integrar Módulo con Server Principal (1 hora)
**Archivo:** `server/server-simple.js`

**Checklist:**
- [ ] Importar módulo de reservations
- [ ] Registrar rutas en Express
- [ ] Verificar que auth middleware funciona
- [ ] Testing de integración
- [ ] Commit y push a repositorio

**Código a agregar:**
```javascript
// En server-simple.js

// Importar módulo
const reservationsModule = require('./modules/reservations');

// Registrar rutas (después de línea 163)
app.use('/api/reservations', requireAuth, reservationsModule);
```

---

#### TAREA 1.3: Documentar API de Reservas (30 min)
**Archivo:** `docs/05-api/RESERVATIONS-API.md`

**Incluir:**
- [ ] Lista de endpoints con ejemplos
- [ ] Request/Response schemas
- [ ] Códigos de error posibles
- [ ] Ejemplos de uso con curl
- [ ] Casos de uso comunes

---

### 👥 TAREAS DELEGABLES (Para Desarrolladores) - 4-5 horas en paralelo

#### TAREA 2.1: Setup Ambiente Local [DEV 1] (1 hora)
**Quién:** Cualquier desarrollador del equipo

**Checklist:**
- [ ] Clonar repositorio
- [ ] Instalar dependencias: `npm install`
- [ ] Crear archivo `.env` local
- [ ] Correr servidor: `npm run dev`
- [ ] Verificar login funciona (admin/admin123)
- [ ] Explorar código existente
- [ ] Crear branch personal: `git checkout -b feature/[nombre]`

**Verificación:**
- Screenshot del sistema corriendo en localhost:3000
- Confirmación de login exitoso

---

#### TAREA 2.2: Diseñar UI de Reservas [DEV 2 - Frontend] (4 horas)
**Quién:** Desarrollador Frontend

**Objetivo:** Crear mockup/wireframe de la UI de reservas

**Componentes a diseñar:**
1. **Vista Lista de Reservas:**
   - Tabla/Cards con reservas
   - Columnas: Código, Huésped, Cama, Check-in, Check-out, Estado, Acciones
   - Filtros: Por fecha, por estado, por huésped
   - Búsqueda rápida

2. **Modal Nueva Reserva:**
   - Selector de huésped (autocomplete)
   - Selector de cama (solo disponibles)
   - Date pickers (check-in, check-out)
   - Cálculo automático de noches y precio
   - Selector de origen (walk-in, phone, email, booking.com)
   - Botón crear

3. **Modal Detalle de Reserva:**
   - Info completa de la reserva
   - Timeline de estados
   - Acciones: Confirmar, Cancelar, Check-in, Editar
   - Balance si aplica

4. **Calendario de Disponibilidad:**
   - Vista mensual
   - Camas ocupadas vs disponibles
   - Click en fecha para nueva reserva

**Entregables:**
- [ ] Wireframes (puede ser en papel, Figma, o HTML/CSS estático)
- [ ] Identificar elementos HTML necesarios
- [ ] Identificar funciones JavaScript necesarias
- [ ] Documento con estructura propuesta

**No implementar todavía, solo diseñar.**

**Verificación:**
- Wireframes compartidos
- Feedback del líder técnico aprobado

---

#### TAREA 2.3: Crear Módulo de Utilidades Compartidas [DEV 3] (3 horas)
**Quién:** Desarrollador Backend/Fullstack

**Objetivo:** Crear funciones helper que serán usadas por múltiples módulos

**Archivo:** `server/utils/helpers.js`

**Funciones a implementar:**

```javascript
// 1. Generador de códigos únicos
function generateConfirmationCode(prefix = 'ALM') {
  // ALM-20251120-1234
}

// 2. Validador de fechas
function validateDateRange(checkIn, checkOut) {
  // Verificar que check_out > check_in
  // Verificar que check_in >= hoy
  // Retornar { valid: boolean, error: string }
}

// 3. Calculador de noches
function calculateNights(checkIn, checkOut) {
  // Calcular diferencia en días
}

// 4. Verificador de disponibilidad
async function checkBedAvailability(bedId, checkIn, checkOut, db) {
  // Query a bookings para verificar conflictos
  // Retornar { available: boolean, conflictingBookings: [] }
}

// 5. Calculador de precio total
async function calculateBookingTotal(bedId, nights, db) {
  // Obtener precio de la cama
  // Calcular: precio × noches
}

// 6. Logger de actividades
async function logActivity(userId, action, module, description, details, db) {
  // Insertar en activity_log
}

// 7. Formateador de fechas
function formatDate(date, format = 'YYYY-MM-DD') {
  // Formatear fecha
}

// 8. Validador de email
function validateEmail(email) {
  // Regex validation
}
```

**Checklist:**
- [ ] Crear archivo `server/utils/helpers.js`
- [ ] Implementar las 8 funciones listadas
- [ ] Agregar JSDoc comments
- [ ] Exportar funciones
- [ ] Crear archivo de testing manual `server/utils/helpers.test.js`
- [ ] Documentar uso en README

**Testing:**
```javascript
// Crear archivo test.js para probar
const helpers = require('./server/utils/helpers');

console.log(helpers.generateConfirmationCode()); // ALM-20251120-1234
console.log(helpers.calculateNights('2025-11-25', '2025-11-28')); // 3
console.log(helpers.validateEmail('test@example.com')); // true
```

**Verificación:**
- Archivo creado con las 8 funciones
- Testing manual exitoso
- Documentación incluida

---

#### TAREA 2.4: Mejorar Gestión de Huéspedes (Preparación) [DEV 4] (3 horas)
**Quién:** Desarrollador Fullstack

**Objetivo:** Mejorar el módulo de huéspedes existente para que soporte mejor las reservas

**Mejoras Backend:**

**Archivo:** `server/server-simple.js` (endpoints de guests)

**Agregar nuevos endpoints:**

```javascript
// 1. GET /api/guests/stats - Estadísticas de huéspedes
app.get('/api/guests/stats', requireAuth, async (req, res) => {
  // Total guests
  // Currently staying (con bookings activos)
  // Active bookings count
});

// 2. GET /api/guests/:id/history - Historial de un huésped
app.get('/api/guests/:id/history', requireAuth, async (req, res) => {
  // Listar todas las bookings del huésped
  // Con detalles de pagos
});

// 3. PUT /api/guests/:id/blacklist - Agregar a blacklist
app.put('/api/guests/:id/blacklist', requireAuth, async (req, res) => {
  // Actualizar is_blacklisted = true
  // Agregar razón y fecha
});
```

**Mejoras Frontend:**

**Archivo:** `public/index.html` (sección de guests)

**Agregar:**
- [ ] Botón "Ver Historial" en cada guest card
- [ ] Modal de historial con bookings pasadas
- [ ] Indicador visual de guests hospedados actualmente
- [ ] Botón agregar/quitar de blacklist
- [ ] Filtro por blacklisted

**Checklist:**
- [ ] Implementar GET /api/guests/stats
- [ ] Implementar GET /api/guests/:id/history
- [ ] Implementar PUT /api/guests/:id/blacklist
- [ ] Agregar botones en UI
- [ ] Testing manual
- [ ] Documentar cambios

**Verificación:**
- Endpoints funcionan correctamente
- UI actualizada con nuevos botones
- Testing manual exitoso

---

## 🔍 SISTEMA DE VERIFICACIÓN Y COMPROBACIÓN

### Para CLAUDE (Auto-verificación):

**Checklist de Calidad:**
- [ ] ✅ Código funciona sin errores
- [ ] ✅ Todos los endpoints responden correctamente
- [ ] ✅ Validaciones implementadas
- [ ] ✅ Manejo de errores incluido
- [ ] ✅ Testing manual completado exitosamente
- [ ] ✅ Código documentado (comentarios donde necesario)
- [ ] ✅ Logging de actividades implementado
- [ ] ✅ Commit con mensaje claro

**Testing Obligatorio:**
```bash
# 1. Test crear reserva
# 2. Test listar reservas
# 3. Test confirmar reserva
# 4. Test verificar disponibilidad
# 5. Test cancelar reserva
# 6. Test casos de error (cama no disponible, fechas inválidas)
```

**Output esperado al final del día:**
- Archivo `server/modules/reservations.js` completado
- Endpoints funcionando
- Documentación API creada
- Commit pusheado a repositorio

---

### Para DESARROLLADORES (Verificación del Líder Técnico):

#### DEV 1 - Setup Ambiente:
**Verificar con:**
```bash
# 1. Solicitar screenshot de localhost:3000 funcionando
# 2. Verificar que puede hacer login
# 3. Confirmar que tiene acceso al repo
# 4. Revisar que creó su branch correctamente
```

**Criterios de aprobación:**
- ✅ Sistema corriendo localmente
- ✅ Login exitoso
- ✅ Branch creado con nombre correcto
- ✅ Puede hacer commits

---

#### DEV 2 - Diseño UI Reservas:
**Verificar con:**
```bash
# 1. Revisar wireframes compartidos
# 2. Verificar que incluye los 4 componentes
# 3. Validar que el flujo de usuario es lógico
# 4. Aprobar o solicitar cambios
```

**Criterios de aprobación:**
- ✅ Wireframes claros y completos
- ✅ Los 4 componentes están diseñados
- ✅ Flujo de usuario es intuitivo
- ✅ Consistent con diseño actual del sistema
- ✅ Incluye estados de loading y errores

**Rubrica de evaluación (1-5):**
- Completitud (¿tiene todos los componentes?): __/5
- Usabilidad (¿es fácil de usar?): __/5
- Consistencia (¿se ve como el resto del sistema?): __/5
- Detalle (¿está bien especificado?): __/5

**Mínimo para aprobar:** 16/20 puntos

---

#### DEV 3 - Utilidades Compartidas:
**Verificar con:**
```bash
# 1. Revisar archivo server/utils/helpers.js
# 2. Verificar que las 8 funciones existen
# 3. Probar cada función manualmente
node -e "const h = require('./server/utils/helpers'); console.log(h.generateConfirmationCode())"
# 4. Revisar que tiene JSDoc comments
# 5. Verificar testing manual
```

**Criterios de aprobación:**
- ✅ Las 8 funciones implementadas
- ✅ Funciones funcionan correctamente
- ✅ JSDoc comments incluidos
- ✅ Testing manual documentado
- ✅ Código limpio y legible

**Testing obligatorio (run por líder técnico):**
```javascript
// test-helpers.js
const helpers = require('./server/utils/helpers');

// Test 1
console.assert(helpers.generateConfirmationCode().startsWith('ALM-'), 'Test 1 failed');

// Test 2
console.assert(helpers.calculateNights('2025-11-25', '2025-11-28') === 3, 'Test 2 failed');

// Test 3
console.assert(helpers.validateEmail('test@example.com') === true, 'Test 3 failed');

// Test 4
console.assert(helpers.validateEmail('invalid') === false, 'Test 4 failed');

console.log('✅ All tests passed');
```

**Mínimo para aprobar:** Todos los tests pasan

---

#### DEV 4 - Mejoras Huéspedes:
**Verificar con:**
```bash
# 1. Test endpoints nuevos con curl
curl http://localhost:3000/api/guests/stats -H "session-id: [session]"
curl http://localhost:3000/api/guests/1/history -H "session-id: [session]"

# 2. Revisar UI en navegador
# - Verificar nuevos botones existen
# - Verificar que funcionan (aunque backend puede no estar completo aún)

# 3. Code review del código agregado
```

**Criterios de aprobación:**
- ✅ Endpoints responden sin error
- ✅ Retornan datos en formato esperado
- ✅ Botones agregados en UI
- ✅ No rompió funcionalidad existente
- ✅ Código sigue estilo del proyecto

**Testing obligatorio:**
```bash
# Test 1: Stats endpoint
curl http://localhost:3000/api/guests/stats \
  -H "session-id: [session-id]"
# Debe retornar: { total_guests: N, currently_staying: N, active_bookings: N }

# Test 2: History endpoint
curl http://localhost:3000/api/guests/1/history \
  -H "session-id: [session-id]"
# Debe retornar: array de bookings

# Test 3: Blacklist endpoint
curl -X PUT http://localhost:3000/api/guests/1/blacklist \
  -H "Content-Type: application/json" \
  -H "session-id: [session-id]" \
  -d '{"reason": "Test reason"}'
# Debe retornar: success
```

**Mínimo para aprobar:** Los 3 tests pasan

---

## 📊 DAILY STANDUP (Fin del Día)

### Template de Reporte:

**Para Claude:**
```
TRABAJO COMPLETADO:
- [ ] Módulo reservations.js creado
- [ ] X endpoints implementados de 7
- [ ] Testing manual: X/6 casos pasaron
- [ ] Documentación creada

BLOCKERS:
- [Listar cualquier problema encontrado]

PRÓXIMO DÍA:
- [Qué queda pendiente para mañana]
```

**Para cada Desarrollador:**
```
NOMBRE: [Dev]
TAREA ASIGNADA: [Tarea X]

TRABAJO COMPLETADO:
- [ ] Item 1
- [ ] Item 2
- [ ] Item 3

TIEMPO INVERTIDO: [X horas]

BLOCKERS/PROBLEMAS:
- [Describir cualquier problema]

¿NECESITA AYUDA?: [Sí/No] - [En qué?]

PRÓXIMO DÍA:
- [Qué planea hacer mañana]
```

---

## 📈 MÉTRICAS DE ÉXITO DÍA 2

### Mínimo Aceptable:
- ✅ Módulo de reservas al menos 50% completado (4/7 endpoints)
- ✅ 2 de 4 tareas delegables completadas
- ✅ Sistema sigue funcionando (no se rompió nada)

### Éxito Completo:
- ✅ Módulo de reservas 100% completado (7/7 endpoints)
- ✅ 3-4 de 4 tareas delegables completadas
- ✅ Testing manual exitoso
- ✅ Documentación actualizada

### Éxito Excepcional:
- ✅ Todo lo anterior +
- ✅ Frontend de reservas comenzado (bonus)
- ✅ Integración entre módulos iniciada
- ✅ Code review completados

---

## 🚀 PREPARACIÓN PARA DÍA 3

**Si Día 2 sale bien, Día 3 será:**
- Frontend de Reservas (UI completa)
- Integración frontend-backend
- Testing end-to-end
- Deploy a staging

**Dependencias:**
- DEV 2 necesita que Claude termine backend antes de implementar UI
- DEV 4 puede continuar mejoras mientras tanto

---

## 📞 COMUNICACIÓN

**Canal:** [Slack/Discord/WhatsApp - definir]

**Horarios de sync:**
- 9:00 AM - Standup inicial (15 min)
- 2:00 PM - Check-in rápido (5 min)
- 6:00 PM - Standup final + demo (30 min)

**Protocolo para blockers:**
- Reportar inmediatamente en el canal
- No esperar más de 1 hora sin ayuda
- Tag al líder técnico si es crítico

---

## ✅ CHECKLIST FINAL DEL DÍA

**Antes de terminar el día, verificar:**

### Claude:
- [ ] Todos los archivos creados están pusheados a Git
- [ ] Testing manual completado y documentado
- [ ] README actualizado si necesario
- [ ] Code no tiene errores obvios
- [ ] Servidor corre sin errores
- [ ] Reporte de día enviado al equipo

### Cada Desarrollador:
- [ ] Trabajo committeado a su branch
- [ ] Reporte de día enviado
- [ ] Blockers documentados
- [ ] Código revisado por sí mismo antes de push
- [ ] Screenshots/evidencia del trabajo adjuntados

### Líder Técnico (si aplica):
- [ ] Code review de trabajo completado
- [ ] Feedback dado a cada desarrollador
- [ ] Planificar Día 3 basado en progreso
- [ ] Actualizar tablero de tareas
- [ ] Celebrar wins del día 🎉

---

**PRÓXIMOS DOCUMENTOS:**
- `DIA-3-PLAN.md` - Se creará mañana basado en el progreso de hoy
- `RESERVATIONS-API.md` - Documentación de API (se crea hoy por Claude)

**Estado:** Ready to execute ✅
**Creado:** 2025-11-20
**Última actualización:** 2025-11-20
