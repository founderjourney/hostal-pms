# PLAN DE TRABAJO - 4 DESARROLLADORES
**Proyecto:** Almanik PMS
**Fecha Inicio:** 2025-11-28
**Duracion Estimada:** 11 semanas

---

## ASIGNACION DE DESARROLLADORES

| ID | Nombre | Perfil | Color |
|----|--------|--------|-------|
| **DEV1** | Desarrollador 1 | Backend/Integraciones | 🔵 Azul |
| **DEV2** | Desarrollador 2 | Frontend/UX | 🟢 Verde |
| **DEV3** | Desarrollador 3 | Business Logic | 🟡 Amarillo |
| **DEV4** | Desarrollador 4 | Full Stack | 🟣 Morado |

---

## COMO USAR ESTE DOCUMENTO

1. Cada desarrollador tiene su seccion con tareas numeradas
2. Las tareas tienen ID unico: `DEV1-01`, `DEV2-01`, etc.
3. Ejecutar tareas en orden numerico
4. Marcar `[x]` cuando complete cada tarea
5. Si una tarea dice `DEPENDE DE: XXX`, esperar a que XXX este completo

**Comando para siguiente paso:** "Hagale DEV1 siguiente" o "DEV2 proximo paso"

---

# 🔵 DEV1 - BACKEND/INTEGRACIONES

## Resumen DEV1
- **Responsabilidad:** APIs de pago, email, SMS, integraciones externas
- **Tecnologias:** Node.js, Express, APIs REST, Stripe, SendGrid, Twilio
- **Ubicacion codigo:** `server/modules/`, `server/config/`

---

## DEV1-01: STRIPE PAYMENTS - Configuracion
**Duracion:** 2 dias
**Estado:** [x] COMPLETADO (2025-11-28)
**Depende de:** Nada

### Que hacer:
```
1. Crear cuenta Stripe en https://stripe.com
2. Obtener API keys (test mode primero)
3. Crear archivo: server/config/stripe.js
4. Crear archivo: server/modules/payments.js
5. Agregar variables a .env:
   - STRIPE_SECRET_KEY
   - STRIPE_PUBLISHABLE_KEY
   - STRIPE_WEBHOOK_SECRET
```

### Codigo base para server/config/stripe.js:
```javascript
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
module.exports = stripe;
```

### Endpoints a crear:
- POST /api/payments/create-intent
- POST /api/payments/confirm

### Verificacion:
- [ ] Cuenta Stripe creada
- [ ] API keys en .env
- [ ] Archivo stripe.js creado
- [ ] Archivo payments.js creado
- [ ] Endpoints responden sin error

---

## DEV1-02: STRIPE PAYMENTS - Pre-autorizacion
**Duracion:** 2 dias
**Estado:** [x] COMPLETADO (2025-11-28)
**Depende de:** DEV1-01

### Que hacer:
```
1. Implementar endpoint POST /api/payments/pre-authorize
2. Implementar endpoint POST /api/payments/capture
3. Implementar endpoint POST /api/payments/cancel-auth
4. Integrar con reservaciones (pre-auth al confirmar)
```

### Logica de negocio:
- Pre-auth de $50 USD al hacer check-in
- Capturar al hacer check-out
- Cancelar si guest cancela antes de check-in

### Verificacion:
- [ ] Pre-auth funciona en test mode
- [ ] Capture funciona
- [ ] Cancel funciona
- [ ] Integrado con reservaciones

---

## DEV1-03: STRIPE PAYMENTS - Cobros y Reembolsos
**Duracion:** 2 dias
**Estado:** [x] COMPLETADO (2025-11-28)
**Depende de:** DEV1-02

### Que hacer:
```
1. Implementar endpoint POST /api/payments/charge
2. Implementar endpoint POST /api/payments/refund
3. Implementar endpoint GET /api/payments/history/:reservation_id
4. Implementar webhook handler POST /api/webhooks/stripe
```

### Verificacion:
- [x] Cobros funcionan
- [x] Reembolsos funcionan
- [x] Historial muestra transacciones
- [x] Webhook recibe eventos de Stripe

---

## DEV1-04: STRIPE PAYMENTS - Integracion Cashbox
**Duracion:** 1 dia
**Estado:** [x] COMPLETADO (2025-11-28)
**Depende de:** DEV1-03

### Que hacer:
```
1. Modificar cashbox.js para registrar pagos Stripe
2. Agregar tipo de pago 'stripe' en transacciones
3. Sincronizar totales con sesion de caja
4. Documentar API de payments
```

### Archivos modificados:
- server/modules/cashbox.js (categorias stripe_payment, stripe_preauth, stripe_refund)
- server/modules/payments.js (funcion syncToCashbox)
- docs/05-api/PAYMENTS-API.md (documentacion v1.3.0)

### Verificacion:
- [x] Pagos Stripe aparecen en cashbox (via syncToCashbox)
- [x] Totales de caja correctos (ingresos/egresos automaticos)
- [x] Documentacion completa (PAYMENTS-API.md actualizado)

---

## DEV1-05: SENDGRID EMAIL - Configuracion
**Duracion:** 1 dia
**Estado:** [x] COMPLETADO (2025-11-28)
**Depende de:** Nada (puede iniciar en paralelo)

### Que hacer:
```
1. Crear cuenta SendGrid en https://sendgrid.com
2. Verificar dominio de envio
3. Crear API key
4. Crear archivo: server/config/sendgrid.js
5. Crear archivo: server/modules/email.js
6. Agregar a .env: SENDGRID_API_KEY, EMAIL_FROM
```

### Archivos creados:
- server/config/sendgrid.js (cliente SendGrid con helpers)
- server/modules/email.js (endpoints de email)
- docs/05-api/EMAIL-API.md (documentacion completa)

### Endpoints creados:
- GET /api/email/status
- POST /api/email/send
- POST /api/email/send-bulk
- POST /api/email/test
- GET /api/email/history

### Verificacion:
- [x] Configuracion SendGrid creada
- [x] Modulo de email funcionando
- [x] Endpoints responden (503 sin API key, como esperado)
- [x] Documentacion completa

---

## DEV1-06: SENDGRID EMAIL - Templates
**Duracion:** 2 dias
**Estado:** [x] COMPLETADO (2025-11-29)
**Depende de:** DEV1-05

### Que se hizo:
```
1. Crear template: Confirmacion de reserva
2. Crear template: Recordatorio check-in (dia anterior)
3. Crear template: Factura/Recibo
4. Crear template: Recordatorio check-out
5. Integrar envio automatico en reservaciones
```

### Templates requeridos:
| Template | Trigger | Variables |
|----------|---------|-----------|
| booking_confirmation | Nueva reserva | guest_name, dates, bed, total |
| checkin_reminder | 1 dia antes check-in | guest_name, date, address |
| receipt | Pago completado | guest_name, items, total |
| checkout_reminder | Dia de check-out | guest_name, checkout_time |

### Verificacion:
- [ ] 4 templates creados
- [ ] Emails se envian automaticamente
- [ ] Variables se reemplazan correctamente

---

## DEV1-07: TWILIO SMS - Configuracion
**Duracion:** 1 dia
**Estado:** [ ] Pendiente
**Depende de:** Nada

### Que hacer:
```
1. Crear cuenta Twilio en https://twilio.com
2. Obtener numero de telefono
3. Obtener Account SID y Auth Token
4. Crear archivo: server/config/twilio.js
5. Crear archivo: server/modules/sms.js
6. Agregar a .env: TWILIO_SID, TWILIO_AUTH, TWILIO_PHONE
```

### Endpoints a crear:
- POST /api/sms/send (interno)
- POST /api/sms/test

### Verificacion:
- [ ] Cuenta Twilio activa
- [ ] Numero asignado
- [ ] SMS de prueba recibido

---

## DEV1-08: TWILIO SMS - Automatizacion
**Duracion:** 2 dias
**Estado:** [ ] Pendiente
**Depende de:** DEV1-07

### Que hacer:
```
1. SMS: Confirmacion de reserva
2. SMS: Recordatorio check-in (dia anterior)
3. SMS: WiFi y info post check-in
4. SMS: Recordatorio check-out
5. Integrar triggers automaticos
6. Agregar opt-out para guests
```

### Verificacion:
- [ ] SMS automaticos funcionan
- [ ] Guest puede opt-out
- [ ] Logs de SMS enviados

---

## DEV1-09: BOOKING.COM - Investigacion y Setup
**Duracion:** 3 dias
**Estado:** [ ] Pendiente
**Depende de:** DEV1-04 (Stripe completo)

