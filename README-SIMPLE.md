# 🏨 ALMANIK PMS ULTRA SIMPLE
## Sistema PMS Funcional en 4 Tablas y 2 Archivos

---

## 🚀 **SETUP RÁPIDO (5 MINUTOS)**

### **1. Base de Datos**
```bash
# Instalar PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Crear database
sudo -u postgres createdb almanik_simple

# Ejecutar schema
sudo -u postgres psql almanik_simple < database.sql
```

### **2. Backend**
```bash
# Instalar dependencias
npm install

# Ejecutar servidor
npm start
# Servidor corriendo en http://localhost:3000
```

### **3. Frontend**
```bash
# Instalar dependencias frontend
cd frontend
npm install

# Ejecutar frontend
npm start
# Frontend corriendo en http://localhost:3001
```

### **4. Login**
- **Username:** admin
- **Password:** admin123

---

## 📊 **FUNCIONALIDADES 100% OPERATIVAS**

### ✅ **CHECK-IN PROCESS (3 PASOS)**
1. **Buscar Guest:** Dropdown con guests registrados
2. **Asignar Bed:** Solo beds con status 'clean' disponibles
3. **Confirmar:** Sistema automáticamente:
   - Marca bed como 'occupied'
   - Crea booking record
   - Genera cargo por habitación
   - **IMPOSIBLE OVERBOOKING** 🔒

### ✅ **CHECK-OUT PROCESS (2 PASOS)**
1. **Ver Balance:** Cargos - Pagos = Balance pendiente
2. **Procesar:** Agregar pago final:
   - Completa booking
   - Marca bed como 'dirty'
   - Libera guest de bed
   - **REVENUE PROTECTED** 💰

### ✅ **POS SYSTEM**
- **6 productos predefinidos:** Beer, Water, Soda, Sandwich, Snack, Coffee
- **2 modos de pago:**
  - Cash/Card directo
  - Cargo a habitación (aparece en balance del guest)
- **Inventory simple:** No stock tracking (productos infinitos)

### ✅ **GUEST MANAGEMENT**
- Crear guests con validación de documento único
- Buscar guests by name/document
- Ver historial básico

### ✅ **DASHBOARD**
- **Bed Status:** Visual grid con colores
  - 🟢 Clean (disponible)
  - 🔴 Occupied (guest asignado)
  - 🟡 Dirty (necesita limpieza)
- **Revenue Today:** Suma de payments + sales del día
- **Quick Actions:** Links a funciones principales

---

## 🗄️ **ARQUITECTURA ULTRA SIMPLE**

### **4 TABLAS ÚNICAMENTE:**
```sql
guests     → Información básica huéspedes
beds       → Camas con status y precio
bookings   → Reservas activas
transactions → Todo: cargos, pagos, ventas
```

### **1 ARCHIVO BACKEND:**
- `server.js` → Todo el API en 470 líneas
- Express + PostgreSQL directo
- Sin ORM, sin JWT complejo
- Session storage en memoria

### **1 ARCHIVO FRONTEND:**
- `App.js` → Todo el UI en 800+ líneas
- React simple sin librerías extras
- Estado local con useState
- CSS inline para máxima simplicidad

---

## 💰 **ROI INMEDIATO**

### **Problemas Resueltos 100%:**
1. **Overbooking Prevention:** ✅ Database constraints
2. **Fast Check-in:** ✅ 3-click process
3. **Payment Tracking:** ✅ Balance calculation
4. **Basic POS:** ✅ Room charges + direct sales

### **Tiempo de Implementación:**
- **Database setup:** 5 minutos
- **Backend running:** 2 minutos
- **Frontend running:** 3 minutos
- **Total:** 10 minutos funcionando

### **Investment vs Original:**
- **Original Plan:** 4 meses, $41,500
- **Simple Plan:** 1 día, $500 (setup time)
- **Same functionality:** Overbooking prevention + Revenue tracking

---

## 🔧 **CONFIGURACIÓN**

### **Environment Variables (.env):**
```
DB_HOST=localhost
DB_NAME=almanik_simple
DB_USER=postgres
DB_PASSWORD=password
DB_PORT=5432
ADMIN_USER=admin
ADMIN_PASS=admin123
PORT=3000
```

### **Database Connection:**
- Modifica `.env` con tus credenciales PostgreSQL
- Sistema se conecta automáticamente al startup

### **Customización:**
- **Beds:** Modifica `database.sql` para agregar/quitar camas
- **Products:** Modifica array `PRODUCTS` en `server.js`
- **Prices:** Modifica directamente en database

---

## 📱 **USO DIARIO**

### **Check-in Normal:**
1. Staff abre sistema → Beds tab
2. Click "CHECK-IN" en bed disponible
3. Selecciona guest, fechas
4. Sistema procesa automáticamente

### **Walk-in Guest:**
1. Guests tab → "Add Guest"
2. Beds tab → CHECK-IN con nuevo guest
3. Payment immediate o charge to room

### **Check-out:**
1. Beds tab → Click "BALANCE" para ver cargos
2. Click "CHECK-OUT"
3. Agregar payment final
4. Bed automáticamente a status 'dirty'

### **POS Sales:**
1. POS tab → Click product buttons
2. Choose: Cash payment o Charge to room
3. Select occupied bed si es cargo
4. Process sale

### **Housekeeping:**
1. Dashboard → Ver beds 'dirty'
2. Beds tab → Click "MARK CLEAN"
3. Bed disponible para próximo guest

---

## ⚠️ **LIMITACIONES CONSCIENTES**

### **Lo Que NO Tiene (simplificado intencionalmente):**
- ❌ User roles complejos (solo admin)
- ❌ Reservaciones futuras complejas
- ❌ Stripe integration (solo cash/card tracking)
- ❌ Reportes avanzados
- ❌ Email notifications
- ❌ Multi-property
- ❌ Inventory tracking real
- ❌ Backup automático

### **Lo Que SÍ Tiene (value crítico):**
- ✅ Overbooking prevention ABSOLUTO
- ✅ Revenue tracking EXACTO
- ✅ Check-in/out RÁPIDO
- ✅ POS FUNCIONAL
- ✅ Guest management BÁSICO
- ✅ Dashboard ÚTIL

---

## 🚨 **NEXT STEPS (Si Exitoso)**

### **Week 2-4: Polish**
- Stripe integration real
- PDF receipts
- Basic reporting
- Data backup

### **Month 2-3: Professional**
- Email notifications
- Advanced reporting
- Mobile responsive
- User roles

### **Month 4+: Growth**
- Booking.com integration
- Multi-property
- Revenue optimization

---

## 🎯 **SUCCESS CRITERIA**

### **Week 1:**
- [ ] Zero overbookings
- [ ] Check-in < 2 minutes
- [ ] Staff comfortable with system
- [ ] All payments tracked

### **Month 1:**
- [ ] $1,500+ monthly value generated
- [ ] Staff adoption > 90%
- [ ] System uptime > 99%
- [ ] Ready for next features

---

**🔥 SISTEMA 100% FUNCIONAL EN 10 MINUTOS**

Este sistema prioriza **FUNCIONALIDAD sobre COMPLEJIDAD**. Resuelve los 4 problemas críticos del PRD original con máxima simplicidad y deployment inmediato.