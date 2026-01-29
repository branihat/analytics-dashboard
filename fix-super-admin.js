#!/usr/bin/env node

// Script to fix super admin login issue
require('dotenv').config();
const bcrypt = require('bcryptjs');

async function fixSuperAdmin() {
  console.log('🔍 Diagnosing super admin login issue...');
  console.log('');
  
  // Check database connection
  console.log('1. Checking database connection...');
  try {
    const database = require('./src/backend/utils/databaseHybrid');
    
    // Test basic connection
    const testQuery = await database.get('SELECT 1 as test');
    console.log('   ✅ Database connection working');
    
    // Check if admin table exists
    const adminCheck = await database.get('SELECT COUNT(*) as count FROM admin LIMIT 1');
    console.log('   ✅ Admin table exists with', adminCheck.count, 'records');
    
    // List all admin users
    console.log('');
    console.log('2. Current admin users:');
    const admins = await database.all('SELECT id, username, email, full_name FROM admin ORDER BY id');
    
    if (admins.length === 0) {
      console.log('   ❌ No admin users found!');
    } else {
      admins.forEach(admin => {
        console.log(`   - ID: ${admin.id}, Username: ${admin.username}, Email: ${admin.email}`);
      });
    }
    
    // Check for super admin specifically
    console.log('');
    console.log('3. Checking for super admin...');
    const superAdmin = await database.get(
      'SELECT id, username, email, full_name FROM admin WHERE email = ? OR username = ?',
      ['superadmin1@ccl.com', 'SuperAdmin']
    );
    
    if (superAdmin) {
      console.log('   ✅ Super admin found:');
      console.log('      ID:', superAdmin.id);
      console.log('      Username:', superAdmin.username);
      console.log('      Email:', superAdmin.email);
      console.log('      Full Name:', superAdmin.full_name);
      
      // Test password
      console.log('');
      console.log('4. Testing password...');
      const adminWithPassword = await database.get(
        'SELECT password_hash FROM admin WHERE email = ?',
        ['superadmin1@ccl.com']
      );
      
      if (adminWithPassword) {
        const passwordMatch = await bcrypt.compare('Super_Aerovania_grhns@2002', adminWithPassword.password_hash);
        if (passwordMatch) {
          console.log('   ✅ Password is correct');
          console.log('');
          console.log('🎉 Super admin should be able to login!');
          console.log('   Email: superadmin1@ccl.com');
          console.log('   Password: Super_Aerovania_grhns@2002');
        } else {
          console.log('   ❌ Password does not match');
          console.log('   🔄 Updating password...');
          
          const newHashedPassword = await bcrypt.hash('Super_Aerovania_grhns@2002', 10);
          await database.run(
            'UPDATE admin SET password_hash = ? WHERE email = ?',
            [newHashedPassword, 'superadmin1@ccl.com']
          );
          
          console.log('   ✅ Password updated successfully!');
        }
      }
    } else {
      console.log('   ❌ Super admin not found');
      console.log('   🔄 Creating super admin...');
      
      const hashedPassword = await bcrypt.hash('Super_Aerovania_grhns@2002', 10);
      const result = await database.run(
        'INSERT INTO admin (username, email, password_hash, full_name, permissions, organization_id) VALUES (?, ?, ?, ?, ?, ?)',
        ['SuperAdmin', 'superadmin1@ccl.com', hashedPassword, 'Super Aerovania Master', 'all', 1]
      );
      
      console.log('   ✅ Super admin created with ID:', result.id);
      console.log('');
      console.log('🎉 Super admin login credentials:');
      console.log('   Email: superadmin1@ccl.com');
      console.log('   Password: Super_Aerovania_grhns@2002');
    }
    
  } catch (error) {
    console.error('❌ Database error:', error);
    console.error('Error details:', error.message);
    
    // Try direct PostgreSQL connection
    console.log('');
    console.log('5. Trying direct PostgreSQL connection...');
    try {
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      
      const client = await pool.connect();
      console.log('   ✅ Direct PostgreSQL connection successful');
      
      // Check admin table
      const result = await client.query('SELECT COUNT(*) as count FROM admin');
      console.log('   ✅ Admin table has', result.rows[0].count, 'records');
      
      // Create super admin directly
      const hashedPassword = await bcrypt.hash('Super_Aerovania_grhns@2002', 10);
      await client.query(
        'INSERT INTO admin (username, email, password_hash, full_name, permissions, organization_id) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO UPDATE SET password_hash = $3',
        ['SuperAdmin', 'superadmin1@ccl.com', hashedPassword, 'Super Aerovania Master', 'all', 1]
      );
      
      console.log('   ✅ Super admin created/updated via direct PostgreSQL');
      client.release();
      pool.end();
      
    } catch (pgError) {
      console.error('   ❌ Direct PostgreSQL connection failed:', pgError.message);
    }
  }
}

fixSuperAdmin();