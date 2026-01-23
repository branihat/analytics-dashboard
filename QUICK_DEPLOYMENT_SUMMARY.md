# 🚀 Quick Deployment Summary

## One-Command Deployment

For the fastest deployment, use the automated script:

```bash
# SSH into your Hostinger VPS
ssh your-username@your-vps-ip

# Download and run complete deployment script
wget https://raw.githubusercontent.com/yourusername/analytics-dashboard/main/deploy-complete.sh
chmod +x deploy-complete.sh
./deploy-complete.sh
```

**What this script does:**
- ✅ Installs all dependencies (Node.js, PostgreSQL, Nginx)
- ✅ Clones and builds your application
- ✅ Configures database with secure credentials
- ✅ Sets up SSL certificate
- ✅ Configures automatic backups
- ✅ Sets up monitoring and health checks
- ✅ Starts your application with PM2

## Manual Step-by-Step

If you prefer manual control, follow these steps:

### 1. Prepare VPS
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install other dependencies
sudo apt install -y nginx postgresql postgresql-contrib certbot python3-certbot-nginx
sudo npm install -g pm2
```

### 2. Setup Database
```bash
# Run PostgreSQL setup
./hostinger-postgresql-setup.sh

# Initialize application database
cd /var/www/analytics-dashboard/src/backend
node setup-hostinger-database.js
```

### 3. Deploy Application
```bash
# Clone repository
cd /var/www
git clone your-repo-url analytics-dashboard

# Build frontend
cd analytics-dashboard/src/frontend
npm install && npm run build
cp -r build/* ../backend/public/

# Install backend
cd ../backend
npm install

# Configure environment
nano .env  # Add your configuration

# Start with PM2
pm2 start server.js --name analytics-dashboard
pm2 save && pm2 startup
```

### 4. Configure Web Server
```bash
# Setup Nginx
sudo nano /etc/nginx/sites-available/analytics-dashboard
sudo ln -s /etc/nginx/sites-available/analytics-dashboard /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx

# Setup SSL
sudo certbot --nginx -d yourdomain.com
```

## 🎯 What You Get

After deployment:
- **🌐 Live Application:** https://yourdomain.com
- **🔒 SSL Certificate:** Automatic HTTPS
- **🗄️ PostgreSQL Database:** Local, secure, fast
- **📊 Process Management:** PM2 with auto-restart
- **🔄 Automatic Backups:** Daily database and file backups
- **📈 Health Monitoring:** Automated health checks
- **🔧 Management Scripts:** Easy update and maintenance

## 🔐 Default Credentials

**Admin Login:**
- Email: `admin1@ccl.com`
- Password: `Aerovania_grhns@2002`

**Department Users:**
- E&T: `et@ccl.com` / `deptet123`
- Security: `security@ccl.com` / `deptsecurity123`
- Operation: `operation@ccl.com` / `deptoperation123`
- Survey: `survey@ccl.com` / `deptsurvey123`
- Safety: `safety@ccl.com` / `deptsafety123`

## 🔧 Management Commands

```bash
# Application Management
pm2 status                    # Check app status
pm2 logs analytics-dashboard  # View logs
pm2 restart analytics-dashboard # Restart app

# Database Management
/home/monitor-postgresql.sh   # Check database health
/home/backup-postgresql.sh    # Manual backup

# System Management
/home/monitor-app.sh          # Full health check
/home/update-app.sh           # Update application
sudo systemctl restart nginx # Restart web server
```

## 📋 File Locations

- **Application:** `/var/www/analytics-dashboard`
- **Environment:** `/var/www/analytics-dashboard/src/backend/.env`
- **Nginx Config:** `/etc/nginx/sites-available/analytics-dashboard`
- **Database Config:** `/home/postgresql-config.txt`
- **Backups:** `/home/backups/`
- **Scripts:** `/home/*.sh`

## 🆘 Quick Troubleshooting

**App won't start:**
```bash
pm2 logs analytics-dashboard
pm2 restart analytics-dashboard
```

**Database issues:**
```bash
/home/monitor-postgresql.sh
sudo systemctl restart postgresql
```

**SSL problems:**
```bash
sudo certbot renew
sudo systemctl restart nginx
```

**502 Bad Gateway:**
```bash
pm2 status
sudo nginx -t
sudo systemctl restart nginx
```

## 🎉 Success!

Your Analytics Dashboard is now:
- ✅ **Live and secure** with HTTPS
- ✅ **Automatically backed up** daily
- ✅ **Monitored** for health issues
- ✅ **Production-ready** with proper security
- ✅ **Easy to manage** with provided scripts

Visit https://yourdomain.com and start using your application!