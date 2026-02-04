// Add Organization Columns to SQLite Database
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function addOrganizationColumns() {
  const dbPath = path.join(__dirname, 'src/backend/data/violations.db');
  
  console.log('🔄 Opening SQLite database...');
  console.log('📁 Database path:', dbPath);
  
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Error opening database:', err.message);
      process.exit(1);
    } else {
      console.log('✅ Connected to SQLite database');
    }
  });

  try {
    // Check current table structure
    console.log('\n🔍 Checking violations table structure...');
    const violationsColumns = await new Promise((resolve, reject) => {
      db.all("PRAGMA table_info(violations)", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log('📊 Current violations columns:');
    violationsColumns.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });

    const hasOrgId = violationsColumns.some(col => col.name === 'organization_id');
    const hasUploadedBy = violationsColumns.some(col => col.name === 'uploaded_by');

    console.log('\n🔍 Column status:');
    console.log('organization_id:', hasOrgId ? '✅ EXISTS' : '❌ MISSING');
    console.log('uploaded_by:', hasUploadedBy ? '✅ EXISTS' : '❌ MISSING');

    // Add organization_id column if missing
    if (!hasOrgId) {
      console.log('\n📊 Adding organization_id column to violations table...');
      await new Promise((resolve, reject) => {
        db.run('ALTER TABLE violations ADD COLUMN organization_id INTEGER DEFAULT 1', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('✅ Added organization_id column');
    }

    // Add uploaded_by column if missing
    if (!hasUploadedBy) {
      console.log('📊 Adding uploaded_by column to violations table...');
      await new Promise((resolve, reject) => {
        db.run('ALTER TABLE violations ADD COLUMN uploaded_by INTEGER', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('✅ Added uploaded_by column');
    }

    // Check reports table
    console.log('\n🔍 Checking reports table structure...');
    const reportsColumns = await new Promise((resolve, reject) => {
      db.all("PRAGMA table_info(reports)", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log('📊 Current reports columns:');
    reportsColumns.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });

    const reportsHasOrgId = reportsColumns.some(col => col.name === 'organization_id');
    const reportsHasUploadedBy = reportsColumns.some(col => col.name === 'uploaded_by');

    console.log('\n🔍 Reports column status:');
    console.log('organization_id:', reportsHasOrgId ? '✅ EXISTS' : '❌ MISSING');
    console.log('uploaded_by:', reportsHasUploadedBy ? '✅ EXISTS' : '❌ MISSING');

    // Add organization_id column to reports if missing
    if (!reportsHasOrgId) {
      console.log('\n📊 Adding organization_id column to reports table...');
      await new Promise((resolve, reject) => {
        db.run('ALTER TABLE reports ADD COLUMN organization_id INTEGER DEFAULT 1', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('✅ Added organization_id column to reports');
    }

    // Add uploaded_by column to reports if missing
    if (!reportsHasUploadedBy) {
      console.log('📊 Adding uploaded_by column to reports table...');
      await new Promise((resolve, reject) => {
        db.run('ALTER TABLE reports ADD COLUMN uploaded_by INTEGER', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('✅ Added uploaded_by column to reports');
    }

    // Update existing data
    console.log('\n🔍 Updating existing data...');
    
    const violationsCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM violations WHERE organization_id IS NULL', (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (violationsCount.count > 0) {
      console.log(`📊 Updating ${violationsCount.count} existing violations to CCL organization...`);
      await new Promise((resolve, reject) => {
        db.run('UPDATE violations SET organization_id = 1 WHERE organization_id IS NULL', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('✅ Updated existing violations');
    } else {
      console.log('ℹ️ No violations need organization_id update');
    }

    const reportsCount = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM reports WHERE organization_id IS NULL', (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (reportsCount.count > 0) {
      console.log(`📊 Updating ${reportsCount.count} existing reports to CCL organization...`);
      await new Promise((resolve, reject) => {
        db.run('UPDATE reports SET organization_id = 1 WHERE organization_id IS NULL', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('✅ Updated existing reports');
    } else {
      console.log('ℹ️ No reports need organization_id update');
    }

    // Show final summary
    const totalViolations = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM violations', (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    const totalReports = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM reports', (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    console.log('\n🎉 SQLite migration completed successfully!');
    console.log('\n📊 Migration Summary:');
    console.log('----------------------------------------');
    console.log('   - Database: SQLite');
    console.log(`   - Total violations: ${totalViolations.count}`);
    console.log(`   - Total reports: ${totalReports.count}`);
    console.log('   - All existing data assigned to CCL organization (ID: 1)');
    console.log('   - New uploads will be organization-specific');
    console.log('----------------------------------------');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('❌ Error details:', error);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err.message);
      } else {
        console.log('\n🔌 Database connection closed');
      }
    });
  }
}

addOrganizationColumns();