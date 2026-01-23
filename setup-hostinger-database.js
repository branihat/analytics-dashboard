#!/usr/bin/env node

/**
 * Hostinger PostgreSQL Database Setup Script
 * 
 * This script initializes your PostgreSQL database on Hostinger VPS
 * and creates all necessary tables and default data.
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class HostingerDatabaseSetup {
  constructor() {
    this.connectionString = null;
    this.pool = null;
  }

  async setup() {
    console.log('🚀 Hostinger PostgreSQL Database Setup\n');
    
    try {
      await this.getConnectionDetails();
      await this.testConnection();
      await this.createTables();
      await this.createDefaultUsers();
      await this.updateEnvironmentFile();
      await this.verifySetup();
      
      console.log('\n🎉 Database setup completed successfully!');
      this.displaySummary();
      
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      process.exit(1);
    } finally {
      if (this.pool) {
        await this.pool.end();
      }
      rl.close();
    }
  }

  async getConnectionDetails() {
    console.log('📋 PostgreSQL Connection Setup');
    console.log('===============================\n');
    
    console.log('If you haven\'t installed PostgreSQL yet, run this first:');
    console.log('chmod +x hostinger-postgresql-setup.sh');
    console.log('./hostinger-postgresql-setup.sh\n');
    
    const useDefault = await this.question('Use default connection settings? (y/n): ');
    
    if (useDefault.toLowerCase() === 'y') {
      const dbPassword = await this.question('Enter your PostgreSQL password: ');
      this.connectionString = `postgresql://analytics_user:${dbPassword}@localhost:5432/analytics_dashboard`;
    } else {
      const host = await this.question('Enter PostgreSQL host (default: localhost): ') || 'localhost';
      const port = await this.question('Enter PostgreSQL port (default: 5432): ') || '5432';
      const database = await this.question('Enter database name: ');
      const username = await this.question('Enter username: ');
      const password = await this.question('Enter password: ');
      
      this.connectionString = `postgresql://${username}:${password}@${host}:${port}/${database}`;
    }
    
    console.log('\n✅ Connection string configured');
  }

  async testConnection() {
    console.log('🔄 Testing database connection...');
    
    this.pool = new Pool({
      connectionString: this.connectionString,
      ssl: false // Local connection, no SSL needed
    });

    try {
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
      
      console.log('✅ Database connection successful!');
      console.log(`✅ Connected at: ${result.rows[0].current_time}`);
      console.log(`✅ PostgreSQL version: ${result.rows[0].pg_version.split(' ')[1]}`);
      
      client.release();
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async createTables() {
    console.log('\n🔄 Creating database tables...');
    
    const client = await this.pool.connect();
    
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
      console.log('✅ All database tables created successfully');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to create tables: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async createDefaultUsers() {
    console.log('\n🔄 Creating default users...');
    
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

    let createdCount = 0;

    // Create admin users
    for (const admin of adminUsers) {
      try {
        const hashedPassword = await bcrypt.hash(admin.password, 10);
        await this.pool.query(
          'INSERT INTO admin (username, email, password_hash, full_name, permissions) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING',
          [admin.username, admin.email, hashedPassword, admin.full_name, admin.permissions]
        );
        console.log(`✅ Created admin: ${admin.email}`);
        createdCount++;
      } catch (err) {
        console.log(`⚠️ Admin ${admin.email} might already exist`);
      }
    }

    // Create department users
    for (const user of departmentUsers) {
      try {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await this.pool.query(
          'INSERT INTO "user" (username, email, password_hash, full_name, department, access_level) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO NOTHING',
          [user.username, user.email, hashedPassword, user.full_name, user.department, user.access_level]
        );
        console.log(`✅ Created user: ${user.email}`);
        createdCount++;
      } catch (err) {
        console.log(`⚠️ User ${user.email} might already exist`);
      }
    }

    console.log(`✅ User creation completed (${createdCount} users processed)`);
  }

  async updateEnvironmentFile() {
    console.log('\n🔄 Updating environment configuration...');
    
    const envPath = path.join(__dirname, '.env');
    const backupPath = path.join(__dirname, '.env.backup');
    
    try {
      // Backup existing .env
      if (fs.existsSync(envPath)) {
        fs.copyFileSync(envPath, backupPath);
        console.log('✅ Backed up existing .env file');
      }

      // Read existing .env or create new one
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }

      // Update DATABASE_URL
      if (envContent.includes('DATABASE_URL=')) {
        envContent = envContent.replace(/DATABASE_URL=.*/, `DATABASE_URL=${this.connectionString}`);
      } else {
        envContent += `\nDATABASE_URL=${this.connectionString}`;
      }

      // Ensure other required variables exist
      const requiredVars = {
        'NODE_ENV': 'development',
        'PORT': '8080',
        'JWT_SECRET': 'your-jwt-secret-change-this-in-production',
        'CLOUDINARY_CLOUD_NAME': 'dgf5874nz',
        'CLOUDINARY_API_KEY': '873245158622578',
        'CLOUDINARY_API_SECRET': '3DF8o9ZZD-WIzuSKfS6kFQoVzp4'
      };

      for (const [key, defaultValue] of Object.entries(requiredVars)) {
        if (!envContent.includes(`${key}=`)) {
          envContent += `\n${key}=${defaultValue}`;
        }
      }

      fs.writeFileSync(envPath, envContent);
      console.log('✅ Updated .env file with new database configuration');

    } catch (error) {
      console.error('❌ Failed to update .env file:', error.message);
      console.log(`\n⚠️ Please manually update your .env file with:`);
      console.log(`DATABASE_URL=${this.connectionString}`);
    }
  }

  async verifySetup() {
    console.log('\n🔄 Verifying database setup...');
    
    try {
      // Check admin users
      const adminCount = await this.pool.query('SELECT COUNT(*) as count FROM admin');
      console.log(`✅ Admin users: ${adminCount.rows[0].count}`);
      
      // Check regular users
      const userCount = await this.pool.query('SELECT COUNT(*) as count FROM "user"');
      console.log(`✅ Department users: ${userCount.rows[0].count}`);
      
      // Check inferred reports table
      const reportsCount = await this.pool.query('SELECT COUNT(*) as count FROM inferred_reports');
      console.log(`✅ Inferred reports: ${reportsCount.rows[0].count}`);
      
      // Check ATR documents table
      const atrCount = await this.pool.query('SELECT COUNT(*) as count FROM atr_documents');
      console.log(`✅ ATR documents: ${atrCount.rows[0].count}`);
      
      console.log('✅ Database verification completed successfully');
      
    } catch (error) {
      throw new Error(`Database verification failed: ${error.message}`);
    }
  }

  displaySummary() {
    console.log('\n📋 Setup Summary');
    console.log('================');
    console.log(`✅ PostgreSQL database configured on Hostinger VPS`);
    console.log(`✅ All required tables created`);
    console.log(`✅ Default users created`);
    console.log(`✅ Environment file updated`);
    
    console.log('\n🔐 Default Login Credentials:');
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
    
    console.log('\n🔧 Management Commands:');
    console.log('- Monitor database: /home/monitor-postgresql.sh');
    console.log('- Backup database: /home/backup-postgresql.sh');
    console.log('- View config: cat /home/postgresql-config.txt');
    
    console.log('\n🚀 Next Steps:');
    console.log('1. Start your application: npm start');
    console.log('2. Test login with admin credentials');
    console.log('3. Upload some violation data');
    console.log('4. Set up regular backups (already scheduled)');
    
    console.log('\n🎉 Your Hostinger PostgreSQL database is ready!');
  }

  question(prompt) {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  }
}

// Main execution
async function main() {
  const setup = new HostingerDatabaseSetup();
  await setup.setup();
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = HostingerDatabaseSetup;