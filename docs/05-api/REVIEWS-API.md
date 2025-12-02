# Reviews API Documentation

**Modulo:** `server/modules/reviews.js`
**Base URL:** `/api/reviews`
**Version:** 1.0.0
**Desarrollador:** DEV4
**Fecha:** 2025-11-28

---

## Resumen

Sistema de reviews/feedback de huespedes post-checkout. Permite recolectar, gestionar y publicar opiniones de los huespedes.

---

## Endpoints

### Endpoints Publicos (Sin autenticacion)

#### GET /public
Obtiene reviews publicos para mostrar en widgets.

**Query Parameters:**
| Param | Tipo | Default | Descripcion |
|-------|------|---------|-------------|
| limit | number | 10 | Cantidad de reviews |
| offset | number | 0 | Desplazamiento para paginacion |

**Response:**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": 1,
        "rating": 5,
        "comment": "Excelente estadia!",
        "category_ratings": {"cleanliness": 5, "staff": 5},
        "staff_response": "Gracias por tu review!",
        "responded_at": "2025-11-28T10:00:00Z",
        "created_at": "2025-11-27T15:00:00Z",
        "guest_name": "Juan P."
      }
    ],
    "stats": {
      "total": 25,
      "average": 4.5
    }
  }
}
```

---

#### GET /token/:token
Valida un token de review y obtiene info de la reserva.

**Response Exitosa:**
```json
{
  "success": true,
  "data": {
    "guest_name": "Juan Perez",
    "check_in": "2025-11-20",
    "check_out": "2025-11-25",
    "bed_name": "Cama 3-A",
    "booking_id": 123,
    "categories": [
      {"key": "cleanliness", "label": "Limpieza"},
      {"key": "location", "label": "Ubicacion"},
      {"key": "staff", "label": "Personal"},
      {"key": "value", "label": "Relacion Calidad/Precio"},
      {"key": "facilities", "label": "Instalaciones"},
      {"key": "atmosphere", "label": "Ambiente"}
    ]
  }
}
```

**Response Token Ya Usado:**
```json
{
  "success": false,
  "error": "Ya has dejado tu review. Gracias!",
  "already_completed": true
}
```

---

#### POST /
Envia un nuevo review (requiere token valido).

**Request Body:**
```json
{
  "token": "abc123...",
  "rating": 5,
  "comment": "Excelente estadia, muy limpio y el personal muy amable",
  "category_ratings": {
    "cleanliness": 5,
    "location": 4,
    "staff": 5,
    "value": 4,
    "facilities": 4,
    "atmosphere": 5
  },
  "language": "es"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Gracias por tu review!",
  "data": {"id": 42}
}
```

---

### Endpoints Autenticados (Admin/Staff)

#### GET /
Lista todos los reviews con filtros.

**Query Parameters:**
| Param | Tipo | Valores | Descripcion |
|-------|------|---------|-------------|
| rating | number | 1-5 | Filtrar por rating especifico |
| is_public | boolean | true/false | Filtrar por visibilidad |
| responded | boolean | true/false | Filtrar por estado de respuesta |
| sort | string | newest/oldest | Ordenamiento |
| limit | number | 50 | Cantidad por pagina |
| offset | number | 0 | Desplazamiento |

**Response:**
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": 1,
        "guest_id": 10,
        "booking_id": 123,
        "rating": 5,
        "comment": "Muy bueno",
        "category_ratings": {...},
        "staff_response": null,
        "is_public": true,
        "created_at": "2025-11-28T10:00:00Z",
        "guest_name": "Juan Perez",
        "guest_email": "juan@email.com",
        "check_in": "2025-11-20",
        "check_out": "2025-11-25",
        "bed_name": "Cama 3-A"
      }
    ],
    "pagination": {
      "total": 100,
      "limit": 50,
      "offset": 0
    }
  }
}
```

---

