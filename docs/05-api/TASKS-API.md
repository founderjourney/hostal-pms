# TASKS/MAINTENANCE API

## Overview

Modulo de gestion de tareas de limpieza, mantenimiento e inspecciones para operacion del hostal.

## Tipos de Tarea

| Type | Label | Descripcion |
|------|-------|-------------|
| `cleaning` | Limpieza | Limpieza de habitacion/cama |
| `maintenance` | Mantenimiento | Reparaciones y mantenimiento |
| `check_preparation` | Prep. Check-in | Preparacion para check-in |
| `inspection` | Inspeccion | Inspeccion de instalaciones |
| `restock` | Reabastecimiento | Reabastecer suministros |
| `other` | Otro | Otras tareas |

## Prioridades

| Priority | Label | Color |
|----------|-------|-------|
| `urgent` | Urgente | Rojo |
| `high` | Alta | Naranja |
| `normal` | Normal | Azul |
| `low` | Baja | Gris |

## Estados

| Status | Label | Descripcion |
|--------|-------|-------------|
| `pending` | Pendiente | Tarea no iniciada |
| `in_progress` | En Progreso | Tarea en ejecucion |
| `completed` | Completada | Tarea finalizada |
| `cancelled` | Cancelada | Tarea cancelada |

---

## Endpoints

### GET /api/tasks

Listar todas las tareas con filtros opcionales.

**Query Parameters:**
- `task_type` - Filtrar por tipo
- `priority` - Filtrar por prioridad
- `status` - Filtrar por estado
- `staff_id` - Filtrar por personal asignado
- `entity_type` - Filtrar por tipo de entidad (bed, room)
- `entity_id` - Filtrar por ID de entidad
- `due_today` - Tareas con vencimiento hoy (1)
- `overdue` - Tareas vencidas (1)

**Response:**
```json
{
  "success": true,
  "count": 4,
  "task_types": ["cleaning", "maintenance", ...],
  "task_type_labels": {...},
  "priorities": ["urgent", "high", "normal", "low"],
  "priority_labels": {...},
  "statuses": ["pending", "in_progress", "completed", "cancelled"],
  "status_labels": {...},
  "tasks": [
    {
      "id": 1,
      "staff_id": 5,
      "assigned_by": 1,
      "task_type": "cleaning",
      "priority": "normal",
      "entity_type": "bed",
      "entity_id": 1,
      "title": "Limpieza cama 1-A",
      "description": "Cambiar sabanas y limpiar area",
      "status": "pending",
      "due_date": "2025-11-27T14:00:00",
      "started_at": null,
      "completed_at": null,
      "completion_notes": null,
      "created_at": "2025-11-27 10:00:00",
      "updated_at": "2025-11-27 10:00:00",
      "staff_name": "Maria Garcia",
      "staff_role": "aseo",
      "assigned_by_name": "Administrador"
    }
  ]
}
```

---

### GET /api/tasks/:id

Obtener detalle de una tarea especifica.

**Response:**
```json
{
  "success": true,
  "task": {
    "id": 1,
    "staff_id": 5,
    "assigned_by": 1,
    "task_type": "cleaning",
    "priority": "normal",
    "entity_type": "bed",
    "entity_id": 1,
    "title": "Limpieza cama 1-A",
    "description": "Cambiar sabanas y limpiar area",
    "status": "pending",
    "due_date": "2025-11-27T14:00:00",
    "started_at": null,
    "completed_at": null,
    "completion_notes": null,
    "staff_name": "Maria Garcia",
    "staff_role": "aseo",
    "assigned_by_name": "Administrador"
  }
}
```

---

### POST /api/tasks

Crear nueva tarea.

**Request Body:**
```json
{
  "title": "Reparar lampara",
  "task_type": "maintenance",
  "priority": "high",
  "staff_id": 3,
  "description": "La lampara del pasillo no enciende",
  "entity_type": "room",
  "entity_id": 2,
  "due_date": "2025-11-28T10:00:00"
}
```

**Required Fields:**
- `title` - Titulo de la tarea

**Optional Fields:**
- `task_type` - Tipo (default: 'other')
- `priority` - Prioridad (default: 'normal')
- `staff_id` - ID del personal asignado
- `description` - Descripcion detallada
- `entity_type` - Tipo de entidad relacionada
- `entity_id` - ID de entidad relacionada
- `due_date` - Fecha limite

**Response:**
```json
{
  "success": true,
  "message": "Task created successfully",
  "task": { ... }
}
```

