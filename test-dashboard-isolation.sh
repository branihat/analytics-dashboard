#!/bin/bash

# Test Dashboard Data Isolation
# Run this script on the VPS to verify dashboard analytics are filtered by organization

echo "🧪 Testing Dashboard Data Isolation..."
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

# Test 3: Analytics KPIs (No Auth - Should show all data)
echo ""
echo "📊 Test 3: Analytics KPIs (No Auth - Should show all data)"
NO_AUTH_KPIS=$(curl -s $BASE_URL/analytics/kpis)
NO_AUTH_VIOLATIONS=$(echo "$NO_AUTH_KPIS" | grep -o '"total_violations":[0-9]*' | cut -d':' -f2)
echo "No Auth - Total violations: $NO_AUTH_VIOLATIONS"

# Test 4: Analytics KPIs (CCL Admin - Should show only CCL data)
echo ""
echo "📊 Test 4: Analytics KPIs (CCL Admin - Should show only CCL data)"
CCL_KPIS=$(curl -s -H "Authorization: Bearer $CCL_TOKEN" $BASE_URL/analytics/kpis)
CCL_VIOLATIONS=$(echo "$CCL_KPIS" | grep -o '"total_violations":[0-9]*' | cut -d':' -f2)
echo "CCL Admin - Total violations: $CCL_VIOLATIONS"

# Test 5: Analytics KPIs (Super Admin - Should show all data)
echo ""
echo "📊 Test 5: Analytics KPIs (Super Admin - Should show all data)"
SUPER_KPIS=$(curl -s -H "Authorization: Bearer $SUPER_TOKEN" $BASE_URL/analytics/kpis)
SUPER_VIOLATIONS=$(echo "$SUPER_KPIS" | grep -o '"total_violations":[0-9]*' | cut -d':' -f2)
echo "Super Admin - Total violations: $SUPER_VIOLATIONS"

# Test 6: Pie Chart Data (CCL Admin)
echo ""
echo "📊 Test 6: Pie Chart Data (CCL Admin)"
CCL_PIE=$(curl -s -H "Authorization: Bearer $CCL_TOKEN" $BASE_URL/analytics/charts/pie)
if echo "$CCL_PIE" | grep -q "chart_data"; then
  echo "✅ CCL Admin can access pie chart data"
else
  echo "❌ CCL Admin cannot access pie chart data"
fi

# Test 7: Time Series Data (CCL Admin)
echo ""
echo "📊 Test 7: Time Series Data (CCL Admin)"
CCL_TIMESERIES=$(curl -s -H "Authorization: Bearer $CCL_TOKEN" $BASE_URL/analytics/charts/timeseries)
if echo "$CCL_TIMESERIES" | grep -q "chart_data"; then
  echo "✅ CCL Admin can access time series data"
else
  echo "❌ CCL Admin cannot access time series data"
fi

# Test 8: Summary Data (CCL Admin)
echo ""
echo "📊 Test 8: Summary Data (CCL Admin)"
CCL_SUMMARY=$(curl -s -H "Authorization: Bearer $CCL_TOKEN" $BASE_URL/analytics/summary)
if echo "$CCL_SUMMARY" | grep -q "recent_violations"; then
  echo "✅ CCL Admin can access summary data"
else
  echo "❌ CCL Admin cannot access summary data"
fi

echo ""
echo "🎯 Dashboard Isolation Test Results:"
echo "   - No Auth violations: $NO_AUTH_VIOLATIONS"
echo "   - CCL Admin violations: $CCL_VIOLATIONS"
echo "   - Super Admin violations: $SUPER_VIOLATIONS"
echo ""

# Analyze results
if [ "$CCL_VIOLATIONS" -lt "$SUPER_VIOLATIONS" ] || [ "$CCL_VIOLATIONS" -lt "$NO_AUTH_VIOLATIONS" ]; then
  echo "✅ Dashboard data isolation is working correctly!"
  echo "   CCL Admin sees fewer violations than Super Admin/No Auth"
else
  echo "⚠️ Dashboard data isolation may not be working properly"
  echo "   CCL Admin should see fewer violations than Super Admin"
fi

echo ""
echo "📋 Manual Tests to Perform:"
echo "1. Visit https://aiminesanalytics.com"
echo "2. Login with admin1@ccl.com and check dashboard numbers"
echo "3. Login with superadmin@aero.com and verify higher numbers"
echo "4. Create a test organization and verify it shows 0 violations"
echo ""