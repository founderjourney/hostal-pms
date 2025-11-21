# ALMANIK PMS - SPRINT PLANNING SIMPLIFICADO
## Roadmap Realista sin Complejidad Innecesaria

---

### **📋 OVERVIEW DEL PROYECTO**
- **Total Duration:** 4 meses MVP + 6 meses features avanzadas
- **Team Size:** 2 Full-stack developers
- **Methodology:** Agile con sprints de 2 semanas
- **MVP Target:** Mes 4 (Funcionalidad core completa)

---

## **PHASE 1: MVP CORE (4 meses) - 8 sprints**

### **🚀 SPRINT 1-2: Database & Authentication (Mes 1)**
**Goal:** Base técnica sólida y funcional
**Duration:** 4 semanas

#### **User Stories MVP:**

**US-001: Database Setup** *(5 pts)*
```
COMO developer
QUIERO database PostgreSQL con 6 tablas core
PARA manejar guests, beds, reservations, transactions, products, users

TASKS:
- [ ] Crear 6 tablas con relationships
- [ ] Setup básico de índices
- [ ] Seed data para testing
- [ ] Connection pooling

DoD: Database funcional con data de prueba
```

**US-002: Authentication Basic** *(8 pts)*
```
COMO usuario del sistema
QUIERO login/logout seguro
PARA acceder según mi rol (admin/reception/volunteer)

TASKS:
- [ ] JWT authentication básico
- [ ] Password hashing (bcrypt)
- [ ] Login/logout endpoints
- [ ] Basic role middleware

DoD: Users pueden login/logout con roles
```

**US-003: Core APIs** *(8 pts)*
```
COMO frontend
QUIERO APIs REST básicas
PARA CRUD de guests, beds, reservations, products

TASKS:
- [ ] CRUD guests
- [ ] CRUD beds (with status)
- [ ] CRUD reservations
- [ ] CRUD products
- [ ] Basic error handling

DoD: APIs funcionando y testeadas
```

---

### **🏗️ SPRINT 3-4: Frontend Base (Mes 2)**
**Goal:** React app funcional con navegación
**Duration:** 4 semanas

**US-004: React App Setup** *(5 pts)*
```
COMO developer
QUIERO React app base
PARA desarrollar UI rápidamente

TASKS:
- [ ] React 18 + TypeScript setup
- [ ] Tailwind CSS configured
- [ ] React Query setup
- [ ] React Router básico

DoD: App React funcional con routing
```

**US-005: Login & Dashboard** *(8 pts)*
```
COMO usuario
QUIERO dashboard simple después del login
PARA ver información key del día

TASKS:
- [ ] Login form funcional
- [ ] Dashboard layout básico
- [ ] Sidebar navigation por rol
- [ ] Logout functionality

DoD: Users pueden navegar el sistema post-login
```

**US-006: Guest Management** *(13 pts)*
```
COMO recepcionista
QUIERO gestionar guest profiles
PARA crear/buscar huéspedes rápidamente

TASKS:
- [ ] Create guest form
- [ ] Search guests interface
- [ ] Guest list display
- [ ] Basic validation

DoD: Staff puede crear y buscar guests sin problemas
```

---

### **📋 SPRINT 5-6: Check-in/Check-out (Mes 3)**
**Goal:** Proceso core de hospedaje funcional
**Duration:** 4 semanas

**US-007: Simple Check-in** *(21 pts)*
```
COMO recepcionista
QUIERO check-in de 3 pasos
PARA procesar guests en <4 minutos

TASKS:
- [ ] Search reservation interface
- [ ] Bed assignment logic (auto-suggest clean)
- [ ] Stripe pre-auth integration ($50)
- [ ] Update bed status to OCCUPIED
- [ ] Generate confirmation slip

DoD: Check-in completo en 3-4 minutos sin errors
```

**US-008: Simple Check-out** *(13 pts)*
```
COMO recepcionista
QUIERO check-out rápido
PARA liberar beds y cobrar extras

TASKS:
- [ ] Search by bed/guest name
- [ ] Display balance (charges - payments)
- [ ] Process final payment
- [ ] Release Stripe pre-auth
- [ ] Mark bed as DIRTY

DoD: Check-out procesa balance y libera bed
```

**US-009: Walk-in Process** *(8 pts)*
```
COMO recepcionista
QUIERO procesar walk-ins
PARA no perder business sin reserva

TASKS:
- [ ] Check available beds (CLEAN status)
- [ ] Create guest + reservation simultaneously
- [ ] Immediate payment processing
- [ ] Bed assignment

DoD: Walk-ins processed in <3 minutes
```

---

### **🛒 SPRINT 7-8: POS & Launch (Mes 4)**
**Goal:** POS funcional y go-live ready
**Duration:** 4 semanas

**US-010: Simple POS** *(13 pts)*
```
COMO voluntario
QUIERO POS súper simple
PARA vender products sin training

TASKS:
- [ ] Product buttons interface
- [ ] Shopping cart functionality
- [ ] Cash/Card/Room charge options
- [ ] Auto-update stock
- [ ] Receipt generation

DoD: Volunteers pueden vender independientemente
```

**US-011: Basic Reporting** *(8 pts)*
```
COMO administrador
QUIERO reportes básicos
PARA entender daily performance

TASKS:
- [ ] Occupancy rate display
- [ ] Daily revenue summary
- [ ] Payment method breakdown
- [ ] CSV export básico

DoD: Admin ve KPIs daily sin Excel
```

