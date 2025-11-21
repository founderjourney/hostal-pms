# ALMANIK PMS - CONTEXT & DEVELOPMENT PLAN
## ⚠️ CRITICAL UPDATE: ARCHITECTURAL AUDIT COMPLETED

---

## 🚨 **CURRENT PROJECT STATUS (Oct 15, 2025)**

### **REAL IMPLEMENTATION STATUS:**
✅ **PRODUCTION SYSTEM LIVE:** https://hostal-pms.vercel.app
✅ **BASIC PMS FUNCTIONALITY:** Check-in/out, guest management, POS, reporting
⚠️ **ARCHITECTURAL DEVIATION:** Implementation differs significantly from PRD

### **ACTUAL TECH STACK (DEPLOYED):**
- **Frontend:** HTML/CSS/JS Vanilla (4,370 lines monolithic)
- **Backend:** Node.js + Express (58,546 lines monolithic)
- **Database:** PostgreSQL (Supabase) + SQLite hybrid (9 tables)
- **Auth:** bcrypt + basic sessions (no JWT)
- **Deploy:** Vercel + Supabase

### **CRITICAL TECHNICAL DEBT IDENTIFIED:**
❌ **Monolithic Architecture:** Single HTML file + massive server file
❌ **Zero Modularity:** No separation of concerns
❌ **No Testing:** Zero automated tests
❌ **Maintenance Risk:** Code impossible to scale/maintain long-term

---

## 📋 **ORIGINAL PROJECT OVERVIEW (PRD v3.0)**

### **What we PLANNED to build:**
Sistema PMS simple para hostales que resuelve 4 problemas críticos:
1. Overbooking prevention ($2,000/mes saved)
2. Fast check-in process (<4min vs 8-10min current)
3. Payment tracking ($600/mes recovered)
4. Basic inventory control ($200/mes sales)

### **PLANNED Tech Stack:**
- **Frontend:** React 18 + TypeScript + Tailwind CSS
- **Backend:** Node.js 18 + Express + TypeScript
- **Database:** PostgreSQL 15 (6 tables with UUIDs)
- **Payments:** Stripe
- **Deploy:** Railway/Render

### **Timeline:** 4 months MVP + optional advanced features

---

## 🗄️ **DATABASE SCHEMA (6 TABLES)**

```sql
-- Core business entities
guests (id, first_name, last_name, email, phone, document_number, is_blacklisted)
beds (id, bed_name, bed_type, base_price, status, current_guest_id)
reservations (id, confirmation_code, guest_id, bed_id, check_in, check_out, total_amount, status)
transactions (id, reservation_id, type, description, amount, payment_method, stripe_reference)
products (id, name, price, current_stock, is_active)
users (id, username, password_hash, first_name, last_name, role)
```

---

## 🚀 **PHASE 1: MVP DEVELOPMENT (4 MONTHS)**

### **SPRINT 1-2: DATABASE & BACKEND CORE (Month 1)**
**Goal:** Database setup + Authentication + Basic APIs

#### Week 1-2: Database Setup
- [ ] Create PostgreSQL database
- [ ] Create 6 core tables with relationships
- [ ] Add basic indexes for performance
- [ ] Create seed data for development
- [ ] Test database connections

#### Week 3-4: Authentication System
- [ ] Setup JWT authentication
- [ ] Password hashing with bcrypt
- [ ] Login/logout endpoints
- [ ] Role-based middleware (admin/reception/volunteer)
- [ ] Session management
- [ ] Test authentication flow

#### Week 5-6: Core APIs
- [ ] CRUD endpoints for guests
- [ ] CRUD endpoints for beds (with status management)
- [ ] CRUD endpoints for reservations
- [ ] CRUD endpoints for products
- [ ] Basic error handling middleware
- [ ] API documentation
- [ ] Test all endpoints

**Deliverable:** Functional backend APIs with authentication

---

### **SPRINT 3-4: FRONTEND FOUNDATION (Month 2)**
**Goal:** React app + Login + Dashboard + Guest Management

#### Week 7-8: React App Setup
- [ ] Initialize React 18 + TypeScript project
- [ ] Setup Tailwind CSS
- [ ] Configure React Query for API calls
- [ ] Setup React Router for navigation
- [ ] Create basic component library
- [ ] Setup development environment

