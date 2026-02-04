// Fixed PostgreSQL Migration Script
require('dotenv').config({ path: './src/backend/.env' });

console.log('🔍 Environment check:');
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL value:', process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^@]*@/, ':***@') : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('');

const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');

let sqliteDb = null;
let pgPool = null;
let usePostgres = false;

async function initializeDatabases() {
  // Initialize SQLite
  const dbPath = path.join(__dirname, 'src/backend/data/violations.db');
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Error opening SQLite database:', err.message);
      throw err;
    } else {
      console.log('✅ Connected to SQLite database');
    }
  });

  // Initialize PostgreSQL if available
  if (process.env.DATABASE_URL) {
    try {
      console.log('🔄 Initializing PostgreSQL connection...');
      pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      // Test connection
      const client = await pgPool.connect();
      console.log('✅ PostgreSQL connection successful!');
      client.release();
      usePostgres = true;
    } catch (error) {
      console.error('❌ PostgreSQL connection failed:', error.message);
      console.log('📋 Using SQLite only');
      usePostgres = false;
      if (pgPool) {
        try {
          await pgPool.end();
        } catch (e) {
          // Ignore close errors
        }
        pgPool = null;
      }
    }
  }
}

async function runSQLiteQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    if (query.trim().toUpperCase().startsWith('SELECT') || query.trim().toUpperCase().startsWith('PRAGMA')) {
      sqliteDb.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    } else {
      sqliteDb.run(query, params, function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes, lastID: this.lastID });
      });
    }
  });
}

async function runPostgresQuery(query, params = []) {
  if (!pgPool) throw new Error('PostgreSQL not available');
  
  const client = await pgPool.connect();
  try {
    // Convert ? to $1, $2, etc.
    let index = 1;
    const convertedQuery = query.replace(/\?/g, () => `$${index++}`);
    
    const result = await client.query(convertedQuery, params);
    return result.rows;
  } finally {
    client.release();
  }
}

