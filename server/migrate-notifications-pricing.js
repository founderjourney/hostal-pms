/**
 * ============================================================
 * ALMANIK PMS - Notifications & Pricing Migration
 * ============================================================
 *
 * Crea las tablas faltantes para notificaciones push y pricing dinamico.
 *
 * TABLAS:
 * - push_subscriptions: Suscripciones de push notifications
 * - notification_history: Historial de notificaciones enviadas
 * - seasons: Temporadas para pricing dinamico
 * - pricing_rules: Reglas de precios
 * - price_history: Historial de precios aplicados
 *
 * Run: node server/migrate-notifications-pricing.js
 *
 * @author DEV3 - Business Logic
 * @version 1.0.0
 * @date 2025-11-29
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'almanik.db');
const db = new sqlite3.Database(dbPath);

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   ALMANIK PMS - Notifications & Pricing Migration         ║');
console.log('╠════════════════════════════════════════════════════════════╣');
console.log('║  Tables: push_subscriptions, notification_history,        ║');
console.log('║          seasons, pricing_rules, price_history            ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('📍 Database:', dbPath);
console.log('🔄 Starting migration...\n');

// ============================================================
// PUSH SUBSCRIPTIONS TABLE
// ============================================================
const createPushSubscriptionsSQL = `
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- User reference
  user_id INTEGER REFERENCES users(id),

  -- Push subscription data (from browser)
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,

  -- Metadata
  user_agent TEXT,
  device_type TEXT DEFAULT 'unknown',

  -- Status
  is_active INTEGER DEFAULT 1,

  -- Timestamps
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_used_at TEXT
);
`;

// ============================================================
// NOTIFICATION HISTORY TABLE
// ============================================================
const createNotificationHistorySQL = `
CREATE TABLE IF NOT EXISTS notification_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Target
  subscription_id INTEGER REFERENCES push_subscriptions(id),
  user_id INTEGER REFERENCES users(id),

  -- Notification content
  title TEXT NOT NULL,
  body TEXT,
  icon TEXT,
  url TEXT,
  data TEXT,

  -- Type/Category
  notification_type TEXT DEFAULT 'general',

  -- Status
  status TEXT DEFAULT 'pending',
  error_message TEXT,

  -- Timestamps
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  sent_at TEXT,
  read_at TEXT
);
`;

// ============================================================
// SEASONS TABLE
// ============================================================
const createSeasonsSQL = `
CREATE TABLE IF NOT EXISTS seasons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Season info
  name TEXT NOT NULL,
  season_type TEXT NOT NULL DEFAULT 'medium',

  -- Date range (month-day format for yearly recurrence)
  start_month INTEGER NOT NULL,
  start_day INTEGER NOT NULL,
  end_month INTEGER NOT NULL,
  end_day INTEGER NOT NULL,

  -- Price modifier
  price_modifier REAL DEFAULT 1.0,

  -- Description
  description TEXT,

  -- Status
  is_active INTEGER DEFAULT 1,

  -- Timestamps
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`;

// ============================================================
// PRICING RULES TABLE
// ============================================================
const createPricingRulesSQL = `
CREATE TABLE IF NOT EXISTS pricing_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Rule identification
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL DEFAULT 'modifier',

  -- Scope (what this rule applies to)
  bed_type TEXT,
  room_id INTEGER,
  bed_id INTEGER,

  -- Conditions
  day_of_week TEXT,
  min_occupancy REAL,
  max_occupancy REAL,
  min_stay_nights INTEGER,
  max_stay_nights INTEGER,
  booking_window_days INTEGER,

  -- Price modification
  modifier_type TEXT DEFAULT 'percentage',
  modifier_value REAL NOT NULL DEFAULT 0,

  -- Priority (higher = applied later)
  priority INTEGER DEFAULT 0,

  -- Validity period
  valid_from TEXT,
  valid_until TEXT,

  -- Status
  is_active INTEGER DEFAULT 1,

  -- Timestamps
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`;

// ============================================================
// PRICE HISTORY TABLE
// ============================================================
const createPriceHistorySQL = `
CREATE TABLE IF NOT EXISTS price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- What was priced
  booking_id INTEGER REFERENCES bookings(id),
  bed_id INTEGER REFERENCES beds(id),

  -- Date priced
  price_date TEXT NOT NULL,

  -- Prices
  base_price REAL NOT NULL,
  final_price REAL NOT NULL,

  -- Rules applied (JSON array of rule IDs and their effects)
  rules_applied TEXT,

  -- Season that was active
  season_id INTEGER REFERENCES seasons(id),

  -- Occupancy at time of calculation
  occupancy_rate REAL,

  -- Timestamps
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`;

// ============================================================
// DEFAULT SEASONS DATA
// ============================================================
const defaultSeasons = [
  {
    name: 'Temporada Alta',
    season_type: 'high',
    start_month: 12, start_day: 15,
    end_month: 1, end_day: 15,
    price_modifier: 1.25,
    description: 'Navidad y Año Nuevo'
  },
  {
    name: 'Semana Santa',
    season_type: 'high',
    start_month: 3, start_day: 20,
    end_month: 4, end_day: 10,
    price_modifier: 1.20,
    description: 'Semana Santa (fechas aproximadas)'
  },
  {
    name: 'Temporada Media',
    season_type: 'medium',
    start_month: 6, start_day: 1,
    end_month: 8, end_day: 31,
    price_modifier: 1.10,
    description: 'Vacaciones de verano'
  },
  {
    name: 'Temporada Baja',
    season_type: 'low',
    start_month: 2, start_day: 1,
    end_month: 3, end_day: 15,
    price_modifier: 0.85,
    description: 'Febrero - Marzo (antes de Semana Santa)'
  },
  {
    name: 'Temporada Regular',
    season_type: 'regular',
    start_month: 9, start_day: 1,
    end_month: 11, end_day: 30,
    price_modifier: 1.0,
    description: 'Septiembre - Noviembre'
  }
];

// ============================================================
// DEFAULT PRICING RULES DATA
// ============================================================
const defaultPricingRules = [
  {
    name: 'Fin de semana',
    rule_type: 'day_of_week',
    day_of_week: '5,6',
    modifier_type: 'percentage',
    modifier_value: 10,
    priority: 1,
    description: 'Viernes y Sábado +10%'
  },
  {
    name: 'Alta ocupación (>80%)',
    rule_type: 'occupancy',
    min_occupancy: 0.80,
    modifier_type: 'percentage',
    modifier_value: 15,
    priority: 2,
    description: 'Cuando ocupación supera 80%'
  },
  {
    name: 'Última hora (<24h)',
    rule_type: 'booking_window',
    booking_window_days: 1,
    modifier_type: 'percentage',
    modifier_value: -10,
    priority: 3,
    description: 'Reserva con menos de 24h de anticipación'
  },
  {
    name: 'Estancia larga (7+ noches)',
    rule_type: 'length_of_stay',
    min_stay_nights: 7,
    modifier_type: 'percentage',
    modifier_value: -15,
    priority: 4,
    description: 'Descuento por estancia larga'
  }
];

// ============================================================
// EXECUTE MIGRATION
// ============================================================

db.serialize(() => {
  // Create tables
  console.log('📦 Creating push_subscriptions table...');
  db.run(createPushSubscriptionsSQL, (err) => {
    if (err) {
      console.error('   ❌ Error:', err.message);
    } else {
      console.log('   ✅ push_subscriptions created');
    }
  });

  console.log('📦 Creating notification_history table...');
  db.run(createNotificationHistorySQL, (err) => {
    if (err) {
      console.error('   ❌ Error:', err.message);
    } else {
      console.log('   ✅ notification_history created');
    }
  });

  console.log('📦 Creating seasons table...');
  db.run(createSeasonsSQL, (err) => {
    if (err) {
      console.error('   ❌ Error:', err.message);
    } else {
      console.log('   ✅ seasons created');
    }
  });

  console.log('📦 Creating pricing_rules table...');
  db.run(createPricingRulesSQL, (err) => {
    if (err) {
      console.error('   ❌ Error:', err.message);
    } else {
      console.log('   ✅ pricing_rules created');
    }
  });

  console.log('📦 Creating price_history table...');
  db.run(createPriceHistorySQL, (err) => {
    if (err) {
      console.error('   ❌ Error:', err.message);
    } else {
      console.log('   ✅ price_history created');
    }
  });

  // Create indexes
  console.log('\n📊 Creating indexes...');

  db.run('CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active)');
  db.run('CREATE INDEX IF NOT EXISTS idx_notification_history_user ON notification_history(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_notification_history_type ON notification_history(notification_type)');
  db.run('CREATE INDEX IF NOT EXISTS idx_notification_history_status ON notification_history(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_seasons_active ON seasons(is_active)');
  db.run('CREATE INDEX IF NOT EXISTS idx_seasons_type ON seasons(season_type)');
  db.run('CREATE INDEX IF NOT EXISTS idx_pricing_rules_active ON pricing_rules(is_active)');
  db.run('CREATE INDEX IF NOT EXISTS idx_pricing_rules_type ON pricing_rules(rule_type)');
  db.run('CREATE INDEX IF NOT EXISTS idx_price_history_booking ON price_history(booking_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_history(price_date)');

  console.log('   ✅ Indexes created');

  // Insert default seasons (check if already exists first)
  console.log('\n🌴 Inserting default seasons...');

  db.get("SELECT COUNT(*) as count FROM seasons", (err, row) => {
    if (err || row.count > 0) {
      console.log('   ⚠️  Seasons already populated, skipping...');
      return;
    }

    const insertSeasonSQL = `
      INSERT INTO seasons
      (name, season_type, start_month, start_day, end_month, end_day, price_modifier, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

  defaultSeasons.forEach((season, index) => {
    db.run(insertSeasonSQL, [
      season.name,
      season.season_type,
      season.start_month,
      season.start_day,
      season.end_month,
      season.end_day,
      season.price_modifier,
      season.description
    ], function(err) {
      if (err) {
        console.log(`   ⚠️  Season "${season.name}" may already exist`);
      } else if (this.changes > 0) {
        console.log(`   ✅ Added: ${season.name} (${season.season_type})`);
      }
    });
  });

  // Insert default pricing rules
  console.log('\n💰 Inserting default pricing rules...');
  const insertRuleSQL = `
    INSERT OR IGNORE INTO pricing_rules
    (name, rule_type, day_of_week, min_occupancy, booking_window_days, min_stay_nights, modifier_type, modifier_value, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  defaultPricingRules.forEach((rule) => {
    db.run(insertRuleSQL, [
      rule.name,
      rule.rule_type,
      rule.day_of_week || null,
      rule.min_occupancy || null,
      rule.booking_window_days || null,
      rule.min_stay_nights || null,
      rule.modifier_type,
      rule.modifier_value,
      rule.priority
    ], function(err) {
      if (err) {
        console.log(`   ⚠️  Rule "${rule.name}" may already exist`);
      } else if (this.changes > 0) {
        console.log(`   ✅ Added: ${rule.name}`);
      }
    });
  });

  // Verify tables
  setTimeout(() => {
    console.log('\n📋 Verifying tables...');

    db.get("SELECT COUNT(*) as count FROM push_subscriptions", (err, row) => {
      if (err) {
        console.log('   ❌ push_subscriptions: Error');
      } else {
        console.log(`   ✅ push_subscriptions: ${row.count} records`);
      }
    });

    db.get("SELECT COUNT(*) as count FROM notification_history", (err, row) => {
      if (err) {
        console.log('   ❌ notification_history: Error');
      } else {
        console.log(`   ✅ notification_history: ${row.count} records`);
      }
    });

    db.get("SELECT COUNT(*) as count FROM seasons", (err, row) => {
      if (err) {
        console.log('   ❌ seasons: Error');
      } else {
        console.log(`   ✅ seasons: ${row.count} records`);
      }
    });

    db.get("SELECT COUNT(*) as count FROM pricing_rules", (err, row) => {
      if (err) {
        console.log('   ❌ pricing_rules: Error');
      } else {
        console.log(`   ✅ pricing_rules: ${row.count} records`);
      }
    });

    db.get("SELECT COUNT(*) as count FROM price_history", (err, row) => {
      if (err) {
        console.log('   ❌ price_history: Error');
      } else {
        console.log(`   ✅ price_history: ${row.count} records`);
      }
    });

    setTimeout(() => {
      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║               MIGRATION COMPLETED SUCCESSFULLY             ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');

      console.log('📝 Next steps:');
      console.log('   1. Restart the server: npm start');
      console.log('   2. Test notifications: POST /api/notifications/test');
      console.log('   3. Test pricing: GET /api/pricing/rules');
      console.log('');

      db.close();
    }, 500);
  }, 1000);
});
