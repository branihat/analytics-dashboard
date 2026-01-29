#!/usr/bin/env node

/**
 * Environment Configuration Checker
 * 
 * Checks your current environment setup and database configuration
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Environment Configuration Check');
console.log('===================================\n');

// Check .env file
const envPath = path.join(__dirname, '.env');
console.log('📁 Environment File Check:');
console.log(`   Path: ${envPath}`);

if (fs.existsSync(envPath)) {
  console.log('   Status: ✅ Found');
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log('\n📋 Current .env Contents:');
  console.log('┌─────────────────────────────────────────────────────────┐');
  
  envContent.split('\n').forEach(line => {
    if (line.trim()) {
      // Mask sensitive values
      if (line.includes('SECRET') || line.includes('PASSWORD')) {
        const [key, value] = line.split('=');
        const maskedValue = value ? value.substring(0, 8) + '...' : '';
        console.log(`│ ${(key + '=' + maskedValue).padEnd(55)} │`);
      } else {
        console.log(`│ ${line.padEnd(55)} │`);
      }
    }
  });
  
  console.log('└─────────────────────────────────────────────────────────┘\n');
} else {
  console.log('   Status: ❌ Not Found\n');
}

// Check process environment
console.log('🌍 Process Environment Variables:');
console.log('┌─────────────────────────────────────────────────────────┐');
console.log(`│ DATABASE_URL: ${process.env.DATABASE_URL ? 'Set' : 'Not Set'.padEnd(43)} │`);
console.log(`│ NODE_ENV: ${(process.env.NODE_ENV || 'Not Set').padEnd(47)} │`);
console.log(`│ PORT: ${(process.env.PORT || 'Not Set').padEnd(51)} │`);
console.log(`│ JWT_SECRET: ${process.env.JWT_SECRET ? 'Set' : 'Not Set'.padEnd(45)} │`);
console.log('└─────────────────────────────────────────────────────────┘\n');

// Check database files
console.log('💾 Database Files Check:');
const sqlitePath = path.join(__dirname, 'data/violations.db');
console.log(`   SQLite DB: ${fs.existsSync(sqlitePath) ? '✅ Found' : '❌ Not Found'}`);
console.log(`   Path: ${sqlitePath}\n`);

// Check if we can determine database type
console.log('🔧 Database Configuration Analysis:');
if (process.env.DATABASE_URL && process.env.DATABASE_URL !== 'YOUR_NEW_POSTGRESQL_URL_HERE') {
  if (process.env.DATABASE_URL.includes('postgresql://')) {
    console.log('   Type: ✅ PostgreSQL configured');
    console.log('   URL Format: Valid PostgreSQL connection string');
  } else {
    console.log('   Type: ⚠️ Unknown database type');
  }
} else {
  console.log('   Type: ❌ No PostgreSQL configured');
  console.log('   Note: Application will use SQLite fallback for some features');
}

console.log('\n📝 Recommendations:');
if (!process.env.DATABASE_URL || process.env.DATABASE_URL === 'YOUR_NEW_POSTGRESQL_URL_HERE') {
  console.log('   1. ❌ Set up PostgreSQL DATABASE_URL in .env file');
  console.log('   2. ❌ Run database creation script: node create-database.js');
} else {
  console.log('   1. ✅ PostgreSQL URL is configured');
  console.log('   2. 🔄 Test connection: node check-database-credentials.js');
}

if (!fs.existsSync(sqlitePath)) {
  console.log('   3. ❌ SQLite database missing - run: node create-database.js');
} else {
  console.log('   3. ✅ SQLite database exists');
}

console.log('\n🚀 Next Steps:');
console.log('   • To check credentials: node check-database-credentials.js');
console.log('   • To query database: node direct-db-query.js');
console.log('   • To create database: node create-database.js');
console.log('   • To test connection: node quick-db-check.js');