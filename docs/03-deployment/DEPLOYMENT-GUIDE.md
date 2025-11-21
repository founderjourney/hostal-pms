# 🚀 GUÍA DE DEPLOYMENT - ALMANIK PMS

## 📋 PROBLEMA RESUELTO
- ✅ SQLite → PostgreSQL para producción
- ✅ Funciona en localhost (SQLite) y Vercel (PostgreSQL)
- ✅ Auto-detección de entorno

## 🔧 PASOS PARA DEPLOYMENT EN VERCEL

### 1. Crear Base de Datos PostgreSQL
```bash
# Opción 1: Neon (Recomendado - Gratis)
# 1. Ve a https://neon.tech
# 2. Crea cuenta gratis
# 3. Crea nueva base de datos
# 4. Copia la DATABASE_URL

# Opción 2: Vercel Postgres
# 1. En dashboard de Vercel → Storage → Create
# 2. Selecciona Postgres
# 3. Copia la DATABASE_URL
```

### 2. Configurar Variables de Entorno en Vercel
```bash
# En Vercel Dashboard → Settings → Environment Variables
DATABASE_URL=postgresql://user:pass@host:5432/database
NODE_ENV=production
ADMIN_USER=admin
ADMIN_PASS=tu_password_seguro
```

### 3. Deploy a Vercel
```bash
# Instalar Vercel CLI
npm i -g vercel

# Hacer deploy
vercel

# Seguir prompts y configurar dominio
```

## 🧪 TESTING

### Local (SQLite)
```bash
npm start
# http://localhost:3000
```

### Producción (PostgreSQL)
```bash
# Configurar DATABASE_URL en .env
NODE_ENV=production npm start
```

## 📁 ARCHIVOS IMPORTANTES

- `db-adapter.js` - Adaptador SQLite/PostgreSQL
- `server-simple.js` - Servidor principal (modificado)
- `vercel.json` - Configuración de Vercel
- `.env` - Variables de entorno local

## 🔍 VERIFICACIÓN POST-DEPLOYMENT

1. **Dashboard**: https://tu-app.vercel.app
2. **API Health**: https://tu-app.vercel.app/api/guests
3. **Login**: admin / admin123

## ⚠️ PROBLEMAS COMUNES

### Error de Base de Datos
```bash
# Verificar variables de entorno
console.log(process.env.DATABASE_URL);

# Verificar conexión PostgreSQL
# El adaptador auto-detecta y maneja errores
```

### Error 500 en Vercel
```bash
# Ver logs en Vercel Dashboard → Functions
# Verificar que DATABASE_URL esté configurada
```

## 🚀 PRÓXIMOS PASOS

1. ✅ **Sistema funcionando** en localhost y Vercel
2. 🔄 **Backup automático** de PostgreSQL
3. 🔐 **SSL/HTTPS** habilitado por defecto
4. 📊 **Logs centralizados** en Vercel

**Estado**: ✅ LISTO PARA PRODUCCIÓN