# Payments API - Stripe Integration

**Version:** 1.3.0
**Base URL:** `/api/payments`
**Fecha:** 2025-11-28
**Responsable:** DEV1

---

## Resumen

El modulo de Payments maneja todas las transacciones con tarjeta via Stripe. Soporta:
- Pagos directos (cobros inmediatos)
- Pre-autorizaciones (retener fondos sin capturar)
- Capturas de pre-autorizaciones
- Cancelaciones de pre-autorizaciones
- Reembolsos
- Historial de pagos por reservacion

---

## Configuracion

### Variables de Entorno Requeridas

```env
STRIPE_SECRET_KEY=sk_test_...      # API key secreta
STRIPE_PUBLISHABLE_KEY=pk_test_... # API key publica (para frontend)
STRIPE_WEBHOOK_SECRET=whsec_...    # Secreto para webhooks
```

### Archivos

- `server/config/stripe.js` - Configuracion de Stripe
- `server/modules/payments.js` - Endpoints del modulo

---

## Endpoints

### GET /config

Obtiene la configuracion de Stripe para el frontend.

**Autenticacion:** No requerida

**Response:**
```json
{
  "enabled": true,
  "publishableKey": "pk_test_...",
  "mode": "test",
  "currency": "cop"
}
```

**Response (no configurado):**
```json
{
  "error": "Payment service not configured",
  "enabled": false
}
```

---

### GET /status

Verifica el estado del modulo de pagos.

**Autenticacion:** Requerida (session-id header)

**Response:**
```json
{
  "module": "payments",
  "version": "1.1.0",
  "stripe_enabled": true,
  "stripe_mode": "test",
  "currency": "cop",
  "endpoints": {
    "implemented": [
      "GET /config",
      "POST /create-intent",
      "POST /confirm",
      "POST /pre-authorize",
      "POST /capture",
      "POST /cancel-auth",
      "GET /pre-auth/:reservation_id",
      "GET /history/:reservation_id",
      "GET /status"
    ],
    "pending": [
      "POST /charge (DEV1-03)",
      "POST /refund (DEV1-03)"
    ]
  }
}
```

---

### POST /create-intent

Crea un Payment Intent para procesar un pago.

**Autenticacion:** Requerida

**Request Body:**
```json
{
  "amount": 50000,
  "currency": "cop",
  "reservation_id": 123,
  "guest_id": 45,
  "description": "Pago de estadia",
  "metadata": {
    "custom_field": "value"
  }
}
```

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| amount | number | Si | Monto en unidad minima (centavos) |
| currency | string | No | Codigo de moneda (default: cop) |
| reservation_id | number | No | ID de reservacion asociada |
| guest_id | number | No | ID de huesped asociado |
| description | string | No | Descripcion del pago |
| metadata | object | No | Metadata adicional |

**Response:**
```json
{
  "success": true,
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx",
  "amount": 50000,
  "currency": "cop",
  "status": "requires_payment_method"
}
```

---

### POST /confirm

Confirma un Payment Intent despues de que el cliente completa el pago.

**Autenticacion:** Requerida

**Request Body:**
```json
{
  "payment_intent_id": "pi_xxx"
}
```

**Response:**
```json
{
  "success": true,
  "status": "succeeded",
  "paymentIntentId": "pi_xxx",
  "amount": 50000,
  "currency": "cop"
}
```

---

## Pre-autorizaciones (DEV1-02)

Las pre-autorizaciones retienen fondos en la tarjeta del cliente sin capturarlos.
Util para depositos de check-in que se capturan al check-out.

### POST /pre-authorize

Crea una pre-autorizacion (retiene fondos sin capturar).

**Autenticacion:** Requerida

**Request Body:**
```json
{
  "amount": 200000,
  "currency": "cop",
  "reservation_id": 123,
  "guest_id": 45,
  "description": "Deposito de check-in",
  "payment_method_id": "pm_xxx",
  "metadata": {}
}
```

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| amount | number | Si | Monto a pre-autorizar |
| reservation_id | number | Si | ID de reservacion (requerido) |
| currency | string | No | Codigo de moneda (default: cop) |
| guest_id | number | No | ID de huesped |
| description | string | No | Descripcion |
| payment_method_id | string | No | Metodo de pago guardado |
| metadata | object | No | Metadata adicional |

