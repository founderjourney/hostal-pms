# DOCUMENTACION ALMANIK PMS

Bienvenido al centro de documentacion del sistema Almanik PMS. Toda la documentacion ha sido organizada profesionalmente para facilitar su consulta.

**Version:** 1.12.4
**Ultima actualizacion:** 2025-11-28

---

## ESTRUCTURA DE DOCUMENTACION

### 01. Documentacion de Producto
**Ubicacion:** `docs/01-product/`

Define que es el sistema, sus objetivos y validaciones:

- **PRD-v3-SIMPLIFICADO.md** - Product Requirements Document (version simplificada)
- **MVP-VALIDATION-SUMMARY.md** - Resumen de validacion del MVP
- **RESUMEN-EJECUTIVO-SISTEMA.md** - Resumen ejecutivo para stakeholders

### 02. Planificacion y Roadmaps
**Ubicacion:** `docs/02-planning/`

Planificacion del proyecto y hojas de ruta:

- **ROADMAP-SENIOR.md** - Roadmap tecnico nivel senior
- **ROADMAP-FUTURO-FEATURES-COMPLEJAS.md** - Features avanzadas futuras
- **SPRINTS-ALMANIK-PMS-SIMPLIFICADO.md** - Planificacion de sprints
- **DEVELOPMENT-PLAN-2025-UPDATED.md** - Plan de desarrollo 2025

### 03. Deployment y Configuracion
**Ubicacion:** `docs/03-deployment/`

Guias de despliegue y configuracion en produccion:

- **DEPLOYMENT-GUIDE.md** - Guia general de despliegue
- **NEON-MIGRATION-PLAN.md** - Plan de migracion a Neon PostgreSQL
- **MIGRATION-COMPLETE.md** - Reporte de migracion completada
- **PRODUCTION-DEPLOY-COMPLETE.md** - Despliegue en produccion completo

### 04. Planes Diarios y Reportes
**Ubicacion:** `docs/04-daily-plans/` y `docs/04-reports/`

#### Planes Diarios (Days 2-11):
- **DIA-2-PLAN.md** a **DIA-11-PLAN.md** - Planes detallados con estrategia de delegacion
- **DIA-X-RESUMEN.md** - Resumenes de ejecucion completados
- **FIX-NAVEGACION-CRITICO.md** - Hotfix de navegacion

#### Reportes de Estado:
- **STATUS-REPORT-CURRENT.md** - Reporte de estado
- **TECHNICAL-AUDIT-REPORT.md** - Auditoria tecnica del sistema
- **SENIOR-ARCHITECT-AUDIT-2025-11-19.md** - Auditoria arquitectonica

### 05. Documentacion API
**Ubicacion:** `docs/05-api/`

Documentacion detallada de APIs y endpoints:

| Archivo | Endpoints | Descripcion |
|---------|-----------|-------------|
| **API-COMPLETE.md** | Overview | Vista general de todas las APIs |
| **RESERVATIONS-API.md** | 7 | API de Reservaciones |
| **ICAL-SYNC-API.md** | 11 | API de Sincronizacion iCal |
| **STAFF-API.md** | 11 | API de Gestion de Personal |
| **TASKS-API.md** | 10 | API de Tareas/Mantenimiento |
| **CASHBOX-API.md** | 12 | API de Caja/Finanzas |

**Total:** 51+ endpoints documentados

### 06. Manual de Usuario
**Ubicacion:** `docs/06-user-manual/`

- **USER-MANUAL.md** - Manual completo para usuarios del sistema

### 07. Guias de Produccion
**Ubicacion:** `docs/07-deployment/`

- **VERCEL-NEON-DEPLOYMENT.md** - Guia paso a paso Vercel + Neon
- **PERFORMANCE-OPTIMIZATION.md** - Optimizacion de rendimiento serverless
- **PRODUCTION-CHECKLIST.md** - Checklist de produccion

### 08. Arquitectura
**Ubicacion:** `docs/08-architecture/`

Documentacion de arquitectura del sistema.

### Notas de Desarrollo
**Ubicacion:** `docs/05-development/`

- **context.md** - Contexto completo del proyecto (IMPORTANTE)

### Archivo de Documentos Obsoletos
**Ubicacion:** `docs/archive/obsolete-docs/`

Documentacion antigua que ya no es relevante pero se mantiene para referencia historica.

---

## INICIO RAPIDO

### Para nuevos desarrolladores:
1. **START HERE:** `docs/START-HERE.md`
2. **Progreso actual:** `docs/PROJECT-TRACKING.md`
3. **Contexto completo:** `docs/05-development/context.md`
4. **PRD del sistema:** `docs/01-product/PRD-v3-SIMPLIFICADO.md`

### Para usar las APIs:
1. **Vista general:** `docs/05-api/API-COMPLETE.md`
2. **Reservations:** `docs/05-api/RESERVATIONS-API.md`
3. **Staff:** `docs/05-api/STAFF-API.md`
4. **Tasks:** `docs/05-api/TASKS-API.md`
5. **Cashbox:** `docs/05-api/CASHBOX-API.md`
6. **iCal:** `docs/05-api/ICAL-SYNC-API.md`

### Para deployment:
1. **Guia Vercel+Neon:** `docs/07-deployment/VERCEL-NEON-DEPLOYMENT.md`
2. **Optimizacion:** `docs/07-deployment/PERFORMANCE-OPTIMIZATION.md`
3. **Checklist:** `docs/07-deployment/PRODUCTION-CHECKLIST.md`

### Para stakeholders:
1. **Progreso actual:** `docs/PROJECT-TRACKING.md`
2. **Resumen ejecutivo:** `docs/01-product/RESUMEN-EJECUTIVO-SISTEMA.md`
3. **Roadmap:** `docs/02-planning/ROADMAP-SENIOR.md`

---

## RECURSOS DEL PROYECTO

### Base de Datos
**Ubicacion:** `database/`

- `schemas/neon-production-schema.sql` - Esquema de produccion (sin datos demo)
- `schemas/neon-complete-schema.sql` - Esquema con datos de prueba

### Scripts
**Ubicacion:** `scripts/`

- `full-audit.sh` - Auditoria completa del sistema
- `test-modules.sh` - Tests de modulos

### Modulos del Servidor
**Ubicacion:** `server/modules/`

| Modulo | Descripcion |
|--------|-------------|
| `reservations.js` | Gestion de reservaciones |
| `analytics.js` | Analytics y reportes |
| `ical-sync.js` | Sincronizacion iCal |
| `staff.js` | Gestion de personal |
| `tasks.js` | Tareas y mantenimiento |
| `cashbox.js` | Caja y finanzas |
| `beds-advanced.js` | Gestion avanzada de camas |
| `front-desk.js` | Operaciones de recepcion |

---

## MANTENIMIENTO DE DOCUMENTACION

### Cuando actualizar documentacion:

- **Cambios en features:** Actualizar PRD y roadmaps
- **Cambios en deployment:** Actualizar guias de deployment
- **Updates de estado:** Crear nuevo reporte en `04-reports/`
- **Nuevas APIs:** Actualizar documentacion en `05-api/`

### Convencion de nombres:

- Usar MAYUSCULAS para nombres principales
- Usar guiones `-` para separar palabras
- Incluir fecha en reportes periodicos (si aplica)
- Usar sufijos descriptivos: `-GUIDE`, `-REPORT`, `-COMPLETE`

---

**Ultima actualizacion:** 2025-11-28
**Mantenido por:** Equipo Almanik PMS
**Version:** 1.12.4
