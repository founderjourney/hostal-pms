# 🚀 CONFIGURACIÓN SUPABASE PARA ALMANIK PMS

## PASO 1: Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Clic en "Start your project" / "New Project"
3. Configura el proyecto:
   - **Name:** `almanik-pms`
   - **Database Password:** (GUARDA ESTA CONTRASEÑA!)
   - **Region:** South America (Brasil) o la más cercana
4. Clic en "Create new project" (tarda 2-3 minutos)

## PASO 2: Obtener DATABASE_URL

1. Una vez creado, ve a **Settings** → **Database**
2. En la sección **Connection string**, copia la **URI**
3. Se ve así:
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

## PASO 3: Configurar variables de entorno

1. Edita tu archivo `.env`:
   ```bash
   nano .env
   ```

2. Actualiza la DATABASE_URL con la de Supabase:
   ```
   DATABASE_URL=postgresql://postgres:[TU-PASSWORD]@db.[TU-PROJECT-REF].supabase.co:5432/postgres
   ```

## PASO 4: Probar conexión

```bash
node test-supabase.js
```

## PASO 5: Migrar datos (opcional)

Si tienes datos en SQLite local que quieres migrar:

```bash
node migrate-to-supabase.js
```

## PASO 6: Configurar en Vercel

1. Ve a tu proyecto en Vercel
2. **Settings** → **Environment Variables**
3. Agrega:
   - **Name:** `DATABASE_URL`
   - **Value:** Tu conexión de Supabase
   - **Environment:** Production

## PASO 7: Deploy

```bash
vercel --prod
```

## 🔍 SOLUCIÓN DE PROBLEMAS

### Error de conexión:
- Verifica la DATABASE_URL
- Asegúrate que el proyecto Supabase esté activo
- Revisa usuario/contraseña

### Error SSL:
- La configuración SSL ya está en `db-adapter.js`
- Usa `ssl: { rejectUnauthorized: false }`

### Error de permisos:
- Verifica que uses el usuario `postgres`
- Revisa la contraseña del proyecto

## 📊 VENTAJAS DE SUPABASE

- ✅ 500MB gratis
- ✅ PostgreSQL completo
- ✅ Interface web para gestión
- ✅ Backups automáticos
- ✅ SSL incluido
- ✅ Compatible con Vercel

## 🔄 COMANDOS ÚTILES

```bash
# Probar conexión
node test-supabase.js

# Migrar datos
node migrate-to-supabase.js

# Desarrollo local (SQLite)
NODE_ENV=development npm start

# Simular producción (PostgreSQL)
NODE_ENV=production npm start
```