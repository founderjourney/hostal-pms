# Guia de Estilos CSS - Almanik PMS

**Fecha**: 2025-12-06
**Autor**: DEV4
**Version**: 1.0

---

## Resumen

Este documento describe el sistema de estilos CSS implementado para mejorar la accesibilidad, contraste y consistencia visual del PMS Almanik.

---

## 1. Variables CSS

Se definieron variables CSS en `:root` para mantener consistencia de colores:

```css
:root {
    --color-primary: #2563eb;        /* Azul principal */
    --color-primary-dark: #1d4ed8;   /* Azul hover */
    --color-success: #16a34a;        /* Verde exito */
    --color-success-dark: #15803d;   /* Verde hover */
    --color-danger: #dc2626;         /* Rojo peligro */
    --color-danger-dark: #b91c1c;    /* Rojo hover */
    --color-warning: #d97706;        /* Naranja advertencia */
    --color-warning-dark: #b45309;   /* Naranja hover */
    --color-info: #0891b2;           /* Cyan informacion */
    --color-text-light: #ffffff;     /* Texto claro */
    --color-text-dark: #1f2937;      /* Texto oscuro */
}
```

### Uso:
```css
.mi-boton {
    background: var(--color-primary);
    color: var(--color-text-light);
}
```

---

## 2. Boton de Cerrar Modal

El boton X de cerrar modales ahora es altamente visible:

### Desktop
- Fondo rojo (#dc2626)
- Texto blanco
- Tamano: 40x40px
- Borde blanco de 2px
- Sombra para destacar

### Mobile (< 576px)
- Posicion fija top-right
- Tamano: 48x48px
- z-index: 1002
- Borde blanco de 3px

### Selectores afectados:
```css
.modal-close-btn,
.fd-modal-close,
[class*="modal"] .close,
[class*="modal"] [class*="close"],
button[onclick*="close"]:not(.nav-button)
```

---

## 3. Contraste WCAG 2.1

Todos los colores cumplen con el ratio de contraste minimo:
- **Texto normal**: 4.5:1
- **Texto grande**: 3:1

### Botones con gradiente
Se fuerza texto blanco automaticamente:
```css
button[style*="gradient"] {
    color: #ffffff !important;
    text-shadow: 0 1px 2px rgba(0,0,0,0.2);
}
```

---

## 4. Clases de Botones

### Botones de accion:
```html
<button class="action-btn action-btn-primary">Guardar</button>
<button class="action-btn action-btn-success">Confirmar</button>
<button class="action-btn action-btn-danger">Eliminar</button>
<button class="action-btn action-btn-warning">Advertencia</button>
```

### Estilos:
- Padding: 10px 16px
- Border-radius: 8px
- Font-weight: 600
- Transicion suave en hover

---

## 5. Badges de Estado

Para mostrar estados de camas, reservas, etc:

```html
<span class="status-badge available">Disponible</span>
<span class="status-badge occupied">Ocupada</span>
<span class="status-badge dirty">Sucia</span>
<span class="status-badge maintenance">Mantenimiento</span>
```

### Colores:
| Estado | Fondo | Texto | Borde |
|--------|-------|-------|-------|
| available/clean | #dcfce7 | #15803d | #16a34a |
| occupied | #fee2e2 | #b91c1c | #dc2626 |
| dirty | #fef3c7 | #b45309 | #d97706 |
| maintenance | #e5e7eb | #374151 | #6b7280 |

---

## 6. Campos de Formulario

### Campo con error:
```html
<input type="text" class="field-error">
<span class="error-message">Este campo es obligatorio</span>
```

### Campos obligatorios:
Los labels con campos `required` muestran asterisco rojo automaticamente:
```html
<label for="nombre">Nombre</label>
<input id="nombre" required>
<!-- Muestra: Nombre * -->
```

---

## 7. Stat Cards (Dashboard)

Las tarjetas de estadisticas son clickeables:

```css
.stat-card {
    cursor: pointer;
    transition: transform 0.2s ease;
}

.stat-card:hover {
    transform: translateY(-4px);
}
```

### Mobile:
- Tap highlight azul
- Transform scale(0.98) en :active

---

## 8. Tablas

Estilos mejorados para legibilidad:

```css
table th {
    background: #f8fafc;
    color: #1f2937;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 12px;
}

table tr:hover td {
    background: #f1f5f9;
}
```

---

## 9. Accesibilidad

### Focus visible:
```css
button:focus-visible,
input:focus-visible,
select:focus-visible {
    outline: 3px solid #2563eb;
    outline-offset: 2px;
}
```

### Scroll suave:
```css
html {
    scroll-behavior: smooth;
}
```

---

## 10. Archivos Modificados

| Archivo | Lineas | Descripcion |
|---------|--------|-------------|
| public/index.html | 1270-1508 | Estilos principales |
| public/css/mobile-fixes.css | 328-393 | Estilos responsive |

---

## 11. Migracion

Para migrar botones existentes a las nuevas clases:

### Antes (inline):
```html
<button style="padding: 12px; background: #3498db; color: #2c3e50;">
    Guardar
</button>
```

### Despues (clase):
```html
<button class="action-btn action-btn-primary">
    Guardar
</button>
```

---

## 12. Compatibilidad

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- iOS Safari 14+
- Android Chrome 90+

---

*Documentacion generada por DEV4 - Almanik PMS*
