# AUDITORÍA DE PRODUCTO - ALMANIK PMS
## Análisis Senior de Lógica de Negocio y Flujos de Usuario

**Fecha:** 27 de Noviembre, 2025
**Auditor:** Senior Product Analyst
**Estado:** CRÍTICO - Rediseño Necesario
**Versión Actual:** 1.12.2

---

## RESUMEN EJECUTIVO

El sistema actual tiene **fallas fundamentales de arquitectura de producto**. No es un problema de código o bugs - es un problema de **diseño de producto incompleto**. El sistema fue construido sin una visión clara del flujo de usuario end-to-end.

### Veredicto: El producto NO tiene sentido funcional completo.

---

## SECCIÓN 1: ESTADO ACTUAL DEL SISTEMA

### 1.1 Navegación Actual (Frontend)
```
Sidebar Actual:
├── Tablero (Dashboard)
├── Camas
├── Huéspedes
├── Ventas (POS)
├── Personal
├── Caja
├── Reportes
├── Paseos (Tours)
└── Usuarios (solo admin)
```

### 1.2 Tablas de Base de Datos
```sql
-- Tablas existentes:
guests        -- Huéspedes registrados
beds          -- Camas con estado y guest_id
bookings      -- Reservas (check_in, check_out, nights, total)
transactions  -- Pagos y cargos
products      -- Inventario POS
staff         -- Personal
tours         -- Paseos turísticos
activity_log  -- Registro de actividad
```

### 1.3 Lo que el PRD prometió vs. Lo que existe

| Funcionalidad PRD | ¿Existe en UI? | Estado |
|-------------------|----------------|--------|
| Check-in en 3 clicks | NO | No hay modal/botón de check-in |
| Check-out en 2 clicks | NO | No hay modal/botón de check-out |
| Gestión de Reservas | NO | No hay pestaña "Reservas" |
| Ver huésped en cama | PARCIAL | Confuso, sin claridad |
| Prevención overbooking | NO | No hay validación visual |
| Balance del huésped | NO | No se muestra claramente |

---

## SECCIÓN 2: PROBLEMAS CRÍTICOS DE LÓGICA

### PROBLEMA #1: ¿DÓNDE VEO A MIS HUÉSPEDES HOSPEDADOS?

**Situación actual:**
- Usuario asigna huésped a cama
- Va a "Huéspedes" → Solo ve lista de nombres registrados
- Va a "Camas" → Ve camas con colores pero no siempre el nombre
- **PREGUNTA: ¿Dónde está la vista "Huéspedes Hospedados Ahora"?**

**Flujo esperado por usuario:**
```
"Quiero ver quién está hospedado ahora, en qué cama,
cuántas noches le quedan, y cuánto debe"
```

**Flujo actual:**
```
??? No existe esta vista clara ???
```

---

### PROBLEMA #2: NO HAY FLUJO DE RESERVAS

**El PRD dice:**
> "Sistema previene overbooking (IMPOSIBLE reservar cama ocupada)"

**Realidad:**
- NO existe pestaña "Reservas" en la navegación
- NO hay forma de crear una reserva futura
- NO hay calendario de disponibilidad
- NO hay forma de ver reservas pendientes de llegada

**Lo que el usuario necesita:**
```
1. Ver calendario con disponibilidad
2. Crear reserva para fecha futura
3. Ver lista de llegadas esperadas hoy
4. Confirmar llegada (check-in)
```

---

### PROBLEMA #3: CONFUSIÓN ENTRE "HUÉSPED" Y "RESERVA"

**Modelo mental del usuario:**
```
Reserva = Huésped + Cama + Fechas + Precio
```

**Modelo actual del sistema:**
```
guests (huésped registrado)
   ↓
beds.guest_id (¿asignación directa?)
   ↓
bookings (¿reserva separada?)
   ↓
transactions (¿pagos?)
```

**Preguntas sin respuesta clara:**
1. ¿Puedo tener un huésped registrado SIN reserva activa? SÍ
2. ¿Una cama puede tener guest_id SIN booking? SÍ (inconsistencia)
3. ¿Cómo sé si un huésped ya pagó? Buscar en transactions
4. ¿Cómo extiendo una estadía? No hay flujo

---

### PROBLEMA #4: FLUJO CHECK-IN INEXISTENTE

**PRD prometido:**
```
┌─ PASO 1: BUSCAR RESERVA (30 segundos) ──────────────────┐
│ • Buscar por nombre o confirmation code                  │
│ • Sistema muestra: guest, dates, bed, total             │
│ • Check: bed status CLEAN ✅ or AUTO-SUGGEST otra       │
└──────────────────────────────────────────────────────────┘
```

**Realidad:**
- No hay campo de búsqueda de reserva
- No hay botón "Check-in"
- No hay generación de código de confirmación
- No hay validación de cama limpia

---

### PROBLEMA #5: LA PESTAÑA "HUÉSPEDES" NO RESPONDE LA PREGUNTA CORRECTA

**Pestaña actual "Huéspedes" muestra:**
- Lista de todos los huéspedes registrados
- Email, teléfono, documento
- Botones: Editar, Ver Balance

