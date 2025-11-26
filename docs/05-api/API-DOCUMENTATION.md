# Almanik PMS - API Documentation

## Overview
This API powers the Almanik PMS system. It is a RESTful API built with Express.js.
Base URL: `/api`

## Authentication
All endpoints (except `/login` and `/health`) require authentication via the `Session-Id` header.

### Login
`POST /api/login`
- **Body**: `{ "username": "admin", "password": "..." }`
- **Response**: `{ "success": true, "sessionId": "...", "user": { ... } }`

### Logout
`POST /api/logout`
- **Body**: `{ "sessionId": "..." }`
- **Response**: `{ "success": true }`

## Guests
### List Guests
`GET /api/guests`
- **Query**: `?search=name_or_doc`
- **Response**: `[ { "id": 1, "name": "Juan Perez", ... }, ... ]`

### Create Guest
`POST /api/guests`
- **Body**: `{ "name": "Juan", "document": "123", "email": "...", "phone": "..." }`

### Get Guest
`GET /api/guests/:id`

### Update Guest
`PUT /api/guests/:id`

## Beds & Rooms
### List Beds
`GET /api/beds`
- **Response**: `[ { "id": 1, "name": "1-1", "status": "clean", "room": "Hab 1" }, ... ]`

### Get Bed
`GET /api/beds/:id`

### Update Bed Status
`PUT /api/beds/:id`
- **Body**: `{ "status": "dirty" }` (clean, dirty, occupied, maintenance)

## Bookings
### List Bookings
`GET /api/reservations`
- **Query**: `?status=confirmed&date_from=2023-01-01`
- **Response**: `[ { "id": 1, "guest_name": "...", "check_in": "...", "status": "confirmed" }, ... ]`

### Create Booking
`POST /api/reservations`
- **Body**: 
  ```json
  {
    "guest_id": 1,
    "bed_id": 5,
    "check_in": "2023-12-01",
    "check_out": "2023-12-05",
    "source": "walkin"
  }
  ```

### Confirm Booking
`POST /api/reservations/:id/confirm`

### Check In
`PUT /api/reservations/:id`
- **Body**: `{ "status": "checked_in" }`

### Check Out
`PUT /api/reservations/:id`
- **Body**: `{ "status": "checked_out" }`

### Cancel Booking
`DELETE /api/reservations/:id`

## Transactions (Finance)
### Add Transaction
`POST /api/transactions`
- **Body**: `{ "booking_id": 1, "type": "payment", "amount": 50.00, "description": "Deposit" }`

### Get Booking Transactions
`GET /api/reservations/:id/transactions`

## Analytics
### Overview Stats
`GET /api/analytics/overview`
- **Query**: `?start_date=...&end_date=...`
- **Response**: `{ "metrics": { "total_revenue": 1000, "occupancy_rate": 75, ... } }`

### Revenue Report
`GET /api/analytics/revenue`
- **Response**: `{ "daily_revenue": [...], "by_payment_method": [...] }`

### Occupancy Report
`GET /api/analytics/occupancy`
- **Response**: `{ "occupancy_by_day": [...] }`

### Bookings Report
`GET /api/analytics/bookings`

### Commissions Report
`GET /api/analytics/commissions`

## iCal Sync (OTA)
### List Sources
`GET /api/ical/sources`

### Add Source
`POST /api/ical/sources`
- **Body**: `{ "name": "Booking.com", "ical_url": "...", "bed_id": 1 }`

### Sync Source
`POST /api/ical/sources/:id/sync`

### Export Calendar
`GET /api/ical/beds/:id.ics` (Public)
