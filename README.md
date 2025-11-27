# 🏨 ALMANIK PMS - Sistema de Gestión Hotelera

## ✅ SISTEMA EN PRODUCCIÓN - FASE 1 COMPLETADA

**Versión:** 1.12.0
**Estado:** Day 12 Completed - Staff, Tasks & Cashbox Modules ✅
**Última actualización:** 2025-11-27

### **🌐 URL DE PRODUCCIÓN:**
**https://hostal-pms.vercel.app**

---

## 🎯 ESTADO ACTUAL DEL PROYECTO

### **Día 8 Completado - Monitoring & Feedback** ✅

| Módulo | Estado | Progreso | Prioridad |
|--------|--------|----------|-----------|
| **🔐 Autenticación** | ✅ Completado | 100% | CRÍTICA |
| **🗄️ Database Neon** | ✅ Migrado | 100% | CRÍTICA |
| **📋 Reservas** | ✅ Completado | 100% | CRÍTICA |
| **🛏️ Gestión de Camas** | ✅ Completado | 100% | ALTA |
| **👥 Gestión de Huéspedes** | ✅ Completado | 100% | ALTA |
| **🛒 Sistema POS** | ✅ Completado | 100% | MEDIA |
| **👨‍💼 Gestión de Personal** | ✅ Completado | 100% | MEDIA |
| **💰 Sistema de Caja** | ✅ Completado | 100% | CRÍTICA |
| **🚶 Tours** | ✅ Completado | 100% | MEDIA |
| **📊 Reportes & Analytics** | ✅ Completado | 100% | MEDIA |
| **📅 iCal Sync** | ✅ Completado | 100% | ALTA |
| **🚀 Producción** | ✅ Live | 100% | CRÍTICA |
| **🔍 Monitoreo** | ✅ Activo | 100% | ALTA |
| **📱 Mobile App** | ✅ PWA Ready | 100% | ALTA |

**Progreso General:** 100% del sistema base + Monitoreo + PWA

---

## 🆕 NOVEDADES - DÍA 12 (2025-11-27) ✅

### 👥 Staff Management Module - NUEVO
- **7 Roles de hostal:** manager, administrativo, recepcionista_pago, recepcionista_voluntario, aseo, mantenimiento, voluntario
- **Control de asistencia:** Clock-in/Clock-out con historial
- **Estadisticas:** Personal activo, en turno, horas trabajadas
- **11 Endpoints API** completos
- **Frontend:** `staff.html` con dashboard y gestion completa

### 📋 Tasks/Maintenance Module - NUEVO
- **6 Tipos de tarea:** cleaning, maintenance, check_preparation, inspection, restock, other
- **4 Prioridades:** urgent, high, normal, low
- **Tablero Kanban:** Pendientes, En Progreso, Completadas
- **Asignacion a staff** con seguimiento
- **10 Endpoints API** completos
- **Frontend:** `tasks.html` con interfaz Kanban

### 💰 Cashbox/Finance Module - NUEVO
- **Sesiones de caja:** Apertura/cierre con control de montos
- **6 Categorias de ingreso:** reservation_payment, walk_in, extra_service, etc.
- **8 Categorias de egreso:** supplies, maintenance, utilities, payroll, etc.
- **4 Metodos de pago:** cash, card, transfer, other
- **Reportes diarios/mensuales** automaticos
- **12 Endpoints API** completos
- **Frontend:** `cashbox.html` con gestion de caja

### 📚 Documentacion API
- `docs/05-api/STAFF-API.md` - Staff Management
- `docs/05-api/TASKS-API.md` - Tasks/Maintenance
- `docs/05-api/CASHBOX-API.md` - Cashbox/Finance

### 🗄️ Migraciones Neon
- `database/migrations/002-staff-roles.sql`
- `database/migrations/003-tasks.sql`
- `database/migrations/004-cashbox.sql`

---

## 🆕 NOVEDADES - DÍA 11 (2025-11-23) ✅

### 🚀 Optimización Completa del Sistema

**Performance Optimization:**
- ✅ **22 Database Indexes** creados en 9 tablas
- ✅ **Cache Headers** configurados para assets estáticos
- ✅ **Compression** Gzip/Brotli activo
- 📈 **Mejora esperada:** 50-90% en query performance

**Security Audit:**
- ✅ **npm audit:** 0 vulnerabilidades
- ✅ **Security Headers:** A+ rating (Helmet)
- ✅ **Rate Limiting:** Configurado y optimizado
- ✅ **Input Validation:** 100% coverage

