#!/bin/bash

# Test Organization-Based Data Isolation
# Run this script on the VPS to verify the deployment

echo "🧪 Testing Organization-Based Data Isolation..."
echo ""

BASE_URL="http://localhost:8080/api"

# Test 1: Super Admin Login
echo "🔐 Test 1: Super Admin Login"
SUPER_TOKEN=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@aero.com","password":"SuperAero@2025","role":"admin"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$SUPER_TOKEN" ]; then
  echo "✅ Super admin login successful"
else
  echo "❌ Super admin login failed"
  exit 1
fi

# Test 2: CCL Admin Login
echo ""
echo "🔐 Test 2: CCL Admin Login"
CCL_TOKEN=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin1@ccl.com","password":"Aerovania_grhns@2002","role":"admin"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$CCL_TOKEN" ]; then
  echo "✅ CCL admin login successful"
else
  echo "❌ CCL admin login failed"
  exit 1
fi

# Test 3: Organizations API (Super Admin)
echo ""
echo "🏢 Test 3: Organizations API (Super Admin)"
ORG_RESPONSE=$(curl -s -H "Authorization: Bearer $SUPER_TOKEN" $BASE_URL/organizations)
if echo "$ORG_RESPONSE" | grep -q "organizations"; then
  echo "✅ Organizations API accessible to super admin"
else
  echo "❌ Organizations API failed for super admin"
fi

# Test 4: Violations Map API (No Auth - Backward Compatibility)
echo ""
echo "🗺️ Test 4: Violations Map API (No Auth)"
MAP_RESPONSE=$(curl -s $BASE_URL/violations/map)
if echo "$MAP_RESPONSE" | grep -q "markers"; then
  echo "✅ Violations map API working without auth"
else
  echo "❌ Violations map API failed"
fi

# Test 5: Violations Map API (CCL Admin)
echo ""
echo "🗺️ Test 5: Violations Map API (CCL Admin)"
CCL_MAP_RESPONSE=$(curl -s -H "Authorization: Bearer $CCL_TOKEN" $BASE_URL/violations/map)
if echo "$CCL_MAP_RESPONSE" | grep -q "markers"; then
  echo "✅ Violations map API working with CCL admin auth"
else
  echo "❌ Violations map API failed with CCL admin auth"
fi

# Test 6: Violations Map API (Super Admin)
echo ""
echo "🗺️ Test 6: Violations Map API (Super Admin)"
SUPER_MAP_RESPONSE=$(curl -s -H "Authorization: Bearer $SUPER_TOKEN" $BASE_URL/violations/map)
if echo "$SUPER_MAP_RESPONSE" | grep -q "markers"; then
  echo "✅ Violations map API working with super admin auth"
else
  echo "❌ Violations map API failed with super admin auth"
fi

# Test 7: Database Migration Check
echo ""
echo "🗄️ Test 7: Database Migration Check"
if node -e "
const database = require('./src/backend/utils/databaseHybrid');
database.all('PRAGMA table_info(violations)')
  .then(columns => {
    const hasOrgId = columns.some(col => col.name === 'organization_id');
    console.log(hasOrgId ? '✅ organization_id column exists in violations table' : '❌ organization_id column missing');
    process.exit(hasOrgId ? 0 : 1);
  })
  .catch(err => {
    console.log('❌ Database check failed:', err.message);
    process.exit(1);
  });
"; then
  echo "Database migration successful"
else
  echo "Database migration may have issues"
fi

echo ""
echo "🎯 Test Summary Complete!"
echo ""
echo "📋 Manual Tests to Perform:"
echo "1. Visit https://aiminesanalytics.com"
echo "2. Login with superadmin@aero.com / SuperAero@2025"
echo "3. Go to Organizations page and create a test organization"
echo "4. Create a user for the test organization"
echo "5. Login with admin1@ccl.com and upload JSON violation data"
echo "6. Verify CCL admin can only see CCL data"
echo "7. Login with super admin and verify you can see all data"
echo ""