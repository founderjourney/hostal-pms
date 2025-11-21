import { api } from "encore.dev/api";
import db from "../db";
import { createError, handleDatabaseError } from "../shared/errors";
import { logAndThrowError } from "../shared/logging";
import { validate } from "../shared/validation";
import { logger, withPerformanceLogging } from "../shared/logging";

export interface AddPaymentRequest {
  folioId: string;
  amount: number;
  paymentMethod: string;
  paymentReference?: string;
}

export interface AddPaymentResponse {
  success: boolean;
  paymentId: string;
}

// Adds a payment to a folio
export const addPayment = api<AddPaymentRequest, AddPaymentResponse>(
  { expose: true, method: "POST", path: "/folios/:folioId/payments" },
  async (req) => {
    const startTime = Date.now();
    logger.apiRequest("/folios/:folioId/payments", "POST", { folioId: req.folioId });

    try {
      return await withPerformanceLogging("add-payment", async () => {
        // Validate input
        validate.uuid(req.folioId, "folioId");
        validate.positiveNumber(req.amount, "amount");
        validate.required(req.paymentMethod, "paymentMethod");
        
        validate.stringLength(req.paymentMethod, 1, 50, "paymentMethod");
        
        if (req.paymentReference) {
          validate.stringLength(req.paymentReference, 1, 255, "paymentReference");
        }

        // Verify folio exists and is active
        let folio: any;
        try {
          folio = await db.queryRow`
            SELECT id, status, balance FROM folios WHERE id = ${req.folioId}
          `;
        } catch (error: any) {
          handleDatabaseError(error, "checking folio existence");
        }

        if (!folio) {
          throw createError.notFound("Folio", req.folioId);
        }

        if (folio.status === 'closed') {
          throw createError.operationNotAllowed("Adding payments", "folio is closed");
        }

        // Business rule: payment cannot exceed outstanding balance (allow overpayment up to a reasonable limit)
        const maxOverpayment = 1000; // Allow overpayment up to $1000
        if (req.amount > folio.balance + maxOverpayment) {
          throw createError.businessRuleViolation(
            `payment amount (${req.amount}) exceeds balance (${folio.balance}) by more than allowed overpayment limit`
          );
        }

        let tx: any;
        try {
          tx = await db.begin();

          // Add payment record
          const payment = await tx.queryRow`
            INSERT INTO payments (folio_id, amount, payment_method, payment_reference)
            VALUES (${req.folioId}, ${req.amount}, ${req.paymentMethod}, ${req.paymentReference})
            RETURNING id
          `;

          if (!payment) {
            throw createError.internal("Failed to add payment");
          }

          // Add payment item to folio
          await tx.exec`
            INSERT INTO folio_items (folio_id, item_type, description, amount)
            VALUES (${req.folioId}, 'payment', ${'Payment - ' + req.paymentMethod}, ${-req.amount})
          `;

          // Update folio totals
          await tx.exec`
            UPDATE folios 
            SET total_payments = total_payments + ${req.amount},
                balance = balance - ${req.amount},
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${req.folioId}
          `;

          await tx.commit();

          logger.businessLogic("Payment added to folio", {
            folioId: req.folioId,
            paymentId: payment.id,
            amount: req.amount,
            paymentMethod: req.paymentMethod,
            newBalance: folio.balance - req.amount
          });

          return {
            success: true,
            paymentId: payment.id,
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
          handleDatabaseError(error, "adding payment to folio");
        }
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.apiError("/folios/:folioId/payments", "POST", error, { duration, folioId: req.folioId });
      logAndThrowError(error);
    }
  }
);