#### Week 9-10: Authentication UI
- [ ] Create login form component
- [ ] Implement login functionality with backend
- [ ] Setup protected routes
- [ ] Create dashboard layout with navigation
- [ ] Role-based menu display
- [ ] Logout functionality
- [ ] Test login/logout flow

#### Week 11-12: Guest Management
- [ ] Create guest form component
- [ ] Search guests functionality
- [ ] Guest list display with pagination
- [ ] Form validation
- [ ] Integration with guest APIs
- [ ] Error handling in UI
- [ ] Test guest management features

**Deliverable:** Working React app with guest management

---

### **SPRINT 5-6: CHECK-IN/CHECK-OUT PROCESS (Month 3)**
**Goal:** Core hostel operations - the money-making features

#### Week 13-14: Check-in Process
- [ ] Search reservation component
- [ ] Reservation details display
- [ ] Bed assignment logic (auto-suggest clean beds)
- [ ] Stripe integration for pre-authorization ($50)
- [ ] Update bed status to OCCUPIED
- [ ] Generate confirmation slip
- [ ] Handle check-in errors (overbooking, dirty bed)
- [ ] Test complete check-in flow

#### Week 15-16: Check-out Process
- [ ] Search guest by bed/name component
- [ ] Display guest balance (charges - payments)
- [ ] Final payment processing
- [ ] Release Stripe pre-authorization
- [ ] Mark bed as DIRTY
- [ ] Generate invoice/receipt
- [ ] Handle check-out errors
- [ ] Test complete check-out flow

#### Week 17-18: Walk-in & Edge Cases
- [ ] Walk-in guest component (no reservation)
- [ ] Available beds display
- [ ] Create guest + reservation simultaneously
- [ ] Immediate payment processing
- [ ] Handle edge cases (no availability, payment failures)
- [ ] Overbooking prevention testing
- [ ] Performance testing

**Deliverable:** Complete check-in/check-out system preventing overbooking

---

### **SPRINT 7-8: POS SYSTEM & LAUNCH PREP (Month 4)**
**Goal:** Product sales + Basic reporting + Go-live ready

#### Week 19-20: Simple POS System
- [ ] Product catalog display (buttons)
- [ ] Shopping cart functionality
- [ ] Payment options (Cash/Card/Charge to Room)
- [ ] Automatic stock updates
- [ ] Receipt generation
- [ ] Integration with transactions table
- [ ] Test POS workflow

#### Week 21-22: Basic Reporting
- [ ] Daily occupancy report
- [ ] Revenue summary (today, week, month)
- [ ] Payment method breakdown
- [ ] Simple charts (occupancy %, revenue trends)
- [ ] CSV export functionality
- [ ] Test reporting accuracy

#### Week 23-24: Testing & Launch Preparation
- [ ] End-to-end testing all workflows
- [ ] Performance optimization
- [ ] Security audit (basic)
- [ ] Database backup setup (S3)
- [ ] Production deployment setup
- [ ] Staff training materials
- [ ] Go-live checklist

**Deliverable:** Production-ready MVP system

---

## 📊 **MVP SUCCESS CRITERIA (Month 4)**

### **Technical Requirements:**
- [ ] System uptime >99%
- [ ] Check-in process <4 minutes
- [ ] Zero overbooking incidents
- [ ] Payment processing 100% functional
- [ ] All core workflows tested

### **Business Requirements:**
- [ ] Staff can check-in guests without training
- [ ] Overbooking is impossible (database prevents)
- [ ] All payments tracked accurately
- [ ] Basic reports generated automatically
- [ ] Staff adoption >85%

### **Performance Requirements:**
- [ ] Page load <3 seconds
- [ ] API responses <200ms
- [ ] Search results <200ms
- [ ] Report generation <10 seconds

---

## 🔄 **PHASE 2: PROFESSIONAL FEATURES (Months 5-7)**
*Only proceed if MVP generates $1,500+ monthly value*

### **MONTH 5: COMMUNICATIONS**
- [ ] SMS notifications (Twilio)
  - [ ] Welcome SMS with WiFi password
  - [ ] Check-out reminders
  - [ ] No-show follow-ups
