#!/usr/bin/env node

// Script to make existing admin a super admin
require('dotenv').config();

async function makeAdminSuper() {
  try {
    const database = require('./src/backend/utils/databaseHybrid');
    
    console.log('🔄 Making admin1@ccl.com a super admin...');
    
    // Update the existing admin to have super admin privileges
    const result = await database.run(
      'UPDATE admin SET username = ?, full_name = ? WHERE email = ?',
      ['SuperAdmin', 'Super Aerovania Master', 'admin1@ccl.com']
    );
    
    if (result.changes > 0) {
      console.log('✅ admin1@ccl.com is now a super admin!');
      console.log('');
      console.log('🎉 Super admin login credentials:');
      console.log('   Email: admin1@ccl.com');
      console.log('   Password: Aerovania_grhns@2002');
      console.log('   Username: SuperAdmin (updated)');
    } else {
      console.log('❌ Failed to update admin user');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

makeAdminSuper();