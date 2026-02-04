// Debug Login Organization Issue
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function debugLoginOrganization() {
  const dbPath = path.join(__dirname, 'src/backend/data/violations.db');
  
  console.log('🔍 Debug Login Organization Issue');
  console.log('=================================');
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
    // Check all tables
    console.log('\n🔍 All tables in database:');
    const tables = await new Promise((resolve, reject) => {
      db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const table of tables) {
      console.log(`\n📊 Table: ${table.name}`);
      const columns = await new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${table.name})`, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      columns.forEach(col => {
        console.log(`  - ${col.name} (${col.type}) ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
      });

      // Show sample data for violations and reports
      if (table.name === 'violations' || table.name === 'reports') {
        try {
          const sampleData = await new Promise((resolve, reject) => {
            db.all(`SELECT * FROM ${table.name} LIMIT 3`, (err, rows) => {
              if (err) reject(err);
              else resolve(rows);
            });
          });
          
          if (sampleData.length > 0) {
            console.log(`  📋 Sample data (${sampleData.length} rows):`);
            sampleData.forEach((row, index) => {
              console.log(`    Row ${index + 1}:`, Object.keys(row).slice(0, 5).map(key => `${key}=${row[key]}`).join(', '));
            });
          }
        } catch (err) {
          console.log(`  ❌ Error reading sample data: ${err.message}`);
        }
      }
    }

    // Specific tests for organization_id
    console.log('\n🧪 Testing organization_id queries...');
    
    // Test 1: Simple SELECT with organization_id
    try {
      console.log('\n🔍 Test 1: SELECT with organization_id');
      const result1 = await new Promise((resolve, reject) => {
        db.all('SELECT id, organization_id FROM violations LIMIT 5', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      console.log('✅ Test 1 passed:', result1.length, 'rows returned');
      result1.forEach((row, i) => {
        console.log(`  Row ${i + 1}: id=${row.id}, organization_id=${row.organization_id}`);
      });
    } catch (err) {
      console.log('❌ Test 1 failed:', err.message);
    }

    // Test 2: WHERE clause with organization_id
    try {
      console.log('\n🔍 Test 2: WHERE with organization_id');
      const result2 = await new Promise((resolve, reject) => {
        db.all('SELECT COUNT(*) as count FROM violations WHERE organization_id = 1', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      console.log('✅ Test 2 passed:', result2[0].count, 'violations with organization_id = 1');
    } catch (err) {
      console.log('❌ Test 2 failed:', err.message);
    }

    // Test 3: GROUP BY organization_id
    try {
      console.log('\n🔍 Test 3: GROUP BY organization_id');
      const result3 = await new Promise((resolve, reject) => {
        db.all('SELECT organization_id, COUNT(*) as count FROM violations GROUP BY organization_id', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      console.log('✅ Test 3 passed:');
      result3.forEach(row => {
        console.log(`  Organization ${row.organization_id}: ${row.count} violations`);
      });
    } catch (err) {
      console.log('❌ Test 3 failed:', err.message);
    }

    // Test 4: Check if there are any NULL organization_id values
    try {
      console.log('\n🔍 Test 4: NULL organization_id check');
      const result4 = await new Promise((resolve, reject) => {
        db.all('SELECT COUNT(*) as count FROM violations WHERE organization_id IS NULL', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      console.log('✅ Test 4 passed:', result4[0].count, 'violations with NULL organization_id');
    } catch (err) {
      console.log('❌ Test 4 failed:', err.message);
    }

    // Test 5: Check reports table
    try {
      console.log('\n🔍 Test 5: Reports organization_id');
      const result5 = await new Promise((resolve, reject) => {
        db.all('SELECT organization_id, COUNT(*) as count FROM reports GROUP BY organization_id', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      console.log('✅ Test 5 passed:');
      result5.forEach(row => {
        console.log(`  Organization ${row.organization_id}: ${row.count} reports`);
      });
    } catch (err) {
      console.log('❌ Test 5 failed:', err.message);
    }

    console.log('\n📋 Debug Summary:');
    console.log('================');
    console.log('If any tests failed with "no such column: organization_id", the column needs to be added.');
    console.log('If all tests passed, the issue might be in the application code or a different database file.');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
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

debugLoginOrganization();