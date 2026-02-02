// Test script to verify authentication fixes work locally
const User = require('./src/backend/models/User');

async function testAuthFix() {
  try {
    console.log('🔍 Testing authentication fix...');
    
    // Test with CCL admin credentials
    console.log('📧 Testing CCL admin login...');
    const result = await User.authenticateUser('admin1@ccl.com', 'Aerovania_grhns@2002', 'admin');
    
    console.log('✅ Authentication successful!');
    console.log('👤 User:', result.user.username);
    console.log('🏢 Organization ID:', result.user.organizationId);
    console.log('🔑 Is Super Admin:', result.user.isSuperAdmin);
    console.log('🎫 Token generated:', !!result.token);
    
    // Test with super admin credentials
    console.log('\n📧 Testing Super admin login...');
    const superResult = await User.authenticateUser('superadmin@aero.com', 'SuperAero@2025', 'admin');
    
    console.log('✅ Super admin authentication successful!');
    console.log('👤 User:', superResult.user.username);
    console.log('🏢 Organization ID:', superResult.user.organizationId);
    console.log('🔑 Is Super Admin:', superResult.user.isSuperAdmin);
    console.log('🎫 Token generated:', !!superResult.token);
    
    console.log('\n🎉 All authentication tests passed!');
    
  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
    console.error('❌ Error details:', error);
  }
}

testAuthFix();