# Email API - SendGrid Integration

**Version:** 1.0.0
**Base URL:** `/api/email`
**Fecha:** 2025-11-28
**Responsable:** DEV1

---

## Resumen

El modulo de Email maneja el envio de correos electronicos via SendGrid. Soporta:
- Envio de emails individuales
- Envio masivo (hasta 100 destinatarios)
- Emails de prueba para verificar configuracion
- Historial de emails enviados

---

## Configuracion

### Variables de Entorno Requeridas

```env
SENDGRID_API_KEY=SG....          # API key de SendGrid
EMAIL_FROM=reservas@tuhotel.com   # Email de origen (verificado)
EMAIL_FROM_NAME=Almanik PMS       # Nombre del remitente (opcional)
EMAIL_REPLY_TO=soporte@tuhotel.com # Email de respuesta (opcional)
```

### Pasos de Configuracion

1. Crear cuenta en [SendGrid](https://sendgrid.com)
2. Verificar dominio o email remitente en [Sender Authentication](https://app.sendgrid.com/settings/sender_auth)
3. Crear API Key en [API Keys](https://app.sendgrid.com/settings/api_keys) con permisos "Mail Send"
4. Agregar variables a `.env`

### Archivos

- `server/config/sendgrid.js` - Configuracion de SendGrid
- `server/modules/email.js` - Endpoints del modulo

---

## Endpoints

### GET /status

Verifica el estado del servicio de email.

**Autenticacion:** No requerida

**Response (configurado):**
```json
{
  "module": "email",
  "version": "1.0.0",
  "sendgrid_enabled": true,
  "from_email": "reservas@tuhotel.com",
  "from_name": "Almanik PMS",
  "endpoints": {
    "implemented": [
      "GET /status",
      "POST /send",
      "POST /send-bulk",
      "POST /test"
    ],
    "pending": [
      "POST /send-template (DEV1-06)",
      "GET /templates (DEV1-06)"
    ]
  }
}
```

**Response (no configurado):**
```json
{
  "module": "email",
  "version": "1.0.0",
  "sendgrid_enabled": false,
  "from_email": null,
  "from_name": null
}
```

---

### POST /send

Envia un email individual.

**Autenticacion:** Requerida (session-id header)

**Request Body:**
```json
{
  "to": "huesped@email.com",
  "subject": "Confirmacion de reserva",
  "text": "Texto plano del email...",
  "html": "<h1>HTML del email</h1>...",
  "replyTo": "soporte@hotel.com",
  "reservation_id": 123,
  "guest_id": 45,
  "categories": ["reservacion", "confirmacion"]
}
```

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| to | string | Si | Email del destinatario |
| subject | string | Si | Asunto del email |
| text | string | Si* | Contenido en texto plano |
| html | string | Si* | Contenido en HTML |
| replyTo | string | No | Email de respuesta |
| reservation_id | number | No | ID de reservacion asociada |
| guest_id | number | No | ID de huesped asociado |
| categories | string[] | No | Categorias para tracking |

*Se requiere al menos uno: text o html

**Response:**
```json
{
  "success": true,
  "messageId": "abc123xyz",
  "to": "huesped@email.com",
  "subject": "Confirmacion de reserva"
}
```

**Errores:**
- `400` - Falta destinatario, asunto o contenido
- `400` - Email invalido
- `503` - SendGrid no configurado

---

### POST /send-bulk

Envia email a multiples destinatarios.

**Autenticacion:** Requerida

**Request Body:**
```json
{
  "to": [
    "huesped1@email.com",
    "huesped2@email.com",
    "huesped3@email.com"
  ],
  "subject": "Promocion especial",
  "text": "Texto del email...",
  "html": "<h1>HTML del email</h1>..."
}
```

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| to | string[] | Si | Array de emails (max 100) |
| subject | string | Si | Asunto del email |
| text | string | Si* | Contenido en texto plano |
| html | string | Si* | Contenido en HTML |

**Response:**
```json
{
  "success": true,
  "sent": 3,
  "recipients": 3,
  "subject": "Promocion especial"
}
```

**Errores:**
- `400` - Array vacio o mas de 100 destinatarios
- `400` - Emails invalidos en el array

---

### POST /test

Envia un email de prueba para verificar la configuracion.

**Autenticacion:** Requerida

**Request Body:**
```json
{
  "to": "admin@hotel.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test email sent successfully",
  "messageId": "abc123xyz",
  "to": "admin@hotel.com",
  "from": "reservas@tuhotel.com"
}
```

**Notas:**
- El email de prueba tiene un formato HTML predefinido
- Util para verificar que SendGrid esta correctamente configurado
- Incluye la fecha/hora del envio y datos de configuracion

---

### GET /history

Obtiene historial de emails enviados.

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
  "emails": [
    {
      "id": 1,
      "to_email": "huesped@email.com",
      "from_email": "reservas@hotel.com",
      "subject": "Confirmacion de reserva",
      "template_id": null,
      "status": "sent",
      "message_id": "abc123xyz",
      "reservation_id": 123,
      "guest_id": 45,
      "email_type": "transactional",
      "created_at": "2025-11-28T12:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

## Base de Datos

### Tabla: emails

```sql
CREATE TABLE emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  to_email TEXT NOT NULL,
  from_email TEXT,
  subject TEXT,
  template_id TEXT,
  status TEXT DEFAULT 'sent',
  message_id TEXT,
  reservation_id INTEGER,
  guest_id INTEGER,
  email_type TEXT DEFAULT 'transactional',
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reservation_id) REFERENCES bookings(id),
  FOREIGN KEY (guest_id) REFERENCES guests(id)
);
```

---

## Codigos de Error

| Codigo | Descripcion |
|--------|-------------|
| 400 | Bad Request - Parametros invalidos |
| 401 | Unauthorized - Sesion no valida |
| 500 | Server Error - Error de SendGrid |
| 503 | Service Unavailable - SendGrid no configurado |

---

## Flujo de Uso

### Verificar Configuracion

```bash
# 1. Verificar estado
curl http://localhost:3000/api/email/status

# 2. Enviar email de prueba
curl -X POST http://localhost:3000/api/email/test \
  -H "Content-Type: application/json" \
  -H "session-id: YOUR_SESSION_ID" \
  -d '{"to": "tu@email.com"}'
```

### Enviar Email desde Codigo

```javascript
// Usando fetch desde frontend
const response = await fetch('/api/email/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'session-id': sessionId
  },
  body: JSON.stringify({
    to: 'huesped@email.com',
    subject: 'Confirmacion de reserva #123',
    html: '<h1>Reserva Confirmada</h1><p>Detalles...</p>',
    reservation_id: 123
  })
});
```

---

## Templates (DEV1-06)

### GET /templates

Lista todos los templates de email disponibles.

**Autenticacion:** Requerida

**Response:**
```json
{
  "success": true,
  "templates": [
    {
      "id": "booking_confirmation",
      "name": "Confirmación de Reserva",
      "subject": "Confirmación de Reserva - {{hostal_name}}",
      "trigger": "reservation_confirmed",
      "variables": ["guest_name", "check_in", "check_out", "bed_name", "total", "confirmation_code", "hostal_name", "hostal_address", "hostal_phone"]
    },
    {
      "id": "checkin_reminder",
      "name": "Recordatorio de Check-in",
      "subject": "¡Mañana te esperamos! - {{hostal_name}}",
      "trigger": "day_before_checkin",
      "variables": ["guest_name", "check_in", "bed_name", "confirmation_code", "hostal_name", "hostal_address", "hostal_phone", "checkin_time"]
    },
    {
      "id": "receipt",
      "name": "Recibo de Pago",
      "subject": "Recibo de Pago #{{receipt_number}} - {{hostal_name}}",
      "trigger": "payment_completed",
      "variables": ["guest_name", "receipt_number", "payment_date", "items", "subtotal", "taxes", "total", "payment_method", "hostal_name", "hostal_address", "hostal_nit"]
    },
    {
      "id": "checkout_reminder",
      "name": "Recordatorio de Check-out",
      "subject": "Recordatorio: Check-out hoy - {{hostal_name}}",
      "trigger": "checkout_day",
      "variables": ["guest_name", "check_out", "checkout_time", "bed_name", "balance", "hostal_name", "review_link"]
    }
  ],
  "count": 4
}
```

---

### GET /templates/:id

Obtiene detalle completo de un template incluyendo HTML y texto.

**Autenticacion:** Requerida

**Response:**
```json
{
  "success": true,
  "template": {
    "id": "booking_confirmation",
    "name": "Confirmación de Reserva",
    "subject": "Confirmación de Reserva - {{hostal_name}}",
    "trigger": "reservation_confirmed",
    "variables": ["guest_name", "check_in", "..."],
    "html": "<!DOCTYPE html>...",
    "text": "¡Reserva Confirmada!..."
  }
}
```

---

### POST /send-template

Envia un email usando un template predefinido.

**Autenticacion:** Requerida

**Request Body:**
```json
{
  "template_id": "booking_confirmation",
  "to": "huesped@email.com",
  "data": {
    "guest_name": "Juan Pérez",
    "check_in": "15 de Diciembre 2025",
    "check_out": "18 de Diciembre 2025",
    "bed_name": "Cama 3-B",
    "total": "$120.000 COP",
    "confirmation_code": "ALM-123456",
    "hostal_name": "Almanik Hostel",
    "hostal_address": "Calle 10 #5-20, Santa Marta",
    "hostal_phone": "+57 310 123 4567"
  },
  "reservation_id": 123,
  "guest_id": 45
}
```

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| template_id | string | Si | ID del template a usar |
| to | string | Si | Email del destinatario |
| data | object | Si | Variables para el template |
| reservation_id | number | No | ID de reservacion asociada |
| guest_id | number | No | ID de huesped asociado |

**Response:**
```json
{
  "success": true,
  "template_id": "booking_confirmation",
  "template_name": "Confirmación de Reserva",
  "to": "huesped@email.com",
  "subject": "Confirmación de Reserva - Almanik Hostel",
  "messageId": "abc123xyz"
}
```

**Errores:**
- `400` - Template no especificado
- `400` - Variables faltantes en data
- `404` - Template no encontrado

---

### POST /preview-template

Previsualiza un template renderizado sin enviarlo.

**Autenticacion:** Requerida

**Request Body:**
```json
{
  "template_id": "checkin_reminder",
  "data": {
    "guest_name": "María García",
    "check_in": "20 de Diciembre 2025"
  }
}
```

**Response:**
```json
{
  "success": true,
  "template_id": "checkin_reminder",
  "subject": "¡Mañana te esperamos! - [hostal_name]",
  "html": "<!DOCTYPE html>...",
  "text": "¡Mañana te esperamos!..."
}
```

**Notas:**
- Variables no proporcionadas se muestran como `[variable_name]`
- Util para preview en panel de administracion

---

## Funciones Helper (Para otros modulos)

El modulo exporta funciones helper para uso automatizado:

```javascript
const emailModule = require('./modules/email');

// Enviar confirmacion de reserva automaticamente
await emailModule.sendBookingConfirmation(app, booking, guest);

// Enviar recordatorio de checkout (llamado por cron)
await emailModule.sendCheckoutReminder(app, booking, guest);
```

### Variables de Entorno para Templates

```env
HOSTAL_NAME=Almanik Hostel
HOSTAL_ADDRESS=Calle 10 #5-20, Santa Marta
HOSTAL_PHONE=+57 310 123 4567
HOSTAL_NIT=123456789-0
APP_URL=https://hostal-pms.vercel.app
```

---

## Changelog

### v1.1.0 (2025-11-29) - DEV1-06
- GET /templates - Lista templates disponibles
- GET /templates/:id - Detalle de template
- POST /send-template - Enviar con template
- POST /preview-template - Preview sin enviar
- 4 templates profesionales: booking_confirmation, checkin_reminder, receipt, checkout_reminder
- Funciones helper: sendBookingConfirmation(), sendCheckoutReminder()
- Templates con HTML responsive y version texto

### v1.0.0 (2025-11-28) - DEV1-05
- Configuracion inicial de SendGrid
- GET /status
- POST /send
- POST /send-bulk
- POST /test
- GET /history
- Registro de emails en base de datos
- Logging de actividad
