# Product Requirements Document (PRD) v3.0
## Sistema de Gestión de Propiedades (PMS) para Hostales - VERSIÓN SIMPLIFICADA

---

### **Información del Documento**
- **Producto:** Almanik PMS v3.0 MVP
- **Versión:** 3.0 (Simplificación Senior Engineer)
- **Fecha:** 29 de Septiembre, 2025
- **Autor:** Senior Engineering Team
- **Estado:** Ready for Development - SIMPLE & FUNCTIONAL
- **Enfoque:** MVP que genera valor inmediato, sin complejidad innecesaria

---

## **1. Resumen Ejecutivo**

### **1.1 Visión del Producto**
Almanik PMS es un sistema **SIMPLE** de gestión para hostales (5-50 camas) que resuelve los 4 problemas más críticos: overbooking, check-ins lentos, pagos perdidos, y stock descontrolado. **NADA MÁS**. Una herramienta que funciona desde el día 1 sin training extenso ni complejidad innecesaria.

### **1.2 Los 4 Problemas CRÍTICOS que Resuelve**
1. **Overbooking accidental** → Sistema previene doble-booking (IMPOSIBLE reservar cama ocupada)
2. **Check-ins lentos (8-10min)** → Proceso de 3 pasos en 3 minutos máximo
3. **Pagos perdidos** → Stripe + pre-auth automática + balance tracking
4. **Stock descontrolado** → POS simple con inventory real-time

### **1.3 Métricas de Éxito SIMPLES**
| Métrica | Baseline Actual | Target 4 meses | Impacto Real |
|---------|----------------|----------------|--------------|
| Tiempo check-in | 8-10 min | 3-4 min | +40 huéspedes/día |
| Overbookings | 5-8/mes | 0/mes | -$2000/mes pérdidas |
| Pagos perdidos | $800/mes | <$200/mes | +$600/mes recovered |
| Tiempo admin | 20h/semana | 5h/semana | -15h admin/semana |

---

## **2. Análisis del Problema - CASOS REALES**

### **2.1 Situación Actual - Pain Points ESPECÍFICOS**
```
PROBLEMA REAL #1: "PENSÉ QUE ESTABA LIBRE"
→ Huésped llega, cama "disponible" en LOGISTICA está sucia
→ Recepción busca otra cama, demora 15 minutos
→ Huésped molesto, bad review

PROBLEMA REAL #2: "NO SÉ SI PAGÓ"
→ Huésped dice que pagó por WhatsApp
→ Staff busca en CAJA, no encuentra registro claro
→ Discusión, pérdida de tiempo, posible pérdida $

PROBLEMA REAL #3: "SE QUEDÓ GRATIS"
→ No-show no canceló
→ Cama perdida toda la noche
→ No se cobró penalidad

PROBLEMA REAL #4: "NO HAY CERVEZA"
→ Huésped quiere comprar, stock en PRODUCTOS desactualizado
→ Van a revisar físicamente
→ Perdida de venta, frustración
```

### **2.2 Impacto Financiero Medible**
- **Overbookings:** $500-1000 por incidente (compensación + reubicación)
- **No-shows:** $30-50 por noche perdida x 15-20 casos/mes = $450-1000/mes
- **Errores de inventario:** $200-400/mes en ventas perdidas
- **Tiempo administrativo:** 20-25 horas/semana @ $10/hora = $800-1000/mes

**TOTAL PÉRDIDAS EVITABLES: $2000-3400/mes**

---

## **3. Target Users - PERFILES REALES**

### **3.1 Maria - Administradora (Primary User)**
- **Edad:** 35-45, dueña del hostal
- **Pain Points:** "No sé si estoy ganando dinero", "Paso 3 horas/día en Excel"
- **Necesita:** Dashboard simple, reportes automáticos, control total
- **Success Metric:** Reduce admin time de 3h → 30min diarias

### **3.2 Carlos - Recepcionista (Primary User)**
- **Edad:** 22-28, estudiante/turno parcial
- **Pain Points:** "Huéspedes esperan mientras busco info", "No sé qué cama asignar"
- **Necesita:** Check-in rápido, estado de habitaciones visual, proceso guiado
- **Success Metric:** Check-in completo en <3 minutos

