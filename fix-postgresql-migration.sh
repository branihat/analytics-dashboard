#!/bin/bash

# Fix PostgreSQL Migration Issue
# The migration was running on SQLite instead of PostgreSQL

echo "🔧 Fixing PostgreSQL Migration Issue..."
echo ""

# Navigate to project directory
cd /var/www/analytics-dashboard || { echo "❌ Failed to navigate to project directory"; exit 1; }

echo "📂 Current directory: $(pwd)"
echo ""

# Step 1: Check environment variables
echo "🔍 Step 1: Checking environment variables..."
echo "DATABASE_URL from .env file:"
grep "DATABASE_URL" src/backend/.env || echo "❌ DATABASE_URL not found in .env file"

echo ""
echo "Testing environment variable loading:"
node -e "
require('dotenv').config({ path: './src/backend/.env' });
console.log('DATABASE_URL loaded:', process.env.DATABASE_URL ? 'YES' : 'NO');
console.log('DATABASE_URL value:', process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^@]*@/, ':***@') : 'NOT SET');
"

echo ""

# Step 2: Test PostgreSQL connection directly
echo "🔍 Step 2: Testing PostgreSQL connection..."
PGPASSWORD="WJGj9ylxPXYUjVkEq5b8" psql -h localhost -U analytics_user -d analytics_dashboard -c "SELECT 'PostgreSQL Connected!' as status, version();" 2>/dev/null

if [ $? -eq 0 ]; then
  echo "✅ PostgreSQL connection successful"
else
  echo "❌ PostgreSQL connection failed"
  echo ""
  echo "🔧 Checking PostgreSQL service..."
  sudo systemctl status postgresql --no-pager -l | head -10
  
  echo ""
  echo "🔧 Trying to start PostgreSQL..."
  sudo systemctl start postgresql
  sleep 2
  
  echo "🔧 Testing connection again..."
  PGPASSWORD="WJGj9ylxPXYUjVkEq5b8" psql -h localhost -U analytics_user -d analytics_dashboard -c "SELECT 'PostgreSQL Connected!' as status;" 2>/dev/null
  
  if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL connection now working"
  else
    echo "❌ PostgreSQL still not working"
    echo ""
    echo "🔧 Manual PostgreSQL setup may be needed:"
    echo "sudo systemctl enable postgresql"
    echo "sudo systemctl start postgresql"
    echo "sudo -u postgres psql -c \"ALTER USER analytics_user PASSWORD 'WJGj9ylxPXYUjVkEq5b8';\""
  fi
fi

echo ""

# Step 3: Run migration with proper environment
echo "🔍 Step 3: Running migration with PostgreSQL..."

# Create a temporary migration script that ensures environment is loaded
cat > temp-migration.js << 'EOF'
// Temporary migration script with proper environment loading
require('dotenv').config({ path: './src/backend/.env' });

console.log('🔍 Environment check:');
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL value:', process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^@]*@/, ':***@') : 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');

const database = require('./src/backend/utils/databaseHybrid');