#### GET /stats
Obtiene estadisticas de reviews.

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 100,
    "average_rating": 4.35,
    "distribution": {
      "5": 45,
      "4": 30,
      "3": 15,
      "2": 7,
      "1": 3
    },
    "response_rate": {
      "responded": 80,
      "pending": 20
    },
    "category_averages": {
      "cleanliness": "4.50",
      "location": "4.80",
      "staff": "4.60",
      "value": "4.20",
      "facilities": "4.10",
      "atmosphere": "4.40"
    },
    "trend": {
      "reviews_last_30": 15,
      "reviews_prev_30": 12,
      "avg_last_30": "4.50",
      "avg_prev_30": "4.30"
    }
  }
}
```

---

#### GET /:id
Obtiene detalle de un review especifico.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "guest_id": 10,
    "booking_id": 123,
    "rating": 5,
    "comment": "Excelente estadia",
    "category_ratings": {...},
    "staff_response": "Gracias!",
    "responded_by": 1,
    "responded_at": "2025-11-28T12:00:00Z",
    "is_public": true,
    "is_verified": true,
    "language": "es",
    "created_at": "2025-11-27T10:00:00Z",
    "guest_name": "Juan Perez",
    "guest_email": "juan@email.com",
    "guest_phone": "+57300123456",
    "check_in": "2025-11-20",
    "check_out": "2025-11-25",
    "booking_total": 150000,
    "nights": 5,
    "bed_name": "Cama 3-A",
    "responded_by_name": "Admin"
  }
}
```

---

#### POST /:id/respond
Agrega respuesta del staff a un review.

**Request Body:**
```json
{
  "response": "Gracias por tu feedback! Nos alegra que hayas disfrutado tu estadia."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Respuesta guardada",
  "data": {
    "id": 1,
    "response": "Gracias por tu feedback!..."
  }
}
```

---

#### PUT /:id/visibility
Cambia la visibilidad de un review (publico/privado).

**Request Body:**
```json
{
  "is_public": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Review ahora es privado",
  "data": {
    "id": 1,
    "is_public": false
  }
}
```

---

#### POST /request/:bookingId
Crea solicitud de review para una reserva (genera token).

**Response:**
```json
{
  "success": true,
  "message": "Solicitud de review creada",
  "data": {
    "id": 5,
    "token": "abc123def456...",
    "review_url": "/review.html?token=abc123def456...",
    "guest_name": "Juan Perez",
    "guest_email": "juan@email.com"
  }
}
```

---

## Categorias de Rating

| Key | Label (ES) |
|-----|------------|
| cleanliness | Limpieza |
| location | Ubicacion |
| staff | Personal |
| value | Relacion Calidad/Precio |
| facilities | Instalaciones |
| atmosphere | Ambiente |

---

## Tablas de Base de Datos

### guest_reviews
```sql
CREATE TABLE guest_reviews (
  id SERIAL PRIMARY KEY,
  guest_id INTEGER REFERENCES guests(id),
  booking_id INTEGER REFERENCES bookings(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  category_ratings JSONB,
  review_token VARCHAR(64) UNIQUE,
  token_expires_at TIMESTAMP,
  staff_response TEXT,
  responded_by INTEGER,
  responded_at TIMESTAMP,
  is_public BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  language VARCHAR(10) DEFAULT 'es',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### review_requests
```sql
CREATE TABLE review_requests (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id),
  review_token VARCHAR(64) NOT NULL,
  sent_via VARCHAR(20) DEFAULT 'email',
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  opened_at TIMESTAMP,
  completed_at TIMESTAMP,
  reminder_sent_at TIMESTAMP
);
```

---

## Archivos Relacionados

| Archivo | Descripcion |
|---------|-------------|
| `server/modules/reviews.js` | Modulo backend con endpoints |
| `public/review.html` | Landing page publica para dejar review |
| `public/reviews-dashboard.html` | Dashboard admin de reviews |
| `public/js/reviews-dashboard.js` | Logica del dashboard |

---

## Flujo de Uso

1. Huesped hace checkout
2. Staff solicita review: `POST /request/:bookingId`
3. Sistema envia email con link (pendiente integracion SendGrid)
4. Huesped abre link: `GET /token/:token`
5. Huesped envia review: `POST /`
6. Staff ve reviews en dashboard
7. Staff responde si necesario: `POST /:id/respond`
8. Staff puede ocultar si es inapropiado: `PUT /:id/visibility`

---

**Documentacion creada:** 2025-11-28
**Desarrollador:** DEV4