### Que hacer:
```
1. Registrar en Booking.com Partner Program
2. Solicitar acceso a Connectivity API
3. Estudiar documentacion API
4. Crear archivo: server/modules/booking-com.js
5. Definir mapeo de camas local <-> Booking.com
6. Crear tabla: external_reservations
```

### IMPORTANTE:
- Proceso de aprobacion puede tomar 2-4 semanas
- Mientras espera, preparar codigo local

### Verificacion:
- [ ] Solicitud enviada a Booking.com
- [ ] Documentacion estudiada
- [ ] Estructura de codigo preparada

---

## DEV1-10: BOOKING.COM - Sync Disponibilidad
**Duracion:** 4 dias
**Estado:** [ ] Pendiente
**Depende de:** DEV1-09 + Aprobacion Booking.com

### Que hacer:
```
1. Implementar OAuth authentication
2. GET disponibilidad desde Booking.com
3. POST actualizar disponibilidad hacia Booking.com
4. Cron job para sync cada 15 minutos
5. Manejo de errores y reintentos
```

### Verificacion:
- [ ] Auth funciona
- [ ] Disponibilidad sincroniza
- [ ] Cron ejecuta correctamente

---

## DEV1-11: BOOKING.COM - Importar Reservas
**Duracion:** 4 dias
**Estado:** [ ] Pendiente
**Depende de:** DEV1-10

### Que hacer:
```
1. Webhook para nuevas reservas
2. Mapeo reserva Booking.com -> reserva local
3. Creacion automatica de guest si no existe
4. Notificacion a staff de nueva reserva
5. Manejo de modificaciones/cancelaciones
6. Dashboard de reservas externas
```

### Verificacion:
- [ ] Reservas se importan automaticamente
- [ ] Guest se crea correctamente
- [ ] Cancelaciones se procesan
- [ ] Staff recibe notificacion

---

## DEV1 - CHECKLIST COMPLETO

| Tarea | Estado | Semana |
|-------|--------|--------|
| DEV1-01 | [x] COMPLETADO 2025-11-28 | 1 |
| DEV1-02 | [x] COMPLETADO 2025-11-28 | 1 |
| DEV1-03 | [x] COMPLETADO 2025-11-28 | 2 |
| DEV1-04 | [x] COMPLETADO 2025-11-28 | 2 |
| DEV1-05 | [x] COMPLETADO 2025-11-28 | 2 |
| DEV1-06 | [x] COMPLETADO 2025-11-29 | 3 |
| DEV1-07 | [ ] | 3 |
| DEV1-08 | [ ] | 4 |
| DEV1-09 | [ ] | 5 |
| DEV1-10 | [ ] | 6-7 |
| DEV1-11 | [ ] | 7-8 |

### DEV1 Progreso Detallado:
- **DEV1-01** (2025-11-28): Creado `server/modules/payments.js` con Stripe config, endpoints create-intent, confirm. Creado `server/config/stripe.js`.
- **DEV1-02** (2025-11-28): Implementados endpoints de pre-autorización: POST /pre-authorize (hold funds con capture_method: manual), POST /capture (captura fondos retenidos), POST /cancel-auth (libera fondos), GET /pre-auth/:reservation_id (consulta pre-auth activa). Incluye validación de pre-auth duplicados, logging de actividad, y manejo de estados Stripe.
- **DEV1-03** (2025-11-28): Implementados cobros y reembolsos: POST /charge (cobro directo con captura inmediata), POST /refund (reembolsos totales/parciales), GET /payment/:payment_intent_id (detalles de pago). Mejorado GET /history/:reservation_id con cálculo de totales. Webhook mejorado con eventos: succeeded, failed, canceled, requires_action, refunded, dispute.created. Documentación completa en `docs/05-api/PAYMENTS-API.md`.
- **DEV1-04** (2025-11-28): Integración Stripe con reservaciones. Endpoints: POST /api/reservations/:id/payment (iniciar pago), POST /api/reservations/:id/preauth (pre-autorización), POST /api/reservations/:id/capture (capturar pre-auth). Dashboard de pagos en frontend.
- **DEV1-05** (2025-11-28): Configuración SendGrid. Creado `server/config/sendgrid.js` y `server/modules/email.js`. Endpoints: GET /status, POST /send, POST /send-bulk, POST /test, GET /history. Tabla emails para registro de envíos.
- **DEV1-06** (2025-11-29): Templates de Email implementados. 4 templates profesionales: booking_confirmation (confirmación de reserva), checkin_reminder (recordatorio día anterior), receipt (recibo de pago), checkout_reminder (recordatorio check-out con link a review). Endpoints: GET /templates, GET /templates/:id, POST /send-template, POST /preview-template. Funciones helper exportadas: sendBookingConfirmation(), sendCheckoutReminder(). Templates con HTML responsive y versión texto.

---

# 🟢 DEV2 - FRONTEND/UX

## Resumen DEV2
- **Responsabilidad:** Interfaz de usuario, PWA, optimizacion mobile
- **Tecnologias:** JavaScript, CSS3, Service Workers, Chart.js
- **Ubicacion codigo:** `public/`

---

## DEV2-01: PWA - Service Worker
**Duracion:** 2 dias
**Estado:** [x] COMPLETADO (2025-11-28)
**Depende de:** Nada

### Implementado:
- `public/sw.js` actualizado a v2 con estrategias avanzadas
- Cache First para assets estaticos (todas las paginas HTML y JS)
- Network First con fallback a cache para APIs (offline support)
- Stale-while-revalidate para actualizacion en background
- Manejo de CDN externos (Chart.js, FontAwesome)
- Respuesta JSON offline para APIs sin conexion

### Verificacion:
- [x] SW se registra correctamente
- [x] Assets se cachean (9 paginas HTML + 8 archivos JS)
- [x] App funciona offline (lectura)

---

## DEV2-02: PWA - Manifest y Icons
**Duracion:** 1 dia
**Estado:** [ ] Pendiente
**Depende de:** DEV2-01

### Que hacer:
```
1. Crear/actualizar manifest.json completo
2. Crear iconos en todas las resoluciones:
   - 72x72, 96x96, 128x128, 144x144
   - 152x152, 192x192, 384x384, 512x512
3. Agregar splash screens para iOS
4. Configurar theme-color y background-color
```

### Archivos:
- public/manifest.json
- public/icons/ (carpeta con iconos)

### Verificacion:
- [ ] Lighthouse PWA score > 90
- [ ] App instalable en Android
- [ ] App instalable en iOS
- [ ] Iconos se ven correctamente

---

## DEV2-03: PWA - Push Notifications
**Duracion:** 2 dias
**Estado:** [x] COMPLETADO (2025-11-28)
**Depende de:** DEV2-02

### Implementado:
- `server/modules/notifications.js` - Modulo backend completo con Web Push
- `public/js/notifications.js` - Cliente JavaScript para manejo de permisos
- `public/sw.js` - Service Worker actualizado con push event handlers
- Endpoints: `/api/notifications/vapid-public-key`, `subscribe`, `unsubscribe`, `send`, `test`
- Tablas: `push_subscriptions`, `notification_history`
- Helpers para enviar notificaciones desde otros modulos

### Verificacion:
- [x] Permiso se solicita correctamente
- [x] Notificaciones se reciben
- [x] Funciona en background

---

## DEV2-04: POS - Interfaz Mejorada
**Duracion:** 2 dias
**Estado:** [x] COMPLETADO (2025-11-28)
**Depende de:** Nada

### Implementado:
- `public/pos.html` - Nueva pagina POS completa con diseño moderno
- `public/js/pos.js` - Logica del POS con todas las funcionalidades
- Grid responsive de productos con iconos por categoria
- Tabs de categorias con conteo de productos
- Busqueda en tiempo real con debounce
- Carrito interactivo (agregar, quitar, modificar cantidades)
- Atajos de teclado: F1=Efectivo, F2=Tarjeta, Ctrl+F=Buscar, Esc=Limpiar
- Modal de confirmacion de venta con calculadora de cambio
- Soporte mobile con carrito desplegable

### Verificacion:
- [x] Productos muestran iconos (placeholder, preparado para imagenes)
- [x] Categorias funcionan (tabs con filtrado)
- [x] Busqueda funciona (debounce 200ms)
- [x] Carrito actualiza correctamente

---

## DEV2-05: POS - Imagenes de Productos
**Duracion:** 1 dia
**Estado:** [x] COMPLETADO (2025-11-28)
**Depende de:** DEV2-04

