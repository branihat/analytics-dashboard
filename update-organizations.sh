#!/bin/bash

echo "🚀 Updating Organizations Management on VPS..."

# Copy updated files to VPS
echo "📁 Copying Organization model..."
scp src/backend/models/Organization.js root@72.61.226.59:/var/www/analytics-dashboard/src/backend/models/

echo "📁 Copying Organization routes..."
scp src/backend/routes/organizations.js root@72.61.226.59:/var/www/analytics-dashboard/src/backend/routes/

echo "📁 Copying Organizations frontend component..."
scp src/frontend/src/pages/Organizations.js root@72.61.226.59:/var/www/analytics-dashboard/src/frontend/src/pages/

echo "📁 Copying Organizations CSS..."
scp src/frontend/src/styles/Organizations.css root@72.61.226.59:/var/www/analytics-dashboard/src/frontend/src/styles/

echo "🔄 Restarting backend server..."
ssh root@72.61.226.59 "cd /var/www/analytics-dashboard/src/backend && pm2 restart analytics-dashboard"

echo "🔄 Rebuilding frontend..."
ssh root@72.61.226.59 "cd /var/www/analytics-dashboard/src/frontend && npm run build"

echo "✅ Organizations management updated successfully!"
echo "🌐 Visit https://aiminesanalytics.com to test the changes"