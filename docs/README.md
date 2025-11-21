# 📚 DOCUMENTACIÓN ALMANIK PMS

Bienvenido al centro de documentación del sistema Almanik PMS. Toda la documentación ha sido organizada profesionalmente para facilitar su consulta.

---

## 📁 ESTRUCTURA DE DOCUMENTACIÓN

### 01. Documentación de Producto
**Ubicación:** `docs/01-product/`

Define qué es el sistema, sus objetivos y validaciones:

- **PRD-v3-SIMPLIFICADO.md** - Product Requirements Document (versión simplificada)
- **MVP-VALIDATION-SUMMARY.md** - Resumen de validación del MVP
- **RESUMEN-EJECUTIVO-SISTEMA.md** - Resumen ejecutivo para stakeholders

### 02. Planificación y Roadmaps
**Ubicación:** `docs/02-planning/`

Planificación del proyecto y hojas de ruta:

- **ROADMAP-SENIOR.md** - Roadmap técnico nivel senior
- **ROADMAP-FUTURO-FEATURES-COMPLEJAS.md** - Features avanzadas futuras
- **SPRINTS-ALMANIK-PMS-SIMPLIFICADO.md** - Planificación de sprints

### 03. Deployment y Configuración
**Ubicación:** `docs/03-deployment/`

Guías de despliegue y configuración en producción:

- **DEPLOYMENT-GUIDE.md** - Guía general de despliegue
- **PRODUCTION-DEPLOY-COMPLETE.md** - Despliegue en producción completo
- **DEPLOY-SUCCESS.md** - Reporte de despliegue exitoso
- **MIGRATION-COMPLETE.md** - Migración a Supabase completada
- **SUPABASE-SETUP.md** - Configuración de Supabase

### 04. Reportes de Estado
**Ubicación:** `docs/04-reports/`

Reportes periódicos del estado del proyecto:

- **STATUS-REPORT-CURRENT.md** - 🔴 Reporte más reciente (consultar primero)
- **STATUS-REPORT.md** - Reporte histórico anterior
- **TECHNICAL-AUDIT-REPORT.md** - Auditoría técnica del sistema

### 05. Notas de Desarrollo
**Ubicación:** `docs/05-development/`

Contexto y notas para el equipo de desarrollo:

- **context.md** - Contexto completo del proyecto (IMPORTANTE)
- **REVISAO-CON-VIVI.txt** - Notas de revisión con stakeholder
- **habitaciones.txt** - Configuración de habitaciones y camas

### Archivo de Documentos Obsoletos
**Ubicación:** `docs/archive/obsolete-docs/`

Documentación antigua que ya no es relevante pero se mantiene para referencia histórica.

---

## 🚀 INICIO RÁPIDO

### Para nuevos desarrolladores:
1. Lee primero: `docs/05-development/context.md`
2. Revisa el estado actual: `docs/04-reports/STATUS-REPORT-CURRENT.md`
3. Consulta el PRD: `docs/01-product/PRD-v3-SIMPLIFICADO.md`

### Para deployment:
1. Guía principal: `docs/03-deployment/DEPLOYMENT-GUIDE.md`
2. Setup de BD: `docs/03-deployment/SUPABASE-SETUP.md`
3. Verificar producción: `docs/03-deployment/PRODUCTION-DEPLOY-COMPLETE.md`

### Para stakeholders:
1. Resumen ejecutivo: `docs/01-product/RESUMEN-EJECUTIVO-SISTEMA.md`
2. Estado actual: `docs/04-reports/STATUS-REPORT-CURRENT.md`
3. Roadmap: `docs/02-planning/ROADMAP-SENIOR.md`

---

## 📊 OTROS RECURSOS DEL PROYECTO

### Base de Datos
**Ubicación:** `database/`

- `schemas/` - Esquemas SQL
- `seeds/` - Datos de prueba
- `migrations/` - Scripts de migración
- `local/` - Base de datos SQLite local

### Scripts de Desarrollo
**Ubicación:** `scripts/`

- `setup.sh` - Script de configuración inicial
- `test-simple.js` - Tests básicos
- `test-supabase.js` - Tests de Supabase

### Prototipos HTML
**Ubicación:** `prototypes/`

Prototipos HTML antiguos para referencia histórica.

---

## 🔄 MANTENIMIENTO DE DOCUMENTACIÓN

### Cuando actualizar documentación:

- **Cambios en features:** Actualizar PRD y roadmaps
- **Cambios en deployment:** Actualizar guías de deployment
- **Updates de estado:** Crear nuevo reporte en `04-reports/`
- **Notas técnicas:** Agregar a `context.md`

### Convención de nombres:

- Usar MAYÚSCULAS para nombres principales
- Usar guiones `-` para separar palabras
- Incluir fecha en reportes periódicos (si aplica)
- Usar sufijos descriptivos: `-GUIDE`, `-REPORT`, `-COMPLETE`

---

**Última actualización:** 2025-11-19
**Mantenido por:** Equipo Almanik PMS
