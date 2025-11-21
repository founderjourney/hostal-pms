import { api } from "encore.dev/api";
import db from "../db";
import { createError, handleDatabaseError } from "../shared/errors";
import { logAndThrowError } from "../shared/logging";
import { validate } from "../shared/validation";
import { logger, withPerformanceLogging } from "../shared/logging";

export interface AddChargeRequest {
  folioId: string;
  itemType: string;
  description: string;
  amount: number;
  quantity?: number;
}

export interface AddChargeResponse {
  success: boolean;
  itemId: string;
}

// Adds a charge to a folio
export const addCharge = api<AddChargeRequest, AddChargeResponse>(
  { expose: true, method: "POST", path: "/folios/:folioId/charges" },
  async (req) => {
    const startTime = Date.now();
    logger.apiRequest("/folios/:folioId/charges", "POST", { folioId: req.folioId });

    try {
      return await withPerformanceLogging("add-charge", async () => {
        // Validate input
        validate.uuid(req.folioId, "folioId");
        validate.required(req.itemType, "itemType");
        validate.required(req.description, "description");
        validate.positiveNumber(req.amount, "amount");
        
        validate.stringLength(req.itemType, 1, 50, "itemType");
        validate.stringLength(req.description, 1, 255, "description");
        
        if (req.quantity !== undefined) {
          validate.positiveNumber(req.quantity, "quantity");
        }

        const quantity = req.quantity || 1;
        const totalAmount = req.amount * quantity;

        // Verify folio exists and is active
        let folio: any;
        try {
          folio = await db.queryRow`
            SELECT id, status FROM folios WHERE id = ${req.folioId}
          `;
        } catch (error: any) {
          handleDatabaseError(error, "checking folio existence");
        }

        if (!folio) {
          throw createError.notFound("Folio", req.folioId);
        }

        if (folio.status === 'closed') {
          throw createError.operationNotAllowed("Adding charges", "folio is closed");
        }

        let tx: any;
        try {
          tx = await db.begin();

          // Add item to folio
          const item = await tx.queryRow`
            INSERT INTO folio_items (folio_id, item_type, description, amount, quantity)
            VALUES (${req.folioId}, ${req.itemType}, ${req.description}, ${req.amount}, ${quantity})
            RETURNING id
          `;

          if (!item) {
            throw createError.internal("Failed to add charge");
          }

          // Update folio totals
          await tx.exec`
            UPDATE folios 
            SET total_charges = total_charges + ${totalAmount},
                balance = balance + ${totalAmount},
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${req.folioId}
          `;

          await tx.commit();

          logger.businessLogic("Charge added to folio", {
            folioId: req.folioId,
            itemId: item.id,
            amount: totalAmount,
            itemType: req.itemType
          });

          return {
            success: true,
            itemId: item.id,
          };
        } catch (error: any) {
          if (tx) {
            try {
              await tx.rollback();
            } catch (rollbackError) {
              logger.error("Transaction rollback failed", { folioId: req.folioId }, rollbackError as Error);
            }
          }
          if (error.code && error.statusCode) throw error;
          handleDatabaseError(error, "adding charge to folio");
        }
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.apiError("/folios/:folioId/charges", "POST", error, { duration, folioId: req.folioId });
      logAndThrowError(error);
    }
  }
);
