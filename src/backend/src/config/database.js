import { DatabaseSync } from 'node:sqlite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'data');
const DB_PATH = process.env.DB_FILE || join(DATA_DIR, 'ecomplace.sqlite');

let db = null;

/**
 * Translate the small subset of PostgreSQL syntax the routes use into
 * SQLite-compatible SQL. This keeps the route/service files unchanged.
 */
const translate = (sql) => {
  let out = sql;
  // $1, $2, ... -> ?
  out = out.replace(/\$\d+/g, '?');
  // NOW() -> CURRENT_TIMESTAMP
  out = out.replace(/\bNOW\(\)/gi, 'CURRENT_TIMESTAMP');
  // ILIKE -> LIKE (SQLite LIKE is already case-insensitive for ASCII)
  out = out.replace(/\bILIKE\b/gi, 'LIKE');
  return out;
};

const isRead = (sql) => {
  const s = sql.trim().toUpperCase();
  return s.startsWith('SELECT') || s.startsWith('WITH') || /RETURNING/i.test(sql);
};

/**
 * Minimal pg-compatible wrapper: exposes async query(sql, params) -> { rows }
 */
const makePool = (database) => ({
  async query(sql, params = []) {
    const translated = translate(sql);
    try {
      const stmt = database.prepare(translated);
      if (isRead(translated)) {
        const rows = stmt.all(...params);
        return { rows, rowCount: rows.length };
      }
      const info = stmt.run(...params);
      return { rows: [], rowCount: info.changes ?? 0 };
    } catch (err) {
      logger.error(`SQL error: ${err.message} | query: ${translated}`);
      throw err;
    }
  },
});

export const connectDatabase = async () => {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    db = new DatabaseSync(DB_PATH);
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA foreign_keys = ON;');

    logger.info(`SQLite database ready at: ${DB_PATH}`);

    await initializeTables();
    return makePool(db);
  } catch (error) {
    logger.error('Database connection failed:', error?.message || error);
    throw error;
  }
};

export const getPool = () => {
  if (!db) {
    throw new Error('Database not connected. Call connectDatabase first.');
  }
  return makePool(db);
};

const UUID_DEFAULT = `(
  lower(hex(randomblob(4))) || '-' ||
  lower(hex(randomblob(2))) || '-4' ||
  substr(lower(hex(randomblob(2))), 2) || '-' ||
  substr('89ab', abs(random()) % 4 + 1, 1) ||
  substr(lower(hex(randomblob(2))), 2) || '-' ||
  lower(hex(randomblob(6)))
)`;

const initializeTables = async () => {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT ${UUID_DEFAULT},
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      role TEXT DEFAULT 'user',
      team_id TEXT,
      subscription_plan TEXT DEFAULT 'free',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY DEFAULT ${UUID_DEFAULT},
      dedupe_key TEXT UNIQUE,
      asin TEXT,
      sku TEXT,
      name TEXT NOT NULL,
      category TEXT,
      source TEXT,
      source_url TEXT,
      current_price REAL,
      previous_price REAL,
      price_change REAL,
      rating REAL,
      reviews_count INTEGER,
      best_sellers_rank INTEGER,
      fba_fee REAL,
      margin_percentage REAL,
      shipping_cost REAL,
      image_url TEXT,
      is_active INTEGER DEFAULT 1,
      fetched_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS price_history (
      id TEXT PRIMARY KEY DEFAULT ${UUID_DEFAULT},
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      price REAL NOT NULL,
      recorded_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY DEFAULT ${UUID_DEFAULT},
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      alert_type TEXT,
      target_price REAL,
      target_margin REAL,
      is_triggered INTEGER DEFAULT 0,
      triggered_at TEXT,
      notification_sent INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY DEFAULT ${UUID_DEFAULT},
      snapshot_data TEXT NOT NULL,
      product_count INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE INDEX IF NOT EXISTS idx_products_source_asin ON products(source, asin)`,
    `CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`,
    `CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history(product_id)`,
    `CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_alerts_triggered ON alerts(is_triggered)`,
  ];

  for (const stmt of statements) {
    try {
      db.exec(stmt);
    } catch (error) {
      logger.warn('Table initialization notice:', error.message);
    }
  }

  logger.info('Database tables initialized');
};

export const closeDatabase = async () => {
  if (db) {
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
};
