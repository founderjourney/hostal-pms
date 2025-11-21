import { api } from "encore.dev/api";
import db from "../db";
import { createError, handleDatabaseError } from "../shared/errors";
import { logAndThrowError } from "../shared/logging";
import { validateReservationData, validate } from "../shared/validation";
import { logger, withPerformanceLogging } from "../shared/logging";

export interface CreateReservationRequest {
  guestId: string;
  roomId: string;
  bedId?: string;
  checkInDate: Date;
  checkOutDate: Date;
  guestsCount: number;
  totalAmount: number;
  source?: string;
  specialRequests?: string;
  notes?: string;
}

export interface Reservation {
  id: string;
  confirmationCode: string;
  guestId: string;
  roomId: string;
  bedId?: string;
  checkInDate: Date;
  checkOutDate: Date;
  guestsCount: number;
  totalAmount: number;
  status: string;
  source?: string;
  specialRequests?: string;
  notes?: string;
  createdAt: Date;
}

// Creates a new reservation
export const create = api<CreateReservationRequest, Reservation>(
  { expose: true, method: "POST", path: "/reservations" },
  async (req) => {
    const startTime = Date.now();
    logger.apiRequest("/reservations", "POST", { guestId: req.guestId, roomId: req.roomId });

    try {
      return await withPerformanceLogging("create-reservation", async () => {
        // Validate input
        validate.uuid(req.guestId, "guestId");
        validate.uuid(req.roomId, "roomId");
        if (req.bedId) {
          validate.uuid(req.bedId, "bedId");
        }
        validateReservationData(req);
        
        if (req.source) {
          validate.stringLength(req.source, 1, 50, "source");
        }
        if (req.specialRequests) {
          validate.stringLength(req.specialRequests, 1, 500, "specialRequests");
        }
        if (req.notes) {
          validate.stringLength(req.notes, 1, 1000, "notes");
        }

        // Verify guest exists
        let guest: any;
        try {
          guest = await db.queryRow`SELECT id FROM guests WHERE id = ${req.guestId}`;
        } catch (error: any) {
          handleDatabaseError(error, "checking guest existence");
        }
        
        if (!guest) {
          throw createError.notFound("Guest", req.guestId);
        }

        // Verify room exists
        let room: any;
        try {
          room = await db.queryRow`SELECT id, is_active FROM rooms WHERE id = ${req.roomId}`;
        } catch (error: any) {
          handleDatabaseError(error, "checking room existence");
        }
        
        if (!room) {
          throw createError.notFound("Room", req.roomId);
        }
        
        if (!room.is_active) {
          throw createError.operationNotAllowed("Creating reservation", "room is not active");
        }

        // If bed specified, verify it exists and is available
        if (req.bedId) {
          let bed: any;
          try {
            bed = await db.queryRow`
              SELECT id, status FROM beds 
              WHERE id = ${req.bedId} AND room_id = ${req.roomId} AND is_active = true
            `;
          } catch (error: any) {
            handleDatabaseError(error, "checking bed availability");
          }
          
          if (!bed) {
            throw createError.notFound("Bed", req.bedId);
          }
          
          if (bed.status === 'occupied') {
            throw createError.conflict("Bed is already occupied");
          }
          
          if (bed.status === 'out_of_order' || bed.status === 'maintenance') {
            throw createError.operationNotAllowed("Booking bed", `bed is ${bed.status}`);
          }
        }

        // Check for date conflicts with existing reservations
        try {
          const conflictingReservation = await db.queryRow`
            SELECT id FROM reservations 
            WHERE room_id = ${req.roomId}
              AND (bed_id = ${req.bedId} OR (bed_id IS NULL AND ${req.bedId} IS NULL))
              AND status IN ('confirmed', 'checked_in')
              AND (
                (check_in_date <= ${req.checkInDate} AND check_out_date > ${req.checkInDate}) OR
                (check_in_date < ${req.checkOutDate} AND check_out_date >= ${req.checkOutDate}) OR
                (check_in_date >= ${req.checkInDate} AND check_out_date <= ${req.checkOutDate})
              )
          `;
          
          if (conflictingReservation) {
            throw createError.conflict("Date range conflicts with existing reservation");
          }
        } catch (error: any) {
          if (error.code && error.statusCode) throw error;
          handleDatabaseError(error, "checking reservation conflicts");
        }

        // Generate confirmation code
        const confirmationCode = 'RES' + Date.now().toString().slice(-8);

        // Create reservation
        let reservation: any;
        try {
          reservation = await db.queryRow`
            INSERT INTO reservations (
              confirmation_code, guest_id, room_id, bed_id, check_in_date, 
              check_out_date, guests_count, total_amount, source, 
              special_requests, notes
            )
            VALUES (
              ${confirmationCode}, ${req.guestId}, ${req.roomId}, ${req.bedId},
              ${req.checkInDate}, ${req.checkOutDate}, ${req.guestsCount},
              ${req.totalAmount}, ${req.source}, ${req.specialRequests}, ${req.notes}
            )
            RETURNING *
          `;
        } catch (error: any) {
          handleDatabaseError(error, "creating reservation");
        }

        if (!reservation) {
          throw createError.internal("Failed to create reservation");
        }

        logger.businessLogic("Reservation created", {
          reservationId: reservation.id,
          confirmationCode,
          guestId: req.guestId,
          roomId: req.roomId,
          bedId: req.bedId,
          checkInDate: req.checkInDate,
          checkOutDate: req.checkOutDate,
          totalAmount: req.totalAmount
        });

        return {
          id: reservation.id,
          confirmationCode: reservation.confirmation_code,
          guestId: reservation.guest_id,
          roomId: reservation.room_id,
          bedId: reservation.bed_id,
          checkInDate: reservation.check_in_date,
          checkOutDate: reservation.check_out_date,
          guestsCount: reservation.guests_count,
          totalAmount: reservation.total_amount,
          status: reservation.status,
          source: reservation.source,
          specialRequests: reservation.special_requests,
          notes: reservation.notes,
          createdAt: reservation.created_at,
        };
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.apiError("/reservations", "POST", error, { duration, guestId: req.guestId, roomId: req.roomId });
      logAndThrowError(error);
    }
  }
);
