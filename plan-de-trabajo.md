# Plan de Trabajo - PMS ALMANIK
## Análisis Senior Architect

**Fecha**: 2025-12-06
**Proyecto**: Almanik PMS Viajero
**Basado en**: solicitudes-cliente.md

---

## RESUMEN EJECUTIVO

| Métrica | Valor |
|---------|-------|
| **Total de tareas** | 14 principales + 23 subtareas |
| **Tiempo total estimado** | **38-52 horas** |
| **Prioridad crítica** | 4 tareas |
| **Prioridad alta** | 5 tareas |
| **Prioridad media** | 5 tareas |

---

## TAREAS DETALLADAS

### PRIORIDAD CRITICA (Bugs que afectan datos)

---

#### TAREA 1: Error guarda registro aunque muestre error
**Problema**: El sistema guarda registros incluso cuando muestra ventana de error.

| Subtarea | Descripcion | Tiempo |
|----------|-------------|--------|
| 1.1 | Auditar todos los endpoints POST/PUT para identificar donde falla el rollback | 1.5h |
| 1.2 | Implementar transacciones atomicas en PostgreSQL/SQLite | 2h |
| 1.3 | Refactorizar manejo de errores en frontend para abortar si hay error | 1.5h |
| 1.4 | Testing de regresion en check-in, check-out, camas, huespedes | 1h |

**Archivos afectados**: `server/server-simple.js`, `server/modules/*.js`, `public/index.html`
**Tiempo total**: **6 horas**
**Riesgo**: Alto - puede causar datos corruptos

---

#### TAREA 2: Validacion de caracteres especiales en todos los formularios
**Problema**: Campos aceptan cualquier caracter, causando errores.

| Subtarea | Descripcion | Tiempo |
|----------|-------------|--------|
| 2.1 | Crear libreria de validacion frontend `validation.js` | 2h |
| 2.2 | Definir reglas por tipo de campo (nombre, documento, telefono, email, numero) | 1h |
| 2.3 | Aplicar validacion a formularios: Check-in/Check-out | 1.5h |
| 2.4 | Aplicar validacion a formularios: Huespedes, Camas, Personal | 2h |
| 2.5 | Aplicar validacion a formularios: Caja, Reservas, Productos | 1.5h |
| 2.6 | Sincronizar reglas con backend express-validator | 1h |
| 2.7 | Tests unitarios de validacion | 1h |

**Archivos afectados**: Nuevo `public/js/validation.js`, `public/index.html`, `server/config/security.js`
**Tiempo total**: **10 horas**
**Riesgo**: Medio

---

#### TAREA 3: Error en calculo de fechas (checkout incorrecto)
**Problema**: Al aplicar noches, el checkout no calcula correctamente.

| Subtarea | Descripcion | Tiempo |
|----------|-------------|--------|
| 3.1 | Debuggear logica de calculo de fechas en frontend | 1h |
| 3.2 | Revisar timezone handling (UTC vs local) | 1h |
| 3.3 | Corregir funcion de calculo de checkout | 1h |
| 3.4 | Agregar tests para edge cases (fin de mes, ano bisiesto) | 1h |

**Archivos afectados**: `public/index.html` (funciones de fecha), `server/modules/front-desk.js`
**Tiempo total**: **4 horas**
**Riesgo**: Alto

---

#### TAREA 4: Mensajes de error en lenguaje humano + mantener modal abierto
**Problema**: Errores tecnicos incomprensibles y modal se cierra al fallar.

| Subtarea | Descripcion | Tiempo |
|----------|-------------|--------|
| 4.1 | Crear diccionario de mensajes de error espanol/portugues | 1h |
| 4.2 | Mapear codigos de error backend a mensajes amigables | 1.5h |
| 4.3 | Modificar funcion `showAlert()` para indicar campo especifico | 1h |
| 4.4 | Refactorizar `closeModal()` para NO cerrar si hay error | 1h |
| 4.5 | Resaltar campo con error (borde rojo + scroll) | 1h |
| 4.6 | Aplicar a todos los modales (12+ modales) | 2h |

**Archivos afectados**: `public/index.html`, nuevo `public/js/error-messages.js`
**Tiempo total**: **7.5 horas**
**Riesgo**: Medio

---

### PRIORIDAD ALTA (UX critico)

---

#### TAREA 5: Tecla borrar cierra ventana + campos obligatorios
**Problema**: Backspace cierra modal y campos no son obligatorios.

| Subtarea | Descripcion | Tiempo |
|----------|-------------|--------|
| 5.1 | Capturar evento keydown y prevenir cierre con Backspace/Escape | 0.5h |
| 5.2 | Agregar atributo `required` a todos los campos obligatorios | 1h |
| 5.3 | Validar formulario completo antes de permitir submit | 1h |
| 5.4 | Mostrar indicador visual de campos obligatorios (*) | 0.5h |

