#!/bin/bash

# Organization-Based Data Isolation - Quick Deployment Script
# Run this script on the VPS after git pull

echo "🚀 Starting Organization-Based Data Isolation Deployment..."

# Step 1: Navigate to project directory
cd /var/www/analytics-dashboard || { echo "❌ Failed to navigate to project directory"; exit 1; }

echo "📂 Current directory: $(pwd)"

# Step 2: Pull latest changes
echo "📥 Pulling latest changes from git..."
git pull origin main || { echo "❌ Git pull failed"; exit 1; }

# Step 3: Install any new dependencies (if needed)
echo "📦 Installing backend dependencies..."
cd src/backend
npm install --production

echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install --production

# Step 4: Run database migration
echo "🗄️ Running database migration..."
cd /var/www/analytics-dashboard
node migrate-violations-organization.js || { echo "⚠️ Migration failed, but continuing..."; }

# Step 5: Build frontend
echo "🏗️ Building frontend..."
cd src/frontend
npm run build || { echo "❌ Frontend build failed"; exit 1; }

# Step 6: Restart PM2 services
echo "🔄 Restarting PM2 services..."
cd src/backend
pm2 restart analytics-dashboard || { echo "❌ PM2 restart failed"; exit 1; }

# Step 7: Test the deployment
echo "🧪 Testing deployment..."
sleep 5

# Test health endpoint
echo "🏥 Testing health endpoint..."
curl -f http://localhost:8080/api/health || { echo "⚠️ Health check failed"; }

# Test login endpoint
echo "🔐 Testing login endpoint..."
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@aero.com","password":"SuperAero@2025","role":"admin"}' \
  | grep -q "token" && echo "✅ Login test passed" || echo "⚠️ Login test failed"

echo ""
echo "🎉 Deployment completed!"
echo ""
echo "📋 Next Steps:"
echo "1. Visit https://aiminesanalytics.com"
echo "2. Login with superadmin@aero.com / SuperAero@2025"
echo "3. Test Organizations page"
echo "4. Test data isolation by uploading JSON data with CCL admin"
echo ""
echo "🔍 If issues occur, check logs with: pm2 logs analytics-dashboard"
echo ""