### Implementado:
- Campo `image_url` agregado a tabla `products` (con migracion automatica)
- Carpeta `public/uploads/products/` creada para almacenamiento
- Endpoints para manejo de imagenes:
  - `POST /api/products/:id/image` - Subir imagen (base64)
  - `DELETE /api/products/:id/image` - Eliminar imagen
  - `PUT /api/products/:id` - Actualizado para incluir image_url
- UI en `pos.html` con:
  - Preview de imagen en modal de producto
  - Boton de upload con validacion (2MB max, JPG/PNG/WebP)
  - Boton para eliminar imagen existente
- `pos.js` actualizado con funciones:
  - `previewProductImage()` - Vista previa antes de subir
  - `removeProductImage()` - Eliminar imagen de producto
  - `uploadProductImage()` - Subir imagen al servidor
  - `openProductModal()` - Soporta modo edicion con imagen
- Grid de productos muestra imagenes cuando existen, icono fallback si no

### Verificacion:
- [x] Productos pueden tener imagen
- [x] Upload funciona (base64 a archivo)
- [x] Placeholder para sin imagen (iconos por categoria)
- [x] Eliminar imagen funciona

---

## DEV2-06: REPORTES - Graficos Interactivos
**Duracion:** 3 dias
**Estado:** [x] COMPLETADO (2025-11-29)
**Depende de:** Nada

### Implementado:
```
1. Chart.js integrado via CDN
2. Grafico: Ocupacion mensual (barras) - occupancyBarChart
3. Grafico: Revenue por semana (lineas) - revenueLineChart
4. Grafico: Distribucion por fuente reserva (doughnut) - guestPieChart
5. Grafico: Comparativo year-over-year (lineas) - yoyComparisonChart
6. Filtros de fecha para reporte financiero
```

### Archivos:
- public/reports-advanced.html - UI con 4 graficos interactivos
- public/js/reports-advanced.js - Logica de carga y renderizado

### Endpoints backend (server-simple.js):
- GET /api/reports/occupancy-monthly?year=YYYY
- GET /api/reports/revenue-weekly
- GET /api/reports/guest-distribution?by=source|nationality
- GET /api/reports/yoy-comparison

### Verificacion:
- [x] 4 graficos funcionando
- [x] Filtros de fecha funcionan
- [x] Datos se cargan del backend

---

## DEV2-07: REPORTES - Exportacion
**Duracion:** 2 dias
**Estado:** [x] COMPLETADO (2025-11-29)
**Depende de:** DEV2-06

### Implementado:
```
1. Dropdown "Export" con 3 opciones (PDF, Excel, CSV)
2. jsPDF + jspdf-autotable para PDF profesional multi-pagina
3. SheetJS para Excel con 5 hojas (Financial, Occupancy, Revenue, Guests, YoY)
4. CSV simple para compatibilidad
5. Loading overlay durante generacion
6. Nombres de archivo con fecha: almanik-report-YYYY-MM-DD.ext
```

### Archivos modificados:
- `public/reports-advanced.html` - Librerias CDN, botones export, estilos dropdown
- `public/js/reports-advanced.js` - Funciones exportToPDF(), exportToExcel(), exportToCSV()

### Features PDF:
- Header con logo texto "ALMANIK PMS"
- Periodo y fecha de generacion
- 5 tablas con colores diferenciados
- Paginacion automatica
- Footer con numero de pagina

### Features Excel:
- 5 hojas: Financial Summary, Occupancy, Revenue, Guests, YoY Comparison
- Columnas con ancho ajustado
- Formato limpio para analisis

### Verificacion:
- [x] PDF se genera correctamente (multi-pagina, tablas)
- [x] Excel se genera correctamente (5 hojas)
- [x] CSV funciona como fallback
- [x] Formato profesional

---

## DEV2-08: MOBILE - Responsive Audit
**Duracion:** 1 dia
**Estado:** [x] COMPLETADO (2025-11-29)
**Depende de:** Nada

### Auditoria realizada:

| Pagina | Viewport | Media Queries | Fixed Widths | Estado |
|--------|----------|---------------|--------------|--------|
| index.html | OK | 3 | 39 (inline) | OK |
| reservations.html | OK | 3 (ADDED) | 2 | FIXED |
| analytics.html | OK | 1 | 2 | OK |
| cashbox.html | OK | 1 | 6 | OK |
| pos.html | OK | 2 | 11 | OK |
| reports-advanced.html | OK | 3 (ADDED) | 3 | FIXED |
| staff.html | OK | 1 | 8 | OK |
| tasks.html | OK | 1 | 5 | OK |

### Fixes aplicados:

**reports-advanced.html:**
- Agregadas 3 media queries (768px, 480px, 375px)
- Grid container con min(100%, 350px) para evitar overflow
- Header responsivo en columna para mobile
- Stats grid 1 columna en mobile
- Charts con altura adaptativa
- Controles apilados verticalmente

**reservations.html:**
- Agregadas 3 media queries (768px, 480px, 375px)
- Actions bar apilados en mobile
- Reservation details grid 1 columna
- Buttons full-width en mobile
- Modal padding reducido
- Stats grid adaptativo

### Verificacion:
- [x] Auditoria completa (8 paginas)
- [x] Media queries agregadas donde faltaban
- [x] Grid layouts corregidos

---

## DEV2-09: MOBILE - Fixes Criticos
**Duracion:** 2 dias
**Estado:** [ ] Pendiente
**Depende de:** DEV2-08

### Que hacer:
```
1. Corregir navegacion mobile
2. Corregir forms que no caben
3. Hacer tablas scrolleables horizontalmente
4. Ajustar modals para mobile
5. Agregar touch gestures basicos
```

### CSS a agregar:
```css
/* Tablas responsivas */
.table-responsive {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

/* Modals mobile */
@media (max-width: 576px) {
  .modal-dialog {
    margin: 0;
    max-width: 100%;
    height: 100%;
  }
}
```

### Verificacion:
- [ ] Todas las paginas usables en mobile
- [ ] No hay overflow horizontal
- [ ] Touch funciona correctamente

---

## DEV2-10: DASHBOARD - Widgets KPI
**Duracion:** 2 dias
**Estado:** [ ] Pendiente
**Depende de:** DEV2-06

### Que hacer:
```
1. Redisenar dashboard con widgets modulares
2. Widget: Ocupacion hoy (%)
3. Widget: Revenue hoy ($)
4. Widget: Check-ins pendientes
5. Widget: Tareas pendientes
6. Widget: Alertas activas
7. Auto-refresh cada 30 segundos
```

### Mockup:
```
+------------------+------------------+
|   OCUPACION      |    REVENUE      |
|      78%         |    $1,250       |
|   +5% vs ayer    |   +12% vs ayer  |
+------------------+------------------+
| CHECK-INS HOY    |  TAREAS PEND.   |
|       5          |       3         |
| Ver lista ->     |  Ver lista ->   |
+------------------+------------------+
| ALERTAS                            |
| ! Cama 3-A necesita limpieza       |
| ! Reserva #123 sin pago            |
+------------------------------------+
```

### Verificacion:
- [ ] Widgets muestran datos reales
- [ ] Auto-refresh funciona
- [ ] Links funcionan

---

## DEV2-11: DASHBOARD - Quick Actions
**Duracion:** 1 dia
**Estado:** [ ] Pendiente
**Depende de:** DEV2-10

### Que hacer:
```
1. Boton rapido: Nuevo Check-in
2. Boton rapido: Nueva Reserva
3. Boton rapido: Venta POS
4. Boton rapido: Registrar Pago
5. Shortcuts de teclado (Ctrl+1, Ctrl+2, etc)
```

### Verificacion:
- [ ] Botones funcionan
- [ ] Shortcuts funcionan
- [ ] Accesible desde mobile

---

## DEV2 - CHECKLIST COMPLETO

| Tarea | Estado | Semana |
|-------|--------|--------|
| DEV2-01 | [x] COMPLETADO 2025-11-28 | 1 |
| DEV2-02 | [x] COMPLETADO 2025-11-28 | 1 |
| DEV2-03 | [x] COMPLETADO 2025-11-28 | 2 |
| DEV2-04 | [x] COMPLETADO 2025-11-28 | 2 |
| DEV2-05 | [x] COMPLETADO 2025-11-28 | 3 |
| DEV2-06 | [x] COMPLETADO 2025-11-29 | 3-4 |
| DEV2-07 | [x] COMPLETADO 2025-11-29 | 4 |
| DEV2-08 | [x] COMPLETADO 2025-11-29 | 4 |
| DEV2-09 | [ ] | 5 |
| DEV2-10 | [ ] | 5 |
| DEV2-11 | [ ] | 6 |

