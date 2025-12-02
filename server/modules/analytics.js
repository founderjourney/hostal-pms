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

// ============================================
// DEV3-08: ADVANCED METRICS
// ============================================

/**
 * GET /api/analytics/revpab
 * Revenue Per Available Bed (RevPAB)
 * Formula: Total Revenue / (Total Beds * Days)
 */
router.get('/revpab', async (req, res) => {
  const db = getDb(req);
  const { startDate, endDate } = parseDateRange(req);

  try {
    const isSqlite = !db.isProduction;

    // Calculate days in range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Get total beds
    const bedsQuery = `SELECT COUNT(*) as total_beds FROM beds WHERE status != 'out_of_service'`;
    const bedsResult = await db.get(bedsQuery);
    const totalBeds = bedsResult.total_beds || 1;

    // Get total revenue from bookings
    const revenueQuery = isSqlite
      ? `SELECT COALESCE(SUM(total), 0) as total_revenue
         FROM bookings
         WHERE status IN ('confirmed', 'checked_in', 'checked_out')
         AND check_in >= ? AND check_out <= ?`
      : `SELECT COALESCE(SUM(total), 0) as total_revenue
         FROM bookings
         WHERE status IN ('confirmed', 'checked_in', 'checked_out')
         AND check_in >= $1 AND check_out <= $2`;

    const revenueResult = await db.get(revenueQuery, [startDate, endDate]);
    const totalRevenue = parseFloat(revenueResult.total_revenue) || 0;

    // Calculate RevPAB
    const totalBedNights = totalBeds * days;
    const revpab = totalBedNights > 0 ? totalRevenue / totalBedNights : 0;

    // Get comparison with previous period
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - days);
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);

    const prevRevenueResult = await db.get(revenueQuery, [
      prevStart.toISOString().split('T')[0],
      prevEnd.toISOString().split('T')[0]
    ]);
    const prevRevenue = parseFloat(prevRevenueResult.total_revenue) || 0;
    const prevRevpab = totalBedNights > 0 ? prevRevenue / totalBedNights : 0;

    const changePercent = prevRevpab > 0
      ? ((revpab - prevRevpab) / prevRevpab) * 100
      : 0;

    res.json({
      success: true,
      metric: 'RevPAB',
      description: 'Revenue Per Available Bed',
      dateRange: { start: startDate, end: endDate },
      value: Math.round(revpab * 100) / 100,
      currency: 'COP',
      components: {
        totalRevenue,
        totalBeds,
        days,
        totalBedNights
      },
      comparison: {
        previousPeriod: Math.round(prevRevpab * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        trend: changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'stable'
      }
    });
  } catch (error) {
    console.error('RevPAB calculation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/adr
 * Average Daily Rate (ADR)
 * Formula: Total Room Revenue / Rooms Sold (bed-nights)
 */
router.get('/adr', async (req, res) => {
  const db = getDb(req);
  const { startDate, endDate } = parseDateRange(req);

  try {
    const isSqlite = !db.isProduction;

    // Get total revenue and nights sold
    const query = isSqlite
      ? `SELECT
           COALESCE(SUM(total), 0) as total_revenue,
           COALESCE(SUM(julianday(check_out) - julianday(check_in)), 0) as nights_sold
         FROM bookings
         WHERE status IN ('confirmed', 'checked_in', 'checked_out')
         AND check_in >= ? AND check_out <= ?`
      : `SELECT
           COALESCE(SUM(total), 0) as total_revenue,
           COALESCE(SUM(check_out - check_in), 0) as nights_sold
         FROM bookings
         WHERE status IN ('confirmed', 'checked_in', 'checked_out')
         AND check_in >= $1 AND check_out <= $2`;

    const result = await db.get(query, [startDate, endDate]);
    const totalRevenue = parseFloat(result.total_revenue) || 0;
    const nightsSold = parseInt(result.nights_sold) || 0;

    const adr = nightsSold > 0 ? totalRevenue / nightsSold : 0;

    // Daily breakdown
    const dailyQuery = isSqlite
      ? `SELECT
           date(check_in) as date,
           COALESCE(SUM(total), 0) as revenue,
           COUNT(*) as bookings
         FROM bookings
         WHERE status IN ('confirmed', 'checked_in', 'checked_out')
         AND check_in >= ? AND check_out <= ?
         GROUP BY date(check_in)
         ORDER BY date`
      : `SELECT
           DATE(check_in) as date,
           COALESCE(SUM(total), 0) as revenue,
           COUNT(*) as bookings
         FROM bookings
         WHERE status IN ('confirmed', 'checked_in', 'checked_out')
         AND check_in >= $1 AND check_out <= $2
         GROUP BY DATE(check_in)
         ORDER BY date`;

    const dailyBreakdown = await db.query(dailyQuery, [startDate, endDate]);

    res.json({
      success: true,
      metric: 'ADR',
      description: 'Average Daily Rate',
      dateRange: { start: startDate, end: endDate },
      value: Math.round(adr * 100) / 100,
      currency: 'COP',
      components: {
        totalRevenue,
        nightsSold,
        bookingsCount: dailyBreakdown.length
      },
      dailyBreakdown: dailyBreakdown.slice(0, 30) // Last 30 days
    });
  } catch (error) {
    console.error('ADR calculation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/los
 * Length of Stay (LOS)
 * Formula: Total Nights / Total Bookings
 */
router.get('/los', async (req, res) => {
  const db = getDb(req);
  const { startDate, endDate } = parseDateRange(req);

  try {
    const isSqlite = !db.isProduction;

    // Get average length of stay
    const query = isSqlite
      ? `SELECT
           COUNT(*) as total_bookings,
           COALESCE(SUM(julianday(check_out) - julianday(check_in)), 0) as total_nights,
           COALESCE(AVG(julianday(check_out) - julianday(check_in)), 0) as avg_los,
           MIN(julianday(check_out) - julianday(check_in)) as min_los,
           MAX(julianday(check_out) - julianday(check_in)) as max_los
         FROM bookings
         WHERE status IN ('confirmed', 'checked_in', 'checked_out')
         AND check_in >= ? AND check_out <= ?`
      : `SELECT
           COUNT(*) as total_bookings,
           COALESCE(SUM(check_out - check_in), 0) as total_nights,
           COALESCE(AVG(check_out - check_in), 0) as avg_los,
           MIN(check_out - check_in) as min_los,
           MAX(check_out - check_in) as max_los
         FROM bookings
         WHERE status IN ('confirmed', 'checked_in', 'checked_out')
         AND check_in >= $1 AND check_out <= $2`;

    const result = await db.get(query, [startDate, endDate]);

    // Distribution by length of stay
    const distributionQuery = isSqlite
      ? `SELECT
           CASE
             WHEN julianday(check_out) - julianday(check_in) = 1 THEN '1 night'
             WHEN julianday(check_out) - julianday(check_in) = 2 THEN '2 nights'
             WHEN julianday(check_out) - julianday(check_in) BETWEEN 3 AND 4 THEN '3-4 nights'
             WHEN julianday(check_out) - julianday(check_in) BETWEEN 5 AND 7 THEN '5-7 nights'
             ELSE '8+ nights'
           END as stay_length,
           COUNT(*) as count
         FROM bookings
         WHERE status IN ('confirmed', 'checked_in', 'checked_out')
         AND check_in >= ? AND check_out <= ?
         GROUP BY stay_length
         ORDER BY count DESC`
      : `SELECT
           CASE
             WHEN (check_out - check_in) = 1 THEN '1 night'
             WHEN (check_out - check_in) = 2 THEN '2 nights'
             WHEN (check_out - check_in) BETWEEN 3 AND 4 THEN '3-4 nights'
             WHEN (check_out - check_in) BETWEEN 5 AND 7 THEN '5-7 nights'
             ELSE '8+ nights'
           END as stay_length,
           COUNT(*) as count
         FROM bookings
         WHERE status IN ('confirmed', 'checked_in', 'checked_out')
         AND check_in >= $1 AND check_out <= $2
         GROUP BY stay_length
         ORDER BY count DESC`;

    const distribution = await db.query(distributionQuery, [startDate, endDate]);

    res.json({
      success: true,
      metric: 'LOS',
      description: 'Length of Stay',
      dateRange: { start: startDate, end: endDate },
      value: Math.round(parseFloat(result.avg_los) * 100) / 100,
      unit: 'nights',
      components: {
        totalBookings: parseInt(result.total_bookings) || 0,
        totalNights: parseInt(result.total_nights) || 0,
        minStay: parseInt(result.min_los) || 0,
        maxStay: parseInt(result.max_los) || 0
      },
      distribution
    });
  } catch (error) {
    console.error('LOS calculation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/booking-window
 * Booking Window / Lead Time
 * Formula: AVG(check_in - created_at)
 */
router.get('/booking-window', async (req, res) => {
  const db = getDb(req);
  const { startDate, endDate } = parseDateRange(req);

  try {
    const isSqlite = !db.isProduction;

    // Get average booking window
    const query = isSqlite
      ? `SELECT
           COUNT(*) as total_bookings,
           COALESCE(AVG(julianday(check_in) - julianday(created_at)), 0) as avg_window,
           MIN(julianday(check_in) - julianday(created_at)) as min_window,
           MAX(julianday(check_in) - julianday(created_at)) as max_window
         FROM bookings
         WHERE status IN ('confirmed', 'checked_in', 'checked_out')
         AND check_in >= ? AND check_out <= ?`
      : `SELECT
           COUNT(*) as total_bookings,
           COALESCE(AVG(check_in - DATE(created_at)), 0) as avg_window,
           MIN(check_in - DATE(created_at)) as min_window,
           MAX(check_in - DATE(created_at)) as max_window
         FROM bookings
         WHERE status IN ('confirmed', 'checked_in', 'checked_out')
         AND check_in >= $1 AND check_out <= $2`;

    const result = await db.get(query, [startDate, endDate]);

    // Distribution by booking window
    const distributionQuery = isSqlite
      ? `SELECT
           CASE
             WHEN julianday(check_in) - julianday(created_at) <= 0 THEN 'Same day'
             WHEN julianday(check_in) - julianday(created_at) BETWEEN 1 AND 3 THEN '1-3 days'
             WHEN julianday(check_in) - julianday(created_at) BETWEEN 4 AND 7 THEN '4-7 days'
             WHEN julianday(check_in) - julianday(created_at) BETWEEN 8 AND 14 THEN '1-2 weeks'
             WHEN julianday(check_in) - julianday(created_at) BETWEEN 15 AND 30 THEN '2-4 weeks'
             ELSE '1+ month'
           END as window_category,
           COUNT(*) as count
         FROM bookings
         WHERE status IN ('confirmed', 'checked_in', 'checked_out')
         AND check_in >= ? AND check_out <= ?
         GROUP BY window_category
         ORDER BY count DESC`
      : `SELECT
           CASE
             WHEN (check_in - DATE(created_at)) <= 0 THEN 'Same day'
             WHEN (check_in - DATE(created_at)) BETWEEN 1 AND 3 THEN '1-3 days'
             WHEN (check_in - DATE(created_at)) BETWEEN 4 AND 7 THEN '4-7 days'
             WHEN (check_in - DATE(created_at)) BETWEEN 8 AND 14 THEN '1-2 weeks'
             WHEN (check_in - DATE(created_at)) BETWEEN 15 AND 30 THEN '2-4 weeks'
             ELSE '1+ month'
           END as window_category,
           COUNT(*) as count
         FROM bookings
         WHERE status IN ('confirmed', 'checked_in', 'checked_out')
         AND check_in >= $1 AND check_out <= $2
         GROUP BY window_category
         ORDER BY count DESC`;

    const distribution = await db.query(distributionQuery, [startDate, endDate]);

    // Source breakdown (if available)
    const sourceQuery = isSqlite
      ? `SELECT
           COALESCE(source, 'direct') as source,
           COUNT(*) as count,
           COALESCE(AVG(julianday(check_in) - julianday(created_at)), 0) as avg_window
         FROM bookings
         WHERE status IN ('confirmed', 'checked_in', 'checked_out')
         AND check_in >= ? AND check_out <= ?
         GROUP BY source
         ORDER BY count DESC`
      : `SELECT
           COALESCE(source, 'direct') as source,
           COUNT(*) as count,
           COALESCE(AVG(check_in - DATE(created_at)), 0) as avg_window
         FROM bookings
         WHERE status IN ('confirmed', 'checked_in', 'checked_out')
         AND check_in >= $1 AND check_out <= $2
         GROUP BY source
         ORDER BY count DESC`;

    const bySource = await db.query(sourceQuery, [startDate, endDate]);

    res.json({
      success: true,
      metric: 'Booking Window',
      description: 'Average days between booking and check-in',
      dateRange: { start: startDate, end: endDate },
      value: Math.round(parseFloat(result.avg_window) * 100) / 100,
      unit: 'days',
      components: {
        totalBookings: parseInt(result.total_bookings) || 0,
        minWindow: Math.max(0, parseInt(result.min_window) || 0),
        maxWindow: parseInt(result.max_window) || 0
      },
      distribution,
      bySource: bySource.map(s => ({
        source: s.source,
        count: s.count,
        avgWindow: Math.round(parseFloat(s.avg_window) * 100) / 100
      }))
    });
  } catch (error) {
    console.error('Booking window calculation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/kpi-summary
 * All KPIs in one call
 */
router.get('/kpi-summary', async (req, res) => {
  const db = getDb(req);
  const { startDate, endDate } = parseDateRange(req);

  try {
    const isSqlite = !db.isProduction;

    // Get all metrics in one query
    const query = isSqlite
      ? `SELECT
           COUNT(*) as total_bookings,
           COALESCE(SUM(total), 0) as total_revenue,
           COALESCE(SUM(julianday(check_out) - julianday(check_in)), 0) as total_nights,
           COALESCE(AVG(julianday(check_out) - julianday(check_in)), 0) as avg_los,
           COALESCE(AVG(julianday(check_in) - julianday(created_at)), 0) as avg_booking_window
         FROM bookings
         WHERE status IN ('confirmed', 'checked_in', 'checked_out')
         AND check_in >= ? AND check_out <= ?`
      : `SELECT
           COUNT(*) as total_bookings,
           COALESCE(SUM(total), 0) as total_revenue,
           COALESCE(SUM(check_out - check_in), 0) as total_nights,
           COALESCE(AVG(check_out - check_in), 0) as avg_los,
           COALESCE(AVG(check_in - DATE(created_at)), 0) as avg_booking_window
         FROM bookings
         WHERE status IN ('confirmed', 'checked_in', 'checked_out')
         AND check_in >= $1 AND check_out <= $2`;

    const result = await db.get(query, [startDate, endDate]);

    // Get beds count
    const bedsResult = await db.get(`SELECT COUNT(*) as total_beds FROM beds WHERE status != 'out_of_service'`);

    // Calculate days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    const totalRevenue = parseFloat(result.total_revenue) || 0;
    const totalNights = parseInt(result.total_nights) || 0;
    const totalBeds = bedsResult.total_beds || 1;
    const totalBedNights = totalBeds * days;

    // Calculate occupancy
    const occupancyRate = totalBedNights > 0 ? (totalNights / totalBedNights) * 100 : 0;

    res.json({
      success: true,
      dateRange: { start: startDate, end: endDate, days },
      kpis: {
        revpab: {
          value: Math.round((totalRevenue / totalBedNights) * 100) / 100,
          label: 'Revenue Per Available Bed',
          currency: 'COP'
        },
        adr: {
          value: totalNights > 0 ? Math.round((totalRevenue / totalNights) * 100) / 100 : 0,
          label: 'Average Daily Rate',
          currency: 'COP'
        },
        los: {
          value: Math.round(parseFloat(result.avg_los) * 100) / 100,
          label: 'Length of Stay',
          unit: 'nights'
        },
        bookingWindow: {
          value: Math.round(parseFloat(result.avg_booking_window) * 100) / 100,
          label: 'Booking Window',
          unit: 'days'
        },
        occupancy: {
          value: Math.round(occupancyRate * 100) / 100,
          label: 'Occupancy Rate',
          unit: '%'
        },
        totalRevenue: {
          value: totalRevenue,
          label: 'Total Revenue',
          currency: 'COP'
        },
        totalBookings: {
          value: parseInt(result.total_bookings) || 0,
          label: 'Total Bookings'
        }
      }
    });
  } catch (error) {
    console.error('KPI summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DEV3-09: FORECASTING
// ============================================

/**
 * Helper: Get historical data for same period last year
 */
async function getHistoricalOccupancy(db, startDate, endDate, isSqlite) {
  // Calculate same period last year
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setFullYear(start.getFullYear() - 1);
  end.setFullYear(end.getFullYear() - 1);

  const query = isSqlite
    ? `SELECT
         date(check_in) as date,
         COUNT(DISTINCT bed_id) as occupied_beds
       FROM bookings
       WHERE status IN ('checked_out', 'checked_in', 'confirmed')
       AND check_in >= ? AND check_in <= ?
       GROUP BY date(check_in)`
    : `SELECT
         DATE(check_in) as date,
         COUNT(DISTINCT bed_id) as occupied_beds
       FROM bookings
       WHERE status IN ('checked_out', 'checked_in', 'confirmed')
       AND check_in >= $1 AND check_in <= $2
       GROUP BY DATE(check_in)`;

  return await db.query(query, [
    start.toISOString().split('T')[0],
    end.toISOString().split('T')[0]
  ]);
}

/**
 * Helper: Get trend from last 3 months
 */
async function getRecentTrend(db, isSqlite) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3);

  const query = isSqlite
    ? `SELECT
         strftime('%Y-%m', check_in) as month,
         COUNT(*) as bookings,
         COALESCE(SUM(total), 0) as revenue,
         COUNT(DISTINCT bed_id) as beds_sold
       FROM bookings
       WHERE status IN ('checked_out', 'checked_in', 'confirmed')
       AND check_in >= ? AND check_in <= ?
       GROUP BY strftime('%Y-%m', check_in)
       ORDER BY month`
    : `SELECT
         TO_CHAR(check_in, 'YYYY-MM') as month,
         COUNT(*) as bookings,
         COALESCE(SUM(total), 0) as revenue,
         COUNT(DISTINCT bed_id) as beds_sold
       FROM bookings
       WHERE status IN ('checked_out', 'checked_in', 'confirmed')
       AND check_in >= $1 AND check_in <= $2
       GROUP BY TO_CHAR(check_in, 'YYYY-MM')
       ORDER BY month`;

  return await db.query(query, [
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  ]);
}

/**
 * Helper: Get confirmed future reservations
 */
async function getFutureReservations(db, startDate, endDate, isSqlite) {
  const query = isSqlite
    ? `SELECT
         date(check_in) as date,
         COUNT(*) as bookings,
         COUNT(DISTINCT bed_id) as beds_reserved,
         COALESCE(SUM(total), 0) as revenue
       FROM bookings
       WHERE status IN ('confirmed', 'pending')
       AND check_in >= ? AND check_in <= ?
       GROUP BY date(check_in)
       ORDER BY date`
    : `SELECT
         DATE(check_in) as date,
         COUNT(*) as bookings,
         COUNT(DISTINCT bed_id) as beds_reserved,
         COALESCE(SUM(total), 0) as revenue
       FROM bookings
       WHERE status IN ('confirmed', 'pending')
       AND check_in >= $1 AND check_in <= $2
       GROUP BY DATE(check_in)
       ORDER BY date`;

  return await db.query(query, [startDate, endDate]);
}

/**
 * Helper: Calculate growth rate from trend data
 */
function calculateGrowthRate(trendData) {
  if (trendData.length < 2) return 0;

  const values = trendData.map(t => parseFloat(t.revenue) || 0);
  const firstValue = values[0] || 1;
  const lastValue = values[values.length - 1] || 0;

  return ((lastValue - firstValue) / firstValue) * 100;
}

/**
 * GET /api/analytics/forecast/occupancy
 * Forecast occupancy for next 30/60/90 days
 */
router.get('/forecast/occupancy', async (req, res) => {
  const db = getDb(req);
  const { days = 30 } = req.query;
  const forecastDays = Math.min(parseInt(days) || 30, 90);

  try {
    const isSqlite = !db.isProduction;
    const today = new Date();
    const forecastEnd = new Date(today);
    forecastEnd.setDate(forecastEnd.getDate() + forecastDays);

    // Get total beds
    const bedsResult = await db.get(`SELECT COUNT(*) as total_beds FROM beds WHERE status != 'out_of_service'`);
    const totalBeds = bedsResult.total_beds || 1;

    // Get confirmed future reservations
    const futureReservations = await getFutureReservations(
      db,
      today.toISOString().split('T')[0],
      forecastEnd.toISOString().split('T')[0],
      isSqlite
    );

    // Get historical data (same period last year)
    const historicalData = await getHistoricalOccupancy(
      db,
      today.toISOString().split('T')[0],
      forecastEnd.toISOString().split('T')[0],
      isSqlite
    );

    // Get recent trend
    const trendData = await getRecentTrend(db, isSqlite);
    const growthRate = calculateGrowthRate(trendData);

    // Build forecast by day
    const forecast = [];
    const confirmedByDate = new Map();
    futureReservations.forEach(r => {
      confirmedByDate.set(r.date, parseInt(r.beds_reserved) || 0);
    });

    const historicalByDate = new Map();
    historicalData.forEach(h => {
      // Adjust date to current year
      const histDate = new Date(h.date);
      histDate.setFullYear(today.getFullYear());
      const dateKey = histDate.toISOString().split('T')[0];
      historicalByDate.set(dateKey, parseInt(h.occupied_beds) || 0);
    });

    // Calculate average historical occupancy
    const avgHistoricalOccupancy = historicalData.length > 0
      ? historicalData.reduce((sum, h) => sum + (parseInt(h.occupied_beds) || 0), 0) / historicalData.length
      : totalBeds * 0.5; // Default 50% if no history

    for (let i = 0; i < forecastDays; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();

      // Get confirmed reservations for this date
      const confirmed = confirmedByDate.get(dateStr) || 0;

      // Get historical baseline
      const historical = historicalByDate.get(dateStr) || avgHistoricalOccupancy;

      // Apply weekend boost (typically higher occupancy)
      const weekendMultiplier = (dayOfWeek === 5 || dayOfWeek === 6) ? 1.15 : 1.0;

      // Apply growth trend
      const trendMultiplier = 1 + (growthRate / 100) * (i / forecastDays);

      // Calculate predicted occupancy
      // Weight: 60% confirmed, 30% historical, 10% trend
      let predictedBeds;
      if (confirmed > 0) {
        // We have real data, use it with slight adjustment for potential walk-ins
        predictedBeds = confirmed + Math.round(historical * 0.1 * trendMultiplier);
      } else {
        // No confirmed bookings, use historical with trend
        predictedBeds = Math.round(historical * weekendMultiplier * trendMultiplier);
      }

      // Cap at total beds
      predictedBeds = Math.min(predictedBeds, totalBeds);

      const occupancyRate = (predictedBeds / totalBeds) * 100;

      forecast.push({
        date: dateStr,
        dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek],
        confirmedBeds: confirmed,
        predictedBeds,
        totalBeds,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        confidence: confirmed > 0 ? 'high' : (historical > 0 ? 'medium' : 'low')
      });
    }

    // Calculate summary stats
    const avgOccupancy = forecast.reduce((sum, f) => sum + f.occupancyRate, 0) / forecast.length;
    const confirmedTotal = forecast.reduce((sum, f) => sum + f.confirmedBeds, 0);
    const predictedTotal = forecast.reduce((sum, f) => sum + f.predictedBeds, 0);

    res.json({
      success: true,
      forecast: {
        period: `${forecastDays} days`,
        startDate: today.toISOString().split('T')[0],
        endDate: forecastEnd.toISOString().split('T')[0],
        totalBeds,
        summary: {
          averageOccupancy: Math.round(avgOccupancy * 10) / 10,
          confirmedBedNights: confirmedTotal,
          predictedBedNights: predictedTotal,
          potentialBedNights: totalBeds * forecastDays,
          growthTrend: Math.round(growthRate * 10) / 10
        },
        daily: forecast,
        methodology: {
          factors: ['confirmed_reservations', 'historical_same_period', 'recent_trend', 'weekend_adjustment'],
          dataQuality: historicalData.length > 0 ? 'good' : 'limited'
        }
      }
    });
  } catch (error) {
    console.error('Occupancy forecast error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/forecast/revenue
 * Forecast revenue for next 30/60/90 days
 */
router.get('/forecast/revenue', async (req, res) => {
  const db = getDb(req);
  const { days = 30 } = req.query;
  const forecastDays = Math.min(parseInt(days) || 30, 90);

  try {
    const isSqlite = !db.isProduction;
    const today = new Date();
    const forecastEnd = new Date(today);
    forecastEnd.setDate(forecastEnd.getDate() + forecastDays);

    // Get average revenue per bed-night from last 3 months
    const avgRevenueQuery = isSqlite
      ? `SELECT
           COALESCE(AVG(total / NULLIF(julianday(check_out) - julianday(check_in), 0)), 0) as avg_revenue_per_night
         FROM bookings
         WHERE status IN ('checked_out', 'checked_in', 'confirmed')
         AND check_in >= date('now', '-90 days')`
      : `SELECT
           COALESCE(AVG(total / NULLIF(check_out - check_in, 0)), 0) as avg_revenue_per_night
         FROM bookings
         WHERE status IN ('checked_out', 'checked_in', 'confirmed')
         AND check_in >= CURRENT_DATE - INTERVAL '90 days'`;

    const avgResult = await db.get(avgRevenueQuery);
    const avgRevenuePerNight = parseFloat(avgResult.avg_revenue_per_night) || 50000; // Default COP

    // Get total beds
    const bedsResult = await db.get(`SELECT COUNT(*) as total_beds FROM beds WHERE status != 'out_of_service'`);
    const totalBeds = bedsResult.total_beds || 1;

    // Get confirmed future reservations with revenue
    const futureReservations = await getFutureReservations(
      db,
      today.toISOString().split('T')[0],
      forecastEnd.toISOString().split('T')[0],
      isSqlite
    );

    // Get recent trend
    const trendData = await getRecentTrend(db, isSqlite);
    const growthRate = calculateGrowthRate(trendData);

    // Get historical revenue (same period last year)
    const lastYearStart = new Date(today);
    lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
    const lastYearEnd = new Date(forecastEnd);
    lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);

    const historicalQuery = isSqlite
      ? `SELECT
           COALESCE(SUM(total), 0) as total_revenue,
           COUNT(*) as bookings
         FROM bookings
         WHERE status IN ('checked_out', 'checked_in', 'confirmed')
         AND check_in >= ? AND check_in <= ?`
      : `SELECT
           COALESCE(SUM(total), 0) as total_revenue,
           COUNT(*) as bookings
         FROM bookings
         WHERE status IN ('checked_out', 'checked_in', 'confirmed')
         AND check_in >= $1 AND check_in <= $2`;

    const historicalResult = await db.get(historicalQuery, [
      lastYearStart.toISOString().split('T')[0],
      lastYearEnd.toISOString().split('T')[0]
    ]);

    // Build revenue by date from confirmed reservations
    const confirmedByDate = new Map();
    futureReservations.forEach(r => {
      confirmedByDate.set(r.date, {
        revenue: parseFloat(r.revenue) || 0,
        beds: parseInt(r.beds_reserved) || 0
      });
    });

    // Calculate daily forecast
    const forecast = [];
    const historicalDailyRevenue = forecastDays > 0
      ? (parseFloat(historicalResult.total_revenue) || 0) / forecastDays
      : 0;

    for (let i = 0; i < forecastDays; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();

      const confirmed = confirmedByDate.get(dateStr) || { revenue: 0, beds: 0 };

      // Weekend multiplier for revenue
      const weekendMultiplier = (dayOfWeek === 5 || dayOfWeek === 6) ? 1.2 : 1.0;

      // Trend adjustment
      const trendMultiplier = 1 + (growthRate / 100) * (i / forecastDays);

      let predictedRevenue;
      if (confirmed.revenue > 0) {
        // Use confirmed revenue plus estimate for potential additional bookings
        const additionalBeds = Math.max(0, Math.round(totalBeds * 0.3) - confirmed.beds);
        const additionalRevenue = additionalBeds * avgRevenuePerNight * 0.3; // 30% chance of filling
        predictedRevenue = confirmed.revenue + additionalRevenue;
      } else {
        // No confirmed bookings, estimate based on historical + trend
        const baseRevenue = historicalDailyRevenue > 0
          ? historicalDailyRevenue
          : totalBeds * avgRevenuePerNight * 0.5; // 50% occupancy assumption

        predictedRevenue = baseRevenue * weekendMultiplier * trendMultiplier;
      }

      forecast.push({
        date: dateStr,
        dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek],
        confirmedRevenue: Math.round(confirmed.revenue),
        predictedRevenue: Math.round(predictedRevenue),
        confidence: confirmed.revenue > 0 ? 'high' : 'estimated'
      });
    }

    // Summary calculations
    const confirmedTotal = forecast.reduce((sum, f) => sum + f.confirmedRevenue, 0);
    const predictedTotal = forecast.reduce((sum, f) => sum + f.predictedRevenue, 0);
    const historicalTotal = parseFloat(historicalResult.total_revenue) || 0;

    // Calculate YoY growth
    const yoyGrowth = historicalTotal > 0
      ? ((predictedTotal - historicalTotal) / historicalTotal) * 100
      : 0;

    res.json({
      success: true,
      forecast: {
        period: `${forecastDays} days`,
        startDate: today.toISOString().split('T')[0],
        endDate: forecastEnd.toISOString().split('T')[0],
        currency: 'COP',
        summary: {
          confirmedRevenue: confirmedTotal,
          predictedRevenue: predictedTotal,
          historicalRevenue: historicalTotal,
          avgRevenuePerNight: Math.round(avgRevenuePerNight),
          yoyGrowth: Math.round(yoyGrowth * 10) / 10,
          recentTrend: Math.round(growthRate * 10) / 10
        },
        scenarios: {
          pessimistic: Math.round(predictedTotal * 0.7),
          expected: Math.round(predictedTotal),
          optimistic: Math.round(predictedTotal * 1.3)
        },
        daily: forecast,
        methodology: {
          factors: ['confirmed_reservations', 'historical_revenue', 'avg_rate', 'growth_trend', 'seasonality'],
          avgRateSource: 'last_90_days'
        }
      }
    });
  } catch (error) {
    console.error('Revenue forecast error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/forecast/summary
 * Combined forecast summary for dashboard
 */
router.get('/forecast/summary', async (req, res) => {
  const db = getDb(req);

  try {
    const isSqlite = !db.isProduction;
    const today = new Date();

    // Get total beds
    const bedsResult = await db.get(`SELECT COUNT(*) as total_beds FROM beds WHERE status != 'out_of_service'`);
    const totalBeds = bedsResult.total_beds || 1;

    // Get confirmed reservations for next 30 days
    const next30 = new Date(today);
    next30.setDate(next30.getDate() + 30);

    const confirmedQuery = isSqlite
      ? `SELECT
           COUNT(*) as bookings,
           COUNT(DISTINCT bed_id) as beds,
           COALESCE(SUM(total), 0) as revenue,
           COALESCE(SUM(julianday(check_out) - julianday(check_in)), 0) as nights
         FROM bookings
         WHERE status IN ('confirmed', 'pending')
         AND check_in >= ? AND check_in <= ?`
      : `SELECT
           COUNT(*) as bookings,
           COUNT(DISTINCT bed_id) as beds,
           COALESCE(SUM(total), 0) as revenue,
           COALESCE(SUM(check_out - check_in), 0) as nights
         FROM bookings
         WHERE status IN ('confirmed', 'pending')
         AND check_in >= $1 AND check_in <= $2`;

    const next30Data = await db.get(confirmedQuery, [
      today.toISOString().split('T')[0],
      next30.toISOString().split('T')[0]
    ]);

    // Next 60 and 90 days
    const next60 = new Date(today);
    next60.setDate(next60.getDate() + 60);
    const next90 = new Date(today);
    next90.setDate(next90.getDate() + 90);

    const next60Data = await db.get(confirmedQuery, [
      today.toISOString().split('T')[0],
      next60.toISOString().split('T')[0]
    ]);

    const next90Data = await db.get(confirmedQuery, [
      today.toISOString().split('T')[0],
      next90.toISOString().split('T')[0]
    ]);

    // Calculate occupancy rates based on confirmed
    const occ30 = ((parseInt(next30Data.nights) || 0) / (totalBeds * 30)) * 100;
    const occ60 = ((parseInt(next60Data.nights) || 0) / (totalBeds * 60)) * 100;
    const occ90 = ((parseInt(next90Data.nights) || 0) / (totalBeds * 90)) * 100;

    res.json({
      success: true,
      summary: {
        totalBeds,
        periods: {
          '30_days': {
            confirmedBookings: parseInt(next30Data.bookings) || 0,
            confirmedRevenue: parseFloat(next30Data.revenue) || 0,
            confirmedNights: parseInt(next30Data.nights) || 0,
            occupancyRate: Math.round(occ30 * 10) / 10,
            availableBedNights: totalBeds * 30 - (parseInt(next30Data.nights) || 0)
          },
          '60_days': {
            confirmedBookings: parseInt(next60Data.bookings) || 0,
            confirmedRevenue: parseFloat(next60Data.revenue) || 0,
            confirmedNights: parseInt(next60Data.nights) || 0,
            occupancyRate: Math.round(occ60 * 10) / 10,
            availableBedNights: totalBeds * 60 - (parseInt(next60Data.nights) || 0)
          },
          '90_days': {
            confirmedBookings: parseInt(next90Data.bookings) || 0,
            confirmedRevenue: parseFloat(next90Data.revenue) || 0,
            confirmedNights: parseInt(next90Data.nights) || 0,
            occupancyRate: Math.round(occ90 * 10) / 10,
            availableBedNights: totalBeds * 90 - (parseInt(next90Data.nights) || 0)
          }
        },
        currency: 'COP'
      }
    });
  } catch (error) {
    console.error('Forecast summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/occupancy/monthly
 * Monthly occupancy data for year-over-year comparison
 */
router.get('/occupancy/monthly', async (req, res) => {
  const db = getDb(req);
  const year = parseInt(req.query.year) || new Date().getFullYear();

  try {
    const isSqlite = !db.isProduction;

    // Get total beds
    const bedsResult = await db.get(`SELECT COUNT(*) as total_beds FROM beds WHERE status != 'out_of_service'`);
    const totalBeds = bedsResult.total_beds || 1;

    const monthlyData = [];

    for (let month = 1; month <= 12; month++) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      const daysInMonth = new Date(year, month, 0).getDate();

      const query = isSqlite
        ? `SELECT
             COUNT(DISTINCT bed_id) as beds_occupied,
             COALESCE(SUM(
               MIN(julianday(check_out), julianday(?)) -
               MAX(julianday(check_in), julianday(?))
             ), 0) as occupied_nights
           FROM bookings
           WHERE status IN ('checked_out', 'checked_in', 'confirmed')
           AND check_in <= ? AND check_out >= ?`
        : `SELECT
             COUNT(DISTINCT bed_id) as beds_occupied,
             COALESCE(SUM(
               LEAST(check_out, $1::date) - GREATEST(check_in, $2::date)
             ), 0) as occupied_nights
           FROM bookings
           WHERE status IN ('checked_out', 'checked_in', 'confirmed')
           AND check_in <= $3 AND check_out >= $4`;

      const result = await db.get(query, [endDate, startDate, endDate, startDate]);

      const occupiedNights = parseInt(result.occupied_nights) || 0;
      const totalBedNights = totalBeds * daysInMonth;
      const occupancy = totalBedNights > 0 ? (occupiedNights / totalBedNights) * 100 : 0;

      monthlyData.push({
        month,
        monthName: ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][month],
        occupancy: Math.round(occupancy * 10) / 10,
        occupiedNights,
        totalBedNights,
        bedsOccupied: parseInt(result.beds_occupied) || 0
      });
    }

    res.json({
      success: true,
      year,
      totalBeds,
      data: monthlyData
    });
  } catch (error) {
    console.error('Monthly occupancy error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/revenue/monthly
 * Monthly revenue data for year-over-year comparison
 */
router.get('/revenue/monthly', async (req, res) => {
  const db = getDb(req);
  const year = parseInt(req.query.year) || new Date().getFullYear();

  try {
    const isSqlite = !db.isProduction;

    const monthlyData = [];

    for (let month = 1; month <= 12; month++) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      const query = isSqlite
        ? `SELECT
             COUNT(*) as bookings,
             COALESCE(SUM(total), 0) as revenue,
             COALESCE(AVG(total), 0) as avg_booking
           FROM bookings
           WHERE status IN ('checked_out', 'checked_in', 'confirmed')
           AND check_in >= ? AND check_in <= ?`
        : `SELECT
             COUNT(*) as bookings,
             COALESCE(SUM(total), 0) as revenue,
             COALESCE(AVG(total), 0) as avg_booking
           FROM bookings
           WHERE status IN ('checked_out', 'checked_in', 'confirmed')
           AND check_in >= $1 AND check_in <= $2`;

      const result = await db.get(query, [startDate, endDate]);

      monthlyData.push({
        month,
        monthName: ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][month],
        revenue: parseFloat(result.revenue) || 0,
        bookings: parseInt(result.bookings) || 0,
        avgBooking: Math.round(parseFloat(result.avg_booking) || 0)
      });
    }

    const totalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
    const totalBookings = monthlyData.reduce((sum, m) => sum + m.bookings, 0);

    res.json({
      success: true,
      year,
      totals: {
        revenue: totalRevenue,
        bookings: totalBookings,
        avgBooking: totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0
      },
      data: monthlyData
    });
  } catch (error) {
    console.error('Monthly revenue error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/analytics/kpi-summary
 * Complete KPI summary with comparisons
 */
router.get('/kpi-summary', async (req, res) => {
  const db = getDb(req);
  const { startDate, endDate } = parseDateRange(req);

  try {
    const isSqlite = !db.isProduction;

    // Calculate date ranges for comparison
    const start = new Date(startDate);
    const end = new Date(endDate);
    const periodDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Previous period (same length, immediately before)
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - periodDays + 1);

    // Year-over-year (same dates last year)
    const yoyStart = new Date(start);
    yoyStart.setFullYear(yoyStart.getFullYear() - 1);
    const yoyEnd = new Date(end);
    yoyEnd.setFullYear(yoyEnd.getFullYear() - 1);

    const prevStartStr = prevStart.toISOString().split('T')[0];
    const prevEndStr = prevEnd.toISOString().split('T')[0];
    const yoyStartStr = yoyStart.toISOString().split('T')[0];
    const yoyEndStr = yoyEnd.toISOString().split('T')[0];

    // Get total beds
    const bedsResult = await db.get(`SELECT COUNT(*) as total_beds FROM beds WHERE status != 'out_of_service'`);
    const totalBeds = bedsResult.total_beds || 1;

    // Helper to get period metrics
    async function getPeriodMetrics(periodStart, periodEnd) {
      const bookingsQuery = isSqlite
        ? `SELECT
             COUNT(*) as bookings,
             COALESCE(SUM(total), 0) as revenue,
             COALESCE(AVG(total), 0) as avg_booking,
             COALESCE(SUM(julianday(check_out) - julianday(check_in)), 0) as total_nights,
             COALESCE(AVG(julianday(check_out) - julianday(check_in)), 0) as avg_los
           FROM bookings
           WHERE status IN ('confirmed', 'checked_in', 'checked_out')
           AND check_in >= ? AND check_out <= ?`
        : `SELECT
             COUNT(*) as bookings,
             COALESCE(SUM(total), 0) as revenue,
             COALESCE(AVG(total), 0) as avg_booking,
             COALESCE(SUM(check_out - check_in), 0) as total_nights,
             COALESCE(AVG(check_out - check_in), 0) as avg_los
           FROM bookings
           WHERE status IN ('confirmed', 'checked_in', 'checked_out')
           AND check_in >= $1 AND check_out <= $2`;

      const result = await db.get(bookingsQuery, [periodStart, periodEnd]);

      const totalNights = parseInt(result.total_nights) || 0;
      const periodDaysCalc = Math.ceil((new Date(periodEnd) - new Date(periodStart)) / (1000 * 60 * 60 * 24)) + 1;
      const totalBedNights = totalBeds * periodDaysCalc;
      const occupancy = totalBedNights > 0 ? (totalNights / totalBedNights) * 100 : 0;
      const revenue = parseFloat(result.revenue) || 0;
      const bookings = parseInt(result.bookings) || 0;
      const revpab = totalBedNights > 0 ? revenue / totalBedNights : 0;
      const adr = totalNights > 0 ? revenue / totalNights : 0;

      return {
        revenue,
        bookings,
        occupancy,
        adr,
        revpab,
        los: parseFloat(result.avg_los) || 0
      };
    }

    // Get metrics for all periods
    const current = await getPeriodMetrics(startDate, endDate);
    const previous = await getPeriodMetrics(prevStartStr, prevEndStr);
    const yoy = await getPeriodMetrics(yoyStartStr, yoyEndStr);

    // Calculate percentage changes
    function calcChange(current, previous) {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    }

    res.json({
      success: true,
      period: {
        start: startDate,
        end: endDate,
        days: periodDays
      },
      kpis: {
        revenue: {
          current: current.revenue,
          previous: previous.revenue,
          yoy: yoy.revenue,
          change: Math.round(calcChange(current.revenue, previous.revenue) * 10) / 10,
          yoyChange: Math.round(calcChange(current.revenue, yoy.revenue) * 10) / 10
        },
        occupancy: {
          current: Math.round(current.occupancy * 10) / 10,
          previous: Math.round(previous.occupancy * 10) / 10,
          yoy: Math.round(yoy.occupancy * 10) / 10,
          change: Math.round(calcChange(current.occupancy, previous.occupancy) * 10) / 10,
          yoyChange: Math.round(calcChange(current.occupancy, yoy.occupancy) * 10) / 10
        },
        bookings: {
          current: current.bookings,
          previous: previous.bookings,
          yoy: yoy.bookings,
          change: Math.round(calcChange(current.bookings, previous.bookings) * 10) / 10,
          yoyChange: Math.round(calcChange(current.bookings, yoy.bookings) * 10) / 10
        },
        adr: {
          current: Math.round(current.adr),
          previous: Math.round(previous.adr),
          change: Math.round(calcChange(current.adr, previous.adr) * 10) / 10
        },
        revpab: {
          current: Math.round(current.revpab),
          previous: Math.round(previous.revpab),
          change: Math.round(calcChange(current.revpab, previous.revpab) * 10) / 10
        },
        los: {
          current: Math.round(current.los * 10) / 10,
          previous: Math.round(previous.los * 10) / 10,
          change: Math.round(calcChange(current.los, previous.los) * 10) / 10
        }
      },
      totalBeds,
      currency: 'COP'
    });
  } catch (error) {
    console.error('KPI summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
