// Direct PostgreSQL Migration - Bypass hybrid system
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Manually load environment variables from .env file
function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, 'src/backend/.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    
    console.log('✅ Environment variables loaded from .env file');
  } catch (err) {
    console.log('⚠️ Could not load .env file:', err.message);
  }
}

// Load environment variables
loadEnvFile();

console.log('🔍 Environment check:');
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL value:', process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^@]*@/, ':***@') : 'NOT SET');
console.log('');

async function directPostgreSQLMigration() {
  let pool = null;
  
  try {
    console.log('🔄 Starting DIRECT PostgreSQL migration...');
    
    // Create direct PostgreSQL connection
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false // Local connection, no SSL needed
    });
    
    console.log('🔗 Testing PostgreSQL connection...');
    const testResult = await pool.query('SELECT 1 as test, version() as db_version');
    console.log('✅ Direct PostgreSQL connection successful!');
    console.log('📊 Database:', testResult.rows[0].db_version.split(' ')[0], testResult.rows[0].db_version.split(' ')[1]);
    console.log('');

    // Check if violations table exists
    console.log('🔍 Checking if violations table exists...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('violations', 'reports', 'admin', 'user')
      ORDER BY table_name
    `);
    
    console.log('📊 Tables found in PostgreSQL:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    const hasViolationsTable = tablesResult.rows.some(row => row.table_name === 'violations');
    const hasReportsTable = tablesResult.rows.some(row => row.table_name === 'reports');
    const hasAdminTable = tablesResult.rows.some(row => row.table_name === 'admin');
    const hasUserTable = tablesResult.rows.some(row => row.table_name === 'user');
    
    console.log('');
    console.log('🔍 Table status:');
    console.log('violations table:', hasViolationsTable ? '✅ EXISTS' : '❌ MISSING');
    console.log('reports table:', hasReportsTable ? '✅ EXISTS' : '❌ MISSING');
    console.log('admin table:', hasAdminTable ? '✅ EXISTS' : '❌ MISSING');
    console.log('user table:', hasUserTable ? '✅ EXISTS' : '❌ MISSING');
    console.log('');

    if (!hasAdminTable || !hasUserTable) {
      console.log('⚠️ Admin/User tables missing - this explains the 401 error!');
      console.log('🔧 Creating admin and user tables...');
      
      // Create admin table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS admin (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          full_name VARCHAR(255),
          permissions VARCHAR(50) DEFAULT 'all',
          organization_id INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Admin table created');
      
      // Create user table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "user" (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          full_name VARCHAR(255),
          department VARCHAR(255),
          access_level VARCHAR(50) DEFAULT 'basic',
          organization_id INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ User table created');
      
      // Create organizations table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS organizations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          logo_url VARCHAR(500),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Organizations table created');
      
      // Insert default CCL organization
      await pool.query(`
        INSERT INTO organizations (id, name) 
        VALUES (1, 'CCL Organization') 
        ON CONFLICT (id) DO NOTHING
      `);
      console.log('✅ Default CCL organization created');
    }

    // Check violations table columns
    if (hasViolationsTable) {
      console.log('🔍 Checking violations table columns...');
      const violationsColumns = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'violations'
        ORDER BY ordinal_position
      `);
      
      console.log('📊 Violations table columns:');
      violationsColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
      
      const hasOrgId = violationsColumns.rows.some(col => col.column_name === 'organization_id');
      const hasUploadedBy = violationsColumns.rows.some(col => col.column_name === 'uploaded_by');
      
      console.log('');
      console.log('🔍 Violations column status:');
      console.log('organization_id:', hasOrgId ? '✅ EXISTS' : '❌ MISSING');
      console.log('uploaded_by:', hasUploadedBy ? '✅ EXISTS' : '❌ MISSING');
      
      if (!hasOrgId) {
        console.log('📊 Adding organization_id column to violations table...');
        await pool.query('ALTER TABLE violations ADD COLUMN organization_id INTEGER DEFAULT 1');
        console.log('✅ Added organization_id to violations table');
      }
      
      if (!hasUploadedBy) {
        console.log('📊 Adding uploaded_by column to violations table...');
        await pool.query('ALTER TABLE violations ADD COLUMN uploaded_by INTEGER');
        console.log('✅ Added uploaded_by to violations table');
      }
    } else {
      console.log('⚠️ Violations table does not exist in PostgreSQL');
      console.log('This suggests violations data is in SQLite, not PostgreSQL');
    }

    // Check reports table columns
    if (hasReportsTable) {
      console.log('');
      console.log('🔍 Checking reports table columns...');
      const reportsColumns = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'reports'
        ORDER BY ordinal_position
      `);
      
      console.log('📊 Reports table columns:');
      reportsColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
      
      const hasOrgId = reportsColumns.rows.some(col => col.column_name === 'organization_id');
      const hasUploadedBy = reportsColumns.rows.some(col => col.column_name === 'uploaded_by');
      
      console.log('');
      console.log('🔍 Reports column status:');
      console.log('organization_id:', hasOrgId ? '✅ EXISTS' : '❌ MISSING');
      console.log('uploaded_by:', hasUploadedBy ? '✅ EXISTS' : '❌ MISSING');
      
      if (!hasOrgId) {
        console.log('📊 Adding organization_id column to reports table...');
        await pool.query('ALTER TABLE reports ADD COLUMN organization_id INTEGER DEFAULT 1');
        console.log('✅ Added organization_id to reports table');
      }
      
      if (!hasUploadedBy) {
        console.log('📊 Adding uploaded_by column to reports table...');
        await pool.query('ALTER TABLE reports ADD COLUMN uploaded_by INTEGER');
        console.log('✅ Added uploaded_by to reports table');
      }
    } else {
      console.log('⚠️ Reports table does not exist in PostgreSQL');
    }

    // Check if admin users exist
    console.log('');
    console.log('🔍 Checking admin users...');
    const adminCount = await pool.query('SELECT COUNT(*) as count FROM admin');
    console.log(`📊 Admin users found: ${adminCount.rows[0].count}`);
    
    if (adminCount.rows[0].count == 0) {
      console.log('⚠️ No admin users found - this explains the 401 error!');
      console.log('🔧 Creating default admin users...');
      
      const bcrypt = require('bcryptjs');
      
      // Create super admin
      const superAdminHash = await bcrypt.hash('SuperAero@2025', 10);
      await pool.query(`
        INSERT INTO admin (username, email, password_hash, full_name, permissions, organization_id)
        VALUES ('SuperAdmin', 'superadmin@aero.com', $1, 'Aerovania Super Admin', 'all', NULL)
        ON CONFLICT (email) DO NOTHING
      `, [superAdminHash]);
      console.log('✅ Super admin created: superadmin@aero.com');
      
      // Create CCL admin
      const cclAdminHash = await bcrypt.hash('Aerovania_grhns@2002', 10);
      await pool.query(`
        INSERT INTO admin (username, email, password_hash, full_name, permissions, organization_id)
        VALUES ('CCLAdmin', 'admin1@ccl.com', $1, 'CCL Administrator', 'all', 1)
        ON CONFLICT (email) DO NOTHING
      `, [cclAdminHash]);
      console.log('✅ CCL admin created: admin1@ccl.com');
    } else {
      console.log('✅ Admin users already exist');
    }

    console.log('');
    console.log('🎉 Direct PostgreSQL migration completed successfully!');
    
    // Show final summary
    const finalAdminCount = await pool.query('SELECT COUNT(*) as count FROM admin');
    const finalUserCount = await pool.query('SELECT COUNT(*) as count FROM "user"');
    
    console.log('');
    console.log('📊 Final Summary:');
    console.log('----------------------------------------');
    console.log(`   - Database: PostgreSQL (direct connection)`);
    console.log(`   - Admin users: ${finalAdminCount.rows[0].count}`);
    console.log(`   - Regular users: ${finalUserCount.rows[0].count}`);
    console.log(`   - Authentication tables: ✅ READY`);
    console.log(`   - Organization support: ✅ READY`);
    console.log('----------------------------------------');
    console.log('');
    console.log('🔐 Test these logins:');
    console.log('   - superadmin@aero.com / SuperAero@2025');
    console.log('   - admin1@ccl.com / Aerovania_grhns@2002');

  } catch (error) {
    console.error('❌ Direct PostgreSQL migration failed:', error.message);
    console.error('❌ Error details:', error);
  } finally {
    if (pool) {
      try {
        await pool.end();
        console.log('🔌 PostgreSQL connection closed');
      } catch (err) {
        console.log('⚠️ Error closing PostgreSQL connection:', err.message);
      }
    }
  }
}

// Run migration
directPostgreSQLMigration();