import { api } from "encore.dev/api";
import db from "../db";
import { createError, handleDatabaseError } from "../shared/errors";
import { logAndThrowError } from "../shared/logging";
import { validate } from "../shared/validation";
import { logger, withPerformanceLogging } from "../shared/logging";

export interface CheckInRequest {
  reservationId: string;
  bedId?: string;
}

export interface CheckInResponse {
  success: boolean;
  folioId: string;
}

// Processes check-in for a reservation
export const checkIn = api<CheckInRequest, CheckInResponse>(
  { expose: true, method: "POST", path: "/reservations/:reservationId/check-in" },
  async (req) => {
    const startTime = Date.now();
    logger.apiRequest("/reservations/:reservationId/check-in", "POST", { reservationId: req.reservationId });

    try {
      return await withPerformanceLogging("check-in", async () => {
        // Validate input
        validate.uuid(req.reservationId, "reservationId");
        if (req.bedId) {
          validate.uuid(req.bedId, "bedId");
        }

        let tx: any;
        try {
          tx = await db.begin();

          // Get reservation details
          const reservation = await tx.queryRow`
            SELECT * FROM reservations WHERE id = ${req.reservationId}
          `;

          if (!reservation) {
            throw createError.notFound("Reservation", req.reservationId);
          }

          if (reservation.status !== 'confirmed') {
            throw createError.operationNotAllowed(
              "Check-in",
              `reservation status is '${reservation.status}', expected 'confirmed'`
            );
          }

          // Business rule: check-in should be on or after check-in date
          const today = new Date();
          const checkInDate = new Date(reservation.check_in_date);
          if (today < checkInDate) {
            const daysDiff = Math.ceil((checkInDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
            throw createError.businessRuleViolation(`check-in is ${daysDiff} days early`);
          }

          let bedId = reservation.bed_id || req.bedId;

          // If no bed assigned, find available bed in the room
          if (!bedId) {
            const availableBed = await tx.queryRow`
              SELECT id FROM beds 
              WHERE room_id = ${reservation.room_id} AND status = 'clean' AND is_active = true
              ORDER BY number
              LIMIT 1
            `;

            if (!availableBed) {
              throw createError.preconditionFailed("No available beds in the room");
            }

            bedId = availableBed.id;
          } else {
            // Verify specified bed is available
            const bed = await tx.queryRow`
              SELECT id, status FROM beds 
              WHERE id = ${bedId} AND room_id = ${reservation.room_id} AND is_active = true
            `;

            if (!bed) {
              throw createError.notFound("Bed", bedId);
            }

            if (bed.status !== 'clean') {
              throw createError.operationNotAllowed(
                "Check-in to bed",
                `bed status is '${bed.status}', expected 'clean'`
              );
            }
          }

          // Update reservation status and assign bed
          await tx.exec`
            UPDATE reservations 
            SET status = 'checked_in', bed_id = ${bedId}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ${req.reservationId}
          `;

          // Mark bed as occupied
          await tx.exec`
            UPDATE beds 
            SET status = 'occupied', updated_at = CURRENT_TIMESTAMP
            WHERE id = ${bedId}
          `;

          // Create folio
          const folio = await tx.queryRow`
            INSERT INTO folios (reservation_id, guest_id, total_charges, balance)
            VALUES (${req.reservationId}, ${reservation.guest_id}, ${reservation.total_amount}, ${reservation.total_amount})
            RETURNING id
          `;

          if (!folio) {
            throw createError.internal("Failed to create folio");
          }

          // Add accommodation charge to folio
          await tx.exec`
            INSERT INTO folio_items (folio_id, item_type, description, amount, quantity)
            VALUES (${folio.id}, 'accommodation', 'Room charge', ${reservation.total_amount}, 1)
          `;

          // Update guest total stays
          await tx.exec`
            UPDATE guests 
            SET total_stays = total_stays + 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = ${reservation.guest_id}
          `;

          await tx.commit();

          logger.businessLogic("Guest checked in", {
            reservationId: req.reservationId,
            bedId,
            guestId: reservation.guest_id,
            folioId: folio.id,
            totalAmount: reservation.total_amount
          });

          return {
            success: true,
            folioId: folio.id,
          };
        } catch (error: any) {
          if (tx) {
            try {
              await tx.rollback();
            } catch (rollbackError) {
              logger.error("Transaction rollback failed", { reservationId: req.reservationId }, rollbackError as Error);
            }
          }
          if (error.code && error.statusCode) throw error;
          handleDatabaseError(error, "processing check-in");
        }
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.apiError("/reservations/:reservationId/check-in", "POST", error, { duration, reservationId: req.reservationId });
      logAndThrowError(error);
    }
  }
);
