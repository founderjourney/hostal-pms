# SMS API - Twilio Integration

**Version:** 1.0.0
**Base URL:** `/api/sms`
**Fecha:** 2025-11-29
**Responsable:** DEV1

---

## Resumen

El modulo de SMS maneja el envio de mensajes de texto via Twilio. Soporta:
- Envio de SMS individuales
- Envio masivo (hasta 100 destinatarios)
- SMS de prueba para verificar configuracion
- Templates predefinidos para notificaciones automaticas
- Historial de mensajes enviados

---

## Configuracion

### Variables de Entorno Requeridas

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxx      # Account SID de Twilio
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxx  # Auth Token de Twilio
TWILIO_PHONE_NUMBER=+1234567890     # Numero Twilio (formato E.164)
```

### Pasos de Configuracion

1. Crear cuenta en [Twilio](https://www.twilio.com)
2. Obtener Account SID y Auth Token desde [Console](https://console.twilio.com)
3. Comprar un numero de telefono en [Phone Numbers](https://console.twilio.com/us1/develop/phone-numbers)
4. Agregar variables a `.env`

### Archivos

- `server/config/twilio.js` - Configuracion del cliente Twilio
- `server/modules/sms.js` - Endpoints del modulo

---

## Endpoints

### GET /status

Verifica el estado del servicio de SMS.

**Autenticacion:** No requerida

**Response (configurado):**
```json
{
  "module": "sms",
  "version": "1.0.0",
  "twilio_enabled": true,
  "phone_number": "+1234567890",
  "endpoints": [
    "GET /status",
    "POST /send",
    "POST /send-bulk",
    "POST /test",
    "GET /history",
    "GET /balance",
    "GET /templates",
    "GET /templates/:id",
    "POST /send-template"
  ],
  "templates_available": 5
}
```

---

### POST /send

Envia un SMS individual.

**Autenticacion:** Requerida

**Request Body:**
```json
{
  "to": "+573001234567",
  "body": "Hola! Tu reserva ha sido confirmada.",
  "reservation_id": 123,
  "guest_id": 45
}
```

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| to | string | Si | Numero destino (formato E.164 o local) |
| body | string | Si | Contenido del mensaje (max 1600 chars) |
| reservation_id | number | No | ID de reservacion asociada |
| guest_id | number | No | ID de huesped asociado |

**Response:**
```json
{
  "success": true,
  "sid": "SMxxxxxxxxxxxxx",
  "to": "+573001234567",
  "status": "queued"
}
```

**Notas:**
- El numero se formatea automaticamente a E.164
- Mensajes >160 chars se dividen en multiples SMS
- Costo aproximado: $0.05-0.10 USD por SMS

---

### POST /send-bulk

Envia SMS a multiples destinatarios.

**Autenticacion:** Requerida

**Request Body:**
```json
{
  "to": [
    "+573001234567",
    "+573009876543",
    "+573005555555"
  ],
  "body": "Promocion especial! 20% de descuento en tu proxima estadia."
}
```

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| to | string[] | Si | Array de numeros (max 100) |
| body | string | Si | Contenido del mensaje |

**Response:**
```json
{
  "success": true,
  "sent": 3,
  "failed": 0,
  "errors": [],
  "recipients": 3
}
```

---

### POST /test

Envia un SMS de prueba para verificar la configuracion.

**Autenticacion:** Requerida

**Request Body:**
```json
{
  "to": "+573001234567"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test SMS sent successfully",
  "sid": "SMxxxxxxxxxxxxx",
  "to": "+573001234567",
  "from": "+1234567890"
}
```

---

### GET /history

Obtiene historial de SMS enviados desde la base de datos.

**Autenticacion:** Requerida

**Query Parameters:**
| Parametro | Tipo | Descripcion |
|-----------|------|-------------|
| reservation_id | number | Filtrar por reservacion |
| guest_id | number | Filtrar por huesped |
| limit | number | Limite de resultados (default: 50) |

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "id": 1,
      "to_phone": "+573001234567",
      "from_phone": "+1234567890",
      "body": "Hola! Tu reserva...",
      "template_id": "booking_confirmation",
      "status": "sent",
      "twilio_sid": "SMxxxxxxxxxxxxx",
      "reservation_id": 123,
      "created_at": "2025-11-29T12:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

### GET /balance

Obtiene el balance de la cuenta Twilio.

**Autenticacion:** Requerida

**Response:**
```json
{
  "success": true,
  "balance": "25.50",
  "currency": "USD"
}
```

---

## Templates

### GET /templates

Lista todos los templates de SMS disponibles.

**Autenticacion:** Requerida

**Response:**
```json
{
  "success": true,
  "templates": [
    {
      "id": "booking_confirmation",
      "name": "Confirmación de Reserva",
      "trigger": "reservation_confirmed",
      "variables": ["guest_name", "check_in", "confirmation_code", "hostal_name"],
      "body": "Hola {{guest_name}}! Tu reserva en {{hostal_name}} está confirmada...",
      "length": 145
    },
    {
      "id": "checkin_reminder",
      "name": "Recordatorio Check-in",
      "trigger": "day_before_checkin",
      "variables": ["guest_name", "hostal_name", "hostal_address"],
      "body": "Hola {{guest_name}}! Mañana te esperamos en {{hostal_name}}...",
      "length": 132
    },
    {
      "id": "checkout_reminder",
      "name": "Recordatorio Check-out",
      "trigger": "checkout_day",
      "variables": ["guest_name", "checkout_time"],
      "body": "Hola {{guest_name}}! Hoy es tu check-out antes de las {{checkout_time}}...",
      "length": 120
    },
    {
      "id": "wifi_credentials",
      "name": "Credenciales WiFi",
      "trigger": "post_checkin",
      "variables": ["guest_name", "wifi_network", "wifi_password"],
      "body": "Hola {{guest_name}}! WiFi: {{wifi_network}} | Password: {{wifi_password}}...",
      "length": 95
    },
    {
      "id": "payment_confirmation",
      "name": "Confirmación de Pago",
      "trigger": "payment_completed",
      "variables": ["guest_name", "amount", "receipt_number"],
      "body": "Hola {{guest_name}}! Pago recibido: {{amount}}. Recibo #{{receipt_number}}...",
      "length": 88
    }
  ],
  "count": 5
}
```

---

### POST /send-template

Envia SMS usando un template predefinido.

**Autenticacion:** Requerida

**Request Body:**
```json
{
  "template_id": "booking_confirmation",
  "to": "+573001234567",
  "data": {
    "guest_name": "Juan",
    "check_in": "15 Dic",
    "confirmation_code": "ALM-123456",
    "hostal_name": "Almanik Hostel"
  },
  "reservation_id": 123,
  "guest_id": 45
}
```

**Response:**
```json
{
  "success": true,
  "template_id": "booking_confirmation",
  "template_name": "Confirmación de Reserva",
  "to": "+573001234567",
  "sid": "SMxxxxxxxxxxxxx",
  "status": "queued"
}
```

---

### POST /preview-template

Previsualiza un template renderizado sin enviarlo.

**Autenticacion:** Requerida

**Request Body:**
```json
{
  "template_id": "wifi_credentials",
  "data": {
    "guest_name": "María",
    "wifi_network": "AlmanikGuest",
    "wifi_password": "hostal2025"
  }
}
```

**Response:**
```json
{
  "success": true,
  "template_id": "wifi_credentials",
  "body": "Hola María! WiFi: AlmanikGuest | Password: hostal2025. Si necesitas algo, estamos en recepción!",
  "length": 98,
  "segments": 1
}
```

---

## Formato de Numeros

El modulo acepta numeros en varios formatos y los convierte automaticamente a E.164:

| Input | Output |
|-------|--------|
| `+573001234567` | `+573001234567` |
| `3001234567` | `+573001234567` |
| `573001234567` | `+573001234567` |
| `03001234567` | `+573001234567` |
| `(300) 123-4567` | `+573001234567` |

El codigo de pais por defecto es Colombia (+57). Para otros paises, usa el formato completo con `+`.

---

## Base de Datos

### Tabla: sms_messages

```sql
CREATE TABLE sms_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  to_phone TEXT NOT NULL,
  from_phone TEXT,
  body TEXT,
  template_id TEXT,
  status TEXT DEFAULT 'sent',
  twilio_sid TEXT,
  reservation_id INTEGER,
  guest_id INTEGER,
  sms_type TEXT DEFAULT 'transactional',
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reservation_id) REFERENCES bookings(id),
  FOREIGN KEY (guest_id) REFERENCES guests(id)
);
```

---

## Funciones Helper

El modulo exporta funciones helper para uso automatizado:

```javascript
const smsModule = require('./modules/sms');

