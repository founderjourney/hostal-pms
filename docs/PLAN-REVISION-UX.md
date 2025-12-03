# Plan de Revisión UX - Almanik PMS

## Objetivo
Revisar sistemáticamente cada módulo/pantalla del sistema para identificar y corregir:
- Bugs de funcionalidad (como el loop de check-in en Camas)
- Problemas de UX (alerts molestos, flujos confusos)
- Funciones duplicadas o conflictivas
- APIs que no funcionan correctamente
- Problemas de conexión con la base de datos

---

## Estado General

| # | Módulo | Estado | Prioridad | Notas |
|---|--------|--------|-----------|-------|
| 1 | Camas | ✅ REVISADO | Alta | Corregido loop de check-in |
| 2 | Dashboard | ✅ REVISADO | Alta | Corregido datos falsos en actividad |
| 3 | Huéspedes | ✅ REVISADO | Alta | Corregido bug showGuestModal |
| 4 | Ventas (POS) | ✅ REVISADO | Alta | Sin problemas encontrados |
| 5 | Caja | ✅ REVISADO | Alta | Sin problemas encontrados |
| 6 | Personal | ⏳ Pendiente | Media | Gestión de staff |
| 7 | Reportes | ⏳ Pendiente | Media | Analíticas |
| 8 | Tours/Paseos | ⏳ Pendiente | Baja | Reserva de tours |
| 9 | Usuarios | ⏳ Pendiente | Media | Admin de usuarios |
| 10 | Reviews | ⏳ Pendiente | Baja | Sistema de reseñas |
| 11 | WhatsApp | ⏳ Pendiente | Baja | Chat integrado |
| 12 | Ejecutivo | ⏳ Pendiente | Baja | Dashboard gerencial |
| 13 | Tareas | ⏳ Pendiente | Media | Gestión de tareas |
| 14 | Reservaciones | ✅ REVISADO | Alta | viewReservation usa alert (mejora pendiente) |
| 15 | iCal Sync | ⏳ Pendiente | Baja | Sincronización calendarios |

---

## Fases de Revisión

### FASE 1: Módulos Críticos (Operación Diaria)
*Estos módulos se usan todos los días y afectan la operación del hostal*

#### 1.1 Dashboard (Tablero Principal)
**Archivo:** `public/index.html` (sección dashboard-view)
**Checklist:**
- [ ] KPIs cargan correctamente (ocupación, revenue, check-ins)
- [ ] Panel operativo muestra check-outs/check-ins del día
- [ ] Alertas activas funcionan
- [ ] Botones de acción rápida funcionan
- [ ] Front Desk panel funciona (check-in rápido, cobrar, check-out)
- [ ] Gráficos cargan datos correctos
- [ ] Auto-refresh cada 30 segundos funciona

#### 1.2 Huéspedes
**Archivo:** `public/index.html` (sección guests-view)
**Checklist:**
- [ ] Lista de huéspedes carga correctamente
- [ ] Crear nuevo huésped funciona
- [ ] Editar huésped funciona
- [ ] Eliminar huésped funciona
- [ ] Búsqueda de huéspedes funciona
- [ ] Botón check-in desde huéspedes funciona
- [ ] Botón check-out desde huéspedes funciona
- [ ] Historial de huésped visible
- [ ] No hay funciones duplicadas

#### 1.3 Ventas (POS)
**Archivos:** `public/index.html` (sección pos-view), `public/pos.html`
**Checklist:**
- [ ] Lista de productos carga
- [ ] Agregar producto al carrito funciona
- [ ] Modificar cantidades funciona
- [ ] Eliminar del carrito funciona
- [ ] Procesar venta funciona
- [ ] Diferentes métodos de pago funcionan
- [ ] Recibo/ticket se genera
- [ ] Ventas se registran en caja
- [ ] No hay funciones duplicadas

#### 1.4 Caja
**Archivos:** `public/index.html` (sección cash-view), `public/cashbox.html`
**Checklist:**
- [ ] Balance actual correcto
- [ ] Movimientos del día cargan
- [ ] Registrar ingreso funciona
- [ ] Registrar egreso funciona
- [ ] Filtro por fechas funciona
- [ ] Resumen por método de pago correcto
- [ ] Cierre de caja funciona
- [ ] Historial de cierres visible

