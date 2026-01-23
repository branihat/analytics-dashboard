#!/usr/bin/env node

/**
 * Database Creation and Setup Script
 * 
 * This script will:
 * 1. Initialize PostgreSQL tables (users, ATR documents, inferred reports)
 * 2. Initialize SQLite tables (violations, reports, features, sites)
 * 3. Create default admin and department users
 * 4. Set up default features and sites
 */

const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Database configuration
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:yaVFUmPvjlfJJRDmjTHrUtyXnpvFMbaD@shinkansen.proxy.rlwy.net:45978/railway';
const SQLITE_PATH = path.join(__dirname, 'src/backend/data/violations.db');

class DatabaseCreator {
  constructor() {
    this.pgPool = null;
    this.sqliteDb = null;
  }

  async createDatabase() {
    console.log('🚀 Starting database creation process...\n');

    try {
      // Step 1: Initialize PostgreSQL
      await this.initializePostgreSQL();
      
      // Step 2: Initialize SQLite
      await this.initializeSQLite();
      
      // Step 3: Create default users
      await this.createDefaultUsers();
      
      // Step 4: Create default features and sites
      await this.createDefaultData();
      
      console.log('\n🎉 Database creation completed successfully!');
      console.log('\n📋 Default Login Credentials:');
      console.log('┌─────────────────────────────────────────────────────────┐');
      console.log('│ ADMIN ACCOUNTS                                          │');
      console.log('├─────────────────────────────────────────────────────────┤');
      console.log('│ Email: admin1@ccl.com                                   │');
      console.log('│ Password: Aerovania_grhns@2002                          │');
      console.log('├─────────────────────────────────────────────────────────┤');
      console.log('│ Email: superadmin1@ccl.com                              │');
      console.log('│ Password: Super_Aerovania_grhns@2002                    │');
      console.log('└─────────────────────────────────────────────────────────┘');
      console.log('\n📋 Department User Accounts:');
      console.log('┌─────────────────────────────────────────────────────────┐');
      console.log('│ E&T Department: et@ccl.com / deptet123                  │');
      console.log('│ Security: security@ccl.com / deptsecurity123           │');
      console.log('│ Operation: operation@ccl.com / deptoperation123        │');
      console.log('│ Survey: survey@ccl.com / deptsurvey123                 │');
      console.log('│ Safety: safety@ccl.com / deptsafety123                 │');
      console.log('└─────────────────────────────────────────────────────────┘');
      
    } catch (error) {
      console.error('❌ Database creation failed:', error.message);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async initializePostgreSQL() {
    console.log('🔄 Initializing PostgreSQL...');
    
    try {
      this.pgPool = new Pool({
        connectionString: DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      // Test connection
      const client = await this.pgPool.connect();
      console.log('✅ PostgreSQL connection successful');
      client.release();

      await this.createPostgresTables();
      
    } catch (error) {
      console.error('❌ PostgreSQL initialization failed:', error.message);
      throw error;
    }
  }

  async createPostgresTables() {
    console.log('🔄 Creating PostgreSQL tables...');
    const client = await this.pgPool.connect();
    
    try {
      await client.query('BEGIN');

      // Admin table
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

      // ATR Documents table
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
      console.log('✅ All PostgreSQL tables created successfully');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async initializeSQLite() {
    console.log('🔄 Initializing SQLite...');
    
    // Ensure data directory exists
    const dataDir = path.dirname(SQLITE_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('✅ Created data directory');
    }

    return new Promise((resolve, reject) => {
      this.sqliteDb = new sqlite3.Database(SQLITE_PATH, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('✅ SQLite database connected');
          this.createSQLiteTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createSQLiteTables() {
    console.log('🔄 Creating SQLite tables...');
    
    const tables = [
      {
        name: 'reports',
        sql: `CREATE TABLE IF NOT EXISTS reports (
          report_id TEXT PRIMARY KEY,
          drone_id TEXT NOT NULL,
          date TEXT NOT NULL,
          location TEXT NOT NULL,
          total_violations INTEGER,
          uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(drone_id, date)
        )`
      },
      {
        name: 'violations',
        sql: `CREATE TABLE IF NOT EXISTS violations (
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
        )`
      },
      {
        name: 'features',
        sql: `CREATE TABLE IF NOT EXISTS features (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          display_name TEXT NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT 1
        )`
      },
      {
        name: 'sites',
        sql: `CREATE TABLE IF NOT EXISTS sites (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      },
      {
        name: 'videos_links',
        sql: `CREATE TABLE IF NOT EXISTS videos_links (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          feature_id TEXT,
          site_id TEXT,
          title TEXT NOT NULL,
          description TEXT,
          video_url TEXT NOT NULL,
          create_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          update_date DATETIME DEFAULT NULL
        )`
      }
    ];

    for (const table of tables) {
      await new Promise((resolve, reject) => {
        this.sqliteDb.run(table.sql, (err) => {
          if (err) {
            reject(err);
          } else {
            console.log(`✅ ${table.name} table created`);
            resolve();
          }
        });
      });
    }
  }

  async createDefaultUsers() {
    console.log('🔄 Creating default users...');
    
    // Admin users
    const adminUsers = [
      { 
        username: 'Admin', 
        email: 'admin1@ccl.com', 
        password: 'Aerovania_grhns@2002', 
        full_name: 'Aerovania Master', 
        permissions: 'all' 
      },
      { 
        username: 'SuperAdmin', 
        email: 'superadmin1@ccl.com', 
        password: 'Super_Aerovania_grhns@2002', 
        full_name: 'Super Aerovania Master', 
        permissions: 'all' 
      }
    ];
    
    // Department users
    const departmentUsers = [
      { 
        username: 'et_department', 
        email: 'et@ccl.com', 
        password: 'deptet123', 
        full_name: 'E&T Department User', 
        department: 'E&T Department', 
        access_level: 'basic' 
      },
      { 
        username: 'security_department', 
        email: 'security@ccl.com', 
        password: 'deptsecurity123', 
        full_name: 'Security Department User', 
        department: 'Security Department', 
        access_level: 'basic' 
      },
      { 
        username: 'operation_department', 
        email: 'operation@ccl.com', 
        password: 'deptoperation123', 
        full_name: 'Operation Department User', 
        department: 'Operation Department', 
        access_level: 'basic' 
      },
      { 
        username: 'survey_department', 
        email: 'survey@ccl.com', 
        password: 'deptsurvey123', 
        full_name: 'Survey Department User', 
        department: 'Survey Department', 
        access_level: 'basic' 
      },
      { 
        username: 'safety_department', 
        email: 'safety@ccl.com', 
        password: 'deptsafety123', 
        full_name: 'Safety Department User', 
        department: 'Safety Department', 
        access_level: 'basic' 
      }
    ];
    
    let created = 0;
    
    // Create admin users
    for (const admin of adminUsers) {
      try {
        const hashedPassword = await bcrypt.hash(admin.password, 10);
        const client = await this.pgPool.connect();
        
        await client.query(
          'INSERT INTO admin (username, email, password_hash, full_name, permissions) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING',
          [admin.username, admin.email, hashedPassword, admin.full_name, admin.permissions]
        );
        
        client.release();
        created++;
        console.log(`✅ Created admin: ${admin.email}`);
      } catch (err) {
        console.log(`⚠️ Admin ${admin.email} might already exist`);
      }
    }
    
    // Create department users
    for (const user of departmentUsers) {
      try {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        const client = await this.pgPool.connect();
        
        await client.query(
          'INSERT INTO "user" (username, email, password_hash, full_name, department, access_level) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO NOTHING',
          [user.username, user.email, hashedPassword, user.full_name, user.department, user.access_level]
        );
        
        client.release();
        created++;
        console.log(`✅ Created user: ${user.email}`);
      } catch (err) {
        console.log(`⚠️ User ${user.email} might already exist`);
      }
    }
    
    console.log(`✅ User creation completed (${created} users processed)`);
  }

  async createDefaultData() {
    console.log('🔄 Creating default features and sites...');
    
    // Default features
    const defaultFeatures = [
      { name: 'ppe_kit_detection', display_name: 'PPE Kit Detection' },
      { name: 'crowding_of_people', display_name: 'Crowding of People' },
      { name: 'crowding_of_vehicles', display_name: 'Crowding of Vehicles' },
      { name: 'rest_shelter_lighting', display_name: 'Rest Shelter Lighting' },
      { name: 'stagnant_water', display_name: 'Stagnant Water' },
      { name: 'fire_smoke', display_name: 'Fire Smoke' },
      { name: 'loose_boulder', display_name: 'Loose Boulder' },
      { name: 'red_flag', display_name: 'Red Flag' }
    ];
    
    // Default sites
    const defaultSites = ['Bukaro', 'BNK Mines', 'Dhori', 'Kathara'];
    
    // Insert features
    for (const feature of defaultFeatures) {
      await new Promise((resolve, reject) => {
        this.sqliteDb.run(
          'INSERT OR IGNORE INTO features (name, display_name) VALUES (?, ?)',
          [feature.name, feature.display_name],
          (err) => {
            if (err) reject(err);
            else {
              console.log(`✅ Feature: ${feature.display_name}`);
              resolve();
            }
          }
        );
      });
    }
    
    // Insert sites
    for (const siteName of defaultSites) {
      await new Promise((resolve, reject) => {
        this.sqliteDb.run(
          'INSERT OR IGNORE INTO sites (name) VALUES (?)',
          [siteName],
          (err) => {
            if (err) reject(err);
            else {
              console.log(`✅ Site: ${siteName}`);
              resolve();
            }
          }
        );
      });
    }
    
    console.log('✅ Default data creation completed');
  }

  async cleanup() {
    if (this.pgPool) {
      await this.pgPool.end();
      console.log('🔄 PostgreSQL connection closed');
    }
    
    if (this.sqliteDb) {
      this.sqliteDb.close((err) => {
        if (err) console.error('Error closing SQLite:', err.message);
        else console.log('🔄 SQLite connection closed');
      });
    }
  }
}

// Main execution
async function main() {
  const creator = new DatabaseCreator();
  
  try {
    await creator.createDatabase();
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = DatabaseCreator;