#!/bin/bash

# Quick Fix for 401 Login Error
# Run this on the VPS to fix the immediate login issue

echo "🚨 QUICK FIX FOR 401 LOGIN ERROR"
echo ""

# Navigate to project directory
cd /var/www/analytics-dashboard || { echo "❌ Failed to navigate to project directory"; exit 1; }

echo "📂 Current directory: $(pwd)"
echo ""

# Step 1: Check current status
echo "🔍 Step 1: Checking current status..."
if grep -q "COALESCE(organization_id, 1)" src/backend/models/User.js; then
  echo "✅ Code appears to be updated"
else
  echo "❌ Code needs updating"
  echo "📥 Pulling latest fixes..."
  git pull origin main
fi

echo ""

# Step 2: Check database connection
echo "🔍 Step 2: Testing database connection..."
PGPASSWORD="WJGj9ylxPXYUjVkEq5b8" psql -h localhost -U analytics_user -d analytics_dashboard -c "SELECT 'DB Connected!' as status;" 2>/dev/null

if [ $? -eq 0 ]; then
  echo "✅ Database connection working"
else
  echo "❌ Database connection failed"
  echo "🔧 Checking PostgreSQL status..."
  sudo systemctl status postgresql --no-pager -l || echo "Could not check PostgreSQL status"
  
  echo ""
  echo "🔧 Trying to start PostgreSQL..."
  sudo systemctl start postgresql
  sleep 2
fi

echo ""

# Step 3: Run migration
echo "🔍 Step 3: Running database migration..."
node migrate-violations-organization.js

echo ""

# Step 4: Restart server
echo "🔍 Step 4: Restarting server..."
cd src/backend
pm2 restart analytics-dashboard

echo "⏳ Waiting for server to restart..."
sleep 5

echo ""

# Step 5: Test authentication
echo "🔍 Step 5: Testing authentication..."

# Test health endpoint first
echo "🏥 Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:8080/api/health)
if echo "$HEALTH_RESPONSE" | grep -q "status"; then
  echo "✅ Server is responding"
else
  echo "❌ Server not responding properly"
  echo "Response: $HEALTH_RESPONSE"
fi

echo ""

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
echo "🎯 RESULTS:"
echo "----------------------------------------"

if echo "$SUPER_RESPONSE" | grep -q "token" && echo "$CCL_RESPONSE" | grep -q "token"; then
  echo "🎉 SUCCESS! Both logins are working!"
  echo ""
  echo "✅ You can now:"
  echo "1. Visit https://aiminesanalytics.com"
  echo "2. Login with superadmin@aero.com / SuperAero@2025"
  echo "3. Login with admin1@ccl.com / Aerovania_grhns@2002"
  echo "4. Test dashboard data isolation"
  echo ""
  echo "🧪 Run dashboard isolation test:"
  echo "chmod +x test-dashboard-isolation.sh && ./test-dashboard-isolation.sh"
elif echo "$SUPER_RESPONSE" | grep -q "token"; then
  echo "⚠️ PARTIAL SUCCESS: Super admin works, CCL admin fails"
  echo "This suggests organization_id migration may need more time"
  echo ""
  echo "🔧 Try these steps:"
  echo "1. Wait 30 seconds and test CCL admin again"
  echo "2. Check PM2 logs: pm2 logs analytics-dashboard"
  echo "3. Run full database test: chmod +x test-database-connection.sh && ./test-database-connection.sh"
else
  echo "❌ FAILED: Authentication still not working"
  echo ""
  echo "🔧 Next steps:"
  echo "1. Check PM2 logs: pm2 logs analytics-dashboard"
  echo "2. Run database test: chmod +x test-database-connection.sh && ./test-database-connection.sh"
  echo "3. Check if PostgreSQL is running: sudo systemctl status postgresql"
fi

echo ""