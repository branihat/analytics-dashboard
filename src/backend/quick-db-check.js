#!/usr/bin/env node

/**
 * Quick Database Check
 * Simple script to check PostgreSQL status and connection
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Quick PostgreSQL Check\n');

// 1. Check .env file
console.log('1. Checking .env file:');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const dbUrl = envContent.match(/DATABASE_URL=(.+)/);
  if (dbUrl) {
    console.log('✅ DATABASE_URL found:', dbUrl[1]);
  } else {
    console.log('❌ DATABASE_URL not found in .env');
  }
} else {
  console.log('❌ .env file not found');
}

// 2. Check PostgreSQL service
console.log('\n2. Checking PostgreSQL service:');
exec('sudo systemctl is-active postgresql', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ PostgreSQL service not active');
    console.log('   Try: sudo systemctl start postgresql');
  } else {
    console.log('✅ PostgreSQL service is', stdout.trim());
  }
  
  // 3. Check if PostgreSQL is listening
  console.log('\n3. Checking PostgreSQL port:');
  exec('sudo netstat -tlnp | grep 5432', (error, stdout, stderr) => {
    if (error || !stdout) {
      console.log('❌ PostgreSQL not listening on port 5432');
    } else {
      console.log('✅ PostgreSQL listening on port 5432');
      console.log(stdout.trim());
    }
    
    // 4. Check if database exists
    console.log('\n4. Checking database:');
    exec('sudo -u postgres psql -lqt | cut -d \\| -f 1 | grep -qw analytics_dashboard', (error, stdout, stderr) => {
      if (error) {
        console.log('❌ analytics_dashboard database does not exist');
        console.log('\n🔧 To create database, run:');
        console.log('sudo -u postgres psql -c "CREATE DATABASE analytics_dashboard;"');
      } else {
        console.log('✅ analytics_dashboard database exists');
      }
      
      // 5. Check if user exists
      console.log('\n5. Checking database user:');
      exec('sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname=\'analytics_user\'"', (error, stdout, stderr) => {
        if (error || !stdout.trim()) {
          console.log('❌ analytics_user does not exist');
          console.log('\n🔧 To create user, run:');
          console.log('sudo -u postgres psql -c "CREATE USER analytics_user WITH PASSWORD \'your_password\';"');
        } else {
          console.log('✅ analytics_user exists');
        }
        
        console.log('\n📋 Next Steps:');
        console.log('1. If PostgreSQL is not running: sudo systemctl start postgresql');
        console.log('2. If database/user missing: run fix-postgresql-connection.js');
        console.log('3. If everything looks good: check your DATABASE_URL format');
      });
    });
  });
});