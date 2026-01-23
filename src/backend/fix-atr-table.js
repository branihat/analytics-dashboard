#!/usr/bin/env node

/**
 * Fix ATR Documents Table
 * 
 * This script creates the missing atr_documents table in PostgreSQL
 * and ensures the hybrid database setup is working correctly.
 */

const database = require('./utils/databaseHybrid');

class ATRTableFixer {
  async fix() {
    console.log('🔄 Fixing ATR documents table...\n');

    try {
      await this.checkCurrentSetup();
      await this.createMissingTables();
      await this.verifyTables();
      
      console.log('\n✅ ATR table fix completed successfully!');
      
    } catch (error) {
      console.error('❌ Fix failed:', error.message);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async checkCurrentSetup() {
    console.log('🔍 Checking current database setup...');
    
    try {
      // Check if PostgreSQL is available
      const adminCount = await database.get('SELECT COUNT(*) as count FROM admin');
      console.log(`✅ PostgreSQL connection working - ${adminCount.count} admin users found`);
    } catch (error) {
      console.log('⚠️ PostgreSQL connection issue:', error.message);
    }

    try {
      // Check if atr_documents table exists in PostgreSQL
      const tableCheck = await database.get(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'atr_documents'
      `);
      
      if (tableCheck) {
        console.log('✅ atr_documents table exists in PostgreSQL');
      } else {
        console.log('❌ atr_documents table missing in PostgreSQL');
      }
    } catch (error) {
      console.log('❌ Could not check atr_documents table:', error.message);
    }
  }

  async createMissingTables() {
    console.log('\n🔄 Creating missing PostgreSQL tables...');
    
    try {
      // Create atr_documents table
      await database.run(`
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
      console.log('✅ atr_documents table created/verified');

      // Also ensure inferred_reports table exists
      await database.run(`
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
      console.log('✅ inferred_reports table created/verified');

      // Ensure admin table exists
      await database.run(`
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
      console.log('✅ admin table created/verified');

      // Ensure user table exists
      await database.run(`
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
      console.log('✅ user table created/verified');

    } catch (error) {
      throw new Error(`Failed to create tables: ${error.message}`);
    }
  }

  async verifyTables() {
    console.log('\n🔍 Verifying table setup...');
    
    try {
      // Check admin table
      const adminCount = await database.get('SELECT COUNT(*) as count FROM admin');
      console.log(`✅ Admin table: ${adminCount.count} records`);
      
      // Check user table
      const userCount = await database.get('SELECT COUNT(*) as count FROM "user"');
      console.log(`✅ User table: ${userCount.count} records`);
      
      // Check inferred_reports table
      const reportsCount = await database.get('SELECT COUNT(*) as count FROM inferred_reports');
      console.log(`✅ Inferred reports table: ${reportsCount.count} records`);
      
      // Check atr_documents table
      const atrCount = await database.get('SELECT COUNT(*) as count FROM atr_documents');
      console.log(`✅ ATR documents table: ${atrCount.count} records`);
      
      console.log('✅ All PostgreSQL tables verified');
      
    } catch (error) {
      throw new Error(`Table verification failed: ${error.message}`);
    }
  }

  async cleanup() {
    try {
      await database.close();
    } catch (error) {
      console.error('Error during cleanup:', error.message);
    }
  }
}

// Main execution
async function main() {
  const fixer = new ATRTableFixer();
  
  try {
    await fixer.fix();
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

module.exports = ATRTableFixer;