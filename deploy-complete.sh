#!/bin/bash

# Complete Hostinger VPS Deployment Script
# This script automates the entire deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${PURPLE}================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}================================${NC}"
}

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Configuration variables
REPO_URL=""
DOMAIN=""
DB_PASSWORD=""
JWT_SECRET=""

# Function to get user input
get_configuration() {
    print_header "DEPLOYMENT CONFIGURATION"
    
    echo "Please provide the following information:"
    echo ""
    
    read -p "Enter your Git repository URL: " REPO_URL
    read -p "Enter your domain name (e.g., yourdomain.com): " DOMAIN
    
    # Generate secure JWT secret
    JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-50)
    
    echo ""
    print_info "Repository: $REPO_URL"
    print_info "Domain: $DOMAIN"
    print_info "JWT Secret: Generated automatically"
    echo ""
    
    read -p "Continue with deployment? (y/n): " confirm
    if [ "$confirm" != "y" ]; then
        print_error "Deployment cancelled"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    print_header "CHECKING PREREQUISITES"
    
    # Check if running as non-root user
    if [ "$EUID" -eq 0 ]; then
        print_error "Please run this script as a non-root user with sudo privileges"
        exit 1
    fi
    
    # Check sudo access
    if ! sudo -n true 2>/dev/null; then
        print_error "This script requires sudo privileges"
        exit 1
    fi
    
    # Check internet connectivity
    if ! ping -c 1 google.com &> /dev/null; then
        print_error "No internet connection available"
        exit 1
    fi
    
    print_status "Prerequisites check passed"
}

# Update system
update_system() {
    print_header "UPDATING SYSTEM"
    
    sudo apt update && sudo apt upgrade -y
    sudo apt install -y curl wget git unzip build-essential
    
    print_status "System updated successfully"
}

# Install Node.js
install_nodejs() {
    print_header "INSTALLING NODE.JS"
    
    # Install Node.js 18+
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    
    # Verify installation
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    
    print_status "Node.js $NODE_VERSION installed"
    print_status "npm $NPM_VERSION installed"
    
    # Install PM2 globally
    sudo npm install -g pm2
    print_status "PM2 installed"
}

# Install Nginx and SSL tools
install_nginx() {
    print_header "INSTALLING NGINX & SSL TOOLS"
    
    sudo apt install -y nginx certbot python3-certbot-nginx
    
    print_status "Nginx installed"
    print_status "Certbot installed"
}

# Install PostgreSQL
install_postgresql() {
    print_header "INSTALLING POSTGRESQL"
    
    # Install PostgreSQL
    sudo apt install -y postgresql postgresql-contrib postgresql-client
    
    # Start and enable PostgreSQL
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    # Generate secure password
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    # Create database and user
    sudo -u postgres psql << EOF
CREATE DATABASE analytics_dashboard;
CREATE USER analytics_user WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE analytics_dashboard TO analytics_user;
ALTER USER analytics_user CREATEDB;
ALTER USER analytics_user WITH SUPERUSER;
\c analytics_dashboard
GRANT ALL ON SCHEMA public TO analytics_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO analytics_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO analytics_user;
\q
EOF

    print_status "PostgreSQL installed and configured"
    print_info "Database: analytics_dashboard"
    print_info "Username: analytics_user"
    print_info "Password: $DB_PASSWORD"
}

