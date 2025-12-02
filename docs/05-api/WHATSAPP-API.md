# WhatsApp API - Evolution API Integration

**Version:** 1.1.0
**Dev:** DEV4-04, DEV4-05, DEV4-06, DEV4-07
**Fecha:** 2025-11-29

## Descripcion

Integracion con Evolution API para envio de mensajes de WhatsApp. Evolution API es una solucion self-hosted que permite usar WhatsApp sin necesidad de aprobacion de Meta Business.

**Incluye Bot Basico** que responde automaticamente a mensajes de huespedes.

## Configuracion

### Variables de Entorno

```bash
# URL de tu instancia Evolution API
EVOLUTION_API_URL=https://tu-evolution-api.com

# API Key global de Evolution
EVOLUTION_API_KEY=tu-api-key-aqui

# Nombre de la instancia de WhatsApp
EVOLUTION_INSTANCE=almanik
```

### Requisitos

1. Instancia de Evolution API funcionando (self-hosted o servicio)
2. API Key configurada en Evolution
3. Numero de WhatsApp para escanear QR

---

## Endpoints

### Conexion y Estado

#### GET /api/whatsapp/status
Obtener estado de conexion de WhatsApp.

**Autenticacion:** Requerida

**Response:**
```json
{
  "success": true,
  "data": {
    "instance": "almanik",
    "state": "open",
    "statusReason": 200
  }
}
```

---

#### GET /api/whatsapp/qr
Obtener codigo QR para conectar WhatsApp.

**Autenticacion:** Requerida

**Response:**
```json
{
  "success": true,
  "data": {
    "pairingCode": null,
    "code": "2@ABC...",
    "base64": "data:image/png;base64,..."
  }
}
```

---

#### POST /api/whatsapp/disconnect
Desconectar la sesion de WhatsApp.

**Autenticacion:** Requerida

**Response:**
```json
{
  "success": true,
  "message": "WhatsApp disconnected"
}
```

---

### Envio de Mensajes

#### POST /api/whatsapp/send
Enviar mensaje de cualquier tipo.

**Autenticacion:** Requerida

**Body para texto:**
```json
{
  "number": "573001234567",
  "message": "Hola! Tu reserva esta confirmada.",
  "type": "text"
}
```

**Body para imagen:**
```json
{
  "number": "573001234567",
  "type": "image",
  "mediaUrl": "https://example.com/image.jpg",
  "caption": "Foto de tu habitacion"
}
```

**Body para documento:**
```json
{
  "number": "573001234567",
  "type": "document",
  "mediaUrl": "https://example.com/factura.pdf",
  "filename": "Factura-001.pdf",
  "caption": "Tu factura"
}
```

**Body para ubicacion:**
```json
{
  "number": "573001234567",
  "type": "location",
  "latitude": 4.6097,
  "longitude": -74.0817,
  "name": "Almanik Hostel",
  "address": "Calle 123 #45-67"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "messageId": "3EB0ABC123...",
    "to": "573001234567",
    "type": "text"
  }
}
```

---

#### POST /api/whatsapp/send-template
Enviar mensaje usando template predefinido.

**Autenticacion:** Requerida

**Body:**
```json
{
  "number": "573001234567",
  "template": "bookingConfirmation",
  "params": {
    "guestName": "Juan Perez",
    "checkIn": "2025-01-15",
    "checkOut": "2025-01-18",
    "confirmationCode": "ALM-20250115-123456"
  }
}
```

**Templates disponibles:**

| Template | Parametros |
|----------|------------|
| `bookingConfirmation` | guestName, checkIn, checkOut, confirmationCode |
| `checkInReminder` | guestName, checkIn |
| `reviewRequest` | guestName, reviewLink |
| `paymentConfirmation` | guestName, amount, paymentMethod |
| `checkOutReminder` | guestName, checkOut |

**Response:**
```json
{
  "success": true,
  "data": {
    "messageId": "3EB0ABC123...",
    "to": "573001234567",
    "template": "bookingConfirmation",
    "message": "🏨 *Reserva Confirmada*..."
  }
}
```

---

#### POST /api/whatsapp/send-buttons
Enviar mensaje con botones interactivos.

**Autenticacion:** Requerida

**Body:**
```json
{
  "number": "573001234567",
  "title": "Confirma tu reserva",
  "description": "Tu reserva para el 15 de enero esta pendiente de confirmacion.",
  "buttons": [
    { "buttonId": "confirm", "buttonText": "Confirmar" },
    { "buttonId": "cancel", "buttonText": "Cancelar" },
    { "buttonId": "contact", "buttonText": "Contactar" }
  ]
}
```

**Nota:** Maximo 3 botones.

---

### Utilidades

