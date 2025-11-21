# Product Requirements Document (PRD)
## Sistema de Gestión de Propiedades (PMS) para Hostales

---

### **Información del Documento**
- **Producto:** Almanik PMS
- **Versión:** 1.0
- **Fecha:** 24 de Septiembre, 2025
- **Autor:** Equipo de Desarrollo
- **Estado:** Draft

---

## **1. Resumen Ejecutivo**

### **1.1 Visión del Producto**
Almanik PMS es un sistema integral de gestión de propiedades diseñado específicamente para hostales y alojamientos pequeños. El producto digitaliza y centraliza todas las operaciones, desde reservas hasta facturación, reemplazando los sistemas manuales basados en hojas de cálculo por una plataforma moderna, segura y eficiente.

### **1.2 Objetivos de Negocio**
- **Primario:** Eliminar la dependencia de hojas de cálculo fragmentadas
- **Secundario:** Incrementar la eficiencia operativa en 40%
- **Terciario:** Mejorar la precisión de datos y reportes a 99.9%
- **Cuaternario:** Habilitar análisis de datos en tiempo real para decisiones estratégicas

### **1.3 Métricas de Éxito**
| Métrica | Baseline Actual | Target 6 meses | Target 1 año |
|---------|----------------|----------------|--------------|
| Tiempo check-in/out | 8-10 min | 3-4 min | 2-3 min |
| Errores de datos | 15-20/mes | <5/mes | <2/mes |
| RevPAR | Variable | +15% | +25% |
| Ocupación promedio | Variable | +10% | +20% |

---

## **2. Análisis del Problema**

### **2.1 Situación Actual**
El hostal opera con 5 hojas de cálculo independientes:
- **REGISTRO:** Base de datos de huéspedes
- **LOGISTICA:** Calendario visual de ocupación
- **CAJA:** Registro de transacciones financieras
- **CONTAR:** Conversión de monedas
- **PRODUCTOS:** Inventario y precios

### **2.2 Pain Points Identificados**
1. **Fragmentación de datos:** Información duplicada y inconsistente
2. **Procesos manuales:** Alto riesgo de errores humanos
3. **Falta de integración:** Sin conexión entre módulos
4. **Ausencia de análisis:** No hay KPIs ni reportes automáticos
5. **Seguridad limitada:** Sin control de acceso por roles

### **2.3 Impacto en el Negocio**
- Pérdida de tiempo operativo (2-3 horas/día en tareas manuales)
- Riesgo de overbooking y pérdida de ingresos
- Imposibilidad de implementar pricing dinámico
- Experiencia del huésped subóptima

---

## **3. Definición del Producto**

### **3.1 Propuesta de Valor**
"Una plataforma todo-en-uno que transforma la operación manual del hostal en un sistema inteligente, automatizado y orientado a datos, permitiendo maximizar ingresos y mejorar la experiencia del huésped."

### **3.2 Target Users**
1. **Administrador del Hostal** (Primary)
   - Necesita: Control total, reportes, análisis financiero
   - Frustraciones: Datos dispersos, falta de visibilidad del negocio

2. **Personal de Recepción** (Primary)
   - Necesita: Check-in/out rápido, gestión de reservas
   - Frustraciones: Procesos lentos, errores manuales

3. **Voluntarios** (Secondary)
   - Necesita: Registrar ventas de productos
   - Frustraciones: Sistema complejo, acceso limitado

### **3.3 User Journey Actual vs. Futuro**

#### **Proceso Actual (Check-in):**
1. Buscar reserva en REGISTRO *(2 min)*
2. Verificar disponibilidad en LOGISTICA *(1 min)*
3. Actualizar manualmente ambas hojas *(3 min)*
4. Crear folio manual en CAJA *(2 min)*
**Total: 8 minutos, múltiples puntos de error**