**Response:**
```json
{
  "success": true,
  "clientSecret": "pi_xxx_secret_xxx",
  "paymentIntentId": "pi_xxx",
  "amount": 200000,
  "currency": "cop",
  "status": "requires_capture",
  "requiresAction": false,
  "expiresAt": "2025-12-05T12:00:00.000Z"
}
```

**Errores:**
- `400` - Falta reservation_id o amount invalido
- `409` - Ya existe pre-autorizacion activa para esta reservacion
- `503` - Stripe no configurado

**Notas:**
- La pre-autorizacion expira en 7 dias (limite de Stripe)
- Solo puede haber una pre-auth activa por reservacion
- Usa `capture_method: 'manual'` internamente

---

### POST /capture

Captura fondos de una pre-autorizacion (convierte hold en cobro real).

**Autenticacion:** Requerida

**Request Body:**
```json
{
  "payment_intent_id": "pi_xxx",
  "amount_to_capture": 150000
}
```

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| payment_intent_id | string | Si | ID del payment intent pre-autorizado |
| amount_to_capture | number | No | Monto a capturar (puede ser menor al autorizado) |

**Response:**
```json
{
  "success": true,
  "paymentIntentId": "pi_xxx",
  "originalAmount": 200000,
  "capturedAmount": 150000,
  "currency": "cop",
  "status": "succeeded"
}
```

**Errores:**
- `400` - Payment intent no es pre-autorizacion o status incorrecto
- `400` - amount_to_capture mayor que el autorizado

**Notas:**
- Si no se especifica `amount_to_capture`, captura el monto completo
- La diferencia no capturada se libera automaticamente

---

### POST /cancel-auth

Cancela una pre-autorizacion y libera los fondos retenidos.

**Autenticacion:** Requerida

**Request Body:**
```json
{
  "payment_intent_id": "pi_xxx",
  "reason": "Huesped cancelo antes del check-in"
}
```

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| payment_intent_id | string | Si | ID del payment intent a cancelar |
| reason | string | No | Razon de la cancelacion |

**Response:**
```json
{
  "success": true,
  "paymentIntentId": "pi_xxx",
  "releasedAmount": 200000,
  "currency": "cop",
  "status": "canceled",
  "reason": "Huesped cancelo antes del check-in"
}
```

**Errores:**
- `400` - Payment intent no puede ser cancelado (ya capturado, etc)

---

### GET /pre-auth/:reservation_id

Obtiene la pre-autorizacion activa de una reservacion.

**Autenticacion:** Requerida

**Response (con pre-auth):**
```json
{
  "success": true,
  "has_pre_auth": true,
  "reservation_id": 123,
  "pre_auth": {
    "id": 1,
    "stripe_payment_id": "pi_xxx",
    "amount": 200000,
    "currency": "cop",
    "status": "requires_capture",
    "local_status": "requires_capture",
    "created_at": "2025-11-28T12:00:00.000Z",
    "metadata": {
      "pre_auth": true,
      "expires_at": "2025-12-05T12:00:00.000Z"
    }
  }
}
```

**Response (sin pre-auth):**
```json
{
  "success": true,
  "has_pre_auth": false,
  "reservation_id": 123
}
```

---

### GET /history/:reservation_id

Obtiene el historial de pagos de una reservacion.

**Autenticacion:** Requerida

