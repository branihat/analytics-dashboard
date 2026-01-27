#!/bin/bash

# Clean Analytics Dashboard Deployment Script
# Run this directly on your Hostinger VPS

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Configuration
REPO_URL="https://github.com/branihat/analytics-dashboard.git"
DOMAIN="aiminesanalytics.com"

echo "🚀 Starting Analytics Dashboard Deployment"
echo "Repository: $REPO_URL"
echo "Domain: $DOMAIN"
echo ""

# Check sudo access
if ! sudo -n true 2>/dev/null; then
    print_error "This script requires sudo privileges"
    exit 1
fi

# Update system
print_status "Updating system..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip build-essential

# Install Node.js 18
print_status "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# Install Nginx and SSL tools
print_status "Installing Nginx and SSL tools..."
sudo apt install -y nginx certbot python3-certbot-nginx

# Install PostgreSQL
print_status "Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib postgresql-client
sudo systemctl start postgresql
sudo systemctl enable postgresql
sleep 5

# Generate secure passwords
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-50)

print_status "Creating database and user..."
sudo -u postgres psql << EOF
DROP DATABASE IF EXISTS analytics_dashboard;
DROP USER IF EXISTS analytics_user;
CREATE DATABASE analytics_dashboard;
CREATE USER analytics_user WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE analytics_dashboard TO analytics_user;
ALTER USER analytics_user CREATEDB;
ALTER USER analytics_user WITH SUPERUSER;
\c analytics_dashboard
GRANT ALL ON SCHEMA public TO analytics_user;
\q
EOF

# Configure PostgreSQL
PG_VERSION=$(sudo -u postgres psql -t -c "SELECT version();" | grep -oP '\d+\.\d+' | head -1)
PG_CONFIG_DIR="/etc/postgresql/$PG_VERSION/main"
sudo cp "$PG_CONFIG_DIR/pg_hba.conf" "$PG_CONFIG_DIR/pg_hba.conf.backup" 2>/dev/null || true
echo "local   analytics_dashboard   analytics_user   md5" | sudo tee -a "$PG_CONFIG_DIR/pg_hba.conf"
sudo systemctl restart postgresql
sleep 3

# Test database connection
print_status "Testing database connection..."
if PGPASSWORD="$DB_PASSWORD" psql -h localhost -U analytics_user -d analytics_dashboard -c "SELECT 'OK' as status;" > /dev/null 2>&1; then
    print_status "Database connection successful"
else
    print_warning "Database connection test failed, but continuing..."
fi

# Setup application
print_status "Setting up application..."
sudo mkdir -p /var/www
cd /var/www

if [ -d "analytics-dashboard" ]; then
    cd analytics-dashboard
    git pull origin main
else
    sudo git clone $REPO_URL analytics-dashboard
fi

sudo chown -R $USER:$USER analytics-dashboard
cd analytics-dashboard

# Build frontend
print_status "Building frontend..."
cd src/frontend
npm install
npm run build

# Setup backend
cd ../..
rm -rf src/backend/public
mkdir -p src/backend/public
cp -r src/frontend/build/* src/backend/public/

cd src/backend
npm install

# Create environment file
print_status "Creating environment configuration..."
cat > .env << EOF
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://analytics_user:$DB_PASSWORD@localhost:5432/analytics_dashboard
JWT_SECRET=$JWT_SECRET
CLOUDINARY_CLOUD_NAME=dgf5874nz
CLOUDINARY_API_KEY=873245158622578
CLOUDINARY_API_SECRET=3DF8o9ZZD-WIzuSKfS6kFQoVzp4
CORS_ORIGIN=https://$DOMAIN
HELMET_ENABLED=true
EOF

# Initialize database
print_status "Initializing database..."
if node create-database.js; then
    print_status "Database initialized successfully"
else
    print_warning "Database initialization had issues, creating tables manually..."
    
    # Create tables manually
    PGPASSWORD="$DB_PASSWORD" psql -h localhost -U analytics_user -d analytics_dashboard << EOSQL
CREATE TABLE IF NOT EXISTS admin (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    permissions TEXT DEFAULT 'all',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "user" (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    department TEXT,
    access_level TEXT DEFAULT 'basic',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inferred_reports (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL,
    site_name TEXT,
    cloudinary_url TEXT NOT NULL,
    cloudinary_public_id TEXT NOT NULL,
    department TEXT NOT NULL,
    uploaded_by INTEGER NOT NULL,
    file_size INTEGER,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    comment TEXT,
    ai_report_url TEXT,
    ai_report_public_id TEXT,
    hyperlink TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS atr_documents (
    id SERIAL PRIMARY KEY,
    filename TEXT NOT NULL,
    cloudinary_url TEXT NOT NULL,
    cloudinary_public_id TEXT NOT NULL,
    site_name TEXT NOT NULL,
    department TEXT NOT NULL,
    uploaded_by INTEGER NOT NULL,
    file_size INTEGER,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    comment TEXT,
    inferred_report_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOSQL
    
    print_status "Tables created manually"
fi

# Configure Nginx
print_status "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/analytics-dashboard > /dev/null << 'EOFNGINX'
server {
    listen 80;
    server_name aiminesanalytics.com www.aiminesanalytics.com;
    
    client_max_body_size 50M;
    
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOFNGINX

sudo ln -sf /etc/nginx/sites-available/analytics-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Start application
print_status "Starting application..."
pm2 delete analytics-dashboard 2>/dev/null || true
pm2 start server.js --name analytics-dashboard
pm2 save
pm2 startup

# Configure firewall
print_status "Configuring firewall..."
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Setup SSL
print_status "Setting up SSL certificate..."
print_warning "Make sure your domain DNS points to this server before continuing"
read -p "Press Enter when DNS is configured..."

if sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN; then
    print_status "SSL certificate installed successfully"
else
    print_warning "SSL installation failed, trying without www..."
    sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN || print_warning "SSL setup failed - can be done manually later"
fi

# Create backup script
print_status "Creating backup script..."
cat > /home/backup-db.sh << 'EOFBACKUP'
#!/bin/bash
BACKUP_DIR="/home/backups"
mkdir -p $BACKUP_DIR
PGPASSWORD="$DB_PASSWORD" pg_dump -h localhost -U analytics_user analytics_dashboard > $BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).sql
ls -t $BACKUP_DIR/backup-*.sql | tail -n +8 | xargs rm -f
EOFBACKUP

chmod +x /home/backup-db.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /home/backup-db.sh") | crontab -

# Final verification
print_status "Performing final checks..."
sleep 10

if curl -s http://localhost:8080/api/health > /dev/null; then
    print_status "Application is running successfully!"
else
    print_warning "Application health check failed - check PM2 logs"
fi

# Display summary
echo ""
echo "🎉 DEPLOYMENT COMPLETED!"
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
echo "🗄️ Database Information:"
echo "- Database: analytics_dashboard"
echo "- Username: analytics_user"
echo "- Password: $DB_PASSWORD"
echo ""
echo "🔧 Management Commands:"
echo "- View logs: pm2 logs analytics-dashboard"
echo "- Restart app: pm2 restart analytics-dashboard"
echo "- Backup database: /home/backup-db.sh"
echo ""
print_status "Your Analytics Dashboard is now live at https://$DOMAIN"