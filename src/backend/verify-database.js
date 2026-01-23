#!/usr/bin/env node

/**
 * Database Verification Script
 * 
 * This script verifies that all database tables and data were created correctly
 */

const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database configuration
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:yaVFUmPvjlfJJRDmjTHrUtyXnpvFMbaD@shinkansen.proxy.rlwy.net:45978/railway';
const SQLITE_PATH = path.join(__dirname, 'data/violations.db');

class DatabaseVerifier {
  constructor() {
    this.pgPool = null;
    this.sqliteDb = null;
  }

  async verify() {
    console.log('🔍 Verifying database setup...\n');

    try {
      await this.verifyPostgreSQL();
      await this.verifySQLite();
      await this.testHybridQueries();
      
      console.log('\n✅ Database verification completed successfully!');
      console.log('🚀 Your application is ready to use!');
      
    } catch (error) {
      console.error('❌ Database verification failed:', error.message);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async verifyPostgreSQL() {
    console.log('🔍 Verifying PostgreSQL...');
    
    if (!DATABASE_URL || DATABASE_URL === 'YOUR_NEW_POSTGRESQL_URL_HERE') {
      console.log('⚠️ PostgreSQL not configured - using SQLite for all tables');
      return;
    }

    try {
      this.pgPool = new Pool({
        connectionString: DATABASE_URL,
        ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
      });

      const client = await this.pgPool.connect();
      console.log('✅ PostgreSQL connection successful!');
      client.release();
      
      // Check admin users
      const adminCount = await this.pgPool.query('SELECT COUNT(*) as count FROM admin');
      console.log(`✅ Admin users: ${adminCount.rows[0].count}`);
      
      // Check regular users
      const userCount = await this.pgPool.query('SELECT COUNT(*) as count FROM "user"');
      console.log(`✅ Department users: ${userCount.rows[0].count}`);
      
      // Check inferred reports table
      const reportsCount = await this.pgPool.query('SELECT COUNT(*) as count FROM inferred_reports');
      console.log(`✅ Inferred reports: ${reportsCount.rows[0].count}`);
      
      // Check ATR documents table
      const atrCount = await this.pgPool.query('SELECT COUNT(*) as count FROM atr_documents');
      console.log(`✅ ATR documents: ${atrCount.rows[0].count}`);
      
      console.log('✅ PostgreSQL verification completed');
      
    } catch (error) {
      console.error('❌ PostgreSQL verification failed:', error.message);
      console.log('⚠️ This might be expected if using SQLite-only setup');
    }
  }

  async verifySQLite() {
    console.log('🔍 Verifying SQLite...');
    
    return new Promise((resolve, reject) => {
      this.sqliteDb = new sqlite3.Database(SQLITE_PATH, async (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        try {
          // Check violations table
          const violationsCount = await this.sqliteQuery('SELECT COUNT(*) as count FROM violations');
          console.log(`✅ Violations: ${violationsCount.count}`);
          
          // Check reports table
          const reportsCount = await this.sqliteQuery('SELECT COUNT(*) as count FROM reports');
          console.log(`✅ Reports: ${reportsCount.count}`);
          
          // Check features table
          const featuresCount = await this.sqliteQuery('SELECT COUNT(*) as count FROM features');
          console.log(`✅ Features: ${featuresCount.count}`);
          
          // Check sites table
          const sitesCount = await this.sqliteQuery('SELECT COUNT(*) as count FROM sites');
          console.log(`✅ Sites: ${sitesCount.count}`);
          
          // List features
          const features = await this.sqliteQueryAll('SELECT name, display_name FROM features LIMIT 10');
          console.log('📋 Sample features:');
          features.forEach(f => console.log(`   - ${f.display_name} (${f.name})`));
          
          // List sites
          const sites = await this.sqliteQueryAll('SELECT name FROM sites');
          console.log('📋 Available sites:');
          sites.forEach(s => console.log(`   - ${s.name}`));
          
          console.log('✅ SQLite verification completed');
          resolve();
          
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  async testHybridQueries() {
    console.log('🔍 Testing hybrid database queries...');
    
    const database = require('./utils/databaseHybrid');
    
    try {
      // Test PostgreSQL tables (if available)
      if (this.pgPool) {
        const adminTest = await database.get('SELECT COUNT(*) as count FROM admin');
        console.log(`✅ Hybrid admin query: ${adminTest.count} records`);
        
        const atrTest = await database.get('SELECT COUNT(*) as count FROM atr_documents');
        console.log(`✅ Hybrid ATR query: ${atrTest.count} records`);
      }
      
      // Test SQLite tables
      const violationsTest = await database.get('SELECT COUNT(*) as count FROM violations');
      console.log(`✅ Hybrid violations query: ${violationsTest.count} records`);
      
      const featuresTest = await database.get('SELECT COUNT(*) as count FROM features');
      console.log(`✅ Hybrid features query: ${featuresTest.count} records`);
      
      console.log('✅ Hybrid database queries working correctly');
      
    } catch (error) {
      console.error('❌ Hybrid query test failed:', error.message);
      throw error;
    }
  }

  sqliteQuery(query) {
    return new Promise((resolve, reject) => {
      this.sqliteDb.get(query, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
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
  const verifier = new DatabaseVerifier();
  
  try {
    await verifier.verify();
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

module.exports = DatabaseVerifier;