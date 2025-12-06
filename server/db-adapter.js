// DATABASE ADAPTER - Soporta SQLite (local) y PostgreSQL (producción)
// Lazy load sqlite3 only when needed (avoids issues in Vercel serverless)
let sqlite3 = null;
const { Pool } = require('pg');
const path = require('path');

class DatabaseAdapter {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.db = null;
    this.pool = null;
  }

  // Load sqlite3 only when needed (not in production)
  _getSqlite3() {
    if (!sqlite3 && !this.isProduction) {
      sqlite3 = require('sqlite3').verbose();
    }
    return sqlite3;
  }

  async connect() {
    if (this.isProduction) {
      // PostgreSQL para producción
      console.log('🔗 Connecting to PostgreSQL...');

      // Neon Serverless optimizations for cold start
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        },
        // Aggressive connection settings for serverless
        connectionTimeoutMillis: 20000, // 20s for cold starts
        idleTimeoutMillis: 10000,       // Close idle connections faster
        max: 5,                          // Fewer connections for serverless
        min: 0,                          // Don't maintain idle connections
        allowExitOnIdle: true,           // Allow pool to close when idle
        application_name: 'almanik-pms'
      });

      // Test connection first
      try {
        const client = await this.pool.connect();
        client.release();
        console.log('✅ Connected to PostgreSQL (Production)');
        await this.initializePostgreSQL();
      } catch (error) {
        console.error('❌ PostgreSQL connection failed:', error.message);
        throw error;
      }
    } else {
      // SQLite para desarrollo
      const dbPath = path.join(__dirname, 'almanik.db');
      const sqlite = this._getSqlite3();
      this.db = new sqlite.Database(dbPath);
      console.log('✅ Connected to SQLite (Development)');
      await this.initializeSQLite();
    }
  }

  // Ensure connection is established
  async ensureConnection() {
    if (this.isProduction && !this.pool) {
      await this.connect();
    } else if (!this.isProduction && !this.db) {
      await this.connect();
    }
  }

  // Método unificado para queries
  async query(sql, params = []) {
    await this.ensureConnection();

    if (this.isProduction) {
      const client = await this.pool.connect();
      try {
        const result = await client.query(sql, params);
        return result.rows;
      } finally {
        client.release();
      }
    } else {
      return new Promise((resolve, reject) => {
        this.db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    }
  }

  // Get single row
  async get(sql, params = []) {
    await this.ensureConnection();

    if (this.isProduction) {
      const client = await this.pool.connect();
      try {
        const result = await client.query(sql, params);
        return result.rows[0] || null;
      } finally {
        client.release();
      }
    } else {
      return new Promise((resolve, reject) => {
        this.db.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row || null);
        });
      });
    }
  }

  // Run query (INSERT, UPDATE, DELETE)
  async run(sql, params = []) {
    await this.ensureConnection();

    if (this.isProduction) {
      const client = await this.pool.connect();
      try {
        const result = await client.query(sql, params);
        return {
          id: result.rows[0]?.id || null,
          changes: result.rowCount
        };
      } finally {
        client.release();
      }
    } else {
      return new Promise((resolve, reject) => {
        this.db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, changes: this.changes });
        });
      });
    }
  }

  /**
   * Execute multiple operations within a transaction
   * Ensures atomicity - all operations succeed or all are rolled back
   * @param {Function} callback - Async function receiving transaction helpers (txQuery, txGet, txRun)
   * @returns {Promise<any>} Result of the callback
   */
  async transaction(callback) {
    await this.ensureConnection();

    if (this.isProduction) {
      // PostgreSQL transaction
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');

        // Transaction-scoped query functions
        const txQuery = async (sql, params = []) => {
          const result = await client.query(sql, params);
          return result.rows;
        };

        const txGet = async (sql, params = []) => {
          const result = await client.query(sql, params);
          return result.rows[0] || null;
        };

        const txRun = async (sql, params = []) => {
          const result = await client.query(sql, params);
          return {
            id: result.rows[0]?.id || null,
            changes: result.rowCount
          };
        };

        const result = await callback({ txQuery, txGet, txRun });
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } else {
      // SQLite transaction
      return new Promise((resolve, reject) => {
        this.db.serialize(() => {
          this.db.run('BEGIN TRANSACTION', async (beginErr) => {
            if (beginErr) {
              return reject(beginErr);
            }

            try {
              // Transaction-scoped query functions for SQLite
              const txQuery = (sql, params = []) => {
                return new Promise((res, rej) => {
                  this.db.all(sql, params, (err, rows) => {
                    if (err) rej(err);
                    else res(rows);
                  });
                });
              };

              const txGet = (sql, params = []) => {
                return new Promise((res, rej) => {
                  this.db.get(sql, params, (err, row) => {
                    if (err) rej(err);
                    else res(row || null);
                  });
                });
              };

              const txRun = (sql, params = []) => {
                return new Promise((res, rej) => {
                  this.db.run(sql, params, function(err) {
                    if (err) rej(err);
                    else res({ id: this.lastID, changes: this.changes });
                  });
                });
              };

              const result = await callback({ txQuery, txGet, txRun });

              this.db.run('COMMIT', (commitErr) => {
                if (commitErr) {
                  this.db.run('ROLLBACK', () => reject(commitErr));
                } else {
                  resolve(result);
                }
              });
            } catch (error) {
              this.db.run('ROLLBACK', () => reject(error));
            }
          });
        });
      });
    }
  }

  // Convertir SQL de SQLite a PostgreSQL
  convertSQL(sql) {
    if (!this.isProduction) return sql;

    // Convert ? placeholders to $1, $2, etc.
    let paramIndex = 0;
    let converted = sql.replace(/\?/g, () => `$${++paramIndex}`);

    return converted
      .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
      .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/g, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
      .replace(/DATE\('now'\)/g, 'CURRENT_DATE')
      .replace(/datetime\('now'\)/g, 'CURRENT_TIMESTAMP')
      .replace(/date\("now", "\+(\d+) days"\)/g, "CURRENT_DATE + INTERVAL '$1 days'");
  }

  async initializePostgreSQL() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS guests (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        document VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        nationality VARCHAR(100) DEFAULT 'Colombia',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS beds (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'clean',
        room VARCHAR(100),
        guest_id INTEGER REFERENCES guests(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        guest_id INTEGER REFERENCES guests(id),
        bed_id INTEGER REFERENCES beds(id),
        check_in DATE NOT NULL,
        check_out DATE NOT NULL,
        nights INTEGER NOT NULL DEFAULT 1,
        total DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER REFERENCES bookings(id),
        type VARCHAR(20) NOT NULL,
        description TEXT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        method VARCHAR(20) DEFAULT 'cash',
        bed_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS tours (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        duration VARCHAR(50),
        provider VARCHAR(255) NOT NULL,
        commission_rate DECIMAL(5,2) DEFAULT 10,
        booking_url TEXT,
        images TEXT,
        clicks INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS tour_clicks (
        id SERIAL PRIMARY KEY,
        tour_id INTEGER REFERENCES tours(id),
        guest_id INTEGER REFERENCES guests(id),
        clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS tour_commissions (
        id SERIAL PRIMARY KEY,
        tour_id INTEGER REFERENCES tours(id),
        guest_id INTEGER REFERENCES guests(id),
        amount DECIMAL(10,2) NOT NULL,
        booking_reference VARCHAR(255),
        earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS activity_log (
        id SERIAL PRIMARY KEY,
        action_type VARCHAR(50) NOT NULL,
        module VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        user_id INTEGER,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Users table for system authentication and role management
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'voluntario',
        permissions TEXT,
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Sessions table for serverless-compatible auth
      `CREATE TABLE IF NOT EXISTS sessions (
        session_id VARCHAR(50) PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        user_data TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '7 days'
      )`
    ];

    for (const table of tables) {
      await this.query(table);
    }

    console.log('✅ PostgreSQL tables initialized');
  }

  async initializeSQLite() {
    // Create users table for SQLite
    await this.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'voluntario',
      permissions TEXT,
      is_active BOOLEAN DEFAULT 1,
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    console.log('✅ SQLite tables initialized');
  }
}

module.exports = DatabaseAdapter;