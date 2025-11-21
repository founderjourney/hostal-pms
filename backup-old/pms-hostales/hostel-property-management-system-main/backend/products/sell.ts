import { api } from "encore.dev/api";
import db from "../db";
import { createError, handleDatabaseError } from "../shared/errors";
import { logAndThrowError } from "../shared/logging";
import { validate } from "../shared/validation";
import { logger, withPerformanceLogging } from "../shared/logging";

export interface SellProductRequest {
  productId: string;
  quantity: number;
  folioId: string;
}

export interface SellProductResponse {
  success: boolean;
  totalAmount: number;
}

// Sells a product and adds it to a folio
export const sell = api<SellProductRequest, SellProductResponse>(
  { expose: true, method: "POST", path: "/products/:productId/sell" },
  async (req) => {
    const startTime = Date.now();
    logger.apiRequest("/products/:productId/sell", "POST", { productId: req.productId, folioId: req.folioId });

    try {
      return await withPerformanceLogging("sell-product", async () => {
        // Validate input
        validate.uuid(req.productId, "productId");
        validate.uuid(req.folioId, "folioId");
        validate.positiveNumber(req.quantity, "quantity");
        
        // Business rule: reasonable quantity limit
        if (req.quantity > 100) {
          throw createError.businessRuleViolation("maximum quantity per sale is 100");
        }

        let tx: any;
        try {
          tx = await db.begin();

          // Get product details
          const product = await tx.queryRow`
            SELECT * FROM products WHERE id = ${req.productId} AND is_active = true
          `;

          if (!product) {
            throw createError.notFound("Product", req.productId);
          }

          // Check stock availability
          if (product.stock_quantity < req.quantity) {
            throw createError.preconditionFailed(
              `insufficient stock - requested: ${req.quantity}, available: ${product.stock_quantity}`
            );
          }

          // Verify folio exists and is active
          const folio = await tx.queryRow`
            SELECT id, status FROM folios WHERE id = ${req.folioId}
          `;

          if (!folio) {
            throw createError.notFound("Folio", req.folioId);
          }

          if (folio.status === 'closed') {
            throw createError.operationNotAllowed("Selling products", "folio is closed");
          }

          const totalAmount = product.price * req.quantity;

          // Update stock
          await tx.exec`
            UPDATE products 
            SET stock_quantity = stock_quantity - ${req.quantity},
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${req.productId}
          `;

          // Record inventory transaction
          await tx.exec`
            INSERT INTO inventory_transactions (
              product_id, transaction_type, quantity, unit_cost, reference_type, reference_id
            )
            VALUES (
              ${req.productId}, 'sale', ${-req.quantity}, ${product.cost}, 'folio_item', ${req.folioId}
            )
          `;

          // Add charge to folio
          await tx.exec`
            INSERT INTO folio_items (folio_id, item_type, description, amount, quantity)
            VALUES (${req.folioId}, 'product', ${product.name}, ${product.price}, ${req.quantity})
          `;

          // Update folio totals
          await tx.exec`
            UPDATE folios 
            SET total_charges = total_charges + ${totalAmount},
                balance = balance + ${totalAmount},
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${req.folioId}
          `;

          await tx.commit();

          logger.businessLogic("Product sold", {
            productId: req.productId,
            productName: product.name,
            quantity: req.quantity,
            totalAmount,
            folioId: req.folioId,
            remainingStock: product.stock_quantity - req.quantity
          });

          // Check for low stock alert
          const remainingStock = product.stock_quantity - req.quantity;
          if (remainingStock <= product.low_stock_threshold) {
            logger.warn("Low stock alert", {
              productId: req.productId,
              productName: product.name,
              remainingStock,
              threshold: product.low_stock_threshold
            });
          }

          return {
            success: true,
            totalAmount,
          };
        } catch (error: any) {
          if (tx) {
            try {
              await tx.rollback();
            } catch (rollbackError) {
              logger.error("Transaction rollback failed", { productId: req.productId }, rollbackError as Error);
            }
          }
          if (error.code && error.statusCode) throw error;
          handleDatabaseError(error, "selling product");
        }
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.apiError("/products/:productId/sell", "POST", error, { duration, productId: req.productId, folioId: req.folioId });
      logAndThrowError(error);
    }
  }
);
