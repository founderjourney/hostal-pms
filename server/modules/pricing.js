/**
 * Pricing Module
 * DEV3-05: Revenue Management - Dynamic Pricing System
 *
 * Endpoints:
 * - GET    /api/pricing/rules          - List all price rules
 * - GET    /api/pricing/rules/:id      - Get specific rule
 * - POST   /api/pricing/rules          - Create price rule
 * - PUT    /api/pricing/rules/:id      - Update price rule
 * - DELETE /api/pricing/rules/:id      - Delete price rule
 * - POST   /api/pricing/calculate      - Calculate price for dates
 * - GET    /api/pricing/seasons        - List season configurations
 */

const express = require('express');
const router = express.Router();

// Database adapter will be set from parent
let dbAll, dbGet, dbRun;

/**
 * Initialize database functions
 */
function initDb(all, get, run) {
  dbAll = all;
  dbGet = get;
  dbRun = run;
}

/**
 * Create pricing tables if they don't exist
 */
async function initPricingTables() {
  // Price rules table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS price_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      bed_type TEXT,
      room_id INTEGER,
      season TEXT CHECK(season IN ('high', 'medium', 'low', NULL)),
      day_of_week INTEGER CHECK(day_of_week >= 0 AND day_of_week <= 6),
      modifier_type TEXT DEFAULT 'percent' CHECK(modifier_type IN ('percent', 'fixed')),
      modifier_value REAL DEFAULT 0,
      min_occupancy REAL,
      max_occupancy REAL,
      min_stay INTEGER,
      max_stay INTEGER,
      start_date TEXT,
      end_date TEXT,
      priority INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Season definitions table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS seasons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('high', 'medium', 'low')),
      start_month INTEGER NOT NULL CHECK(start_month >= 1 AND start_month <= 12),
      end_month INTEGER NOT NULL CHECK(end_month >= 1 AND end_month <= 12),
      start_day INTEGER DEFAULT 1,
      end_day INTEGER DEFAULT 31,
      year INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Price history table (for tracking applied prices)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER,
      bed_id INTEGER,
      date TEXT NOT NULL,
      base_price REAL NOT NULL,
      final_price REAL NOT NULL,
      rules_applied TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default seasons if empty
  const seasonCount = await dbGet('SELECT COUNT(*) as count FROM seasons');
  if (seasonCount.count === 0) {
    // Default seasons for Colombia/hostel industry
    await dbRun(`
      INSERT INTO seasons (name, type, start_month, end_month, start_day, end_day) VALUES
      ('Temporada Alta - Diciembre/Enero', 'high', 12, 1, 15, 15),
      ('Semana Santa', 'high', 3, 4, 20, 10),
      ('Temporada Media - Junio/Julio', 'medium', 6, 7, 15, 31),
      ('Temporada Baja', 'low', 2, 3, 1, 19),
      ('Temporada Baja - Agosto/Nov', 'low', 8, 11, 1, 30)
    `);
  }

  // Insert default price rules if empty
  const ruleCount = await dbGet('SELECT COUNT(*) as count FROM price_rules');
  if (ruleCount.count === 0) {
    await dbRun(`
      INSERT INTO price_rules (name, description, season, modifier_type, modifier_value, priority) VALUES
      ('Temporada Alta +25%', 'Aumento en temporada alta', 'high', 'percent', 25, 10),
      ('Temporada Baja -15%', 'Descuento en temporada baja', 'low', 'percent', -15, 10),
      ('Fin de Semana +10%', 'Viernes y Sabado', NULL, 'percent', 10, 5),
      ('Alta Ocupacion +15%', 'Cuando ocupacion > 80%', NULL, 'percent', 15, 3)
    `);

    // Update weekend rule with day_of_week
    await dbRun(`UPDATE price_rules SET day_of_week = 5 WHERE name = 'Fin de Semana +10%'`);
  }
}

// ===================================
// PRICE RULES ENDPOINTS
// ===================================

/**
 * GET /api/pricing/rules
 * List all price rules
 */
router.get('/rules', async (req, res) => {
  try {
    const { active, season, bed_type } = req.query;

    let query = 'SELECT * FROM price_rules WHERE 1=1';
    const params = [];

    if (active !== undefined) {
      query += ' AND is_active = ?';
      params.push(active === 'true' ? 1 : 0);
    }

    if (season) {
      query += ' AND (season = ? OR season IS NULL)';
      params.push(season);
    }

    if (bed_type) {
      query += ' AND (bed_type = ? OR bed_type IS NULL)';
      params.push(bed_type);
    }

    query += ' ORDER BY priority DESC, created_at DESC';

    const rules = await dbAll(query, params);

    res.json({
      success: true,
      rules,
      total: rules.length
    });
  } catch (error) {
    console.error('Error fetching price rules:', error);
    res.status(500).json({ error: 'Failed to fetch price rules' });
  }
});

