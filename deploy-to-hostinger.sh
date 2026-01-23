#!/bin/bash

# Hostinger VPS Deployment Script
# Run this script on your Hostinger VPS after initial setup

set -e

echo "🚀 Starting Hostinger deployment..."

# Configuration
APP_DIR="/var/www/analytics-dashboard"
REPO_URL="https://github.com/yourusername/analytics-dashboard.git"  # Update this
DOMAIN="yourdomain.com"  # Update this

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please don't run this script as root"
    exit 1
fi

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
print_status "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs git nginx certbot python3-certbot-nginx build-essential

# Verify Node.js installation
node_version=$(node -v)
npm_version=$(npm -v)
print_status "Node.js $node_version and npm $npm_version installed"

# Install PM2
print_status "Installing PM2..."
sudo npm install -g pm2

# Create app directory
print_status "Setting up application directory..."
sudo mkdir -p /var/www
cd /var/www

# Clone repository (or update if exists)
if [ -d "$APP_DIR" ]; then
    print_status "Updating existing repository..."
    cd $APP_DIR
    git pull origin main
else
    print_status "Cloning repository..."
    sudo git clone $REPO_URL analytics-dashboard
    sudo chown -R $USER:$USER analytics-dashboard
    cd analytics-dashboard
fi

# Build frontend
print_status "Building frontend..."
cd src/frontend
npm install
npm run build

# Copy frontend build to backend
print_status "Copying frontend build to backend..."
cd ../..
rm -rf src/backend/public
mkdir -p src/backend/public
cp -r src/frontend/build/* src/backend/public/

# Install backend dependencies
print_status "Installing backend dependencies..."
cd src/backend
npm install

# Setup environment file
print_status "Setting up environment configuration..."
if [ ! -f .env ]; then
    cp ../../production.env.template .env
    print_warning "Please edit src/backend/.env with your production values:"
    print_warning "- Change JWT_SECRET to a secure value"
    print_warning "- Update CORS_ORIGIN to your domain"
    print_warning "- Verify DATABASE_URL is correct"
    read -p "Press Enter after updating .env file..."
fi

# Initialize database
print_status "Initializing database..."
node create-database.js

# Setup PM2
print_status "Setting up PM2 process..."
pm2 delete analytics-dashboard 2>/dev/null || true
pm2 start server.js --name analytics-dashboard
pm2 save
pm2 startup

print_warning "Please run the PM2 startup command shown above"
read -p "Press Enter after running the PM2 startup command..."

# Configure Nginx
print_status "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/analytics-dashboard > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    client_max_body_size 50M;
    
    location / {
        proxy_pass http://127.0.0.1:8080;
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
EOF

# Enable Nginx site
sudo ln -sf /etc/nginx/sites-available/analytics-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup firewall
print_status "Configuring firewall..."
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Setup SSL certificate
print_status "Setting up SSL certificate..."
print_warning "Make sure your domain DNS is pointing to this server before continuing"
read -p "Press Enter when DNS is configured..."

sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN

# Create backup script
print_status "Creating backup script..."
sudo tee /home/backup-sqlite.sh > /dev/null <<'EOF'
#!/bin/bash
BACKUP_DIR="/home/backups/sqlite"
mkdir -p $BACKUP_DIR
cp /var/www/analytics-dashboard/src/backend/data/violations.db $BACKUP_DIR/violations-$(date +%Y%m%d-%H%M%S).db
# Keep only last 30 backups
ls -t $BACKUP_DIR/violations-*.db | tail -n +31 | xargs rm -f
EOF

chmod +x /home/backup-sqlite.sh

# Add to crontab
print_status "Setting up daily backups..."
(crontab -l 2>/dev/null; echo "0 2 * * * /home/backup-sqlite.sh") | crontab -

# Create update script
print_status "Creating update script..."
sudo tee /home/update-app.sh > /dev/null <<EOF
#!/bin/bash
cd $APP_DIR
git pull origin main
cd src/frontend
npm install
npm run build
cp -r build/* ../backend/public/
cd ../backend
npm install
pm2 restart analytics-dashboard
echo "✅ Application updated successfully"
EOF

chmod +x /home/update-app.sh

# Final status check
print_status "Performing final checks..."
sleep 5

# Test application
if curl -f -s http://localhost:8080/api/health > /dev/null; then
    print_status "Application is running successfully!"
else
    print_error "Application health check failed"
    print_warning "Check PM2 logs: pm2 logs analytics-dashboard"
fi

# Display final information
echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Application Information:"
echo "- Frontend: https://$DOMAIN"
echo "- Backend API: https://$DOMAIN/api"
echo "- Health Check: https://$DOMAIN/api/health"
echo ""
echo "🔐 Default Login Credentials:"
echo "- Admin: admin1@ccl.com / Aerovania_grhns@2002"
echo "- E&T Dept: et@ccl.com / deptet123"
echo ""
echo "🔧 Management Commands:"
echo "- View logs: pm2 logs analytics-dashboard"
echo "- Restart app: pm2 restart analytics-dashboard"
echo "- Update app: /home/update-app.sh"
echo "- Backup SQLite: /home/backup-sqlite.sh"
echo ""
echo "📁 Important Paths:"
echo "- Application: $APP_DIR"
echo "- Environment: $APP_DIR/src/backend/.env"
echo "- SQLite DB: $APP_DIR/src/backend/data/violations.db"
echo "- Nginx Config: /etc/nginx/sites-available/analytics-dashboard"
echo ""
print_status "Your Analytics Dashboard is now live at https://$DOMAIN"