#### GET /api/whatsapp/check/:number
Verificar si un numero tiene WhatsApp.

**Autenticacion:** Requerida

**Response:**
```json
{
  "success": true,
  "data": {
    "number": "573001234567",
    "hasWhatsApp": true,
    "jid": "573001234567@s.whatsapp.net"
  }
}
```

---

#### GET /api/whatsapp/profile/:number
Obtener foto de perfil de un numero.

**Autenticacion:** Requerida

**Response:**
```json
{
  "success": true,
  "data": {
    "profilePictureUrl": "https://..."
  }
}
```

---

#### GET /api/whatsapp/templates
Listar templates disponibles.

**Autenticacion:** No requerida

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "bookingConfirmation",
      "description": "Confirmacion de reserva (guestName, checkIn, checkOut, confirmationCode)"
    },
    {
      "name": "checkInReminder",
      "description": "Recordatorio de check-in (guestName, checkIn)"
    }
  ]
}
```

---

### Webhook

#### POST /api/whatsapp/webhook
Endpoint para recibir mensajes entrantes de Evolution API.

**Autenticacion:** No requerida (llamado por Evolution)

**Body (ejemplo de mensaje entrante):**
```json
{
  "event": "messages.upsert",
  "instance": "almanik",
  "data": {
    "key": {
      "remoteJid": "573001234567@s.whatsapp.net",
      "fromMe": false,
      "id": "3EB0ABC123..."
    },
    "message": {
      "conversation": "Hola, quisiera hacer una reserva"
    },
    "messageTimestamp": 1700000000
  }
}
```

---

#### POST /api/whatsapp/configure-webhook
Configurar webhook en Evolution API.

**Autenticacion:** Requerida

**Body:**
```json
{
  "webhookUrl": "https://tu-app.com/api/whatsapp/webhook"
}
```

---

## Uso Programatico

### Desde otros modulos

```javascript
const whatsapp = require('../config/whatsapp');

// Verificar si esta configurado
if (whatsapp.isEnabled()) {
  // Enviar mensaje simple
  await whatsapp.sendMessage('+573001234567', 'Hola!');

  // Usar template
  const message = whatsapp.templates.bookingConfirmation(
    'Juan Perez',
    '2025-01-15',
    '2025-01-18',
    'ALM-123456'
  );
  await whatsapp.sendMessage('+573001234567', message);

  // Enviar imagen
  await whatsapp.sendImage(
    '+573001234567',
    'https://example.com/room.jpg',
    'Tu habitacion'
  );
}
```

---

## Integracion con el Sistema

### Envio automatico de confirmaciones

El sistema puede configurarse para enviar automaticamente:

1. **Confirmacion de reserva** - Al confirmar una reserva
2. **Recordatorio de check-in** - Un dia antes del check-in
3. **Solicitud de review** - Despues del check-out
4. **Comprobante de pago** - Al registrar un pago

### Ejemplo: Enviar confirmacion al confirmar reserva

```javascript
// En el endpoint de confirmacion de reserva
const whatsapp = require('../config/whatsapp');

if (whatsapp.isEnabled() && guest.phone) {
  const message = whatsapp.templates.bookingConfirmation(
    guest.name,
    booking.check_in,
    booking.check_out,
    booking.confirmation_code
  );

  await whatsapp.sendMessage(guest.phone, message);
}
```

---

## Errores Comunes

| Codigo | Mensaje | Solucion |
|--------|---------|----------|
| 503 | WhatsApp not configured | Configurar variables de entorno |
| 500 | Instance not found | Escanear QR para conectar |
| 400 | Number is required | Enviar numero en el request |
| 500 | Failed to send | Verificar conexion de WhatsApp |

---

## Seguridad

- Todos los endpoints (excepto webhook) requieren autenticacion
- El webhook solo acepta requests de la instancia configurada
- Los numeros se validan antes de enviar
- Los mensajes se registran en logs

---

---

## Bot de WhatsApp (DEV4-07)

El bot responde automaticamente a mensajes de huespedes con un menu de opciones.

### Flujo del Bot

```
Huesped: Hola
Bot: Hola [Nombre]! 👋
     Soy el asistente virtual de Almanik Hostel.
     Escribe el numero de la opcion:
     *1* 📋 Ver mi reserva
     *2* 📶 Obtener WiFi
     *3* 🛎️ Hablar con recepcion
     *4* ℹ️ Info del hostal

Huesped: 1
Bot: 📋 *Tu Reserva*
     👤 Juan Perez
     🔑 Codigo: ALM-20250115-123456
     📅 Check-in: Mie, 15 Ene
     📅 Check-out: Sab, 18 Ene
     🛏️ Cama 3-B - Habitacion Compartida
     ✅ Estado: Confirmada

