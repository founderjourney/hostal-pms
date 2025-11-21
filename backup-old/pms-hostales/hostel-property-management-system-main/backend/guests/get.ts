import { api } from "encore.dev/api";
import db from "../db";
import type { Guest } from "./create";
import { createError, handleDatabaseError } from "../shared/errors";
import { logAndThrowError } from "../shared/logging";
import { validate } from "../shared/validation";
import { logger, withPerformanceLogging } from "../shared/logging";

export interface GetGuestRequest {
  id: string;
}

// Retrieves a guest by ID
export const get = api<GetGuestRequest, Guest>(
  { expose: true, method: "GET", path: "/guests/:id" },
  async (req) => {
    const startTime = Date.now();
    logger.apiRequest("/guests/:id", "GET", { guestId: req.id });

    try {
      return await withPerformanceLogging("get-guest", async () => {
        // Validate input
        validate.uuid(req.id, "id");

        // Get guest
        let guest: any;
        try {
          guest = await db.queryRow`
            SELECT * FROM guests WHERE id = ${req.id}
          `;
        } catch (error: any) {
          handleDatabaseError(error, "fetching guest");
        }

        if (!guest) {
          throw createError.notFound("Guest", req.id);
        }

        logger.info("Guest retrieved", { guestId: req.id, hasEmail: !!guest.email });

        return {
          id: guest.id,
          firstName: guest.first_name,
          lastName: guest.last_name,
          email: guest.email,
          phone: guest.phone,
          dateOfBirth: guest.date_of_birth,
          nationality: guest.nationality,
          passportNumber: guest.passport_number,
          emergencyContactName: guest.emergency_contact_name,
          emergencyContactPhone: guest.emergency_contact_phone,
          dietaryRestrictions: guest.dietary_restrictions,
          notes: guest.notes,
          totalStays: guest.total_stays,
          createdAt: guest.created_at,
          updatedAt: guest.updated_at,
        };
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.apiError("/guests/:id", "GET", error, { duration, guestId: req.id });
      logAndThrowError(error);
    }
  }
);