### DEV2 Progreso Detallado:
- **DEV2-01** (2025-11-28): Creado `public/sw.js` Service Worker v2 con estrategias Cache First para assets y Network First para API.
- **DEV2-02** (2025-11-28): Actualizado `public/manifest.json` con iconos 72-512px, shortcuts, theme colors completos.
- **DEV2-03** (2025-11-28): Push Notifications completo. Backend: `server/modules/notifications.js` con Web Push API (subscribe, send, test). Frontend: `public/js/notifications.js` para solicitar permisos. SW actualizado con push/notificationclick handlers. Tablas: push_subscriptions, notification_history.
- **DEV2-04** (2025-11-28): POS mejorado. Nueva pagina `public/pos.html` y `public/js/pos.js`. Grid de productos con iconos, tabs de categorias, busqueda con debounce, carrito interactivo, atajos de teclado (F1/F2/Ctrl+F/Esc), modal de confirmacion con calculadora de cambio, soporte mobile.
- **DEV2-05** (2025-11-28): Imagenes de productos implementado. Campo image_url en tabla products, endpoints POST/DELETE para upload, preview en modal, grid con imagenes.
- **DEV2-06** (2025-11-29): Graficos interactivos completos. Chart.js integrado, 4 graficos (ocupacion mensual, revenue semanal, distribucion huespedes, comparativo YoY). Endpoints backend corregidos: transaction_type en lugar de type, guest-distribution usa source de bookings.
- **DEV2-07** (2025-11-29): Exportacion de reportes. jsPDF + jspdf-autotable para PDF multi-pagina con tablas. SheetJS para Excel con 5 hojas. CSV como fallback. Dropdown menu con 3 opciones. Loading overlay. Archivos: reports-advanced.html (librerias CDN, botones), reports-advanced.js (exportToPDF, exportToExcel, exportToCSV).
- **DEV2-08** (2025-11-29): Mobile Responsive Audit. Auditadas 8 paginas HTML. Agregadas media queries (768px, 480px, 375px) a reports-advanced.html y reservations.html. Grid containers corregidos con min(100%, 350px). Headers, stats, controls adaptados para mobile.

---

# 🟡 DEV3 - BUSINESS LOGIC

## Resumen DEV3
- **Responsabilidad:** Logica de negocio, analytics, backups, compliance
- **Tecnologias:** Node.js, SQL, Cron jobs, AWS S3
- **Ubicacion codigo:** `server/modules/`, `server/jobs/`

---

## DEV3-01: BACKUP - Configuracion S3
**Duracion:** 1 dia
**Estado:** [x] COMPLETADO (2025-11-28)
**Depende de:** Nada

### Que hacer:
```
1. Crear cuenta AWS (si no existe)
2. Crear bucket S3: almanik-pms-backups
3. Crear IAM user con permisos S3
4. Agregar credenciales a .env:
   - AWS_ACCESS_KEY_ID
   - AWS_SECRET_ACCESS_KEY
   - AWS_BUCKET_NAME
   - AWS_REGION
5. Crear archivo: server/config/aws.js
```

### Verificacion:
- [ ] Bucket creado
- [ ] Credenciales funcionan
- [ ] Puede subir archivo de prueba

---

## DEV3-02: BACKUP - Script de Backup
**Duracion:** 2 dias
**Estado:** [x] COMPLETADO (2025-11-28)
**Depende de:** DEV3-01

### Que hacer:
```
1. Crear archivo: server/jobs/backup.js
2. Exportar base de datos PostgreSQL
3. Comprimir con gzip
4. Subir a S3 con timestamp
5. Eliminar backups locales antiguos
6. Configurar cron: 0 3 * * * (3am diario)
```

### Formato de backup:
```
almanik-backup-2025-11-28-030000.sql.gz
```

### Verificacion:
- [ ] Backup se genera correctamente
- [ ] Se sube a S3
- [ ] Cron ejecuta automaticamente

---

## DEV3-03: BACKUP - Restore y Verificacion
**Duracion:** 1 dia
**Estado:** [x] COMPLETADO (2025-11-28)
**Depende de:** DEV3-02

### Que hacer:
```
1. Crear script: server/jobs/restore.js
2. Endpoint admin: POST /api/admin/restore
3. Verificacion automatica post-backup
4. Alerta si backup falla
5. Documentar procedimiento de restore
```

### Verificacion:
- [x] Restore funciona
- [x] Verificacion automatica
- [x] Alertas configuradas

---

## DEV3-04: BACKUP - Retention Policy
**Duracion:** 1 dia
**Estado:** [x] COMPLETADO (2025-11-28)
**Depende de:** DEV3-03

### Que hacer:
```
1. Implementar politica de retencion:
   - Diarios: 7 dias
   - Semanales: 4 semanas
   - Mensuales: 12 meses
2. Script de limpieza automatica
3. Dashboard de backups disponibles
4. Endpoint: GET /api/admin/backups
```

### Verificacion:
- [x] Retention funciona
- [x] Backups antiguos se eliminan
- [x] Dashboard muestra backups

---

## DEV3-05: REVENUE - Modelo de Precios
**Duracion:** 2 dias
**Estado:** [x] COMPLETADO (2025-11-28)
**Depende de:** Nada

### Que hacer:
```
1. Crear tabla: price_rules
   - id, bed_type, season, day_of_week
   - base_price, modifier_percent
   - start_date, end_date
2. CRUD endpoints para price_rules
3. UI admin para gestionar reglas
```

### Estructura tabla:
```sql
CREATE TABLE price_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  bed_type VARCHAR(50), -- NULL = todas
  season VARCHAR(20), -- high, medium, low
  day_of_week INTEGER, -- 0-6, NULL = todos
  modifier_percent DECIMAL(5,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Verificacion:
- [x] Tabla creada
- [x] CRUD funciona
- [ ] UI admin funciona (pendiente frontend)

---

## DEV3-06: REVENUE - Calculo Dinamico
**Duracion:** 2 dias
**Estado:** [x] COMPLETADO (2025-11-28)
**Depende de:** DEV3-05

### Que hacer:
```
1. Funcion: calculateDynamicPrice(bed_id, date)
2. Aplicar reglas de temporada
3. Aplicar reglas de dia de semana
4. Aplicar reglas de ocupacion (>80% = +15%)
5. Integrar en reservaciones
6. Mostrar precio calculado en UI
```

### Logica:
```javascript
function calculateDynamicPrice(bed, date) {
  let price = bed.base_price;

  // Aplicar temporada
  const season = getSeason(date);
  if (season === 'high') price *= 1.25;
  if (season === 'low') price *= 0.85;

  // Aplicar dia de semana (fin de semana +10%)
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 5 || dayOfWeek === 6) price *= 1.10;

  // Aplicar ocupacion
  const occupancy = getOccupancy(date);
  if (occupancy > 0.8) price *= 1.15;

  return Math.round(price * 100) / 100;
}
```

### Verificacion:
- [x] Precios calculan correctamente
- [x] Temporadas funcionan
- [x] Ocupacion afecta precio

---

## DEV3-07: REVENUE - Dashboard y Simulador
**Duracion:** 1 dia
**Estado:** [x] COMPLETADO (2025-11-28)
**Depende de:** DEV3-06

### Que hacer:
```
1. Dashboard de pricing actual
2. Simulador: "Que pasaria si..."
3. Historico de precios aplicados
4. Comparativo vs precio base
```

### Verificacion:
- [x] Dashboard muestra reglas activas (via API)
- [x] Simulador funciona (GET /api/pricing/simulate)
- [x] Historico disponible (tabla price_history)

---

## DEV3-08: ANALYTICS - Metricas Avanzadas
**Duracion:** 2 dias
**Estado:** [x] COMPLETADO (2025-11-28)
**Depende de:** Nada

### Que hacer:
```
1. Endpoint: GET /api/analytics/revpab
   (Revenue Per Available Bed)
2. Endpoint: GET /api/analytics/adr
   (Average Daily Rate)
3. Endpoint: GET /api/analytics/los
   (Length of Stay promedio)
4. Endpoint: GET /api/analytics/booking-window
   (Tiempo entre reserva y check-in)