#### **Proceso Futuro (Check-in):**
1. Escanear/buscar reserva en PMS *(30 seg)*
2. Verificar identidad y asignar cama *(1 min)*
3. Sistema actualiza automáticamente todo *(30 seg)*
4. Generar llave/código y folio *(1 min)*
**Total: 3 minutos, proceso automatizado**

---

## **4. Requisitos Funcionales**

### **4.1 Módulo de Gestión de Reservas**

#### **4.1.1 User Stories**

**Como Administrador quiero:**
- [ ] Ver un dashboard de ocupación en tiempo real para tomar decisiones estratégicas
- [ ] Gestionar precios dinámicos por fecha y ocupación para maximizar RevPAR
- [ ] Generar reportes de ocupación, ADR y RevPAR para análisis de performance

**Como Personal de Recepción quiero:**
- [ ] Crear nuevas reservas rápidamente para acelerar el proceso de booking
- [ ] Buscar y modificar reservas existentes para gestionar cambios
- [ ] Ver el estado de todas las camas en una vista calendario para gestión visual
- [ ] Asignar automáticamente la mejor cama disponible según preferencias

**Criterios de Aceptación:**
- El sistema debe mostrar disponibilidad en tiempo real
- Las reservas deben sincronizarse instantáneamente con el calendario
- Debe permitir reservas para múltiples noches y personas
- Debe manejar listas de espera automáticamente

#### **4.1.2 Flujos Principales**

**Flujo: Crear Nueva Reserva**
```
1. Usuario accede al módulo de reservas
2. Selecciona fechas de check-in y check-out
3. Sistema muestra disponibilidad y precios
4. Usuario ingresa datos del huésped
5. Sistema valida información y disponibilidad
6. Sistema genera reserva con ID único
7. Sistema actualiza calendario y disponibilidad
8. Sistema envía confirmación (email/SMS)
```

### **4.2 Módulo de Check-in/Check-out**

#### **4.2.1 User Stories**

**Como Personal de Recepción quiero:**
- [ ] Realizar check-in en menos de 3 minutos para mejorar experiencia del huésped
- [ ] Ver automáticamente el folio del huésped con todos los cargos para checkout eficiente
- [ ] Procesar pagos integrados para eliminar pagos pendientes
- [ ] Generar facturas automáticamente para cumplir requisitos fiscales

**Criterios de Aceptación:**
- Check-in debe completarse en máximo 3 clicks principales
- El folio debe mostrar todos los cargos en tiempo real
- Debe soportar múltiples métodos de pago
- Las facturas deben generarse automáticamente

#### **4.2.2 Wireframes Conceptuales**

