#!/usr/bin/env node

/**
 * New Database Setup Script
 * 
 * This script helps you configure a new PostgreSQL database
 * and migrate from the old Railway database if needed.
 */

const { Pool } = require('pg');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class DatabaseSetup {
  constructor() {
    this.newDatabaseUrl = null;
    this.oldDatabaseUrl = null;
  }

  async setup() {
    console.log('🚀 New PostgreSQL Database Setup\n');
    
    try {
      await this.getDatabaseUrl();
      await this.testConnection();
      await this.createTables();
      await this.askForMigration();
      await this.updateEnvironment();
      
      console.log('\n🎉 Database setup completed successfully!');
      console.log('\n📋 Next Steps:');
      console.log('1. Update your .env file with the new DATABASE_URL');
      console.log('2. Restart your application');
      console.log('3. Test the login functionality');
      
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
    } finally {
      rl.close();
    }
  }

  async getDatabaseUrl() {
    console.log('📋 Database Options:');
    console.log('1. Hostinger PostgreSQL Addon');
    console.log('2. Supabase (Free tier)');
    console.log('3. Neon (Free tier)');
    console.log('4. ElephantSQL (Free tier)');
    console.log('5. Self-hosted on VPS');
    console.log('6. Custom URL');
    
    const choice = await this.question('\nChoose your database option (1-6): ');
    
    switch (choice) {
      case '1':
        await this.setupHostinger();
        break;
      case '2':
        await this.setupSupabase();
        break;
      case '3':
        await this.setupNeon();
        break;
      case '4':
        await this.setupElephantSQL();
        break;
      case '5':
        await this.setupSelfHosted();
        break;
      case '6':
        await this.setupCustom();
        break;
      default:
        throw new Error('Invalid choice');
    }
  }

  async setupHostinger() {
    console.log('\n📋 Hostinger PostgreSQL Setup:');
    console.log('1. Login to your Hostinger control panel');
    console.log('2. Go to your VPS management');
    console.log('3. Add PostgreSQL addon');
    console.log('4. Note the connection details\n');
    
    const host = await this.question('Enter PostgreSQL host (e.g., localhost): ');
    const port = await this.question('Enter port (default 5432): ') || '5432';
    const database = await this.question('Enter database name: ');
    const username = await this.question('Enter username: ');
    const password = await this.question('Enter password: ');
    
    this.newDatabaseUrl = `postgresql://${username}:${password}@${host}:${port}/${database}`;
  }

  async setupSupabase() {
    console.log('\n📋 Supabase Setup:');
    console.log('1. Go to https://supabase.com');
    console.log('2. Sign up for free account');
    console.log('3. Create new project');
    console.log('4. Go to Settings > Database');
    console.log('5. Copy the connection string\n');
    
    this.newDatabaseUrl = await this.question('Paste your Supabase connection string: ');
  }

  async setupNeon() {
    console.log('\n📋 Neon Setup:');
    console.log('1. Go to https://neon.tech');
    console.log('2. Sign up for free account');
    console.log('3. Create new project');
    console.log('4. Copy connection string from dashboard\n');
    
    this.newDatabaseUrl = await this.question('Paste your Neon connection string: ');
  }

  async setupElephantSQL() {
    console.log('\n📋 ElephantSQL Setup:');
    console.log('1. Go to https://elephantsql.com');
    console.log('2. Sign up for free account');
    console.log('3. Create new instance (Tiny Turtle - Free)');
    console.log('4. Copy connection URL\n');
    
    this.newDatabaseUrl = await this.question('Paste your ElephantSQL connection URL: ');
  }

  async setupSelfHosted() {
    console.log('\n📋 Self-hosted PostgreSQL Setup:');
    console.log('Run this on your VPS first:\n');
    
    const installScript = `
# Install PostgreSQL
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE analytics_dashboard;
CREATE USER analytics_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE analytics_dashboard TO analytics_user;
ALTER USER analytics_user CREATEDB;
\\q
EOF
`;
    
    console.log(installScript);
    
    await this.question('Press Enter after running the installation script...');
    
    const password = await this.question('Enter the password you set for analytics_user: ');
    this.newDatabaseUrl = `postgresql://analytics_user:${password}@localhost:5432/analytics_dashboard`;
  }

  async setupCustom() {
    this.newDatabaseUrl = await this.question('Enter your custom PostgreSQL connection string: ');
  }

  async testConnection() {
    console.log('\n🔄 Testing database connection...');
    
    const pool = new Pool({
      connectionString: this.newDatabaseUrl,
      ssl: this.newDatabaseUrl.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      console.log('✅ Database connection successful!');
      console.log(`✅ Connected at: ${result.rows[0].now}`);
      client.release();
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    } finally {
      await pool.end();
    }
  }

  async createTables() {
    console.log('\n🔄 Creating database tables...');
    
    const pool = new Pool({
      connectionString: this.newDatabaseUrl,
      ssl: this.newDatabaseUrl.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    const client = await pool.connect();
    
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

      await client.query('COMMIT');
      console.log('✅ Database tables created successfully');
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
      await pool.end();
    }
  }

  async askForMigration() {
    const migrate = await this.question('\nDo you want to migrate data from the old Railway database? (y/n): ');
    
    if (migrate.toLowerCase() === 'y') {
      this.oldDatabaseUrl = 'postgresql://postgres:yaVFUmPvjlfJJRDmjTHrUtyXnpvFMbaD@shinkansen.proxy.rlwy.net:45978/railway';
      await this.migrateData();
    } else {
      await this.createDefaultUsers();
    }
  }

  async migrateData() {
    console.log('\n🔄 Migrating data from old database...');
    
    const oldPool = new Pool({
      connectionString: this.oldDatabaseUrl,
      ssl: { rejectUnauthorized: false }
    });

    const newPool = new Pool({
      connectionString: this.newDatabaseUrl,
      ssl: this.newDatabaseUrl.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    try {
      // Migrate admin users
      const admins = await oldPool.query('SELECT * FROM admin');
      for (const admin of admins.rows) {
        await newPool.query(
          'INSERT INTO admin (username, email, password_hash, full_name, permissions, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO NOTHING',
          [admin.username, admin.email, admin.password_hash, admin.full_name, admin.permissions, admin.created_at]
        );
      }
      console.log(`✅ Migrated ${admins.rows.length} admin users`);

      // Migrate regular users
      const users = await oldPool.query('SELECT * FROM "user"');
      for (const user of users.rows) {
        await newPool.query(
          'INSERT INTO "user" (username, email, password_hash, full_name, department, access_level, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (email) DO NOTHING',
          [user.username, user.email, user.password_hash, user.full_name, user.department, user.access_level, user.created_at]
        );
      }
      console.log(`✅ Migrated ${users.rows.length} regular users`);

      // Migrate inferred reports
      const reports = await oldPool.query('SELECT * FROM inferred_reports');
      for (const report of reports.rows) {
        await newPool.query(
          'INSERT INTO inferred_reports (filename, site_name, cloudinary_url, cloudinary_public_id, department, uploaded_by, file_size, upload_date, comment, ai_report_url, ai_report_public_id, hyperlink) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
          [report.filename, report.site_name, report.cloudinary_url, report.cloudinary_public_id, report.department, report.uploaded_by, report.file_size, report.upload_date, report.comment, report.ai_report_url, report.ai_report_public_id, report.hyperlink]
        );
      }
      console.log(`✅ Migrated ${reports.rows.length} inferred reports`);

      // Migrate ATR documents
      const atrDocs = await oldPool.query('SELECT * FROM atr_documents');
      for (const doc of atrDocs.rows) {
        await newPool.query(
          'INSERT INTO atr_documents (filename, cloudinary_url, cloudinary_public_id, site_name, department, uploaded_by, file_size, upload_date, comment, inferred_report_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
          [doc.filename, doc.cloudinary_url, doc.cloudinary_public_id, doc.site_name, doc.department, doc.uploaded_by, doc.file_size, doc.upload_date, doc.comment, doc.inferred_report_id]
        );
      }
      console.log(`✅ Migrated ${atrDocs.rows.length} ATR documents`);

    } catch (error) {
      console.error('❌ Migration error:', error.message);
      console.log('⚠️ Creating default users instead...');
      await this.createDefaultUsers();
    } finally {
      await oldPool.end();
      await newPool.end();
    }
  }

  async createDefaultUsers() {
    console.log('\n🔄 Creating default users...');
    
    const bcrypt = require('bcryptjs');
    const pool = new Pool({
      connectionString: this.newDatabaseUrl,
      ssl: this.newDatabaseUrl.includes('localhost') ? false : { rejectUnauthorized: false }
    });

    const adminUsers = [
      { username: 'Admin', email: 'admin1@ccl.com', password: 'Aerovania_grhns@2002', full_name: 'Aerovania Master', permissions: 'all' },
      { username: 'SuperAdmin', email: 'superadmin1@ccl.com', password: 'Super_Aerovania_grhns@2002', full_name: 'Super Aerovania Master', permissions: 'all' }
    ];
    
    const departmentUsers = [
      { username: 'et_department', email: 'et@ccl.com', password: 'deptet123', full_name: 'E&T Department User', department: 'E&T Department', access_level: 'basic' },
      { username: 'security_department', email: 'security@ccl.com', password: 'deptsecurity123', full_name: 'Security Department User', department: 'Security Department', access_level: 'basic' },
      { username: 'operation_department', email: 'operation@ccl.com', password: 'deptoperation123', full_name: 'Operation Department User', department: 'Operation Department', access_level: 'basic' },
      { username: 'survey_department', email: 'survey@ccl.com', password: 'deptsurvey123', full_name: 'Survey Department User', department: 'Survey Department', access_level: 'basic' },
      { username: 'safety_department', email: 'safety@ccl.com', password: 'deptsafety123', full_name: 'Safety Department User', department: 'Safety Department', access_level: 'basic' }
    ];

    try {
      // Create admin users
      for (const admin of adminUsers) {
        const hashedPassword = await bcrypt.hash(admin.password, 10);
        await pool.query(
          'INSERT INTO admin (username, email, password_hash, full_name, permissions) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING',
          [admin.username, admin.email, hashedPassword, admin.full_name, admin.permissions]
        );
      }
      console.log(`✅ Created ${adminUsers.length} admin users`);

      // Create department users
      for (const user of departmentUsers) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await pool.query(
          'INSERT INTO "user" (username, email, password_hash, full_name, department, access_level) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO NOTHING',
          [user.username, user.email, hashedPassword, user.full_name, user.department, user.access_level]
        );
      }
      console.log(`✅ Created ${departmentUsers.length} department users`);

    } finally {
      await pool.end();
    }
  }

  async updateEnvironment() {
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
        envContent = envContent.replace(/DATABASE_URL=.*/, `DATABASE_URL=${this.newDatabaseUrl}`);
      } else {
        envContent += `\nDATABASE_URL=${this.newDatabaseUrl}`;
      }

      // Ensure other required variables exist
      const requiredVars = {
        'NODE_ENV': 'development',
        'PORT': '8080',
        'JWT_SECRET': 'your-jwt-secret-change-this',
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
      console.log('✅ Updated .env file with new database URL');

    } catch (error) {
      console.error('❌ Failed to update .env file:', error.message);
      console.log(`\n⚠️ Please manually update your .env file with:`);
      console.log(`DATABASE_URL=${this.newDatabaseUrl}`);
    }
  }

  question(prompt) {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  }
}

// Main execution
async function main() {
  const setup = new DatabaseSetup();
  await setup.setup();
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = DatabaseSetup;