**Lo que el usuario realmente necesita:**

```
┌── HUÉSPEDES HOSPEDADOS AHORA ─────────────────────────┐
│                                                        │
│  🛏️ Cama 1-1 | Juan Pérez                             │
│  📅 Check-in: Nov 25 | Check-out: Nov 28 (3 noches)   │
│  💰 Total: $75.00 | Pagado: $25.00 | Debe: $50.00     │
│  [Ver Detalle] [Agregar Cargo] [Check-out]            │
│                                                        │
│  🛏️ Cama Priv1-1 | María González                     │
│  📅 Check-in: Nov 26 | Check-out: Nov 28 (2 noches)   │
│  💰 Total: $100.00 | Pagado: $107.00 | Saldo: +$7.00  │
│  [Ver Detalle] [Agregar Cargo] [Check-out]            │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## SECCIÓN 3: FLUJOS DE USUARIO ROTOS

### 3.1 Flujo "Llegó un huésped con reserva"
```
FLUJO ESPERADO:
1. Buscar reserva por código o nombre
2. Verificar datos del huésped
3. Confirmar cama (validar limpia)
4. Procesar pago/depósito
5. Entregar llaves
6. Sistema actualiza estados

FLUJO ACTUAL:
1. ??? No hay búsqueda de reservas
2. Ir a Huéspedes → buscar nombre
3. Ir a Camas → buscar cama
4. ??? Hacer check-in cómo?
5. ??? Registrar pago dónde?
6. ??? Actualizar manualmente?
```

### 3.2 Flujo "Walk-in sin reserva"
```
FLUJO ESPERADO:
1. Ver camas disponibles con precios
2. Seleccionar cama
3. Registrar huésped (si nuevo)
4. Crear reserva + cobrar
5. Entregar llaves

FLUJO ACTUAL:
1. Ir a Camas → ver disponibles (OK)
2. Click en cama → ??? qué pasa?
3. ??? Crear huésped donde?
4. ??? Crear booking cómo?
5. ??? Cobrar cómo?
```

### 3.3 Flujo "Huésped hace check-out"
```
FLUJO ESPERADO:
1. Buscar huésped por cama o nombre
2. Ver balance final (cargos - pagos)
3. Cobrar pendiente si hay
4. Marcar check-out
5. Cama pasa a "sucia"

FLUJO ACTUAL:
1. ??? Ir a qué sección?
2. ??? Dónde ver balance?
3. ??? Cómo cobrar?
4. ??? Cómo marcar check-out?
5. Cama no cambia automáticamente
```

---

## SECCIÓN 4: MAPA DE DESCONEXIONES

```
┌─────────────────────────────────────────────────────────────┐
│                    SISTEMA ACTUAL (ROTO)                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   [Huéspedes]     [Camas]      [Bookings]    [Transactions] │
│       ↓              ↓             ↓              ↓         │
│   Lista de       Estados        ??? SIN        Lista de     │
│   registros      visuales       UI VISIBLE     pagos        │
│       │              │             │              │         │
│       └──────────────┴─────────────┴──────────────┘         │
│                         │                                    │
│                    SIN CONEXIÓN                              │
│                    LÓGICA CLARA                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  SISTEMA ESPERADO (CORRECTO)                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                    [RESERVAS]                                │
│                        │                                     │
│          ┌─────────────┼─────────────┐                       │
│          ↓             ↓             ↓                       │
│     [Huésped]      [Cama]      [Transacciones]               │
│          │             │             │                       │
│          └─────────────┴─────────────┘                       │
│                        │                                     │
│              RESERVA ES EL CENTRO                            │
│           (conecta todo con lógica)                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## SECCIÓN 5: DIAGNÓSTICO

### 5.1 ¿Por qué pasó esto?

1. **Desarrollo sin Product Owner** - Se construyeron features aisladas sin visión global
2. **Falta de User Journey Mapping** - Nadie mapeó el flujo completo del usuario
3. **Backend-first approach** - Se crearon tablas sin pensar en la UI
4. **Iteración sin validación** - Se agregaron cosas sin probar con usuarios reales

### 5.2 El arquitecto del producto no definió:

- [ ] ¿Cuál es la entidad principal? (Respuesta: RESERVA)
- [ ] ¿Cuál es el flujo principal? (Respuesta: Reserva → Check-in → Estadía → Check-out)
- [ ] ¿Qué ve el usuario primero? (Respuesta: Reservas del día/Huéspedes actuales)
- [ ] ¿Cómo se conectan las entidades? (Respuesta: Todo a través de Reserva)

---

## SECCIÓN 6: PROPUESTA DE REDISEÑO

### 6.1 Nueva Navegación Propuesta