### **3.3 Ana - Voluntaria (Secondary User)**
- **Edad:** 20-25, backpacker temporaria
- **Pain Points:** "Sistema muy complicado", "No sé los precios"
- **Necesita:** POS súper simple, precios visibles, solo vender
- **Success Metric:** Puede vender sin preguntar precios

---

## **4. Modelo de Datos SIMPLE - 6 Tablas Core**

### **4.1 Entidades Esenciales (Solo lo necesario)**

```sql
-- TABLA 1: GUESTS (Huéspedes) - SIMPLIFICADA
CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(200),
  phone VARCHAR(20),
  document_number VARCHAR(50) UNIQUE NOT NULL,
  is_blacklisted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABLA 2: BEDS (Camas - Core del negocio)
CREATE TABLE beds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bed_name VARCHAR(50) NOT NULL UNIQUE, -- "1-A", "2-B", "Private-1"
  bed_type VARCHAR(50) DEFAULT 'dorm', -- dorm, private
  base_price DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'clean', -- clean, dirty, occupied, blocked
  current_guest_id UUID REFERENCES guests(id) NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABLA 3: RESERVATIONS (Reservas) - SIMPLIFICADA
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_code VARCHAR(20) UNIQUE NOT NULL, -- "ALM001234"
  guest_id UUID REFERENCES guests(id),
  bed_id UUID REFERENCES beds(id),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights_count INTEGER NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'confirmed', -- confirmed, checked_in, checked_out, cancelled
  pre_auth_amount DECIMAL(10,2) DEFAULT 50.00,
  check_in_time TIMESTAMP,
  check_out_time TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABLA 4: TRANSACTIONS (Transacciones - Pagos y Cargos)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES reservations(id),
  type VARCHAR(20) NOT NULL, -- 'charge', 'payment'
  description VARCHAR(200) NOT NULL, -- "Room charge", "Beer Corona", "Payment"
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50), -- cash, card, stripe (solo para payments)
  stripe_reference VARCHAR(100), -- Stripe charge ID
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABLA 5: PRODUCTS (Inventario) - SIMPLIFICADO
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL, -- "Cerveza Corona", "Sandwich"
  price DECIMAL(10,2) NOT NULL, -- Un solo precio
  current_stock INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABLA 6: USERS (Usuarios del sistema) - SIMPLIFICADO
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL, -- admin, reception, volunteer
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ÍNDICES BÁSICOS
CREATE INDEX idx_reservations_dates ON reservations(check_in, check_out);
CREATE INDEX idx_beds_status ON beds(status);
CREATE INDEX idx_transactions_reservation ON transactions(reservation_id);
```

---

## **5. Flujos de Usuario ULTRA-SIMPLES**

### **5.1 Check-in Process - 3 CLICKS**

#### **FLUJO SIMPLIFICADO (3 minutos máximo)**
```
┌─ PASO 1: BUSCAR RESERVA (30 segundos) ──────────────────┐
│ • Buscar por nombre o confirmation code                  │
│ • Sistema muestra: guest, dates, bed, total             │
│ • Check: bed status CLEAN ✅ or AUTO-SUGGEST otra       │
└──────────────────────────────────────────────────────────┘

┌─ PASO 2: PROCESAR PAGO (1.5 minutos) ───────────────────┐
│ • Pre-authorize $50 en tarjeta (Stripe)                 │
│ • Cobrar balance pendiente si existe                    │
│ • Sistema auto-creates transaction records              │
└──────────────────────────────────────────────────────────┘

┌─ PASO 3: COMPLETAR (1 minuto) ──────────────────────────┐
│ • Mark bed as OCCUPIED                                   │
│ • Mark reservation as CHECKED_IN                        │
│ • Print key assignment slip                             │
│ • DONE ✅                                               │
└──────────────────────────────────────────────────────────┘
```

### **5.2 Check-out Process - 2 CLICKS**
```
┌─ PASO 1: BUSCAR GUEST (30 segundos) ────────────────────┐
│ • Buscar por bed number o nombre                         │
│ • Sistema muestra balance: charges - payments           │
│ • Mostrar extras consumidos durante stay                │
└──────────────────────────────────────────────────────────┘

┌─ PASO 2: COBRAR Y LIBERAR (1.5 minutos) ───────────────┐
│ • Cobrar balance final (si hay)                         │
│ • Release pre-authorization hold                        │
│ • Mark bed as DIRTY, reservation as CHECKED_OUT         │
│ • DONE ✅                                               │
└──────────────────────────────────────────────────────────┘
```

