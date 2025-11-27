# STAFF MANAGEMENT API

## Overview

Módulo de gestión de personal para operación de hostal con roles específicos y control de asistencia.

## Roles Disponibles

| Role | Descripción | Salario |
|------|-------------|---------|
| `manager` | Gerente - Acceso total | Sí |
| `administrativo` | Personal administrativo | Sí |
| `recepcionista_pago` | Recepcionista con salario | Sí |
| `recepcionista_voluntario` | Recepcionista voluntario | No |
| `aseo` | Personal de limpieza | Sí |
| `mantenimiento` | Personal de mantenimiento | Sí |
| `voluntario` | Voluntario general (work exchange) | No |

---

## Endpoints

### GET /api/staff

Listar todo el personal con filtros opcionales.

**Query Parameters:**
- `role` - Filtrar por rol
- `active` - Filtrar por estado (1/0)
- `is_volunteer` - Filtrar por tipo (1/0)

**Response:**
```json
{
  "success": true,
  "count": 5,
  "roles": ["manager", "administrativo", ...],
  "role_descriptions": {...},
  "staff": [
    {
      "id": 1,
      "name": "Juan Pérez",
      "role": "recepcionista_pago",
      "position": "Recepcionista",
      "phone": "+57 300 123 4567",
      "email": "juan@hostal.com",
      "salary": 1200000,
      "is_volunteer": 0,
      "active": 1,
      "total_attendance": 15
    }
  ]
}
```

---

### POST /api/staff

Crear nuevo miembro del personal.

**Request Body:**
```json
{
  "name": "María García",
  "role": "aseo",
  "phone": "+57 300 111 2222",
  "email": "maria@hostal.com",
  "document": "12345678",
  "salary": 1000000,
  "schedule": "Lunes-Viernes 8:00-16:00",
  "hire_date": "2025-11-27",
  "emergency_contact_name": "Pedro García",
  "emergency_contact_phone": "+57 311 999 8888",
  "notes": "Experiencia previa en hostales"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Staff member created successfully",
  "staff": { ... }
}
```

---

### GET /api/staff/:id

Obtener detalle de un miembro específico.

**Response:**
```json
{
  "success": true,
  "staff": { ... },
  "recent_attendance": [...],
  "month_stats": {
    "days_worked": 20,
    "present": 18,
    "late": 2,
    "absent": 0
  }
}
```

---

### PUT /api/staff/:id

Actualizar miembro del personal.

**Request Body:** (campos opcionales)
```json
{
  "name": "María García Updated",
  "role": "recepcionista_pago",
  "salary": 1500000,
  "active": true
}
```

---

### DELETE /api/staff/:id

Desactivar miembro (soft delete).

**Response:**
```json
{
  "success": true,
  "message": "Staff member deactivated successfully"
}
```

---

### POST /api/staff/:id/clock-in

Registrar entrada de turno.

**Request Body:** (opcional)
```json
{
  "notes": "Llegó temprano"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Juan Pérez clocked in successfully",
  "attendance": {
    "id": 1,
    "staff_id": 1,
    "date": "2025-11-27",
    "clock_in": "2025-11-27T08:00:00.000Z",
    "clock_out": null,
    "status": "present"
  }
}
```

---

### POST /api/staff/:id/clock-out

Registrar salida de turno.

**Response:**
```json
{
  "success": true,
  "message": "Juan Pérez clocked out successfully",
  "hours_worked": 8.5,
  "attendance": { ... }
}
```

---

### GET /api/staff/:id/attendance

Historial de asistencia de un miembro.

**Query Parameters:**
- `start_date` - Fecha inicio (YYYY-MM-DD)
- `end_date` - Fecha fin (YYYY-MM-DD)
- `limit` - Límite de registros (default: 30)

**Response:**
```json
{
  "success": true,
  "staff": { "id": 1, "name": "...", "role": "..." },
  "attendance": [...],
  "stats": {
    "total_days": 20,
    "present": 18,
    "late": 2,
    "absent": 0,
    "total_hours": 160.5
  }
}
```

---

### GET /api/staff/attendance/today

Personal en turno hoy.

**Response:**
```json
{
  "success": true,
  "date": "2025-11-27",
  "on_duty": [
    {
      "staff_name": "Juan Pérez",
      "role": "recepcionista_pago",
      "clock_in": "2025-11-27T08:00:00.000Z"
    }
  ],
  "completed": [...],
  "total_on_duty": 3,
  "total_completed": 2
}
```

---

### GET /api/staff/stats

Estadísticas generales de personal.

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_active": 10,
    "total_inactive": 2,
    "volunteers": 3,
    "paid_staff": 7,
    "on_duty_today": 4,
    "by_role": [
      { "role": "recepcionista_pago", "count": 3 },
      { "role": "aseo", "count": 2 }
    ]
  }
}
```

---

## Frontend

### Acceso

```
http://localhost:3000/staff.html
```

### Funcionalidades

1. **Dashboard de estadísticas** - Personal activo, en turno, voluntarios, pagos
2. **Personal en turno** - Vista en tiempo real de quién está trabajando
3. **Lista de personal** - Filtrable por rol, estado, tipo
4. **Gestión CRUD** - Agregar, editar, desactivar personal
5. **Clock in/out** - Registro de entrada y salida
6. **Detalle de personal** - Vista con historial de asistencia

---

## Migración

### SQLite (Desarrollo)

```bash
node server/migrate-staff-roles.js
node server/migrate-attendance.js
```

### PostgreSQL (Neon - Producción)

Ejecutar en Neon SQL Editor:
```sql
-- Ver archivo: database/migrations/002-staff-roles.sql
```

---

## Archivos del Módulo

```
server/
├── modules/staff.js           # Backend module
├── migrate-staff-roles.js     # SQLite migration
├── migrate-attendance.js      # Attendance table migration

public/
├── staff.html                 # Frontend page
├── js/staff.js               # Frontend JavaScript

database/migrations/
├── 002-staff-roles.sql       # Neon PostgreSQL migration
```

---

*Documentación generada: 2025-11-27*