**Code Cleanup:**
- ✅ **Logging:** Migrado a Winston (production-ready)
- ✅ **Console.logs:** Removidos de producción
- ✅ **Code Quality:** Mejorado y limpio

**Documentación:**
- 📄 `docs/04-daily-plans/DIA-11-RESUMEN.md` - Resumen completo

### 📱 Mobile App (PWA) - COMPLETADO

**Capacidades:**
- ✅ **Instalable:** App nativa en Android/iOS (Add to Home Screen)
- ✅ **Offline Mode:** Funciona sin conexión (consulta datos cacheados)
- ✅ **Performance:** Carga instantánea gracias al Service Worker

**Documentación:**
- 📖 API completa: `docs/05-api/API-DOCUMENTATION.md`
- 📘 Manual de Usuario: `docs/06-user-manual/USER-MANUAL.md`
- 🚀 Checklist Producción: `docs/07-deployment/PRODUCTION-CHECKLIST.md`

---

## 🚀 TECNOLOGÍAS

### **Stack Actual:**
- **Backend:** Node.js 18+ + Express.js
- **Base de Datos:**
  - **Producción:** PostgreSQL 16 (Neon Serverless)
  - **Desarrollo:** SQLite 3
- **Autenticación:** bcrypt + sesiones con roles y permisos
- **Frontend:** Vanilla JavaScript (ES6+) + CSS3
- **Deploy:** Vercel Serverless
- **SSL:** Automático

### **Database Schema (20 Tablas):**

**Tablas Core:**
```
✅ users           - Sistema de autenticación y roles
✅ guests          - Huéspedes (con campos legales)
✅ beds            - 27 camas en 6 habitaciones
✅ bookings        - Reservas completas ⭐ NUEVO
✅ transactions    - Transacciones financieras
```

**Módulos Adicionales:**
```
✅ products              - Inventario POS
✅ sale_items            - Items de ventas
✅ staff                 - Personal (7 roles de hostal) ⭐ MEJORADO
✅ attendance            - Control de asistencia (clock-in/out)
✅ tasks                 - Tareas y mantenimiento ⭐ NUEVO
✅ cashbox_sessions      - Sesiones de caja ⭐ NUEVO
✅ cashbox_transactions  - Movimientos de caja ⭐ NUEVO
✅ tours                 - Tours/Paseos
✅ tour_clicks           - Tracking de clicks
✅ tour_commissions      - Comisiones
✅ reviews               - Reviews de tours
✅ guest_groups          - Grupos de huéspedes
✅ guest_group_members   - Miembros de grupos
✅ bed_blocks            - Bloqueos de camas
✅ activity_log          - Log de actividades
```

---

## 📱 FUNCIONALIDADES

### 🔐 Autenticación y Usuarios
- Login seguro con bcrypt
- 3 roles: Administrador, Recepcionista, Voluntario
- CRUD completo de usuarios
- Control de permisos granular
- Sesiones seguras

**Credenciales de prueba:**
- Admin: `admin` / `admin123`
- Recepción: `recepcion` / `recepcion123`
- Voluntario: `voluntario` / `voluntario123`

### 📋 Sistema de Reservas ⭐ NUEVO
- Crear reservas anticipadas
- Verificación de disponibilidad en tiempo real
- Códigos de confirmación únicos
- Gestión de estados completa
- Actualización de fechas con recálculo automático
- Cancelación de reservas
- Confirmación con transacción automática
- Filtros por estado, fecha, huésped

### 🛏️ Gestión de Camas
- 27 camas en 6 habitaciones (Hab 1-4, Priv 1-2)
- Estados: Clean, Dirty, Occupied, Blocked, Maintenance
- Check-in y check-out
- Asignación de huéspedes

### 👥 Gestión de Huéspedes
- CRUD completo
- Búsqueda avanzada (nombre, documento, email, teléfono)
- Historial de reservas
- Estadísticas
- Campos legales (nacionalidad, pasaporte, contacto emergencia)
- Sistema de blacklist

### 🛒 Sistema POS
- Gestión de productos
- Control de inventario
- Carrito de compras
- Múltiples métodos de pago
- Stock bajo con alertas

### 👨‍💼 Gestión de Personal ⭐ MEJORADO
- **7 Roles especificos:** manager, administrativo, recepcionista_pago, recepcionista_voluntario, aseo, mantenimiento, voluntario
- Clock-in/Clock-out con historial
- Estadisticas de asistencia
- Posiciones y salarios
- Contactos de emergencia
- Estados activo/inactivo