### **5.3 Walk-in Process - SIMPLE**
```
┌─ PASO 1: CHECK AVAILABILITY (30 segundos) ──────────────┐
│ • Mostrar beds CLEAN disponibles + precios              │
│ • Crear guest profile básico (nombre, documento)        │
└──────────────────────────────────────────────────────────┘

┌─ PASO 2: ASSIGN & PAY (2 minutos) ──────────────────────┐
│ • Assign primera cama clean available                   │
│ • Cobrar total + pre-auth $50                          │
│ • Mark bed OCCUPIED, create reservation                 │
│ • DONE ✅                                              │
└──────────────────────────────────────────────────────────┘
```

### **5.4 POS Sale - SÚPER SIMPLE**
```
┌─ PASO 1: SCAN/SELECT PRODUCTS (30 segundos) ───────────┐
│ • Click product buttons para agregar al cart           │
│ • Mostrar precio total en tiempo real                  │
└─────────────────────────────────────────────────────────┘

┌─ PASO 2: PAYMENT (1 minuto) ───────────────────────────┐
│ • Cash, Card, or Charge to Room                        │
│ • Auto-update product stock                            │
│ • Print receipt, DONE ✅                               │
└─────────────────────────────────────────────────────────┘
```

---

## **6. Integraciones Críticas - SOLO LO ESENCIAL**

### **6.1 MVP Integrations (Phase 1)**
```
STRIPE PAYMENTS (CRÍTICO):
✅ Credit/debit card processing
✅ Pre-authorizations $50
✅ Automatic releases
✅ Refund handling

SENDGRID EMAIL (BÁSICO):
✅ Booking confirmations
✅ Invoices/receipts

ARCHIVO (BACKUP):
✅ Daily database backup to S3
✅ 7-day retention
```

### **6.2 Future Integrations (Post-MVP)**
```
FUTURE PHASE 2+:
→ SMS notifications (Twilio)
→ Booking.com channel manager
→ WhatsApp Business API
→ Door lock integration
→ Advanced analytics
→ Multi-property support
```

---

## **7. Stack Tecnológico SIMPLIFICADO**

### **7.1 Tech Stack - MÍNIMO VIABLE**
```
FRONTEND:
✅ React 18 + TypeScript
✅ Tailwind CSS (rapid development)
✅ React Query (data fetching)
✅ React Hook Form (form handling)

BACKEND:
✅ Node.js 18 + Express
✅ TypeScript (consistency)
✅ PostgreSQL direct queries (no ORM complexity)
✅ Joi validation

DATABASE:
✅ PostgreSQL 15 (reliable, ACID)
✅ Redis (sessions only)

INFRASTRUCTURE:
✅ Railway/Render (simple deployment)
✅ Stripe (payments)
✅ SendGrid (email)
✅ AWS S3 (backups)
```

### **7.2 Performance Targets REALISTAS**
| Metric | Target | Measurement |
|---------|---------|-------------|
| Page Load | <3s | Lighthouse |
| Check-in Process | <200ms per step | API response |
| Search Response | <200ms | Database query |
| Report Generation | <10s | Simple queries |
| Uptime | 99.5% | ~3.6h downtime/month |

---

## **8. Roadmap REALISTA - 10 Meses Total**

### **8.1 Phase 1: MVP FUNCIONAL (4 meses)**
```
MES 1: Database & Core Backend
✅ PostgreSQL setup with 6 tables
✅ User authentication (JWT)
✅ Basic CRUD APIs
✅ Stripe integration setup

MES 2: Frontend Core
✅ React app + Tailwind setup
✅ Login/Dashboard layout
✅ Guest management forms
✅ Basic check-in/out process

MES 3: POS & Payments
✅ Product catalog
✅ Simple POS interface
✅ Payment processing (Stripe)
✅ Transaction tracking

MES 4: Testing & Launch
✅ User acceptance testing
✅ Performance optimization
✅ Basic reporting
✅ Go-live preparation
```