/**
 * GET /api/pricing/rules/:id
 * Get specific price rule
 */
router.get('/rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const rule = await dbGet('SELECT * FROM price_rules WHERE id = ?', [id]);

    if (!rule) {
      return res.status(404).json({ error: 'Price rule not found' });
    }

    res.json({ success: true, rule });
  } catch (error) {
    console.error('Error fetching price rule:', error);
    res.status(500).json({ error: 'Failed to fetch price rule' });
  }
});

/**
 * POST /api/pricing/rules
 * Create new price rule
 */
router.post('/rules', async (req, res) => {
  try {
    const {
      name,
      description,
      bed_type,
      room_id,
      season,
      day_of_week,
      modifier_type = 'percent',
      modifier_value = 0,
      min_occupancy,
      max_occupancy,
      min_stay,
      max_stay,
      start_date,
      end_date,
      priority = 0,
      is_active = true
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await dbRun(`
      INSERT INTO price_rules (
        name, description, bed_type, room_id, season, day_of_week,
        modifier_type, modifier_value, min_occupancy, max_occupancy,
        min_stay, max_stay, start_date, end_date, priority, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name, description, bed_type, room_id, season, day_of_week,
      modifier_type, modifier_value, min_occupancy, max_occupancy,
      min_stay, max_stay, start_date, end_date, priority, is_active ? 1 : 0
    ]);

    const newRule = await dbGet('SELECT * FROM price_rules WHERE id = ?', [result.lastID]);

    res.status(201).json({
      success: true,
      message: 'Price rule created',
      rule: newRule
    });
  } catch (error) {
    console.error('Error creating price rule:', error);
    res.status(500).json({ error: 'Failed to create price rule' });
  }
});

/**
 * PUT /api/pricing/rules/:id
 * Update price rule
 */
router.put('/rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      bed_type,
      room_id,
      season,
      day_of_week,
      modifier_type,
      modifier_value,
      min_occupancy,
      max_occupancy,
      min_stay,
      max_stay,
      start_date,
      end_date,
      priority,
      is_active
    } = req.body;

    const existing = await dbGet('SELECT * FROM price_rules WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Price rule not found' });
    }

    await dbRun(`
      UPDATE price_rules SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        bed_type = ?,
        room_id = ?,
        season = ?,
        day_of_week = ?,
        modifier_type = COALESCE(?, modifier_type),
        modifier_value = COALESCE(?, modifier_value),
        min_occupancy = ?,
        max_occupancy = ?,
        min_stay = ?,
        max_stay = ?,
        start_date = ?,
        end_date = ?,
        priority = COALESCE(?, priority),
        is_active = COALESCE(?, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      name, description, bed_type, room_id, season, day_of_week,
      modifier_type, modifier_value, min_occupancy, max_occupancy,
      min_stay, max_stay, start_date, end_date, priority,
      is_active !== undefined ? (is_active ? 1 : 0) : null, id
    ]);

    const updated = await dbGet('SELECT * FROM price_rules WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Price rule updated',
      rule: updated
    });
  } catch (error) {
    console.error('Error updating price rule:', error);
    res.status(500).json({ error: 'Failed to update price rule' });
  }
});

/**
 * DELETE /api/pricing/rules/:id
 * Delete price rule
 */
router.delete('/rules/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await dbGet('SELECT * FROM price_rules WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Price rule not found' });
    }

    await dbRun('DELETE FROM price_rules WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Price rule deleted'
    });
  } catch (error) {
    console.error('Error deleting price rule:', error);
    res.status(500).json({ error: 'Failed to delete price rule' });
  }
});

// ===================================
// SEASONS ENDPOINTS
// ===================================

/**
 * GET /api/pricing/seasons
 * List all seasons
 */
router.get('/seasons', async (req, res) => {
  try {
    const seasons = await dbAll('SELECT * FROM seasons ORDER BY start_month, start_day');
    res.json({ success: true, seasons });
  } catch (error) {
    console.error('Error fetching seasons:', error);
    res.status(500).json({ error: 'Failed to fetch seasons' });
  }
});

