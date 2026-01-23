# 🚀 Hostinger VPS Final Deployment Guide

## Complete Analytics Dashboard Deployment

This is the **complete, step-by-step guide** to deploy your Analytics Dashboard on Hostinger VPS with PostgreSQL database. Follow this guide from start to finish for a production-ready deployment.

---

## 📋 Prerequisites

### 1. Hostinger VPS Requirements
- ✅ **VPS Plan:** Minimum 2GB RAM, 2 CPU cores
- ✅ **OS:** Ubuntu 20.04/22.04 LTS (recommended)
- ✅ **Storage:** At least 20GB available space
- ✅ **Network:** Public IP address assigned

### 2. Domain Setup
- ✅ **Domain name** pointed to your VPS IP
- ✅ **DNS records** configured:
  - `A` record: `@` → Your VPS IP
  - `A` record: `www` → Your VPS IP

### 3. Local Preparation
- ✅ **Git repository** with your code
- ✅ **SSH access** to your VPS
- ✅ **Domain DNS** propagated (check with `nslookup yourdomain.com`)

---

## 🎯 Deployment Overview

This deployment will create:
- ✅ **PostgreSQL database** (local on VPS)
- ✅ **Node.js application** (backend + frontend)
- ✅ **Nginx reverse proxy** (web server)
- ✅ **SSL certificate** (HTTPS)
- ✅ **PM2 process manager** (app management)
- ✅ **Automatic backups** (database + files)
- ✅ **Monitoring tools** (health checks)

---

## 🚀 Step-by-Step Deployment

### Step 1: Initial VPS Setup

**Connect to your VPS:**
```bash
ssh root@your-vps-ip
```

**Create deployment user:**
```bash
# Create non-root user
adduser deploy
usermod -aG sudo deploy

# Switch to deploy user
su - deploy
```

**Update system:**
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip
```

### Step 2: Install Node.js and Dependencies

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx and SSL tools
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Step 3: Install and Configure PostgreSQL

**Download and run PostgreSQL setup:**
```bash
# Download PostgreSQL installation script
wget https://raw.githubusercontent.com/yourusername/analytics-dashboard/main/hostinger-postgresql-setup.sh
chmod +x hostinger-postgresql-setup.sh

# Run installation (this will take a few minutes)
./hostinger-postgresql-setup.sh
```

**Save the database credentials** that are displayed at the end of installation.

### Step 4: Clone and Setup Application

**Clone your repository:**
```bash
# Navigate to web directory
cd /var/www

# Clone your repository (replace with your actual repo URL)
sudo git clone https://github.com/yourusername/analytics-dashboard.git
sudo chown -R deploy:deploy analytics-dashboard
cd analytics-dashboard
```

**Build frontend:**
```bash
cd src/frontend
npm install
npm run build

