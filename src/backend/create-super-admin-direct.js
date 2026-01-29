#!/usr/bin/env node

// Direct PostgreSQL script to create super admin
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

async function createSuperAdminDirect() {
  let pool;
  
  try {
    console.log('🔍 Creating super admin via direct PostgreSQL connection...');
    
    // Create PostgreSQL connection
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL');
    
    // Check if super admin exists
    const existingResult = await client.query(
      'SELECT id, username, email FROM admin WHERE email = $1',
      ['superadmin@aero.com']
    );
    
    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];
      console.log('✅ Super admin already exists:');
      console.log('   ID:', existing.id);
      console.log('   Username:', existing.username);
      console.log('   Email:', existing.email);
      
      // Update password
      console.log('🔄 Updating password...');
      const hashedPassword = await bcrypt.hash('SuperAero@2025', 10);
      await client.query(
        'UPDATE admin SET password_hash = $1, username = $2, full_name = $3 WHERE email = $4',
        [hashedPassword, 'SuperAdmin', 'Aerovania Super Administrator', 'superadmin@aero.com']
      );
      console.log('✅ Super admin updated!');
    } else {
      // Create new super admin
      console.log('🔄 Creating new super admin...');
      const hashedPassword = await bcrypt.hash('SuperAero@2025', 10);
      
      const result = await client.query(
        'INSERT INTO admin (username, email, password_hash, full_name, permissions) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        ['SuperAdmin', 'superadmin@aero.com', hashedPassword, 'Aerovania Super Administrator', 'all']
      );
      
      console.log('✅ Super admin created successfully!');
      console.log('   ID:', result.rows[0].id);
    }
    
    // Ensure CCL admin is properly configured
    console.log('🔍 Configuring CCL admin...');
    const cclUpdateResult = await client.query(
      'UPDATE admin SET organization_id = $1 WHERE email = $2',
      [1, 'admin1@ccl.com']
    );
    if (cclUpdateResult.rowCount > 0) {
      console.log('✅ CCL admin configured');
    } else {
      console.log('⚠️ CCL admin not found or already configured');
    }
    
    // List all admins
    console.log('');
    console.log('📋 Current admin users:');
    const adminsResult = await client.query(
      'SELECT id, username, email, full_name, organization_id FROM admin ORDER BY id'
    );
    
    adminsResult.rows.forEach(admin => {
      console.log(`   - ID: ${admin.id}, Username: ${admin.username}, Email: ${admin.email}, Org: ${admin.organization_id || 'System-wide'}`);
    });
    
    client.release();
    
    console.log('');
    console.log('🎉 Super admin login credentials:');
    console.log('   Email: superadmin@aero.com');
    console.log('   Password: SuperAero@2025');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

createSuperAdminDirect();