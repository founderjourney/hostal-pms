# Guía de Integración con OTAs (Booking.com y Hostelworld)

## Resumen

El PMS Almanik soporta sincronización con OTAs (Online Travel Agencies) a través de **calendarios iCal**. Esto permite:

- **Importar** reservaciones de Booking.com, Hostelworld, Airbnb, etc.
- **Exportar** disponibilidad del PMS a las OTAs
- **Detectar** conflictos de overbooking automáticamente
- **Sincronización** automática cada 2 horas

---

## Arquitectura de Integración

```
┌─────────────────┐     iCal Feed      ┌──────────────────┐
│   Booking.com   │ ─────────────────► │                  │
└─────────────────┘                    │                  │
                                       │   ALMANIK PMS    │
┌─────────────────┐     iCal Feed      │                  │
│   Hostelworld   │ ─────────────────► │  /api/ical/*     │
└─────────────────┘                    │                  │
                                       │                  │
┌─────────────────┐     iCal Feed      │                  │
│     Airbnb      │ ─────────────────► │                  │
└─────────────────┘                    └──────────────────┘
```

---

## 1. Conexión con Booking.com

### Paso 1: Obtener URL del calendario iCal

1. Inicia sesión en **Booking.com Extranet**: https://admin.booking.com
2. Ve a **"Property" → "Calendar & availability"**
3. Busca la opción **"Sync calendars"** o **"iCal"**
4. Copia la **URL de exportación iCal** para cada habitación/cama

> **Nota**: Booking.com genera una URL única por unidad de alojamiento.
> Ejemplo: `https://admin.booking.com/hotel/hoteladmin/ical.html?t=XXXXX&propertyId=YYYYY&roomId=ZZZZZ`

### Paso 2: Registrar la fuente en Almanik

```bash
curl -X POST http://localhost:3000/api/ical/sources \
  -H "Content-Type: application/json" \
  -H "session-id: TU_SESSION_ID" \
  -d '{
    "name": "Booking.com - Habitación 1",
    "source_type": "booking.com",
    "ical_url": "https://admin.booking.com/hotel/hoteladmin/ical.html?t=XXXXX",
    "bed_id": 1,
    "sync_interval_minutes": 120
  }'
```

### Paso 3: Exportar disponibilidad a Booking.com

Para que Booking.com conozca tu disponibilidad, proporciona esta URL en su extranet:

```
https://TU_DOMINIO/api/ical/beds/1.ics
```

1. En Booking.com Extranet → Calendar → Import calendar
2. Pega la URL de tu PMS
3. Booking.com consultará este calendario periódicamente

---

## 2. Conexión con Hostelworld

### Paso 1: Obtener URL del calendario iCal

1. Inicia sesión en **Hostelworld Inbox**: https://inbox.hostelworld.com
2. Ve a **"Settings" → "iCal Export"** o **"Calendar Sync"**
3. Genera/copia la URL iCal para cada tipo de habitación

> **Nota**: Hostelworld maneja tipos de habitación (dorm 6-bed, private, etc.) no camas individuales.
> Ejemplo: `https://inbox.hostelworld.com/ical/export?property=XXXX&roomtype=YYYY`

### Paso 2: Registrar la fuente en Almanik

```bash
curl -X POST http://localhost:3000/api/ical/sources \
  -H "Content-Type: application/json" \
  -H "session-id: TU_SESSION_ID" \
  -d '{
    "name": "Hostelworld - Dormitorio 6 camas",
    "source_type": "hostelworld",
    "ical_url": "https://inbox.hostelworld.com/ical/export?property=XXXX&roomtype=YYYY",
    "room_id": 1,
    "sync_interval_minutes": 60
  }'
```

### Paso 3: Exportar disponibilidad a Hostelworld

```
https://TU_DOMINIO/api/ical/rooms/1.ics
```

1. En Hostelworld Inbox → Settings → Calendar Import
2. Añade la URL de tu PMS
3. Selecciona intervalo de sincronización (recomendado: 1 hora)

---

## 3. Conexión con Airbnb

### Paso 1: Obtener URL del calendario

1. Ve a tu **listing** en Airbnb
2. Haz clic en **"Availability" → "Sync calendars"**
3. En "Export Calendar", copia la URL iCal

### Paso 2: Registrar en Almanik

```bash
curl -X POST http://localhost:3000/api/ical/sources \
  -H "Content-Type: application/json" \
  -H "session-id: TU_SESSION_ID" \
  -d '{
    "name": "Airbnb - Private Room 1",
    "source_type": "airbnb",
    "ical_url": "https://www.airbnb.com/calendar/ical/XXXXX.ics?s=YYYYY",
    "bed_id": 5,
    "sync_interval_minutes": 120
  }'
```

---

## 4. API Endpoints

### Gestión de Fuentes

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/ical/sources` | Listar todas las fuentes OTA |
| POST | `/api/ical/sources` | Registrar nueva fuente |
| GET | `/api/ical/sources/:id` | Detalle de fuente con estadísticas |
| PUT | `/api/ical/sources/:id` | Actualizar fuente |
| DELETE | `/api/ical/sources/:id` | Eliminar fuente |

### Sincronización

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/ical/sync/:source_id` | Sincronizar fuente específica |
| POST | `/api/ical/sync-all` | Sincronizar todas las fuentes activas |

### Exportación (para OTAs)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/ical/beds/:bed_id.ics` | Calendario iCal de una cama |
| GET | `/api/ical/rooms/:room_id.ics` | Calendario iCal de una habitación |
| GET | `/api/ical/all-rooms.ics` | Calendario consolidado |

### Reservaciones Externas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/ical/external-reservations` | Listar reservas de OTAs |

---

## 5. Ejemplo Completo: Setup Inicial