async function migrateViolationsOrganization() {
  try {
    console.log('🔄 Starting violations organization migration with PostgreSQL...');

    // Test connection first
    await database.get('SELECT 1 as test');
    console.log('✅ Database connection successful');

    // Check if organization_id column exists in violations table
    let violationsColumns;
    try {
      // Try PostgreSQL syntax first
      violationsColumns = await database.all(`
        SELECT column_name as name 
        FROM information_schema.columns 
        WHERE table_name = 'violations'
      `);
    } catch (err) {
      // Fallback to SQLite syntax
      violationsColumns = await database.all("PRAGMA table_info(violations)");
    }

    const hasViolationsOrgId = violationsColumns.some(col => col.name === 'organization_id' || col.column_name === 'organization_id');
    const hasViolationsUploadedBy = violationsColumns.some(col => col.name === 'uploaded_by' || col.column_name === 'uploaded_by');

    if (!hasViolationsOrgId) {
      console.log('📊 Adding organization_id column to violations table...');
      await database.run('ALTER TABLE violations ADD COLUMN organization_id INTEGER DEFAULT 1');
      console.log('✅ Added organization_id to violations table');
    } else {
      console.log('✅ organization_id column already exists in violations table');
    }

    if (!hasViolationsUploadedBy) {
      console.log('📊 Adding uploaded_by column to violations table...');
      await database.run('ALTER TABLE violations ADD COLUMN uploaded_by INTEGER');
      console.log('✅ Added uploaded_by to violations table');
    } else {
      console.log('✅ uploaded_by column already exists in violations table');
    }

    // Check reports table
    let reportsColumns;
    try {
      // Try PostgreSQL syntax first
      reportsColumns = await database.all(`
        SELECT column_name as name 
        FROM information_schema.columns 
        WHERE table_name = 'reports'
      `);
    } catch (err) {
      // Fallback to SQLite syntax
      reportsColumns = await database.all("PRAGMA table_info(reports)");
    }

    const hasReportsOrgId = reportsColumns.some(col => col.name === 'organization_id' || col.column_name === 'organization_id');
    const hasReportsUploadedBy = reportsColumns.some(col => col.name === 'uploaded_by' || col.column_name === 'uploaded_by');

    if (!hasReportsOrgId) {
      console.log('📊 Adding organization_id column to reports table...');
      await database.run('ALTER TABLE reports ADD COLUMN organization_id INTEGER DEFAULT 1');
      console.log('✅ Added organization_id to reports table');
    } else {
      console.log('✅ organization_id column already exists in reports table');
    }

    if (!hasReportsUploadedBy) {
      console.log('📊 Adding uploaded_by column to reports table...');
      await database.run('ALTER TABLE reports ADD COLUMN uploaded_by INTEGER');
      console.log('✅ Added uploaded_by to reports table');
    } else {
      console.log('✅ uploaded_by column already exists in reports table');
    }

    // Update existing data to have CCL organization (ID = 1) as default
    const violationsCount = await database.get('SELECT COUNT(*) as count FROM violations WHERE organization_id IS NULL');
    if (violationsCount.count > 0) {
      console.log(`📊 Updating ${violationsCount.count} existing violations to CCL organization...`);
      await database.run('UPDATE violations SET organization_id = 1 WHERE organization_id IS NULL');
      console.log('✅ Updated existing violations');
    }

    const reportsCount = await database.get('SELECT COUNT(*) as count FROM reports WHERE organization_id IS NULL');
    if (reportsCount.count > 0) {
      console.log(`📊 Updating ${reportsCount.count} existing reports to CCL organization...`);
      await database.run('UPDATE reports SET organization_id = 1 WHERE organization_id IS NULL');
      console.log('✅ Updated existing reports');
    }

    console.log('🎉 PostgreSQL migration completed successfully!');
    
    // Show summary
    const totalViolations = await database.get('SELECT COUNT(*) as count FROM violations');
    const totalReports = await database.get('SELECT COUNT(*) as count FROM reports');
    
    console.log('📊 Migration Summary:');
    console.log(`   - Total violations: ${totalViolations.count}`);
    console.log(`   - Total reports: ${totalReports.count}`);
    console.log(`   - All existing data assigned to CCL organization (ID: 1)`);
    console.log(`   - New uploads will be organization-specific`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('❌ Error details:', error);
  } finally {
    // Close database connections
    await database.close();
  }
}

// Run migration
migrateViolationsOrganization();
EOF

echo "Running PostgreSQL migration..."
node temp-migration.js

echo ""

# Step 4: Clean up and restart server
echo "🔍 Step 4: Cleaning up and restarting server..."
rm -f temp-migration.js

cd src/backend
pm2 restart analytics-dashboard

echo "⏳ Waiting for server to restart..."
sleep 5

echo ""

# Step 5: Test authentication
echo "🔍 Step 5: Testing authentication..."

# Test super admin login
echo "🔐 Testing super admin login..."
SUPER_RESPONSE=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@aero.com","password":"SuperAero@2025","role":"admin"}')

if echo "$SUPER_RESPONSE" | grep -q "token"; then
  echo "✅ Super admin login successful!"
else
  echo "❌ Super admin login failed"
  echo "Response: $SUPER_RESPONSE"
fi

echo ""

# Test CCL admin login
echo "🔐 Testing CCL admin login..."
CCL_RESPONSE=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin1@ccl.com","password":"Aerovania_grhns@2002","role":"admin"}')

if echo "$CCL_RESPONSE" | grep -q "token"; then
  echo "✅ CCL admin login successful!"
else
  echo "❌ CCL admin login failed"
  echo "Response: $CCL_RESPONSE"
fi

echo ""
echo "🎯 FINAL RESULTS:"
echo "----------------------------------------"

if echo "$SUPER_RESPONSE" | grep -q "token" && echo "$CCL_RESPONSE" | grep -q "token"; then
  echo "🎉 SUCCESS! PostgreSQL migration completed and authentication working!"
  echo ""
  echo "✅ You can now:"
  echo "1. Visit https://aiminesanalytics.com"
  echo "2. Login with both admin accounts"
  echo "3. Test dashboard data isolation"
  echo ""
  echo "🧪 Test dashboard isolation:"
  echo "chmod +x test-dashboard-isolation.sh && ./test-dashboard-isolation.sh"
else
  echo "⚠️ Migration completed but authentication may still have issues"
  echo "Check PM2 logs: pm2 logs analytics-dashboard"
fi

echo ""