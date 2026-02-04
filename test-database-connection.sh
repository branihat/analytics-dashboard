#!/bin/bash

# Test Database Connection and Authentication
# Run this script on the VPS to diagnose database and authentication issues

echo "🔍 Testing Database Connection and Authentication..."
echo ""

# Check if we're in the right directory
if [ ! -f "src/backend/.env" ]; then
  echo "❌ Not in the correct directory. Please run from /var/www/analytics-dashboard"
  exit 1
fi

echo "📂 Current directory: $(pwd)"
echo ""

# Test 1: Check database URL
echo "🔍 Test 1: Database URL Configuration"
echo "----------------------------------------"
DATABASE_URL=$(grep "DATABASE_URL" src/backend/.env | cut -d'=' -f2)
echo "Database URL: $(echo $DATABASE_URL | sed 's/:[^@]*@/:***@/g')"
echo ""

# Test 2: Test PostgreSQL connection directly
echo "🔍 Test 2: Direct PostgreSQL Connection"
echo "----------------------------------------"
echo "Testing direct connection to PostgreSQL..."

# Extract connection details
DB_USER="analytics_user"
DB_PASSWORD="WJGj9ylxPXYUjVkEq5b8"
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="analytics_dashboard"

# Test connection
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 'Connection successful!' as status;" 2>/dev/null

if [ $? -eq 0 ]; then
  echo "✅ Direct PostgreSQL connection successful"
else
  echo "❌ Direct PostgreSQL connection failed"
  echo ""
  echo "🔧 Troubleshooting steps:"
  echo "1. Check if PostgreSQL is running: sudo systemctl status postgresql"
  echo "2. Check if database exists: sudo -u postgres psql -l | grep analytics_dashboard"
  echo "3. Check if user exists: sudo -u postgres psql -c \"\\du\" | grep analytics_user"
fi

echo ""

# Test 3: Test Node.js database connection
echo "🔍 Test 3: Node.js Database Connection"
echo "----------------------------------------"

if [ -f "src/backend/utils/databaseHybrid.js" ]; then
  echo "Testing Node.js database connection..."
  
  node -e "
  require('dotenv').config({ path: './src/backend/.env' });
  const database = require('./src/backend/utils/databaseHybrid');
  
  console.log('🔗 Testing database connection...');
  
  database.get('SELECT 1 as test')
    .then(result => {
      console.log('✅ Node.js database connection successful!');
      return database.all('SELECT name FROM sqlite_master WHERE type=\"table\" UNION SELECT tablename as name FROM pg_tables WHERE schemaname=\"public\"');
    })
    .then(tables => {
      console.log('📊 Tables found:', tables.length);
      tables.forEach(table => console.log('  -', table.name));
      return database.all('PRAGMA table_info(admin)').catch(() => database.all('SELECT column_name FROM information_schema.columns WHERE table_name = \"admin\"'));
    })
    .then(columns => {
      console.log('📋 Admin table columns:');
      columns.forEach(col => console.log('  -', col.name || col.column_name));
      const hasOrgId = columns.some(col => (col.name || col.column_name) === 'organization_id');
      console.log('🏢 Admin table has organization_id:', hasOrgId ? '✅ YES' : '❌ NO');
      process.exit(0);
    })
    .catch(err => {
      console.log('❌ Node.js database connection failed:', err.message);
      console.log('Error details:', err);
      process.exit(1);
    });
  " 2>/dev/null || echo "⚠️ Could not test Node.js database connection"
else
  echo "❌ Database utility file not found"
fi

echo ""

# Test 4: Test authentication with current code
echo "🔍 Test 4: Authentication Test"
echo "----------------------------------------"

echo "Testing authentication endpoints..."

# Test super admin login
echo "🔐 Testing super admin login..."
SUPER_RESPONSE=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@aero.com","password":"SuperAero@2025","role":"admin"}')

if echo "$SUPER_RESPONSE" | grep -q "token"; then
  echo "✅ Super admin login successful"
else
  echo "❌ Super admin login failed"
  echo "Response: $SUPER_RESPONSE"
fi

# Test CCL admin login
echo ""
echo "🔐 Testing CCL admin login..."
CCL_RESPONSE=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin1@ccl.com","password":"Aerovania_grhns@2002","role":"admin"}')

if echo "$CCL_RESPONSE" | grep -q "token"; then
  echo "✅ CCL admin login successful"
else
  echo "❌ CCL admin login failed"
  echo "Response: $CCL_RESPONSE"
fi

echo ""

# Test 5: Check PM2 status and logs
echo "🔍 Test 5: PM2 Status and Recent Logs"
echo "----------------------------------------"

if command -v pm2 >/dev/null 2>&1; then
  echo "PM2 process status:"
  pm2 list | grep analytics-dashboard || echo "❌ analytics-dashboard process not found"
  
  echo ""
  echo "Recent PM2 logs (last 10 lines):"
  pm2 logs analytics-dashboard --lines 10 --nostream 2>/dev/null || echo "⚠️ Could not fetch PM2 logs"
else
  echo "❌ PM2 not found"
fi

echo ""
echo "🎯 Summary and Next Steps:"
echo "----------------------------------------"

if echo "$SUPER_RESPONSE" | grep -q "token" && echo "$CCL_RESPONSE" | grep -q "token"; then
  echo "✅ Authentication is working correctly!"
  echo "The 401 error might be resolved. Try accessing the website now."
elif echo "$SUPER_RESPONSE" | grep -q "token"; then
  echo "⚠️ Super admin works, but CCL admin fails"
  echo "This suggests the organization_id migration may be needed"
  echo "Run: node migrate-violations-organization.js"
else
  echo "❌ Authentication is failing"
  echo ""
  echo "🔧 Recommended fixes:"
  echo "1. Check if code is updated: git pull origin main"
  echo "2. Run migration: node migrate-violations-organization.js"
  echo "3. Restart server: pm2 restart analytics-dashboard"
  echo "4. Check database connection above"
fi

echo ""