**Pantalla de Check-in:**
```
┌─────────────────────────────────────────┐
│ CHECK-IN - Reserva #12345              │
├─────────────────────────────────────────┤
│ Huésped: Juan Pérez                     │
│ Documento: 12345678                     │
│ Fechas: 24/09 - 26/09 (2 noches)      │
│ ┌─────────────────┐ ┌─────────────────┐ │
│ │ [Verificar ID]  │ │ [Asignar Cama] │ │
│ └─────────────────┘ └─────────────────┘ │
│                                         │
│ Cama Asignada: 2-A                     │
│ ┌─────────────────────────────────────┐ │
│ │        [COMPLETAR CHECK-IN]         │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### **4.3 Módulo de Punto de Venta (POS)**

#### **4.3.1 User Stories**

**Como Voluntario quiero:**
- [ ] Registrar ventas de productos de forma simple para no cometer errores
- [ ] Ver precios actualizados automáticamente para cobrar correctamente

**Como Personal de Recepción quiero:**
- [ ] Cargar consumos al folio del huésped para centralizar facturación
- [ ] Ver inventario en tiempo real para informar disponibilidad

**Criterios de Aceptación:**
- Interface debe ser intuitiva para usuarios no técnicos
- Inventario debe actualizarse automáticamente con cada venta
- Los cargos deben aparecer inmediatamente en el folio del huésped

### **4.4 Módulo de Reportes y Analytics**

#### **4.4.1 KPIs Principales**

| KPI | Cálculo | Frecuencia de Update |
|-----|---------|---------------------|
| Tasa de Ocupación | (Camas Ocupadas / Camas Disponibles) × 100 | Tiempo real |
| ADR | Ingresos por Habitaciones / Habitaciones Vendidas | Diario |
| RevPAR | ADR × Tasa de Ocupación | Diario |
| Ingresos por Fuente | Desglose Hospedaje vs Productos | Tiempo real |

#### **4.4.2 Dashboards Requeridos**

**Dashboard Operativo (Recepción):**
- Estado actual de camas
- Check-ins/Check-outs del día
- Reservas próximas (72h)

**Dashboard Gerencial (Administrador):**
- KPIs principales
- Gráficos de tendencias (ocupación, ingresos)
- Top productos vendidos
- Análisis de huéspedes recurrentes

---

## **5. Requisitos Técnicos**

### **5.1 Arquitectura del Sistema**

#### **5.1.1 Stack Tecnológico**
- **Frontend:** React.js con TypeScript
- **Backend:** Node.js con Express
- **Base de Datos:** PostgreSQL
- **Autenticación:** JWT + Role-Based Access Control
- **Hosting:** Cloud (AWS/Azure)
- **Integraciones:** Stripe (pagos), Twilio (SMS)

#### **5.1.2 Modelo de Datos**

```sql
-- Entidades Principales
Tables:
├── guests (huéspedes)
├── rooms (habitaciones)
├── beds (camas)
├── reservations (reservas)
├── products (productos)
├── transactions (transacciones)
├── users (usuarios del sistema)
└── audit_log (registro de auditoría)
```

**Esquema Detallado:**
```sql
CREATE TABLE guests (
  id UUID PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  document_type VARCHAR(20) NOT NULL,
  document_number VARCHAR(50) UNIQUE NOT NULL,
  phone VARCHAR(20),
  country VARCHAR(100),
  companion_name VARCHAR(200),
  companion_document VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reservations (
  id UUID PRIMARY KEY,
  guest_id UUID REFERENCES guests(id),
  bed_id UUID REFERENCES beds(id),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests_count INTEGER DEFAULT 1,
  nights_count INTEGER NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'confirmed',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### **5.2 Requisitos de Performance**
- **Tiempo de respuesta:** < 200ms para operaciones CRUD
- **Disponibilidad:** 99.9% uptime
- **Concurrencia:** Soporte para 50 usuarios simultáneos
- **Backup:** Automático cada 6 horas

### **5.3 Requisitos de Seguridad**
- **Autenticación:** Multi-factor opcional
- **Encriptación:** TLS 1.3 para transmisión, AES-256 para datos en reposo
- **Compliance:** GDPR para protección de datos de huéspedes
- **Audit Trail:** Log completo de todas las operaciones críticas

---

## **6. Requisitos de Integración**

### **6.1 Integraciones Críticas**
1. **Pasarela de Pagos (Stripe/MercadoPago)**
   - Procesamiento de tarjetas de crédito/débito
   - Pagos móviles (Apple Pay, Google Pay)
   - Manejo de reembolsos

2. **Notificaciones (Twilio/SendGrid)**
   - SMS de confirmación de reservas
   - Emails de check-in/check-out
   - Alertas al personal

### **6.2 APIs Requeridas**
- **REST API:** Para integraciones externas
- **Webhook Support:** Para notificaciones en tiempo real
- **Export API:** Para reportes y análisis externos

---

## **7. Experiencia de Usuario (UX)**

### **7.1 Principios de Diseño**
1. **Simplicidad:** Máximo 3 clicks para operaciones comunes
2. **Consistencia:** UI coherente en todos los módulos
3. **Feedback:** Confirmaciones visuales inmediatas
4. **Accesibilidad:** Soporte para diferentes niveles técnicos

### **7.2 Responsive Design**
- **Desktop:** Interfaz principal para operaciones
- **Tablet:** Dashboard móvil para supervisión
- **Mobile:** Funciones básicas de consulta

---

## **8. Plan de Implementación**

### **8.1 Roadmap por Fases**

#### **Phase 1: MVP (Mes 1-2)**
- [ ] Gestión básica de huéspedes y reservas
- [ ] Check-in/Check-out simple
- [ ] Dashboard básico de ocupación
- [ ] Sistema de usuarios y roles

#### **Phase 2: Core Features (Mes 3-4)**
- [ ] POS integrado
- [ ] Módulo de productos e inventario
- [ ] Reportes básicos (ocupación, ingresos)
- [ ] Integración de pagos

#### **Phase 3: Advanced Features (Mes 5-6)**
- [ ] Analytics avanzados
- [ ] Pricing dinámico
- [ ] Integraciones externas (SMS, email)
- [ ] Export de datos y reportes

### **8.2 Criterios de Go-Live**
- [ ] Todos los tests automatizados pasan (>95% cobertura)
- [ ] Performance benchmarks cumplidos
- [ ] Training del personal completado
- [ ] Plan de rollback documentado
- [ ] Migración de datos históricos validada

---

## **9. Migración de Datos**

### **9.1 Estrategia de Migración**
1. **Análisis y limpieza** de hojas de cálculo actuales
2. **Mapeo de campos** entre sistema actual y nuevo
3. **Script de importación** con validaciones
4. **Período de doble entrada** (2 semanas)
5. **Cutover** y desactivación del sistema anterior

### **9.2 Plan de Contingencia**
- Backup completo antes de migración
- Rollback automático en caso de errores críticos
- Personal capacitado en ambos sistemas durante transición

---

## **10. Training y Adopción**

### **10.1 Plan de Capacitación**
- **Semana 1:** Administrador - Configuración y gestión completa
- **Semana 2:** Personal de Recepción - Operaciones diarias
- **Semana 3:** Voluntarios - POS y funciones básicas
- **Semana 4:** Práctica supervisada y resolución de dudas

### **10.2 Documentación**
- Manual de usuario por rol
- Videos tutoriales para funciones clave
- FAQ y troubleshooting guide
- Documentación técnica para soporte

---

## **11. Riesgos y Mitigación**

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Resistencia al cambio del personal | Media | Alto | Training intensivo + período de adaptación |
| Pérdida de datos durante migración | Baja | Crítico | Testing exhaustivo + rollback plan |
| Problemas de performance | Media | Medio | Load testing + optimización proactiva |
| Fallos de integración de pagos | Baja | Alto | Ambiente de testing + proveedores backup |

---

## **12. Presupuesto y Timeline**

### **12.1 Estimación de Desarrollo**
- **Desarrollo:** 4-6 meses
- **Testing y QA:** 1 mes
- **Deployment y Go-live:** 2 semanas
- **Post-launch support:** 3 meses

### **12.2 Recursos Requeridos**
- 1 Product Manager
- 2 Full-stack Developers
- 1 UX/UI Designer
- 1 QA Engineer
- DevOps/Infrastructure support

---

## **13. Criterios de Éxito Post-Launch**

### **13.1 Métricas de Adopción (30 días)**
- [ ] 95% de operaciones realizadas en el nuevo sistema
- [ ] <2% de errores reportados por usuarios
- [ ] Tiempo promedio de check-in <4 minutos
- [ ] 100% del personal capacitado y operando

### **13.2 Métricas de Negocio (90 días)**
- [ ] 10% de mejora en RevPAR
- [ ] 15% de reducción en tiempo de operaciones administrativas
- [ ] Cero casos de overbooking
- [ ] 90% de satisfacción del personal con el sistema

---

## **14. Contactos y Responsabilidades**

- **Product Owner:** [A definir]
- **Tech Lead:** [A definir]
- **Stakeholder Principal:** Administrador del Hostal
- **Usuarios Finales:** Personal de Recepción, Voluntarios

---

*Este PRD será actualizado iterativamente basado en feedback de stakeholders y descubrimientos durante el desarrollo.*