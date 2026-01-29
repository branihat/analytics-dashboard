#!/usr/bin/env node

// Quick script to check database configuration
require('dotenv').config();

console.log('=== DATABASE CONFIGURATION CHECK ===');
console.log('');

console.log('Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('');

if (process.env.DATABASE_URL) {
  console.log('Database URL Details:');
  try {
    const url = new URL(process.env.DATABASE_URL);
    console.log('Protocol:', url.protocol);
    console.log('Host:', url.hostname);
    console.log('Port:', url.port || 'default');
    console.log('Database:', url.pathname.substring(1));
    console.log('Username:', url.username);
    console.log('Password:', url.password ? '***HIDDEN***' : 'NOT SET');
    console.log('');
    console.log('Full URL (masked):', process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':***@'));
  } catch (error) {
    console.log('Error parsing DATABASE_URL:', error.message);
    console.log('Raw DATABASE_URL:', process.env.DATABASE_URL);
  }
} else {
  console.log('❌ DATABASE_URL is not set');
  console.log('Application will use SQLite fallback');
}

console.log('');
console.log('=== POSTGRESQL CONNECTION TEST ===');

if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  pool.connect()
    .then(client => {
      console.log('✅ PostgreSQL connection successful');
      return client.query('SELECT version()');
    })
    .then(result => {
      console.log('PostgreSQL Version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
      return pool.query('SELECT current_database()');
    })
    .then(result => {
      console.log('Current Database:', result.rows[0].current_database);
      return pool.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
    })
    .then(result => {
      console.log('Tables in database:');
      result.rows.forEach(row => {
        console.log('  -', row.tablename);
      });
      pool.end();
    })
    .catch(error => {
      console.log('❌ PostgreSQL connection failed:', error.message);
      pool.end();
    });
} else {
  console.log('⚠️ Skipping PostgreSQL test - DATABASE_URL not set');
}