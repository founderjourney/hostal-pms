# WhatsApp Integration - Evolution API

## Resumen

El módulo de WhatsApp de Almanik PMS usa **Evolution API** para:
- Enviar mensajes automáticos a huéspedes
- Bot de respuestas automáticas
- Chat en tiempo real con huéspedes
- Notificaciones de reservas, check-in, reviews

---

## Requisitos

| Componente | Descripción |
|------------|-------------|
| Evolution API | Servidor self-hosted (Docker) o cloud |
| Número WhatsApp | Número dedicado para el hostal |
| Servidor con IP pública | Para el webhook (Vercel ya lo tiene) |

---

## Paso 1: Instalar Evolution API

### Opción A: Docker (Recomendado)

Crear archivo `docker-compose.yml`:

```yaml
version: '3.8'

services:
  evolution-api:
    image: atendai/evolution-api:latest
    container_name: evolution-api
    ports:
      - "8080:8080"
    environment:
      # API Key global - CAMBIAR por una segura
      - AUTHENTICATION_API_KEY=tu_api_key_super_segura_aqui_123

      # Configuración básica
      - AUTHENTICATION_TYPE=apikey
      - AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true

      # Base de datos (opcional, usa SQLite por defecto)
      # - DATABASE_ENABLED=true
      # - DATABASE_PROVIDER=postgresql
      # - DATABASE_CONNECTION_URI=postgresql://user:pass@host:5432/evolution

      # Logs
      - LOG_LEVEL=ERROR
      - LOG_COLOR=true

      # Almacenamiento
      - STORE_MESSAGES=true
      - STORE_MESSAGE_UP=true
      - STORE_CONTACTS=true
      - STORE_CHATS=true

    volumes:
      - evolution_instances:/evolution/instances
      - evolution_store:/evolution/store
    restart: always
    networks:
      - evolution-network

networks:
  evolution-network:
    driver: bridge

volumes:
  evolution_instances:
  evolution_store:
```

Ejecutar:
```bash
docker-compose up -d
```

Verificar:
```bash
curl http://localhost:8080/
# Debe responder: {"status":"ok"}
```

### Opción B: Railway (Cloud Gratis)

