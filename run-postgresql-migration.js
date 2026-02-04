// Run PostgreSQL Migration - Properly configured
require('dotenv').config({ path: './src/backend/.env' });

console.log('🔍 Environment check:');
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL value:', process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^@]*@/, ':***@') : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('');

const database = require('./src/backend/utils/databaseHybrid');

async function migrateViolationsOrganization() {
  try {
    console.log('🔄 Starting violations organization migration with PostgreSQL...');

    // Test connection first
    let testResult;
    let dbVersion = 'Unknown';
    try {
      // Try PostgreSQL version function first
      testResult = await database.get('SELECT 1 as test, version() as db_version');
      dbVersion = testResult.db_version;
      console.log('✅ Database connection successful (PostgreSQL)');
      console.log('📊 Database:', dbVersion.split(' ')[0], dbVersion.split(' ')[1]);
    } catch (err) {
      // Fallback to SQLite test
      testResult = await database.get('SELECT 1 as test, sqlite_version() as db_version');
      dbVersion = 'SQLite ' + testResult.db_version;
      console.log('✅ Database connection successful (SQLite)');
      console.log('📊 Database:', dbVersion);
    }
    console.log('');

    // Check if organization_id column exists in violations table
    console.log('🔍 Checking violations table structure...');
    let violationsColumns;
    try {
      // Try PostgreSQL syntax first
      violationsColumns = await database.all(`
        SELECT column_name as name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'violations'
        ORDER BY ordinal_position
      `);
      console.log('📋 Using PostgreSQL information_schema');
    } catch (err) {
      console.log('⚠️ PostgreSQL info schema failed, trying SQLite syntax:', err.message);
      // Fallback to SQLite syntax
      violationsColumns = await database.all("PRAGMA table_info(violations)");
    }

    console.log('📊 Violations table columns found:', violationsColumns.length);
    violationsColumns.forEach(col => {
      console.log(`  - ${col.name || col.column_name} (${col.data_type || col.type})`);
    });

    const hasViolationsOrgId = violationsColumns.some(col => 
      (col.name || col.column_name) === 'organization_id'
    );
    const hasViolationsUploadedBy = violationsColumns.some(col => 
      (col.name || col.column_name) === 'uploaded_by'
    );

    console.log('');
    console.log('🔍 Column status:');
    console.log('organization_id in violations:', hasViolationsOrgId ? '✅ EXISTS' : '❌ MISSING');
    console.log('uploaded_by in violations:', hasViolationsUploadedBy ? '✅ EXISTS' : '❌ MISSING');
    console.log('');

    if (!hasViolationsOrgId) {
      console.log('📊 Adding organization_id column to violations table...');
      await database.run('ALTER TABLE violations ADD COLUMN organization_id INTEGER DEFAULT 1');
      console.log('✅ Added organization_id to violations table');
    } else {
      console.log('✅ organization_id column already exists in violations table');
    }

    if (!hasViolationsUploadedBy) {
      console.log('📊 Adding uploaded_by column to violations table...');
      await database.run('ALTER TABLE violations ADD COLUMN uploaded_by INTEGER');
      console.log('✅ Added uploaded_by to violations table');
    } else {
      console.log('✅ uploaded_by column already exists in violations table');
    }

    // Check reports table
    console.log('');
    console.log('🔍 Checking reports table structure...');
    let reportsColumns;
    try {
      // Try PostgreSQL syntax first
      reportsColumns = await database.all(`
        SELECT column_name as name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'reports'
        ORDER BY ordinal_position
      `);
    } catch (err) {
      console.log('⚠️ PostgreSQL info schema failed for reports, trying SQLite syntax');
      // Fallback to SQLite syntax
      reportsColumns = await database.all("PRAGMA table_info(reports)");
    }

    console.log('📊 Reports table columns found:', reportsColumns.length);
    reportsColumns.forEach(col => {
      console.log(`  - ${col.name || col.column_name} (${col.data_type || col.type})`);
    });

    const hasReportsOrgId = reportsColumns.some(col => 
      (col.name || col.column_name) === 'organization_id'
    );
    const hasReportsUploadedBy = reportsColumns.some(col => 
      (col.name || col.column_name) === 'uploaded_by'
    );

    console.log('');
    console.log('🔍 Reports column status:');
    console.log('organization_id in reports:', hasReportsOrgId ? '✅ EXISTS' : '❌ MISSING');
    console.log('uploaded_by in reports:', hasReportsUploadedBy ? '✅ EXISTS' : '❌ MISSING');
    console.log('');

    if (!hasReportsOrgId) {
      console.log('📊 Adding organization_id column to reports table...');
      await database.run('ALTER TABLE reports ADD COLUMN organization_id INTEGER DEFAULT 1');
      console.log('✅ Added organization_id to reports table');
    } else {
      console.log('✅ organization_id column already exists in reports table');
    }

    if (!hasReportsUploadedBy) {
      console.log('📊 Adding uploaded_by column to reports table...');
      await database.run('ALTER TABLE reports ADD COLUMN uploaded_by INTEGER');
      console.log('✅ Added uploaded_by to reports table');
    } else {
      console.log('✅ uploaded_by column already exists in reports table');
    }

    // Update existing data to have CCL organization (ID = 1) as default
    console.log('');
    console.log('🔍 Updating existing data...');
    
    const violationsCount = await database.get('SELECT COUNT(*) as count FROM violations WHERE organization_id IS NULL');
    if (violationsCount.count > 0) {
      console.log(`📊 Updating ${violationsCount.count} existing violations to CCL organization...`);
      await database.run('UPDATE violations SET organization_id = 1 WHERE organization_id IS NULL');
      console.log('✅ Updated existing violations');
    } else {
      console.log('ℹ️ No violations need organization_id update');
    }

    const reportsCount = await database.get('SELECT COUNT(*) as count FROM reports WHERE organization_id IS NULL');
    if (reportsCount.count > 0) {
      console.log(`📊 Updating ${reportsCount.count} existing reports to CCL organization...`);
      await database.run('UPDATE reports SET organization_id = 1 WHERE organization_id IS NULL');
      console.log('✅ Updated existing reports');
    } else {
      console.log('ℹ️ No reports need organization_id update');
    }

    console.log('');
    console.log('🎉 PostgreSQL migration completed successfully!');
    
    // Show summary
    const totalViolations = await database.get('SELECT COUNT(*) as count FROM violations');
    const totalReports = await database.get('SELECT COUNT(*) as count FROM reports');
    
    console.log('');
    console.log('📊 Migration Summary:');
    console.log('----------------------------------------');
    console.log(`   - Database: ${dbVersion}`);
    console.log(`   - Total violations: ${totalViolations.count}`);
    console.log(`   - Total reports: ${totalReports.count}`);
    console.log(`   - All existing data assigned to CCL organization (ID: 1)`);
    console.log(`   - New uploads will be organization-specific`);
    console.log('----------------------------------------');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('❌ Error details:', error);
    console.error('❌ Stack trace:', error.stack);
  } finally {
    // Close database connections
    try {
      await database.close();
      console.log('🔌 Database connection closed');
    } catch (err) {
      console.log('⚠️ Error closing database:', err.message);
    }
  }
}

// Run migration
migrateViolationsOrganization();