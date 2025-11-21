
import { api } from "encore.dev/api";
import db from "../db";
import { createError, handleDatabaseError } from "../shared/errors";
import { logAndThrowError } from "../shared/logging";
import { validate, sanitize } from "../shared/validation";
import { logger, withPerformanceLogging } from "../shared/logging";

// ======== API Request and Response Structures ========

export interface CalendarRequest {
  // Start date of the calendar view window (ISO 8601 format: YYYY-MM-DD)
  startDate: string;
  // End date of the calendar view window (ISO 8601 format: YYYY-MM-DD)
  endDate: string;
}

interface CalendarReservation {
  id: string;
  confirmationCode: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  guest: {
    firstName: string;
    lastName: string;
  };
}

interface CalendarBed {
  id: string;
  number: string;
  reservations: CalendarReservation[];
}

export interface CalendarRoom {
  id: string;
  number: string;
  name: string;
  beds: CalendarBed[];
}

export type CalendarResponse = CalendarRoom[];

// ======== API Endpoint Definition ========

export const calendar = api<CalendarRequest, CalendarResponse>(
  { expose: true, method: "GET", path: "/reservations/calendar" },
  async (req) => {
    const startTime = Date.now();
    logger.apiRequest("/reservations/calendar", "GET", req);

    try {
      return await withPerformanceLogging("reservations-calendar", async () => {
        // 1. Validate and sanitize inputs
        validate.required(req.startDate, "startDate");
        validate.required(req.endDate, "endDate");
        validate.iso8601Date(req.startDate, "startDate");
        validate.iso8601Date(req.endDate, "endDate");

        if (new Date(req.startDate) >= new Date(req.endDate)) {
          throw createError.badRequest("startDate must be before endDate");
        }

        const sanitizedStartDate = sanitize.date(req.startDate);
        const sanitizedEndDate = sanitize.date(req.endDate);

        // 2. Fetch data from the database
        // This query fetches all rooms and their beds, and LEFT JOINs reservations
        // that overlap with the requested date range.
        let results: any[];
        try {
          results = await db.query`
            SELECT
              r.id as room_id,
              r.number as room_number,
              r.name as room_name,
              b.id as bed_id,
              b.number as bed_number,
              res.id as reservation_id,
              res.confirmation_code,
              res.check_in_date,
              res.check_out_date,
              res.status,
              g.first_name,
              g.last_name
            FROM rooms r
            JOIN beds b ON r.id = b.room_id
            LEFT JOIN reservations res ON b.id = res.bed_id
              AND res.status != 'cancelled'
              AND res.check_in_date < ${sanitizedEndDate}
              AND res.check_out_date > ${sanitizedStartDate}
            LEFT JOIN guests g ON res.guest_id = g.id
            WHERE r.is_active = true AND b.is_active = true
            ORDER BY r.number, b.number
          `;
        } catch (error: any) {
          handleDatabaseError(error, "fetching reservation calendar data");
          return []; // Should be handled by handleDatabaseError, but as a fallback
        }

        // 3. Process and structure the flat SQL result into a nested object
        const roomsMap = new Map<string, CalendarRoom>();

        for (const row of results) {
          // Ensure room exists in the map
          if (!roomsMap.has(row.room_id)) {
            roomsMap.set(row.room_id, {
              id: row.room_id,
              number: row.room_number,
              name: row.room_name,
              beds: [],
            });
          }

          const room = roomsMap.get(row.room_id)!;

          // Ensure bed exists in the room's bed list
          let bed = room.beds.find((b) => b.id === row.bed_id);
          if (!bed) {
            bed = {
              id: row.bed_id,
              number: row.bed_number,
              reservations: [],
            };
            room.beds.push(bed);
          }

          // If there is a reservation for this bed in the date range, add it
          if (row.reservation_id) {
            bed.reservations.push({
              id: row.reservation_id,
              confirmationCode: row.confirmation_code,
              checkInDate: row.check_in_date.toISOString().split('T')[0],
              checkOutDate: row.check_out_date.toISOString().split('T')[0],
              status: row.status,
              guest: {
                firstName: row.first_name,
                lastName: row.last_name,
              },
            });
          }
        }

        const response = Array.from(roomsMap.values());
        logger.info("Reservation calendar data fetched successfully", {
          rooms: response.length,
          startDate: sanitizedStartDate,
          endDate: sanitizedEndDate,
        });

        return response;
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.apiError("/reservations/calendar", "GET", error, { duration, ...req });
      logAndThrowError(error);
    }
  }
);
