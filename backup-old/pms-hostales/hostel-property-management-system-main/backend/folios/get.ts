import { api } from "encore.dev/api";
import db from "../db";
import { createError, handleDatabaseError } from "../shared/errors";
import { logAndThrowError } from "../shared/logging";
import { validate } from "../shared/validation";
import { logger, withPerformanceLogging } from "../shared/logging";

export interface FolioItem {
  id: string;
  itemType: string;
  description: string;
  amount: number;
  quantity: number;
  date: Date;
}

export interface Folio {
  id: string;
  reservationId: string;
  guestId: string;
  totalCharges: number;
  totalPayments: number;
  balance: number;
  status: string;
  items: FolioItem[];
}

export interface GetFolioRequest {
  id: string;
}

// Retrieves a folio with all its items
export const get = api<GetFolioRequest, Folio>(
  { expose: true, method: "GET", path: "/folios/:id" },
  async (req) => {
    const startTime = Date.now();
    logger.apiRequest("/folios/:id", "GET", { folioId: req.id });

    try {
      return await withPerformanceLogging("get-folio", async () => {
        // Validate input
        validate.uuid(req.id, "id");

        // Get folio
        let folio: any;
        try {
          folio = await db.queryRow`
            SELECT * FROM folios WHERE id = ${req.id}
          `;
        } catch (error: any) {
          handleDatabaseError(error, "fetching folio");
        }

        if (!folio) {
          throw createError.notFound("Folio", req.id);
        }

        // Get folio items
        let items: any[];
        try {
          items = await db.queryAll`
            SELECT * FROM folio_items 
            WHERE folio_id = ${req.id}
            ORDER BY date, created_at
          `;
        } catch (error: any) {
          handleDatabaseError(error, "fetching folio items");
        }

        const folioData = {
          id: folio.id,
          reservationId: folio.reservation_id,
          guestId: folio.guest_id,
          totalCharges: folio.total_charges,
          totalPayments: folio.total_payments,
          balance: folio.balance,
          status: folio.status,
          items: items.map(item => ({
            id: item.id,
            itemType: item.item_type,
            description: item.description,
            amount: item.amount,
            quantity: item.quantity,
            date: item.date,
          })),
        };

        logger.info("Folio retrieved", { folioId: req.id, itemCount: items.length, balance: folio.balance });
        return folioData;
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.apiError("/folios/:id", "GET", error, { duration, folioId: req.id });
      logAndThrowError(error);
    }
  }
);