async function migrateViolationsOrganization() {
  try {
    console.log('🔄 Starting violations organization migration...');

    // Test database connections
    if (usePostgres) {
      try {
        const pgTest = await runPostgresQuery('SELECT version() as db_version');
        console.log('✅ PostgreSQL connection test successful');
        console.log('📊 Database:', pgTest[0].db_version.split(' ')[0], pgTest[0].db_version.split(' ')[1]);
      } catch (err) {
        console.log('⚠️ PostgreSQL test failed, falling back to SQLite:', err.message);
        usePostgres = false;
      }
    }

    if (!usePostgres) {
      const sqliteTest = await runSQLiteQuery('SELECT sqlite_version() as db_version');
      console.log('✅ SQLite connection test successful');
      console.log('📊 Database: SQLite', sqliteTest[0].db_version);
    }

    console.log('');

    // Check violations table structure
    console.log('🔍 Checking violations table structure...');
    let violationsColumns;
    
    if (usePostgres) {
      try {
        violationsColumns = await runPostgresQuery(`
          SELECT column_name as name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = 'violations'
          ORDER BY ordinal_position
        `);
        console.log('📋 Using PostgreSQL information_schema');
      } catch (err) {
        console.log('⚠️ PostgreSQL schema query failed, trying SQLite');
        violationsColumns = await runSQLiteQuery("PRAGMA table_info(violations)");
      }
    } else {
      violationsColumns = await runSQLiteQuery("PRAGMA table_info(violations)");
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

    // Add missing columns to violations table
    if (!hasViolationsOrgId) {
      console.log('📊 Adding organization_id column to violations table...');
      if (usePostgres) {
        await runPostgresQuery('ALTER TABLE violations ADD COLUMN organization_id INTEGER DEFAULT 1');
      } else {
        await runSQLiteQuery('ALTER TABLE violations ADD COLUMN organization_id INTEGER DEFAULT 1');
      }
      console.log('✅ Added organization_id to violations table');
    } else {
      console.log('✅ organization_id column already exists in violations table');
    }

    if (!hasViolationsUploadedBy) {
      console.log('📊 Adding uploaded_by column to violations table...');
      if (usePostgres) {
        await runPostgresQuery('ALTER TABLE violations ADD COLUMN uploaded_by INTEGER');
      } else {
        await runSQLiteQuery('ALTER TABLE violations ADD COLUMN uploaded_by INTEGER');
      }
      console.log('✅ Added uploaded_by to violations table');
    } else {
      console.log('✅ uploaded_by column already exists in violations table');
    }

    // Check reports table
    console.log('');
    console.log('🔍 Checking reports table structure...');
    let reportsColumns;
    
    if (usePostgres) {
      try {
        reportsColumns = await runPostgresQuery(`
          SELECT column_name as name, data_type, is_nullable
          FROM information_schema.columns 
          WHERE table_name = 'reports'
          ORDER BY ordinal_position
        `);
      } catch (err) {
        console.log('⚠️ PostgreSQL schema query failed for reports, trying SQLite');
        reportsColumns = await runSQLiteQuery("PRAGMA table_info(reports)");
      }
    } else {
      reportsColumns = await runSQLiteQuery("PRAGMA table_info(reports)");
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

    // Add missing columns to reports table
    if (!hasReportsOrgId) {
      console.log('📊 Adding organization_id column to reports table...');
      if (usePostgres) {
        await runPostgresQuery('ALTER TABLE reports ADD COLUMN organization_id INTEGER DEFAULT 1');
      } else {
        await runSQLiteQuery('ALTER TABLE reports ADD COLUMN organization_id INTEGER DEFAULT 1');
      }
      console.log('✅ Added organization_id to reports table');
    } else {
      console.log('✅ organization_id column already exists in reports table');
    }

    if (!hasReportsUploadedBy) {
      console.log('📊 Adding uploaded_by column to reports table...');
      if (usePostgres) {
        await runPostgresQuery('ALTER TABLE reports ADD COLUMN uploaded_by INTEGER');
      } else {
        await runSQLiteQuery('ALTER TABLE reports ADD COLUMN uploaded_by INTEGER');
      }
      console.log('✅ Added uploaded_by to reports table');
    } else {
      console.log('✅ uploaded_by column already exists in reports table');
    }

    // Update existing data
    console.log('');
    console.log('🔍 Updating existing data...');
    
    let violationsCount, reportsCount;
    
    if (usePostgres) {
      const vResult = await runPostgresQuery('SELECT COUNT(*) as count FROM violations WHERE organization_id IS NULL');
      violationsCount = { count: vResult[0].count };
      const rResult = await runPostgresQuery('SELECT COUNT(*) as count FROM reports WHERE organization_id IS NULL');
      reportsCount = { count: rResult[0].count };
    } else {
      const vResult = await runSQLiteQuery('SELECT COUNT(*) as count FROM violations WHERE organization_id IS NULL');
      violationsCount = vResult[0];
      const rResult = await runSQLiteQuery('SELECT COUNT(*) as count FROM reports WHERE organization_id IS NULL');
      reportsCount = rResult[0];
    }

    if (violationsCount.count > 0) {
      console.log(`📊 Updating ${violationsCount.count} existing violations to CCL organization...`);
      if (usePostgres) {
        await runPostgresQuery('UPDATE violations SET organization_id = 1 WHERE organization_id IS NULL');
      } else {
        await runSQLiteQuery('UPDATE violations SET organization_id = 1 WHERE organization_id IS NULL');
      }
      console.log('✅ Updated existing violations');
    } else {
      console.log('ℹ️ No violations need organization_id update');
    }

    if (reportsCount.count > 0) {
      console.log(`📊 Updating ${reportsCount.count} existing reports to CCL organization...`);
      if (usePostgres) {
        await runPostgresQuery('UPDATE reports SET organization_id = 1 WHERE organization_id IS NULL');
      } else {
        await runSQLiteQuery('UPDATE reports SET organization_id = 1 WHERE organization_id IS NULL');
      }
      console.log('✅ Updated existing reports');
    } else {
      console.log('ℹ️ No reports need organization_id update');
    }

    console.log('');
    console.log('🎉 Migration completed successfully!');
    
    // Show summary
    let totalViolations, totalReports;
    
    if (usePostgres) {
      const vResult = await runPostgresQuery('SELECT COUNT(*) as count FROM violations');
      totalViolations = { count: vResult[0].count };
      const rResult = await runPostgresQuery('SELECT COUNT(*) as count FROM reports');
      totalReports = { count: rResult[0].count };
    } else {
      const vResult = await runSQLiteQuery('SELECT COUNT(*) as count FROM violations');
      totalViolations = vResult[0];
      const rResult = await runSQLiteQuery('SELECT COUNT(*) as count FROM reports');
      totalReports = rResult[0];
    }
    
    console.log('');
    console.log('📊 Migration Summary:');
    console.log('----------------------------------------');
    console.log(`   - Database: ${usePostgres ? 'PostgreSQL' : 'SQLite'}`);
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
      if (pgPool && !pgPool.ended) {
        await pgPool.end();
        console.log('🔌 PostgreSQL connection closed');
      }
      if (sqliteDb) {
        sqliteDb.close((err) => {
          if (err) console.error('Error closing SQLite:', err.message);
          else console.log('🔌 SQLite connection closed');
        });
      }
    } catch (err) {
      console.log('⚠️ Error closing databases:', err.message);
    }
  }
}

// Initialize and run migration
async function main() {
  try {
    await initializeDatabases();
    await migrateViolationsOrganization();
  } catch (error) {
    console.error('❌ Migration initialization failed:', error.message);
    process.exit(1);
  }
}

main();