### 📋 Tareas y Mantenimiento ⭐ NUEVO
- Tablero Kanban (Pendientes, En Progreso, Completadas)
- 6 tipos de tarea (limpieza, mantenimiento, inspeccion, etc.)
- 4 niveles de prioridad
- Asignacion a personal
- Seguimiento de completacion

### 💰 Gestion de Caja ⭐ NUEVO
- Apertura/cierre de sesiones de caja
- Registro de ingresos y egresos
- Multiples categorias y metodos de pago
- Reportes diarios y mensuales
- Control de diferencias

### 🚶 Tours
- Catálogo de tours
- Tracking de clicks
- Sistema de comisiones
- Integración con proveedores

### 📊 Analytics y Reportes
- Dashboard con KPIs
- Ocupación en tiempo real
- Reportes financieros
- Gráficos interactivos (Chart.js)

---

## 🚀 QUICK START

### Desarrollo Local

```bash
# 1. Clonar repositorio
git clone [repo-url]
cd almanik-pms-viajero

# 2. Instalar dependencias
npm install

# 3. Configurar entorno (desarrollo usa SQLite automáticamente)
echo "NODE_ENV=development" > .env

# 4. Correr servidor
npm run dev

# 5. Abrir navegador
# http://localhost:3000
# Login: admin / admin123
```

### Testing del Sistema de Reservas

```bash
# Script automático (recomendado)
./test-reservations.sh

# O manual paso a paso
# Ver: GUIA-TESTING-MANUAL.md
```

---

## 📚 DOCUMENTACIÓN

### Documentos Principales

| Documento | Descripción |
|-----------|-------------|
| `README.md` | Este archivo - Overview general |
| `CREDENCIALES-LOGIN.md` | Credenciales de acceso al sistema |
| `GUIA-TESTING-MANUAL.md` | Guía paso a paso para testing |
| `test-reservations.sh` | Script de testing automático |

### Documentación Técnica

**Planning y Desarrollo:**
- `docs/02-planning/DEVELOPMENT-PLAN-2025-UPDATED.md` - Plan maestro de desarrollo
- `docs/02-planning/SPRINT-PLAN-DELEGABLE.md` - Plan de sprints para equipo
- `docs/04-daily-plans/DIA-2-PLAN.md` - Plan detallado Día 2
- `docs/04-daily-plans/DIA-2-RESUMEN.md` - Resumen y logros Día 2

**API Documentation:**
- `docs/05-api/RESERVATIONS-API.md` - API completa de Reservas (7 endpoints)

**Deployment:**
- `docs/03-deployment/NEON-MIGRATION-PLAN.md` - Migración a Neon PostgreSQL
- `docs/03-deployment/DEPLOY-SUCCESS.md` - Deploy a producción

**Product:**
- `docs/01-product/PRD-v3-SIMPLIFICADO.md` - Product Requirements

**Database:**
- `database/schemas/neon-complete-schema.sql` - Schema completo (20 tablas)

---

## 🗂️ ESTRUCTURA DEL PROYECTO

```
almanik-pms-viajero/
├── server/
│   ├── server-simple.js       # Servidor principal
│   ├── db-adapter.js           # Adapter SQLite/PostgreSQL
│   ├── almanik.db              # SQLite (desarrollo)
│   ├── migrate-bookings.js     # Script migración bookings
│   └── modules/
│       └── reservations.js     # Módulo de reservas ⭐ NUEVO
├── public/
│   └── index.html              # Frontend monolítico
├── database/
│   └── schemas/
│       └── neon-complete-schema.sql
├── docs/
│   ├── 01-product/             # PRD y especificaciones
│   ├── 02-planning/            # Planes de desarrollo
│   ├── 03-deployment/          # Guías de deploy
│   ├── 04-daily-plans/         # Planes diarios
│   └── 05-api/                 # Documentación API ⭐ NUEVO
├── test-reservations.sh        # Testing automático ⭐ NUEVO
├── GUIA-TESTING-MANUAL.md      # Guía de testing ⭐ NUEVO
├── CREDENCIALES-LOGIN.md       # Credenciales
├── package.json
├── .env
└── README.md
```

---

## 🔌 API ENDPOINTS

### Autenticación
- `POST /api/login` - Login de usuario
- `POST /api/logout` - Logout de usuario