// Enviar confirmacion de reserva
await smsModule.sendBookingConfirmationSMS(app, booking, guest);

// Enviar recordatorio de check-in
await smsModule.sendCheckinReminderSMS(app, booking, guest);

// Enviar recordatorio de checkout
await smsModule.sendCheckoutReminderSMS(app, booking, guest);

// Enviar credenciales WiFi
await smsModule.sendWifiCredentialsSMS(app, booking, guest);

// Enviar confirmacion de pago
await smsModule.sendPaymentConfirmationSMS(app, booking, guest, payment);

// Procesar recordatorios (cron)
await smsModule.processCheckinReminders(app);  // Para mañana
await smsModule.processCheckoutReminders(app); // Para hoy
```

---

## Automatizacion (DEV1-08)

### GET /automation/status

Estado de la automatizacion SMS.

**Autenticacion:** Requerida

**Response:**
```json
{
  "success": true,
  "automation": {
    "sms_enabled": true,
    "phone_number": "+1234567890",
    "triggers": {
      "booking_confirmation": true,
      "checkin_reminder": true,
      "checkout_reminder": true,
      "wifi_credentials": true,
      "payment_confirmation": true
    },
    "cron_schedule": {
      "checkin_reminders": "0 10 * * *",
      "checkout_reminders": "0 8 * * *"
    },
    "environment": {
      "hostal_name": "Almanik Hostel",
      "hostal_address": "Calle 10 #5-20",
      "wifi_network": "AlmanikGuest",
      "checkout_time": "11:00"
    }
  }
}
```

---

### GET /automation/pending-checkins

Lista check-ins de mañana que recibiran recordatorio.

**Autenticacion:** Requerida

**Response:**
```json
{
  "success": true,
  "date": "2025-11-30",
  "sms_enabled": true,
  "count": 3,
  "bookings": [
    {
      "booking_id": 123,
      "confirmation_code": "ALM-20251129-143022",
      "guest_name": "Juan Perez",
      "guest_phone": "+573001234567",
      "check_in": "2025-11-30",
      "bed_name": "1-A"
    }
  ]
}
```

---

### GET /automation/pending-checkouts

Lista checkouts de hoy que recibiran recordatorio.

**Autenticacion:** Requerida

**Response:** Similar a pending-checkins, con `check_out` en vez de `check_in`.

---

### POST /automation/process-checkin-reminders

Procesa y envia recordatorios de check-in para mañana. Llamado automaticamente por cron a las 10:00 AM.

**Autenticacion:** Requerida (Twilio configurado)

**Response:**
```json
{
  "success": true,
  "message": "Check-in reminders processed",
  "sent": 5,
  "failed": 0,
  "total": 5
}
```

---

### POST /automation/process-checkout-reminders

Procesa y envia recordatorios de checkout para hoy. Llamado automaticamente por cron a las 8:00 AM.

**Autenticacion:** Requerida (Twilio configurado)

**Response:** Similar a process-checkin-reminders.

---

### POST /automation/send-confirmation/:bookingId

Envia SMS de confirmacion para una reserva especifica.

**Autenticacion:** Requerida (Twilio configurado)

**Response:**
```json
{
  "success": true,
  "message": "Confirmation SMS sent",
  "sid": "SMxxxxxxxxxxxxx",
  "to": "+573001234567"
}
```

---

### POST /automation/send-wifi/:bookingId

Envia SMS con credenciales WiFi para una reserva especifica.

**Autenticacion:** Requerida (Twilio configurado)

**Response:** Similar a send-confirmation.

---

## Cron Jobs

Los cron jobs de SMS se ejecutan automaticamente:

| Job | Horario | Descripcion |
|-----|---------|-------------|
| Check-in Reminders | 10:00 AM | Envia recordatorio a huespedes que llegan mañana |
| Checkout Reminders | 8:00 AM | Envia recordatorio a huespedes que salen hoy |

### Variables de Entorno para Cron

```env
TIMEZONE=America/Bogota              # Zona horaria para cron
SMS_CHECKIN_CRON=0 10 * * *          # Horario recordatorio check-in (10 AM)
SMS_CHECKOUT_CRON=0 8 * * *          # Horario recordatorio checkout (8 AM)
```

---

## Triggers Automaticos

### En Check-in (Front Desk)

Cuando un huesped hace check-in via `/api/quick-checkin` o `/api/front-desk/confirm-arrival`, automaticamente:

1. Se envia SMS con credenciales WiFi (si el huesped tiene telefono)
2. La respuesta incluye `wifi_sms: "pending"` si se envio

---

## Costos Estimados

| Destino | Costo por SMS |
|---------|---------------|
| Colombia | ~$0.05 USD |
| USA/Canada | ~$0.01 USD |
| Europa | ~$0.05-0.08 USD |
| Otros | ~$0.05-0.15 USD |

Los mensajes >160 caracteres se dividen en multiples segmentos (cada uno se cobra por separado).

---

## Changelog

### v1.1.0 (2025-11-29) - DEV1-08
- **Automatizacion completa de SMS**
- GET /automation/status - Estado de automatizacion
- GET /automation/pending-checkins - Check-ins pendientes para mañana
- GET /automation/pending-checkouts - Checkouts pendientes para hoy
- POST /automation/process-checkin-reminders - Procesar recordatorios check-in
- POST /automation/process-checkout-reminders - Procesar recordatorios checkout
- POST /automation/send-confirmation/:bookingId - Enviar confirmacion manual
- POST /automation/send-wifi/:bookingId - Enviar WiFi manual
- Cron job automatico: sms-automation.js
- Trigger automatico de WiFi SMS en check-in (front-desk)
- Funciones helper adicionales: sendCheckoutReminderSMS(), sendWifiCredentialsSMS(), sendPaymentConfirmationSMS()
- Funciones de cron: processCheckinReminders(), processCheckoutReminders()

### v1.0.0 (2025-11-29) - DEV1-07
- Configuracion inicial de Twilio
- GET /status
- POST /send
- POST /send-bulk
- POST /test
- GET /history
- GET /balance
- GET /templates, GET /templates/:id
- POST /send-template, POST /preview-template
- 5 templates: booking_confirmation, checkin_reminder, checkout_reminder, wifi_credentials, payment_confirmation
- Funciones helper: sendBookingConfirmationSMS(), sendCheckinReminderSMS()
- Registro de SMS en base de datos
- Formato automatico de numeros a E.164
