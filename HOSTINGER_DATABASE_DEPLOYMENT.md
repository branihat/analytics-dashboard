# Hostinger Database Deployment Guide

## Overview

This guide covers deploying your Analytics Dashboard to Hostinger VPS with proper database integration. Your application uses a hybrid database approach that works perfectly for production deployment.

## 🗄️ Database Architecture for Production

### Current Setup (Recommended)
- **PostgreSQL (Railway)**: User accounts, ATR documents, inferred reports
- **SQLite (Local)**: Violations, reports, features, sites

### Why This Works Well for Hostinger:
1. **PostgreSQL on Railway**: Persistent, managed, accessible from anywhere
2. **SQLite on VPS**: Fast local access for violation data
3. **No additional database costs** on Hostinger
4. **Automatic backups** via Railway for critical user data

## 🚀 Deployment Options

### Option 1: Keep Current Database Setup (Recommended)

**Advantages:**
- ✅ No changes needed to your code
- ✅ Railway PostgreSQL is managed and reliable
- ✅ SQLite provides fast local access for violations
- ✅ Cost-effective (no additional database hosting)
- ✅ Automatic PostgreSQL backups via Railway

**Steps:**
1. Deploy to Hostinger VPS using existing configuration
2. Ensure Railway PostgreSQL remains accessible
3. SQLite file will be created locally on VPS

### Option 2: Full PostgreSQL Migration

**If you prefer everything in PostgreSQL:**
- Use Hostinger's PostgreSQL addon or external service
- Requires code modifications to move SQLite tables to PostgreSQL
- Higher cost but unified database

## 📋 Step-by-Step Deployment (Option 1 - Recommended)

### 1. Prepare Your VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs git nginx certbot python3-certbot-nginx

# Install PM2 for process management
sudo npm install -g pm2
```

### 2. Clone and Setup Your Application

```bash
# Clone your repository
cd /var/www
sudo git clone <YOUR_REPO_URL> analytics-dashboard
sudo chown -R $USER:$USER analytics-dashboard
cd analytics-dashboard

# Build frontend
cd src/frontend
npm install
npm run build