#### 1.5 Reservaciones
**Archivo:** `public/reservations.html`
**Checklist:**
- [ ] Calendario carga correctamente
- [ ] Crear reservación funciona
- [ ] Editar reservación funciona
- [ ] Cancelar reservación funciona
- [ ] Verificar disponibilidad funciona
- [ ] Conflictos de fechas se detectan
- [ ] Convertir reserva a check-in funciona

---

### FASE 2: Módulos de Gestión
*Módulos administrativos importantes pero no críticos para la operación diaria*

#### 2.1 Personal (Staff)
**Archivos:** `public/index.html` (sección staff-view), `public/staff.html`
**Checklist:**
- [ ] Lista de personal carga
- [ ] Agregar empleado funciona
- [ ] Editar empleado funciona
- [ ] Eliminar empleado funciona
- [ ] Asignar roles funciona
- [ ] Control de asistencia funciona
- [ ] Historial de turnos visible

#### 2.2 Usuarios (Sistema)
**Archivo:** `public/index.html` (sección users-view)
**Checklist:**
- [ ] Lista de usuarios carga (solo admin)
- [ ] Crear usuario funciona
- [ ] Editar usuario funciona
- [ ] Cambiar contraseña funciona
- [ ] Asignar permisos funciona
- [ ] Desactivar usuario funciona

#### 2.3 Reportes
**Archivos:** `public/index.html` (sección reports-view), `public/reports-advanced.html`, `public/analytics.html`
**Checklist:**
- [ ] Reporte de ocupación genera
- [ ] Reporte de ingresos genera
- [ ] Reporte de huéspedes genera
- [ ] Filtros por fecha funcionan
- [ ] Exportar a Excel/PDF funciona
- [ ] Gráficos cargan correctamente

#### 2.4 Tareas
**Archivo:** `public/tasks.html`
**Checklist:**
- [ ] Lista de tareas carga
- [ ] Crear tarea funciona
- [ ] Marcar completada funciona
- [ ] Asignar a empleado funciona
- [ ] Filtrar por estado funciona
- [ ] Prioridades funcionan

---

### FASE 3: Módulos Secundarios
*Funcionalidades adicionales que mejoran la experiencia*

#### 3.1 Tours/Paseos
**Archivo:** `public/index.html` (sección tours-view)
**Checklist:**
- [ ] Lista de tours carga
- [ ] Crear tour funciona
- [ ] Editar tour funciona
- [ ] Registrar reserva de tour funciona
- [ ] Comisiones se calculan

#### 3.2 Reviews
**Archivos:** `public/reviews-dashboard.html`, `public/review.html`, `public/reviews-widget.html`
**Checklist:**
- [ ] Dashboard de reviews carga
- [ ] Formulario de review funciona
- [ ] Widget embebible funciona
- [ ] Estadísticas correctas
- [ ] Responder a reviews funciona

#### 3.3 WhatsApp
**Archivo:** `public/whatsapp-chat.html`
**Checklist:**
- [ ] Chat carga correctamente
- [ ] Enviar mensaje funciona
- [ ] Historial de mensajes visible
- [ ] Notificaciones funcionan

#### 3.4 Dashboard Ejecutivo
**Archivo:** `public/executive-dashboard.html`
**Checklist:**
- [ ] Métricas ejecutivas cargan
- [ ] Comparativas funcionan
- [ ] Gráficos correctos
- [ ] Filtros de período funcionan

#### 3.5 iCal Sync
**Archivo:** `public/ical-sync.html`
**Checklist:**
- [ ] Importar calendario funciona
- [ ] Exportar calendario funciona
- [ ] Sincronización automática funciona
- [ ] Conflictos se detectan

---

## Metodología de Revisión

Para cada módulo seguir estos pasos:

### Paso 1: Análisis de Código
1. Leer el código del módulo completo
2. Identificar todas las funciones
3. Buscar funciones duplicadas o conflictivas
4. Verificar que las APIs existen y funcionan
5. Revisar manejo de errores

### Paso 2: Prueba Funcional
1. Probar cada acción del checklist
2. Verificar en la consola del navegador (errores JS)
3. Verificar en logs del servidor (errores API)
4. Probar casos edge (datos vacíos, errores de red)

### Paso 3: Revisión de UX
1. Identificar alerts() innecesarios
2. Verificar mensajes de confirmación claros
3. Verificar feedback visual (loading, success, error)
4. Revisar flujos de usuario (no loops, no confusiones)

### Paso 4: Corrección
1. Documentar bugs encontrados
2. Aplicar correcciones
3. Probar correcciones
4. Commit con descripción clara

