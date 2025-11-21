import { api } from "encore.dev/api";
import db from "../db";
import { createError, handleDatabaseError } from "../shared/errors";
import { logAndThrowError } from "../shared/logging";
import { logger, withPerformanceLogging } from "../shared/logging";

export interface Bed {
  id: string;
  roomId: string;
  number: string;
  bedType: string;
  status: "occupied" | "clean" | "dirty" | "maintenance" | "out_of_order";
  priceModifier: number;
  isActive: boolean;
}

export interface Room {
  id: string;
  number: string;
  name: string;
  roomType: string;
  capacity: number;
  basePrice: number;
  description?: string;
  amenities: string[];
  isActive: boolean;
  beds: Bed[];
  occupiedBeds: number;
  availableBeds: number;
}

export interface ListRoomsResponse {
  rooms: Room[];
}

// Retrieves all rooms with their beds and status
export const list = api<void, ListRoomsResponse>(
  { expose: true, method: "GET", path: "/rooms" },
  async () => {
    const startTime = Date.now();
    logger.apiRequest("/rooms", "GET");

    try {
      return await withPerformanceLogging("list-rooms", async () => {
        // Get rooms with bed statistics
        let rooms: any[];
        try {
          rooms = await db.queryAll`
            SELECT r.*, 
                   COALESCE(bed_stats.total_beds, 0) as total_beds,
                   COALESCE(bed_stats.occupied_beds, 0) as occupied_beds,
                   COALESCE(bed_stats.available_beds, 0) as available_beds
            FROM rooms r
            LEFT JOIN (
              SELECT room_id,
                     COUNT(*) as total_beds,
                     COUNT(CASE WHEN status = 'occupied' THEN 1 END) as occupied_beds,
                     COUNT(CASE WHEN status = 'clean' THEN 1 END) as available_beds
              FROM beds 
              WHERE is_active = true
              GROUP BY room_id
            ) bed_stats ON r.id = bed_stats.room_id
            WHERE r.is_active = true
            ORDER BY r.number
          `;
        } catch (error: any) {
          handleDatabaseError(error, "fetching rooms with bed statistics");
        }

        const result: Room[] = [];

        // Get beds for each room
        for (const room of rooms) {
          let beds: any[];
          try {
            beds = await db.queryAll`
              SELECT * FROM beds 
              WHERE room_id = ${room.id} AND is_active = true
              ORDER BY number
            `;
          } catch (error: any) {
            handleDatabaseError(error, `fetching beds for room ${room.id}`);
          }

          result.push({
            id: room.id,
            number: room.number,
            name: room.name,
            roomType: room.room_type,
            capacity: room.capacity,
            basePrice: room.base_price,
            description: room.description,
            amenities: room.amenities || [],
            isActive: room.is_active,
            beds: beds.map(bed => ({
              id: bed.id,
              roomId: bed.room_id,
              number: bed.number,
              bedType: bed.bed_type,
              status: bed.status,
              priceModifier: bed.price_modifier,
              isActive: bed.is_active,
            })),
            occupiedBeds: room.occupied_beds,
            availableBeds: room.available_beds,
          });
        }

        const totalBeds = result.reduce((sum, room) => sum + room.beds.length, 0);
        const totalOccupied = result.reduce((sum, room) => sum + room.occupiedBeds, 0);
        const totalAvailable = result.reduce((sum, room) => sum + room.availableBeds, 0);

        logger.info("Rooms listed", {
          roomCount: result.length,
          totalBeds,
          totalOccupied,
          totalAvailable
        });

        return { rooms: result };
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.apiError("/rooms", "GET", error, { duration });
      logAndThrowError(error);
    }
  }
);
