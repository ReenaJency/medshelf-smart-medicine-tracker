/**
 * MEDSHELF - Full-Stack Smart Medicine Expiry Tracker
 * Module: Database Connection & Adapter (backend/config/db.js)
 * 
 * Provides a unified async query interface:
 * 1. Primary: MySQL connection pool (via mysql2/promise)
 * 2. Automated Fallback: Built-in SQLite persistent database (via node:sqlite)
 *    ensuring zero-configuration local runs when MySQL is stopped.
 */

const path = require('path');
const fs = require('fs');

let dbDriver = null;
let dbType = 'unknown';

// Read configuration from environment or defaults
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'medshelf_db';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

/**
 * Initialize SQLite Fallback Database
 */
function initSqliteDatabase() {
  try {
    const { DatabaseSync } = require('node:sqlite');
    const dbDir = path.join(__dirname, '../../database');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = path.join(dbDir, 'medshelf.db');
    const sqliteDb = new DatabaseSync(dbPath);

    // Initialize Schema
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS medicines (
        medicine_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        medicine_name TEXT NOT NULL,
        expiry_date TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        family_member TEXT NOT NULL DEFAULT 'General / Shared',
        category TEXT DEFAULT 'General',
        description TEXT,
        created_at TEXT DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      );
    `);

    dbType = 'sqlite';
    dbDriver = sqliteDb;
    console.log(`[Database] Connected to persistent local SQLite database: ${dbPath}`);
    return true;
  } catch (err) {
    console.error('[Database] Failed to initialize SQLite fallback:', err.message);
    return false;
  }
}

/**
 * Initialize MySQL Connection Pool
 */
async function initMySQLDatabase() {
  try {
    const mysql = require('mysql2/promise');
    
    // First connect without database to create it if it doesn't exist
    const initialConnection = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      port: DB_PORT
    });

    await initialConnection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await initialConnection.end();

    // Now connect to the database pool
    const pool = mysql.createPool({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      port: DB_PORT,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Verify connection
    const testConn = await pool.getConnection();
    testConn.release();

    // Initialize tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_users_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS medicines (
        medicine_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        medicine_name VARCHAR(150) NOT NULL,
        expiry_date DATE NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        family_member VARCHAR(100) NOT NULL DEFAULT 'General / Shared',
        category VARCHAR(100) DEFAULT 'General',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        INDEX idx_medicines_user (user_id),
        INDEX idx_medicines_expiry (expiry_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    dbType = 'mysql';
    dbDriver = pool;
    console.log(`[Database] Connected successfully to MySQL (${DB_HOST}:${DB_PORT}/${DB_NAME})`);
    return true;
  } catch (err) {
    console.warn(`[Database] MySQL not reachable (${err.message}). Falling back to local database...`);
    return false;
  }
}

/**
 * Universal Database Initialization
 */
async function initDatabase() {
  // If explicitly configured for MySQL and credentials provided, try MySQL first
  if (process.env.DB_PASSWORD !== undefined || process.env.FORCE_MYSQL === 'true') {
    const mysqlOk = await initMySQLDatabase();
    if (mysqlOk) return;
  }
  
  // Otherwise, or if MySQL failed, use local SQLite database
  const sqliteOk = initSqliteDatabase();
  if (!sqliteOk) {
    // Retry MySQL as second attempt
    await initMySQLDatabase();
  }
}

/**
 * Unified Query Function
 * Executes SQL queries seamlessly across either MySQL or SQLite
 * 
 * @param {string} sql - SQL query string with ? placeholders
 * @param {Array} params - Query parameters
 * @returns {Promise<Array|Object>} Array of rows or mutation result
 */
async function query(sql, params = []) {
  if (!dbDriver) {
    await initDatabase();
  }

  if (dbType === 'mysql') {
    const [rows, fields] = await dbDriver.query(sql, params);
    return rows;
  }

  if (dbType === 'sqlite') {
    const trimmed = sql.trim();
    const isSelect = /^SELECT/i.test(trimmed);

    try {
      const stmt = dbDriver.prepare(trimmed);
      if (isSelect) {
        return stmt.all(...params);
      } else {
        const result = stmt.run(...params);
        return {
          insertId: Number(result.lastInsertRowid),
          affectedRows: result.changes
        };
      }
    } catch (err) {
      console.error('[Database Query Error - SQLite]:', err.message, '\nSQL:', trimmed);
      throw err;
    }
  }

  throw new Error('Database driver not initialized');
}

// Initialize on module load
initDatabase().catch(err => console.error('[Database Init Error]:', err));

module.exports = {
  query,
  getDbType: () => dbType
};
