import { api } from "encore.dev/api";
import db from "../db";
import type { Reservation } from "./create";
import { createError, handleDatabaseError } from "../shared/errors";
import { logAndThrowError } from "../shared/logging";
import { validate, sanitize } from "../shared/validation";
import { logger, withPerformanceLogging } from "../shared/logging";

export interface FindByConfirmationRequest {
  confirmationCode: string;
}

export interface ReservationWithGuest extends Reservation {
  guest: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  room: {
    number: string;
    name: string;
  };
}

// Finds a reservation by confirmation code
export const findByConfirmation = api<FindByConfirmationRequest, ReservationWithGuest>(
  { expose: true, method: "GET", path: "/reservations/confirmation/:confirmationCode" },
  async (req) => {
    const startTime = Date.now();
    logger.apiRequest("/reservations/confirmation/:confirmationCode", "GET", { confirmationCode: req.confirmationCode });

    try {
      return await withPerformanceLogging("find-by-confirmation", async () => {
        // Validate and sanitize input
        validate.required(req.confirmationCode, "confirmationCode");
        validate.stringLength(req.confirmationCode, 3, 20, "confirmationCode");
        
        const sanitizedCode = sanitize.confirmationCode(req.confirmationCode);

        // Find reservation
        let result: any;
        try {
          result = await db.queryRow`
            SELECT r.*, g.first_name, g.last_name, g.email, g.phone,
                   rm.number as room_number, rm.name as room_name
            FROM reservations r
            JOIN guests g ON r.guest_id = g.id
            JOIN rooms rm ON r.room_id = rm.id
            WHERE r.confirmation_code = ${sanitizedCode}
          `;
        } catch (error: any) {
          handleDatabaseError(error, "finding reservation by confirmation code");
        }

        if (!result) {
          logger.warn("Reservation lookup failed", { confirmationCode: sanitizedCode });
          throw createError.notFound("Reservation with confirmation code", sanitizedCode);
        }

        const reservationData = {
          id: result.id,
          confirmationCode: result.confirmation_code,
          guestId: result.guest_id,
          roomId: result.room_id,
          bedId: result.bed_id,
          checkInDate: result.check_in_date,
          checkOutDate: result.check_out_date,
          guestsCount: result.guests_count,
          totalAmount: result.total_amount,
          status: result.status,
          source: result.source,
          specialRequests: result.special_requests,
          notes: result.notes,
          createdAt: result.created_at,
          guest: {
            firstName: result.first_name,
            lastName: result.last_name,
            email: result.email,
            phone: result.phone,
          },
          room: {
            number: result.room_number,
            name: result.room_name,
          },
        };

        logger.info("Reservation found by confirmation code", {
          confirmationCode: sanitizedCode,
          reservationId: result.id,
          status: result.status
        });

        return reservationData;
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.apiError("/reservations/confirmation/:confirmationCode", "GET", error, { duration, confirmationCode: req.confirmationCode });
      logAndThrowError(error);
    }
  }
);
