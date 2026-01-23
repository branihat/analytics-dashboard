# Hostinger Deployment Checklist

## Pre-Deployment Preparation

### ✅ 1. Hostinger VPS Setup
- [ ] Purchase Hostinger VPS (minimum 2GB RAM recommended)
- [ ] Choose Ubuntu 20.04/22.04 LTS
- [ ] Note down VPS IP address
- [ ] Setup SSH access

### ✅ 2. Domain Configuration
- [ ] Point domain A records to VPS IP:
  - `@` → VPS IP
  - `www` → VPS IP
- [ ] Wait for DNS propagation (check with `nslookup yourdomain.com`)

### ✅ 3. Database Decision
Choose your database approach:

**Option A: Hybrid (Recommended)**
- [ ] Keep Railway PostgreSQL for users/ATR
- [ ] Use SQLite locally for violations
- [ ] ✅ No additional costs
- [ ] ✅ Automatic PostgreSQL backups

**Option B: Full PostgreSQL**
- [ ] Get Hostinger PostgreSQL addon or external service
- [ ] Run migration script: `node migrate-to-full-postgresql.js`
- [ ] Update code to use PostgreSQL for all tables

## Deployment Steps

### ✅ 1. VPS Initial Setup
```bash
# Connect to your VPS
ssh root@your-vps-ip

# Create non-root user (recommended)
adduser deploy
usermod -aG sudo deploy
su - deploy
```

### ✅ 2. Run Deployment Script
```bash
# Download and run the deployment script
wget https://raw.githubusercontent.com/yourusername/analytics-dashboard/main/deploy-to-hostinger.sh
chmod +x deploy-to-hostinger.sh

# Edit the script to update:
nano deploy-to-hostinger.sh
# - REPO_URL: Your GitHub repository URL
# - DOMAIN: Your actual domain name

# Run deployment
./deploy-to-hostinger.sh
```

### ✅ 3. Manual Configuration Steps

**Update Environment Variables:**
```bash
cd /var/www/analytics-dashboard/src/backend
nano .env
```