---

### PUT /api/tasks/:id

Actualizar tarea existente.

**Request Body:** (campos opcionales)
```json
{
  "title": "Reparar lampara - URGENTE",
  "priority": "urgent",
  "staff_id": 5,
  "due_date": "2025-11-27T16:00:00"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Task updated successfully",
  "task": { ... }
}
```

---

### DELETE /api/tasks/:id

Cancelar/eliminar tarea.

**Response:**
```json
{
  "success": true,
  "message": "Task cancelled successfully"
}
```

---

### POST /api/tasks/:id/start

Iniciar tarea (cambiar estado a in_progress).

**Response:**
```json
{
  "success": true,
  "message": "Task started",
  "task": {
    "id": 1,
    "status": "in_progress",
    "started_at": "2025-11-27T12:00:00",
    ...
  }
}
```

---

### POST /api/tasks/:id/complete

Completar tarea.

**Request Body:** (opcional)
```json
{
  "completion_notes": "Sabanas cambiadas, area limpia"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Task completed",
  "task": {
    "id": 1,
    "status": "completed",
    "completed_at": "2025-11-27T13:30:00",
    "completion_notes": "Sabanas cambiadas, area limpia",
    ...
  }
}
```

---

### GET /api/tasks/stats

Estadisticas generales de tareas.

**Response:**
```json
{
  "success": true,
  "stats": {
    "by_status": [
      { "status": "pending", "count": 5 },
      { "status": "in_progress", "count": 2 },
      { "status": "completed", "count": 10 }
    ],
    "by_type": [
      { "task_type": "cleaning", "count": 8 },
      { "task_type": "maintenance", "count": 5 }
    ],
    "by_priority": [
      { "priority": "urgent", "count": 1 },
      { "priority": "high", "count": 3 },
      { "priority": "normal", "count": 10 }
    ],
    "overdue": 2,
    "due_today": 3,
    "completed_today": 5,
    "unassigned": 4
  }
}
```

---

### GET /api/tasks/my

Tareas asignadas al usuario autenticado (si tiene staff_id asociado).

**Response:**
```json
{
  "success": true,
  "staff_id": 5,
  "count": 3,
  "tasks": [ ... ]
}
```

---

### GET /api/tasks/bed/:bedId/cleaning

Historial de limpiezas para una cama especifica.

**Response:**
```json
{
  "success": true,
  "bed_id": 1,
  "count": 5,
  "cleaning_tasks": [
    {
      "id": 10,
      "title": "Limpieza cama 1-A",
      "status": "completed",
      "completed_at": "2025-11-27T10:00:00",
      "staff_name": "Maria Garcia"
    }
  ]
}
```

---

## Frontend

### Acceso

```
http://localhost:3000/tasks.html
```

### Funcionalidades

1. **Dashboard de estadisticas** - Vencidas, pendientes, en progreso, completadas hoy
2. **Tablero Kanban** - Vista por columnas: Pendientes, En Progreso, Completadas
3. **Filtros** - Por tipo, prioridad, estado, personal
4. **CRUD completo** - Crear, editar, iniciar, completar, cancelar tareas
5. **Asignacion** - Asignar tareas a personal activo
6. **Indicadores visuales** - Colores por prioridad, iconos por tipo

---

## Migracion

### SQLite (Desarrollo)

```bash
node server/migrate-tasks.js
```

### PostgreSQL (Neon - Produccion)

Ejecutar en Neon SQL Editor:
```sql
-- Ver archivo: database/migrations/003-tasks.sql
```

---

## Archivos del Modulo

```
server/
├── modules/tasks.js           # Backend module
├── migrate-tasks.js           # SQLite migration

public/
├── tasks.html                 # Frontend page
├── js/tasks.js               # Frontend JavaScript

database/migrations/
├── 003-tasks.sql             # Neon PostgreSQL migration

docs/05-api/
├── TASKS-API.md              # Esta documentacion
```

---

## Integracion con Otros Modulos

### Staff
- Las tareas pueden asignarse a cualquier miembro activo del personal
- El campo `staff_id` referencia la tabla `staff`

### Beds/Rooms
- Las tareas pueden vincularse a camas o habitaciones usando `entity_type` y `entity_id`
- Util para tareas de limpieza o mantenimiento especifico

### Activity Log
- Todas las acciones de tareas se registran en `activity_log`
- Acciones: task_created, task_updated, task_started, task_completed, task_cancelled

---

*Documentacion generada: 2025-11-27*
