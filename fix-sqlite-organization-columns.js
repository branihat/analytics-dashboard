// Fix SQLite Organization Columns
// The violations/reports are in SQLite, not PostgreSQL
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

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

console.log('🔍 System Analysis:');
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL value:', process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^@]*@/, ':***@') : 'NOT SET');
console.log('');
console.log('🎯 HYBRID SYSTEM DETECTED:');
console.log('   - PostgreSQL: User authentication (admin, user, organizations)');
console.log('   - SQLite: Violations, reports, features data');
console.log('');

async function fixSQLiteOrganizationColumns() {
  let sqliteDb = null;
  
  try {
    console.log('🔄 Starting SQLite organization columns fix...');
    
    // Connect to SQLite database
    const sqlitePath = path.join(__dirname, 'src/backend/data/violations.db');
    console.log('📂 SQLite database path:', sqlitePath);
    
    if (!fs.existsSync(sqlitePath)) {
      console.log('❌ SQLite database file not found at:', sqlitePath);
      console.log('🔍 Looking for alternative locations...');
      
      // Try alternative locations
      const altPaths = [
        path.join(__dirname, 'src/backend/violations.db'),
        path.join(__dirname, 'violations.db'),
        path.join(__dirname, 'data/violations.db')
      ];
      
      let foundPath = null;
      for (const altPath of altPaths) {
        if (fs.existsSync(altPath)) {
          foundPath = altPath;
          console.log('✅ Found SQLite database at:', altPath);
          break;
        }
      }
      
      if (!foundPath) {
        console.log('❌ SQLite database not found in any location');
        console.log('🔧 Creating new SQLite database...');
        // Create directory if it doesn't exist
        const dataDir = path.dirname(sqlitePath);
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
      } else {
        sqlitePath = foundPath;
      }
    }
    
    sqliteDb = new Database(sqlitePath);
    console.log('✅ Connected to SQLite database');
    
    // Check existing tables
    const tables = sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('📊 SQLite tables found:');
    tables.forEach(table => {
      console.log(`  - ${table.name}`);
    });
    
    // Check violations table
    const hasViolationsTable = tables.some(t => t.name === 'violations');
    if (hasViolationsTable) {
      console.log('');
      console.log('🔍 Checking violations table structure...');
      const violationsColumns = sqliteDb.prepare("PRAGMA table_info(violations)").all();
      
      console.log('📊 Violations table columns:');
      violationsColumns.forEach(col => {
        console.log(`  - ${col.name} (${col.type})`);
      });
      
      const hasOrgId = violationsColumns.some(col => col.name === 'organization_id');
      const hasUploadedBy = violationsColumns.some(col => col.name === 'uploaded_by');
      
      console.log('');
      console.log('🔍 Violations column status:');
      console.log('organization_id:', hasOrgId ? '✅ EXISTS' : '❌ MISSING');
      console.log('uploaded_by:', hasUploadedBy ? '✅ EXISTS' : '❌ MISSING');
      
      if (!hasOrgId) {
        console.log('📊 Adding organization_id column to violations table...');
        sqliteDb.prepare('ALTER TABLE violations ADD COLUMN organization_id INTEGER DEFAULT 1').run();
        console.log('✅ Added organization_id to violations table');
      }
      
      if (!hasUploadedBy) {
        console.log('📊 Adding uploaded_by column to violations table...');
        sqliteDb.prepare('ALTER TABLE violations ADD COLUMN uploaded_by INTEGER').run();
        console.log('✅ Added uploaded_by to violations table');
      }
      
      // Update existing violations
      const violationsCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM violations WHERE organization_id IS NULL').get();
      if (violationsCount.count > 0) {
        console.log(`📊 Updating ${violationsCount.count} existing violations to CCL organization...`);
        sqliteDb.prepare('UPDATE violations SET organization_id = 1 WHERE organization_id IS NULL').run();
        console.log('✅ Updated existing violations');
      }
    } else {
      console.log('⚠️ Violations table not found in SQLite');
    }
    
    // Check reports table
    const hasReportsTable = tables.some(t => t.name === 'reports');
    if (hasReportsTable) {
      console.log('');
      console.log('🔍 Checking reports table structure...');
      const reportsColumns = sqliteDb.prepare("PRAGMA table_info(reports)").all();
      
      console.log('📊 Reports table columns:');
      reportsColumns.forEach(col => {
        console.log(`  - ${col.name} (${col.type})`);
      });
      
      const hasOrgId = reportsColumns.some(col => col.name === 'organization_id');
      const hasUploadedBy = reportsColumns.some(col => col.name === 'uploaded_by');
      
      console.log('');
      console.log('🔍 Reports column status:');
      console.log('organization_id:', hasOrgId ? '✅ EXISTS' : '❌ MISSING');
      console.log('uploaded_by:', hasUploadedBy ? '✅ EXISTS' : '❌ MISSING');
      
      if (!hasOrgId) {
        console.log('📊 Adding organization_id column to reports table...');
        sqliteDb.prepare('ALTER TABLE reports ADD COLUMN organization_id INTEGER DEFAULT 1').run();
        console.log('✅ Added organization_id to reports table');
      }
      
      if (!hasUploadedBy) {
        console.log('📊 Adding uploaded_by column to reports table...');
        sqliteDb.prepare('ALTER TABLE reports ADD COLUMN uploaded_by INTEGER').run();
        console.log('✅ Added uploaded_by to reports table');
      }
      
      // Update existing reports
      const reportsCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM reports WHERE organization_id IS NULL').get();
      if (reportsCount.count > 0) {
        console.log(`📊 Updating ${reportsCount.count} existing reports to CCL organization...`);
        sqliteDb.prepare('UPDATE reports SET organization_id = 1 WHERE organization_id IS NULL').run();
        console.log('✅ Updated existing reports');
      }
    } else {
      console.log('⚠️ Reports table not found in SQLite');
    }
    
    console.log('');
    console.log('🎉 SQLite organization columns fix completed!');
    
    // Show summary
    const finalViolations = hasViolationsTable ? sqliteDb.prepare('SELECT COUNT(*) as count FROM violations').get() : { count: 0 };
    const finalReports = hasReportsTable ? sqliteDb.prepare('SELECT COUNT(*) as count FROM reports').get() : { count: 0 };
    
    console.log('');
    console.log('📊 SQLite Summary:');
    console.log('----------------------------------------');
    console.log(`   - Database: SQLite (violations.db)`);
    console.log(`   - Total violations: ${finalViolations.count}`);
    console.log(`   - Total reports: ${finalReports.count}`);
    console.log(`   - Organization columns: ✅ ADDED`);
    console.log('----------------------------------------');

  } catch (error) {
    console.error('❌ SQLite fix failed:', error.message);
    console.error('❌ Error details:', error);
  } finally {
    if (sqliteDb) {
      try {
        sqliteDb.close();
        console.log('🔌 SQLite connection closed');
      } catch (err) {
        console.log('⚠️ Error closing SQLite connection:', err.message);
      }
    }
  }
}

// Run the fix
fixSQLiteOrganizationColumns();