### Paso 5: Documentación
1. Marcar módulo como revisado
2. Documentar cambios realizados
3. Actualizar este documento

---

## Registro de Revisiones

### Camas (beds) - COMPLETADO ✅
**Fecha:** 2025-12-03
**Problemas encontrados:**
1. Dos funciones `selectGuestForCheckin` con el mismo nombre causaban loop infinito
2. Alerts de debug molestos ("Check-in iniciando...", "Check-out iniciando...")
3. Alert molesto en `checkPreselectedGuest()`

**Correcciones aplicadas:**
1. Renombrada función conflictiva a `startCheckinFromGuestsView`
2. Eliminados alerts de debug
3. Reemplazado alert por barra de notificación sutil
4. Agregada función `cancelPreselectedGuest()`

**Commit:** `175af9c6` - fix: resolve check-in UX loop caused by duplicate function names

---

### Dashboard - COMPLETADO ✅
**Fecha:** 2025-12-03
**Problemas encontrados:**
1. Sección "Actividad Reciente" mostraba datos falsos/estáticos que confundían al usuario
2. No existía API para obtener actividad real del sistema

**Correcciones aplicadas:**
1. Reemplazada función `loadRecentActivity()` con versión async que consulta API real
2. Agregado mensaje amigable "La actividad se mostrará aquí" cuando no hay datos
3. Creada API `/api/activity/recent` que consulta tabla `activity_log`
4. Agregadas funciones helper: `getActivityIcon()`, `formatTimeAgo()`, `showNoActivityMessage()`

**Commit:** `3d259397` - fix(dashboard): replace fake activity data with real API integration

---

### Huéspedes - COMPLETADO ✅
**Fecha:** 2025-12-03
**Problemas encontrados:**
1. Bug: `showGuestModal()` no existía, causaba error JavaScript
2. Alert innecesariamente largo en `registerNewGuestAndReturn()`
3. Alert molesto en búsqueda vacía

**Correcciones aplicadas:**
1. Cambiado `showGuestModal()` a `showAddGuestModal()`
2. Eliminado alert verbose, el modal ya indica la acción
3. Búsqueda vacía ahora carga todos los huéspedes en vez de mostrar alert

**Commit:** `b6c4735e` - fix(guests): resolve function call bug and improve UX

---

### Ventas (POS) - COMPLETADO ✅
**Fecha:** 2025-12-03
**Problemas encontrados:**
- Ninguno

**Estado:**
- Código bien estructurado
- Funciones únicas sin duplicados
- Alerts necesarios para la operación (confirmación de venta, carrito vacío, stock)
- Flujo de usuario claro

---

### Caja - COMPLETADO ✅
**Fecha:** 2025-12-03
**Problemas encontrados:**
- Ninguno

**Estado:**
- Código bien estructurado con funciones claras
- `loadCashData()` se ejecuta al navegar a la vista
- Datos se actualizan correctamente
- Alerts necesarios para confirmaciones

---

### Reservaciones - COMPLETADO ✅
**Fecha:** 2025-12-03
**Problemas encontrados:**
- `viewReservation()` usa `alert()` para mostrar detalles (debería ser un modal)

**Estado:**
- Código bien estructurado en archivo separado (reservations.js)
- Funciones únicas sin duplicados
- Usa `confirm()` apropiadamente para acciones destructivas
- Sistema de alertas con `showAlert()` para feedback
- **Mejora pendiente:** Crear modal para ver detalles de reservación

---

## FASE 1 COMPLETADA ✅

**Resumen:**
- 5 módulos revisados (Dashboard, Huéspedes, POS, Caja, Reservaciones)
- 3 bugs corregidos
- 2 mejoras de UX aplicadas
- 0 problemas críticos pendientes

## Próximos Pasos - FASE 2

1. ~~Comenzar con **Dashboard** (más usado)~~ ✅
2. ~~Continuar con **Huéspedes** (relacionado con Camas)~~ ✅
3. ~~Seguir con **Ventas (POS)**~~ ✅ y ~~**Caja**~~ ✅
4. ~~Finalizar con **Reservaciones**~~ ✅
5. **Siguiente:** Personal, Usuarios, Reportes, Tareas (Fase 2)

---

## Notas Importantes

- Siempre hacer backup antes de cambios grandes
- Probar en local antes de push a producción
- Mantener commits pequeños y descriptivos
- Actualizar este documento después de cada revisión
- Priorizar bugs que afectan la operación diaria

---

*Documento creado: 2025-12-03*
*Última actualización: 2025-12-03*