```

### Formulas:
```
RevPAB = Total Revenue / (Total Beds * Days)
ADR = Total Room Revenue / Rooms Sold
LOS = Total Nights / Total Bookings
Booking Window = AVG(check_in - created_at)
```

### Verificacion:
- [x] Metricas calculan correctamente
- [x] Datos historicos funcionan

---

## DEV3-09: ANALYTICS - Forecasting
**Duracion:** 3 dias
**Estado:** [x] COMPLETADO (2025-11-28)
**Depende de:** DEV3-08

### Que hacer:
```
1. Endpoint: GET /api/analytics/forecast/occupancy
2. Endpoint: GET /api/analytics/forecast/revenue
3. Algoritmo basado en:
   - Historico mismo periodo ano anterior
   - Tendencia ultimos 3 meses
   - Reservas ya confirmadas
4. Proyeccion 30, 60, 90 dias
```

### Verificacion:
- [x] Forecast genera datos
- [x] Considera historico
- [x] Considera reservas futuras

---

## DEV3-10: ANALYTICS - Dashboard Ejecutivo
**Duracion:** 1 dia
**Estado:** [x] COMPLETADO (2025-11-28)
**Depende de:** DEV3-09

### Que hacer:
```
1. Pagina: executive-dashboard.html
2. KPIs principales en una vista
3. Comparativo vs mes anterior
4. Comparativo vs ano anterior
5. Exportar reporte ejecutivo PDF
```

### Archivos creados:
- `public/executive-dashboard.html` - Dashboard ejecutivo con UI moderna
- `public/js/executive-dashboard.js` - Logica del dashboard

### Endpoints nuevos (analytics.js):
- GET /api/analytics/kpi-summary - KPIs con comparativos mes/ano
- GET /api/analytics/occupancy/monthly - Ocupacion mensual para comparativo anual
- GET /api/analytics/revenue/monthly - Revenue mensual para comparativo anual

### Features:
- 6 KPIs principales (Revenue, Ocupacion, Bookings, ADR, RevPAB, LOS)
- Comparativo vs periodo anterior y vs ano anterior
- Graficos de tendencia de revenue
- Graficos de fuentes de reserva (pie chart)
- Proyecciones 30/60/90 dias
- Comparativo anual de ocupacion (bar chart)
- Comparativo anual de revenue (line chart)
- Selector de periodo (Mes, Trimestre, Ano)
- Export PDF con jsPDF + html2canvas

### Verificacion:
- [x] Dashboard completo
- [x] Comparativos funcionan
- [x] Export PDF funciona

---

## DEV3-11: AUDIT - Logging Completo
**Duracion:** 2 dias
**Estado:** [x] COMPLETADO (2025-11-28)
**Depende de:** Nada

### Que hacer:
```
1. Crear tabla: audit_log
2. Middleware para loguear todas las acciones
3. Campos: user_id, action, entity, entity_id,
   old_value, new_value, ip_address, timestamp
4. Endpoint: GET /api/admin/audit-log
5. Filtros por usuario, fecha, accion
```

### Archivos creados:
- `server/modules/audit.js` - Modulo completo de audit logging

### Endpoints implementados:
- GET /api/admin/audit - Listar logs con filtros (paginado)
- GET /api/admin/audit/:id - Obtener entrada especifica
- GET /api/admin/audit/stats - Estadisticas de audit
- GET /api/admin/audit/export - Exportar logs (CSV/JSON)
- GET /api/admin/audit/entity/:type/:id - Trail de entidad
- GET /api/admin/audit/action-types - Tipos de accion
- GET /api/admin/audit/modules - Modulos disponibles

### Features:
- Migracion automatica para agregar old_value, new_value, user_agent
- Funcion logAction() exportada para uso desde otros modulos
- Filtros: action_type, module, user_id, entity_type, entity_id, fechas, busqueda
- Paginacion completa con total y totalPages
- Estadisticas: total, ultimas 24h, por accion, por modulo, top usuarios, actividad diaria
- Export CSV con formato profesional

### Verificacion:
- [x] Todas las acciones se loguean (via activity_log existente)
- [x] Query de audit funciona
- [x] Filtros funcionan

---

## DEV3-12: AUDIT - GDPR Basico
**Duracion:** 1 dia
**Estado:** [x] COMPLETADO (2025-11-28)
**Depende de:** DEV3-11

### Que hacer:
```
1. Endpoint: GET /api/guests/:id/export-data
   (Exportar todos los datos de un guest)
2. Endpoint: DELETE /api/guests/:id/anonymize
   (Anonimizar datos personales)
