require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkDepartments() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking departments in inferred_reports table...\n');
    
    // Get all unique departments
    const departments = await client.query(`
      SELECT DISTINCT department, COUNT(*) as count
      FROM inferred_reports
      GROUP BY department
      ORDER BY count DESC
    `);
    
    console.log('📊 Departments in inferred_reports:');
    departments.rows.forEach(row => {
      console.log(`  - ${row.department}: ${row.count} reports`);
    });
    
    console.log('\n🔍 Checking departments in user table...\n');
    
    // Get all unique departments from users
    const userDepts = await client.query(`
      SELECT DISTINCT department, COUNT(*) as count
      FROM "user"
      WHERE department IS NOT NULL
      GROUP BY department
      ORDER BY count DESC
    `);
    
    console.log('📊 Departments in user table:');
    userDepts.rows.forEach(row => {
      console.log(`  - ${row.department}: ${row.count} users`);
    });
    
    console.log('\n✅ Check completed');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkDepartments()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
