require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addHyperlinkColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking if hyperlink column exists...');
    
    // Check if column exists
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'inferred_reports' 
      AND column_name = 'hyperlink'
    `);
    
    if (checkColumn.rows.length > 0) {
      console.log('✅ Hyperlink column already exists');
      
      // Check if there's data in the column
      const checkData = await client.query(`
        SELECT id, filename, hyperlink 
        FROM inferred_reports 
        LIMIT 5
      `);
      
      console.log('📊 Sample data:');
      checkData.rows.forEach(row => {
        console.log(`  ID: ${row.id}, File: ${row.filename}, Hyperlink: ${row.hyperlink}`);
      });
      
    } else {
      console.log('⚠️ Hyperlink column does not exist. Adding it now...');
      
      // Add the column
      await client.query(`
        ALTER TABLE inferred_reports 
        ADD COLUMN hyperlink TEXT
      `);
      
      console.log('✅ Hyperlink column added successfully');
    }
    
    console.log('✅ Migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addHyperlinkColumn()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
