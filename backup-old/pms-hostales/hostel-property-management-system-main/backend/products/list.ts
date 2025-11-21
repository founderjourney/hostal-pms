import { api } from "encore.dev/api";
import db from "../db";
import { createError, handleDatabaseError } from "../shared/errors";
import { logAndThrowError } from "../shared/logging";
import { logger, withPerformanceLogging } from "../shared/logging";

export interface Product {
  id: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  cost: number;
  sku?: string;
  barcode?: string;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
}

export interface ListProductsResponse {
  products: Product[];
}

// Retrieves all active products
export const list = api<void, ListProductsResponse>(
  { expose: true, method: "GET", path: "/products" },
  async () => {
    const startTime = Date.now();
    logger.apiRequest("/products", "GET");

    try {
      return await withPerformanceLogging("list-products", async () => {
        // Get products
        let products: any[];
        try {
          products = await db.queryAll`
            SELECT * FROM products 
            WHERE is_active = true
            ORDER BY category, name
          `;
        } catch (error: any) {
          handleDatabaseError(error, "fetching products");
        }

        const productData = {
          products: products.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            category: p.category,
            price: p.price,
            cost: p.cost,
            sku: p.sku,
            barcode: p.barcode,
            stockQuantity: p.stock_quantity,
            lowStockThreshold: p.low_stock_threshold,
            isActive: p.is_active,
          })),
        };

        logger.info("Products listed", { productCount: products.length });
        return productData;
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.apiError("/products", "GET", error, { duration });
      logAndThrowError(error);
    }
  }
);
