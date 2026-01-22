const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');

/**
 * Hybrid Database Manager
 * - Uses PostgreSQL for: users (admin/user tables), ATR documents
 * - Uses SQLite for: violations, reports, features, sites, video_links
 */
class HybridDatabase {
  constructor() {
    console.log('🚀 HybridDatabase constructor called');
    this.sqliteDb = null;
    this.pgPool = null;
    this.usePostgres = false;
    this.init();
  }

  init() {
    console.log('🔍 HYBRID DATABASE INIT');
    console.log('🔍 DATABASE_URL present:', !!process.env.DATABASE_URL);
    console.log('🔍 NODE_ENV:', process.env.NODE_ENV);
    
    // Always initialize SQLite for violations
    this.initSQLite();

    // Initialize PostgreSQL if available (for users and ATR)
    if (process.env.DATABASE_URL) {
      console.log('🔄 Initializing PostgreSQL for users and ATR documents...');
      this.initPostgreSQL();
    } else {
      console.log('⚠️ No DATABASE_URL found - using SQLite for everything');
    }
  }

  initSQLite() {
    const dbPath = path.join(__dirname, '../data/violations.db');
    
    this.sqliteDb = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Error opening SQLite database:', err.message);
      } else {
        console.log('✅ Connected to SQLite database (violations, reports, features, sites)');
        this.createSQLiteTables();
      }
    });
  }

  initPostgreSQL() {
    try {
      console.log('🔄 Configuring PostgreSQL connection...');
      console.log('🔍 DATABASE_URL format:', process.env.DATABASE_URL ? 'present' : 'missing');
      
      this.pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      this.pgPool.on('error', (err) => {
        console.error('❌ Unexpected error on idle PostgreSQL client', err);
      });

      this.usePostgres = true;
      console.log('✅ PostgreSQL pool created, testing connection...');
      
      // Test the connection and create tables
      this.testConnectionAndCreateTables();
    } catch (error) {
      console.error('❌ PostgreSQL initialization failed:', error);
      console.error('❌ Error details:', error.message);
      this.usePostgres = false;
    }
  }

  async testConnectionAndCreateTables() {
    try {
      console.log('🔄 Testing PostgreSQL connection...');
      const client = await this.pgPool.connect();
      console.log('✅ PostgreSQL connection successful!');
      client.release();
      
      // Now create tables
      await this.createPostgresTables();
      
      // Auto-setup users if tables are empty
      await this.autoSetupUsers();
    } catch (error) {
      console.error('❌ PostgreSQL connection test failed:', error.message);
      console.error('❌ Falling back to SQLite for all tables (this is safe!)');
      this.usePostgres = false;
      
      // Close the failed pool
      if (this.pgPool) {
        try {
          await this.pgPool.end();
        } catch (closeError) {
          console.error('Error closing failed PostgreSQL pool:', closeError.message);
        }
      }
      
      // Create user tables in SQLite as fallback
      this.createSQLiteUserTables();
    }
  }

  async autoSetupUsers() {
    try {
      console.log('🔄 Checking if users need to be created...');
      const bcrypt = require('bcryptjs');
      
      // Check if any admin exists
      const adminCount = await this.get('SELECT COUNT(*) as count FROM admin', []);
      
      if (adminCount && adminCount.count > 0) {
        console.log('✅ Users already exist, skipping auto-setup');
        return;
      }
      
      console.log('🔄 No users found, creating default users...');
      
      // Admin users
      const adminUsers = [
        { username: 'Admin', email: 'admin1@ccl.com', password: 'Aerovania_grhns@2002', full_name: 'Aerovania Master', permissions: 'all' },
        { username: 'Admin', email: 'superadmin1@ccl.com', password: 'Super_Aerovania_grhns@2002', full_name: 'Super Aerovania Master', permissions: 'all' }
      ];
      
      // Department users
      const departmentUsers = [
        { username: 'et_department', email: 'et@ccl.com', password: 'deptet123', full_name: 'E&T Department User', department: 'E&T Department', access_level: 'basic' },
        { username: 'security_department', email: 'security@ccl.com', password: 'deptsecurity123', full_name: 'Security Department User', department: 'Security Department', access_level: 'basic' },
        { username: 'operation_department', email: 'operation@ccl.com', password: 'deptoperation123', full_name: 'Operation Department User', department: 'Operation Department', access_level: 'basic' },
        { username: 'survey_department', email: 'survey@ccl.com', password: 'deptsurvey123', full_name: 'Survey Department User', department: 'Survey Department', access_level: 'basic' },
        { username: 'safety_department', email: 'safety@ccl.com', password: 'deptsafety123', full_name: 'Safety Department User', department: 'Safety Department', access_level: 'basic' }
      ];
      
      let created = 0;
      
      // Create admin users
      for (const admin of adminUsers) {
        try {
          const hashedPassword = await bcrypt.hash(admin.password, 10);
          await this.run(
            'INSERT INTO admin (username, email, password_hash, full_name, permissions) VALUES (?, ?, ?, ?, ?)',
            [admin.username, admin.email, hashedPassword, admin.full_name, admin.permissions]
          );
          created++;
          console.log(`✅ Created admin: ${admin.email}`);
        } catch (err) {
          console.log(`⚠️ Skipped admin ${admin.email}:`, err.message);
        }
      }
      
      // Create department users
      for (const user of departmentUsers) {
        try {
          const hashedPassword = await bcrypt.hash(user.password, 10);
          await this.run(
            'INSERT INTO "user" (username, email, password_hash, full_name, department, access_level) VALUES (?, ?, ?, ?, ?, ?)',
            [user.username, user.email, hashedPassword, user.full_name, user.department, user.access_level]
          );
          created++;
          console.log(`✅ Created user: ${user.email}`);
        } catch (err) {
          console.log(`⚠️ Skipped user ${user.email}:`, err.message);
        }
      }
      
      console.log(`🎉 Auto-setup completed! Created ${created} users`);
    } catch (error) {
      console.error('❌ Auto-setup failed:', error.message);
      // Don't throw - this is not critical for app startup
    }
  }

  createSQLiteUserTables() {
    console.log('⚠️ PostgreSQL not available - user tables will not work without PostgreSQL!');
    console.log('⚠️ Please ensure DATABASE_URL is set for production use.');
    // We do NOT create user tables in SQLite - PostgreSQL is required for users
  }

  async createPostgresTables() {
    console.log('🔄 Creating PostgreSQL tables...');
    const client = await this.pgPool.connect();
    
    try {
      await client.query('BEGIN');
      console.log('✅ PostgreSQL transaction started');

      // Admin table
      console.log('🔄 Creating admin table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS admin (
          id SERIAL PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          full_name TEXT,
          permissions TEXT DEFAULT 'all',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Admin table created');

      // User table
      console.log('🔄 Creating user table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS "user" (
          id SERIAL PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          full_name TEXT,
          department TEXT,
          access_level TEXT DEFAULT 'basic',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ User table created');

      // Inferred Reports table
      console.log('🔄 Creating inferred_reports table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS inferred_reports (
          id SERIAL PRIMARY KEY,
          filename TEXT NOT NULL,
          site_name TEXT,
          cloudinary_url TEXT NOT NULL,
          cloudinary_public_id TEXT NOT NULL,
          department TEXT NOT NULL,
          uploaded_by INTEGER NOT NULL,
          file_size INTEGER,
          upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          comment TEXT,
          ai_report_url TEXT,
          ai_report_public_id TEXT,
          hyperlink TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Inferred Reports table created');

      // Uploaded ATR table
      console.log('🔄 Creating uploaded_atr table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS uploaded_atr (
          id SERIAL PRIMARY KEY,
          serial_no INTEGER,
          site_name TEXT NOT NULL,
          date_time TIMESTAMP NOT NULL,
          video_link TEXT,
          atr_link TEXT,
          file_name TEXT,
          department TEXT,
          uploaded_by INTEGER NOT NULL,
          upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          file_size INTEGER,
          comment TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Uploaded ATR table created');

      // ATR Documents table (linked to inferred reports)
      console.log('🔄 Creating atr_documents table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS atr_documents (
          id SERIAL PRIMARY KEY,
          filename TEXT NOT NULL,
          cloudinary_url TEXT NOT NULL,
          cloudinary_public_id TEXT NOT NULL,
          site_name TEXT NOT NULL,
          department TEXT NOT NULL,
          uploaded_by INTEGER NOT NULL,
          file_size INTEGER,
          upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          comment TEXT,
          inferred_report_id INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ ATR Documents table created');

      await client.query('COMMIT');
      console.log('✅ PostgreSQL tables created successfully (admin, user, inferred_reports, uploaded_atr, atr_documents)');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error creating PostgreSQL tables:', error);
      console.error('❌ Error details:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  createSQLiteTables() {
    // Reports table
    this.sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS reports (
        report_id TEXT PRIMARY KEY,
        drone_id TEXT NOT NULL,
        date TEXT NOT NULL,
        location TEXT NOT NULL,
        total_violations INTEGER,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(drone_id, date)
      )
    `, (err) => {
      if (err) console.error('Error creating reports table:', err);
      else console.log('✅ Reports table ready (SQLite)');
    });

    // Violations table
    this.sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS violations (
        id TEXT PRIMARY KEY,
        report_id TEXT NOT NULL,
        drone_id TEXT NOT NULL,
        date TEXT NOT NULL,
        location TEXT NOT NULL,
        type TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        image_url TEXT NOT NULL,
        confidence REAL,
        frame_number INTEGER,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (report_id) REFERENCES reports (report_id)
      )
    `, (err) => {
      if (err) console.error('Error creating violations table:', err);
      else console.log('✅ Violations table ready (SQLite)');
    });

    // Features table
    this.sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS features (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1
      )
    `, (err) => {
      if (err) console.error('Error creating features table:', err);
      else console.log('✅ Features table ready (SQLite)');
    });

    // Sites table
    this.sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS sites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Error creating sites table:', err);
      else {
        console.log('✅ Sites table ready (SQLite)');
        this.insertDefaultSites();
      }
    });

    // Videos links table
    this.sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS videos_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feature_id TEXT,
        site_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        video_url TEXT NOT NULL,
        create_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        update_date DATETIME DEFAULT NULL
      )
    `, (err) => {
      if (err) console.error('Error creating videos_links table:', err);
      else console.log('✅ Videos links table ready (SQLite)');
    });
  }

  insertDefaultSites() {
    const defaultSites = ['Bukaro', 'BNK Mines', 'Dhori', 'Kathara'];
    
    defaultSites.forEach(siteName => {
      this.sqliteDb.run(
        'INSERT OR IGNORE INTO sites (name) VALUES (?)',
        [siteName],
        (err) => {
          if (err) console.error(`Error inserting site ${siteName}:`, err.message);
        }
      );
    });
  }

  // Determine which database to use based on table
  getDatabase(table) {
    const postgresTables = ['admin', 'user', 'inferred_reports', 'uploaded_atr', 'atr_documents'];
    
    if (this.usePostgres && postgresTables.includes(table)) {
      return 'postgres';
    }
    return 'sqlite';
  }

  // Extract table name from query
  extractTableName(query) {
    const match = query.match(/(?:FROM|INTO|UPDATE|TABLE)\s+([^\s(,]+)/i);
    return match ? match[1].replace(/["`]/g, '') : null;
  }

  async run(query, params = []) {
    const tableName = this.extractTableName(query);
    const dbType = this.getDatabase(tableName);

    if (dbType === 'postgres') {
      return this.runPostgres(query, params);
    }
    return this.runSQLite(query, params);
  }

  async get(query, params = []) {
    const tableName = this.extractTableName(query);
    const dbType = this.getDatabase(tableName);

    if (dbType === 'postgres') {
      return this.getPostgres(query, params);
    }
    return this.getSQLite(query, params);
  }

  async all(query, params = []) {
    const tableName = this.extractTableName(query);
    const dbType = this.getDatabase(tableName);

    if (dbType === 'postgres') {
      return this.allPostgres(query, params);
    }
    return this.allSQLite(query, params);
  }

  // PostgreSQL methods
  async runPostgres(query, params) {
    const client = await this.pgPool.connect();
    try {
      let modifiedQuery = this.convertToPostgres(query);
      
      // Add RETURNING id for INSERT
      if (modifiedQuery.trim().toUpperCase().startsWith('INSERT') && 
          !modifiedQuery.toUpperCase().includes('RETURNING')) {
        modifiedQuery = modifiedQuery.replace(/;?\s*$/, ' RETURNING id');
      }
      
      const result = await client.query(modifiedQuery, params);
      return { 
        id: result.rows[0]?.id || result.rowCount,
        changes: result.rowCount 
      };
    } finally {
      client.release();
    }
  }

  async getPostgres(query, params) {
    const client = await this.pgPool.connect();
    try {
      const modifiedQuery = this.convertToPostgres(query);
      const result = await client.query(modifiedQuery, params);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async allPostgres(query, params) {
    const client = await this.pgPool.connect();
    try {
      const modifiedQuery = this.convertToPostgres(query);
      const result = await client.query(modifiedQuery, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  convertToPostgres(query) {
    let converted = query;
    
    // Convert ? to $1, $2, etc.
    let index = 1;
    converted = converted.replace(/\?/g, () => `$${index++}`);
    
    // Convert INSERT OR IGNORE
    if (converted.match(/INSERT\s+OR\s+IGNORE/i)) {
      converted = converted.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');
      // Add ON CONFLICT for atr_documents (no unique constraint, so skip)
    }
    
    return converted;
  }

  // SQLite methods
  runSQLite(query, params) {
    return new Promise((resolve, reject) => {
      this.sqliteDb.run(query, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  getSQLite(query, params) {
    return new Promise((resolve, reject) => {
      this.sqliteDb.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  allSQLite(query, params) {
    return new Promise((resolve, reject) => {
      this.sqliteDb.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async close() {
    if (this.pgPool) {
      await this.pgPool.end();
      console.log('PostgreSQL connection closed');
    }
    if (this.sqliteDb) {
      this.sqliteDb.close((err) => {
        if (err) console.error('Error closing SQLite:', err.message);
        else console.log('SQLite connection closed');
      });
    }
  }
}

// Create and export the hybrid database instance
const database = new HybridDatabase();

// Ensure initialization happens
console.log('📦 HybridDatabase module loaded');

module.exports = database;
