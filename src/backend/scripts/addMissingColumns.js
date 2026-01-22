require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addMissingColumns() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking inferred_reports table columns...');
    
    // Get all columns
    const columns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'inferred_reports'
    `);
    
    const existingColumns = columns.rows.map(row => row.column_name);
    console.log('📊 Existing columns:', existingColumns);
    
    // Check and add comment column
    if (!existingColumns.includes('comment')) {
      console.log('⚠️ Adding comment column...');
      await client.query(`ALTER TABLE inferred_reports ADD COLUMN comment TEXT`);
      console.log('✅ Comment column added');
    } else {
      console.log('✅ Comment column exists');
    }
    
    // Check and add ai_report_url column
    if (!existingColumns.includes('ai_report_url')) {
      console.log('⚠️ Adding ai_report_url column...');
      await client.query(`ALTER TABLE inferred_reports ADD COLUMN ai_report_url TEXT`);
      console.log('✅ ai_report_url column added');
    } else {
      console.log('✅ ai_report_url column exists');
    }
    
    // Check and add ai_report_public_id column
    if (!existingColumns.includes('ai_report_public_id')) {
      console.log('⚠️ Adding ai_report_public_id column...');
      await client.query(`ALTER TABLE inferred_reports ADD COLUMN ai_report_public_id TEXT`);
      console.log('✅ ai_report_public_id column added');
    } else {
      console.log('✅ ai_report_public_id column exists');
    }
    
    // Check and add hyperlink column
    if (!existingColumns.includes('hyperlink')) {
      console.log('⚠️ Adding hyperlink column...');
      await client.query(`ALTER TABLE inferred_reports ADD COLUMN hyperlink TEXT`);
      console.log('✅ hyperlink column added');
    } else {
      console.log('✅ hyperlink column exists');
    }
    
    console.log('✅ All columns checked/added successfully');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addMissingColumns()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
