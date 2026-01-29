#!/usr/bin/env node

// Script to create proper super admin user
require('dotenv').config();
const bcrypt = require('bcryptjs');
const database = require('./src/backend/utils/databaseHybrid');

async function createProperSuperAdmin() {
  try {
    console.log('🔍 Creating proper super admin for Aerovania...');
    
    // Check if super admin already exists
    const existingAdmin = await database.get(
      'SELECT id, username, email FROM admin WHERE email = ?',
      ['superadmin@aero.com']
    );
    
    if (existingAdmin) {
      console.log('✅ Super admin already exists:');
      console.log('   ID:', existingAdmin.id);
      console.log('   Username:', existingAdmin.username);
      console.log('   Email:', existingAdmin.email);
      
      // Update password to ensure it's correct
      console.log('🔄 Updating password to ensure it\'s correct...');
      const hashedPassword = await bcrypt.hash('SuperAero@2025', 10);
      await database.run(
        'UPDATE admin SET password_hash = ?, username = ?, full_name = ? WHERE email = ?',
        [hashedPassword, 'SuperAdmin', 'Aerovania Super Administrator', 'superadmin@aero.com']
      );
      console.log('✅ Super admin updated successfully!');
      return;
    }
    
    console.log('🔄 Creating new super admin user...');
    
    // Hash the password
    const password = 'SuperAero@2025';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create super admin (organization_id = NULL for system-wide super admin)
    const result = await database.run(
      'INSERT INTO admin (username, email, password_hash, full_name, permissions, organization_id) VALUES (?, ?, ?, ?, ?, ?)',
      ['SuperAdmin', 'superadmin@aero.com', hashedPassword, 'Aerovania Super Administrator', 'all', null]
    );
    
    console.log('✅ Super admin created successfully!');
    console.log('   ID:', result.id);
    console.log('   Username: SuperAdmin');
    console.log('   Email: superadmin@aero.com');
    console.log('   Password: SuperAero@2025');
    console.log('   Organization: System-wide (not tied to any specific org)');
    console.log('');
    console.log('🎉 You can now login as super admin!');
    
    // Also ensure CCL admin remains as organization admin
    console.log('');
    console.log('🔍 Ensuring CCL admin remains as organization admin...');
    const cclAdmin = await database.get(
      'SELECT id, username, email FROM admin WHERE email = ?',
      ['admin1@ccl.com']
    );
    
    if (cclAdmin) {
      await database.run(
        'UPDATE admin SET organization_id = ? WHERE email = ?',
        [1, 'admin1@ccl.com'] // CCL organization ID = 1
      );
      console.log('✅ CCL admin properly configured for CCL organization');
    }
    
  } catch (error) {
    console.error('❌ Error creating super admin:', error);
    console.error('Error details:', error.message);
  }
}

createProperSuperAdmin();