### **8.2 Phase 2: PROFESSIONAL (3 meses)**
```
MES 5: Advanced Features
✅ SMS notifications (Twilio)
✅ Email automation (SendGrid)
✅ Advanced reporting
✅ Mobile responsive design

MES 6: Channel Integration
✅ Booking.com integration
✅ Revenue optimization (3-tier pricing)
✅ Backup/recovery system

MES 7: Polish & Scale
✅ Performance optimization
✅ Security hardening
✅ Multi-user permissions
✅ Admin training
```

### **8.3 Phase 3: GROWTH (3 meses)**
```
MES 8-10: Advanced Features (Optional)
→ WhatsApp integration
→ Door lock integration
→ Multi-property support
→ Advanced analytics/ML
→ Marketing automation

THESE ARE POST-LAUNCH FEATURES
ONLY AFTER MVP PROVES VALUE
```

---

## **9. Investment & ROI REALISTA**

### **9.1 Development Investment**
```
DEVELOPMENT COSTS YEAR 1:
• 2x Developers (4 months): $32,000
• 1x Designer (1 month): $4,000
• Infrastructure yearly: $2,000
• Third-party services: $1,500
• Testing/QA: $2,000
TOTAL YEAR 1: $41,500
```

### **9.2 Revenue Recovery**
```
MONTHLY BENEFITS (Conservative):
• Overbooking prevention: +$500
• Operational efficiency: +$600
• Reduced admin time: +$400
• Payment recovery: +$300
TOTAL MONTHLY: +$1,800

ANNUAL BENEFITS: $21,600
PAYBACK PERIOD: 23 months
YEAR 2+ NET BENEFIT: $19,000/year
```

---

## **10. Success Metrics - SIMPLE & MEASURABLE**

### **10.1 Technical Success (30 days post-launch)**
| Metric | Target | Measurement |
|---------|---------|-------------|
| System uptime | 99% | Monitoring |
| Check-in time | <4 min | User timing |
| Zero overbookings | 0 incidents | Error logs |
| Staff adoption | 90%+ | Usage analytics |

### **10.2 Business Impact (90 days)**
| Metric | Baseline | Target | Monthly Value |
|---------|----------|---------|---------------|
| Admin time | 20h/week | 8h/week | $480 savings |
| Booking errors | 15/month | <3/month | $600 savings |
| Payment issues | $800/month | <$200/month | $600 recovery |
| **TOTAL IMPACT** | | | **$1,680/month** |

---

## **11. CONCLUSIONES - SISTEMA FUNCIONAL**

### **11.1 Lo Que Este MVP SÍ Hace**
✅ **Elimina overbookings** - Base de datos prevent double-booking
✅ **Acelera check-ins** - 3 pasos en 3 minutos
✅ **Procesa pagos seguro** - Stripe integration + pre-auth
✅ **Controla stock** - POS integration real-time
✅ **Genera reportes básicos** - Occupancy, revenue, payments
✅ **Es fácil de usar** - Minimal training required

### **11.2 Lo Que NO Incluye (Future Features)**
❌ Machine learning y AI
❌ Advanced analytics y forecasting
❌ Multi-property desde el inicio
❌ Integraciones complejas (door locks, WhatsApp)
❌ Revenue management avanzado

### **11.3 Success Criteria MVP (4 meses)**
```
LAUNCH CRITERIA:
✅ Zero overbookings possible
✅ Check-in process <4 minutes
✅ Payment processing 100% functional
✅ Basic reporting working
✅ Staff trained y confident

POST-LAUNCH (6 months):
✅ $1,500+ monthly value generated
✅ Staff satisfaction >85%
✅ System uptime >99%
✅ Ready to add Phase 2 features
```

---

**NEXT STEPS INMEDIATOS:**
1. ✅ **Aprobar este PRD simplificado**
2. ✅ **Hire 2 developers (React + Node.js)**
3. ✅ **Setup development environment**
4. ✅ **Start Phase 1 Month 1: Database & Backend**

*Este PRD v3.0 representa una versión SIMPLIFICADA y FUNCIONAL que genera valor inmediato sin complejidad innecesaria. Cada feature tiene propósito específico y ROI claro.*