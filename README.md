# ALMANIK PMS - Sistema de Gestion Hotelera

## SISTEMA LISTO PARA PRODUCCION - v1.12.3

**Version:** 1.12.3
**Estado:** Auditado y Verificado - 100% Funcional
**Ultima actualizacion:** 2025-11-27

### URL DE PRODUCCION:
**https://hostal-pms.vercel.app**

---

## ESTADO ACTUAL DEL PROYECTO

### Auditoria Completa (2025-11-27)

| Metrica | Resultado |
|---------|-----------|
| Endpoints API Probados | 40 |
| Endpoints Funcionando | 40 (100%) |
| Bugs Encontrados | 4 |
| Bugs Corregidos | 4 |
| Estado | **PRODUCCION READY** |

### Modulos del Sistema

| Modulo | Estado | Endpoints | Frontend |
|--------|--------|-----------|----------|
| Autenticacion | Completado | 2 | index.html |
| Huespedes | Completado | 5 | index.html |
| Camas/Habitaciones | Completado | 4 | index.html |
| Reservaciones | Completado | 7 | reservations.html |
| Transacciones | Completado | 3 | index.html |
| Productos/POS | Completado | 2 | index.html |
| Tours/Paseos | Completado | 5 | index.html |
| Analytics | Completado | 5 | analytics.html |
| iCal Sync | Completado | 11 | ical-sync.html |
| Staff/Personal | Completado | 11 | staff.html |
| Tasks/Tareas | Completado | 10 | tasks.html |
| Cashbox/Caja | Completado | 12 | cashbox.html |
| Reportes | Completado | 4 | reports-advanced.html |

**Total:** 72+ Endpoints API | 8 Paginas Frontend

---

## NOVEDADES - DIA 13 (2025-11-27)

### Auditoria Completa del Sistema
- Verificacion de 40 endpoints principales
- Correccion de 4 bugs criticos
- Tasa de exito: 100%

### Bug Fixes Realizados

1. **Cashbox Daily Report** (`server/modules/cashbox.js`)
   - Error: `SQLITE_ERROR: ambiguous column name: created_at`
   - Fix: Agregado prefijo de tabla `t.created_at`

2. **Content-Security-Policy** (`server/config/security.js`)
   - Error: CSP bloqueaba onclick handlers
   - Fix: Agregado `scriptSrcAttr: ["'unsafe-inline'"]`

3. **Estructura HTML** (`public/index.html`)
   - Error: Vistas anidadas incorrectamente
   - Fix: Corregido nivel de anidacion de tours-view y users-view

4. **Navegacion Frontend** (`public/index.html`)
   - Error: Botones con funciones inexistentes
   - Fix: Limpieza de navegacion duplicada y rota

### Frontend Completado

1. **Modal de Movimiento de Caja**
   - Formulario completo con tipo (Ingreso/Egreso)
   - Categorias: Hospedaje, Ventas, Comisiones, Servicios, etc.
   - Metodos de pago: Efectivo, Tarjeta, Transferencia
   - Conectado a API `/api/cashbox/transactions`

2. **Modal de Gestion de Tours**
   - Crear nuevos tours
   - Editar tours existentes
   - Reservar tours para huespedes
   - Registrar clicks para comisiones

### Documentacion de Produccion

- `docs/07-deployment/VERCEL-NEON-DEPLOYMENT.md` - Guia paso a paso
- `database/schemas/neon-production-schema.sql` - Esquema sin datos demo
- `.env.example` - Variables de entorno documentadas

---

## TECNOLOGIAS

### Stack
- **Backend:** Node.js 18+ + Express.js
- **Base de Datos:**
  - **Produccion:** PostgreSQL 16 (Neon Serverless)
  - **Desarrollo:** SQLite 3
- **Frontend:** Vanilla JavaScript (ES6+) + CSS3
- **Deploy:** Vercel Serverless
- **Seguridad:** Helmet, Rate Limiting, CORS, Input Validation

### Database Schema (20 Tablas)

**Core:**
- users, guests, beds, bookings, transactions

**Modulos:**
- products, sale_items, staff, attendance, tasks
- cashbox_sessions, cashbox_transactions
- tours, tour_clicks, tour_commissions, reviews
- guest_groups, guest_group_members, bed_blocks
- activity_log, ical_sources, ical_external_reservations

