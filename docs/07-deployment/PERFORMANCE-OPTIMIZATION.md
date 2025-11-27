# ALMANIK PMS - Optimizacion de Rendimiento

**Version:** 1.12.3
**Fecha:** 2025-11-27

---

## PROBLEMA: Cold Starts (Arranques en Frio)

### Que es un Cold Start?

En arquitecturas serverless (Vercel + Neon), cuando no hay actividad:

1. **Vercel** suspende la funcion serverless despues de ~10 minutos
2. **Neon** suspende la base de datos despues de ~5 minutos (plan gratuito)

Cuando llega un nuevo request, ambos deben "despertar":
- Vercel: ~500ms-2s
- Neon: ~3-10s (el mayor culpable)

**Resultado:** El primer request despues de inactividad puede tardar 5-15 segundos.

---

## SOLUCIONES IMPLEMENTADAS

### 1. Endpoints de Warmup

Se agregaron dos endpoints especiales:

| Endpoint | Proposito | Tiempo de respuesta |
|----------|-----------|---------------------|
| `/ping` | Verifica que Vercel esta activo (sin DB) | ~100ms |
| `/warmup` | Pre-calienta la conexion a Neon | ~1-10s |
| `/health` | Health check completo | ~1-10s |

### 2. Pool de Conexiones Optimizado

Se optimizo `db-adapter.js`:

```javascript
this.pool = new Pool({
  connectionTimeoutMillis: 20000, // 20s para cold starts
  idleTimeoutMillis: 10000,       // Cierra conexiones inactivas rapido
  max: 5,                          // Menos conexiones para serverless
  min: 0,                          // No mantiene conexiones ociosas
  allowExitOnIdle: true           // Permite cerrar cuando esta inactivo
});
```

### 3. Configuracion de Vercel

En `vercel.json`:

```json
{
  "functions": {
    "server/server-simple.js": {
      "maxDuration": 30
    }
  }
}
```

---

## SOLUCION RECOMENDADA: Keep-Alive Externo

Para eliminar cold starts, configura un ping cada 4 minutos usando un servicio gratuito.

### Opcion A: cron-job.org (Gratis)

1. Ve a [cron-job.org](https://cron-job.org)
2. Crea una cuenta gratuita
3. Crea un nuevo cron job:
   - **URL:** `https://hostal-pms.vercel.app/warmup`
   - **Intervalo:** Cada 4 minutos
   - **Metodo:** GET

### Opcion B: UptimeRobot (Gratis)

1. Ve a [uptimerobot.com](https://uptimerobot.com)
2. Crea una cuenta gratuita
3. Agrega un monitor:
   - **Tipo:** HTTP(s)
   - **URL:** `https://hostal-pms.vercel.app/warmup`
   - **Intervalo:** 5 minutos

### Opcion C: Desde tu computadora (Linux/Mac)

Agrega esto a tu crontab (`crontab -e`):

```bash
*/4 * * * * curl -s https://hostal-pms.vercel.app/warmup > /dev/null
```

---

## COMPARACION DE TIEMPOS

### Sin Optimizacion (Cold Start)
| Accion | Tiempo |
|--------|--------|
| Login (cold) | 5-15 segundos |
| Dashboard (cold) | 3-10 segundos |

### Con Keep-Alive Activo
| Accion | Tiempo |
|--------|--------|
| Login (warm) | 200-500ms |
| Dashboard (warm) | 50-200ms |

---

## ALTERNATIVAS PREMIUM

Si el plan gratuito no es suficiente:

### Neon Pro ($19/mes)
- **Always On:** Base de datos nunca se suspende
- Sin cold starts de base de datos
- Latencia consistente

### Vercel Pro ($20/mes)
- Funciones con mas duracion
- Analytics avanzados
- Mejor rendimiento

---

## MONITOREO

### Verificar estado actual

```bash
# Test rapido (sin DB)
curl -w "Tiempo: %{time_total}s\n" https://hostal-pms.vercel.app/ping

# Test con DB
curl -w "Tiempo: %{time_total}s\n" https://hostal-pms.vercel.app/warmup

# Health check completo
curl -w "Tiempo: %{time_total}s\n" https://hostal-pms.vercel.app/health
```

### Interpretar resultados

| Tiempo /warmup | Estado |
|----------------|--------|
| < 500ms | Excelente (warm) |
| 500ms - 2s | Bueno |
| 2s - 5s | Cold start de Vercel |
| > 5s | Cold start de Neon |

---

## RESUMEN

1. **Problema:** Cold starts en Vercel + Neon causan lentitud
2. **Solucion rapida:** Configurar keep-alive cada 4 minutos
3. **Solucion permanente:** Upgrade a planes Pro

**Recomendacion:** Usa cron-job.org (gratis) para mantener el sistema activo durante horas laborales (6am-11pm).

---

## CHANGELOG

### v1.12.3 (2025-11-27)
- Agregado endpoint `/ping` (sin DB)
- Agregado endpoint `/warmup` (pre-calienta DB)
- Optimizado pool de conexiones PostgreSQL
- Configurado `maxDuration: 30` en Vercel
- Documentacion de optimizacion
