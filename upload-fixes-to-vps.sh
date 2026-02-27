#!/bin/bash

# Configuration - UPDATE THESE
VPS_HOST="your-vps-ip-or-domain"
VPS_USER="root"
VPS_PATH="/var/www/analytics-dashboard"

echo "📤 Uploading Fixed Files to VPS"
echo "================================"
echo ""
echo "⚠️  Make sure to update VPS_HOST in this script first!"
echo ""

# Check if host is configured
if [ "$VPS_HOST" = "your-vps-ip-or-domain" ]; then
    echo "❌ Please edit this script and set VPS_HOST to your actual VPS address"
    echo "   Example: VPS_HOST=\"72.61.226.59\" or VPS_HOST=\"aiminesanalytics.com\""
    exit 1
fi

echo "🎯 Target: $VPS_USER@$VPS_HOST:$VPS_PATH"
echo ""

# Upload diagnostic scripts
echo "1️⃣  Uploading diagnostic scripts..."
scp diagnose-500-error.sh $VPS_USER@$VPS_HOST:$VPS_PATH/
scp test-report-generation.sh $VPS_USER@$VPS_HOST:$VPS_PATH/
scp check-backend-logs.sh $VPS_USER@$VPS_HOST:$VPS_PATH/

# Upload fix script
echo "2️⃣  Uploading fix script..."
scp fix-report-service.sh $VPS_USER@$VPS_HOST:$VPS_PATH/

# Upload optimization script
echo "3️⃣  Uploading PDF optimization script..."
scp optimize-pdf-size.py $VPS_USER@$VPS_HOST:$VPS_PATH/

# Upload updated backend files
echo "4️⃣  Uploading updated backend files..."
scp src/backend/.env $VPS_USER@$VPS_HOST:$VPS_PATH/src/backend/.env
scp src/backend/routes/reportGenerator.js $VPS_USER@$VPS_HOST:$VPS_PATH/src/backend/routes/reportGenerator.js

# Upload updated Python app
echo "5️⃣  Uploading updated Python app..."
scp report_generator-main/app.py $VPS_USER@$VPS_HOST:$VPS_PATH/report_generator-main/app.py

echo ""
echo "✅ All files uploaded!"
echo ""
echo "📋 Next steps on VPS:"
echo ""
echo "ssh $VPS_USER@$VPS_HOST"
echo "cd $VPS_PATH"
echo ""
echo "# Run diagnostic first:"
echo "chmod +x diagnose-500-error.sh"
echo "./diagnose-500-error.sh"
echo ""
echo "# Then run the fix:"
echo "chmod +x fix-report-service.sh"
echo "./fix-report-service.sh"
echo ""
echo "# Test the service:"
echo "chmod +x test-report-generation.sh"
echo "./test-report-generation.sh"
