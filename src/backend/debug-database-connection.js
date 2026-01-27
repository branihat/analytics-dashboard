#!/usr/bin/env node

/**
 * Database Connection Debug Script
 * 
 * This script helps diagnose PostgreSQL connection issues on VPS
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

class DatabaseDebugger {
  async debug() {
    console.log('🔍 Debugging PostgreSQL Connection Issues\n');

    try {
      await this.checkEnvironment();
      await this.checkPostgreSQLService();
      await this.testConnections();
      await this.suggestFixes();
      
    } catch (error) {
      console.error('❌ Debug failed:', error.message);
    }
  }

  async checkEnvironment() {
    console.log('📋 Environment Check:');
    console.log('===================');
    
    // Check .env file
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      console.log('✅ .env file exists');
      
      const envContent = fs.readFileSync(envPath, 'utf8');
      const databaseUrl = envContent.match(/DATABASE_URL=(.+)/);
      
      if (databaseUrl) {
        console.log('✅ DATABASE_URL found in .env');
        console.log(`📋 DATABASE_URL: ${databaseUrl[1]}`);
        
        // Parse the URL
        try {
          const url = new URL(databaseUrl[1]);
          console.log(`📋 Host: ${url.hostname}`);
          console.log(`📋 Port: ${url.port || 5432}`);
          console.log(`📋 Database: ${url.pathname.slice(1)}`);
          console.log(`📋 Username: ${url.username}`);
          console.log(`📋 Password: ${url.password ? '[HIDDEN]' : 'NOT SET'}`);
        } catch (urlError) {
          console.log('❌ Invalid DATABASE_URL format');
        }
      } else {
        console.log('❌ DATABASE_URL not found in .env');
      }
    } else {
      console.log('❌ .env file not found');
    }
    
    console.log('');
  }

  async checkPostgreSQLService() {
    console.log('🔍 PostgreSQL Service Check:');
    console.log('============================');
    
    const { exec } = require('child_process');
    
    // Check if PostgreSQL is installed
    await this.runCommand('which psql', 'PostgreSQL client installed');
    
    // Check PostgreSQL service status
    await this.runCommand('sudo systemctl status postgresql --no-pager -l', 'PostgreSQL service status');
    
    // Check if PostgreSQL is listening
    await this.runCommand('sudo netstat -tlnp | grep 5432', 'PostgreSQL listening on port 5432');
    
    // Check PostgreSQL version
    await this.runCommand('sudo -u postgres psql -c "SELECT version();"', 'PostgreSQL version');
    
    console.log('');
  }

  async runCommand(command, description) {
    return new Promise((resolve) => {
      const { exec } = require('child_process');
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.log(`❌ ${description}: ${error.message}`);
        } else {
          console.log(`✅ ${description}:`);
          if (stdout) console.log(stdout.trim());
          if (stderr) console.log(`   Warning: ${stderr.trim()}`);
        }
        resolve();
      });
    });
  }

  async testConnections() {
    console.log('🔗 Connection Tests:');
    console.log('===================');
    
    // Test 1: Local PostgreSQL connection as postgres user
    console.log('📋 Test 1: Local connection as postgres user');
    await this.testConnection('postgresql://postgres@localhost:5432/postgres', 'Local postgres user');
    
    // Test 2: Connection from .env file
    console.log('\n📋 Test 2: Connection from .env file');
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const databaseUrl = envContent.match(/DATABASE_URL=(.+)/);
      
      if (databaseUrl) {
        await this.testConnection(databaseUrl[1].trim(), '.env DATABASE_URL');
      } else {
        console.log('❌ No DATABASE_URL found in .env');
      }
    } else {
      console.log('❌ No .env file found');
    }
    
    // Test 3: Default local connection
    console.log('\n📋 Test 3: Default local analytics connection');
    await this.testConnection('postgresql://analytics_user:test@localhost:5432/analytics_dashboard', 'Default analytics connection');
    
    console.log('');
  }

  async testConnection(connectionString, description) {
    try {
      console.log(`🔄 Testing ${description}...`);
      
      const pool = new Pool({
        connectionString: connectionString,
        ssl: false,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 5000
      });

      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as current_time');
      
      console.log(`✅ ${description}: Connected successfully`);
      console.log(`   Time: ${result.rows[0].current_time}`);
      
      client.release();
      await pool.end();
      
    } catch (error) {
      console.log(`❌ ${description}: ${error.message}`);
      
      // Provide specific error analysis
      if (error.message.includes('ECONNRESET')) {
        console.log('   → Connection was reset by server');
      } else if (error.message.includes('ECONNREFUSED')) {
        console.log('   → Connection refused (PostgreSQL not running?)');
      } else if (error.message.includes('authentication failed')) {
        console.log('   → Authentication failed (wrong password?)');
      } else if (error.message.includes('database') && error.message.includes('does not exist')) {
        console.log('   → Database does not exist');
      } else if (error.message.includes('timeout')) {
        console.log('   → Connection timeout');
      }
    }
  }

  async suggestFixes() {
    console.log('🔧 Suggested Fixes:');
    console.log('==================');
    
    console.log('1. Check PostgreSQL Service:');
    console.log('   sudo systemctl status postgresql');
    console.log('   sudo systemctl start postgresql');
    console.log('   sudo systemctl enable postgresql');
    console.log('');
    
    console.log('2. Check PostgreSQL Configuration:');
    console.log('   sudo -u postgres psql -c "SHOW config_file;"');
    console.log('   sudo nano /etc/postgresql/*/main/postgresql.conf');
    console.log('   # Ensure: listen_addresses = \'localhost\'');
    console.log('');
    
    console.log('3. Check Authentication Configuration:');
    console.log('   sudo nano /etc/postgresql/*/main/pg_hba.conf');
    console.log('   # Add: local   analytics_dashboard   analytics_user   md5');
    console.log('');
    
    console.log('4. Create Database and User (if not exists):');
    console.log('   sudo -u postgres psql << EOF');
    console.log('   CREATE DATABASE analytics_dashboard;');
    console.log('   CREATE USER analytics_user WITH PASSWORD \'your_password\';');
    console.log('   GRANT ALL PRIVILEGES ON DATABASE analytics_dashboard TO analytics_user;');
    console.log('   ALTER USER analytics_user CREATEDB;');
    console.log('   \\q');
    console.log('   EOF');
    console.log('');
    
    console.log('5. Test Manual Connection:');
    console.log('   PGPASSWORD="your_password" psql -h localhost -U analytics_user -d analytics_dashboard -c "SELECT \'Connected!\' as status;"');
    console.log('');
    
    console.log('6. Restart PostgreSQL:');
    console.log('   sudo systemctl restart postgresql');
    console.log('');
    
    console.log('7. Check Firewall (if applicable):');
    console.log('   sudo ufw status');
    console.log('   sudo ufw allow from 127.0.0.1 to any port 5432');
    console.log('');
  }
}

// Main execution
async function main() {
  const dbDebugger = new DatabaseDebugger();
  await dbDebugger.debug();
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = DatabaseDebugger;