# Clone and setup application
setup_application() {
    print_header "SETTING UP APPLICATION"
    
    # Create web directory
    sudo mkdir -p /var/www
    cd /var/www
    
    # Clone repository
    if [ -d "analytics-dashboard" ]; then
        print_info "Updating existing repository..."
        cd analytics-dashboard
        git pull origin main
    else
        print_info "Cloning repository..."
        sudo git clone $REPO_URL analytics-dashboard
    fi
    
    sudo chown -R $USER:$USER analytics-dashboard
    cd analytics-dashboard
    
    # Build frontend
    print_info "Building frontend..."
    cd src/frontend
    npm install
    npm run build
    
    # Copy build to backend
    cd ../..
    rm -rf src/backend/public
    mkdir -p src/backend/public
    cp -r src/frontend/build/* src/backend/public/
    
    # Install backend dependencies
    print_info "Installing backend dependencies..."
    cd src/backend
    npm install
    
    print_status "Application setup completed"
}

# Configure environment
configure_environment() {
    print_header "CONFIGURING ENVIRONMENT"
    
    cd /var/www/analytics-dashboard/src/backend
    
    # Create .env file
    cat > .env << EOF
# Production Environment
NODE_ENV=production
PORT=8080

# Database Configuration
DATABASE_URL=postgresql://analytics_user:$DB_PASSWORD@localhost:5432/analytics_dashboard

# JWT Configuration
JWT_SECRET=$JWT_SECRET

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=dgf5874nz
CLOUDINARY_API_KEY=873245158622578
CLOUDINARY_API_SECRET=3DF8o9ZZD-WIzuSKfS6kFQoVzp4

# CORS Configuration
CORS_ORIGIN=https://$DOMAIN

# Security
HELMET_ENABLED=true
EOF

    print_status "Environment configured"
}

# Initialize database
initialize_database() {
    print_header "INITIALIZING DATABASE"
    
    cd /var/www/analytics-dashboard/src/backend
    
    # Run database creation script
    node create-database.js
    
    print_status "Database initialized with default users"
}

# Configure Nginx
configure_nginx() {
    print_header "CONFIGURING NGINX"
    
    # Create Nginx configuration
    sudo tee /etc/nginx/sites-available/analytics-dashboard > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # File upload limit
    client_max_body_size 50M;
    
    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Proxy to Node.js application
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
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

    # Enable site
    sudo ln -sf /etc/nginx/sites-available/analytics-dashboard /etc/nginx/sites-enabled/
    
    # Test configuration
    sudo nginx -t
    
    # Restart Nginx
    sudo systemctl restart nginx
    
    print_status "Nginx configured and restarted"
}

# Start application
start_application() {
    print_header "STARTING APPLICATION"
    
    cd /var/www/analytics-dashboard/src/backend
    
    # Stop existing PM2 process if any
    pm2 delete analytics-dashboard 2>/dev/null || true
    
    # Start application
    pm2 start server.js --name analytics-dashboard
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 startup
    pm2 startup
    
    print_status "Application started with PM2"
    print_warning "Please run the PM2 startup command shown above"
}

# Configure firewall
configure_firewall() {
    print_header "CONFIGURING FIREWALL"
    
    # Configure UFW
    sudo ufw allow 22      # SSH
    sudo ufw allow 80      # HTTP
    sudo ufw allow 443     # HTTPS
    sudo ufw --force enable
    
    print_status "Firewall configured"
}

# Setup SSL
setup_ssl() {
    print_header "SETTING UP SSL CERTIFICATE"
    
    print_warning "Make sure your domain DNS is pointing to this server"
    read -p "Press Enter when DNS is configured and propagated..."
    
    # Install SSL certificate
    sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
    
    # Test automatic renewal
    sudo certbot renew --dry-run
    
    print_status "SSL certificate installed and configured"
}

# Setup monitoring and backups
setup_monitoring() {
    print_header "SETTING UP MONITORING & BACKUPS"
    
    # Create backup directories
    mkdir -p /home/backups/{postgresql,application,nginx}
    
    # Create PostgreSQL backup script
    cat > /home/backup-postgresql.sh << EOF
#!/bin/bash
BACKUP_DIR="/home/backups/postgresql"
DATE=\$(date +%Y%m%d-%H%M%S)
PGPASSWORD="$DB_PASSWORD" pg_dump -h localhost -U analytics_user analytics_dashboard > \$BACKUP_DIR/analytics_dashboard-\$DATE.sql
gzip \$BACKUP_DIR/analytics_dashboard-\$DATE.sql
ls -t \$BACKUP_DIR/analytics_dashboard-*.sql.gz | tail -n +31 | xargs rm -f
echo "PostgreSQL backup completed: \$DATE"
EOF

    # Create application backup script
    cat > /home/backup-application.sh << EOF
#!/bin/bash
BACKUP_DIR="/home/backups/application"
DATE=\$(date +%Y%m%d-%H%M%S)
tar -czf \$BACKUP_DIR/app-\$DATE.tar.gz /var/www/analytics-dashboard --exclude=node_modules --exclude=.git
cp /var/www/analytics-dashboard/src/backend/.env \$BACKUP_DIR/env-\$DATE
ls -t \$BACKUP_DIR/app-*.tar.gz | tail -n +31 | xargs rm -f
echo "Application backup completed: \$DATE"
EOF

    # Create monitoring script
    cat > /home/monitor-app.sh << EOF
#!/bin/bash
echo "🔍 Analytics Dashboard Health Check - \$(date)"
echo "=============================================="

# Check PM2 status
pm2 status analytics-dashboard

# Check application health
curl -s http://localhost:8080/api/health || echo "❌ Health check failed"

# Check database connection
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U analytics_user -d analytics_dashboard -c "SELECT 'Database OK' as status;" > /dev/null 2>&1
if [ \$? -eq 0 ]; then
    echo "✅ Database connection OK"
else
    echo "❌ Database connection failed"
fi

# Check disk space
df -h / | tail -1

echo "Health check completed"
echo ""
EOF

    # Make scripts executable
    chmod +x /home/backup-postgresql.sh
    chmod +x /home/backup-application.sh
    chmod +x /home/monitor-app.sh
    
    # Setup cron jobs
    (crontab -l 2>/dev/null; echo "0 2 * * * /home/backup-postgresql.sh") | crontab -
    (crontab -l 2>/dev/null; echo "0 3 * * * /home/backup-application.sh") | crontab -
    (crontab -l 2>/dev/null; echo "*/30 * * * * /home/monitor-app.sh >> /var/log/health-check.log 2>&1") | crontab -
    (crontab -l 2>/dev/null; echo "0 12,0 * * * /usr/bin/certbot renew --quiet") | crontab -
    
    print_status "Monitoring and backup scripts configured"
}

