#!/bin/bash

# Hostinger VPS Complete Deployment Script
# This script deploys Analytics Dashboard with PostgreSQL database on Hostinger VPS

set -e

echo "🚀 Starting Hostinger deployment with PostgreSQL database..."

# Configuration - UPDATE THESE VALUES
APP_DIR="/var/www/analytics-dashboard"
REPO_URL="https://github.com/branihat/Analytics-Dashboard.git"  # Update this
DOMAIN="yourdomain.com"  # Update this

# Database configuration
DB_NAME="analytics_dashboard"
DB_USER="analytics_user"
DB_PASSWORD="arovania"

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

# Install and configure PostgreSQL
install_postgresql
configure_postgresql

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
cat > .env << EOF
# Production Environment
NODE_ENV=production
PORT=8080

# Database Configuration (Local PostgreSQL)
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME

# JWT Configuration (CHANGE THIS!)
JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-50)

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=dgf5874nz
CLOUDINARY_API_KEY=873245158622578
CLOUDINARY_API_SECRET=3DF8o9ZZD-WIzuSKfS6kFQoVzp4

# CORS Configuration
CORS_ORIGIN=https://$DOMAIN

# Security
HELMET_ENABLED=true
EOF

print_status "Environment file created with secure credentials"

# Initialize database
print_status "Initializing database..."
node create-database.js

# Run ATR table fix to ensure all tables exist
print_status "Ensuring all database tables exist..."
node fix-atr-table.js || print_warning "ATR table fix hogaya , continuing..."

# Verify database setup
print_status "Verifying database setup..."
node verify-database.js || print_warning "Database verify script fix nahi hua ye, continuing..."

# Setup PM2
print_status "Setting up PM2 process ye app management keliye hai"
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

# Create comprehensive backup script
print_status "Creating backup scripts..."

# PostgreSQL backup script
sudo tee /home/backup-postgresql.sh > /dev/null << EOF
#!/bin/bash
BACKUP_DIR="/home/backups/postgresql"
DATE=\$(date +%Y%m%d-%H%M%S)
mkdir -p \$BACKUP_DIR

# Backup PostgreSQL database
PGPASSWORD="$DB_PASSWORD" pg_dump -h localhost -U $DB_USER $DB_NAME > \$BACKUP_DIR/\${DB_NAME}-\${DATE}.sql

# Compress backup
gzip \$BACKUP_DIR/\${DB_NAME}-\${DATE}.sql

# Keep only last 30 backups
ls -t \$BACKUP_DIR/\${DB_NAME}-*.sql.gz | tail -n +31 | xargs rm -f

echo "PostgreSQL backup completed: \${DB_NAME}-\${DATE}.sql.gz"
EOF

# SQLite backup script (for violations data)
sudo tee /home/backup-sqlite.sh > /dev/null << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/backups/sqlite"
mkdir -p $BACKUP_DIR
if [ -f /var/www/analytics-dashboard/src/backend/data/violations.db ]; then
    cp /var/www/analytics-dashboard/src/backend/data/violations.db $BACKUP_DIR/violations-$(date +%Y%m%d-%H%M%S).db
    # Keep only last 30 backups
    ls -t $BACKUP_DIR/violations-*.db | tail -n +31 | xargs rm -f
    echo "SQLite backup completed"
else
    echo "SQLite database not found"
fi
EOF

# Combined backup script
sudo tee /home/backup-all.sh > /dev/null << 'EOF'
#!/bin/bash
echo "🔄 Starting comprehensive backup..."
/home/backup-postgresql.sh
/home/backup-sqlite.sh
echo "✅ All backups completed"
EOF

chmod +x /home/backup-postgresql.sh
chmod +x /home/backup-sqlite.sh
chmod +x /home/backup-all.sh

# Add to crontab
print_status "Setting up automated backups and monitoring..."
(crontab -l 2>/dev/null; echo "0 2 * * * /home/backup-all.sh") | crontab -

# Create monitoring script
sudo tee /home/monitor-app.sh > /dev/null << EOF
#!/bin/bash
echo "🔍 Analytics Dashboard Health Check - \$(date)"
echo "=============================================="