**Archivos afectados**: `public/index.html`
**Tiempo total**: **3 horas**
**Riesgo**: Bajo

---

#### TAREA 6: Enlaces del dashboard con filtros aplicados
**Problema**: Clic en "camas disponibles" no filtra resultados.

| Subtarea | Descripcion | Tiempo |
|----------|-------------|--------|
| 6.1 | Modificar enlaces del dashboard para pasar parametros de filtro | 1h |
| 6.2 | Implementar lectura de filtros en URL al cargar vista de camas | 1h |
| 6.3 | Aplicar filtro automaticamente segun parametro | 0.5h |
| 6.4 | Replicar para: ocupadas, disponibles, en mantenimiento | 0.5h |

**Archivos afectados**: `public/index.html` (dashboard y beds-view)
**Tiempo total**: **3 horas**
**Riesgo**: Bajo

---

#### TAREA 7: Eliminar pop-ups de confirmacion (doble clic)
**Problema**: Usuario no quiere ver "accion ejecutada" despues de cada operacion.

| Subtarea | Descripcion | Tiempo |
|----------|-------------|--------|
| 7.1 | Identificar todos los `showAlert('success')` post-accion | 0.5h |
| 7.2 | Reemplazar por feedback visual sutil (toast breve o ninguno) | 1h |
| 7.3 | Cerrar modal automaticamente tras exito | 0.5h |
| 7.4 | Mantener alertas solo para errores | 0.5h |

**Archivos afectados**: `public/index.html`
**Tiempo total**: **2.5 horas**
**Riesgo**: Bajo

---

#### TAREA 8: Boton cerrar (X) mas visible en modales
**Problema**: El boton X esta oculto/poco visible.

| Subtarea | Descripcion | Tiempo |
|----------|-------------|--------|
| 8.1 | Redisenar boton X con color contrastante (blanco sobre oscuro) | 0.5h |
| 8.2 | Aumentar tamano y area clickeable | 0.25h |
| 8.3 | Agregar hover effect visible | 0.25h |
| 8.4 | Aplicar a todos los modales | 0.5h |

**Archivos afectados**: `public/index.html` (CSS)
**Tiempo total**: **1.5 horas**
**Riesgo**: Bajo

---

#### TAREA 9: Mostrar habitacion en lista de huespedes
**Problema**: Solo muestra numero de cama, no habitacion.

| Subtarea | Descripcion | Tiempo |
|----------|-------------|--------|
| 9.1 | Modificar query SQL para incluir room en respuesta de guests | 0.5h |
| 9.2 | Actualizar renderizado de tabla de huespedes | 0.5h |
| 9.3 | Formatear como "Habitacion X - Cama Y" | 0.25h |

**Archivos afectados**: `server/server-simple.js`, `public/index.html`
**Tiempo total**: **1.25 horas**
**Riesgo**: Bajo

---

### PRIORIDAD MEDIA (Mejoras UX)

---

#### TAREA 10: Revisar colores y contraste (UX Senior)
**Problema**: Textos sobre botones no destacan, baja legibilidad.

| Subtarea | Descripcion | Tiempo |
|----------|-------------|--------|
| 10.1 | Auditoria de accesibilidad WCAG 2.1 (contraste minimo 4.5:1) | 1h |
| 10.2 | Redefinir paleta de colores con mejor contraste | 1h |
| 10.3 | Aplicar nuevos colores a botones | 1h |
| 10.4 | Aplicar a badges, estados, alertas | 1h |
| 10.5 | Testing en diferentes dispositivos/pantallas | 0.5h |

**Archivos afectados**: `public/index.html` (CSS), `public/css/mobile-fixes.css`
**Tiempo total**: **4.5 horas**
**Riesgo**: Bajo

---

#### TAREA 11: Mostrar notas/observaciones en tarjetas de camas disponibles
**Problema**: Camas disponibles no muestran observaciones como "sin almohada".

| Subtarea | Descripcion | Tiempo |
|----------|-------------|--------|
| 11.1 | Modificar template de tarjeta de cama para mostrar notas | 0.5h |
| 11.2 | Estilizar seccion de notas (icono + texto truncado) | 0.5h |
| 11.3 | Agregar tooltip para notas largas | 0.5h |

**Archivos afectados**: `public/index.html` (renderBedCard function)
**Tiempo total**: **1.5 horas**
**Riesgo**: Bajo

---

#### TAREA 12: Clic en indicadores del dashboard redirige a camas
**Problema**: Indicadores de ocupacion no son clickeables.

