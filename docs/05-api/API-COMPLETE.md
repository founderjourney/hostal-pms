# Almanik PMS - Complete API Documentation

**Version:** 1.0.0
**Last Updated:** 21 November 2025
**Base URL:** `https://your-domain.com/api`

## Table of Contents

1. [Authentication](#authentication)
2. [Analytics](#analytics)
3. [Reservations](#reservations)
4. [iCal Sync](#ical-sync)
5. [Guests](#guests)
6. [Beds](#beds)
7. [Bookings](#bookings)
8. [Transactions](#transactions)
9. [Tours](#tours)
10. [Users](#users)
11. [Monitoring](#monitoring)
12. [Error Handling](#error-handling)

---

## Authentication

All API endpoints (except public iCal exports and health check) require authentication using JWT tokens.

### Login

**Endpoint:** `POST /api/login`

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:** `200 OK`
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "username": "admin",
    "name": "Admin User",
    "role": "admin"
  }
}
```

**Headers for Authenticated Requests:**
```
Authorization: Bearer <jwt_token>
```

---

## Analytics

### Get Overview

**Endpoint:** `GET /api/analytics/overview`

**Query Parameters:**
- `start_date` (optional): Start date (YYYY-MM-DD), defaults to first day of current month
- `end_date` (optional): End date (YYYY-MM-DD), defaults to last day of current month

**Response:** `200 OK`
```json
{
  "date_range": {
    "start": "2025-11-01",
    "end": "2025-11-30"
  },
  "metrics": {
    "total_revenue": 15420.50,
    "total_bookings": 142,
    "occupancy_rate": 78.50,
    "avg_booking_value": 108.60,
    "total_commissions": 850.25,
    "total_beds": 20,
    "occupied_beds": 16
  }
}
```

### Get Revenue Analytics

**Endpoint:** `GET /api/analytics/revenue`

**Query Parameters:**
- `start_date` (optional)
- `end_date` (optional)

**Response:** `200 OK`
```json
{
  "date_range": {
    "start": "2025-11-01",
    "end": "2025-11-30"
  },
  "daily_revenue": [
    {
      "date": "2025-11-01",
      "revenue": 450.00,
      "charges": 520.00,
      "transactions": 8
    }
  ],
  "by_payment_method": [
    {
      "method": "cash",
      "total": 8500.00,
      "count": 45
    },
    {
      "method": "card",
      "total": 6920.50,
      "count": 38
    }
  ],
  "top_sources": [
    {
      "source": "booking_com",
      "bookings": 65,
      "revenue": 7800.00
    }
  ]
}
```

### Get Occupancy Analytics

**Endpoint:** `GET /api/analytics/occupancy`

**Query Parameters:**
- `start_date` (optional)
- `end_date` (optional)

**Response:** `200 OK`
```json
{
  "date_range": {
    "start": "2025-11-01",
    "end": "2025-11-30"
  },
  "total_beds": 20,
  "occupancy_by_day": [
    {
      "date": "2025-11-01",
      "occupied_beds": 16,
      "total_beds": 20,
      "occupancy_rate": 80.00
    }
  ],
  "occupancy_by_room": [
    {
      "room": "Dorm A",
      "total_beds": 8,
      "occupied_beds": 7,
      "occupancy_rate": 87.50
    }
  ]
}
```

### Get Bookings Analytics

**Endpoint:** `GET /api/analytics/bookings`

**Query Parameters:**
- `start_date` (optional)
- `end_date` (optional)

**Response:** `200 OK`
```json
{
  "date_range": {
    "start": "2025-11-01",
    "end": "2025-11-30"
  },
  "by_status": [
    {
      "status": "confirmed",
      "count": 85,
      "revenue": 9200.00
    }
  ],
  "by_source": [
    {
      "source": "booking_com",
      "count": 65,
      "avg_nights": 2.8,
      "revenue": 7800.00
    }
  ],
  "length_of_stay": {
    "avg_nights": 2.5,
    "min_nights": 1,
    "max_nights": 14
  },
  "daily_trend": [
    {
      "date": "2025-11-01",
      "bookings": 5,
      "revenue": 540.00
    }
  ]
}
```

### Get Commissions Analytics

**Endpoint:** `GET /api/analytics/commissions`

**Query Parameters:**
- `start_date` (optional)
- `end_date` (optional)

**Response:** `200 OK`
```json
{
  "date_range": {
    "start": "2025-11-01",
    "end": "2025-11-30"
  },
  "totals": {
    "total_sales": 45,
    "total_commissions": 850.25
  },
  "by_tour": [
    {
      "name": "City Tour",
      "provider": "Local Tours Co",
      "sales": 18,
      "commissions": 360.00
    }
  ],
  "performance": [
    {
      "name": "City Tour",
      "clicks": 120,
      "sales": 18,
      "conversion_rate": 15.00
    }
  ]
}
```

---

## Reservations

### List Reservations

**Endpoint:** `GET /api/reservations`

**Query Parameters:**
- `status` (optional): Filter by status
- `bed_id` (optional): Filter by bed
- `check_in_from` (optional): Filter check-in >= date
- `check_in_to` (optional): Filter check-in <= date

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "confirmation_code": "ALM-20251121-143025",
    "guest_id": 5,
    "guest_name": "John Doe",
    "bed_id": 3,
    "bed_name": "2-A",
    "check_in": "2025-11-22",
    "check_out": "2025-11-25",
    "nights": 3,
    "total": 75.00,
    "status": "confirmed",
    "source": "booking_com",
    "special_requests": "Early check-in",
    "created_at": "2025-11-21T14:30:25Z"
  }
]
```

### Create Reservation

**Endpoint:** `POST /api/reservations`

**Request Body:**
```json
{
  "guest_id": 5,
  "bed_id": 3,
  "check_in": "2025-11-22",
  "check_out": "2025-11-25",
  "source": "booking_com",
  "special_requests": "Early check-in"
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "confirmation_code": "ALM-20251121-143025",
  "guest_id": 5,
  "bed_id": 3,
  "check_in": "2025-11-22",
  "check_out": "2025-11-25",
  "nights": 3,
  "total": 75.00,
  "status": "pending",
  "source": "booking_com",
  "created_at": "2025-11-21T14:30:25Z"
}
```

### Get Reservation

**Endpoint:** `GET /api/reservations/:id`

**Response:** `200 OK`
```json
{
  "id": 1,
  "confirmation_code": "ALM-20251121-143025",
  "guest_id": 5,
  "guest_name": "John Doe",
  "guest_email": "john@example.com",
  "bed_id": 3,
  "bed_name": "2-A",
  "bed_price": 25.00,
  "check_in": "2025-11-22",
  "check_out": "2025-11-25",
  "nights": 3,
  "total": 75.00,
  "status": "confirmed",
  "source": "booking_com",
  "special_requests": "Early check-in",
  "created_at": "2025-11-21T14:30:25Z"
}
```

### Update Reservation

**Endpoint:** `PUT /api/reservations/:id`

**Request Body:**
```json
{
  "check_in": "2025-11-23",
  "check_out": "2025-11-26",
  "status": "confirmed"
}
```

**Response:** `200 OK`

### Confirm Reservation

**Endpoint:** `POST /api/reservations/:id/confirm`

**Response:** `200 OK`
```json
{
  "id": 1,
  "confirmation_code": "ALM-20251121-143025",
  "status": "confirmed",
  "transaction_id": 45
}
```

### Cancel Reservation

**Endpoint:** `DELETE /api/reservations/:id`

**Response:** `200 OK`
```json
{
  "message": "Reservation cancelled successfully"
}
```

### Check Availability

**Endpoint:** `GET /api/reservations/availability/check`

**Query Parameters:**
- `bed_id`: Bed ID (required)
- `check_in`: Check-in date (required)
- `check_out`: Check-out date (required)
- `exclude_booking_id` (optional): Exclude booking from check

**Response:** `200 OK`
```json
{
  "available": true,
  "bed_id": 3,
  "check_in": "2025-11-22",
  "check_out": "2025-11-25",
  "conflicting_bookings": []
}
```

---

## iCal Sync

### Export iCal for Room

**Endpoint:** `GET /api/ical/rooms/:room_id.ics`

**Public Endpoint** (no authentication required)

**Response:** `200 OK` (Content-Type: text/calendar)
```ics
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Almanik PMS//iCal Export//EN
...
END:VCALENDAR
```

### Export iCal for Bed

**Endpoint:** `GET /api/ical/beds/:bed_id.ics`

**Public Endpoint** (no authentication required)

**Response:** `200 OK` (Content-Type: text/calendar)

### List Import Sources

**Endpoint:** `GET /api/ical/sources`

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "name": "Booking.com - Room 101",
    "ical_url": "https://booking.com/ical/...",
    "bed_id": 3,
    "source_type": "booking_com",
    "is_active": true,
    "last_sync": "2025-11-21T10:30:00Z",
    "created_at": "2025-11-15T08:00:00Z"
  }
]
```

### Create Import Source

**Endpoint:** `POST /api/ical/sources`

**Request Body:**
```json
{
  "name": "Booking.com - Room 101",
  "ical_url": "https://booking.com/ical/...",
  "bed_id": 3,
  "source_type": "booking_com"
}
```

**Response:** `201 Created`

### Update Import Source

**Endpoint:** `PUT /api/ical/sources/:id`

**Request Body:**
```json
{
  "name": "Updated Name",
  "is_active": false
}
```

**Response:** `200 OK`

### Delete Import Source

**Endpoint:** `DELETE /api/ical/sources/:id`

**Response:** `200 OK`

### Sync Import Source

**Endpoint:** `POST /api/ical/sources/:id/sync`

**Response:** `200 OK`
```json
{
  "message": "Sync completed successfully",
  "imported": 5,
  "updated": 2,
  "errors": 0
}
```

### Sync All Sources

**Endpoint:** `POST /api/ical/sync-all`

**Response:** `200 OK`
```json
{
  "message": "All sources synced",
  "total_sources": 3,
  "successful": 3,
  "failed": 0
}
```

---

## Monitoring

### Health Check

**Endpoint:** `GET /health`

**Public Endpoint** (no authentication required)

**Response:** `200 OK` (healthy) or `503 Service Unavailable` (unhealthy)
```json
{
  "status": "healthy",
  "timestamp": "2025-11-21T14:30:25Z",
  "database": "connected",
  "memory": {
    "used": 45.6,
    "total": 100.0,
    "percentage": 45.6
  }
}
```

### Performance Metrics

**Endpoint:** `GET /api/metrics/performance`

**Response:** `200 OK`
```json
{
  "requests": {
    "total": 1543,
    "last_1000": [...]
  },
  "avg_response_time_ms": 45.2,
  "slow_requests": 8
}
```

### Query Performance Metrics

**Endpoint:** `GET /api/metrics/queries`

**Response:** `200 OK`
```json
{
  "statistics": {
    "total_queries": 5420,
    "slow_queries": 12,
    "very_slow_queries": 2,
    "avg_duration_ms": 15.3,
    "max_duration_ms": 548,
    "min_duration_ms": 1,
    "slow_query_percentage": 0.22,
    "very_slow_query_percentage": 0.04
  },
  "thresholds": {
    "slow_query_ms": 100,
    "very_slow_query_ms": 500
  },
  "recent_slow_queries": [
    {
      "method": "query",
      "sql": "SELECT * FROM bookings WHERE...",
      "params": 3,
      "duration": 548,
      "timestamp": "2025-11-21T14:25:30Z",
      "error": null,
      "rowCount": 142
    }
  ],
  "recommendations": [
    {
      "severity": "high",
      "message": "Table 'bookings' appears in 3 slow queries",
      "action": "Add indexes to bookings table on frequently queried columns"
    }
  ]
}
```

---

## Error Handling

### Error Response Format

All errors follow this format:

```json
{
  "error": "Error message here"
}
```

### HTTP Status Codes

- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., bed already booked)
- `500 Internal Server Error` - Server error

### Common Error Examples

**Authentication Error:**
```json
{
  "error": "Invalid credentials"
}
```

**Validation Error:**
```json
{
  "error": "Check-out date must be after check-in date"
}
```

**Conflict Error:**
```json
{
  "error": "Bed not available for selected dates"
}
```

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General API:** 100 requests per 15 minutes
- **Authentication:** 5 attempts per 15 minutes
- **Write Operations:** 30 requests per minute

When rate limit is exceeded, the API returns:

```json
{
  "error": "Too many requests, please try again later"
}
```

---

## Pagination

Endpoints that return lists support pagination:

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 50, max: 100)

**Response Headers:**
```
X-Total-Count: 142
X-Page: 1
X-Per-Page: 50
X-Total-Pages: 3
```

---

## Best Practices

1. **Always use HTTPS** in production
2. **Store JWT tokens securely** (httpOnly cookies or secure storage)
3. **Implement exponential backoff** for retries
4. **Cache responses** when appropriate
5. **Validate input** on client-side before API calls
6. **Handle errors gracefully** with user-friendly messages
7. **Use date ranges wisely** in analytics to avoid large datasets
8. **Monitor rate limits** and implement client-side throttling

---

## Support

For API support or questions:
- Email: support@almanik-pms.com
- Documentation: https://docs.almanik-pms.com
- GitHub Issues: https://github.com/almanik/pms/issues

---

**Last Updated:** 21 November 2025
**API Version:** 1.0.0
