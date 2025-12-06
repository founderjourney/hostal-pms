# Plan de Trabajo Dividido por Desarrolladores
## PMS ALMANIK - Trabajo en Paralelo

**Fecha**: 2025-12-06
**Total de DEVs**: 4
**Estrategia**: Division por areas afines para evitar conflictos de merge

---

## RESUMEN DE ASIGNACION

| DEV | Area | Tareas | Horas Est. |
|-----|------|--------|------------|
| DEV1 | Backend / Transacciones / Seguridad | 3 | 15h |
| DEV2 | Validacion Frontend + Mensajes Error | 3 | 20.5h |
| DEV3 | Logica Frontend / Dashboard / Fechas | 5 | 10h |
| DEV4 | CSS / Visual / UX Polish | 4 | 10h |

**Tiempo total en paralelo**: ~20.5 horas (determinado por DEV2, el mas cargado)

---

## DEV1 - BACKEND / TRANSACCIONES / SEGURIDAD

**Archivos asignados**:
- server/server-simple.js
- server/modules/*.js
- server/config/security.js
- NUEVO: server/modules/two-factor.js

**Tiempo estimado**: 15 horas

### Tarea 1: Error guarda registro aunque muestre error
**Prioridad**: CRITICA
**Tiempo**: 6h

Subtareas:
1.1 Auditar todos los endpoints POST/PUT para identificar donde falla el rollback (1.5h)
1.2 Implementar transacciones atomicas en PostgreSQL/SQLite (2h)
1.3 Refactorizar manejo de errores en backend para retornar error correcto (1.5h)
1.4 Testing de regresion en check-in, check-out, camas, huespedes (1h)

Archivos a modificar:
- server/server-simple.js (endpoints principales)
- server/modules/front-desk.js (check-in/check-out)
- server/modules/beds-advanced.js (camas)

---

### Tarea 9 (Parte Backend): Query SQL para mostrar habitacion
**Prioridad**: ALTA
**Tiempo**: 0.5h

Subtareas:
9.1 Modificar query SQL en endpoint /api/guests para incluir room_id y room_name (0.5h)

Archivos a modificar:
- server/server-simple.js (endpoint GET /api/guests)

---

### Tarea 13: Autenticacion de dos factores (2FA)
**Prioridad**: BAJA (Feature nuevo)
**Tiempo**: 8.5h

Subtareas:
13.1 Instalar librerias: npm install speakeasy qrcode (0.5h)
13.2 Crear tabla user_2fa en schema (secret, enabled, backup_codes) (0.5h)
13.3 Crear modulo server/modules/two-factor.js con endpoints (2h)
13.4 Endpoint POST /api/2fa/setup - generar secreto y QR (1h)
13.5 Endpoint POST /api/2fa/verify - verificar codigo TOTP (1h)
13.6 Modificar POST /api/login para verificar 2FA si esta habilitado (1.5h)
13.7 Implementar codigos de respaldo (1h)
13.8 Testing completo del flujo (1h)

Archivos a crear/modificar:
- NUEVO: server/modules/two-factor.js
- server/server-simple.js (importar modulo, modificar login)
- database/schemas/neon-complete-schema.sql (tabla user_2fa)

---

## DEV2 - VALIDACION FRONTEND + MENSAJES ERROR

**Archivos asignados**:
- NUEVO: public/js/validation.js
- NUEVO: public/js/error-messages.js
- public/index.html (solo importar scripts y agregar atributos required)

**Tiempo estimado**: 20.5 horas

### Tarea 2: Validacion de caracteres especiales en todos los formularios
**Prioridad**: CRITICA
**Tiempo**: 10h

Subtareas:
2.1 Crear libreria public/js/validation.js con funciones de validacion (2h)
    - validateName(value) - solo letras, espacios, acentos
    - validateDocument(value) - alfanumerico
    - validatePhone(value) - solo numeros y +
    - validateEmail(value) - formato email
    - validateNumber(value) - solo numeros
    - validatePrice(value) - numero decimal positivo
    - validateDate(value) - formato fecha valido

2.2 Definir reglas por tipo de campo en objeto de configuracion (1h)
2.3 Aplicar validacion a formularios Check-in/Check-out (1.5h)
2.4 Aplicar validacion a formularios Huespedes, Camas, Personal (2h)
2.5 Aplicar validacion a formularios Caja, Reservas, Productos (1.5h)
2.6 Documentar reglas para backend (DEV1 sincronizara con express-validator) (1h)
2.7 Tests unitarios de validacion (1h)

Archivos a crear/modificar:
- NUEVO: public/js/validation.js
- public/index.html (importar script, agregar onblur a inputs)

---

### Tarea 4: Mensajes de error en lenguaje humano + mantener modal abierto
**Prioridad**: CRITICA
**Tiempo**: 7.5h

Subtareas:
4.1 Crear public/js/error-messages.js con diccionario espanol/portugues (1h)
    Ejemplo:
    const ERROR_MESSAGES = {
      'INVALID_NAME': 'El nombre solo puede contener letras',
      'INVALID_DOCUMENT': 'Documento invalido',
      'REQUIRED_FIELD': 'Este campo es obligatorio',
      'BED_UNAVAILABLE': 'Esta cama no esta disponible',
      ...
    };

4.2 Crear funcion translateError(errorCode) para mapear errores backend (1.5h)
4.3 Modificar funcion showAlert() para indicar campo especifico (1h)
4.4 Crear variable global window.modalHasError = false para control (0.5h)
4.5 Modificar closeModal() para NO cerrar si modalHasError es true (0.5h)
4.6 Crear funcion highlightFieldError(fieldId) - borde rojo + scroll (1h)
4.7 Aplicar a todos los modales existentes (2h)

Archivos a crear/modificar:
- NUEVO: public/js/error-messages.js
- public/index.html (importar script, modificar showAlert y closeModal)

---

### Tarea 5: Tecla borrar cierra ventana + campos obligatorios
**Prioridad**: ALTA
**Tiempo**: 3h

Subtareas:
5.1 Agregar event listener keydown para prevenir Backspace fuera de inputs (0.5h)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) {
        e.preventDefault();
      }
    });

5.2 Agregar atributo required a todos los campos obligatorios (1h)
5.3 Crear funcion validateFormBeforeSubmit(formId) (1h)
5.4 Agregar asterisco (*) CSS a labels de campos required (0.5h)

Archivos a modificar:
- public/index.html (agregar required, CSS para asterisco, event listener)

---

## DEV3 - LOGICA FRONTEND / DASHBOARD / FECHAS

**Archivos asignados**:
- public/index.html (funciones JavaScript - NO CSS)
  - Funciones de fecha
  - Funciones de dashboard
  - Funciones de renderizado de listas
  - Funciones showView()

**Tiempo estimado**: 10 horas

### Tarea 3: Error en calculo de fechas (checkout incorrecto)
**Prioridad**: CRITICA
**Tiempo**: 4h

Subtareas:
3.1 Localizar funcion de calculo de checkout en index.html (0.5h)
3.2 Debuggear logica - verificar si usa UTC o local timezone (1h)
3.3 Corregir funcion para calcular correctamente:
    checkout = checkin + (noches * 24 * 60 * 60 * 1000) (1h)
3.4 Agregar console.log temporal para verificar calculos (0.5h)
3.5 Probar edge cases: fin de mes, cambio de ano, ano bisiesto (1h)

Archivos a modificar:
- public/index.html (funciones de calculo de fecha)

---

### Tarea 6: Enlaces del dashboard con filtros aplicados
**Prioridad**: ALTA
**Tiempo**: 3h

Subtareas:
6.1 Modificar cards del dashboard para ser clickeables (0.5h)
    <div class="stat-card" onclick="showBedsFiltered('available')">

6.2 Crear funcion showBedsFiltered(filterType) (1h)
    function showBedsFiltered(filter) {
      window.currentBedFilter = filter;
      showView('beds-view');
    }

6.3 Modificar loadBeds() para aplicar filtro si existe (1h)
6.4 Implementar filtros: available, occupied, dirty, maintenance (0.5h)

Archivos a modificar:
- public/index.html (dashboard cards, funcion loadBeds)

---

### Tarea 7: Eliminar pop-ups de confirmacion (doble clic)
**Prioridad**: ALTA
**Tiempo**: 2.5h

Subtareas:
7.1 Buscar todos los showAlert('success'...) y showAlert('Exito'...) (0.5h)
7.2 Eliminar o comentar alertas de exito post-accion (1h)
7.3 Asegurar que modal se cierre automaticamente tras exito (0.5h)
7.4 Mantener solo alertas de error (0.5h)

Archivos a modificar:
- public/index.html (llamadas a showAlert)

---

### Tarea 9 (Parte Frontend): Renderizado de habitacion en huespedes
**Prioridad**: ALTA
**Tiempo**: 0.75h

Subtareas:
9.2 Modificar funcion renderGuestsTable() para mostrar habitacion (0.5h)
9.3 Formatear como "Hab. X - Cama Y" (0.25h)

Archivos a modificar:
- public/index.html (funcion renderGuestsTable o similar)

NOTA: Depende de que DEV1 complete la subtarea 9.1 (query SQL)

---

### Tarea 11: Mostrar notas en tarjetas de camas disponibles
**Prioridad**: MEDIA
**Tiempo**: 1.5h

Subtareas:
11.1 Localizar funcion renderBedCard() en index.html (0.25h)
11.2 Agregar seccion de notas cuando cama esta disponible (0.5h)
    if (bed.status === 'available' && bed.notes) {
      html += `<div class="bed-notes"><i class="fas fa-sticky-note"></i> ${bed.notes}</div>`;
    }
11.3 Truncar notas largas con "..." (0.25h)
11.4 Agregar title para tooltip en hover (0.25h)

Archivos a modificar:
- public/index.html (funcion renderBedCard)

---

### Tarea 12: Clic en indicadores del dashboard redirige a camas
**Prioridad**: MEDIA
**Tiempo**: 1.25h

NOTA: Esta tarea se completa junto con Tarea 6 (misma funcionalidad)

Subtareas:
12.1 Verificar que cards de estadisticas tengan onclick (0.25h)
12.2 Agregar cursor: pointer en CSS (coordinar con DEV4) (0.25h)
12.3 Agregar hover effect (coordinar con DEV4) (0.25h)
12.4 Testear que filtros funcionen correctamente (0.5h)

Archivos a modificar:
- public/index.html (onclick en stat-cards)

---

## DEV4 - CSS / VISUAL / UX POLISH

**Archivos asignados**:
- public/index.html (SOLO seccion <style>)
- public/css/mobile-fixes.css
- NO modificar JavaScript

**Tiempo estimado**: 10 horas

### Tarea 8: Boton cerrar (X) mas visible en modales
**Prioridad**: ALTA
**Tiempo**: 1.5h

Subtareas:
8.1 Redisenar clase .modal-close con mejor contraste (0.5h)
    .modal-close {
      background: #e74c3c;
      color: white;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      font-size: 20px;
      font-weight: bold;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

8.2 Agregar hover effect visible (0.25h)
    .modal-close:hover {
      background: #c0392b;
      transform: scale(1.1);
    }

8.3 Aumentar z-index para que siempre este visible (0.25h)
8.4 Verificar en todos los modales (0.5h)

Archivos a modificar:
- public/index.html (seccion <style>)

---

### Tarea 10: Revisar colores y contraste (UX Senior)
**Prioridad**: MEDIA
**Tiempo**: 4.5h

Subtareas:
10.1 Auditoria de accesibilidad WCAG 2.1 usando herramienta online (1h)
    - Verificar contraste minimo 4.5:1 para texto normal
    - Verificar contraste minimo 3:1 para texto grande

10.2 Redefinir paleta de colores con mejor contraste (1h)
    Propuesta:
    --primary: #2563eb (azul)
    --primary-dark: #1d4ed8
    --success: #16a34a (verde)
    --danger: #dc2626 (rojo)
    --warning: #d97706 (naranja)
    --text-on-primary: #ffffff
    --text-on-dark: #ffffff

10.3 Aplicar nuevos colores a botones (1h)
    .btn-primary { background: var(--primary); color: var(--text-on-primary); }

10.4 Aplicar a badges de estado, alertas, iconos (1h)
10.5 Testing en diferentes dispositivos/pantallas (0.5h)

Archivos a modificar:
- public/index.html (seccion <style>, variables CSS)
- public/css/mobile-fixes.css

---

### Tarea 14: Aplicar patron consistente a todo el tablero
**Prioridad**: BAJA
**Tiempo**: 4h

Subtareas:
14.1 Documentar patron visual estandar (1h)
    - Espaciado entre elementos
    - Tamano de fuentes
    - Border-radius consistente
    - Sombras estandar

14.2 Auditar cada vista vs patron (1h)
    - dashboard-view
    - beds-view
    - guests-view
    - staff-view
    - cashbox-view
    - reservations-view

14.3 Aplicar correcciones CSS a vistas inconsistentes (2h)

Archivos a modificar:
- public/index.html (seccion <style>)
- public/css/mobile-fixes.css

---

## COORDINACION ENTRE DEVS

### Dependencias

```
DEV1 (Tarea 9.1 SQL) --debe completar antes--> DEV3 (Tarea 9.2 Frontend)

DEV2 (validation.js) --coordinar con--> DEV3 (llamar validacion en forms)

DEV3 (Tarea 12 onclick) --coordinar CSS con--> DEV4 (cursor, hover)
```

### Archivos Compartidos - CUIDADO

**public/index.html** es compartido por DEV2, DEV3 y DEV4

Estrategia para evitar conflictos:
1. DEV4 SOLO modifica dentro de <style>...</style>
2. DEV3 SOLO modifica funciones JavaScript
3. DEV2 SOLO agrega atributos a inputs existentes y importa scripts

### Orden de Commits Recomendado

1. DEV4 hace commit primero (solo CSS, no afecta logica)
2. DEV1 hace commit (backend, archivos separados)
3. DEV2 hace commit (nuevos archivos JS + imports)
4. DEV3 hace commit ultimo (logica que depende de validacion)

---

## INSTRUCCIONES PARA CADA DEV

### Para DEV1 (Backend):
```
Tu enfoque es 100% backend. No toques public/index.html.
Trabaja en:
- server/server-simple.js
- server/modules/*.js
- Crea server/modules/two-factor.js

Cuando termines Tarea 9.1 (query SQL), avisa a DEV3.
```

### Para DEV2 (Validacion):
```
Crea archivos NUEVOS:
- public/js/validation.js
- public/js/error-messages.js

En index.html SOLO:
- Agrega <script src="js/validation.js"></script>
- Agrega <script src="js/error-messages.js"></script>
- Agrega atributo "required" a inputs
- NO modifiques CSS ni funciones existentes
```

### Para DEV3 (Logica Frontend):
```
Tu enfoque es JavaScript dentro de index.html.
NO modifiques la seccion <style>.

Trabaja en:
- Funciones de calculo de fechas
- Funciones de dashboard (showView, loadBeds, etc)
- Funciones de renderizado

Espera a DEV1 para completar Tarea 9.
Coordina con DEV4 para hover effects.
```

### Para DEV4 (CSS):
```
Tu enfoque es 100% CSS/Visual.
SOLO modifica:
- Seccion <style> en index.html
- public/css/mobile-fixes.css

NO toques JavaScript.
Haz commit PRIMERO para evitar conflictos.
```

---

## CHECKLIST POR DEV

### DEV1
- [ ] Tarea 1: Transacciones atomicas
- [ ] Tarea 9.1: Query SQL habitacion
- [ ] Tarea 13: 2FA (si hay tiempo)

### DEV2
- [ ] Tarea 2: Libreria validation.js
- [ ] Tarea 4: Mensajes de error
- [ ] Tarea 5: Campos obligatorios

### DEV3
- [ ] Tarea 3: Calculo de fechas
- [ ] Tarea 6: Enlaces con filtros
- [ ] Tarea 7: Eliminar pop-ups
- [ ] Tarea 9.2: Renderizado habitacion
- [ ] Tarea 11: Notas en camas
- [ ] Tarea 12: Indicadores clickeables

### DEV4 - COMPLETADO 2025-12-06
- [x] Tarea 8: Boton X visible
- [x] Tarea 10: Colores y contraste
- [x] Tarea 14: Patron consistente

**Archivos modificados por DEV4:**
- public/index.html (lineas 1270-1508) - 238 lineas CSS
- public/css/mobile-fixes.css (lineas 328-393) - 66 lineas CSS
- docs/CSS-STYLE-GUIDE.md - Documentacion nueva

---

*Plan generado para trabajo en paralelo - Almanik PMS*