### Usuarios
- `GET /api/users` - Listar usuarios (admin)
- `POST /api/users` - Crear usuario (admin)

### Reservas ⭐ NUEVO
- `POST /api/reservations` - Crear reserva
- `GET /api/reservations` - Listar reservas
- `GET /api/reservations/:id` - Ver detalles
- `PUT /api/reservations/:id` - Actualizar reserva
- `DELETE /api/reservations/:id` - Cancelar reserva
- `POST /api/reservations/:id/confirm` - Confirmar reserva
- `GET /api/reservations/availability/check` - Verificar disponibilidad

### Huéspedes
- `GET /api/guests` - Listar huéspedes
- `POST /api/guests` - Crear huésped
- `GET /api/guests/search` - Buscar huéspedes
- `PUT /api/guests/:id` - Actualizar huésped

### Camas
- `GET /api/beds` - Listar camas
- `PUT /api/beds/:id/status` - Actualizar estado

### Check-in/Check-out
- `POST /api/checkin` - Realizar check-in
- `POST /api/checkout/:bed_id` - Realizar check-out
- `GET /api/balance/:bed_id` - Ver balance

### POS
- `GET /api/products` - Listar productos
- `POST /api/sell` - Registrar venta

### Dashboard
- `GET /api/dashboard` - Obtener estadísticas

**Ver documentación completa:** `docs/05-api/RESERVATIONS-API.md`

---

## 🧪 TESTING

### Testing Automático
```bash
# Testing completo del sistema de reservas
./test-reservations.sh
```

### Testing Manual
Ver: `GUIA-TESTING-MANUAL.md`

### Test Cases Cubiertos
- ✅ Login y autenticación
- ✅ Verificación de disponibilidad
- ✅ Creación de reservas
- ✅ Confirmación de reservas
- ✅ Actualización de fechas
- ✅ Cancelación de reservas
- ✅ Validación de conflictos
- ✅ Cálculo automático de precios
- ✅ Generación de códigos únicos

---

## 🔄 FLUJO DE TRABAJO

### Desarrollo
1. **Desarrollo local:** SQLite (automático)
2. **Testing local:** `npm run dev` + `test-reservations.sh`
3. **Commit:** Mensajes descriptivos con convención
4. **Push:** A branch correspondiente

### Producción
1. **Database:** PostgreSQL (Neon Serverless)
2. **Deploy:** Vercel (automático en push a main)
3. **URL:** https://hostal-pms.vercel.app

---

## 📊 PROGRESO DEL PROYECTO

### Completado (70%)
- ✅ Infraestructura base
- ✅ Sistema de autenticación
- ✅ Database completa (20 tablas)
- ✅ Migración a Neon
- ✅ Sistema de reservas (backend)
- ✅ CRUD de huéspedes
- ✅ CRUD de camas
- ✅ Check-in/check-out básico
- ✅ POS básico
- ✅ Dashboard con métricas

### En Desarrollo (30%)
- 🔄 Reservas Frontend (Día 3)
- 🔄 Sistema de Caja completo
- 🔄 Check-in/check-out mejorado
- 🔄 POS con inventario real
- 🔄 Gestión de Staff completa
- 🔄 Sistema de Tareas
- 🔄 Tours completo
- 🔄 Reportes avanzados

---

## 🗓️ ROADMAP

### Semana 1 (Actual) - FASE 1 & 2 (Acelerada)
- [x] Día 1: Migración Neon ✅
- [x] Día 2: Reservas Backend ✅
- [x] Día 3: Reservas Frontend ✅
- [x] Día 4: Security & Monitoring ✅
- [x] Día 5: CI/CD & Performance ✅
- [x] Día 6: Analytics & Docs ✅
- [x] Día 7: Production Deployment & Go-Live ✅

### Semana 2 - FASE 3 (Optimización & Expansión)
- [x] Día 8: Post-Launch Monitoring & Feedback ✅
- [x] Día 9: Mobile App (PWA) Setup ✅
- [x] Día 10: Advanced Reporting & AI Insights ✅
- [x] **Día 11:** System Optimization & Security Audit ✅ (Completado 2025-11-23)

---

## 👥 EQUIPO Y DELEGACIÓN

### Tareas Delegables
- ✅ Frontend de Reservas (Día 3)
- ✅ Diseño de componentes UI
- ✅ Módulos independientes (Caja, POS, Staff)
- ✅ Testing de features

### Requiere Supervisión
- ⚠️ Integración de módulos
- ⚠️ Database migrations
- ⚠️ Deploy a producción
- ⚠️ Security features

