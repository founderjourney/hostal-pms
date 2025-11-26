# 🛡️ PLAN DÍA 11: Optimización del Sistema y Auditoría de Seguridad

**Objetivo:** Asegurar que el sistema sea rápido, seguro y eficiente antes de la expansión final.
**Estado:** 📅 Planificado
**Responsable:** Antigravity

---

## 🎯 Objetivos Principales

1.  **Optimización de Rendimiento (Performance Tuning)**
    *   Implementar índices en base de datos para consultas frecuentes.
    *   Configurar compresión Gzip/Brotli en Express.
    *   Optimizar headers de caché para assets estáticos.
    *   Revisar y optimizar consultas SQL lentas.

2.  **Auditoría y Fortalecimiento de Seguridad**
    *   Revisar configuración de Helmet (Security Headers).
    *   Ajustar Rate Limiting para prevenir ataques de fuerza bruta.
    *   Verificar sanitización de inputs en todos los endpoints.
    *   Ejecutar auditoría de dependencias (`npm audit`).

3.  **Limpieza de Código (Code Cleanup)**
    *   Eliminar `console.log` de depuración en producción.
    *   Refactorizar código repetitivo en helpers.
    *   Organizar estructura de carpetas si es necesario.

---

## 📝 Tareas Detalladas

### 1. Performance 🚀
- [ ] **Database Indexing**:
    - [ ] Crear índices para `bookings(check_in, check_out)`
    - [ ] Crear índices para `guests(document, email)`
    - [ ] Crear índices para `transactions(created_at)`
- [ ] **Express Optimization**:
    - [ ] Verificar middleware de compresión.
    - [ ] Configurar `Cache-Control` para archivos estáticos (1 día/1 semana).
- [ ] **Frontend Optimization**:
    - [ ] Minificar CSS/JS (si no se usa build tool, revisar opciones manuales o ligeras).
    - [ ] Lazy loading de imágenes si aplica.

### 2. Seguridad 🔒
- [ ] **Security Headers**:
    - [ ] Verificar `Content-Security-Policy`.
    - [ ] Verificar `X-Frame-Options`, `X-Content-Type-Options`.
- [ ] **Rate Limiting**:
    - [ ] Ajustar límites para `/api/login` (más estricto).
    - [ ] Ajustar límites generales para la API.
- [ ] **Input Validation**:
    - [ ] Revisar validación en endpoints críticos (`/api/bookings`, `/api/guests`).

### 3. Mantenimiento 🧹
- [ ] **Logs**:
    - [ ] Asegurar que Winston solo loguee `info` o `error` en producción, no `debug`.
- [ ] **Codebase**:
    - [ ] Eliminar código comentado obsoleto.
    - [ ] Unificar manejo de errores.

---

## 🧪 Criterios de Aceptación

1.  Todas las respuestas de API deben ser < 200ms (en promedio).
2.  Score de seguridad en headers debe ser A o B.
3.  No deben existir vulnerabilidades críticas en `npm audit`.
4.  Logs de producción limpios de ruido.
