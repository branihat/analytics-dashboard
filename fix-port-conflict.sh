#!/bin/bash

# Fix Port Conflict Script
# Run this on your Hostinger server to resolve the EADDRINUSE error

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

echo "🔧 Fixing Port 8080 Conflict"
echo ""

# Check what's using port 8080
print_status "Checking what's using port 8080..."
sudo lsof -i :8080 || echo "No processes found on port 8080"

# Stop all PM2 processes
print_status "Stopping all PM2 processes..."
pm2 delete all 2>/dev/null || echo "No PM2 processes to stop"

# Kill any remaining processes on port 8080
print_status "Killing any remaining processes on port 8080..."
sudo fuser -k 8080/tcp 2>/dev/null || echo "No processes to kill on port 8080"

# Wait a moment
sleep 3

# Navigate to application directory
cd /var/www/analytics-dashboard/src/backend

# Start the application fresh
print_status "Starting application on port 8080..."
pm2 start server.js --name analytics-dashboard

# Save PM2 configuration
pm2 save

# Check if application started successfully
sleep 5
if curl -s http://localhost:8080/api/health > /dev/null; then
    print_status "✅ Application is now running successfully on port 8080!"
    print_status "🌐 Your site should be accessible at https://aiminesanalytics.com"
else
    print_error "❌ Application failed to start. Check PM2 logs:"
    pm2 logs analytics-dashboard --lines 20
fi

echo ""
echo "🔧 Useful commands:"
echo "- Check status: pm2 status"
echo "- View logs: pm2 logs analytics-dashboard"
echo "- Restart app: pm2 restart analytics-dashboard"
echo "- Stop app: pm2 stop analytics-dashboard"