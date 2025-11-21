import { api } from "encore.dev/api";
import db from "../db";
import { createError, handleDatabaseError } from "../shared/errors";
import { logAndThrowError } from "../shared/logging";
import { validateGuestData, sanitize } from "../shared/validation";
import { logger, withPerformanceLogging } from "../shared/logging";

export interface CreateGuestRequest {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
  nationality?: string;
  passportNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  dietaryRestrictions?: string;
  notes?: string;
}

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
  nationality?: string;
  passportNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  dietaryRestrictions?: string;
  notes?: string;
  totalStays: number;
  createdAt: Date;
  updatedAt: Date;
}

// Creates a new guest profile
export const create = api<CreateGuestRequest, Guest>(
  { expose: true, method: "POST", path: "/guests" },
  async (req) => {
    const startTime = Date.now();
    logger.apiRequest("/guests", "POST");

    try {
      return await withPerformanceLogging("create-guest", async () => {
        // Validate and sanitize input
        validateGuestData(req);
        
        const sanitizedData = {
          firstName: sanitize.name(req.firstName),
          lastName: sanitize.name(req.lastName),
          email: req.email ? sanitize.email(req.email) : null,
          phone: req.phone ? sanitize.phone(req.phone) : null,
          dateOfBirth: req.dateOfBirth,
          nationality: req.nationality,
          passportNumber: req.passportNumber,
          emergencyContactName: req.emergencyContactName ? sanitize.name(req.emergencyContactName) : null,
          emergencyContactPhone: req.emergencyContactPhone ? sanitize.phone(req.emergencyContactPhone) : null,
          dietaryRestrictions: req.dietaryRestrictions,
          notes: req.notes,
        };

        // Check for duplicate email if provided
        if (sanitizedData.email) {
          try {
            const existingGuest = await db.queryRow`
              SELECT id FROM guests WHERE email = ${sanitizedData.email}
            `;
            if (existingGuest) {
              throw createError.alreadyExists("Guest", "email");
            }
          } catch (error: any) {
            if (error.code && error.statusCode) throw error;
            handleDatabaseError(error, "checking existing guest email");
          }
        }

        // Create guest
        let guest: any;
        try {
          guest = await db.queryRow`
            INSERT INTO guests (
              first_name, last_name, email, phone, date_of_birth, nationality,
              passport_number, emergency_contact_name, emergency_contact_phone,
              dietary_restrictions, notes
            )
            VALUES (
              ${sanitizedData.firstName}, ${sanitizedData.lastName}, ${sanitizedData.email}, ${sanitizedData.phone}, 
              ${sanitizedData.dateOfBirth}, ${sanitizedData.nationality}, ${sanitizedData.passportNumber},
              ${sanitizedData.emergencyContactName}, ${sanitizedData.emergencyContactPhone},
              ${sanitizedData.dietaryRestrictions}, ${sanitizedData.notes}
            )
            RETURNING *
          `;
        } catch (error: any) {
          handleDatabaseError(error, "creating guest");
        }

        if (!guest) {
          throw createError.internal("Failed to create guest");
        }

        logger.businessLogic("Guest created", {
          guestId: guest.id,
          email: sanitizedData.email,
          hasPhone: !!sanitizedData.phone
        });

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
      logger.apiError("/guests", "POST", error, { duration });
      logAndThrowError(error);
    }
  }
);