Required changes:
- [ ] `JWT_SECRET`: Change to a strong, unique secret
- [ ] `CORS_ORIGIN`: Set to your domain (https://yourdomain.com)
- [ ] `DATABASE_URL`: Verify PostgreSQL connection string
- [ ] Cloudinary credentials (if using file uploads)

**Initialize Database:**
```bash
cd /var/www/analytics-dashboard/src/backend
node create-database.js
```

**Start Application:**
```bash
pm2 start server.js --name analytics-dashboard
pm2 save
pm2 startup
# Run the command PM2 provides
```

### ✅ 4. Web Server Configuration

**Nginx Setup:**
```bash
sudo nano /etc/nginx/sites-available/analytics-dashboard
```

**SSL Certificate:**
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### ✅ 5. Security Configuration

**Firewall:**
```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

**File Permissions:**
```bash
sudo chown -R deploy:deploy /var/www/analytics-dashboard
chmod 755 /var/www/analytics-dashboard
```

## Post-Deployment Verification

### ✅ 1. Application Health Checks
- [ ] Frontend loads: `https://yourdomain.com`
- [ ] API responds: `https://yourdomain.com/api/health`
- [ ] Database connection: `cd /var/www/analytics-dashboard/src/backend && node verify-database.js`

### ✅ 2. Login Testing
Test with default credentials:
- [ ] Admin login: `admin1@ccl.com` / `Aerovania_grhns@2002`
- [ ] Department user: `et@ccl.com` / `deptet123`

### ✅ 3. Functionality Testing
- [ ] User authentication works
- [ ] File uploads work (if using Cloudinary)
- [ ] Data visualization loads
- [ ] Map functionality works
- [ ] Reports generation works

### ✅ 4. Performance Testing
- [ ] Page load times acceptable
- [ ] Database queries respond quickly
- [ ] File uploads complete successfully

## Backup and Monitoring Setup

### ✅ 1. Automated Backups
```bash
# SQLite backup (if using hybrid approach)
crontab -e
# Add: 0 2 * * * /home/backup-sqlite.sh

# PostgreSQL backup (if using Railway)
# Railway handles this automatically
```

### ✅ 2. Monitoring Setup
```bash
# Application monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30

# System monitoring
sudo apt install htop
```

### ✅ 3. Log Management
```bash
# View application logs
pm2 logs analytics-dashboard

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Maintenance Procedures

### ✅ 1. Application Updates
```bash
# Use the update script
/home/update-app.sh

# Or manually:
cd /var/www/analytics-dashboard
git pull origin main
cd src/frontend && npm run build
cp -r build/* ../backend/public/
cd ../backend && npm install
pm2 restart analytics-dashboard
```

### ✅ 2. Database Maintenance
```bash
# Check database health
cd /var/www/analytics-dashboard/src/backend
node monitor-db.js

# Backup SQLite manually
/home/backup-sqlite.sh
```

### ✅ 3. SSL Certificate Renewal
```bash
# Test renewal (certificates auto-renew)
sudo certbot renew --dry-run
```

## Troubleshooting Guide

### ❌ Common Issues

**1. Application Won't Start**
```bash
pm2 logs analytics-dashboard
# Check for:
# - Database connection errors
# - Missing environment variables
# - Port conflicts
```

**2. 502 Bad Gateway**
```bash
# Check if app is running
pm2 status
curl http://localhost:8080/api/health

# Check Nginx configuration
sudo nginx -t
sudo systemctl restart nginx
```

**3. Database Connection Failed**
```bash
# Test PostgreSQL connection
node -e "const {Pool} = require('pg'); const pool = new Pool({connectionString: process.env.DATABASE_URL}); pool.query('SELECT NOW()').then(r => console.log('✅ Connected')).catch(e => console.error('❌ Error:', e.message)).finally(() => pool.end());"

# Check SQLite permissions
ls -la /var/www/analytics-dashboard/src/backend/data/
```

**4. SSL Certificate Issues**
```bash
# Check certificate status
sudo certbot certificates

# Renew if needed
sudo certbot renew
```

## Security Checklist

### ✅ 1. Application Security
- [ ] JWT_SECRET is strong and unique
- [ ] CORS is configured for your domain only
- [ ] File upload limits are set
- [ ] Input validation is working

### ✅ 2. Server Security
- [ ] SSH key authentication (disable password auth)
- [ ] Firewall is configured and enabled
- [ ] Regular security updates scheduled
- [ ] Non-root user for application

### ✅ 3. Database Security
- [ ] Database credentials are secure
- [ ] PostgreSQL uses SSL in production
- [ ] Regular backups are working
- [ ] Access is restricted to application only

## Performance Optimization

### ✅ 1. Application Performance
- [ ] Enable gzip compression in Nginx
- [ ] Set up proper caching headers
- [ ] Optimize database queries
- [ ] Monitor memory usage

### ✅ 2. Database Performance
- [ ] PostgreSQL connection pooling configured
- [ ] SQLite database is optimized
- [ ] Regular VACUUM operations for SQLite
- [ ] Monitor query performance

## Final Verification

### ✅ All Systems Check
- [ ] ✅ Application is accessible via HTTPS
- [ ] ✅ All login credentials work
- [ ] ✅ Database operations are functional
- [ ] ✅ File uploads work (if applicable)
- [ ] ✅ Backups are configured
- [ ] ✅ Monitoring is in place
- [ ] ✅ SSL certificate is valid
- [ ] ✅ Performance is acceptable

## Support Information

**Important Paths:**
- Application: `/var/www/analytics-dashboard`
- Environment: `/var/www/analytics-dashboard/src/backend/.env`
- SQLite DB: `/var/www/analytics-dashboard/src/backend/data/violations.db`
- Nginx Config: `/etc/nginx/sites-available/analytics-dashboard`
- Logs: `pm2 logs analytics-dashboard`

**Management Commands:**
- Restart app: `pm2 restart analytics-dashboard`
- Update app: `/home/update-app.sh`
- Backup SQLite: `/home/backup-sqlite.sh`
- Check health: `curl https://yourdomain.com/api/health`

**Default Login:**
- Admin: `admin1@ccl.com` / `Aerovania_grhns@2002`
- Change passwords after first login!

---

🎉 **Congratulations!** Your Analytics Dashboard is now successfully deployed on Hostinger!