1. Ir a [railway.app](https://railway.app)
2. Crear nuevo proyecto
3. Deploy desde Docker image: `atendai/evolution-api:latest`
4. Agregar variable: `AUTHENTICATION_API_KEY=tu_key_segura`
5. Exponer puerto 8080
6. Copiar la URL pública

### Opción C: Render (Cloud Gratis)

1. Ir a [render.com](https://render.com)
2. New Web Service → Docker
3. Image: `atendai/evolution-api:latest`
4. Environment: `AUTHENTICATION_API_KEY=tu_key_segura`
5. Copiar la URL pública

---

## Paso 2: Configurar Variables de Entorno

Agregar en Vercel (Settings → Environment Variables):

```env
# === EVOLUTION API ===
EVOLUTION_API_URL=https://tu-evolution-api.railway.app
EVOLUTION_API_KEY=tu_api_key_super_segura_aqui_123
EVOLUTION_INSTANCE=almanik

# === CONFIGURACIÓN DEL BOT ===
HOSTAL_NAME=Almanik Hostel
WIFI_PASSWORD=ClaveWiFi2024
WIFI_NETWORK=Almanik-Guest
RECEPTION_PHONE=+573001234567
HOSTAL_ADDRESS=Calle Principal #123, Ciudad
```

### Variables Explicadas

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `EVOLUTION_API_URL` | URL de tu Evolution API | `https://evolution.tudominio.com` |
| `EVOLUTION_API_KEY` | API Key (la misma del docker) | `tu_api_key_123` |
| `EVOLUTION_INSTANCE` | Nombre de la instancia | `almanik` |
| `HOSTAL_NAME` | Nombre del hostal para mensajes | `Almanik Hostel` |
| `WIFI_PASSWORD` | Clave WiFi para huéspedes | `Guest2024` |
| `WIFI_NETWORK` | Nombre de red WiFi | `Almanik-Guest` |
| `RECEPTION_PHONE` | Teléfono de recepción | `+573001234567` |
| `HOSTAL_ADDRESS` | Dirección del hostal | `Calle 123, Ciudad` |

---

## Paso 3: Conectar WhatsApp

### Desde la interfaz web:

1. Ir a: `https://tu-app.vercel.app/whatsapp-chat.html`
2. Click en "Conectar WhatsApp"
3. Escanear el código QR con WhatsApp del celular
4. ¡Listo! El número queda conectado

### Desde API (alternativo):

```bash
# Crear instancia (primera vez)
curl -X POST "https://tu-evolution-api.com/instance/create" \
  -H "apikey: tu_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "almanik",
    "qrcode": true,
    "integration": "WHATSAPP-BAILEYS"
  }'

# Obtener QR
curl "https://tu-evolution-api.com/instance/connect/almanik" \
  -H "apikey: tu_api_key"

# Ver estado de conexión
curl "https://tu-evolution-api.com/instance/connectionState/almanik" \
  -H "apikey: tu_api_key"
```

---

## Paso 4: Configurar Webhook

El webhook permite recibir mensajes entrantes.

```bash
curl -X POST "https://tu-app.vercel.app/api/whatsapp/configure-webhook" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer tu_token" \
  -d '{
    "webhookUrl": "https://tu-app.vercel.app/api/whatsapp/webhook"
  }'
```

O configurar directamente en Evolution API:

```bash
curl -X POST "https://tu-evolution-api.com/webhook/set/almanik" \
  -H "apikey: tu_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "https://tu-app.vercel.app/api/whatsapp/webhook",
      "webhookByEvents": true,
      "events": [
        "MESSAGES_UPSERT",
        "MESSAGES_UPDATE",
        "CONNECTION_UPDATE"
      ]
    }
  }'
```

---

## Funcionalidades del Bot

### Comandos Automáticos

| Mensaje del huésped | Respuesta |
|---------------------|-----------|
| `hola`, `hello`, `hi`, `buenos días` | Menú principal |
| `1` o `reserva` | Información de su reserva |
| `2` o `wifi` | Datos de conexión WiFi |
| `3` o `recepción` | Contacto de recepción |
| `4` o `info` | Información del hostal |
| `ayuda` o `help` | Lista de comandos |
| `stop` o `parar` | Desactivar mensajes automáticos |

### Templates de Mensajes

```javascript
// Confirmación de reserva
POST /api/whatsapp/send-template
{
  "number": "+573001234567",
  "template": "bookingConfirmation",
  "params": {
    "guestName": "Juan",
    "checkIn": "15 Dic",
    "checkOut": "18 Dic",
    "confirmationCode": "ALM-123"
  }
}

// Recordatorio de check-in
{
  "template": "checkInReminder",
  "params": {
    "guestName": "Juan",
    "checkIn": "mañana 15 Dic"
  }
}

// Solicitud de review
{
  "template": "reviewRequest",
  "params": {
    "guestName": "Juan",
    "reviewLink": "https://tu-app.com/review?token=xxx"
  }
}

// Confirmación de pago
{
  "template": "paymentConfirmation",
  "params": {
    "guestName": "Juan",
    "amount": "150000",
    "paymentMethod": "Efectivo"
  }
}

// Recordatorio de check-out
{
  "template": "checkOutReminder",
  "params": {
    "guestName": "Juan",
    "checkOut": "mañana"
  }
}
```

---

## APIs Disponibles

### Estado y Conexión

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/whatsapp/status` | Estado de conexión |
| GET | `/api/whatsapp/qr` | Obtener código QR |
| POST | `/api/whatsapp/disconnect` | Desconectar |

### Envío de Mensajes

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/whatsapp/send` | Enviar mensaje (texto/imagen/documento) |
| POST | `/api/whatsapp/send-template` | Enviar con template |
| POST | `/api/whatsapp/send-buttons` | Enviar con botones |
| POST | `/api/whatsapp/reply` | Respuesta manual del staff |

### Conversaciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/whatsapp/conversations` | Listar conversaciones |
| GET | `/api/whatsapp/conversations/:number` | Historial con un número |
| POST | `/api/whatsapp/conversations/:number/read` | Marcar como leído |
| GET | `/api/whatsapp/unread-count` | Conteo de no leídos |

### Bot

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/whatsapp/bot/config` | Ver configuración del bot |
| PUT | `/api/whatsapp/bot/config` | Actualizar configuración |
| POST | `/api/whatsapp/bot/toggle` | Activar/desactivar bot |
| POST | `/api/whatsapp/bot/test` | Probar respuesta del bot |
| GET | `/api/whatsapp/bot/stats` | Estadísticas del bot |

### Utilidades

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/whatsapp/check/:number` | Verificar si tiene WhatsApp |
| GET | `/api/whatsapp/profile/:number` | Foto de perfil |
| GET | `/api/whatsapp/templates` | Listar templates |

---

## Troubleshooting

### Error: "Evolution API not configured"

**Causa:** Variables de entorno no configuradas.

**Solución:**
1. Verificar que `EVOLUTION_API_URL` y `EVOLUTION_API_KEY` estén en Vercel
2. Hacer redeploy después de agregar variables

### Error: "Connection timeout"

**Causa:** Evolution API no accesible.

**Solución:**
1. Verificar que el servidor Evolution esté corriendo
2. Verificar que la URL sea correcta (sin `/` al final)
3. Verificar que el puerto esté expuesto

### QR no aparece

**Causa:** Instancia ya conectada o no existe.

**Solución:**
```bash
# Ver estado
curl "https://tu-evolution/instance/connectionState/almanik" \
  -H "apikey: tu_key"

# Si está conectado, desconectar primero
curl -X DELETE "https://tu-evolution/instance/logout/almanik" \
  -H "apikey: tu_key"

# Volver a conectar
curl "https://tu-evolution/instance/connect/almanik" \
  -H "apikey: tu_key"
```

### Mensajes no llegan

**Causa:** Webhook no configurado.

**Solución:**
1. Verificar webhook: `GET /webhook/find/almanik`
2. Reconfigurar webhook con la URL correcta
3. Verificar que Vercel pueda recibir POSTs (no tiene restricciones)

---

## Seguridad

1. **Nunca exponer** `EVOLUTION_API_KEY` en el frontend
2. **Usar HTTPS** para Evolution API en producción
3. **Limitar IPs** que pueden acceder a Evolution API si es posible
4. **Rotar API keys** periódicamente

---

## Costos Estimados

| Servicio | Costo |
|----------|-------|
| Evolution API (self-hosted) | Gratis (solo VPS ~$5-10/mes) |
| Evolution API Cloud | ~$20-50/mes |
| Railway (Docker) | Gratis hasta 500 horas/mes |
| Render (Docker) | Gratis (con limitaciones) |
| DigitalOcean Droplet | ~$6/mes (1GB RAM) |

---

## Próximos Pasos

1. [ ] Instalar Evolution API (Docker o Cloud)
2. [ ] Configurar variables de entorno en Vercel
3. [ ] Conectar número de WhatsApp (escanear QR)
4. [ ] Configurar webhook
5. [ ] Probar envío de mensaje
6. [ ] Personalizar configuración del bot

---

*Documentación creada: 2025-12-03*
*Versión: 1.0.0*