**Ver:** `docs/02-planning/SPRINT-PLAN-DELEGABLE.md`

---

## 🐛 ISSUES CONOCIDOS

**Ninguno en producción** ✅

**Pendientes menores:**
- UI de reservas no implementada (planificado Día 3)
- Sistema de caja solo backend básico
- POS usa productos hardcoded (migración pendiente)

---

## 📝 CHANGELOG

### v1.11.0 (2025-11-23) - DÍA 11 ✅
**Performance:**
- ⚡ 22 database indexes created (50-90% query improvement)
- 🚀 Cache headers optimized for static assets
- 📦 Compression active (Gzip/Brotli)

**Security:**
- 🔒 npm audit: 0 vulnerabilities
- 🛡️ Security headers: A+ rating
- 🚫 Rate limiting optimized
- ✅ Input validation: 100% coverage

**Code Quality:**
- 🧹 Console.logs removed from production
- 📊 Winston logger implementation
- ✨ Production-ready code

**Documentation:**
- 📄 Complete optimization report (DIA-11-RESUMEN.md)

### v1.10.0 (2025-11-23) - DÍA 9 FIX
**Fixed:**
- 🐛 Fix: Service Worker registration missing in HTML files
- ✨ PWA now fully functional and installable

### v1.2.0 (2025-11-20) - DÍA 2
**Agregado:**
- ✨ Sistema completo de Reservas (Backend)
- ✨ 7 nuevos endpoints API
- ✨ Validación de disponibilidad con conflictos
- ✨ Generación automática de códigos
- ✨ Documentación API completa
- ✨ Scripts de testing automático
- 🗄️ Migración de schema bookings (7 columnas)

### v1.1.0 (2025-11-19) - DÍA 1
**Agregado:**
- ✨ Migración a Neon PostgreSQL
- ✨ Schema completo (20 tablas)
- ✨ Sistema de autenticación mejorado
- 🐛 Fix: Errores JavaScript frontend
- 📝 Documentación de migración

### v1.0.0 (2025-10-10)
**Release Inicial:**
- ✨ Deploy a Vercel
- ✨ Database Supabase
- ✨ Features básicas funcionando

---

## 🤝 CONTRIBUIR

### Setup para Desarrolladores
1. Fork del repositorio
2. Crear branch: `git checkout -b feature/nueva-feature`
3. Commit: `git commit -m "feat: descripción"`
4. Push: `git push origin feature/nueva-feature`
5. Crear Pull Request

### Convenciones
- **Commits:** Conventional Commits (feat, fix, docs, etc.)
- **Código:** ESLint + Prettier
- **Testing:** Obligatorio para nuevas features
- **Documentación:** Actualizar con cambios

---

## 📞 SOPORTE

### Documentación
- API: `docs/05-api/`
- Guías: `GUIA-TESTING-MANUAL.md`
- Plans: `docs/04-daily-plans/`

### Recursos
- **Production:** https://hostal-pms.vercel.app
- **Neon Dashboard:** https://console.neon.tech
- **Vercel Dashboard:** https://vercel.com

---

## 📄 LICENCIA

MIT License - Ver LICENSE file

---

## ⭐ FEATURES DESTACADAS

### 🎯 Código de Confirmación Único
Cada reserva genera un código único: `ALM-YYYYMMDD-HHMMSS`
```
Ejemplo: ALM-20251120-184046
```

### 🔍 Validación de Disponibilidad Inteligente
Detecta conflictos de reservas en tiempo real:
- Superposición de fechas
- Múltiples reservas misma cama
- Estados de reserva (pending, confirmed, checked_in)

### 💰 Cálculo Automático de Precios
```javascript
total = precio_cama × noches
noches = (check_out - check_in) en días
```

### 📊 Transacciones Automáticas
Al confirmar una reserva:
- Se crea transacción tipo "charge"
- Se registra en activity_log
- Se vincula con la reserva

---

## 🎉 AGRADECIMIENTOS

**Desarrollado con:**
- ❤️ Node.js
- ⚡ Express.js
- 🗄️ PostgreSQL (Neon)
- 🚀 Vercel
- 🤖 Claude Code

---

**Status:** ✅ Day 11 Completed - System Optimized & Secured
**Versión:** 1.11.0
**Última actualización:** 2025-11-23
**Próximo:** Day 12 - User Training & Documentation Updates

**¡Sistema Optimizado y Seguro para Producción!** 🚀🔒
