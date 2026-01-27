#!/bin/bash

# Final Analytics Dashboard Deployment Script
# This will deploy everything in one go

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

echo "🚀 Analytics Dashboard - Final Deployment"
echo "=========================================="
echo ""

# Configuration
REPO_URL="https://github.com/branihat/analytics-dashboard.git"
DOMAIN="aiminesanalytics.com"
APP_DIR="/var/www/analytics-dashboard"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root"
    exit 1
fi

print_status "Starting deployment process..."

# Update system
print_info "Updating system packages..."
apt update && apt upgrade -y
apt install -y curl wget git unzip build-essential nginx certbot python3-certbot-nginx

# Install Node.js 18
print_info "Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify Node.js installation
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_status "Node.js $NODE_VERSION and npm $NPM_VERSION installed"

# Install PM2
print_info "Installing PM2..."
npm install -g pm2

# Create application directory
print_info "Setting up application directory..."
mkdir -p /var/www
cd /var/www

# Remove existing directory if it exists
if [ -d "$APP_DIR" ]; then
    print_info "Removing existing application directory..."
    rm -rf "$APP_DIR"
fi

# Clone repository
print_info "Cloning repository..."
git clone $REPO_URL analytics-dashboard
cd analytics-dashboard

# Build frontend
print_info "Building frontend..."
cd src/frontend
npm install --legacy-peer-deps
npm run build

