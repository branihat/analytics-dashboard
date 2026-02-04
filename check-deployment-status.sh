#!/bin/bash

# Check if the organization isolation fixes have been deployed
# Run this script on the VPS to verify deployment status

echo "🔍 Checking Organization Isolation Deployment Status..."
echo ""

# Check if we're in the right directory
if [ ! -f "src/backend/models/User.js" ]; then
  echo "❌ Not in the correct directory. Please run from /var/www/analytics-dashboard"
  exit 1
fi

echo "📂 Current directory: $(pwd)"
echo ""

# Check 1: User.js has COALESCE fix
echo "🔍 Check 1: User.js authentication fix"
if grep -q "COALESCE(organization_id, 1)" src/backend/models/User.js; then
  echo "✅ User.js has COALESCE fix for organization_id"
else
  echo "❌ User.js missing COALESCE fix - need to git pull"
fi

# Check 2: Analytics routes have organization filtering
echo ""
echo "🔍 Check 2: Analytics routes organization filtering"
if grep -q "organizationFilter" src/backend/routes/analytics.js; then
  echo "✅ Analytics routes have organization filtering"
else
  echo "❌ Analytics routes missing organization filtering - need to git pull"
fi

# Check 3: Violation model has organization filtering
echo ""
echo "🔍 Check 3: Violation model analytics filtering"
if grep -q "getAnalytics(organizationFilter" src/backend/models/Violation.js; then
  echo "✅ Violation model has organization filtering in getAnalytics"
else
  echo "❌ Violation model missing organization filtering - need to git pull"
fi

# Check 4: Migration script exists
echo ""
echo "🔍 Check 4: Migration script"
if [ -f "migrate-violations-organization.js" ]; then
  echo "✅ Migration script exists"
else
  echo "❌ Migration script missing - need to git pull"
fi

# Check 5: Database migration status
echo ""
echo "🔍 Check 5: Database migration status"
if node -e "
const database = require('./src/backend/utils/databaseHybrid');
database.all('PRAGMA table_info(violations)')
  .then(columns => {
    const hasOrgId = columns.some(col => col.name === 'organization_id');
    console.log(hasOrgId ? '✅ organization_id column exists in violations table' : '❌ organization_id column missing - need to run migration');
    process.exit(0);
  })
  .catch(err => {
    console.log('❌ Database check failed:', err.message);
    process.exit(1);
  });
" 2>/dev/null; then
  echo "Database migration check completed"
else
  echo "⚠️ Could not check database migration status"
fi

# Check 6: PM2 process status
echo ""
echo "🔍 Check 6: PM2 process status"
if pm2 list | grep -q "analytics-dashboard"; then
  echo "✅ PM2 process 'analytics-dashboard' is running"
  pm2 list | grep analytics-dashboard
else
  echo "❌ PM2 process 'analytics-dashboard' not found"
fi

echo ""
echo "🎯 Deployment Status Summary:"
echo ""

# Quick deployment check
NEEDS_GIT_PULL=false
NEEDS_MIGRATION=false
NEEDS_RESTART=false

if ! grep -q "COALESCE(organization_id, 1)" src/backend/models/User.js; then
  NEEDS_GIT_PULL=true
fi

if ! grep -q "organizationFilter" src/backend/routes/analytics.js; then
  NEEDS_GIT_PULL=true
fi

if [ "$NEEDS_GIT_PULL" = true ]; then
  echo "❌ CODE NOT UPDATED - Run: git pull origin main"
  echo ""
  echo "🚀 Quick Fix Commands:"
  echo "git pull origin main"
  echo "node migrate-violations-organization.js"
  echo "cd src/backend && pm2 restart analytics-dashboard"
  echo ""
else
  echo "✅ Code is up to date"
  echo ""
  echo "🧪 Test the login:"
  echo "curl -X POST http://localhost:8080/api/auth/login \\"
  echo "  -H \"Content-Type: application/json\" \\"
  echo "  -d '{\"email\":\"superadmin@aero.com\",\"password\":\"SuperAero@2025\",\"role\":\"admin\"}'"
  echo ""
fi

echo "📋 If login still fails after git pull:"
echo "1. Check PM2 logs: pm2 logs analytics-dashboard"
echo "2. Restart PM2: pm2 restart analytics-dashboard"
echo "3. Check database connection: node src/backend/check-database-credentials.js"
echo ""