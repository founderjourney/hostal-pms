import { api } from "encore.dev/api";
import db from "../db";
import { createError, handleDatabaseError } from "../shared/errors";
import { logAndThrowError } from "../shared/logging";
import { validate } from "../shared/validation";
import { logger, withPerformanceLogging } from "../shared/logging";

export interface CheckOutRequest {
  reservationId: string;
}

export interface CheckOutResponse {
  success: boolean;
  finalBalance: number;
}

// Processes check-out for a reservation
export const checkOut = api<CheckOutRequest, CheckOutResponse>(
  { expose: true, method: "POST", path: "/reservations/:reservationId/check-out" },
  async (req) => {
    const startTime = Date.now();
    logger.apiRequest("/reservations/:reservationId/check-out", "POST", { reservationId: req.reservationId });

    try {
      return await withPerformanceLogging("check-out", async () => {
        // Validate input
        validate.uuid(req.reservationId, "reservationId");

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

          if (reservation.status !== 'checked_in') {
            throw createError.operationNotAllowed(
              "Check-out",
              `reservation status is '${reservation.status}', expected 'checked_in'`
            );
          }

          // Get folio before closing
          const folio = await tx.queryRow`
            SELECT id, balance FROM folios WHERE reservation_id = ${req.reservationId}
          `;

          if (!folio) {
            throw createError.internal("Folio not found for reservation");
          }

          // Business rule: cannot check out with outstanding balance (unless explicitly allowed)
          if (folio.balance > 0) {
            logger.warn("Check-out with outstanding balance", {
              reservationId: req.reservationId,
              outstandingBalance: folio.balance
            });
            // Note: In production, you might want to throw an error here
            // throw createError.businessRuleViolation(`outstanding balance of ${folio.balance} must be settled before check-out`);
          }

          // Update reservation status
          await tx.exec`
            UPDATE reservations 
            SET status = 'checked_out', updated_at = CURRENT_TIMESTAMP
            WHERE id = ${req.reservationId}
          `;

          // Mark bed as dirty
          if (reservation.bed_id) {
            await tx.exec`
              UPDATE beds 
              SET status = 'dirty', updated_at = CURRENT_TIMESTAMP
              WHERE id = ${reservation.bed_id}
            `;
          }

          // Close folio
          const closedFolio = await tx.queryRow`
            UPDATE folios 
            SET status = 'closed', updated_at = CURRENT_TIMESTAMP
            WHERE reservation_id = ${req.reservationId}
            RETURNING balance
          `;

          await tx.commit();

          logger.businessLogic("Guest checked out", {
            reservationId: req.reservationId,
            bedId: reservation.bed_id,
            guestId: reservation.guest_id,
            finalBalance: closedFolio?.balance || 0
          });

          return {
            success: true,
            finalBalance: closedFolio?.balance || 0,
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
          handleDatabaseError(error, "processing check-out");
        }
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.apiError("/reservations/:reservationId/check-out", "POST", error, { duration, reservationId: req.reservationId });
      logAndThrowError(error);
    }
  }
);
