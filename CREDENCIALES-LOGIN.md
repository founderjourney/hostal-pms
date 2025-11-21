# 🔐 CREDENCIALES DE ACCESO - ALMANIK PMS

## Estado del Sistema
✅ **Base de datos:** SQLite (desarrollo) - Funcionando
✅ **Tabla de usuarios:** Creada correctamente
✅ **Servidor:** Corriendo en puerto 3000
✅ **Endpoint login:** `/api/login` - Funcionando

## Usuarios Disponibles

### 1. Administrador
- **Usuario:** `admin`
- **Contraseña:** `admin123`
- **Rol:** Administrador
- **Permisos:** Acceso completo a todos los módulos

### 2. Recepcionista
- **Usuario:** `recepcion`
- **Contraseña:** `recepcion123`
- **Rol:** Recepcionista
- **Permisos:** Huéspedes, Reservas, POS, Reportes

### 3. Voluntario
- **Usuario:** `voluntario`
- **Contraseña:** `voluntario123`
- **Rol:** Voluntario
- **Permisos:** Ver huéspedes, POS, Tours

## Acceso a la Aplicación

1. Abre tu navegador
2. Ve a: `http://localhost:3000`
3. Usa cualquiera de las credenciales de arriba

## Verificación Técnica

```bash
# Verificar usuarios en la base de datos
node check-users.js

# Probar login desde terminal
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## Solución de Problemas

Si ves algún error:

1. **Abre la consola del navegador** (F12)
2. Revisa la pestaña "Console" y "Network"
3. Intenta hacer login y copia cualquier error que aparezca
4. Comparte el error para diagnosticar

---
Generado: 2025-11-20
