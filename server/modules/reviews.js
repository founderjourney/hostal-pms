/**
 * ============================================================
 * ALMANIK PMS - Guest Reviews Module
 * ============================================================
 * @version 1.0.0
 * @date 2025-11-28
 * @developer DEV4
 *
 * Sistema de reviews/feedback de huespedes post-checkout.
 *
 * Endpoints:
 * - GET    /                     - List all reviews (admin)
 * - GET    /:id                  - Get review details
 * - GET    /stats                - Review statistics
 * - GET    /public               - Public reviews (widget)
 * - POST   /                     - Submit new review (public)
 * - POST   /:id/respond          - Staff response to review
 * - PUT    /:id/visibility       - Toggle public/private
 * - GET    /token/:token         - Validate review token
 * - POST   /request/:bookingId   - Request review (send email)
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// ============================================================
// CONSTANTS
// ============================================================

const RATING_MIN = 1;
const RATING_MAX = 5;

const REVIEW_CATEGORIES = [
  'cleanliness',
  'location',
  'staff',
  'value',
  'facilities',
  'atmosphere'
];

const CATEGORY_LABELS = {
  cleanliness: 'Limpieza',
  location: 'Ubicacion',
  staff: 'Personal',
  value: 'Relacion Calidad/Precio',
  facilities: 'Instalaciones',
  atmosphere: 'Ambiente'
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getDb(req) {
  return req.app.locals.db;
}

function getUserId(req) {
  return req.session?.id || req.user?.id || null;
}

function generateReviewToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function logActivity(db, action, entityType, entityId, details, userId) {
  try {
    await db.query(
      `INSERT INTO activity_log (action_type, module, description, user_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [action, 'reviews', `${action} ${entityType} #${entityId}`, userId, JSON.stringify(details)]
    );
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

// ============================================================
// TABLE INITIALIZATION
// ============================================================

async function initializeReviewsTables(db) {
  const isProduction = db.isProduction;

  if (isProduction) {
    // PostgreSQL
    await db.query(`
      CREATE TABLE IF NOT EXISTS guest_reviews (
        id SERIAL PRIMARY KEY,
        guest_id INTEGER REFERENCES guests(id),
        booking_id INTEGER REFERENCES bookings(id),
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        category_ratings JSONB,
        review_token VARCHAR(64) UNIQUE,
        token_expires_at TIMESTAMP,
        staff_response TEXT,
        responded_by INTEGER,
        responded_at TIMESTAMP,
        is_public BOOLEAN DEFAULT true,
        is_verified BOOLEAN DEFAULT false,
        language VARCHAR(10) DEFAULT 'es',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await db.query(`CREATE INDEX IF NOT EXISTS idx_reviews_guest ON guest_reviews(guest_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_reviews_booking ON guest_reviews(booking_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_reviews_token ON guest_reviews(review_token)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_reviews_public ON guest_reviews(is_public)`);

    // Review requests tracking table
    await db.query(`
      CREATE TABLE IF NOT EXISTS review_requests (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER REFERENCES bookings(id),
        review_token VARCHAR(64) NOT NULL,
        sent_via VARCHAR(20) DEFAULT 'email',
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        opened_at TIMESTAMP,
        completed_at TIMESTAMP,
        reminder_sent_at TIMESTAMP
      )
    `);
  } else {
    // SQLite
    await db.run(`
      CREATE TABLE IF NOT EXISTS guest_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guest_id INTEGER REFERENCES guests(id),
        booking_id INTEGER REFERENCES bookings(id),
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        category_ratings TEXT,
        review_token TEXT UNIQUE,
        token_expires_at DATETIME,
        staff_response TEXT,
        responded_by INTEGER,
        responded_at DATETIME,
        is_public BOOLEAN DEFAULT 1,
        is_verified BOOLEAN DEFAULT 0,
        language TEXT DEFAULT 'es',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS review_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER REFERENCES bookings(id),
        review_token TEXT NOT NULL,
        sent_via TEXT DEFAULT 'email',
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        opened_at DATETIME,
        completed_at DATETIME,
        reminder_sent_at DATETIME
      )
    `);
  }

  console.log('✅ Reviews tables initialized');
}

// ============================================================
// ROUTES - PUBLIC (No auth required)
// ============================================================

/**
 * GET /public - Get public reviews for widget
 * Query params: limit (default 10), offset (default 0)
 */
