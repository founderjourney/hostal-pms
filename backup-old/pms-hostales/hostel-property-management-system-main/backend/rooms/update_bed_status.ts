import { api } from "encore.dev/api";
import db from "../db";
import { createError, handleDatabaseError } from "../shared/errors";
import { logAndThrowError } from "../shared/logging";
import { validate } from "../shared/validation";
import { logger, withPerformanceLogging } from "../shared/logging";

export interface UpdateBedStatusRequest {
  bedId: string;
  status: "occupied" | "clean" | "dirty" | "maintenance" | "out_of_order";
}

export interface UpdateBedStatusResponse {
  success: boolean;
}

// Updates the status of a specific bed
export const updateBedStatus = api<UpdateBedStatusRequest, UpdateBedStatusResponse>(
  { expose: true, method: "PUT", path: "/rooms/beds/:bedId/status" },
  async (req) => {
    const startTime = Date.now();
    logger.apiRequest("/rooms/beds/:bedId/status", "PUT", { bedId: req.bedId, status: req.status });

    try {
      return await withPerformanceLogging("update-bed-status", async () => {
        // Validate input
        validate.uuid(req.bedId, "bedId");
        validate.enumValue(
          req.status,
          ["occupied", "clean", "dirty", "maintenance", "out_of_order"],
          "status"
        );

        // Check current bed status and validate transition
        let currentBed: any;
        try {
          currentBed = await db.queryRow`
            SELECT id, status, is_active FROM beds WHERE id = ${req.bedId}
          `;
        } catch (error: any) {
          handleDatabaseError(error, "fetching current bed status");
        }

        if (!currentBed) {
          throw createError.notFound("Bed", req.bedId);
        }

        if (!currentBed.is_active) {
          throw createError.operationNotAllowed("Updating bed status", "bed is not active");
        }

        // Business rules for status transitions
        const currentStatus = currentBed.status;
        const newStatus = req.status;

        // Validate status transitions
        const validTransitions: Record<string, string[]> = {
          occupied: ["dirty", "clean", "maintenance", "out_of_order"],
          clean: ["occupied", "dirty", "maintenance", "out_of_order"],
          dirty: ["clean", "maintenance", "out_of_order"],
          maintenance: ["clean", "dirty", "out_of_order"],
          out_of_order: ["maintenance", "clean"]
        };

        if (currentStatus !== newStatus && !validTransitions[currentStatus]?.includes(newStatus)) {
          throw createError.businessRuleViolation(
            `invalid status transition from '${currentStatus}' to '${newStatus}'`
          );
        }

        // Special validation: cannot set to occupied unless there's an active reservation
        if (newStatus === 'occupied') {
          const activeReservation = await db.queryRow`
            SELECT id FROM reservations 
            WHERE bed_id = ${req.bedId} AND status = 'checked_in'
          `;
          
          if (!activeReservation) {
            throw createError.businessRuleViolation(
              "cannot set bed to occupied without an active reservation"
            );
          }
        }

        // Update bed status
        let result: any;
        try {
          result = await db.queryRow`
            UPDATE beds 
            SET status = ${req.status}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ${req.bedId}
            RETURNING id, room_id
          `;
        } catch (error: any) {
          handleDatabaseError(error, "updating bed status");
        }

        if (!result) {
          throw createError.internal("Failed to update bed status");
        }

        logger.businessLogic("Bed status updated", {
          bedId: req.bedId,
          roomId: result.room_id,
          previousStatus: currentStatus,
          newStatus: req.status
        });

        // Log maintenance alerts
        if (req.status === 'maintenance' || req.status === 'out_of_order') {
          logger.warn("Bed requires attention", {
            bedId: req.bedId,
            roomId: result.room_id,
            status: req.status,
            priority: req.status === 'out_of_order' ? 'high' : 'medium'
          });
        }

        return { success: true };
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.apiError("/rooms/beds/:bedId/status", "PUT", error, { duration, bedId: req.bedId, status: req.status });
      logAndThrowError(error);
    }
  }
);