# Create update script
create_update_script() {
    print_header "CREATING UPDATE SCRIPT"
    
    cat > /home/update-app.sh << EOF
#!/bin/bash
echo "🔄 Updating Analytics Dashboard..."

cd /var/www/analytics-dashboard
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
    
    print_status "Update script created at /home/update-app.sh"
}

# Final verification
final_verification() {
    print_header "FINAL VERIFICATION"
    
    # Wait for application to start
    sleep 10
    
    # Check PM2 status
    pm2 status analytics-dashboard
    
    # Test local connection
    if curl -s http://localhost:8080/api/health > /dev/null; then
        print_status "Local application health check passed"
    else
        print_error "Local application health check failed"
    fi
    
    # Test database
    cd /var/www/analytics-dashboard/src/backend
    if node verify-database.js > /dev/null 2>&1; then
        print_status "Database verification passed"
    else
        print_error "Database verification failed"
    fi
    
    print_status "Verification completed"
}

# Display summary
display_summary() {
    print_header "DEPLOYMENT COMPLETED SUCCESSFULLY!"
    
    echo ""
    echo "🎉 Your Analytics Dashboard is now live!"
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
    echo "- Host: localhost"
    echo "- Database: analytics_dashboard"
    echo "- Username: analytics_user"
    echo "- Password: $DB_PASSWORD"
    echo ""
    echo "🔧 Management Commands:"
    echo "- View logs: pm2 logs analytics-dashboard"
    echo "- Restart app: pm2 restart analytics-dashboard"
    echo "- Update app: /home/update-app.sh"
    echo "- Monitor health: /home/monitor-app.sh"
    echo "- Backup database: /home/backup-postgresql.sh"
    echo ""
    echo "📁 Important Files:"
    echo "- Application: /var/www/analytics-dashboard"
    echo "- Environment: /var/www/analytics-dashboard/src/backend/.env"
    echo "- Nginx Config: /etc/nginx/sites-available/analytics-dashboard"
    echo "- Backups: /home/backups/"
    echo ""
    print_warning "IMPORTANT: Save the database password securely!"
    print_warning "Change admin passwords after first login!"
    echo ""
    print_status "Deployment completed successfully! 🚀"
}

# Main deployment function
main() {
    clear
    print_header "HOSTINGER VPS COMPLETE DEPLOYMENT"
    echo "This script will deploy your Analytics Dashboard with:"
    echo "✅ PostgreSQL Database (local)"
    echo "✅ Node.js Application (PM2)"
    echo "✅ Nginx Reverse Proxy"
    echo "✅ SSL Certificate (Let's Encrypt)"
    echo "✅ Automatic Backups"
    echo "✅ Health Monitoring"
    echo ""
    
    get_configuration
    check_prerequisites
    update_system
    install_nodejs
    install_nginx
    install_postgresql
    setup_application
    configure_environment
    initialize_database
    configure_nginx
    start_application
    configure_firewall
    setup_ssl
    setup_monitoring
    create_update_script
    final_verification
    display_summary
}

# Run main function
main "$@"