- [ ] Email automation (SendGrid)
  - [ ] Booking confirmations
  - [ ] Invoices post-checkout
  - [ ] Marketing emails

### **MONTH 6: ADVANCED FEATURES**
- [ ] Advanced reporting dashboard
  - [ ] Occupancy trends
  - [ ] Revenue analytics
  - [ ] Guest patterns
- [ ] Mobile responsive design
  - [ ] Touch-optimized interface
  - [ ] Tablet layouts

### **MONTH 7: CHANNEL INTEGRATION**
- [ ] Booking.com integration (if business requires)
  - [ ] Real-time availability sync
  - [ ] Rate synchronization
  - [ ] Reservation import
- [ ] Revenue optimization
  - [ ] 3-tier pricing (Low/Med/High season)
  - [ ] Occupancy-based rates

**Phase 2 Go/No-Go Decision Criteria:**
- [ ] MVP generating $1,500+ monthly value
- [ ] ROI Phase 1 >150%
- [ ] Staff comfortable with current system
- [ ] Business growing and needs advanced features

---

## 🚀 **PHASE 3: GROWTH FEATURES (Months 8-10)**
*Only proceed if Phase 2 generates positive ROI*

### **Advanced Integrations (Optional):**
- [ ] WhatsApp Business integration
- [ ] Door lock system integration
- [ ] Multi-property support
- [ ] Advanced analytics/ML
- [ ] Marketing automation

**Phase 3 Go/No-Go Decision Criteria:**
- [ ] Monthly revenue >$50,000
- [ ] Multiple properties operating
- [ ] Competition requires advanced features
- [ ] Technology becoming competitive advantage

---

## 🛠️ **DEVELOPMENT WORKFLOW**

### **Daily Standup Questions:**
1. What did I complete yesterday?
2. What am I working on today?
3. Any blockers or questions?

### **Weekly Review:**
- [ ] Review completed tasks
- [ ] Test new features
- [ ] Update this context.md
- [ ] Plan next week's priorities

### **End of Sprint:**
- [ ] Demo to stakeholders
- [ ] Retrospective (what went well/badly)
- [ ] Update timeline if needed
- [ ] Plan next sprint

---

## 📁 **CODEBASE STRUCTURE**

```
almanik-pms/
├── frontend/          # React app
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   ├── utils/         # Utility functions
│   │   └── types/         # TypeScript types
├── backend/           # Node.js API (to be created)
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── controllers/   # Business logic
│   │   ├── middleware/    # Auth, validation, etc.
│   │   ├── utils/         # Helper functions
│   │   └── types/         # TypeScript types
├── database/          # SQL files and migrations
└── docs/             # All documentation
```

---

## 🚨 **CRITICAL REMINDERS**

### **DO NOT:**
- ❌ Add features not in this plan without approval
- ❌ Use complex technologies not in the stack
- ❌ Skip testing for "time savings"
- ❌ Deploy without backup systems
- ❌ Change database schema without migration

### **ALWAYS:**
- ✅ Test each feature before marking complete
- ✅ Update this context.md when tasks change
- ✅ Keep UI simple and intuitive
- ✅ Focus on business value over cool features
- ✅ Ask questions when unclear

---

## 📞 **WHO TO CONTACT**

- **Product Questions:** [Stakeholder contact]
- **Technical Blockers:** [Senior developer contact]
- **UI/UX Questions:** [Designer contact]
- **Infrastructure Issues:** [DevOps contact]

---

## 📈 **PROGRESS TRACKING**

### **Overall MVP Progress:**
- Phase 1 (MVP): [____] 0/4 months completed
- Phase 2 (Professional): [____] 0/3 months completed
- Phase 3 (Growth): [____] 0/3 months completed

### **Current Sprint Progress:**
**Sprint 1-2: Database & Backend Core**
- Week 1-2: Database Setup [____] 0/6 tasks
- Week 3-4: Authentication [____] 0/7 tasks
- Week 5-6: Core APIs [____] 0/7 tasks

---

**REMEMBER: Simple systems that work beat complex systems that don't. Focus on value, not features.**