# Copy build to backend public folder
cd ../..
rm -rf src/backend/public
mkdir -p src/backend/public
cp -r src/frontend/build/* src/backend/public/
```

**Install backend dependencies:**
```bash
cd src/backend
npm install
```

### Step 5: Configure Environment

**Create production environment file:**
```bash
cd /var/www/analytics-dashboard/src/backend
nano .env
```

**Add this configuration (update the values):**
```env
# Production Environment
NODE_ENV=production
PORT=8080

# Database Configuration (use the credentials from PostgreSQL setup)
DATABASE_URL=postgresql://analytics_user:YOUR_DB_PASSWORD@localhost:5432/analytics_dashboard

# JWT Configuration (CHANGE THIS!)
JWT_SECRET=your-super-secure-production-jwt-secret-change-this-now

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=dgf5874nz
CLOUDINARY_API_KEY=873245158622578
CLOUDINARY_API_SECRET=3DF8o9ZZD-WIzuSKfS6kFQoVzp4

# CORS Configuration (replace with your domain)
CORS_ORIGIN=https://yourdomain.com

# Security
HELMET_ENABLED=true
```

**Save and exit** (Ctrl+X, Y, Enter)

### Step 6: Initialize Application Database

```bash
# Setup application database tables and users
node setup-hostinger-database.js
```

Follow the prompts:
- Choose "Use default connection settings" (y)
- Enter your PostgreSQL password from Step 3

### Step 7: Configure Nginx

**Create Nginx configuration:**
```bash
sudo nano /etc/nginx/sites-available/analytics-dashboard
```

**Add this configuration (replace yourdomain.com):**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # File upload limit
    client_max_body_size 50M;
    
    # Proxy to Node.js application
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
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Enable the site:**
```bash
sudo ln -s /etc/nginx/sites-available/analytics-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 8: Start Application with PM2

```bash
cd /var/www/analytics-dashboard/src/backend

# Start application
pm2 start server.js --name analytics-dashboard

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

**Run the command that PM2 provides** (it will be something like `sudo env PATH=...`)

### Step 9: Configure Firewall

```bash
# Configure UFW firewall
sudo ufw allow 22      # SSH
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
sudo ufw --force enable

# Verify firewall status
sudo ufw status
```

### Step 10: Setup SSL Certificate

```bash
# Install SSL certificate with Let's Encrypt
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

### Step 11: Setup Monitoring and Backups

**Create application monitoring script:**
```bash
nano /home/monitor-app.sh
```

```bash
#!/bin/bash
echo "🔍 Analytics Dashboard Health Check"
echo "=================================="

# Check PM2 status
echo "📊 PM2 Status:"
pm2 status analytics-dashboard

# Check application health
echo "🌐 Application Health:"
curl -s http://localhost:8080/api/health || echo "❌ Health check failed"

# Check database
echo "🗄️ Database Status:"
/home/monitor-postgresql.sh

# Check disk space
echo "💾 Disk Usage:"
df -h / | tail -1

# Check memory usage
echo "🧠 Memory Usage:"
free -h

echo "✅ Health check completed"
```

```bash
chmod +x /home/monitor-app.sh
```

**Create comprehensive backup script:**
```bash
nano /home/backup-all.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/backups"
DATE=$(date +%Y%m%d-%H%M%S)

echo "🔄 Starting comprehensive backup..."

# Create backup directories
mkdir -p $BACKUP_DIR/postgresql
mkdir -p $BACKUP_DIR/application
mkdir -p $BACKUP_DIR/nginx

# Backup PostgreSQL database
echo "📊 Backing up PostgreSQL..."
/home/backup-postgresql.sh

# Backup application files
echo "📁 Backing up application..."
tar -czf $BACKUP_DIR/application/app-$DATE.tar.gz /var/www/analytics-dashboard --exclude=node_modules --exclude=.git

# Backup Nginx configuration
echo "🌐 Backing up Nginx config..."
sudo cp /etc/nginx/sites-available/analytics-dashboard $BACKUP_DIR/nginx/nginx-config-$DATE

# Backup environment file
cp /var/www/analytics-dashboard/src/backend/.env $BACKUP_DIR/application/env-$DATE

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "*" -mtime +30 -delete

echo "✅ Backup completed: $DATE"
```

```bash
chmod +x /home/backup-all.sh
```

**Schedule automated tasks:**
```bash
crontab -e
```

Add these lines:
```bash
# Daily backup at 2 AM
0 2 * * * /home/backup-all.sh

# Health check every 30 minutes
*/30 * * * * /home/monitor-app.sh >> /var/log/health-check.log 2>&1

# SSL certificate renewal check (twice daily)
0 12,0 * * * /usr/bin/certbot renew --quiet
```

### Step 12: Final Verification

**Test application:**
```bash
# Check PM2 status
pm2 status

# Check application logs
pm2 logs analytics-dashboard --lines 20

# Test local connection
curl -i http://localhost:8080/api/health

# Test external connection (replace with your domain)
curl -i https://yourdomain.com/api/health
```

**Verify database:**
```bash
cd /var/www/analytics-dashboard/src/backend
node verify-database.js
```

---

## 🎉 Deployment Complete!

### 📋 Your Application is Now Live

- **Frontend:** https://yourdomain.com
- **API:** https://yourdomain.com/api
- **Health Check:** https://yourdomain.com/api/health

### 🔐 Default Login Credentials

**Admin Accounts:**
- Email: `admin1@ccl.com`
- Password: `Aerovania_grhns@2002`

**Department Users:**
- E&T: `et@ccl.com` / `deptet123`
- Security: `security@ccl.com` / `deptsecurity123`
- Operation: `operation@ccl.com` / `deptoperation123`
- Survey: `survey@ccl.com` / `deptsurvey123`
- Safety: `safety@ccl.com` / `deptsafety123`

---

## 🔧 Management Commands

### Application Management
```bash
# View application status
pm2 status