/**
 * POST /api/pricing/seasons
 * Create new season
 */
router.post('/seasons', async (req, res) => {
  try {
    const { name, type, start_month, end_month, start_day = 1, end_day = 31, year } = req.body;

    if (!name || !type || !start_month || !end_month) {
      return res.status(400).json({ error: 'Name, type, start_month, and end_month are required' });
    }

    const result = await dbRun(`
      INSERT INTO seasons (name, type, start_month, end_month, start_day, end_day, year)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [name, type, start_month, end_month, start_day, end_day, year]);

    const newSeason = await dbGet('SELECT * FROM seasons WHERE id = ?', [result.lastID]);

    res.status(201).json({
      success: true,
      message: 'Season created',
      season: newSeason
    });
  } catch (error) {
    console.error('Error creating season:', error);
    res.status(500).json({ error: 'Failed to create season' });
  }
});

// ===================================
// PRICE CALCULATION
// ===================================

/**
 * Get current season for a date
 */
function getCurrentSeason(date, seasons) {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  for (const season of seasons) {
    // Handle seasons that span year boundary (e.g., Dec-Jan)
    if (season.start_month > season.end_month) {
      if (
        (month > season.start_month || (month === season.start_month && day >= season.start_day)) ||
        (month < season.end_month || (month === season.end_month && day <= season.end_day))
      ) {
        return season;
      }
    } else {
      if (
        (month > season.start_month || (month === season.start_month && day >= season.start_day)) &&
        (month < season.end_month || (month === season.end_month && day <= season.end_day))
      ) {
        return season;
      }
    }
  }

  return { type: 'medium', name: 'Default' }; // Default to medium season
}

/**
 * Calculate occupancy for a date
 */
async function getOccupancyForDate(date) {
  const dateStr = date.toISOString().split('T')[0];

  const totalBeds = await dbGet('SELECT COUNT(*) as count FROM beds WHERE status = ?', ['available']);
  const occupiedBeds = await dbGet(`
    SELECT COUNT(DISTINCT bed_id) as count FROM bookings
    WHERE check_in <= ? AND check_out > ? AND status IN ('confirmed', 'checked_in')
  `, [dateStr, dateStr]);

  if (!totalBeds || totalBeds.count === 0) return 0;
  return (occupiedBeds.count / totalBeds.count) * 100;
}

/**
 * Calculate dynamic price for a bed on a specific date
 */
async function calculateDynamicPrice(bedId, date, nights = 1) {
  // Get bed info
  const bed = await dbGet('SELECT * FROM beds WHERE id = ?', [bedId]);
  if (!bed) {
    throw new Error('Bed not found');
  }

  const basePrice = bed.price_per_night || 50000; // Default price
  let finalPrice = basePrice;
  const appliedRules = [];

  // Get all active rules sorted by priority
  const rules = await dbAll(`
    SELECT * FROM price_rules
    WHERE is_active = 1
    ORDER BY priority DESC
  `);

  // Get seasons
  const seasons = await dbAll('SELECT * FROM seasons WHERE is_active = 1');
  const currentSeason = getCurrentSeason(date, seasons);

  // Get occupancy
  const occupancy = await getOccupancyForDate(date);

  // Apply rules
  for (const rule of rules) {
    let applies = true;

    // Check bed type
    if (rule.bed_type && rule.bed_type !== bed.type) {
      applies = false;
    }

    // Check room
    if (rule.room_id && rule.room_id !== bed.room_id) {
      applies = false;
    }

    // Check season
    if (rule.season && rule.season !== currentSeason.type) {
      applies = false;
    }

    // Check day of week
    if (rule.day_of_week !== null && rule.day_of_week !== date.getDay()) {
      applies = false;
    }

    // Check occupancy
    if (rule.min_occupancy !== null && occupancy < rule.min_occupancy) {
      applies = false;
    }
    if (rule.max_occupancy !== null && occupancy > rule.max_occupancy) {
      applies = false;
    }

    // Check stay length
    if (rule.min_stay !== null && nights < rule.min_stay) {
      applies = false;
    }
    if (rule.max_stay !== null && nights > rule.max_stay) {
      applies = false;
    }

    // Check date range
    if (rule.start_date) {
      const startDate = new Date(rule.start_date);
      if (date < startDate) applies = false;
    }
    if (rule.end_date) {
      const endDate = new Date(rule.end_date);
      if (date > endDate) applies = false;
    }

    // Apply rule if all conditions match
    if (applies) {
      if (rule.modifier_type === 'percent') {
        finalPrice += basePrice * (rule.modifier_value / 100);
      } else {
        finalPrice += rule.modifier_value;
      }

      appliedRules.push({
        id: rule.id,
        name: rule.name,
        modifier: rule.modifier_type === 'percent'
          ? `${rule.modifier_value}%`
          : `$${rule.modifier_value}`
      });
    }
  }

  // Ensure price doesn't go below minimum
  const minPrice = basePrice * 0.5; // Minimum 50% of base
  finalPrice = Math.max(finalPrice, minPrice);

  // Round to nearest 1000 (for COP)
  finalPrice = Math.round(finalPrice / 1000) * 1000;

  return {
    bedId,
    date: date.toISOString().split('T')[0],
    basePrice,
    finalPrice,
    discount: finalPrice < basePrice ? basePrice - finalPrice : 0,
    increase: finalPrice > basePrice ? finalPrice - basePrice : 0,
    season: currentSeason,
    occupancy: Math.round(occupancy),
    appliedRules
  };
}

/**
 * POST /api/pricing/calculate
 * Calculate price for specific dates
 */
router.post('/calculate', async (req, res) => {
  try {
    const { bed_id, check_in, check_out } = req.body;

    if (!bed_id || !check_in || !check_out) {
      return res.status(400).json({ error: 'bed_id, check_in, and check_out are required' });
    }

    const startDate = new Date(check_in);
    const endDate = new Date(check_out);
    const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    if (nights <= 0) {
      return res.status(400).json({ error: 'Invalid date range' });
    }

    // Calculate price for each night
    const nightlyPrices = [];
    let totalPrice = 0;

    for (let i = 0; i < nights; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const priceInfo = await calculateDynamicPrice(bed_id, date, nights);
      nightlyPrices.push(priceInfo);
      totalPrice += priceInfo.finalPrice;
    }

    // Get average price per night
    const avgPrice = Math.round(totalPrice / nights);

    res.json({
      success: true,
      calculation: {
        bedId: bed_id,
        checkIn: check_in,
        checkOut: check_out,
        nights,
        totalPrice,
        averagePricePerNight: avgPrice,
        nightlyBreakdown: nightlyPrices
      }
    });
  } catch (error) {
    console.error('Error calculating price:', error);
    res.status(500).json({ error: 'Failed to calculate price', message: error.message });
  }
});

/**
 * GET /api/pricing/simulate
 * Simulate pricing for date range (no bed required)
 */
router.get('/simulate', async (req, res) => {
  try {
    const { start_date, end_date, bed_type } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }

    // Get a sample bed
    let bedQuery = 'SELECT * FROM beds WHERE status = ? LIMIT 1';
    const params = ['available'];

    if (bed_type) {
      bedQuery = 'SELECT * FROM beds WHERE status = ? AND type = ? LIMIT 1';
      params.push(bed_type);
    }

    const bed = await dbGet(bedQuery, params);
    if (!bed) {
      return res.status(404).json({ error: 'No beds found for simulation' });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    const simulation = [];
    let totalBase = 0;
    let totalFinal = 0;

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const priceInfo = await calculateDynamicPrice(bed.id, date, 1);
      simulation.push({
        date: priceInfo.date,
        dayOfWeek: ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'][date.getDay()],
        basePrice: priceInfo.basePrice,
        finalPrice: priceInfo.finalPrice,
        season: priceInfo.season.type,
        rules: priceInfo.appliedRules.map(r => r.name).join(', ')
      });

      totalBase += priceInfo.basePrice;
      totalFinal += priceInfo.finalPrice;
    }

    res.json({
      success: true,
      simulation: {
        bedType: bed.type,
        basePrice: bed.price_per_night,
        days,
        totalBasePrice: totalBase,
        totalFinalPrice: totalFinal,
        averageDiscount: totalFinal < totalBase
          ? Math.round((1 - totalFinal / totalBase) * 100)
          : 0,
        averageIncrease: totalFinal > totalBase
          ? Math.round((totalFinal / totalBase - 1) * 100)
          : 0,
        dailyBreakdown: simulation
      }
    });
  } catch (error) {
    console.error('Error simulating prices:', error);
    res.status(500).json({ error: 'Failed to simulate prices' });
  }
});

// Export
module.exports = {
  router,
  initDb,
  initPricingTables,
  calculateDynamicPrice,
  getCurrentSeason
};
