#!/usr/bin/env node

/**
 * Database Credentials Checker
 * 
 * This script will:
 * 1. Connect to both PostgreSQL and SQLite databases
 * 2. List all admin and user accounts with their credentials info
 * 3. Verify database structure and data integrity
 * 4. Test login functionality
 */

const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

class DatabaseCredentialsChecker {
  constructor() {
    this.pgPool = null;
    this.sqliteDb = null;
    this.DATABASE_URL = process.env.DATABASE_URL || 'YOUR_NEW_POSTGRESQL_URL_HERE';
  }

  async checkCredentials() {
    console.log('🔍 Database Credentials Checker');
    console.log('=====================================\n');

    try {
      // Step 1: Connect to databases
      await this.connectDatabases();
      
      // Step 2: Check PostgreSQL user data
      await this.checkPostgreSQLUsers();
      
      // Step 3: Check SQLite data
      await this.checkSQLiteData();
      
      // Step 4: Test login functionality
      await this.testLoginFunctionality();
      
      console.log('\n✅ Database credentials check completed successfully!');
      
    } catch (error) {
      console.error('❌ Credentials check failed:', error.message);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async connectDatabases() {
    console.log('🔄 Connecting to databases...\n');

    // Check environment
    console.log('📋 Environment Configuration:');
    console.log(`   DATABASE_URL: ${this.DATABASE_URL ? 'Set' : 'Not Set'}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log('');

    // Connect to PostgreSQL
    if (this.DATABASE_URL && this.DATABASE_URL !== 'YOUR_NEW_POSTGRESQL_URL_HERE') {
      try {
        this.pgPool = new Pool({
          connectionString: this.DATABASE_URL,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
          max: 5,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
        });

        const client = await this.pgPool.connect();
        console.log('✅ PostgreSQL connection successful');
        client.release();
      } catch (error) {
        console.error('❌ PostgreSQL connection failed:', error.message);
        console.log('⚠️ Will check SQLite only\n');
      }
    } else {
      console.log('⚠️ PostgreSQL DATABASE_URL not configured\n');
    }

    // Connect to SQLite
    const sqlitePath = path.join(__dirname, 'data/violations.db');
    try {
      this.sqliteDb = new sqlite3.Database(sqlitePath, (err) => {
        if (err) {
          console.error('❌ SQLite connection failed:', err.message);
        } else {
          console.log('✅ SQLite connection successful');
        }
      });
    } catch (error) {
      console.error('❌ SQLite connection failed:', error.message);
    }

    console.log('');
  }

  async checkPostgreSQLUsers() {
    if (!this.pgPool) {
      console.log('⚠️ Skipping PostgreSQL user check (not connected)\n');
      return;
    }

    console.log('👥 PostgreSQL User Accounts');
    console.log('============================\n');

    try {
      // Check admin users
      console.log('🔐 ADMIN ACCOUNTS:');
      console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
      
      const adminUsers = await this.queryPostgres('SELECT id, username, email, full_name, permissions, created_at FROM admin ORDER BY id');
      
      if (adminUsers.length === 0) {
        console.log('│ ❌ No admin accounts found!                                                    │');
      } else {
        adminUsers.forEach((admin, index) => {
          console.log(`│ ${index + 1}. ID: ${admin.id.toString().padEnd(3)} | Email: ${admin.email.padEnd(25)} │`);
          console.log(`│    Username: ${admin.username.padEnd(15)} | Name: ${(admin.full_name || 'N/A').padEnd(20)} │`);
          console.log(`│    Permissions: ${admin.permissions.padEnd(10)} | Created: ${admin.created_at.toISOString().split('T')[0]} │`);
          if (index < adminUsers.length - 1) console.log('├─────────────────────────────────────────────────────────────────────────────┤');
        });
      }
      console.log('└─────────────────────────────────────────────────────────────────────────────┘\n');

      // Check regular users
      console.log('👤 DEPARTMENT USER ACCOUNTS:');
      console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
      
      const regularUsers = await this.queryPostgres('SELECT id, username, email, full_name, department, access_level, created_at FROM "user" ORDER BY id');
      
      if (regularUsers.length === 0) {
        console.log('│ ❌ No department user accounts found!                                          │');
      } else {
        regularUsers.forEach((user, index) => {
          console.log(`│ ${index + 1}. ID: ${user.id.toString().padEnd(3)} | Email: ${user.email.padEnd(25)} │`);
          console.log(`│    Username: ${user.username.padEnd(15)} | Name: ${(user.full_name || 'N/A').padEnd(20)} │`);
          console.log(`│    Department: ${(user.department || 'N/A').padEnd(18)} | Access: ${user.access_level.padEnd(8)} │`);
          console.log(`│    Created: ${user.created_at.toISOString().split('T')[0].padEnd(45)} │`);
          if (index < regularUsers.length - 1) console.log('├─────────────────────────────────────────────────────────────────────────────┤');
        });
      }
      console.log('└─────────────────────────────────────────────────────────────────────────────┘\n');

      // Check other PostgreSQL tables
      await this.checkPostgreSQLTables();

    } catch (error) {
      console.error('❌ Error checking PostgreSQL users:', error.message);
    }
  }

  async checkPostgreSQLTables() {
    console.log('📊 PostgreSQL Tables Status:');
    console.log('┌─────────────────────────────────────────────────────────────────────────────┐');

    const tables = ['admin', 'user', 'inferred_reports', 'atr_documents', 'uploaded_atr', 'organizations'];
    
    for (const table of tables) {
      try {
        const countQuery = table === 'user' ? 'SELECT COUNT(*) as count FROM "user"' : `SELECT COUNT(*) as count FROM ${table}`;
        const result = await this.queryPostgres(countQuery);
        const count = result[0]?.count || 0;
        console.log(`│ ${table.padEnd(20)}: ${count.toString().padStart(5)} records${' '.repeat(44)} │`);
      } catch (error) {
        console.log(`│ ${table.padEnd(20)}: ERROR - ${error.message.substring(0, 40).padEnd(40)} │`);
      }
    }
    
    console.log('└─────────────────────────────────────────────────────────────────────────────┘\n');
  }

  async checkSQLiteData() {
    if (!this.sqliteDb) {
      console.log('⚠️ Skipping SQLite data check (not connected)\n');
      return;
    }

    console.log('💾 SQLite Database Status');
    console.log('==========================\n');

    const tables = ['violations', 'reports', 'features', 'sites', 'videos_links'];
    
    console.log('📊 SQLite Tables Status:');
    console.log('┌─────────────────────────────────────────────────────────────────────────────┐');

    for (const table of tables) {
      try {
        const count = await this.querySQLite(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`│ ${table.padEnd(20)}: ${count.count.toString().padStart(5)} records${' '.repeat(44)} │`);
      } catch (error) {
        console.log(`│ ${table.padEnd(20)}: ERROR - ${error.message.substring(0, 40).padEnd(40)} │`);
      }
    }
    
    console.log('└─────────────────────────────────────────────────────────────────────────────┘\n');

    // Show features and sites
    try {
      const features = await this.querySQLiteAll('SELECT name, display_name FROM features WHERE is_active = 1');
      if (features.length > 0) {
        console.log('🎯 Available Features:');
        features.forEach((feature, index) => {
          console.log(`   ${index + 1}. ${feature.display_name} (${feature.name})`);
        });
        console.log('');
      }

      const sites = await this.querySQLiteAll('SELECT name FROM sites');
      if (sites.length > 0) {
        console.log('🏢 Available Sites:');
        sites.forEach((site, index) => {
          console.log(`   ${index + 1}. ${site.name}`);
        });
        console.log('');
      }
    } catch (error) {
      console.error('❌ Error checking SQLite data:', error.message);
    }
  }

  async testLoginFunctionality() {
    if (!this.pgPool) {
      console.log('⚠️ Skipping login test (PostgreSQL not connected)\n');
      return;
    }

    console.log('🔐 Testing Login Functionality');
    console.log('===============================\n');

    const testCredentials = [
      { email: 'admin1@ccl.com', password: 'Aerovania_grhns@2002', type: 'admin' },
      { email: 'superadmin1@ccl.com', password: 'Super_Aerovania_grhns@2002', type: 'admin' },
      { email: 'et@ccl.com', password: 'deptet123', type: 'user' },
      { email: 'security@ccl.com', password: 'deptsecurity123', type: 'user' }
    ];

    console.log('🧪 Testing Credentials:');
    console.log('┌─────────────────────────────────────────────────────────────────────────────┐');

    for (const cred of testCredentials) {
      try {
        const table = cred.type === 'admin' ? 'admin' : '"user"';
        const user = await this.queryPostgres(`SELECT id, email, password_hash, full_name FROM ${table} WHERE email = $1`, [cred.email]);
        
        if (user.length === 0) {
          console.log(`│ ❌ ${cred.email.padEnd(30)}: User not found${' '.repeat(25)} │`);
        } else {
          const isValid = await bcrypt.compare(cred.password, user[0].password_hash);
          const status = isValid ? '✅ Valid' : '❌ Invalid';
          console.log(`│ ${status} ${cred.email.padEnd(30)}: ${(user[0].full_name || 'N/A').padEnd(20)} │`);
        }
      } catch (error) {
        console.log(`│ ❌ ${cred.email.padEnd(30)}: Error - ${error.message.substring(0, 20)} │`);
      }
    }
    
    console.log('└─────────────────────────────────────────────────────────────────────────────┘\n');
  }

  // Helper methods
  async queryPostgres(query, params = []) {
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
  const checker = new DatabaseCredentialsChecker();
  
  try {
    await checker.checkCredentials();
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

module.exports = DatabaseCredentialsChecker;