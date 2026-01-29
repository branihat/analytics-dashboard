#!/usr/bin/env node

/**
 * Direct Database Query Tool
 * 
 * Quick tool to run direct SQL queries on your databases
 */

const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DirectDBQuery {
  constructor() {
    this.pgPool = null;
    this.sqliteDb = null;
    this.DATABASE_URL = process.env.DATABASE_URL || 'YOUR_NEW_POSTGRESQL_URL_HERE';
  }

  async init() {
    // Connect to PostgreSQL
    if (this.DATABASE_URL && this.DATABASE_URL !== 'YOUR_NEW_POSTGRESQL_URL_HERE') {
      try {
        this.pgPool = new Pool({
          connectionString: this.DATABASE_URL,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        });
        console.log('✅ PostgreSQL connected');
      } catch (error) {
        console.error('❌ PostgreSQL connection failed:', error.message);
      }
    }

    // Connect to SQLite
    const sqlitePath = path.join(__dirname, 'data/violations.db');
    this.sqliteDb = new sqlite3.Database(sqlitePath, (err) => {
      if (err) {
        console.error('❌ SQLite connection failed:', err.message);
      } else {
        console.log('✅ SQLite connected');
      }
    });
  }

  async runQueries() {
    await this.init();
    
    console.log('\n🔍 CHECKING ALL USER CREDENTIALS\n');
    
    // PostgreSQL queries
    if (this.pgPool) {
      console.log('📊 POSTGRESQL DATA:');
      console.log('==================\n');
      
      try {
        // Admin users with passwords (for verification)
        console.log('🔐 Admin Users:');
        const admins = await this.queryPG(`
          SELECT id, username, email, full_name, 
                 LEFT(password_hash, 20) || '...' as password_preview,
                 permissions, created_at 
          FROM admin 
          ORDER BY id
        `);
        console.table(admins);
        
        // Regular users
        console.log('👤 Department Users:');
        const users = await this.queryPG(`
          SELECT id, username, email, full_name, department, 
                 LEFT(password_hash, 20) || '...' as password_preview,
                 access_level, created_at 
          FROM "user" 
          ORDER BY id
        `);
        console.table(users);
        
        // Table counts
        console.log('📈 Table Counts:');
        const counts = await this.queryPG(`
          SELECT 
            (SELECT COUNT(*) FROM admin) as admin_count,
            (SELECT COUNT(*) FROM "user") as user_count,
            (SELECT COUNT(*) FROM inferred_reports) as inferred_reports_count,
            (SELECT COUNT(*) FROM atr_documents) as atr_documents_count
        `);
        console.table(counts);
        
      } catch (error) {
        console.error('❌ PostgreSQL query error:', error.message);
      }
    }
    
    // SQLite queries
    if (this.sqliteDb) {
      console.log('\n💾 SQLITE DATA:');
      console.log('===============\n');
      
      try {
        // Features
        const features = await this.querySQLiteAll('SELECT * FROM features WHERE is_active = 1');
        console.log('🎯 Features:');
        console.table(features);
        
        // Sites
        const sites = await this.querySQLiteAll('SELECT * FROM sites');
        console.log('🏢 Sites:');
        console.table(sites);
        
        // Table counts
        const violations = await this.querySQLite('SELECT COUNT(*) as count FROM violations');
        const reports = await this.querySQLite('SELECT COUNT(*) as count FROM reports');
        const videos = await this.querySQLite('SELECT COUNT(*) as count FROM videos_links');
        
        console.log('📈 SQLite Table Counts:');
        console.table([{
          violations: violations.count,
          reports: reports.count,
          videos_links: videos.count,
          features: features.length,
          sites: sites.length
        }]);
        
      } catch (error) {
        console.error('❌ SQLite query error:', error.message);
      }
    }
    
    await this.cleanup();
  }

  async queryPG(query, params = []) {
    const client = await this.pgPool.connect();
    try {
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  querySQLite(query, params = []) {
    return new Promise((resolve, reject) => {
      this.sqliteDb.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  querySQLiteAll(query, params = []) {
    return new Promise((resolve, reject) => {
      this.sqliteDb.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async cleanup() {
    if (this.pgPool) await this.pgPool.end();
    if (this.sqliteDb) this.sqliteDb.close();
  }
}

// Run the queries
const dbQuery = new DirectDBQuery();
dbQuery.runQueries().catch(console.error);