import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import db from "../db";
import type { Guest } from "./create";
import { createError, handleDatabaseError } from "../shared/errors";
import { logAndThrowError } from "../shared/logging";
import { validate } from "../shared/validation";
import { logger, withPerformanceLogging } from "../shared/logging";

export interface SearchGuestsRequest {
  query: Query<string>;
  limit?: Query<number>;
}

export interface SearchGuestsResponse {
  guests: Guest[];
}

// Searches guests by name, email, or phone
export const search = api<SearchGuestsRequest, SearchGuestsResponse>(
  { expose: true, method: "GET", path: "/guests/search" },
  async (req) => {
    const startTime = Date.now();
    logger.apiRequest("/guests/search", "GET", { query: req.query });

    try {
      return await withPerformanceLogging("search-guests", async () => {
        // Validate input
        validate.required(req.query, "query");
        validate.stringLength(req.query, 2, 100, "query");
        
        const limit = req.limit || 20;
        if (limit) {
          validate.positiveNumber(limit, "limit");
          if (limit > 100) {
            throw createError.validationError("limit", "cannot exceed 100");
          }
        }

        // Sanitize search term to prevent injection
        const sanitizedQuery = req.query.trim().replace(/[%_]/g, '\\$&');
        const searchTerm = `%${sanitizedQuery}%`;

        // Search guests
        let rows: any[];
        try {
          rows = await db.queryAll`
            SELECT * FROM guests 
            WHERE 
              first_name ILIKE ${searchTerm} OR 
              last_name ILIKE ${searchTerm} OR 
              email ILIKE ${searchTerm} OR 
              phone ILIKE ${searchTerm}
            ORDER BY last_name, first_name
            LIMIT ${limit}
          `;
        } catch (error: any) {
          handleDatabaseError(error, "searching guests");
        }

        const guests = rows.map(row => ({
          id: row.id,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          phone: row.phone,
          dateOfBirth: row.date_of_birth,
          nationality: row.nationality,
          passportNumber: row.passport_number,
          emergencyContactName: row.emergency_contact_name,
          emergencyContactPhone: row.emergency_contact_phone,
          dietaryRestrictions: row.dietary_restrictions,
          notes: row.notes,
          totalStays: row.total_stays,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));

        logger.info("Guest search completed", { 
          query: req.query, 
          resultCount: guests.length, 
          limit 
        });

        return { guests };
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.apiError("/guests/search", "GET", error, { duration, query: req.query });
      logAndThrowError(error);
    }
  }
);
