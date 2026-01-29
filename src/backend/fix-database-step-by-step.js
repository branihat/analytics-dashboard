#!/usr/bin/env node

// Script to fix database schema step by step
require('dotenv').config();
const { Pool } = require('pg');

async function fixDatabaseStepByStep() {
  let pool;
  
  try {
    console.log('🔍 Fixing database schema step by step...');
    
    // Create PostgreSQL connection
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL');
    
    // Step 1: Create organizations table
    console.log('');
    console.log('Step 1: Creating organizations table...');
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS organizations (
          id SERIAL PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          code TEXT UNIQUE NOT NULL,
          description TEXT,
          logo_url TEXT,
          contact_email TEXT,
          contact_phone TEXT,
          address TEXT,
          is_active BOOLEAN DEFAULT true,
          created_by INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Organizations table created/verified');
    } catch (error) {
      console.log('❌ Error creating organizations table:', error.message);
    }
    
    // Step 2: Insert default CCL organization
    console.log('');
    console.log('Step 2: Creating default CCL organization...');
    try {
      const result = await client.query(`
        INSERT INTO organizations (name, code, description, is_active, created_at)
        VALUES ('Coal India Limited', 'CCL', 'Default organization for Coal India Limited operations', true, CURRENT_TIMESTAMP)
        ON CONFLICT (code) DO NOTHING
        RETURNING id
      `);
      if (result.rows.length > 0) {
        console.log('✅ CCL organization created with ID:', result.rows[0].id);
      } else {
        console.log('✅ CCL organization already exists');
      }
    } catch (error) {
      console.log('❌ Error creating CCL organization:', error.message);
    }
    
    // Step 3: Check current admin table structure
    console.log('');
    console.log('Step 3: Checking admin table structure...');
    try {
      const columns = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'admin'
      `);
      const columnNames = columns.rows.map(row => row.column_name);
      console.log('Current admin columns:', columnNames.join(', '));
      
      if (!columnNames.includes('organization_id')) {
        console.log('🔄 Adding organization_id column to admin table...');
        await client.query(`
          ALTER TABLE admin 
          ADD COLUMN organization_id INTEGER REFERENCES organizations(id) DEFAULT 1
        `);
        console.log('✅ organization_id column added to admin table');
      } else {
        console.log('✅ organization_id column already exists in admin table');
      }
    } catch (error) {
      console.log('❌ Error with admin table:', error.message);
    }
    
    // Step 4: Create super admin
    console.log('');
    console.log('Step 4: Creating super admin...');
    try {
      const bcrypt = require('bcryptjs');
      
      // Check if super admin exists
      const existing = await client.query(
        'SELECT id, username, email FROM admin WHERE email = $1',
        ['superadmin@aero.com']
      );
      
      if (existing.rows.length > 0) {
        console.log('✅ Super admin already exists:', existing.rows[0]);
        
        // Update password
        const hashedPassword = await bcrypt.hash('SuperAero@2025', 10);
        await client.query(
          'UPDATE admin SET password_hash = $1, username = $2, full_name = $3 WHERE email = $4',
          [hashedPassword, 'SuperAdmin', 'Aerovania Super Administrator', 'superadmin@aero.com']
        );
        console.log('✅ Super admin password updated');
      } else {
        // Create new super admin
        const hashedPassword = await bcrypt.hash('SuperAero@2025', 10);
        const result = await client.query(
          'INSERT INTO admin (username, email, password_hash, full_name, permissions, organization_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
          ['SuperAdmin', 'superadmin@aero.com', hashedPassword, 'Aerovania Super Administrator', 'all', null]
        );
        console.log('✅ Super admin created with ID:', result.rows[0].id);
      }
    } catch (error) {
      console.log('❌ Error creating super admin:', error.message);
      
      // Try without organization_id if column doesn't exist
      try {
        console.log('🔄 Trying to create super admin without organization_id...');
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('SuperAero@2025', 10);
        const result = await client.query(
          'INSERT INTO admin (username, email, password_hash, full_name, permissions) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO UPDATE SET password_hash = $2, username = $1, full_name = $4 RETURNING id',
          ['SuperAdmin', hashedPassword, 'superadmin@aero.com', 'Aerovania Super Administrator', 'all']
        );
        console.log('✅ Super admin created/updated with ID:', result.rows[0].id);
      } catch (fallbackError) {
        console.log('❌ Fallback creation also failed:', fallbackError.message);
      }
    }
    
    // Step 5: List all admins
    console.log('');
    console.log('Step 5: Current admin users:');
    try {
      const admins = await client.query(
        'SELECT id, username, email, full_name FROM admin ORDER BY id'
      );
      admins.rows.forEach(admin => {
        console.log(`   - ID: ${admin.id}, Username: ${admin.username}, Email: ${admin.email}`);
      });
    } catch (error) {
      console.log('❌ Error listing admins:', error.message);
    }
    
    client.release();
    
    console.log('');
    console.log('🎉 Database setup completed!');
    console.log('');
    console.log('Super admin login credentials:');
    console.log('   Email: superadmin@aero.com');
    console.log('   Password: SuperAero@2025');
    
  } catch (error) {
    console.error('❌ Connection error:', error.message);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

fixDatabaseStepByStep();