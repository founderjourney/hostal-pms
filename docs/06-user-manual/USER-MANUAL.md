# Almanik PMS - User Manual

## Introduction
Welcome to Almanik PMS, the property management system designed for hostels and small hotels. This manual guides you through the daily operations.

## Getting Started

### Login
1. Access the system at `http://localhost:3000` (or your server URL).
2. Enter your username and password.
   - Default Admin: `admin` / (See administrator)
   - Default Reception: `recepcion` / (See administrator)

### Dashboard Overview
The main dashboard shows:
- **Today's Check-ins**: Guests arriving today.
- **Today's Check-outs**: Guests departing today.
- **Occupancy**: Current percentage of occupied beds.
- **Quick Actions**: Buttons for new reservation, check-in, etc.

## Daily Operations

### Creating a Reservation
1. Click **"New Reservation"** on the dashboard or Reservations page.
2. Select an existing **Guest** or create a new one.
3. Select a **Bed** (the system shows available beds).
4. Choose **Check-in** and **Check-out** dates.
5. Select the **Source** (Walk-in, Booking.com, etc.).
6. Click **Create**. The reservation starts as "Pending".

### Check-in Process
1. Locate the reservation (Status: Confirmed or Pending).
2. Click **"Check In"**.
3. Verify guest details (ID document, phone).
4. Collect payment if required.
5. The status changes to "Checked In" and the bed is marked "Occupied".

### Check-out Process
1. Locate the reservation (Status: Checked In).
2. Click **"Check Out"**.
3. Review outstanding balance.
4. Process payment if balance > 0.
5. Click **Confirm Check-out**.
6. The bed status changes to "Dirty" (needs cleaning).

### Managing Beds (Housekeeping)
1. Go to **Beds** view.
2. Filter by status "Dirty".
3. After cleaning a bed, click the status icon to change it to "Clean".
4. Only "Clean" beds can be assigned to new guests.

## Reports & Analytics
Access the **Analytics** section to view:
- **Revenue**: Daily income and payment methods.
- **Occupancy**: Bed usage over time.
- **Bookings**: Trend of new reservations.
- **Export**: Download reports as CSV for Excel.

## Troubleshooting
- **Forgot Password**: Contact the system administrator.
- **System Slow**: Check your internet connection.
- **Sync Error**: If iCal sync fails, check the "iCal Sync" page for error messages.

## Support
For technical support, contact the IT department or system provider.
