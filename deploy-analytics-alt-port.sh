#!/bin/bash

# Analytics Dashboard Deployment Script - Alternative Port
# Use this if port 8080 is occupied

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Configuration - Using alternative port
ALT_PORT=3001
DOMAIN="aiminesanalytics.com"

echo "🚀 Starting Analytics Dashboard Deployment (Port $ALT_PORT)"
echo "Domain: $DOMAIN"
echo ""

# Navigate to application directory
cd /var/www/analytics-dashboard/src/backend

# Stop existing processes
print_status "Stopping existing processes..."
pm2 delete analytics-dashboard 2>/dev/null || true

# Update environment file to use alternative port
print_status "Updating environment configuration for port $ALT_PORT..."
sed -i "s/PORT=8080/PORT=$ALT_PORT/g" .env

# Update Nginx configuration for new port
print_status "Updating Nginx configuration..."
sudo tee /etc/nginx/sites-available/analytics-dashboard > /dev/null << EOFNGINX
server {
    listen 80;
    server_name aiminesanalytics.com www.aiminesanalytics.com;
    
    client_max_body_size 50M;
    
    location / {
        proxy_pass http://127.0.0.1:$ALT_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOFNGINX

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx

# Start application on new port
print_status "Starting application on port $ALT_PORT..."
pm2 start server.js --name analytics-dashboard
pm2 save

# Configure firewall for new port
print_status "Configuring firewall..."
sudo ufw allow $ALT_PORT

# Final verification
print_status "Performing final checks..."
sleep 10

if curl -s http://localhost:$ALT_PORT/api/health > /dev/null; then
    print_status "✅ Application is running successfully on port $ALT_PORT!"
    print_status "🌐 Your site should be accessible at https://$DOMAIN"
else
    print_error "❌ Application health check failed"
    print_warning "Check PM2 logs: pm2 logs analytics-dashboard"
fi

echo ""
echo "🎉 DEPLOYMENT COMPLETED ON PORT $ALT_PORT!"
echo ""
echo "📋 Application Information:"
echo "- Frontend: https://$DOMAIN"
echo "- Backend API: https://$DOMAIN/api"
echo "- Internal Port: $ALT_PORT"
echo ""
print_status "Your Analytics Dashboard is now live!"