**Response:**
```json
{
  "success": true,
  "reservation_id": 123,
  "payments": [
    {
      "id": 1,
      "stripe_payment_id": "pi_xxx",
      "amount": 200000,
      "currency": "cop",
      "status": "succeeded",
      "payment_type": "payment",
      "description": "Pago de estadia",
      "created_at": "2025-11-28T12:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

## Cobros y Reembolsos (DEV1-03)

### POST /charge

Realiza un cobro directo (captura inmediata).

**Autenticacion:** Requerida

**Request Body:**
```json
{
  "amount": 150000,
  "currency": "cop",
  "payment_method_id": "pm_xxx",
  "reservation_id": 123,
  "guest_id": 45,
  "description": "Pago de estadia completa",
  "receipt_email": "guest@email.com",
  "metadata": {}
}
```

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| amount | number | Si | Monto a cobrar |
| payment_method_id | string | Si | ID del metodo de pago |
| currency | string | No | Codigo de moneda (default: cop) |
| reservation_id | number | No | ID de reservacion |
| guest_id | number | No | ID de huesped |
| description | string | No | Descripcion del cobro |
| receipt_email | string | No | Email para enviar recibo |
| metadata | object | No | Metadata adicional |

**Response:**
```json
{
  "success": true,
  "paymentIntentId": "pi_xxx",
  "chargeId": "ch_xxx",
  "amount": 150000,
  "currency": "cop",
  "status": "succeeded",
  "requiresAction": false
}
```

**Response (requiere 3D Secure):**
```json
{
  "success": false,
  "paymentIntentId": "pi_xxx",
  "status": "requires_action",
  "requiresAction": true,
  "clientSecret": "pi_xxx_secret_xxx"
}
```

---

### POST /refund

Procesa un reembolso total o parcial.

**Autenticacion:** Requerida

**Request Body:**
```json
{
  "payment_intent_id": "pi_xxx",
  "amount": 50000,
  "reason": "requested_by_customer",
  "metadata": {}
}
```

| Campo | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| payment_intent_id | string | Si | ID del payment intent a reembolsar |
| amount | number | No | Monto a reembolsar (default: monto completo) |
| reason | string | No | Razon: duplicate, fraudulent, requested_by_customer |
| metadata | object | No | Metadata adicional |

**Response:**
```json
{
  "success": true,
  "refundId": "re_xxx",
  "paymentIntentId": "pi_xxx",
  "originalAmount": 150000,
  "refundedAmount": 50000,
  "currency": "cop",
  "status": "succeeded",
  "isFullRefund": false,
  "reason": "requested_by_customer"
}
```

**Errores:**
- `400` - Payment intent no existe o no puede ser reembolsado
- `400` - Monto de reembolso mayor al original

---

### GET /payment/:payment_intent_id

Obtiene detalles completos de un pago desde Stripe.

**Autenticacion:** Requerida

**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "pi_xxx",
    "amount": 150000,
    "currency": "cop",
    "status": "succeeded",
    "capture_method": "automatic",
    "description": "Almanik PMS - Charge",
    "metadata": {},
    "created": "2025-11-28T12:00:00.000Z",
    "charges": [{
      "id": "ch_xxx",
      "amount": 150000,
      "refunded": true,
      "amount_refunded": 50000,
      "refunds": [{
        "id": "re_xxx",
        "amount": 50000,
        "status": "succeeded",
        "reason": "requested_by_customer",
        "created": "2025-11-28T14:00:00.000Z"
      }]
    }]
  },
  "local_record": {
    "id": 1,
    "status": "partial_refund",
    "metadata": {}
  }
}

---

## Webhook

### POST /webhook

Recibe eventos de Stripe para actualizar estados de pago.

**Autenticacion:** Verificacion de firma Stripe (no session)

**Headers Requeridos:**
- `stripe-signature` - Firma del webhook

**Eventos Manejados:**
- `payment_intent.succeeded` - Pago exitoso
- `payment_intent.payment_failed` - Pago fallido
- `charge.refunded` - Reembolso procesado

---

## Integracion con Cashbox (DEV1-04)

Los pagos de Stripe se sincronizan automaticamente con la sesion de caja activa.

### Comportamiento Automatico

Cuando se procesa exitosamente alguna de estas operaciones:
- **POST /charge** (cobro directo exitoso)
- **POST /capture** (captura de pre-autorizacion)
- **POST /refund** (reembolso)

El sistema automaticamente:
1. Busca la sesion de caja activa
2. Crea una transaccion en cashbox_transactions
3. Usa el metodo de pago `stripe`
4. Asigna la categoria correspondiente

### Categorias de Cashbox

| Operacion | Tipo | Categoria |
|-----------|------|-----------|
| Cobro directo | income | stripe_payment |
| Captura pre-auth | income | stripe_preauth |
| Reembolso | expense | stripe_refund |

### Notas Importantes

- Si no hay sesion de caja activa, la sincronizacion se omite silenciosamente
- Los fallos en la sincronizacion NO afectan el pago (fail-safe)
- El monto se registra en la moneda original (COP)
- Se guarda referencia al payment_intent_id o refund_id

---

## Flujos de Uso

### Flujo 1: Pago Simple

```
1. Frontend: GET /config -> obtiene publishableKey
2. Frontend: Inicializa Stripe.js con publishableKey
3. Backend: POST /create-intent -> obtiene clientSecret
4. Frontend: stripe.confirmPayment(clientSecret)
5. Backend: POST /confirm -> verifica status
```

### Flujo 2: Pre-autorizacion (Check-in/Check-out)

```
CHECK-IN:
1. POST /pre-authorize {amount: 200000, reservation_id: 123}
2. Frontend completa autenticacion 3D Secure si necesario
3. Fondos quedan retenidos (status: requires_capture)