---

## QUICK START

### Desarrollo Local

```bash
# 1. Clonar repositorio
git clone https://github.com/founderjourney/hostal-pms.git
cd hostal-pms

# 2. Instalar dependencias
npm install

# 3. Iniciar servidor (usa SQLite automaticamente)
npm start

# 4. Abrir navegador
# http://localhost:3000
# Login: admin / admin123
```

### Produccion (Vercel + Neon)

Ver guia completa: `docs/07-deployment/VERCEL-NEON-DEPLOYMENT.md`

1. Crear base de datos en [neon.tech](https://neon.tech)
2. Ejecutar `database/schemas/neon-production-schema.sql`
3. Configurar variables en Vercel:
   - `DATABASE_URL`
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET`
4. Deploy

---

## API ENDPOINTS

### Autenticacion
- `POST /api/login` - Login
- `GET /api/users` - Listar usuarios

### Reservaciones (7)
- `GET /api/reservations` - Listar
- `POST /api/reservations` - Crear
- `GET /api/reservations/:id` - Detalle
- `PUT /api/reservations/:id` - Actualizar
- `DELETE /api/reservations/:id` - Cancelar
- `POST /api/reservations/:id/confirm` - Confirmar
- `GET /api/reservations/availability/check` - Disponibilidad

### Analytics (5)
- `GET /api/analytics/overview`
- `GET /api/analytics/revenue`
- `GET /api/analytics/occupancy`
- `GET /api/analytics/bookings`
- `GET /api/analytics/commissions`

### iCal Sync (11)
- `GET /api/ical/sources` - Listar fuentes
- `POST /api/ical/sources` - Crear fuente
- `PUT /api/ical/sources/:id` - Actualizar
- `DELETE /api/ical/sources/:id` - Eliminar
- `POST /api/ical/sources/:id/sync` - Sincronizar
- `GET /api/ical/external-reservations` - Reservas externas
- `GET /api/ical/export/:bed_id.ics` - Exportar iCal
- `POST /api/ical/sync-all` - Sync todas
- `GET /api/ical/logs` - Ver logs
- `GET /api/ical/stats` - Estadisticas
- `GET /api/ical/calendar-links` - Links de calendario

### Staff (11)
- `GET /api/staff` - Listar personal
- `POST /api/staff` - Crear
- `GET /api/staff/:id` - Detalle
- `PUT /api/staff/:id` - Actualizar
- `DELETE /api/staff/:id` - Eliminar
- `POST /api/staff/:id/clock-in` - Entrada
- `POST /api/staff/:id/clock-out` - Salida
- `GET /api/staff/stats` - Estadisticas
- `GET /api/staff/attendance/today` - Asistencia hoy
- `GET /api/staff/attendance/history` - Historial
- `GET /api/staff/config/roles` - Roles disponibles

### Tasks (10)
- `GET /api/tasks` - Listar tareas
- `POST /api/tasks` - Crear
- `GET /api/tasks/:id` - Detalle
- `PUT /api/tasks/:id` - Actualizar
- `DELETE /api/tasks/:id` - Eliminar
- `POST /api/tasks/:id/start` - Iniciar
- `POST /api/tasks/:id/complete` - Completar
- `POST /api/tasks/:id/assign` - Asignar
- `GET /api/tasks/stats` - Estadisticas
- `GET /api/tasks/my` - Mis tareas

### Cashbox (12)
- `GET /api/cashbox/sessions` - Listar sesiones
- `GET /api/cashbox/sessions/current` - Sesion actual
- `POST /api/cashbox/sessions/open` - Abrir caja
- `POST /api/cashbox/sessions/close` - Cerrar caja
- `GET /api/cashbox/sessions/:id` - Detalle sesion
- `GET /api/cashbox/transactions` - Listar movimientos
- `POST /api/cashbox/transactions` - Crear movimiento
- `GET /api/cashbox/transactions/:id` - Detalle
- `DELETE /api/cashbox/transactions/:id` - Eliminar
- `GET /api/cashbox/stats` - Estadisticas
- `GET /api/cashbox/daily-report` - Reporte diario
- `GET /api/cashbox/config/categories` - Categorias

---

## ESTRUCTURA DEL PROYECTO

```
almanik-pms-viajero/
├── server/
│   ├── server-simple.js       # Servidor principal (~2,200 lineas)
│   ├── db-adapter.js          # Adapter SQLite/PostgreSQL
│   ├── config/
│   │   ├── security.js        # Helmet, Rate Limiting, CORS
│   │   ├── logger.js          # Winston logging
│   │   └── monitoring.js      # Health checks
│   └── modules/
│       ├── reservations.js    # Modulo reservaciones
│       ├── analytics.js       # Modulo analytics
│       ├── ical-sync.js       # Sincronizacion iCal
│       ├── staff.js           # Gestion de personal
│       ├── tasks.js           # Tareas/Mantenimiento
│       └── cashbox.js         # Caja/Finanzas
├── public/
│   ├── index.html             # Dashboard principal
│   ├── reservations.html      # Gestion de reservas
│   ├── analytics.html         # Graficos y analytics
│   ├── ical-sync.html         # Sincronizacion iCal
│   ├── staff.html             # Gestion de personal
│   ├── tasks.html             # Tareas Kanban
│   ├── cashbox.html           # Caja registradora
│   └── reports-advanced.html  # Reportes avanzados
├── database/
│   └── schemas/
│       ├── neon-complete-schema.sql      # Con datos demo
│       └── neon-production-schema.sql    # Sin datos demo
├── docs/
│   ├── 05-api/                # Documentacion API
│   └── 07-deployment/         # Guias de despliegue
├── scripts/
│   ├── full-audit.sh          # Auditoria completa
│   └── test-modules.sh        # Tests de modulos
├── vercel.json                # Configuracion Vercel
├── .env.example               # Variables de entorno
└── README.md
```

---

## CREDENCIALES DE PRUEBA

| Usuario | Password | Rol |
|---------|----------|-----|
| admin | admin123 | Administrador |
| recepcion | recepcion123 | Recepcionista |
| voluntario | voluntario123 | Voluntario |

**IMPORTANTE:** Cambiar estas credenciales en produccion

---

## SCRIPTS DE AUDITORIA

```bash
# Auditoria completa (40 endpoints)
bash scripts/full-audit.sh

# Tests de modulos especificos
bash scripts/test-modules.sh
```

---

## CHANGELOG

### v1.12.3 (2025-11-27) - OPTIMIZACION DE RENDIMIENTO
**Performance:**
- Agregado endpoint `/ping` (warmup sin DB)
- Agregado endpoint `/warmup` (pre-calienta conexion DB)
- Optimizado pool de conexiones PostgreSQL para serverless
- Configurado `maxDuration: 30` en Vercel

**Docs:**
- Guia de optimizacion de rendimiento
- Instrucciones para configurar keep-alive

### v1.12.2 (2025-11-27) - AUDITORIA COMPLETA
**Bug Fixes:**
- Fix: Cashbox daily-report columna ambigua
- Fix: CSP bloqueando onclick handlers
- Fix: Estructura HTML incorrecta
- Fix: Navegacion duplicada/rota

**Features:**
- Modal de movimiento de caja funcional
- Modal de gestion de tours funcional
- Auto-carga de datos al cambiar vistas

**Docs:**
- Guia de despliegue Vercel + Neon
- Esquema de produccion sin datos demo
- Auditoria documentada

### v1.12.0 (2025-11-27) - STAFF, TASKS & CASHBOX
- Modulo Staff Management (11 endpoints)
- Modulo Tasks/Maintenance (10 endpoints)
- Modulo Cashbox/Finance (12 endpoints)
- Frontend para cada modulo

### v1.11.0 (2025-11-23) - OPTIMIZACION
- 22 indices de base de datos
- Security audit completado
- PWA funcional

---

## SOPORTE

- **Produccion:** https://hostal-pms.vercel.app
- **GitHub:** https://github.com/founderjourney/hostal-pms
- **Documentacion:** `docs/`

---

**Estado:** PRODUCCION READY
**Version:** 1.12.3
**Auditoria:** 40/40 endpoints (100%)
**Fecha:** 2025-11-27
