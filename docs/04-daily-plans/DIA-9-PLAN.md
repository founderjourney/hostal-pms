# Day 9 - Mobile App (PWA) Setup

**Fecha:** 23 de Noviembre, 2025
**Objetivo:** Transformar el PMS en una Progressive Web App (PWA) instalable en dispositivos móviles.

## Contexto

Day 8 completado: Sistema estable y con monitoreo.
Day 9 enfoque: **MOVILIDAD**. Permitir que el staff use el sistema desde sus celulares como una app nativa.

## Objetivos del Día

### 1. Web App Manifest
**Objetivo:** Permitir la instalación de la app en Home Screen.

**Implementación:**
- Crear `public/manifest.json`.
- Definir nombre, iconos, colores y modo de visualización (standalone).

### 2. Service Worker
**Objetivo:** Soporte offline y caching de assets estáticos.

**Implementación:**
- Crear `public/sw.js`.
- Cachear archivos críticos (HTML, CSS, JS).
- Implementar estrategia "Network First, falling back to Cache" para API calls.
- Crear página de "Offline Fallback".

### 3. Icons & Meta Tags
**Objetivo:** Apariencia nativa en iOS y Android.

**Implementación:**
- Generar iconos (192x192, 512x512).
- Agregar meta tags para iOS (apple-touch-icon, mobile-web-app-capable).
- Configurar theme-color.

## Checklist de Implementación

### PWA Core
- [ ] Crear `manifest.json`
- [ ] Crear `sw.js` (Service Worker)
- [ ] Registrar Service Worker en `index.html`

### Assets & UI
- [ ] Generar iconos de app (placeholders o generados)
- [ ] Agregar meta tags en `<head>`
- [ ] Crear `offline.html` (opcional, o manejar en index)

### Verification
- [ ] Verificar instalabilidad en Chrome DevTools (Lighthouse)
- [ ] Verificar funcionamiento offline (Network Throttling)

## Métricas de Éxito

- [ ] Puntuación PWA en Lighthouse > 90
- [ ] Prompt de instalación visible en móvil
- [ ] App carga sin conexión a internet (assets cacheados)

## Next Steps (Day 10)
1. Advanced Reporting
2. AI Insights