CHECK-OUT (opcion A - cobrar todo):
4. POST /capture {payment_intent_id: "pi_xxx"}
5. Fondos se cobran completamente

CHECK-OUT (opcion B - cobrar parcial):
4. POST /capture {payment_intent_id: "pi_xxx", amount_to_capture: 150000}
5. Se cobran 150000, se liberan 50000

CANCELACION:
4. POST /cancel-auth {payment_intent_id: "pi_xxx"}
5. Fondos se liberan completamente
```

---

## Base de Datos

### Tabla: payments

```sql
CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stripe_payment_id TEXT UNIQUE,
  reservation_id INTEGER,
  guest_id INTEGER,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'cop',
  status TEXT DEFAULT 'pending',
  payment_type TEXT DEFAULT 'payment',
  description TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reservation_id) REFERENCES bookings(id),
  FOREIGN KEY (guest_id) REFERENCES guests(id)
);
```

### Estados de Pago

| Status | Descripcion |
|--------|-------------|
| pending | Esperando confirmacion |
| processing | En proceso |
| requires_capture | Pre-autorizado, esperando captura |
| succeeded | Pago exitoso |
| failed | Pago fallido |
| cancelled | Cancelado |
| refunded | Reembolsado |

---

## Codigos de Error

| Codigo | Descripcion |
|--------|-------------|
| 400 | Bad Request - Parametros invalidos |
| 401 | Unauthorized - Sesion no valida |
| 409 | Conflict - Pre-auth duplicada |
| 500 | Server Error - Error de Stripe |
| 503 | Service Unavailable - Stripe no configurado |

---

## Testing

### Con Stripe Test Mode

Usar tarjetas de prueba de Stripe:
- `4242424242424242` - Pago exitoso
- `4000002500003155` - Requiere 3D Secure
- `4000000000009995` - Fondos insuficientes

### Verificar Configuracion

```bash
curl http://localhost:3000/api/payments/status \
  -H "session-id: YOUR_SESSION_ID"
```

---

## Changelog

### v1.3.0 (2025-11-28) - DEV1-04
- Integracion automatica con Cashbox
- Sincronizacion de cobros exitosos con sesion de caja activa
- Sincronizacion de capturas de pre-autorizacion
- Sincronizacion de reembolsos como egresos
- Nuevas categorias en cashbox: stripe_payment, stripe_preauth, stripe_refund
- Nuevo metodo de pago: stripe

### v1.2.0 (2025-11-28) - DEV1-03
- Agregado POST /charge (cobros directos)
- Agregado POST /refund (reembolsos totales/parciales)
- Agregado GET /payment/:payment_intent_id
- Mejorado GET /history/:reservation_id con totales
- Webhook mejorado con mas eventos
- Manejo de disputas (charge.dispute.created)

### v1.1.0 (2025-11-28) - DEV1-02
- Agregado POST /pre-authorize
- Agregado POST /capture
- Agregado POST /cancel-auth
- Agregado GET /pre-auth/:reservation_id
- Validacion de pre-auth duplicados
- Logging de actividad

### v1.0.0 (2025-11-28) - DEV1-01
- Configuracion inicial de Stripe
- GET /config
- POST /create-intent
- POST /confirm
- GET /history/:reservation_id
- GET /status
