// Simple Database Connection Test
require('dotenv').config({ path: './src/backend/.env' });

console.log('🔍 Environment Variables:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('');

const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function testPostgreSQL() {
  console.log('🔄 Testing PostgreSQL connection...');
  
  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL not set');
    return false;
  }

  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 1,
      connectionTimeoutMillis: 5000,
    });

    const client = await pool.connect();
    const result = await client.query('SELECT version()');
    console.log('✅ PostgreSQL connected successfully');
    console.log('📊 Version:', result.rows[0].version.split(' ')[0], result.rows[0].version.split(' ')[1]);
    
    client.release();
    await pool.end();
    return true;
  } catch (error) {
    console.log('❌ PostgreSQL connection failed:', error.message);
    return false;
  }
}

async function testSQLite() {
  console.log('🔄 Testing SQLite connection...');
  
  try {
    const dbPath = path.join(__dirname, 'src/backend/data/violations.db');
    const db = new sqlite3.Database(dbPath);
    
    const result = await new Promise((resolve, reject) => {
      db.get('SELECT sqlite_version() as version', (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    console.log('✅ SQLite connected successfully');
    console.log('📊 Version: SQLite', result.version);
    
    db.close();
    return true;
  } catch (error) {
    console.log('❌ SQLite connection failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Database Connection Test\n');
  
  const pgSuccess = await testPostgreSQL();
  console.log('');
  const sqliteSuccess = await testSQLite();
  
  console.log('\n📊 Summary:');
  console.log('PostgreSQL:', pgSuccess ? '✅ Available' : '❌ Not Available');
  console.log('SQLite:', sqliteSuccess ? '✅ Available' : '❌ Not Available');
  
  if (!pgSuccess && !sqliteSuccess) {
    console.log('\n❌ No database connections available!');
    process.exit(1);
  } else {
    console.log('\n✅ At least one database is available');
  }
}

main().catch(console.error);