#!/usr/bin/env node

/**
 * Migration Script: SQLite to Full PostgreSQL
 * 
 * This script migrates all SQLite data to PostgreSQL for users who prefer
 * a unified database approach. Run this ONLY if you want to move away from
 * the hybrid approach.
 */

const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database configuration
const DATABASE_URL = process.env.DATABASE_URL;
const SQLITE_PATH = path.join(__dirname, 'data/violations.db');

class PostgreSQLMigrator {
  constructor() {
    this.pgPool = null;
    this.sqliteDb = null;
  }

  async migrate() {
    console.log('🔄 Starting migration from SQLite to PostgreSQL...\n');

    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    try {
      await this.initializeConnections();
      await this.createPostgreSQLTables();
      await this.migrateData();
      
      console.log('\n🎉 Migration completed successfully!');
      console.log('⚠️  Remember to update your code to use PostgreSQL for all tables');
      
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async initializeConnections() {
    console.log('🔄 Initializing database connections...');
    
    // PostgreSQL connection
    this.pgPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    const client = await this.pgPool.connect();
    console.log('✅ PostgreSQL connected');
    client.release();

    // SQLite connection
    return new Promise((resolve, reject) => {
      this.sqliteDb = new sqlite3.Database(SQLITE_PATH, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('✅ SQLite connected');
          resolve();
        }
      });
    });
  }

  async createPostgreSQLTables() {
    console.log('🔄 Creating PostgreSQL tables for SQLite data...');
    const client = await this.pgPool.connect();
    
    try {
      await client.query('BEGIN');

      // Reports table
      await client.query(`
        CREATE TABLE IF NOT EXISTS reports (
          report_id TEXT PRIMARY KEY,
          drone_id TEXT NOT NULL,
          date TEXT NOT NULL,
          location TEXT NOT NULL,
          total_violations INTEGER,
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(drone_id, date)
        )
      `);
      console.log('✅ Reports table created');

      // Violations table
      await client.query(`
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
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (report_id) REFERENCES reports (report_id)
        )
      `);
      console.log('✅ Violations table created');

      // Features table
      await client.query(`
        CREATE TABLE IF NOT EXISTS features (
          id SERIAL PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          display_name TEXT NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT true
        )
      `);
      console.log('✅ Features table created');

      // Sites table
      await client.query(`
        CREATE TABLE IF NOT EXISTS sites (
          id SERIAL PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Sites table created');

      // Videos links table
      await client.query(`
        CREATE TABLE IF NOT EXISTS videos_links (
          id SERIAL PRIMARY KEY,
          feature_id TEXT,
          site_id TEXT,
          title TEXT NOT NULL,
          description TEXT,
          video_url TEXT NOT NULL,
          create_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          update_date TIMESTAMP DEFAULT NULL
        )
      `);
      console.log('✅ Videos links table created');

      await client.query('COMMIT');
      console.log('✅ All PostgreSQL tables created');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async migrateData() {
    console.log('🔄 Migrating data from SQLite to PostgreSQL...');

    // Migrate reports
    await this.migrateTable('reports', [
      'report_id', 'drone_id', 'date', 'location', 'total_violations', 'uploaded_at'
    ]);

    // Migrate violations
    await this.migrateTable('violations', [
      'id', 'report_id', 'drone_id', 'date', 'location', 'type', 
      'timestamp', 'latitude', 'longitude', 'image_url', 'confidence', 
      'frame_number', 'uploaded_at'
    ]);

    // Migrate features
    await this.migrateTable('features', [
      'name', 'display_name', 'description', 'created_at', 'is_active'
    ], true); // Skip ID for auto-increment

    // Migrate sites
    await this.migrateTable('sites', [
      'name', 'description', 'created_at'
    ], true); // Skip ID for auto-increment

    // Migrate videos_links
    await this.migrateTable('videos_links', [
      'feature_id', 'site_id', 'title', 'description', 'video_url', 
      'create_date', 'update_date'
    ], true); // Skip ID for auto-increment
  }

  async migrateTable(tableName, columns, skipId = false) {
    console.log(`🔄 Migrating ${tableName}...`);
    
    // Get data from SQLite
    const sqliteData = await this.sqliteQueryAll(`SELECT * FROM ${tableName}`);
    
    if (sqliteData.length === 0) {
      console.log(`⚠️  No data found in ${tableName}`);
      return;
    }

    // Clear existing PostgreSQL data
    const client = await this.pgPool.connect();
    try {
      await client.query(`DELETE FROM ${tableName}`);
      
      // Insert data into PostgreSQL
      for (const row of sqliteData) {
        const values = columns.map(col => row[col]);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        const columnList = columns.join(', ');
        
        await client.query(
          `INSERT INTO ${tableName} (${columnList}) VALUES (${placeholders})`,
          values
        );
      }
      
      console.log(`✅ Migrated ${sqliteData.length} records from ${tableName}`);
      
    } finally {
      client.release();
    }
  }

  sqliteQueryAll(query) {
    return new Promise((resolve, reject) => {
      this.sqliteDb.all(query, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async cleanup() {
    if (this.pgPool) {
      await this.pgPool.end();
    }
    
    if (this.sqliteDb) {
      this.sqliteDb.close();
    }
  }
}

// Main execution
async function main() {
  const migrator = new PostgreSQLMigrator();
  
  try {
    await migrator.migrate();
    
    console.log('\n📋 Next Steps:');
    console.log('1. Update your databaseHybrid.js to use PostgreSQL for all tables');
    console.log('2. Test your application thoroughly');
    console.log('3. Backup your SQLite file before removing it');
    console.log('4. Update your deployment configuration if needed');
    
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

module.exports = PostgreSQLMigrator;