# View application logs
pm2 logs analytics-dashboard

# Restart application
pm2 restart analytics-dashboard

# Stop application
pm2 stop analytics-dashboard
```

### Database Management
```bash
# Monitor database
/home/monitor-postgresql.sh

# Backup database
/home/backup-postgresql.sh

# Connect to database
PGPASSWORD='your_password' psql -h localhost -U analytics_user -d analytics_dashboard
```

### System Management
```bash
# Check overall health
/home/monitor-app.sh

# Create full backup
/home/backup-all.sh

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

---

## 🔄 Application Updates

**To update your application:**
```bash
# Navigate to application directory
cd /var/www/analytics-dashboard

# Pull latest changes
git pull origin main

# Rebuild frontend
cd src/frontend
npm install
npm run build
cp -r build/* ../backend/public/

# Update backend dependencies
cd ../backend
npm install

# Restart application
pm2 restart analytics-dashboard

echo "✅ Application updated successfully"
```

**Create update script:**
```bash
nano /home/update-app.sh
```

```bash
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
```

```bash
chmod +x /home/update-app.sh
```

---

## 🆘 Troubleshooting

### Common Issues and Solutions

**1. Application Won't Start**
```bash
# Check PM2 logs
pm2 logs analytics-dashboard

# Check if port is in use
sudo netstat -tlnp | grep 8080

# Restart application
pm2 restart analytics-dashboard
```

**2. Database Connection Issues**
```bash
# Test database connection
/home/monitor-postgresql.sh

# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

**3. Nginx 502 Bad Gateway**
```bash
# Check if application is running
pm2 status

# Check Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

**4. SSL Certificate Issues**
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Restart Nginx after renewal
sudo systemctl restart nginx
```

**5. High Memory Usage**
```bash
# Check memory usage
free -h
pm2 monit

# Restart application if needed
pm2 restart analytics-dashboard
```

---

## 📊 Performance Optimization

### 1. Database Optimization
```bash
# Connect to PostgreSQL
PGPASSWORD='your_password' psql -h localhost -U analytics_user -d analytics_dashboard

# Run maintenance
VACUUM ANALYZE;
REINDEX DATABASE analytics_dashboard;
```

### 2. Application Optimization
```bash
# Enable PM2 monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### 3. Nginx Optimization
Add to your Nginx config:
```nginx
# Enable gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
```

---

## 🔒 Security Best Practices

### 1. Change Default Passwords
- ✅ Change JWT_SECRET in .env
- ✅ Change admin passwords after first login
- ✅ Use strong database passwords

### 2. Regular Updates
```bash
# System updates
sudo apt update && sudo apt upgrade -y

# Application updates
/home/update-app.sh

# Security patches
sudo unattended-upgrades
```

### 3. Monitor Logs
```bash
# Check for suspicious activity
sudo tail -f /var/log/auth.log
sudo tail -f /var/log/nginx/access.log
```

---

## 📞 Support and Maintenance

### Important File Locations
- **Application:** `/var/www/analytics-dashboard`
- **Environment:** `/var/www/analytics-dashboard/src/backend/.env`
- **Database Config:** `/home/postgresql-config.txt`
- **Nginx Config:** `/etc/nginx/sites-available/analytics-dashboard`
- **Backups:** `/home/backups/`
- **Logs:** `/var/log/` and `pm2 logs`

### Regular Maintenance Tasks
- ✅ **Daily:** Automated backups (2 AM)
- ✅ **Weekly:** Check application health
- ✅ **Monthly:** System updates
- ✅ **Quarterly:** Review security settings

### Emergency Contacts
- **Hostinger Support:** Available 24/7
- **Application Logs:** `pm2 logs analytics-dashboard`
- **System Logs:** `/var/log/syslog`

---

## 🎯 Success Checklist

After deployment, verify:
- ✅ Application loads at https://yourdomain.com
- ✅ Admin login works
- ✅ Database operations work
- ✅ File uploads work (if applicable)
- ✅ SSL certificate is valid
- ✅ Backups are scheduled
- ✅ Monitoring is active
- ✅ All services start on boot

**🎉 Congratulations! Your Analytics Dashboard is now live on Hostinger VPS with a complete production setup!**