# Copy build to backend public folder
cd ../..
rm -rf src/backend/public
mkdir -p src/backend/public
cp -r src/frontend/build/* src/backend/public/

# Install backend dependencies
cd src/backend
npm install
```

### 3. Configure Production Environment

Create production `.env` file:

```bash
cd /var/www/analytics-dashboard/src/backend
nano .env
```

**Production .env content:**
```env
# Production Environment
NODE_ENV=production
PORT=8080

# Database Configuration (Keep your existing Railway PostgreSQL)
DATABASE_URL=postgresql://postgres:yaVFUmPvjlfJJRDmjTHrUtyXnpvFMbaD@shinkansen.proxy.rlwy.net:45978/railway

# JWT Configuration (CHANGE THIS!)
JWT_SECRET=your-super-secure-production-jwt-secret-change-this

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=dgf5874nz
CLOUDINARY_API_KEY=873245158622578
CLOUDINARY_API_SECRET=3DF8o9ZZD-WIzuSKfS6kFQoVzp4

# CORS Configuration (replace with your domain)
CORS_ORIGIN=https://yourdomain.com

# Security
HELMET_ENABLED=true
```

### 4. Initialize Production Database

Run the database setup on your VPS:

```bash
cd /var/www/analytics-dashboard/src/backend
node create-database.js
```

This will:
- ✅ Connect to your existing Railway PostgreSQL
- ✅ Create SQLite database locally on VPS
- ✅ Set up all default users and data

### 5. Start Application with PM2

```bash
cd /var/www/analytics-dashboard/src/backend
pm2 start server.js --name analytics-dashboard
pm2 save
pm2 startup
```

Follow the PM2 startup command it provides.

### 6. Configure Nginx Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/analytics-dashboard
```

**Nginx configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
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
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/analytics-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. Setup SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 8. Configure Domain DNS

In your Hostinger control panel:
- **A Record**: `@` → Your VPS IP address
- **A Record**: `www` → Your VPS IP address

## 🔧 Database Management in Production

### Backup Strategy

**PostgreSQL (Railway):**
- ✅ Automatic backups by Railway
- ✅ Point-in-time recovery available
- ✅ No action needed

**SQLite (Local):**
```bash
# Create backup script
nano /home/backup-sqlite.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/backups/sqlite"
mkdir -p $BACKUP_DIR
cp /var/www/analytics-dashboard/src/backend/data/violations.db $BACKUP_DIR/violations-$(date +%Y%m%d-%H%M%S).db
# Keep only last 30 backups
ls -t $BACKUP_DIR/violations-*.db | tail -n +31 | xargs rm -f
```

```bash
chmod +x /home/backup-sqlite.sh
# Add to crontab for daily backups
crontab -e
# Add: 0 2 * * * /home/backup-sqlite.sh
```

### Database Monitoring

Create monitoring script:
```bash
nano /var/www/analytics-dashboard/src/backend/monitor-db.js
```

```javascript
const database = require('./utils/databaseHybrid');

async function checkDatabases() {
    try {
        // Check PostgreSQL
        const adminCount = await database.get('SELECT COUNT(*) as count FROM admin');
        console.log(`✅ PostgreSQL: ${adminCount.count} admins`);
        
        // Check SQLite
        const violationsCount = await database.get('SELECT COUNT(*) as count FROM violations');
        console.log(`✅ SQLite: ${violationsCount.count} violations`);
        
        console.log('✅ All databases healthy');
    } catch (error) {
        console.error('❌ Database check failed:', error.message);
        process.exit(1);
    }
}

checkDatabases();
```

## 🔒 Security Considerations

### 1. Environment Variables
- ✅ Change JWT_SECRET to a strong, unique value
- ✅ Restrict CORS_ORIGIN to your domain
- ✅ Keep database credentials secure

### 2. Firewall Configuration
```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### 3. Regular Updates
```bash
# Create update script
nano /home/update-app.sh
```

```bash
#!/bin/bash
cd /var/www/analytics-dashboard
git pull origin main
cd src/frontend
npm install
npm run build
cp -r build/* ../backend/public/
cd ../backend
npm install
pm2 restart analytics-dashboard
```

## 🚀 Alternative: Docker Deployment

If you prefer Docker:

```bash
# Build and run with Docker
cd /var/www/analytics-dashboard
docker build -t analytics-dashboard .

# Create data directories
mkdir -p ~/app-data/uploads ~/app-data/sqlite

# Run container
docker run -d --restart unless-stopped \
  --name analytics-dashboard \
  -p 8080:8080 \
  --env-file src/backend/.env \
  -v ~/app-data/uploads:/app/uploads \
  -v ~/app-data/sqlite:/app/data \
  analytics-dashboard
```

## 📊 Monitoring and Logs

### Application Logs
```bash
# PM2 logs
pm2 logs analytics-dashboard

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Health Checks
```bash
# Test application
curl -i http://localhost:8080/api/health

# Test database
cd /var/www/analytics-dashboard/src/backend
node monitor-db.js
```

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check Railway PostgreSQL connectivity
   cd /var/www/analytics-dashboard/src/backend
   node -e "const {Pool} = require('pg'); const pool = new Pool({connectionString: process.env.DATABASE_URL}); pool.query('SELECT NOW()').then(r => console.log('✅ Connected')).catch(e => console.error('❌ Error:', e.message)).finally(() => pool.end());"
   ```

2. **SQLite Permission Issues**
   ```bash
   sudo chown -R $USER:$USER /var/www/analytics-dashboard/src/backend/data/
   chmod 664 /var/www/analytics-dashboard/src/backend/data/violations.db
   ```

3. **PM2 Process Issues**
   ```bash
   pm2 restart analytics-dashboard
   pm2 logs analytics-dashboard --lines 50
   ```

## 📞 Support

Your deployment is now ready! The application will:
- ✅ Use Railway PostgreSQL for user accounts (persistent)
- ✅ Use local SQLite for violations (fast access)
- ✅ Serve the React frontend from the backend
- ✅ Handle file uploads via Cloudinary
- ✅ Provide secure authentication

**Login with:**
- Admin: `admin1@ccl.com` / `Aerovania_grhns@2002`
- Or any department user from the setup

Your database architecture is production-ready and cost-effective for Hostinger deployment!