**US-011B: Daily Operations Screen** *(13 pts)*
```
COMO staff diario
QUIERO pantalla "al día" completa
PARA gestionar operaciones daily sin navegar múltiples pantallas

TASKS:
- [ ] Vista consolidada: check-ins del día vs check-outs esperados
- [ ] Lista de tareas diarias (camas a limpiar, maintenance)
- [ ] Resumen de ocupación actual vs disponibilidad
- [ ] Balance de caja del día (cash in/out)
- [ ] Alertas de overbooking o problemas
- [ ] Quick actions (mark bed clean/dirty, emergency checkout)

DoD: Staff puede manejar día completo desde 1 pantalla
```

**US-012: Spanish Localization & UI** *(8 pts)*
```
COMO staff hispanohablante
QUIERO sistema completamente en español
PARA usar sin barreras de idioma

TASKS:
- [ ] Cambiar "dirty beds" → "camas por limpiar"
- [ ] Traducir todas las pestañas: Camas, Huéspedes, Ventas, Personal, Caja
- [ ] Agregar pestañas faltantes: Reportes, Paseos
- [ ] Todos los mensajes y labels en español
- [ ] Status de camas: "limpia", "ocupada", "por limpiar"

DoD: Sistema 100% en español sin términos en inglés
```

**US-013: Testing & Launch Prep** *(13 pts)*
```
COMO team
QUIERO sistema production-ready
PARA go-live sin problems

TASKS:
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Database backup setup
- [ ] Staff training materials
- [ ] Production deployment

DoD: Sistema deployed y staff trained
```

---

## **PHASE 2: PROFESSIONAL FEATURES (3 meses)**

### **📱 SPRINT 9-10: Communications (Mes 5)**

**US-013: SMS Notifications** *(13 pts)*
```
COMO sistema
QUIERO enviar SMS automáticos
PARA comunicar con guests

FEATURES:
- Welcome SMS con WiFi password
- Check-out reminder
- Twilio integration
```

**US-014: Email Automation** *(13 pts)*
```
COMO sistema
QUIERO emails automáticos
PARA professional communication

FEATURES:
- Booking confirmations
- Invoices post-checkout
- SendGrid templates
```

### **📊 SPRINT 11-12: Advanced Features (Mes 6)**

**US-015: Advanced Reporting** *(21 pts)*
```
COMO administrador
QUIERO analytics detallados
PARA optimize operations

FEATURES:
- Occupancy trends
- Revenue analytics
- Guest patterns
- Interactive charts
```

**US-016: Mobile Responsive** *(13 pts)*
```
COMO staff usando tablet/phone
QUIERO access mobile
PARA flexibility

FEATURES:
- Touch-optimized interface
- Mobile navigation
- Tablet layouts
```

### **🔗 SPRINT 13-14: Channel Integration (Mes 7)**

**US-017: Booking.com Integration** *(34 pts)*
```
COMO sistema
QUIERO sync con Booking.com
PARA prevent overbookings across channels

FEATURES:
- Real-time availability sync
- Rate synchronization
- Reservation import
- Error handling
```

---

## **PHASE 3: GROWTH FEATURES (Optional - Post Launch)**

### **Future Features (Solo si MVP tiene éxito):**
- WhatsApp Business integration
- Door lock system
- Multi-property support
- Advanced analytics/ML
- Marketing automation
- Revenue management
- Guest retention programs

---

## **📊 SPRINT SUMMARY REALISTA**

### **Story Point Distribution:**
- **Phase 1 (MVP):** 171 story points (8 sprints x 2 weeks) = ~21 pts/sprint
- **Phase 2 (Professional):** 108 story points (6 sprints)
- **Total Realistic:** 279 story points vs 831 points original

### **Timeline Comparison:**
```
ORIGINAL PLAN (UNREALISTIC):
→ 24 sprints, 831 points, 6 meses
→ 35 pts/sprint (IMPOSSIBLE for 2 devs)

SIMPLIFIED PLAN (REALISTIC):
→ MVP: 4 meses, 171 points
→ Professional: 3 meses, 108 points
→ 21-22 pts/sprint (ACHIEVABLE)
```

### **Critical Dependencies:**
```
Sprint 1-2 → Sprint 3-4: Database required for frontend
Sprint 3-4 → Sprint 5-6: Frontend needed for check-in/out
Sprint 5-6 → Sprint 7-8: Check-in/out needed for POS integration
```

### **Definition of Done (All Sprints):**
✅ Code reviewed
✅ Basic tests passing
✅ Feature works in dev environment
✅ No critical bugs
✅ User can complete task successfully

---

## **🚨 KEY SIMPLIFICATIONS MADE:**

### **❌ ELIMINATED COMPLEXITY:**
- Machine learning forecasting
- Advanced analytics dashboard
- Multi-property from start
- Complex integrations (locks, WhatsApp)
- Advanced revenue management
- Predictive analytics
- Complex reporting suite
- Marketing automation

### **✅ KEPT ESSENTIAL:**
- Overbooking prevention (core value)
- Fast check-in/out (operational efficiency)
- Payment processing (revenue protection)
- Basic POS (inventory control)
- Simple reporting (admin visibility)

---

**BOTTOM LINE:**
Este sprint plan es **EJECUTABLE** por 2 developers en 4 meses para MVP funcional que genera valor inmediato. Features complejas se agregan **SOLO DESPUÉS** de probar que el MVP funciona y genera ROI.

**START SIMPLE. DELIVER FAST. ITERATE BASED ON REAL USAGE.**