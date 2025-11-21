import { api } from "encore.dev/api";
import db from "../db";
import { createError, handleDatabaseError } from "../shared/errors";
import { logAndThrowError } from "../shared/logging";
import { logger, withPerformanceLogging } from "../shared/logging";

export interface DashboardOverview {
  totalRooms: number;
  occupiedBeds: number;
  availableBeds: number;
  dirtyBeds: number;
  maintenanceBeds: number;
  todayCheckIns: number;
  todayCheckOuts: number;
  totalGuests: number;
  openFolios: number;
  pendingPayments: number;
  lowStockProducts: number;
}

// Retrieves dashboard overview statistics
export const overview = api<void, DashboardOverview>(
  { expose: true, method: "GET", path: "/dashboard/overview" },
  async () => {
    const startTime = Date.now();
    logger.apiRequest("/dashboard/overview", "GET");

    try {
      return await withPerformanceLogging("dashboard-overview", async () => {
        const today = new Date().toISOString().split('T')[0];

        // Get room and bed statistics
        let bedStats: any;
        try {
          bedStats = await db.queryRow`
            SELECT 
              COUNT(DISTINCT r.id) as total_rooms,
              COUNT(CASE WHEN b.status = 'occupied' THEN 1 END) as occupied_beds,
              COUNT(CASE WHEN b.status = 'clean' THEN 1 END) as available_beds,
              COUNT(CASE WHEN b.status = 'dirty' THEN 1 END) as dirty_beds,
              COUNT(CASE WHEN b.status = 'maintenance' OR b.status = 'out_of_order' THEN 1 END) as maintenance_beds
            FROM rooms r
            LEFT JOIN beds b ON r.id = b.room_id AND b.is_active = true
            WHERE r.is_active = true
          `;
        } catch (error: any) {
          handleDatabaseError(error, "fetching bed statistics");
        }

        // Get today's check-ins and check-outs
        let reservationStats: any;
        try {
          reservationStats = await db.queryRow`
            SELECT 
              COUNT(CASE WHEN check_in_date = ${today} AND status = 'checked_in' THEN 1 END) as today_check_ins,
              COUNT(CASE WHEN check_out_date = ${today} AND status = 'checked_out' THEN 1 END) as today_check_outs
            FROM reservations
          `;
        } catch (error: any) {
          handleDatabaseError(error, "fetching reservation statistics");
        }

        // Get guest and folio statistics
        let guestStats: any;
        try {
          guestStats = await db.queryRow`
            SELECT COUNT(*) as total_guests FROM guests
          `;
        } catch (error: any) {
          handleDatabaseError(error, "fetching guest statistics");
        }

        let folioStats: any;
        try {
          folioStats = await db.queryRow`
            SELECT 
              COUNT(CASE WHEN status = 'open' THEN 1 END) as open_folios,
              COUNT(CASE WHEN status = 'open' AND balance > 0 THEN 1 END) as pending_payments
            FROM folios
          `;
        } catch (error: any) {
          handleDatabaseError(error, "fetching folio statistics");
        }

        // Get low stock products
        let productStats: any;
        try {
          productStats = await db.queryRow`
            SELECT COUNT(*) as low_stock_products
            FROM products 
            WHERE stock_quantity <= low_stock_threshold AND is_active = true
          `;
        } catch (error: any) {
          handleDatabaseError(error, "fetching product statistics");
        }

        const overview = {
          totalRooms: bedStats?.total_rooms || 0,
          occupiedBeds: bedStats?.occupied_beds || 0,
          availableBeds: bedStats?.available_beds || 0,
          dirtyBeds: bedStats?.dirty_beds || 0,
          maintenanceBeds: bedStats?.maintenance_beds || 0,
          todayCheckIns: reservationStats?.today_check_ins || 0,
          todayCheckOuts: reservationStats?.today_check_outs || 0,
          totalGuests: guestStats?.total_guests || 0,
          openFolios: folioStats?.open_folios || 0,
          pendingPayments: folioStats?.pending_payments || 0,
          lowStockProducts: productStats?.low_stock_products || 0,
        };

        logger.info("Dashboard overview generated", { stats: overview });
        return overview;
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.apiError("/dashboard/overview", "GET", error, { duration });
      logAndThrowError(error);
    }
  }
);