| Subtarea | Descripcion | Tiempo |
|----------|-------------|--------|
| 12.1 | Hacer clickeables los cards de estadisticas | 0.5h |
| 12.2 | Agregar cursor pointer y hover effect | 0.25h |
| 12.3 | Redirigir a vista de camas con filtro correspondiente | 0.5h |

**Archivos afectados**: `public/index.html`
**Tiempo total**: **1.25 horas**
**Riesgo**: Bajo

---

### PRIORIDAD BAJA (Features nuevos)

---

#### TAREA 13: Autenticacion de dos factores (2FA)
**Problema**: Voluntarios pueden acceder con contrasenas guardadas del admin.

| Subtarea | Descripcion | Tiempo |
|----------|-------------|--------|
| 13.1 | Seleccionar libreria 2FA (speakeasy + qrcode) | 0.5h |
| 13.2 | Crear tabla `user_2fa` (secret, enabled, backup_codes) | 0.5h |
| 13.3 | Endpoint para generar/verificar codigo TOTP | 2h |
| 13.4 | UI para configurar 2FA (QR code + verificacion) | 2h |
| 13.5 | Modificar flujo de login para pedir codigo 2FA | 1.5h |
| 13.6 | Implementar codigos de respaldo | 1h |
| 13.7 | Testing completo del flujo | 1h |

**Archivos afectados**: Nuevo modulo `server/modules/two-factor.js`, `public/index.html`, `server/server-simple.js`
**Tiempo total**: **8.5 horas**
**Riesgo**: Medio (seguridad critica)

---

#### TAREA 14: Aplicar patron consistente a todo el tablero
**Problema**: Inconsistencia en UX entre diferentes vistas.

| Subtarea | Descripcion | Tiempo |
|----------|-------------|--------|
| 14.1 | Documentar patron estandar (validacion, errores, modales) | 1h |
| 14.2 | Auditar cada vista vs patron | 1h |
| 14.3 | Aplicar correcciones a vistas faltantes | 2h |

**Archivos afectados**: Multiples vistas en `public/index.html`
**Tiempo total**: **4 horas**
**Riesgo**: Bajo

---

## RESUMEN DE TIEMPOS

| Prioridad | Tareas | Tiempo Min | Tiempo Max |
|-----------|--------|------------|------------|
| Critica | 4 | 27.5h | 32h |
| Alta | 5 | 11.25h | 14h |
| Media | 3 | 7.25h | 9h |
| Baja | 2 | 12.5h | 15h |
| **TOTAL** | **14** | **38.5h** | **52h** |

---

## ORDEN DE EJECUCION RECOMENDADO

### FASE 1 - Estabilidad (Critico)
- [x] Tarea 1: Error guarda registro aunque muestre error (DEV1 - Transacciones atomicas)
- [ ] Tarea 3: Error en calculo de fechas
- [x] Tarea 4: Mensajes de error en lenguaje humano (DEV2 - error-messages.js)

### FASE 2 - Validacion (Critico)
- [x] Tarea 2: Validacion de caracteres especiales (DEV2 - validation.js)
- [ ] Tarea 5: Campos obligatorios + tecla borrar

### FASE 3 - UX Inmediato (Alta)
- [ ] Tarea 7: Eliminar pop-ups de confirmacion
- [x] Tarea 8: Boton X mas visible (DEV4 - COMPLETADO)
- [x] Tarea 9: Mostrar habitacion en huespedes (DEV1 - Query SQL actualizada)
- [ ] Tarea 6: Enlaces con filtros

### FASE 4 - Polish (Media)
- [x] Tarea 10: Colores y contraste (DEV4 - COMPLETADO)
- [ ] Tarea 11: Notas en camas disponibles
- [ ] Tarea 12: Indicadores clickeables

### FASE 5 - Seguridad (Feature)
- [ ] Tarea 13: 2FA
- [x] Tarea 14: Patron consistente (DEV4 - COMPLETADO)

### BUGS CORREGIDOS (2025-12-06)
- [x] Loop infinito en selector de camas: Corregido con bandera de proteccion
- [x] Integracion de validacion frontend: Scripts agregados a index.html

---

## NOTAS TECNICAS

### Stack del Proyecto
- **Frontend**: HTML5 + Vanilla JavaScript (sin framework)
- **Backend**: Node.js + Express.js
- **Base de datos**: SQLite (dev) / PostgreSQL Neon (prod)
- **Validacion**: express-validator (backend)
- **Estilos**: CSS inline + mobile-fixes.css

### Archivos Principales
- `public/index.html` - Dashboard principal (7,357 lineas)
- `server/server-simple.js` - Servidor Express (4,089 lineas)
- `server/modules/` - 17 modulos especializados
- `public/js/` - Scripts modulares

---

*Documento generado automaticamente - Almanik PMS*