```
Sidebar Rediseñado:
├── 🏠 Tablero (Vista operativa del día)
│       ├── Check-outs de hoy
│       ├── Llegadas esperadas
│       └── Camas disponibles
│
├── 📅 RESERVAS ← NUEVA SECCIÓN CENTRAL
│       ├── Calendario de disponibilidad
│       ├── Lista de reservas
│       ├── Nueva reserva
│       └── Buscar reserva
│
├── 🛏️ Hospedados Ahora ← RENOMBRADO DE "Huéspedes"
│       ├── Lista de huéspedes actuales con cama
│       ├── Balance por huésped
│       └── Check-out rápido
│
├── 🛏️ Camas (Estado de limpieza)
│       └── Vista de habitaciones
│
├── 📋 Directorio ← NUEVO (antes Huéspedes)
│       └── Historial de todos los huéspedes
│
├── 🛒 Ventas (POS)
├── 💰 Caja
├── 📊 Reportes
└── ⚙️ Configuración
        ├── Personal
        ├── Tours
        └── Usuarios
```

### 6.2 Flujo Rediseñado: Check-in

```
┌─────────────────────────────────────────────────────────────┐
│  PANTALLA: CHECK-IN                                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🔍 Buscar: [________________] [Buscar]                      │
│     (código de confirmación, nombre, documento)             │
│                                                              │
│  ─────────────────────────────────────────────────          │
│                                                              │
│  📋 RESERVA ENCONTRADA:                                      │
│  ┌──────────────────────────────────────────────────┐       │
│  │ Código: ALM-20251127-143022                      │       │
│  │ Huésped: Juan Carlos Pérez                       │       │
│  │ Documento: 1012345678                            │       │
│  │ Cama asignada: 1-1 (Habitación 1)               │       │
│  │ Fechas: Nov 27 → Nov 30 (3 noches)              │       │
│  │ Total: $75.00                                    │       │
│  │                                                  │       │
│  │ Estado cama: 🟢 LIMPIA ✓                         │       │
│  │                                                  │       │
│  │ [✓ CONFIRMAR CHECK-IN]                          │       │
│  └──────────────────────────────────────────────────┘       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Flujo Rediseñado: Vista "Hospedados Ahora"

```
┌─────────────────────────────────────────────────────────────┐
│  🛏️ HOSPEDADOS AHORA                      [+ Walk-in]       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Filtrar: [Todas las camas ▼] [Buscar huésped...]          │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 🛏️ CAMA 1-1 (Habitación 1)                             │ │
│  │ ─────────────────────────────────────────────────────  │ │
│  │ 👤 Juan Carlos Pérez | Doc: 1012345678                 │ │
│  │ 📅 Nov 25 → Nov 28 | Noche 2 de 3                      │ │
│  │ 💰 Total: $75.00 | Pagado: $25.00 | 🔴 Debe: $50.00    │ │
│  │                                                         │ │
│  │ [+ Cargo] [Recibir Pago] [Check-out] [Ver Detalle]    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 🛏️ CAMA PRIV1-1 (Privada 1)                            │ │
│  │ ─────────────────────────────────────────────────────  │ │
│  │ 👤 María González | Doc: 1098765432                    │ │
│  │ 📅 Nov 26 → Nov 28 | Noche 1 de 2                      │ │
│  │ 💰 Total: $100.00 | Pagado: $107.00 | 🟢 Saldo: +$7.00 │ │
│  │                                                         │ │
│  │ [+ Cargo] [Recibir Pago] [Check-out] [Ver Detalle]    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## SECCIÓN 7: PLAN DE ACCIÓN

### Fase 1: Corrección Crítica (1-2 días)
- [ ] Crear vista "Hospedados Ahora" que muestre huésped + cama + balance
- [ ] Agregar botón "Check-out" funcional
- [ ] Conectar visualmente reserva con huésped y cama

### Fase 2: Flujo de Reservas (3-5 días)
- [ ] Crear sección "Reservas" en navegación
- [ ] Implementar calendario de disponibilidad
- [ ] Crear flujo de nueva reserva
- [ ] Implementar check-in desde reserva

### Fase 3: Consistencia de Datos (2-3 días)
- [ ] Validar integridad: cama ocupada = tiene booking activo
- [ ] Validar integridad: booking activo = tiene guest_id
- [ ] Auto-actualizar estado de cama en check-out

### Fase 4: UX Polish (2-3 días)
- [ ] Renombrar "Huéspedes" a "Directorio"
- [ ] Dashboard muestra info operativa real
- [ ] Alertas de check-outs pendientes

---

## SECCIÓN 8: CONCLUSIÓN

### El sistema actual es como un rompecabezas con piezas que no encajan.

**Metáfora:**
> Tienes una caja con: llaves, cerraduras, puertas, y habitaciones.
> Pero nadie te dijo cómo conectarlas.
> Las llaves no abren las cerraduras correctas.
> Las puertas no llevan a las habitaciones que deberían.

**El problema NO es técnico. Es de diseño de producto.**

El código funciona. Las APIs funcionan. La base de datos tiene sentido.
Pero la **experiencia de usuario está rota** porque nadie diseñó el flujo completo.

---

## PRÓXIMOS PASOS INMEDIATOS

1. **REVISAR** este documento con stakeholders
2. **APROBAR** la propuesta de rediseño de navegación
3. **PRIORIZAR** Fase 1 (vista "Hospedados Ahora")
4. **NO** agregar más features hasta arreglar el flujo básico

---

*Documento generado el 27 de Noviembre, 2025*
*Auditoría de Producto - Almanik PMS v1.12.2*