Huesped: 2
Bot: 📶 *Datos de WiFi*
     🌐 Red: Almanik-Guest
     🔐 Contraseña: AlmanikGuest2024

Huesped: 3
Bot: 🛎️ *Contacto de Recepcion*
     📞 Telefono: +573001234567
     📍 En persona: Recepcion en planta baja
     ⏰ Horario: 24/7
```

### Comandos del Bot

| Comando | Accion |
|---------|--------|
| `hola`, `menu`, `inicio` | Mostrar menu principal |
| `1` o `reserva` | Ver informacion de reserva |
| `2` o `wifi` | Obtener datos de WiFi |
| `3` o `recepcion` | Contactar recepcion |
| `4` o `info` | Informacion del hostal |
| `ayuda` o `help` | Ver comandos disponibles |
| `stop` o `parar` | Opt-out de mensajes automaticos |

---

### Endpoints del Bot

#### GET /api/whatsapp/bot/config
Obtener configuracion actual del bot.

**Response:**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "hostalName": "Almanik Hostel",
    "wifiNetwork": "Almanik-Guest",
    "wifiPassword": "AlmanikGuest2024",
    "checkInTime": "2:00 PM",
    "checkOutTime": "11:00 AM",
    "receptionPhone": "+573001234567",
    "address": "Calle Principal #123, Ciudad"
  }
}
```

---

#### PUT /api/whatsapp/bot/config
Actualizar configuracion del bot.

**Body:**
```json
{
  "hostalName": "Mi Hostal",
  "wifiPassword": "NuevaClave123",
  "receptionPhone": "+573009876543"
}
```

---

#### POST /api/whatsapp/bot/toggle
Activar o desactivar el bot.

**Body (opcional):**
```json
{
  "enabled": false
}
```

Si no se envía body, alterna el estado actual.

---

#### POST /api/whatsapp/bot/test
Simular un mensaje entrante para probar el bot.

**Autenticacion:** Requerida + WhatsApp configurado

**Body:**
```json
{
  "number": "573001234567",
  "message": "hola"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bot test message processed",
  "data": {
    "simulatedFrom": "573001234567",
    "simulatedMessage": "hola"
  }
}
```

---

#### GET /api/whatsapp/bot/stats
Obtener estadisticas del bot.

**Response:**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "last7Days": {
      "totalMessages": 156,
      "incoming": 78,
      "outgoing": 78,
      "botResponses": 65
    },
    "dailyBreakdown": [
      { "date": "2025-11-29", "total": 24, "incoming": 12, "outgoing": 12 },
      { "date": "2025-11-28", "total": 32, "incoming": 16, "outgoing": 16 }
    ]
  }
}
```

---

### Endpoints de Conversaciones

#### GET /api/whatsapp/conversations
Listar conversaciones recientes.

**Query params:**
- `limit` (opcional): Numero de conversaciones (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "number": "573001234567",
      "last_message": "Gracias!",
      "last_direction": "incoming",
      "last_message_at": "2025-11-29T10:30:00Z",
      "guest_name": "Juan Perez",
      "guest_id": 15,
      "message_count": 12
    }
  ]
}
```

---

#### GET /api/whatsapp/conversations/:number
Obtener historial de conversacion con un numero.

**Query params:**
- `limit` (opcional): Mensajes a retornar (default: 50)
- `offset` (opcional): Para paginacion (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "number": "573001234567",
    "guest": {
      "id": 15,
      "name": "Juan Perez",
      "email": "juan@example.com",
      "phone": "+573001234567"
    },
    "messages": [
      {
        "id": 1,
        "content": "Hola!",
        "direction": "incoming",
        "created_at": "2025-11-29T10:00:00Z"
      },
      {
        "id": 2,
        "content": "Hola Juan! 👋...",
        "direction": "outgoing",
        "created_at": "2025-11-29T10:00:01Z"
      }
    ],
    "hasMore": false
  }
}
```

---

## Variables de Entorno del Bot

```bash
# Nombre del hostal (se muestra en mensajes del bot)
HOSTAL_NAME=Almanik Hostel

# Datos de WiFi para huespedes
WIFI_NETWORK=Almanik-Guest
WIFI_PASSWORD=AlmanikGuest2024

# Telefono de recepcion
RECEPTION_PHONE=+573001234567

# Direccion del hostal
HOSTAL_ADDRESS=Calle Principal #123, Ciudad
```

---

## Proximos pasos

- [x] DEV4-05: Mensajes automaticos (reservas, recordatorios) ✅
- [x] DEV4-06: Automatizacion (cron, triggers) ✅
- [x] DEV4-07: Bot basico para respuestas automaticas ✅
- [ ] DEV4-08: Panel de chat para respuestas manuales