router.get('/public', async (req, res) => {
  const db = getDb(req);
  const { limit = 10, offset = 0 } = req.query;
  const isProduction = db.isProduction;
  const trueVal = isProduction ? 'true' : '1';

  try {
    const reviews = await db.query(`
      SELECT
        r.id, r.rating, r.comment, r.category_ratings,
        r.staff_response, r.responded_at, r.created_at,
        g.name as guest_name
      FROM guest_reviews r
      LEFT JOIN guests g ON r.guest_id = g.id
      WHERE r.is_public = ${trueVal}
      ORDER BY r.created_at DESC
      LIMIT $1 OFFSET $2
    `, [parseInt(limit), parseInt(offset)]);

    // Get average rating - compatible with both PostgreSQL and SQLite
    const avgQuery = isProduction
      ? `SELECT COUNT(*) as total_reviews, ROUND(AVG(rating)::numeric, 1) as average_rating FROM guest_reviews WHERE is_public = true`
      : `SELECT COUNT(*) as total_reviews, ROUND(AVG(rating), 1) as average_rating FROM guest_reviews WHERE is_public = 1`;
    const stats = await db.get(avgQuery);

    res.json({
      success: true,
      data: {
        reviews: reviews.map(r => ({
          ...r,
          category_ratings: typeof r.category_ratings === 'string'
            ? JSON.parse(r.category_ratings)
            : r.category_ratings,
          // Anonymize name (show only first name + initial)
          guest_name: r.guest_name ? r.guest_name.split(' ')[0] + ' ' + (r.guest_name.split(' ')[1]?.[0] || '') + '.' : 'Anonimo'
        })),
        stats: {
          total: parseInt(stats?.total_reviews || 0),
          average: parseFloat(stats?.average_rating || 0)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching public reviews:', error);
    res.status(500).json({ success: false, error: 'Error al obtener reviews' });
  }
});

/**
 * GET /token/:token - Validate review token and get booking info
 */
router.get('/token/:token', async (req, res) => {
  const db = getDb(req);
  const { token } = req.params;

  try {
    // Check if token exists and is valid
    const request = await db.get(`
      SELECT
        rr.id, rr.booking_id, rr.sent_at, rr.completed_at,
        b.guest_id, b.check_in, b.check_out, b.bed_id,
        g.name as guest_name,
        bd.name as bed_name
      FROM review_requests rr
      JOIN bookings b ON rr.booking_id = b.id
      JOIN guests g ON b.guest_id = g.id
      LEFT JOIN beds bd ON b.bed_id = bd.id
      WHERE rr.review_token = $1
    `, [token]);

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Token invalido o expirado'
      });
    }

    if (request.completed_at) {
      return res.status(400).json({
        success: false,
        error: 'Ya has dejado tu review. Gracias!',
        already_completed: true
      });
    }

    // Mark as opened
    await db.run(`
      UPDATE review_requests
      SET opened_at = CURRENT_TIMESTAMP
      WHERE review_token = $1 AND opened_at IS NULL
    `, [token]);

    res.json({
      success: true,
      data: {
        guest_name: request.guest_name,
        check_in: request.check_in,
        check_out: request.check_out,
        bed_name: request.bed_name,
        booking_id: request.booking_id,
        categories: REVIEW_CATEGORIES.map(c => ({
          key: c,
          label: CATEGORY_LABELS[c]
        }))
      }
    });
  } catch (error) {
    console.error('Error validating token:', error);
    res.status(500).json({ success: false, error: 'Error al validar token' });
  }
});

/**
 * POST / - Submit new review (public, requires valid token)
 */
router.post('/', async (req, res) => {
  const db = getDb(req);
  const { token, rating, comment, category_ratings, language = 'es' } = req.body;

  // Validation
  if (!token) {
    return res.status(400).json({ success: false, error: 'Token requerido' });
  }

  if (!rating || rating < RATING_MIN || rating > RATING_MAX) {
    return res.status(400).json({
      success: false,
      error: `Rating debe ser entre ${RATING_MIN} y ${RATING_MAX}`
    });
  }

  try {
    // Get request info
    const request = await db.get(`
      SELECT rr.*, b.guest_id
      FROM review_requests rr
      JOIN bookings b ON rr.booking_id = b.id
      WHERE rr.review_token = $1 AND rr.completed_at IS NULL
    `, [token]);

    if (!request) {
      return res.status(400).json({
        success: false,
        error: 'Token invalido, expirado o ya utilizado'
      });
    }

    // Insert review
    const categoryRatingsJson = category_ratings
      ? (db.isProduction ? category_ratings : JSON.stringify(category_ratings))
      : null;

    const result = await db.run(`
      INSERT INTO guest_reviews
        (guest_id, booking_id, rating, comment, category_ratings, review_token, is_verified, language)
      VALUES ($1, $2, $3, $4, $5, $6, true, $7)
      RETURNING id
    `, [
      request.guest_id,
      request.booking_id,
      rating,
      comment || null,
      categoryRatingsJson,
      token,
      language
    ]);

    // Mark request as completed
    await db.run(`
      UPDATE review_requests
      SET completed_at = CURRENT_TIMESTAMP
      WHERE review_token = $1
    `, [token]);

    // Log activity
    await logActivity(db, 'CREATE', 'review', result.id, {
      booking_id: request.booking_id,
      rating,
      guest_id: request.guest_id
    }, null);

    res.status(201).json({
      success: true,
      message: 'Gracias por tu review!',
      data: { id: result.id }
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ success: false, error: 'Error al guardar review' });
  }
});

// ============================================================
// ROUTES - AUTHENTICATED (Admin/Staff)
// ============================================================

/**
 * GET / - List all reviews (admin)
 * Query params: rating, is_public, responded, limit, offset
 */
router.get('/', async (req, res) => {
  const db = getDb(req);
  const { rating, is_public, responded, limit = 50, offset = 0, sort = 'newest' } = req.query;

  try {
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (rating) {
      whereConditions.push(`r.rating = $${paramIndex++}`);
      params.push(parseInt(rating));
    }

    if (is_public !== undefined) {
      whereConditions.push(`r.is_public = $${paramIndex++}`);
      params.push(is_public === 'true');
    }

    if (responded !== undefined) {
      if (responded === 'true') {
        whereConditions.push(`r.staff_response IS NOT NULL`);
      } else {
        whereConditions.push(`r.staff_response IS NULL`);
      }
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const orderBy = sort === 'oldest' ? 'ASC' : 'DESC';

    params.push(parseInt(limit), parseInt(offset));

    const reviews = await db.query(`
      SELECT
        r.*,
        g.name as guest_name, g.email as guest_email,
        b.check_in, b.check_out, b.bed_id,
        bd.name as bed_name,
        u.name as responded_by_name
      FROM guest_reviews r
      LEFT JOIN guests g ON r.guest_id = g.id
      LEFT JOIN bookings b ON r.booking_id = b.id
      LEFT JOIN beds bd ON b.bed_id = bd.id
      LEFT JOIN users u ON r.responded_by = u.id
      ${whereClause}
      ORDER BY r.created_at ${orderBy}
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `, params);

    // Get total count
    const countResult = await db.get(`
      SELECT COUNT(*) as total FROM guest_reviews r ${whereClause}
    `, params.slice(0, -2));

    res.json({
      success: true,
      data: {
        reviews: reviews.map(r => ({
          ...r,
          category_ratings: typeof r.category_ratings === 'string'
            ? JSON.parse(r.category_ratings)
            : r.category_ratings
        })),
        pagination: {
          total: parseInt(countResult?.total || 0),
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ success: false, error: 'Error al obtener reviews' });
  }
});

/**
 * GET /stats - Review statistics
 */
router.get('/stats', async (req, res) => {
  const db = getDb(req);
  const isProduction = db.isProduction;

  try {
    // Stats query - compatible with both PostgreSQL and SQLite
    const statsQuery = isProduction
      ? `SELECT
          COUNT(*) as total_reviews,
          ROUND(AVG(rating)::numeric, 2) as average_rating,
          COUNT(CASE WHEN rating = 5 THEN 1 END) as five_stars,
          COUNT(CASE WHEN rating = 4 THEN 1 END) as four_stars,
          COUNT(CASE WHEN rating = 3 THEN 1 END) as three_stars,
          COUNT(CASE WHEN rating = 2 THEN 1 END) as two_stars,
          COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star,
          COUNT(CASE WHEN staff_response IS NOT NULL THEN 1 END) as responded,
          COUNT(CASE WHEN staff_response IS NULL THEN 1 END) as pending_response
        FROM guest_reviews`
      : `SELECT
          COUNT(*) as total_reviews,
          ROUND(AVG(rating), 2) as average_rating,
          COUNT(CASE WHEN rating = 5 THEN 1 END) as five_stars,
          COUNT(CASE WHEN rating = 4 THEN 1 END) as four_stars,
          COUNT(CASE WHEN rating = 3 THEN 1 END) as three_stars,
          COUNT(CASE WHEN rating = 2 THEN 1 END) as two_stars,
          COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star,
          COUNT(CASE WHEN staff_response IS NOT NULL THEN 1 END) as responded,
          COUNT(CASE WHEN staff_response IS NULL THEN 1 END) as pending_response
        FROM guest_reviews`;

    const stats = await db.get(statsQuery);

    // Get category averages
    const categoryStats = await db.query(`
      SELECT
        category_ratings
      FROM guest_reviews
      WHERE category_ratings IS NOT NULL
    `);

    // Calculate category averages
    let categoryAverages = {};
    REVIEW_CATEGORIES.forEach(cat => categoryAverages[cat] = { sum: 0, count: 0 });

    categoryStats.forEach(row => {
      const ratings = typeof row.category_ratings === 'string'
        ? JSON.parse(row.category_ratings)
        : row.category_ratings;

      if (ratings) {
        Object.keys(ratings).forEach(cat => {
          if (categoryAverages[cat]) {
            categoryAverages[cat].sum += ratings[cat];
            categoryAverages[cat].count++;
          }
        });
      }
    });

    const categoryAvg = {};
    Object.keys(categoryAverages).forEach(cat => {
      categoryAvg[cat] = categoryAverages[cat].count > 0
        ? (categoryAverages[cat].sum / categoryAverages[cat].count).toFixed(2)
        : null;
    });

    // Recent trend (last 30 days vs previous 30) - compatible with both DBs
    const trendQuery = isProduction
      ? `SELECT
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as last_30,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '60 days'
                     AND created_at < CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as prev_30,
          AVG(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN rating END) as avg_last_30,
          AVG(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '60 days'
                   AND created_at < CURRENT_DATE - INTERVAL '30 days' THEN rating END) as avg_prev_30
        FROM guest_reviews`
      : `SELECT
          COUNT(CASE WHEN created_at >= date('now', '-30 days') THEN 1 END) as last_30,
          COUNT(CASE WHEN created_at >= date('now', '-60 days')
                     AND created_at < date('now', '-30 days') THEN 1 END) as prev_30,
          AVG(CASE WHEN created_at >= date('now', '-30 days') THEN rating END) as avg_last_30,
          AVG(CASE WHEN created_at >= date('now', '-60 days')
                   AND created_at < date('now', '-30 days') THEN rating END) as avg_prev_30
        FROM guest_reviews`;

    const trend = await db.get(trendQuery);

    res.json({
      success: true,
      data: {
        total: parseInt(stats?.total_reviews || 0),
        average_rating: parseFloat(stats?.average_rating || 0),
        distribution: {
          5: parseInt(stats?.five_stars || 0),
          4: parseInt(stats?.four_stars || 0),
          3: parseInt(stats?.three_stars || 0),
          2: parseInt(stats?.two_stars || 0),
          1: parseInt(stats?.one_star || 0)
        },
        response_rate: {
          responded: parseInt(stats?.responded || 0),
          pending: parseInt(stats?.pending_response || 0)
        },
        category_averages: categoryAvg,
        trend: {
          reviews_last_30: parseInt(trend?.last_30 || 0),
          reviews_prev_30: parseInt(trend?.prev_30 || 0),
          avg_last_30: parseFloat(trend?.avg_last_30 || 0).toFixed(2),
          avg_prev_30: parseFloat(trend?.avg_prev_30 || 0).toFixed(2)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching review stats:', error);
    res.status(500).json({ success: false, error: 'Error al obtener estadisticas' });
  }
});

/**
 * GET /:id - Get review details
 */
router.get('/:id', async (req, res) => {
  const db = getDb(req);
  const { id } = req.params;

  try {
    const review = await db.get(`
      SELECT
        r.*,
        g.name as guest_name, g.email as guest_email, g.phone as guest_phone,
        b.check_in, b.check_out, b.total as booking_total, b.nights,
        bd.name as bed_name,
        u.name as responded_by_name
      FROM guest_reviews r
      LEFT JOIN guests g ON r.guest_id = g.id
      LEFT JOIN bookings b ON r.booking_id = b.id
      LEFT JOIN beds bd ON b.bed_id = bd.id
      LEFT JOIN users u ON r.responded_by = u.id
      WHERE r.id = $1
    `, [id]);

    if (!review) {
      return res.status(404).json({ success: false, error: 'Review no encontrado' });
    }

    review.category_ratings = typeof review.category_ratings === 'string'
      ? JSON.parse(review.category_ratings)
      : review.category_ratings;

    res.json({ success: true, data: review });
  } catch (error) {
    console.error('Error fetching review:', error);
    res.status(500).json({ success: false, error: 'Error al obtener review' });
  }
});

/**
 * POST /:id/respond - Staff response to review
 */
router.post('/:id/respond', async (req, res) => {
  const db = getDb(req);
  const { id } = req.params;
  const { response } = req.body;
  const userId = getUserId(req);

  if (!response || response.trim() === '') {
    return res.status(400).json({ success: false, error: 'Respuesta requerida' });
  }

  try {
    const review = await db.get(`SELECT id, staff_response FROM guest_reviews WHERE id = $1`, [id]);

    if (!review) {
      return res.status(404).json({ success: false, error: 'Review no encontrado' });
    }

    await db.run(`
      UPDATE guest_reviews
      SET staff_response = $1, responded_by = $2, responded_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [response.trim(), userId, id]);

    await logActivity(db, 'RESPOND', 'review', id, { response: response.trim() }, userId);

    res.json({
      success: true,
      message: 'Respuesta guardada',
      data: { id, response: response.trim() }
    });
  } catch (error) {
    console.error('Error responding to review:', error);
    res.status(500).json({ success: false, error: 'Error al guardar respuesta' });
  }
});

/**
 * PUT /:id/visibility - Toggle public/private
 */
router.put('/:id/visibility', async (req, res) => {
  const db = getDb(req);
  const { id } = req.params;
  const { is_public } = req.body;
  const userId = getUserId(req);

  try {
    const review = await db.get(`SELECT id, is_public FROM guest_reviews WHERE id = $1`, [id]);

    if (!review) {
      return res.status(404).json({ success: false, error: 'Review no encontrado' });
    }

    const newVisibility = is_public !== undefined ? is_public : !review.is_public;

    await db.run(`UPDATE guest_reviews SET is_public = $1 WHERE id = $2`, [newVisibility, id]);

    await logActivity(db, 'UPDATE_VISIBILITY', 'review', id, { is_public: newVisibility }, userId);

    res.json({
      success: true,
      message: newVisibility ? 'Review ahora es publico' : 'Review ahora es privado',
      data: { id, is_public: newVisibility }
    });
  } catch (error) {
    console.error('Error updating visibility:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar visibilidad' });
  }
});

/**
 * POST /request/:bookingId - Create review request (send email later)
 */
router.post('/request/:bookingId', async (req, res) => {
  const db = getDb(req);
  const { bookingId } = req.params;
  const userId = getUserId(req);

  try {
    // Check booking exists
    const booking = await db.get(`
      SELECT b.id, b.guest_id, b.check_out, g.name, g.email
      FROM bookings b
      JOIN guests g ON b.guest_id = g.id
      WHERE b.id = $1
    `, [bookingId]);

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Reserva no encontrada' });
    }

    // Check if request already exists
    const existingRequest = await db.get(`
      SELECT id FROM review_requests WHERE booking_id = $1
    `, [bookingId]);

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe una solicitud de review para esta reserva'
      });
    }

    // Generate token
    const token = generateReviewToken();

    // Create request
    const result = await db.run(`
      INSERT INTO review_requests (booking_id, review_token)
      VALUES ($1, $2)
      RETURNING id
    `, [bookingId, token]);

    await logActivity(db, 'CREATE', 'review_request', result.id, {
      booking_id: bookingId,
      guest_name: booking.name
    }, userId);

    // TODO: Send email when DEV1 completes SendGrid integration
    // For now, return the token for manual sharing

    res.status(201).json({
      success: true,
      message: 'Solicitud de review creada',
      data: {
        id: result.id,
        token,
        review_url: `/review.html?token=${token}`,
        guest_name: booking.name,
        guest_email: booking.email
      }
    });
  } catch (error) {
    console.error('Error creating review request:', error);
    res.status(500).json({ success: false, error: 'Error al crear solicitud' });
  }
});

// ============================================================
// EXPORT FOR SOCIAL MEDIA
// ============================================================

/**
 * GET /:id/export - Export review for social media
 * Query param: format = text|instagram|twitter|facebook
 */
router.get('/:id/export', async (req, res) => {
  const db = getDb(req);
  const { id } = req.params;
  const { format = 'text' } = req.query;

  try {
    const review = await db.get(`
      SELECT
        r.rating, r.comment, r.created_at,
        g.name as guest_name
      FROM guest_reviews r
      LEFT JOIN guests g ON r.guest_id = g.id
      WHERE r.id = $1 AND r.is_public = ${db.isProduction ? 'true' : '1'}
    `, [id]);

    if (!review) {
      return res.status(404).json({ success: false, error: 'Review no encontrado o no es publico' });
    }

    const stars = '⭐'.repeat(review.rating);
    const guestName = review.guest_name ? review.guest_name.split(' ')[0] : 'Huesped';
    const date = new Date(review.created_at).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

    let exportData = {};

    switch (format) {
      case 'instagram':
        exportData = {
          caption: `${stars}\n\n"${review.comment || 'Excelente estadia!'}"\n\n— ${guestName}, ${date}\n\n#hostel #travel #backpacker #colombia #viajeros #reviews`,
          hashtags: ['hostel', 'travel', 'backpacker', 'colombia', 'viajeros', 'reviews'],
          image_text: `"${truncateText(review.comment || 'Excelente estadia!', 150)}"`,
          author: guestName,
          rating: review.rating
        };
        break;

      case 'twitter':
        const tweetText = review.comment
          ? truncateText(review.comment, 200)
          : 'Excelente estadia!';
        exportData = {
          tweet: `${stars} "${tweetText}" — ${guestName} #hostel #travel`,
          characters: (`${stars} "${tweetText}" — ${guestName} #hostel #travel`).length
        };
        break;

      case 'facebook':
        exportData = {
          post: `${stars}\n\nLo que dicen nuestros huespedes:\n\n"${review.comment || 'Excelente estadia!'}"\n\n— ${guestName}, ${date}\n\nGracias por elegirnos! 🙏`,
          link_preview: {
            title: `${review.rating}/5 - Review de ${guestName}`,
            description: truncateText(review.comment || 'Excelente estadia!', 100)
          }
        };
        break;

      case 'text':
      default:
        exportData = {
          plain_text: `${stars} (${review.rating}/5)\n\n"${review.comment || 'Excelente estadia!'}"\n\n— ${guestName}, ${date}`,
          quote: review.comment || 'Excelente estadia!',
          author: guestName,
          rating: review.rating,
          date: date
        };
    }

    res.json({
      success: true,
      data: {
        format,
        review_id: parseInt(id),
        ...exportData
      }
    });
  } catch (error) {
    console.error('Error exporting review:', error);
    res.status(500).json({ success: false, error: 'Error al exportar review' });
  }
});

/**
 * GET /export/best - Get best reviews formatted for export
 * Query: limit (default 5), min_rating (default 4)
 */
router.get('/export/best', async (req, res) => {
  const db = getDb(req);
  const { limit = 5, min_rating = 4 } = req.query;
  const trueVal = db.isProduction ? 'true' : '1';

  try {
    const reviews = await db.query(`
      SELECT
        r.id, r.rating, r.comment, r.created_at,
        g.name as guest_name
      FROM guest_reviews r
      LEFT JOIN guests g ON r.guest_id = g.id
      WHERE r.is_public = ${trueVal}
        AND r.rating >= $1
        AND r.comment IS NOT NULL
        AND r.comment != ''
      ORDER BY r.rating DESC, r.created_at DESC
      LIMIT $2
    `, [parseInt(min_rating), parseInt(limit)]);

    const formatted = reviews.map(r => {
      const stars = '⭐'.repeat(r.rating);
      const guestName = r.guest_name ? r.guest_name.split(' ')[0] : 'Huesped';
      return {
        id: r.id,
        stars,
        rating: r.rating,
        quote: r.comment,
        author: guestName,
        date: new Date(r.created_at).toLocaleDateString('es-CO', { month: 'short', year: 'numeric' }),
        instagram: `${stars}\n\n"${truncateText(r.comment, 150)}"\n\n— ${guestName}`,
        twitter: `${stars} "${truncateText(r.comment, 180)}" — ${guestName}`
      };
    });

    res.json({
      success: true,
      data: {
        count: formatted.length,
        reviews: formatted
      }
    });
  } catch (error) {
    console.error('Error fetching best reviews:', error);
    res.status(500).json({ success: false, error: 'Error al obtener reviews' });
  }
});

// Helper function
function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = router;
module.exports.initializeReviewsTables = initializeReviewsTables;
module.exports.REVIEW_CATEGORIES = REVIEW_CATEGORIES;
module.exports.CATEGORY_LABELS = CATEGORY_LABELS;
