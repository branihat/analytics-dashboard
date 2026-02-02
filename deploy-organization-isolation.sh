#!/bin/bash

echo "🚀 Deploying Organization-Based Data Isolation to VPS..."

VPS_HOST="root@72.61.226.59"
VPS_PATH="/var/www/analytics-dashboard"

echo "📁 Step 1: Copying updated backend files..."

# Authentication and middleware files
echo "  - Copying User model..."
scp src/backend/models/User.js $VPS_HOST:$VPS_PATH/src/backend/models/

echo "  - Copying auth middleware..."
scp src/backend/middleware/auth.js $VPS_HOST:$VPS_PATH/src/backend/middleware/

# Route files
echo "  - Copying upload routes..."
scp src/backend/routes/upload.js $VPS_HOST:$VPS_PATH/src/backend/routes/

echo "  - Copying violations routes..."
scp src/backend/routes/violations.js $VPS_HOST:$VPS_PATH/src/backend/routes/

echo "  - Copying inferredReports routes..."
scp src/backend/routes/inferredReports.js $VPS_HOST:$VPS_PATH/src/backend/routes/

echo "  - Copying uploadedATR routes..."
scp src/backend/routes/uploadedATR.js $VPS_HOST:$VPS_PATH/src/backend/routes/

echo "  - Copying organizations routes..."
scp src/backend/routes/organizations.js $VPS_HOST:$VPS_PATH/src/backend/routes/

# Model files
echo "  - Copying Violation model..."
scp src/backend/models/Violation.js $VPS_HOST:$VPS_PATH/src/backend/models/

echo "  - Copying InferredReports model..."
scp src/backend/models/InferredReports.js $VPS_HOST:$VPS_PATH/src/backend/models/

echo "  - Copying UploadedATR model..."
scp src/backend/models/UploadedATR.js $VPS_HOST:$VPS_PATH/src/backend/models/

echo "  - Copying Organization model..."
scp src/backend/models/Organization.js $VPS_HOST:$VPS_PATH/src/backend/models/

# Migration script
echo "  - Copying migration script..."
scp migrate-violations-organization.js $VPS_HOST:$VPS_PATH/

echo "📁 Step 2: Copying updated frontend files..."

echo "  - Copying Organizations page..."
scp src/frontend/src/pages/Organizations.js $VPS_HOST:$VPS_PATH/src/frontend/src/pages/

echo "  - Copying Organizations CSS..."
scp src/frontend/src/styles/Organizations.css $VPS_HOST:$VPS_PATH/src/frontend/src/styles/

echo "🔄 Step 3: Running database migration on VPS..."
ssh $VPS_HOST "cd $VPS_PATH && node migrate-violations-organization.js"

echo "🔄 Step 4: Restarting backend server..."
ssh $VPS_HOST "cd $VPS_PATH/src/backend && pm2 restart analytics-dashboard"

echo "🔄 Step 5: Rebuilding frontend..."
ssh $VPS_HOST "cd $VPS_PATH/src/frontend && npm run build"

echo "🔄 Step 6: Testing authentication..."
ssh $VPS_HOST "cd $VPS_PATH && curl -s http://localhost:8080/api/health"

echo "✅ Deployment completed!"
echo ""
echo "🔍 What was deployed:"
echo "  ✓ Organization-based authentication system"
echo "  ✓ Data isolation for PDF documents (Inferred Reports & ATR)"
echo "  ✓ Data isolation for JSON violation data"
echo "  ✓ Organizations management with user creation"
echo "  ✓ Database schema migration for violations"
echo ""
echo "🔐 Access Control:"
echo "  • Super Admin (superadmin@aero.com): Can see ALL data"
echo "  • CCL Admin (admin1@ccl.com): Can see only CCL data"
echo "  • Other org users: Can see only their organization's data"
echo ""
echo "🌐 Test the deployment at: https://aiminesanalytics.com"