# Check PM2 status
pm2 status analytics-dashboard

# Check application health
curl -s http://localhost:8080/api/health || echo "❌ Health check failed"

# Check PostgreSQL connection
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 'PostgreSQL OK' as status;" > /dev/null 2>&1
if [ \$? -eq 0 ]; then
    echo "✅ PostgreSQL connection OK"
else
    echo "❌ PostgreSQL connection failed"
fi

# Check disk space
echo "💾 Disk Usage:"
df -h / | tail -1

echo "Health check completed"
echo ""
EOF

chmod +x /home/monitor-app.sh

# Add monitoring to crontab
(crontab -l 2>/dev/null; echo "*/30 * * * * /home/monitor-app.sh >> /var/log/health-check.log 2>&1") | crontab -

# Create update script
print_status "Creating update script..."
sudo tee /home/update-app.sh > /dev/null <<EOF
#!/bin/bash
echo "🔄 Updating Analytics Dashboard..."

cd $APP_DIR
git pull origin main

cd src/frontend
npm install
npm run build
cp -r build/* ../backend/public/

cd ../backend
npm install

# Run database fixes if needed
node fix-atr-table.js 2>/dev/null || echo "⚠️ ATR fix script not found"

pm2 restart analytics-dashboard

echo "✅ Application updated successfully"
EOF

chmod +x /home/update-app.sh

# Save database configuration
print_status "Saving database configuration..."
sudo tee /home/postgresql-config.txt > /dev/null << EOF
# Analytics Dashboard PostgreSQL Configuration
# Generated on: $(date)

Database Name: $DB_NAME
Database User: $DB_USER
Database Password: $DB_PASSWORD
Connection String: postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME

# Management Commands:
# - Backup PostgreSQL: /home/backup-postgresql.sh
# - Backup SQLite: /home/backup-sqlite.sh
# - Backup All: /home/backup-all.sh
# - Monitor App: /home/monitor-app.sh
# - Update App: /home/update-app.sh

# Database Connection:
# PGPASSWORD="$DB_PASSWORD" psql -h localhost -U $DB_USER -d $DB_NAME

# Service Management:
# - Start: sudo systemctl start postgresql
# - Stop: sudo systemctl stop postgresql
# - Restart: sudo systemctl restart postgresql
# - Status: sudo systemctl status postgresql
EOF

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
echo "�️ Database Information:"
echo "- PostgreSQL Host: localhost"
echo "- Database Name: $DB_NAME"
echo "- Username: $DB_USER"
echo "- Password: $DB_PASSWORD"
echo "- Connection: postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
echo ""
echo "🔐 Default Login Credentials:"
echo "- Admin: admin1@ccl.com / Aerovania_grhns@2002"
echo "- E&T Dept: et@ccl.com / deptet123"
echo "- Security: security@ccl.com / deptsecurity123"
echo "- Operation: operation@ccl.com / deptoperation123"
echo "- Survey: survey@ccl.com / deptsurvey123"
echo "- Safety: safety@ccl.com / deptsafety123"
echo ""
echo "🔧 Management Commands:"
echo "- View logs: pm2 logs analytics-dashboard"
echo "- Restart app: pm2 restart analytics-dashboard"
echo "- Update app: /home/update-app.sh"
echo "- Backup all: /home/backup-all.sh"
echo "- Monitor health: /home/monitor-app.sh"
echo ""
echo "📁 Important Paths:"
echo "- Application: $APP_DIR"
echo "- Environment: $APP_DIR/src/backend/.env"
echo "- PostgreSQL Config: /home/postgresql-config.txt"
echo "- SQLite DB: $APP_DIR/src/backend/data/violations.db"
echo "- Nginx Config: /etc/nginx/sites-available/analytics-dashboard"
echo "- Backups: /home/backups/"
echo ""
print_warning "IMPORTANT: Save the database credentials securely!"
print_warning "Database config saved to: /home/postgresql-config.txt"
echo ""
print_status "Your Analytics Dashboard is now live at https://$DOMAIN"