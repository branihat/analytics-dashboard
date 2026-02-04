// Check Database Configuration
// Run with: node check-db-config.js

console.log('🔍 Checking Database Configuration...\n');

// Load environment variables
require('dotenv').config({ path: './src/backend/.env' });

console.log('📋 Environment Variables:');
console.log('----------------------------------------');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 
  process.env.DATABASE_URL.replace(/:[^@]*@/, ':***@') : 'not set');
console.log('DB_HOST:', process.env.DB_HOST || 'not set');
console.log('DB_PORT:', process.env.DB_PORT || 'not set');
console.log('DB_NAME:', process.env.DB_NAME || 'not set');
console.log('DB_USER:', process.env.DB_USER || 'not set');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'not set');
console.log('----------------------------------------\n');

// Check if database utility exists
const fs = require('fs');
const path = require('path');

const dbUtilPath = path.join(__dirname, 'src/backend/utils/databaseHybrid.js');
if (fs.existsSync(dbUtilPath)) {
  console.log('✅ Database utility file exists: src/backend/utils/databaseHybrid.js\n');
  
  try {
    console.log('🔗 Testing database connection...');
    const database = require('./src/backend/utils/databaseHybrid');
    
    database.get('SELECT 1 as test')
      .then(result => {
        console.log('✅ Database connection successful!');
        console.log('Test query result:', result);
        
        // Try to get table info
        return database.all("SELECT name FROM sqlite_master WHERE type='table'");
      })
      .then(tables => {
        console.log('\n📊 Database tables found:');
        tables.forEach(table => console.log(`  - ${table.name}`));
        
        // Check if violations table has organization_id column
        return database.all("PRAGMA table_info(violations)");
      })
      .then(columns => {
        console.log('\n📋 Violations table columns:');
        columns.forEach(col => console.log(`  - ${col.name} (${col.type})`));
        
        const hasOrgId = columns.some(col => col.name === 'organization_id');
        console.log(`\n🏢 Organization column: ${hasOrgId ? '✅ EXISTS' : '❌ MISSING'}`);
        
        if (!hasOrgId) {
          console.log('\n⚠️ Need to run migration: node migrate-violations-organization.js');
        }
        
        process.exit(0);
      })
      .catch(err => {
        console.log('❌ Database operation failed:', err.message);
        console.log('\n🔧 Possible solutions:');
        console.log('1. Check DATABASE_URL in src/backend/.env');
        console.log('2. Verify database server is running');
        console.log('3. Check database credentials');
        process.exit(1);
      });
      
  } catch (err) {
    console.log('❌ Failed to load database utility:', err.message);
    process.exit(1);
  }
} else {
  console.log('❌ Database utility file not found: src/backend/utils/databaseHybrid.js');
  process.exit(1);
}