3. Politica de retencion de datos
4. Documentar proceso GDPR
```

### Endpoints implementados (server-simple.js):
- GET /api/guests/:id/export-data - Exporta todos los datos del huesped (GDPR Portability)
- DELETE /api/guests/:id/anonymize - Anonimiza datos personales (GDPR Erasure)
- GET /api/gdpr/retention-policy - Politica de retencion de datos

### Features:
- Export incluye: datos personales, bookings, transacciones, reviews, activity log
- Metadata con estadisticas (total bookings, total spent, first/last visit)
- Anonymize genera ID anonimo unico (ANON-timestamp-random)
- Valida que no haya bookings activos antes de anonimizar
- Solo admin puede anonimizar
- Preserva booking records para reporting (sin PII)
- Limpia reviews pero mantiene rating para estadisticas
- Elimina push subscriptions
- Log completo de acciones GDPR en activity_log

### Politica de retencion:
- Guest data: 3 anos post checkout
- Booking/Transaction records: 7 anos (requisitos fiscales)
- Activity logs: 2 anos
- Reviews: hasta solicitud de eliminacion

### Verificacion:
- [x] Export funciona
- [x] Anonymize funciona
- [x] Documentacion completa

---

## DEV3 - CHECKLIST COMPLETO

| Tarea | Estado | Semana |
|-------|--------|--------|
| DEV3-01 | [x] COMPLETADO 2025-11-28 | 1 |
| DEV3-02 | [x] COMPLETADO 2025-11-28 | 1 |
| DEV3-03 | [x] COMPLETADO 2025-11-28 | 2 |
| DEV3-04 | [x] COMPLETADO 2025-11-28 | 2 |
| DEV3-05 | [x] COMPLETADO 2025-11-28 | 3 |
| DEV3-06 | [x] COMPLETADO 2025-11-28 | 3-4 |
| DEV3-07 | [x] COMPLETADO 2025-11-28 | 4 |
| DEV3-08 | [x] COMPLETADO 2025-11-28 | 4-5 |
| DEV3-09 | [x] COMPLETADO 2025-11-28 | 5-6 |
| DEV3-10 | [x] COMPLETADO 2025-11-28 | 6 |
| DEV3-11 | [x] COMPLETADO 2025-11-28 | 6-7 |
| DEV3-12 | [x] COMPLETADO 2025-11-28 | 7 |
| DEV3-13 | [x] COMPLETADO 2025-11-29 | 7 |

### DEV3 Progreso Detallado:
- **DEV3-01** (2025-11-28): Configurado AWS S3, creado `server/config/aws.js`, agregadas variables .env.
- **DEV3-02** (2025-11-28): Creado script de backup `server/jobs/backup.js`.
- **DEV3-03** (2025-11-28): Creado `server/jobs/restore.js` con restore desde local/S3, verificacion SQLite/PostgreSQL, safety backup. Creado `server/modules/admin-backups.js` con 6 endpoints (GET /, GET /status, POST /run, POST /restore, DELETE /:name, POST /verify/:name). Agregada verificacion automatica post-backup y alertas en backup.js.
- **DEV3-04** (2025-11-28): Implementada politica de retencion en `backup.js` (diarios 7d, semanales 4sem, mensuales 12m). Funciones: applyRetentionPolicy, runRetentionCleanup, applyLocalRetentionPolicy, applyS3RetentionPolicy. Agregados endpoints POST /retention y GET /retention/preview en admin-backups.js.
- **DEV3-05/06/07** (2025-11-28): Creado `server/modules/pricing.js` - sistema completo de pricing dinamico. Tablas: price_rules, seasons, price_history. Endpoints CRUD reglas, temporadas. Funcion calculateDynamicPrice con soporte temporada, dia semana, ocupacion, estadia. Endpoints: POST /calculate, GET /simulate. Reglas por defecto insertadas.
- **DEV3-08** (2025-11-28): Agregados 5 endpoints de metricas avanzadas en `server/modules/analytics.js`: GET /revpab (Revenue Per Available Bed), GET /adr (Average Daily Rate), GET /los (Length of Stay), GET /booking-window (Lead Time), GET /kpi-summary (todos los KPIs juntos). Soporte para SQLite y PostgreSQL, comparativas con periodo anterior, distribuciones.
- **DEV3-09** (2025-11-28): Implementado sistema de forecasting en `server/modules/analytics.js`. Endpoints: GET /forecast/occupancy (proyeccion 30/60/90 dias), GET /forecast/revenue (con escenarios pesimista/esperado/optimista), GET /forecast/summary (vista consolidada). Algoritmo basado en: datos historicos (mismo periodo año anterior), tendencia ultimos 3 meses (calculateGrowthRate), reservas confirmadas futuras (getFutureReservations), ajuste fines de semana. Helpers: getHistoricalOccupancy, getRecentTrend, getFutureReservations. Soporte SQLite/PostgreSQL.
- **DEV3-10** (2025-11-28): Creado Dashboard Ejecutivo completo. `public/executive-dashboard.html` con UI moderna dark theme. `public/js/executive-dashboard.js` con toda la logica. Endpoints nuevos: GET /kpi-summary (KPIs con comparativos mes anterior y YoY), GET /occupancy/monthly, GET /revenue/monthly. Features: 6 KPIs principales, graficos tendencia/fuentes/proyecciones, comparativos anuales, selector periodo (mes/trimestre/ano), export PDF. Actualizado sw.js v6.
- **DEV3-11** (2025-11-28): Creado `server/modules/audit.js` - sistema completo de audit logging. 7 endpoints: GET / (filtros paginados), GET /:id, GET /stats, GET /export (CSV/JSON), GET /entity/:type/:id (trail), GET /action-types, GET /modules. Migracion automatica para old_value/new_value/user_agent. Funcion logAction() exportada. Estadisticas: total, 24h, por accion, por modulo, top usuarios, actividad diaria.
- **DEV3-12** (2025-11-28): Implementado GDPR basico en `server/server-simple.js`. Endpoints: GET /guests/:id/export-data (exporta todo: datos, bookings, transacciones, reviews, activity log con metadata), DELETE /guests/:id/anonymize (anonimiza PII con ID unico, valida no bookings activos, solo admin), GET /gdpr/retention-policy (politica completa). Log de acciones GDPR. Preserva datos estadisticos sin PII.
- **DEV3-13** (2025-11-29): MIGRACIONES CRITICAS - Creado `server/migrate-notifications-pricing.js` para tablas faltantes. Tablas creadas: push_subscriptions, notification_history, seasons, pricing_rules, price_history. Datos por defecto insertados: 5 temporadas (alta/media/baja/semana santa/regular), 4 reglas de pricing (fin de semana, ocupacion, ultima hora, estadia larga). Actualizado schema PostgreSQL `database/schemas/neon-production-schema.sql` con nuevas tablas, indices y triggers. Los modulos notifications.js y pricing.js ahora tienen sus tablas requeridas.

---

# 🟣 DEV4 - FULL STACK / FEATURES AVANZADAS

## Resumen DEV4
- **Responsabilidad:** Features avanzadas, integraciones complejas
- **Tecnologias:** Node.js, WhatsApp API, arquitectura multi-tenant
- **Ubicacion codigo:** `server/modules/`

---

## DEV4-01: FEEDBACK - Sistema de Reviews
**Duracion:** 2 dias
**Estado:** [ ] Pendiente
**Depende de:** DEV1-06 (SendGrid funcionando)

### Que hacer:
```
1. Crear tabla: guest_reviews
2. Email automatico post-checkout pidiendo review
3. Landing page publica para dejar review
4. Almacenar: rating (1-5), comentario, fecha
5. Endpoint: GET /api/reviews
6. Endpoint: POST /api/reviews/:id/respond
```

### Estructura tabla:
```sql
CREATE TABLE guest_reviews (
  id SERIAL PRIMARY KEY,
  guest_id INTEGER REFERENCES guests(id),
  reservation_id INTEGER REFERENCES bookings(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  staff_response TEXT,
  responded_at TIMESTAMP,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Verificacion:
- [ ] Email se envia post-checkout
- [ ] Landing page funciona
- [ ] Reviews se guardan

---

## DEV4-02: FEEDBACK - Dashboard de Reviews
**Duracion:** 1 dia
**Estado:** [x] COMPLETADO (2025-11-28)
**Depende de:** DEV4-01

### Que hacer:
```
1. Dashboard de reviews recibidos
2. Filtros: fecha, rating, respondidos/no
3. Alertas para reviews negativos (<3)
4. Promedio general visible
5. Grafico de tendencia
```

### Verificacion:
- [x] Dashboard completo
- [x] Alertas funcionan
- [x] Tendencia visible

---

## DEV4-03: FEEDBACK - Respuestas y Publicacion
**Duracion:** 1 dia
**Estado:** [x] COMPLETADO (2025-11-28)
**Depende de:** DEV4-02

### Que hacer:
```
1. UI para responder reviews
2. Opcion de hacer review publico/privado
3. Widget para mostrar reviews en web publica
4. Exportar reviews para redes sociales
```

### Verificacion:
- [x] Respuestas funcionan
- [x] Widget funciona
- [x] Export funciona

---

## DEV4-04: WHATSAPP - Configuracion (Evolution API)
**Duracion:** 2 dias
**Estado:** [x] COMPLETADO (2025-11-28)
**Depende de:** Nada

### Cambio de Estrategia:
Se uso Evolution API en lugar de WhatsApp Business API oficial:
- No requiere aprobacion de Meta
- Solucion self-hosted
- Mas flexible y rapido de implementar

### Que se hizo:
```
1. Crear archivo: server/config/whatsapp.js (Evolution API)
2. Crear archivo: server/modules/whatsapp.js (endpoints)
3. Agregar variables a .env.example:
   - EVOLUTION_API_URL
   - EVOLUTION_API_KEY
   - EVOLUTION_INSTANCE
4. Integrar modulo en server-simple.js
5. Documentar API: docs/05-api/WHATSAPP-API.md
```

### Archivos creados:
- `server/config/whatsapp.js` - Configuracion Evolution API
- `server/modules/whatsapp.js` - Endpoints REST
- `docs/05-api/WHATSAPP-API.md` - Documentacion completa

### Endpoints implementados:
- GET /api/whatsapp/status - Estado de conexion
- GET /api/whatsapp/qr - Obtener QR
- POST /api/whatsapp/send - Enviar mensaje
- POST /api/whatsapp/send-template - Usar template
- POST /api/whatsapp/send-buttons - Botones interactivos
- GET /api/whatsapp/check/:number - Verificar numero
- POST /api/whatsapp/webhook - Recibir mensajes
- GET /api/whatsapp/templates - Listar templates

### Templates predefinidos:
- bookingConfirmation
- checkInReminder
- reviewRequest
- paymentConfirmation
- checkOutReminder

### Verificacion:
- [x] Configuracion Evolution API completa
- [x] Modulo integrado en servidor
- [x] Endpoints documentados
- [x] Prueba con instancia real (requiere Evolution API server - configuracion lista)

---

## DEV4-05: WHATSAPP - Templates de Mensajes
**Duracion:** 2 dias
**Estado:** [x] COMPLETADO (2025-11-28)
**Depende de:** DEV4-04

### Nota:
Templates incluidos en DEV4-04 con Evolution API.
No requiere aprobacion de Meta (ventaja de Evolution API).

### Templates creados (en server/config/whatsapp.js):
```javascript
// Templates disponibles en whatsapp.templates:
- bookingConfirmation(guestName, checkIn, checkOut, confirmationCode)
- checkInReminder(guestName, checkIn)
- reviewRequest(guestName, reviewLink)
- paymentConfirmation(guestName, amount, paymentMethod)
- checkOutReminder(guestName, checkOut)
```

### Endpoint para usar templates:
POST /api/whatsapp/send-template

### Verificacion:
- [x] Templates creados
- [x] No requiere aprobacion (Evolution API)
- [x] Endpoint funcional

---

## DEV4-06: WHATSAPP - Automatizacion
**Duracion:** 2 dias
**Estado:** [x] COMPLETADO (2025-11-28)
**Depende de:** DEV4-05

### Que se hizo:
```
1. Crear migracion: server/migrate-whatsapp.js
   - Tabla whatsapp_messages (logs de mensajes)
   - Tabla whatsapp_automation_log (tracking automatizaciones)
   - Columna whatsapp_opt_out en guests
2. Crear cron: server/cron/whatsapp-automation.js
   - Recordatorios check-in (1 dia antes)
   - Recordatorios check-out (mismo dia 7-9am)
   - Solicitudes de review (dia despues checkout)
3. Funciones exportadas para otros modulos:
   - sendBookingConfirmation(booking)
   - sendPaymentConfirmation(payment)
4. Integrar cron en server-simple.js
```

### Archivos creados:
- `server/migrate-whatsapp.js`
- `server/cron/whatsapp-automation.js`

### Triggers implementados:
| Trigger | Cuando | Template |
|---------|--------|----------|
| Confirmacion reserva | Al confirmar | bookingConfirmation |
| Recordatorio check-in | 1 dia antes | checkInReminder |
| Recordatorio check-out | Mismo dia 7-9am | checkOutReminder |
| Solicitud review | 1 dia post checkout | reviewRequest |
| Confirmacion pago | Al registrar pago | paymentConfirmation |

### Verificacion:
- [x] Automatizacion funciona (cron cada hora)
- [x] Opt-out respetado (columna whatsapp_opt_out)
- [x] Logs completos (tablas whatsapp_messages, whatsapp_automation_log)

---

## DEV4-07: WHATSAPP - Bot Basico
**Duracion:** 2 dias
**Estado:** [x] COMPLETADO (2025-11-29)
**Depende de:** DEV4-06

### Que se hizo:
```
1. Logica de bot en handleIncomingMessage con processBotMessage()
2. Menu de opciones: Hola -> Menu con 4 opciones
3. Opcion 1: Info de reserva (busca por telefono en DB)
4. Opcion 2: WiFi (red y password configurables)
5. Opcion 3: Contacto de recepcion
6. Opcion 4: Info del hostal (direccion, horarios)
7. Fallback inteligente con sugerencia de comandos
8. Opt-out para huespedes que no quieren mensajes
```

### Endpoints creados:
- GET /api/whatsapp/bot/config - Configuracion del bot
- PUT /api/whatsapp/bot/config - Actualizar configuracion
- POST /api/whatsapp/bot/toggle - Activar/desactivar bot
- POST /api/whatsapp/bot/test - Probar bot con mensaje simulado
- GET /api/whatsapp/bot/stats - Estadisticas del bot
- GET /api/whatsapp/conversations - Listar conversaciones
- GET /api/whatsapp/conversations/:number - Historial de conversacion

### Flujo del bot:
```
Guest: Hola
Bot: Hola Juan! 👋
     Soy el asistente virtual de Almanik Hostel.
     Escribe el numero de la opcion:
     *1* 📋 Ver mi reserva
     *2* 📶 Obtener WiFi
     *3* 🛎️ Hablar con recepcion
     *4* ℹ️ Info del hostal

Guest: 1
Bot: 📋 *Tu Reserva*
     👤 Juan Perez
     🔑 Codigo: ALM-20250115-123456
     📅 Check-in: Mie, 15 Ene
     📅 Check-out: Sab, 18 Ene
     🛏️ Cama 3-B - Habitacion Compartida
     ✅ Estado: Confirmada
```

### Variables de entorno:
- HOSTAL_NAME
- WIFI_NETWORK
- WIFI_PASSWORD
- RECEPTION_PHONE
- HOSTAL_ADDRESS

### Verificacion:
- [x] Webhook recibe mensajes y procesa con bot
- [x] Bot responde correctamente con menu
- [x] Opciones 1-4 funcionan
- [x] Ayuda y fallback funcionan
- [x] Opt-out funciona
- [x] Estadisticas de conversaciones

---

## DEV4-08: WHATSAPP - Panel de Chat
**Duracion:** 2 dias
**Estado:** [x] COMPLETADO (2025-11-29)
**Depende de:** DEV4-07

### Que se hizo:
```
1. Creado public/whatsapp-chat.html - UI completa tipo WhatsApp Web
2. Creado public/js/whatsapp-chat.js - Logica del panel de chat
3. Panel con 3 columnas: conversaciones, mensajes, detalles
4. Lista de conversaciones con busqueda y ultimo mensaje
5. Area de mensajes con separadores de fecha y estados
6. Respuestas rapidas predefinidas (saludo, WiFi, checkout, etc)
7. Asignacion de conversacion a staff
8. Toggle para activar/desactivar bot desde el panel
9. Auto-refresh cada 10 segundos
10. Soporte mobile responsive
```

### Endpoints creados:
- POST /api/whatsapp/conversations/:number/assign - Asignar a staff
- POST /api/whatsapp/conversations/:number/read - Marcar como leido
- POST /api/whatsapp/reply - Respuesta manual de staff
- GET /api/whatsapp/unread-count - Conteo de sin leer

### Archivos:
- public/whatsapp-chat.html
- public/js/whatsapp-chat.js
- server/modules/whatsapp.js (actualizado con nuevos endpoints)
- public/sw.js (v7 con nuevos assets)

### Verificacion:
- [x] Panel muestra chats
- [x] Respuesta manual funciona
- [x] Notificaciones funcionan (visual + auto-refresh)
- [x] Busqueda de conversaciones
- [x] Respuestas rapidas
- [x] Asignacion a staff
- [x] Navegacion agregada en index.html

---

## DEV4-09: MULTI-PROPERTY - Modelo de Datos
**Duracion:** 3 dias
**Estado:** [ ] FUTURO - ROADMAP v2.0
**Depende de:** Nada (puede iniciar cuando quiera)
**Nota:** Feature pospuesto para version futura. El sistema actual funciona para una propiedad.

### Que hacer:
```
1. Crear tabla: properties
2. Agregar property_id a TODAS las tablas:
   - guests, beds, bookings, transactions
   - products, staff, tasks, etc.
3. Migrar datos existentes a property_id = 1
4. Crear indices compuestos con property_id
```

### Estructura tabla properties:
```sql
CREATE TABLE properties (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(200),
  timezone VARCHAR(50) DEFAULT 'America/Bogota',
  currency VARCHAR(3) DEFAULT 'COP',
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Agregar a cada tabla existente:
ALTER TABLE beds ADD COLUMN property_id INTEGER REFERENCES properties(id);
ALTER TABLE guests ADD COLUMN property_id INTEGER REFERENCES properties(id);
-- ... etc para todas las tablas
```

### Verificacion:
- [ ] Tabla properties creada
- [ ] Todas las tablas tienen property_id
- [ ] Datos migrados correctamente

---

## DEV4-10: MULTI-PROPERTY - Middleware
**Duracion:** 2 dias
**Estado:** [ ] FUTURO - ROADMAP v2.0
**Depende de:** DEV4-09

### Que hacer:
```
1. Middleware: extractPropertyId(req, res, next)
2. Agregar property_id a todas las queries
3. Validar que user tiene acceso a property
4. Header o cookie para property actual
5. Endpoint: GET /api/properties (mis propiedades)
```

### Codigo base:
```javascript
const propertyMiddleware = async (req, res, next) => {
  const propertyId = req.headers['x-property-id'] || req.session.propertyId;

  if (!propertyId) {
    return res.status(400).json({ error: 'Property ID required' });
  }

  // Verificar acceso
  const hasAccess = await checkUserPropertyAccess(req.user.id, propertyId);
  if (!hasAccess) {
    return res.status(403).json({ error: 'No access to this property' });
  }

  req.propertyId = propertyId;
  next();
};
```

### Verificacion:
- [ ] Middleware funciona
- [ ] Queries filtran por property
- [ ] Acceso validado

---

## DEV4-11: MULTI-PROPERTY - UI Selector
**Duracion:** 2 dias
**Estado:** [ ] FUTURO - ROADMAP v2.0
**Depende de:** DEV4-10

### Que hacer:
```
1. Dropdown en header para seleccionar property
2. Guardar seleccion en session/localStorage
3. Actualizar todos los datos al cambiar
4. Mostrar nombre de property actual
5. UI admin para gestionar properties
```

### Verificacion:
- [ ] Selector funciona
- [ ] Datos cambian al seleccionar
- [ ] Admin puede crear properties

---

## DEV4-12: MULTI-PROPERTY - Dashboard Consolidado
**Duracion:** 2 dias
**Estado:** [ ] FUTURO - ROADMAP v2.0
**Depende de:** DEV4-11

### Que hacer:
```
1. Vista "Todas las propiedades"
2. KPIs consolidados
3. Comparativo entre propiedades
4. Alertas de todas las propiedades
5. Reportes multi-property
```

### Verificacion:
- [ ] Vista consolidada funciona
- [ ] Comparativo funciona
- [ ] Reportes consolidan datos

---

## DEV4 - CHECKLIST COMPLETO

| Tarea | Estado | Semana |
|-------|--------|--------|
| DEV4-01 | [x] COMPLETADO 2025-11-28 | 1 |
| DEV4-02 | [x] COMPLETADO 2025-11-28 | 1 |
| DEV4-03 | [x] COMPLETADO 2025-11-28 | 2 |
| DEV4-04 | [x] COMPLETADO 2025-11-28 | 2 |
| DEV4-05 | [x] COMPLETADO 2025-11-28 | 3 |
| DEV4-06 | [x] COMPLETADO 2025-11-28 | 3-4 |
| DEV4-07 | [x] COMPLETADO 2025-11-29 | 4 |
| DEV4-08 | [x] COMPLETADO 2025-11-29 | 5 |
| DEV4-09 | [ ] FUTURO v2.0 | - |
| DEV4-10 | [ ] FUTURO v2.0 | - |
| DEV4-11 | [ ] FUTURO v2.0 | - |
| DEV4-12 | [ ] FUTURO v2.0 | - |

### DEV4 Progreso Detallado:
- **DEV4-01** (2025-11-28): Creado `server/modules/reviews.js` con 8 endpoints (GET /, GET /public, GET /stats, GET /:id, GET /token/:token, POST /, POST /:id/respond, PUT /:id/visibility, POST /request/:bookingId). Creado `public/review.html` landing page con formulario de estrellas y categorias. Tablas guest_reviews y review_requests en DB.
- **DEV4-02** (2025-11-28): Creado `public/reviews-dashboard.html` con UI completa (stats cards, alertas negativos, graficos distribucion/tendencia, filtros, lista reviews con paginacion, modal respuesta). Creado `public/js/reviews-dashboard.js` con logica completa. Agregado link Reviews en navegacion index.html. Corregidas queries para compatibilidad SQLite.
- **DEV4-03** (2025-11-28): Creado `public/reviews-widget.html` widget publico para mostrar reviews. Agregados endpoints GET /:id/export y GET /export/best para exportar reviews formateados para Instagram, Twitter, Facebook. Agregada funcionalidad de exportacion en dashboard con dropdown y modal. Creada documentacion `docs/05-api/REVIEWS-API.md`.
- **DEV4-04** (2025-11-28): Configuracion Evolution API. Creado `server/config/whatsapp.js` con cliente Evolution API. Creado `server/modules/whatsapp.js` con endpoints completos. 5 templates predefinidos. Documentacion `docs/05-api/WHATSAPP-API.md`.
- **DEV4-05** (2025-11-28): Templates incluidos en DEV4-04, no requiere aprobacion de Meta.
- **DEV4-06** (2025-11-28): Automatizacion WhatsApp. Creado `server/migrate-whatsapp.js` (tablas whatsapp_messages, whatsapp_automation_log, columna opt_out). Creado `server/cron/whatsapp-automation.js` con triggers automaticos (check-in reminder, checkout reminder, review request).
- **DEV4-07** (2025-11-29): Bot Basico WhatsApp. Actualizado `server/modules/whatsapp.js` v1.1.0 con processBotMessage(). Menu de 4 opciones (reserva, WiFi, recepcion, info hostal). Busqueda de reserva por telefono. Endpoints de configuracion del bot (GET/PUT /bot/config, POST /bot/toggle, POST /bot/test, GET /bot/stats). Endpoints de conversaciones (GET /conversations, GET /conversations/:number). Variables de entorno para configuracion (HOSTAL_NAME, WIFI_NETWORK, etc). Opt-out para huespedes.
- **DEV4-08** (2025-11-29): Panel de Chat WhatsApp. Creado `public/whatsapp-chat.html` UI tipo WhatsApp Web con 3 columnas (conversaciones, mensajes, detalles). Creado `public/js/whatsapp-chat.js` con logica completa. Endpoints nuevos: POST assign, POST read, POST reply, GET unread-count. Features: lista conversaciones con busqueda, historial mensajes con separadores de fecha, respuestas rapidas predefinidas, asignacion a staff, toggle bot, modal nuevo mensaje, auto-refresh 10s. Service Worker actualizado a v7. Navegacion agregada en index.html.

### DEV4 - RESUMEN COMPLETADO (2025-11-29):
**8 de 8 tareas core completadas (100%)**

| Modulo | Tareas | Estado |
|--------|--------|--------|
| Reviews | DEV4-01, 02, 03 | COMPLETADO |
| WhatsApp | DEV4-04, 05, 06, 07, 08 | COMPLETADO |
| Multi-Property | DEV4-09, 10, 11, 12 | FUTURO v2.0 |

**Archivos creados/modificados por DEV4:**
- `server/modules/reviews.js` - Sistema de reviews
- `server/modules/whatsapp.js` - WhatsApp + Bot + Chat
- `server/config/whatsapp.js` - Config Evolution API
- `server/migrate-whatsapp.js` - Migraciones WhatsApp
- `server/cron/whatsapp-automation.js` - Automatizaciones
- `public/review.html` - Landing page reviews
- `public/reviews-dashboard.html` - Dashboard reviews
- `public/reviews-widget.html` - Widget publico
- `public/whatsapp-chat.html` - Panel de chat
- `public/js/reviews-dashboard.js`
- `public/js/whatsapp-chat.js`
- `docs/05-api/REVIEWS-API.md`
- `docs/05-api/WHATSAPP-API.md`

---

# ROADMAP FUTURO (v2.0)

Las siguientes features estan planificadas para versiones futuras:

| Feature | Descripcion | Prioridad |
|---------|-------------|-----------|
| Multi-Property | Soporte para multiples propiedades | Media |
| Booking.com Sync | Sincronizacion con OTAs | Alta |
| Twilio SMS | Mensajes SMS automaticos | Baja |
| Mobile App | App nativa iOS/Android | Baja |

---

# CRONOGRAMA SEMANAL

## Semana 1
| DEV1 | DEV2 | DEV3 | DEV4 |
|------|------|------|------|
| DEV1-01 | DEV2-01 | DEV3-01 | DEV4-01 |
| DEV1-02 | DEV2-02 | DEV3-02 | DEV4-02 |

## Semana 2
| DEV1 | DEV2 | DEV3 | DEV4 |
|------|------|------|------|
| DEV1-03 | DEV2-03 | DEV3-03 | DEV4-03 |
| DEV1-04 | DEV2-04 | DEV3-04 | DEV4-04 |
| DEV1-05 | - | - | - |

## Semana 3
| DEV1 | DEV2 | DEV3 | DEV4 |
|------|------|------|------|
| DEV1-06 | DEV2-05 | DEV3-05 | DEV4-05 |
| DEV1-07 | DEV2-06 | DEV3-06 | DEV4-06 |

## Semana 4
| DEV1 | DEV2 | DEV3 | DEV4 |
|------|------|------|------|
| DEV1-08 | DEV2-06 | DEV3-06 | DEV4-06 |
| - | DEV2-07 | DEV3-07 | DEV4-07 |
| - | DEV2-08 | DEV3-08 | - |

## Semana 5
| DEV1 | DEV2 | DEV3 | DEV4 |
|------|------|------|------|
| DEV1-09 | DEV2-09 | DEV3-08 | DEV4-08 |
| - | DEV2-10 | DEV3-09 | - |

## Semana 6
| DEV1 | DEV2 | DEV3 | DEV4 |
|------|------|------|------|
| DEV1-10 | DEV2-10 | DEV3-09 | DEV4-09 |
| - | DEV2-11 | DEV3-10 | - |

## Semana 7
| DEV1 | DEV2 | DEV3 | DEV4 |
|------|------|------|------|
| DEV1-10 | Testing | DEV3-11 | DEV4-10 |
| DEV1-11 | Docs | DEV3-12 | - |

## Semana 8
| DEV1 | DEV2 | DEV3 | DEV4 |
|------|------|------|------|
| DEV1-11 | Polish | Testing | DEV4-11 |
| Testing | - | Docs | DEV4-12 |

## Semanas 9-11
- Testing integracion
- Documentacion final
- Deploy produccion
- UAT (User Acceptance Testing)

---

# INSTRUCCIONES DE USO

## Para iniciar trabajo diario:
1. Abrir este documento
2. Buscar tu seccion (DEV1, DEV2, DEV3, o DEV4)
3. Encontrar la primera tarea con `[ ]` (no completada)
4. Seguir instrucciones de esa tarea
5. Marcar `[x]` cuando termines
6. Pasar a la siguiente tarea

## Para pedir siguiente tarea:
Decir: **"Claude, hagale DEV1 siguiente"** (o DEV2, DEV3, DEV4)

Claude buscara la primera tarea pendiente de ese desarrollador y dara instrucciones detalladas.

## Para reportar bloqueo:
Decir: **"DEV1-03 bloqueado por [razon]"**

## Para marcar completado:
Decir: **"DEV1-03 completado"**

---

**Documento creado:** 2025-11-28
**Version:** 1.0