```bash
# Variables
BASE_URL="http://localhost:3000"
SESSION="TU_SESSION_ID"

# 1. Registrar Booking.com (camas 1-6 = Dormitorio)
curl -X POST "$BASE_URL/api/ical/sources" \
  -H "Content-Type: application/json" \
  -H "session-id: $SESSION" \
  -d '{
    "name": "Booking.com - Dorm 1",
    "source_type": "booking.com",
    "ical_url": "https://admin.booking.com/hotel/hoteladmin/ical.html?t=ABC123",
    "bed_id": 1
  }'

# 2. Registrar Hostelworld
curl -X POST "$BASE_URL/api/ical/sources" \
  -H "Content-Type: application/json" \
  -H "session-id: $SESSION" \
  -d '{
    "name": "Hostelworld - Dorm 6-bed",
    "source_type": "hostelworld",
    "ical_url": "https://inbox.hostelworld.com/ical/export?property=12345&roomtype=dorm6",
    "room_id": 1
  }'

# 3. Primera sincronización manual
curl -X POST "$BASE_URL/api/ical/sync-all" \
  -H "session-id: $SESSION"

# 4. Ver reservaciones importadas
curl "$BASE_URL/api/ical/external-reservations" \
  -H "session-id: $SESSION"

# 5. Ver estado de fuentes
curl "$BASE_URL/api/ical/sources" \
  -H "session-id: $SESSION"
```

---

## 6. Mapeo de Camas/Habitaciones

### Estrategia Recomendada

| OTA | Nivel de mapeo | Recomendación |
|-----|----------------|---------------|
| Booking.com | Por unidad/cama | Mapear `bed_id` específico |
| Hostelworld | Por tipo de habitación | Mapear `room_id` (grupo de camas) |
| Airbnb | Por listing (habitación privada) | Mapear `bed_id` específico |

### Ejemplo de Configuración

```
Almanik PMS:
├── Dormitorio 1 (room_id: 1)
│   ├── Cama 1-A (bed_id: 1) → Booking.com Feed #1
│   ├── Cama 1-B (bed_id: 2) → Booking.com Feed #2
│   ├── Cama 1-C (bed_id: 3) → Hostelworld (room)
│   └── Cama 1-D (bed_id: 4) → Hostelworld (room)
│
├── Privada 1 (room_id: 2)
│   └── Cama P1 (bed_id: 5) → Airbnb + Booking.com
```

---

## 7. Detección de Conflictos

El sistema detecta automáticamente cuando hay **overbooking**:

```json
{
  "sync_result": {
    "processed": 5,
    "created": 3,
    "updated": 1,
    "conflicts": 1
  }
}
```

### Consultar conflictos

```bash
curl "$BASE_URL/api/ical/external-reservations?has_conflict=1" \
  -H "session-id: $SESSION"
```

### Respuesta con conflicto

```json
{
  "id": 15,
  "guest_name": "John Doe",
  "check_in": "2025-12-01",
  "check_out": "2025-12-03",
  "has_conflict": true,
  "conflict_details": "Conflicto con reserva interna #45 (Maria García)"
}
```

---

## 8. Automatización

### Cron Job para Sincronización

El sistema puede sincronizar automáticamente. Para habilitarlo:

```javascript
// server/cron/ical-auto-sync.js
const cron = require('node-cron');

// Cada 2 horas
cron.schedule('0 */2 * * *', async () => {
  const response = await fetch('http://localhost:3000/api/ical/sync-all', {
    method: 'POST',
    headers: { 'session-id': 'SYSTEM_SESSION' }
  });
  console.log('Auto-sync completed:', await response.json());
});
```

### Webhook para Notificaciones

Configura notificaciones cuando se detecten conflictos:

```javascript
// En el módulo de sincronización
if (stats.conflicts > 0) {
  // Enviar notificación push
  await sendPushNotification({
    title: '⚠️ Conflicto de Reserva',
    body: `Se detectaron ${stats.conflicts} conflictos con OTAs`,
    url: '/reservations?filter=conflicts'
  });
}
```

---

## 9. Troubleshooting

### Error: "Failed to fetch iCal"

- Verifica que la URL sea accesible desde el servidor
- Algunas OTAs requieren IP whitelist

### Error: "Source not found"

- El `source_id` no existe
- Usa `GET /api/ical/sources` para ver IDs válidos

### Reservaciones no aparecen

- Verifica el formato de fechas de la OTA
- Algunas OTAs usan UTC, otras hora local
- Revisa `raw_ical_data` en `external_reservations`

### Conflictos falsos positivos

- Ajusta el `bed_id` o `room_id` correcto
- Verifica que no haya duplicados de fuentes

---

## 10. Opciones Avanzadas: Channel Manager

Para sincronización bidireccional más robusta, considera usar un **Channel Manager**:

### Opción A: SiteMinder / Cloudbeds
- Conexión API directa
- Actualización en tiempo real
- Costo: $50-150/mes

### Opción B: MyAllocator (integrado con Hostelworld)
- Gratuito para propiedades pequeñas
- API REST disponible
- Ideal para hostales

### Opción C: Beds24
- Pricing dinámico incluido
- Conexión con 100+ OTAs
- API abierta

---

## Próximos Pasos

1. **Obtén las URLs iCal** de cada OTA
2. **Registra las fuentes** en el PMS
3. **Ejecuta sincronización** manual inicial
4. **Verifica conflictos** y ajusta mapeo
5. **Configura auto-sync** cada 2 horas
6. **Proporciona URLs de exportación** a las OTAs

---

## Contacto / Soporte

- Documentación API: `/docs/05-api/`
- Logs de sync: `GET /api/ical/sources/:id` (incluye últimos 10 syncs)
- Activity Log: `GET /api/audit/logs?module=ical_sync`