# Setup backend
print_info "Setting up backend..."
cd ../backend
npm install
rm -rf public
mkdir -p public data uploads/reports
cp -r ../frontend/build/* public/

# Create environment file
print_info "Creating environment configuration..."
cat > .env << EOF
NODE_ENV=production
PORT=8080
DATABASE_URL=sqlite:./data/violations.db
JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-50)
CLOUDINARY_CLOUD_NAME=dgf5874nz
CLOUDINARY_API_KEY=873245158622578
CLOUDINARY_API_SECRET=3DF8o9ZZD-WIzuSKfS6kFQoVzp4
CORS_ORIGIN=https://$DOMAIN
HELMET_ENABLED=true
EOF

# Create SQLite-only database setup
print_info "Creating SQLite database setup..."
cat > create-sqlite-db.js << 'EOFDB'
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const SQLITE_PATH = path.join(__dirname, 'data/violations.db');

async function createDatabase() {
    console.log('🔄 Creating SQLite database...');
    
    // Ensure data directory exists
    const dataDir = path.dirname(SQLITE_PATH);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    const db = new sqlite3.Database(SQLITE_PATH);
    
    // Create tables
    const tables = [
        `CREATE TABLE IF NOT EXISTS admin (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            permissions TEXT DEFAULT 'all',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS "user" (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            department TEXT,
            access_level TEXT DEFAULT 'basic',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS inferred_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            site_name TEXT,
            cloudinary_url TEXT NOT NULL,
            cloudinary_public_id TEXT NOT NULL,
            department TEXT NOT NULL,
            uploaded_by INTEGER NOT NULL,
            file_size INTEGER,
            upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            comment TEXT,
            ai_report_url TEXT,
            ai_report_public_id TEXT,
            hyperlink TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS atr_documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            cloudinary_url TEXT NOT NULL,
            cloudinary_public_id TEXT NOT NULL,
            site_name TEXT NOT NULL,
            department TEXT NOT NULL,
            uploaded_by INTEGER NOT NULL,
            file_size INTEGER,
            upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            comment TEXT,
            inferred_report_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS reports (
            report_id TEXT PRIMARY KEY,
            drone_id TEXT NOT NULL,
            date TEXT NOT NULL,
            location TEXT NOT NULL,
            total_violations INTEGER,
            uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS violations (
            id TEXT PRIMARY KEY,
            report_id TEXT NOT NULL,
            drone_id TEXT NOT NULL,
            date TEXT NOT NULL,
            location TEXT NOT NULL,
            type TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            image_url TEXT NOT NULL,
            confidence REAL,
            frame_number INTEGER,
            uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS features (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            display_name TEXT NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1
        )`,
        `CREATE TABLE IF NOT EXISTS sites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS videos_links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            feature_id TEXT,
            site_id TEXT,
            title TEXT NOT NULL,
            description TEXT,
            video_url TEXT NOT NULL,
            create_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            update_date DATETIME DEFAULT NULL
        )`
    ];
    
    // Create all tables
    for (const sql of tables) {
        await new Promise((resolve, reject) => {
            db.run(sql, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
    
    // Create default users
    const adminPassword = await bcrypt.hash('Aerovania_grhns@2002', 10);
    const superAdminPassword = await bcrypt.hash('Super_Aerovania_grhns@2002', 10);
    const etPassword = await bcrypt.hash('deptet123', 10);
    const securityPassword = await bcrypt.hash('deptsecurity123', 10);
    const operationPassword = await bcrypt.hash('deptoperation123', 10);
    const surveyPassword = await bcrypt.hash('deptsurvey123', 10);
    const safetyPassword = await bcrypt.hash('deptsafety123', 10);
    
    // Insert admin users
    await new Promise((resolve) => {
        db.run('INSERT OR IGNORE INTO admin (username, email, password_hash, full_name, permissions) VALUES (?, ?, ?, ?, ?)',
            ['Admin', 'admin1@ccl.com', adminPassword, 'Aerovania Master', 'all'], resolve);
    });
    
    await new Promise((resolve) => {
        db.run('INSERT OR IGNORE INTO admin (username, email, password_hash, full_name, permissions) VALUES (?, ?, ?, ?, ?)',
            ['SuperAdmin', 'superadmin1@ccl.com', superAdminPassword, 'Super Aerovania Master', 'all'], resolve);
    });
    
    // Insert department users
    const users = [
        ['et_department', 'et@ccl.com', etPassword, 'E&T Department User', 'E&T Department', 'basic'],
        ['security_department', 'security@ccl.com', securityPassword, 'Security Department User', 'Security Department', 'basic'],
        ['operation_department', 'operation@ccl.com', operationPassword, 'Operation Department User', 'Operation Department', 'basic'],
        ['survey_department', 'survey@ccl.com', surveyPassword, 'Survey Department User', 'Survey Department', 'basic'],
        ['safety_department', 'safety@ccl.com', safetyPassword, 'Safety Department User', 'Safety Department', 'basic']
    ];
    
    for (const user of users) {
        await new Promise((resolve) => {
            db.run('INSERT OR IGNORE INTO "user" (username, email, password_hash, full_name, department, access_level) VALUES (?, ?, ?, ?, ?, ?)',
                user, resolve);
        });
    }
    
    // Insert default features
    const features = [
        ['ppe_kit_detection', 'PPE Kit Detection'],
        ['crowding_of_people', 'Crowding of People'],
        ['crowding_of_vehicles', 'Crowding of Vehicles'],
        ['rest_shelter_lighting', 'Rest Shelter Lighting'],
        ['stagnant_water', 'Stagnant Water'],
        ['fire_smoke', 'Fire Smoke'],
        ['loose_boulder', 'Loose Boulder'],
        ['red_flag', 'Red Flag']
    ];
    
    for (const feature of features) {
        await new Promise((resolve) => {
            db.run('INSERT OR IGNORE INTO features (name, display_name) VALUES (?, ?)', feature, resolve);
        });
    }
    
    // Insert default sites
    const sites = ['Bukaro', 'BNK Mines', 'Dhori', 'Kathara'];
    for (const site of sites) {
        await new Promise((resolve) => {
            db.run('INSERT OR IGNORE INTO sites (name) VALUES (?)', [site], resolve);
        });
    }
    
    db.close();
    console.log('✅ SQLite database created successfully');
}

createDatabase().catch(console.error);
EOFDB

# Initialize database
print_info "Initializing SQLite database..."
node create-sqlite-db.js

# Configure Nginx
print_info "Configuring Nginx..."
cat > /etc/nginx/sites-available/analytics-dashboard << 'EOFNGINX'
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

# Enable Nginx site
ln -sf /etc/nginx/sites-available/analytics-dashboard /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# Start application with PM2
print_info "Starting application with PM2..."
pm2 delete analytics-dashboard 2>/dev/null || true
pm2 start server.js --name analytics-dashboard
pm2 save
pm2 startup

# Configure firewall
print_info "Configuring firewall..."
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

# Wait for application to start
print_info "Waiting for application to start..."
sleep 10

# Test application
print_info "Testing application..."
if curl -s http://localhost:8080/api/health > /dev/null; then
    print_status "Application is running successfully!"
else
    print_warning "Application health check failed - checking PM2 logs..."
    pm2 logs analytics-dashboard --lines 10
fi

# Setup SSL certificate
print_info "Setting up SSL certificate..."
print_warning "Make sure your domain DNS points to this server (72.61.226.59)"
read -p "Press Enter when DNS is configured and you want to continue with SSL setup..."

if certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN; then
    print_status "SSL certificate installed successfully"
else
    print_warning "SSL installation failed - you can set it up manually later"
fi

# Create backup script
print_info "Creating backup script..."
cat > /home/backup-app.sh << 'EOFBACKUP'
#!/bin/bash
BACKUP_DIR="/home/backups"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d-%H%M%S)
cp /var/www/analytics-dashboard/src/backend/data/violations.db $BACKUP_DIR/violations-$DATE.db
tar -czf $BACKUP_DIR/app-$DATE.tar.gz /var/www/analytics-dashboard --exclude=node_modules --exclude=.git
ls -t $BACKUP_DIR/violations-*.db | tail -n +8 | xargs rm -f
ls -t $BACKUP_DIR/app-*.tar.gz | tail -n +8 | xargs rm -f
echo "Backup completed: $DATE"
EOFBACKUP

chmod +x /home/backup-app.sh

# Setup daily backup cron job
(crontab -l 2>/dev/null; echo "0 2 * * * /home/backup-app.sh") | crontab -

# Final status
print_status "Deployment completed!"
echo ""
echo "🎉 Your Analytics Dashboard is now live!"
echo ""
echo "📋 Application Information:"
echo "- Frontend: https://$DOMAIN (or http://$DOMAIN if SSL failed)"
echo "- Backend API: https://$DOMAIN/api"
echo "- Health Check: https://$DOMAIN/api/health"
echo "- Server IP: 72.61.226.59"
echo ""
echo "🔐 Default Login Credentials:"
echo "- Admin: admin1@ccl.com / Aerovania_grhns@2002"
echo "- Super Admin: superadmin1@ccl.com / Super_Aerovania_grhns@2002"
echo "- E&T Dept: et@ccl.com / deptet123"
echo "- Security: security@ccl.com / deptsecurity123"
echo "- Operation: operation@ccl.com / deptoperation123"
echo "- Survey: survey@ccl.com / deptsurvey123"
echo "- Safety: safety@ccl.com / deptsafety123"
echo ""
echo "🔧 Management Commands:"
echo "- View logs: pm2 logs analytics-dashboard"
echo "- Restart app: pm2 restart analytics-dashboard"
echo "- Check status: pm2 status"
echo "- Backup data: /home/backup-app.sh"
echo ""
echo "📁 Important Files:"
echo "- Application: /var/www/analytics-dashboard"
echo "- Database: /var/www/analytics-dashboard/src/backend/data/violations.db"
echo "- Environment: /var/www/analytics-dashboard/src/backend/.env"
echo "- Nginx Config: /etc/nginx/sites-available/analytics-dashboard"
echo ""
print_status "Deployment completed successfully! 🚀"