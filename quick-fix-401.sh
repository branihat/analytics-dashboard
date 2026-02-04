#!/bin/bash

# Quick Fix for 401 Login Error
# Run this on the VPS to fix the immediate login issue

echo "🚨 QUICK FIX FOR 401 LOGIN ERROR"
echo ""

# Navigate to project directory
cd /var/www/analytics-dashboard || { echo "❌ Failed to navigate to project directory"; exit 1; }

echo "📥 Pulling latest fixes..."
git pull origin main

echo "🗄️ Running database migration..."
node migrate-violations-organization.js

echo "🔄 Restarting server..."
cd src/backend
pm2 restart analytics-dashboard

echo "⏳ Waiting for server to restart..."
sleep 3

echo "🧪 Testing login..."
RESPONSE=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@aero.com","password":"SuperAero@2025","role":"admin"}')

if echo "$RESPONSE" | grep -q "token"; then
  echo "✅ LOGIN FIXED! 401 error resolved."
  echo ""
  echo "🎉 You can now:"
  echo "1. Visit https://aiminesanalytics.com"
  echo "2. Login with superadmin@aero.com / SuperAero@2025"
  echo "3. Test dashboard data isolation"
else
  echo "❌ Login still failing. Response:"
  echo "$RESPONSE"
  echo ""
  echo "🔍 Check logs: pm2 logs analytics-dashboard"
fi

echo ""