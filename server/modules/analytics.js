/**
 * Analytics Module - Business Intelligence & Reporting
 *
 * Provides comprehensive analytics including:
 * - Revenue tracking
 * - Occupancy rates
 * - Booking trends
 * - Commission tracking
 * - Financial reports
 */

const express = require('express');
const router = express.Router();

/**
 * Helper: Get database adapter from request
 */
function getDb(req) {
  return req.app.locals.db;
}

/**
 * Helper: Parse date range from query params
 */
function parseDateRange(req) {
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month

  const startDate = req.query.start_date || defaultStart.toISOString().split('T')[0];
  const endDate = req.query.end_date || defaultEnd.toISOString().split('T')[0];

  return { startDate, endDate };
}

/**
 * GET /api/analytics/overview
 * Dashboard overview with key metrics
 */
router.get('/overview', async (req, res) => {
  const db = getDb(req);
  const { startDate, endDate } = parseDateRange(req);

  try {
    const isSqlite = !db.isProduction;

    // Total revenue
    const revenueQuery = isSqlite
      ? `SELECT COALESCE(SUM(amount), 0) as total_revenue
         FROM transactions
         WHERE type = 'payment'
         AND created_at BETWEEN ? AND ?`
      : `SELECT COALESCE(SUM(amount), 0) as total_revenue
         FROM transactions
         WHERE type = 'payment'
         AND created_at BETWEEN $1 AND $2`;

    const revenueResult = await db.get(revenueQuery, [startDate, endDate]);

    // Total bookings
    const bookingsQuery = isSqlite
      ? `SELECT COUNT(*) as total_bookings
         FROM bookings
         WHERE created_at BETWEEN ? AND ?`
      : `SELECT COUNT(*) as total_bookings
         FROM bookings
         WHERE created_at BETWEEN $1 AND $2`;

    const bookingsResult = await db.get(bookingsQuery, [startDate, endDate]);

    // Average occupancy
    const bedsQuery = `SELECT COUNT(*) as total_beds FROM beds`;
    const bedsResult = await db.get(bedsQuery);

    const occupiedQuery = isSqlite
      ? `SELECT COUNT(DISTINCT bed_id) as occupied_beds
         FROM bookings
         WHERE status IN ('confirmed', 'checked_in')
         AND check_in <= date('now')
         AND check_out >= date('now')`
      : `SELECT COUNT(DISTINCT bed_id) as occupied_beds
         FROM bookings
         WHERE status IN ('confirmed', 'checked_in')
         AND check_in <= CURRENT_DATE
         AND check_out >= CURRENT_DATE`;

    const occupiedResult = await db.get(occupiedQuery);

    const occupancyRate = bedsResult.total_beds > 0
      ? (occupiedResult.occupied_beds / bedsResult.total_beds) * 100
      : 0;

    // Average booking value
    const avgBookingQuery = isSqlite
      ? `SELECT COALESCE(AVG(total), 0) as avg_booking_value
         FROM bookings
         WHERE created_at BETWEEN ? AND ?`
      : `SELECT COALESCE(AVG(total), 0) as avg_booking_value
         FROM bookings
         WHERE created_at BETWEEN $1 AND $2`;

    const avgBookingResult = await db.get(avgBookingQuery, [startDate, endDate]);

    // Commission earned (from tours)
    const commissionsQuery = isSqlite
      ? `SELECT COALESCE(SUM(amount), 0) as total_commissions
         FROM tour_commissions
         WHERE earned_at BETWEEN ? AND ?`
      : `SELECT COALESCE(SUM(amount), 0) as total_commissions
         FROM tour_commissions
         WHERE earned_at BETWEEN $1 AND $2`;

    const commissionsResult = await db.get(commissionsQuery, [startDate, endDate]);

    res.json({
      date_range: { start: startDate, end: endDate },
      metrics: {
        total_revenue: parseFloat(revenueResult.total_revenue || 0),
        total_bookings: parseInt(bookingsResult.total_bookings || 0),
        occupancy_rate: parseFloat(occupancyRate.toFixed(2)),
        avg_booking_value: parseFloat(avgBookingResult.avg_booking_value || 0),
        total_commissions: parseFloat(commissionsResult.total_commissions || 0),
        total_beds: bedsResult.total_beds,
        occupied_beds: occupiedResult.occupied_beds
      }
    });

  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/revenue
 * Revenue breakdown and trends
 */
router.get('/revenue', async (req, res) => {
  const db = getDb(req);
  const { startDate, endDate } = parseDateRange(req);

  try {
    const isSqlite = !db.isProduction;

    // Revenue by day
    const dailyRevenueQuery = isSqlite
      ? `SELECT
           DATE(created_at) as date,
           SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END) as revenue,
           SUM(CASE WHEN type = 'charge' THEN amount ELSE 0 END) as charges,
           COUNT(*) as transactions
         FROM transactions
         WHERE created_at BETWEEN ? AND ?
         GROUP BY DATE(created_at)
         ORDER BY date`
      : `SELECT
           DATE(created_at) as date,
           SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END) as revenue,
           SUM(CASE WHEN type = 'charge' THEN amount ELSE 0 END) as charges,
           COUNT(*) as transactions
         FROM transactions
         WHERE created_at BETWEEN $1 AND $2
         GROUP BY DATE(created_at)
         ORDER BY date`;

    const dailyRevenue = await db.query(dailyRevenueQuery, [startDate, endDate]);

    // Revenue by payment method
    const methodQuery = isSqlite
      ? `SELECT
           method,
           SUM(amount) as total,
           COUNT(*) as count
         FROM transactions
         WHERE type = 'payment'
         AND created_at BETWEEN ? AND ?
         GROUP BY method
         ORDER BY total DESC`
      : `SELECT
           method,
           SUM(amount) as total,
           COUNT(*) as count
         FROM transactions
         WHERE type = 'payment'
         AND created_at BETWEEN $1 AND $2
         GROUP BY method
         ORDER BY total DESC`;

    const byMethod = await db.query(methodQuery, [startDate, endDate]);

    // Top revenue sources
    const sourcesQuery = isSqlite
      ? `SELECT
           b.source,
           COUNT(*) as bookings,
           SUM(b.total) as revenue
         FROM bookings b
         WHERE b.created_at BETWEEN ? AND ?
         AND b.source IS NOT NULL
         GROUP BY b.source
         ORDER BY revenue DESC
         LIMIT 10`
      : `SELECT
           b.source,
           COUNT(*) as bookings,
           SUM(b.total) as revenue
         FROM bookings b
         WHERE b.created_at BETWEEN $1 AND $2
         AND b.source IS NOT NULL
         GROUP BY b.source
         ORDER BY revenue DESC
         LIMIT 10`;

    const topSources = await db.query(sourcesQuery, [startDate, endDate]);

    res.json({
      date_range: { start: startDate, end: endDate },
      daily_revenue: dailyRevenue,
      by_payment_method: byMethod,
      top_sources: topSources
    });

  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/occupancy
 * Occupancy rate trends and forecasting
 */
router.get('/occupancy', async (req, res) => {
  const db = getDb(req);
  const { startDate, endDate } = parseDateRange(req);

  try {
    const isSqlite = !db.isProduction;

    // Total beds
    const totalBedsQuery = `SELECT COUNT(*) as total FROM beds`;
    const totalBedsResult = await db.get(totalBedsQuery);
    const totalBeds = totalBedsResult.total;

    // Occupancy by day
    const occupancyQuery = isSqlite
      ? `SELECT
           date_range.date,
           COUNT(DISTINCT b.bed_id) as occupied_beds,
           ? as total_beds,
           ROUND((COUNT(DISTINCT b.bed_id) * 100.0 / ?), 2) as occupancy_rate
         FROM (
           SELECT DATE(created_at) as date
           FROM bookings
           WHERE created_at BETWEEN ? AND ?
           GROUP BY DATE(created_at)
         ) date_range
         LEFT JOIN bookings b ON DATE(b.check_in) <= date_range.date
                              AND DATE(b.check_out) > date_range.date
                              AND b.status IN ('confirmed', 'checked_in')
         GROUP BY date_range.date
         ORDER BY date_range.date`
      : `SELECT
           date_range.date,
           COUNT(DISTINCT b.bed_id) as occupied_beds,
           $3 as total_beds,
           ROUND((COUNT(DISTINCT b.bed_id) * 100.0 / $4), 2) as occupancy_rate
         FROM (
           SELECT DATE(created_at) as date
           FROM bookings
           WHERE created_at BETWEEN $1 AND $2
           GROUP BY DATE(created_at)
         ) date_range
         LEFT JOIN bookings b ON DATE(b.check_in) <= date_range.date
                              AND DATE(b.check_out) > date_range.date
                              AND b.status IN ('confirmed', 'checked_in')
         GROUP BY date_range.date
         ORDER BY date_range.date`;

    const occupancyByDay = await db.query(occupancyQuery,
      isSqlite
        ? [totalBeds, totalBeds, startDate, endDate]
        : [startDate, endDate, totalBeds, totalBeds]
    );

    // Occupancy by room
    const roomOccupancyQuery = isSqlite
      ? `SELECT
           bd.room,
           COUNT(DISTINCT bd.id) as total_beds,
           COUNT(DISTINCT CASE WHEN b.status IN ('confirmed', 'checked_in')
                               AND b.check_in <= date('now')
                               AND b.check_out >= date('now')
                               THEN b.bed_id END) as occupied_beds,
           ROUND((COUNT(DISTINCT CASE WHEN b.status IN ('confirmed', 'checked_in')
                                      AND b.check_in <= date('now')
                                      AND b.check_out >= date('now')
                                      THEN b.bed_id END) * 100.0 /
                  COUNT(DISTINCT bd.id)), 2) as occupancy_rate
         FROM beds bd
         LEFT JOIN bookings b ON b.bed_id = bd.id
         GROUP BY bd.room
         ORDER BY occupancy_rate DESC`
      : `SELECT
           bd.room,
           COUNT(DISTINCT bd.id) as total_beds,
           COUNT(DISTINCT CASE WHEN b.status IN ('confirmed', 'checked_in')
                               AND b.check_in <= CURRENT_DATE
                               AND b.check_out >= CURRENT_DATE
                               THEN b.bed_id END) as occupied_beds,
           ROUND((COUNT(DISTINCT CASE WHEN b.status IN ('confirmed', 'checked_in')
                                      AND b.check_in <= CURRENT_DATE
                                      AND b.check_out >= CURRENT_DATE
                                      THEN b.bed_id END) * 100.0 /
                  COUNT(DISTINCT bd.id)), 2) as occupancy_rate
         FROM beds bd
         LEFT JOIN bookings b ON b.bed_id = bd.id
         GROUP BY bd.room
         ORDER BY occupancy_rate DESC`;

    const roomOccupancy = await db.query(roomOccupancyQuery);

    res.json({
      date_range: { start: startDate, end: endDate },
      total_beds: totalBeds,
      occupancy_by_day: occupancyByDay,
      occupancy_by_room: roomOccupancy
    });

  } catch (error) {
    console.error('Occupancy analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/bookings
 * Booking trends and patterns
 */
router.get('/bookings', async (req, res) => {
  const db = getDb(req);
  const { startDate, endDate } = parseDateRange(req);

  try {
    const isSqlite = !db.isProduction;

    // Bookings by status
    const statusQuery = isSqlite
      ? `SELECT
           status,
           COUNT(*) as count,
           SUM(total) as revenue
         FROM bookings
         WHERE created_at BETWEEN ? AND ?
         GROUP BY status
         ORDER BY count DESC`
      : `SELECT
           status,
           COUNT(*) as count,
           SUM(total) as revenue
         FROM bookings
         WHERE created_at BETWEEN $1 AND $2
         GROUP BY status
         ORDER BY count DESC`;

    const byStatus = await db.query(statusQuery, [startDate, endDate]);

    // Bookings by source
    const sourceQuery = isSqlite
      ? `SELECT
           source,
           COUNT(*) as count,
           AVG(nights) as avg_nights,
           SUM(total) as revenue
         FROM bookings
         WHERE created_at BETWEEN ? AND ?
         AND source IS NOT NULL
         GROUP BY source
         ORDER BY count DESC`
      : `SELECT
           source,
           COUNT(*) as count,
           AVG(nights) as avg_nights,
           SUM(total) as revenue
         FROM bookings
         WHERE created_at BETWEEN $1 AND $2
         AND source IS NOT NULL
         GROUP BY source
         ORDER BY count DESC`;

    const bySource = await db.query(sourceQuery, [startDate, endDate]);

    // Average length of stay
    const avgLosQuery = isSqlite
      ? `SELECT
           AVG(nights) as avg_nights,
           MIN(nights) as min_nights,
           MAX(nights) as max_nights
         FROM bookings
         WHERE created_at BETWEEN ? AND ?`
      : `SELECT
           AVG(nights) as avg_nights,
           MIN(nights) as min_nights,
           MAX(nights) as max_nights
         FROM bookings
         WHERE created_at BETWEEN $1 AND $2`;

    const avgLos = await db.get(avgLosQuery, [startDate, endDate]);

    // Daily bookings trend
    const dailyQuery = isSqlite
      ? `SELECT
           DATE(created_at) as date,
           COUNT(*) as bookings,
           SUM(total) as revenue
         FROM bookings
         WHERE created_at BETWEEN ? AND ?
         GROUP BY DATE(created_at)
         ORDER BY date`
      : `SELECT
           DATE(created_at) as date,
           COUNT(*) as bookings,
           SUM(total) as revenue
         FROM bookings
         WHERE created_at BETWEEN $1 AND $2
         GROUP BY DATE(created_at)
         ORDER BY date`;

    const dailyBookings = await db.query(dailyQuery, [startDate, endDate]);

    res.json({
      date_range: { start: startDate, end: endDate },
      by_status: byStatus,
      by_source: bySource,
      length_of_stay: avgLos,
      daily_trend: dailyBookings
    });

  } catch (error) {
    console.error('Bookings analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/commissions
 * Tour commission tracking
 */
router.get('/commissions', async (req, res) => {
  const db = getDb(req);
  const { startDate, endDate } = parseDateRange(req);

  try {
    const isSqlite = !db.isProduction;

    // Total commissions
    const totalQuery = isSqlite
      ? `SELECT
           COUNT(*) as total_sales,
           SUM(amount) as total_commissions
         FROM tour_commissions
         WHERE earned_at BETWEEN ? AND ?`
      : `SELECT
           COUNT(*) as total_sales,
           SUM(amount) as total_commissions
         FROM tour_commissions
         WHERE earned_at BETWEEN $1 AND $2`;

    const totals = await db.get(totalQuery, [startDate, endDate]);

    // Commissions by tour
    const byTourQuery = isSqlite
      ? `SELECT
           t.name,
           t.provider,
           COUNT(tc.id) as sales,
           SUM(tc.amount) as commissions
         FROM tour_commissions tc
         JOIN tours t ON t.id = tc.tour_id
         WHERE tc.earned_at BETWEEN ? AND ?
         GROUP BY t.id, t.name, t.provider
         ORDER BY commissions DESC
         LIMIT 10`
      : `SELECT
           t.name,
           t.provider,
           COUNT(tc.id) as sales,
           SUM(tc.amount) as commissions
         FROM tour_commissions tc
         JOIN tours t ON t.id = tc.tour_id
         WHERE tc.earned_at BETWEEN $1 AND $2
         GROUP BY t.id, t.name, t.provider
         ORDER BY commissions DESC
         LIMIT 10`;

    const byTour = await db.query(byTourQuery, [startDate, endDate]);

    // Tour clicks vs conversions
    const performanceQuery = isSqlite
      ? `SELECT
           t.name,
           t.clicks,
           COUNT(tc.id) as sales,
           ROUND((COUNT(tc.id) * 100.0 / NULLIF(t.clicks, 0)), 2) as conversion_rate
         FROM tours t
         LEFT JOIN tour_commissions tc ON tc.tour_id = t.id
                                       AND tc.earned_at BETWEEN ? AND ?
         WHERE t.active = 1
         GROUP BY t.id, t.name, t.clicks
         ORDER BY conversion_rate DESC
         LIMIT 10`
      : `SELECT
           t.name,
           t.clicks,
           COUNT(tc.id) as sales,
           ROUND((COUNT(tc.id) * 100.0 / NULLIF(t.clicks, 0)), 2) as conversion_rate
         FROM tours t
         LEFT JOIN tour_commissions tc ON tc.tour_id = t.id
                                       AND tc.earned_at BETWEEN $1 AND $2
         WHERE t.active = true
         GROUP BY t.id, t.name, t.clicks
         ORDER BY conversion_rate DESC
         LIMIT 10`;

    const performance = await db.query(performanceQuery, [startDate, endDate]);

    res.json({
      date_range: { start: startDate, end: endDate },
      totals: totals,
      by_tour: byTour,
      performance: performance
    });

  } catch (error) {
    console.error('Commissions analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
