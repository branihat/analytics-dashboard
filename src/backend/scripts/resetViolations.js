const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../data/violations.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to violations.db');
});

async function resetViolations() {
  return new Promise((resolve, reject) => {
    console.log('🔍 Checking current violations count...');
    
    db.get('SELECT COUNT(*) as count FROM violations', (err, row) => {
      if (err) {
        console.error('❌ Error counting violations:', err.message);
        reject(err);
        return;
      }
      
      console.log(`📊 Current violations count: ${row.count}`);
      
      if (row.count === 0) {
        console.log('✅ No violations to delete');
        resolve();
        return;
      }
      
      console.log('🗑️ Deleting all violations...');
      
      db.run('DELETE FROM violations', function(err) {
        if (err) {
          console.error('❌ Error deleting violations:', err.message);
          reject(err);
          return;
        }
        
        console.log(`✅ Deleted ${this.changes} violations`);
        
        // Reset the auto-increment counter
        db.run('DELETE FROM sqlite_sequence WHERE name="violations"', (err) => {
          if (err) {
            console.log('⚠️ Note: Could not reset auto-increment counter');
          } else {
            console.log('✅ Reset auto-increment counter');
          }
          resolve();
        });
      });
    });
  });
}

resetViolations()
  .then(() => {
    console.log('✅ Violations reset completed successfully');
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err.message);
      }
      process.exit(0);
    });
  })
  .catch((error) => {
    console.error('❌ Reset failed:', error);
    db.close();
    process.exit(1);
  });
