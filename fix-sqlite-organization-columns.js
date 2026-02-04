// Direct SQLite Column Fix - Force Add Organization Columns
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function fixSQLiteColumns() {
  const dbPath = path.join(__dirname, 'src/backend/data/violations.db');
  
  console.log('🔧 Direct SQLite Column Fix');
  console.log('============================');
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
    // First, let's see what tables exist
    console.log('\n🔍 Checking available tables...');
    const tables = await new Promise((resolve, reject) => {
      db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log('📊 Available tables:');
    tables.forEach(table => {
      console.log(`  - ${table.name}`);
    });

    // Check violations table structure
    console.log('\n🔍 Current violations table structure:');
    const violationsColumns = await new Promise((resolve, reject) => {
      db.all("PRAGMA table_info(violations)", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log('📊 Violations columns:');
    violationsColumns.forEach(col => {
      console.log(`  - ${col.name} (${col.type}) ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
    });

    const hasViolationsOrgId = violationsColumns.some(col => col.name === 'organization_id');
    const hasViolationsUploadedBy = violationsColumns.some(col => col.name === 'uploaded_by');

    // Force add columns even if they seem to exist
    console.log('\n🔧 Force adding organization_id to violations...');
    try {
      await new Promise((resolve, reject) => {
        db.run('ALTER TABLE violations ADD COLUMN organization_id INTEGER DEFAULT 1', (err) => {
          if (err) {
            if (err.message.includes('duplicate column name')) {
              console.log('ℹ️ organization_id column already exists');
              resolve();
            } else {
              reject(err);
            }
          } else {
            console.log('✅ Added organization_id column');
            resolve();
          }
        });
      });
    } catch (err) {
      console.log('⚠️ organization_id add failed:', err.message);
    }

    console.log('🔧 Force adding uploaded_by to violations...');
    try {
      await new Promise((resolve, reject) => {
        db.run('ALTER TABLE violations ADD COLUMN uploaded_by INTEGER', (err) => {
          if (err) {
            if (err.message.includes('duplicate column name')) {
              console.log('ℹ️ uploaded_by column already exists');
              resolve();
            } else {
              reject(err);
            }
          } else {
            console.log('✅ Added uploaded_by column');
            resolve();
          }
        });
      });
    } catch (err) {
      console.log('⚠️ uploaded_by add failed:', err.message);
    }

    // Check reports table
    console.log('\n🔍 Current reports table structure:');
    const reportsColumns = await new Promise((resolve, reject) => {
      db.all("PRAGMA table_info(reports)", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log('📊 Reports columns:');
    reportsColumns.forEach(col => {
      console.log(`  - ${col.name} (${col.type}) ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
    });

    // Force add columns to reports
    console.log('\n🔧 Force adding organization_id to reports...');
    try {
      await new Promise((resolve, reject) => {
        db.run('ALTER TABLE reports ADD COLUMN organization_id INTEGER DEFAULT 1', (err) => {
          if (err) {
            if (err.message.includes('duplicate column name')) {
              console.log('ℹ️ organization_id column already exists');
              resolve();
            } else {
              reject(err);
            }
          } else {
            console.log('✅ Added organization_id column');
            resolve();
          }
        });
      });
    } catch (err) {
      console.log('⚠️ organization_id add failed:', err.message);
    }

    console.log('🔧 Force adding uploaded_by to reports...');
    try {
      await new Promise((resolve, reject) => {
        db.run('ALTER TABLE reports ADD COLUMN uploaded_by INTEGER', (err) => {
          if (err) {
            if (err.message.includes('duplicate column name')) {
              console.log('ℹ️ uploaded_by column already exists');
              resolve();
            } else {
              reject(err);
            }
          } else {
            console.log('✅ Added uploaded_by column');
            resolve();
          }
        });
      });
    } catch (err) {
      console.log('⚠️ uploaded_by add failed:', err.message);
    }

    // Test the columns by running a query
    console.log('\n🧪 Testing organization_id column access...');
    try {
      const testResult = await new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count, organization_id FROM violations WHERE organization_id IS NOT NULL GROUP BY organization_id LIMIT 1', (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      console.log('✅ organization_id column is accessible');
      console.log('📊 Test result:', testResult);
    } catch (err) {
      console.log('❌ organization_id column test failed:', err.message);
      
      // Try to update existing records
      console.log('🔧 Attempting to set organization_id for existing records...');
      try {
        await new Promise((resolve, reject) => {
          db.run('UPDATE violations SET organization_id = 1 WHERE organization_id IS NULL OR organization_id = 0', (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        console.log('✅ Updated existing violations');
      } catch (updateErr) {
        console.log('❌ Update failed:', updateErr.message);
      }
    }

    // Show final table structure
    console.log('\n📋 Final violations table structure:');
    const finalViolationsColumns = await new Promise((resolve, reject) => {
      db.all("PRAGMA table_info(violations)", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    finalViolationsColumns.forEach(col => {
      console.log(`  - ${col.name} (${col.type}) ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
    });

    console.log('\n📋 Final reports table structure:');
    const finalReportsColumns = await new Promise((resolve, reject) => {
      db.all("PRAGMA table_info(reports)", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    finalReportsColumns.forEach(col => {
      console.log(`  - ${col.name} (${col.type}) ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
    });

    // Final test
    console.log('\n🧪 Final test - counting records by organization...');
    try {
      const violationsTest = await new Promise((resolve, reject) => {
        db.all('SELECT organization_id, COUNT(*) as count FROM violations GROUP BY organization_id', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      console.log('✅ Violations by organization:');
      violationsTest.forEach(row => {
        console.log(`  - Organization ${row.organization_id || 'NULL'}: ${row.count} violations`);
      });
    } catch (err) {
      console.log('❌ Final violations test failed:', err.message);
    }

    try {
      const reportsTest = await new Promise((resolve, reject) => {
        db.all('SELECT organization_id, COUNT(*) as count FROM reports GROUP BY organization_id', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      console.log('✅ Reports by organization:');
      reportsTest.forEach(row => {
        console.log(`  - Organization ${row.organization_id || 'NULL'}: ${row.count} reports`);
      });
    } catch (err) {
      console.log('❌ Final reports test failed:', err.message);
    }

    console.log('\n🎉 SQLite column fix completed!');

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
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

fixSQLiteColumns();