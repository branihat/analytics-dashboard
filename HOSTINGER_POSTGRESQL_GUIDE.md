# Hostinger VPS PostgreSQL Setup Guide

## Overview

This guide will help you install and configure PostgreSQL directly on your Hostinger VPS. This approach gives you:

- ✅ **Full control** over your database
- ✅ **No additional costs** (included with VPS)
- ✅ **Better performance** (local database access)
- ✅ **Complete data ownership**
- ✅ **No external dependencies**

## 🚀 Quick Setup (Automated)

### Step 1: Install PostgreSQL on VPS

```bash
# SSH into your Hostinger VPS
ssh your-username@your-vps-ip

# Download and run the PostgreSQL installation script
wget https://raw.githubusercontent.com/yourusername/analytics-dashboard/main/hostinger-postgresql-setup.sh
chmod +x hostinger-postgresql-setup.sh
./hostinger-postgresql-setup.sh
```

This script will:
- ✅ Install PostgreSQL 14+ on Ubuntu
- ✅ Create database and user with secure password
- ✅ Configure access permissions
- ✅ Set up automatic backups
- ✅ Create monitoring scripts
- ✅ Configure security settings

### Step 2: Initialize Application Database

```bash
# Navigate to your application directory
cd /var/www/analytics-dashboard/src/backend

# Run the database setup script
node setup-hostinger-database.js
```

This will:
- ✅ Connect to your PostgreSQL database
- ✅ Create all required tables
- ✅ Set up default admin and user accounts
- ✅ Update your .env file automatically

## 📋 Manual Setup (Step by Step)

### 1. Install PostgreSQL

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib postgresql-client

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database
CREATE DATABASE analytics_dashboard;

# Create user with password
CREATE USER analytics_user WITH PASSWORD 'your_secure_password_here';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE analytics_dashboard TO analytics_user;
ALTER USER analytics_user CREATEDB;
ALTER USER analytics_user WITH SUPERUSER;

# Connect to database and grant schema privileges
\c analytics_dashboard
GRANT ALL ON SCHEMA public TO analytics_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO analytics_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO analytics_user;

# Exit
\q
```

### 3. Configure PostgreSQL Access

```bash
# Find PostgreSQL version
PG_VERSION=$(sudo -u postgres psql -t -c "SELECT version();" | grep -oP '\d+\.\d+' | head -1)

# Edit postgresql.conf
sudo nano /etc/postgresql/$PG_VERSION/main/postgresql.conf
# Uncomment and ensure: listen_addresses = 'localhost'

# Edit pg_hba.conf
sudo nano /etc/postgresql/$PG_VERSION/main/pg_hba.conf
# Add line: local   analytics_dashboard   analytics_user   md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 4. Test Connection

```bash
# Test database connection
PGPASSWORD='your_secure_password_here' psql -h localhost -U analytics_user -d analytics_dashboard -c "SELECT 'Connection successful!' as status;"
```

### 5. Update Application Configuration

```bash
# Edit your .env file
cd /var/www/analytics-dashboard/src/backend
nano .env
```

Add/update:
```env
DATABASE_URL=postgresql://analytics_user:your_secure_password_here@localhost:5432/analytics_dashboard
```

### 6. Initialize Application Database

```bash
# Run the database creation script
node create-database.js
```

## 🔧 Database Management

### Connection Information

After setup, your database details will be:
- **Host:** localhost
- **Port:** 5432
- **Database:** analytics_dashboard
- **Username:** analytics_user
- **Password:** (generated during setup)

### Management Scripts

The automated setup creates these helpful scripts:

**Monitor Database:**
```bash
/home/monitor-postgresql.sh
```

**Backup Database:**
```bash
/home/backup-postgresql.sh
```

**View Configuration:**
```bash
cat /home/postgresql-config.txt
```

### Manual Database Operations

**Connect to Database:**
```bash
PGPASSWORD='your_password' psql -h localhost -U analytics_user -d analytics_dashboard
```

**Create Manual Backup:**
```bash
PGPASSWORD='your_password' pg_dump -h localhost -U analytics_user analytics_dashboard > backup.sql
```

**Restore from Backup:**
```bash
PGPASSWORD='your_password' psql -h localhost -U analytics_user analytics_dashboard < backup.sql
```

## 🔒 Security Configuration

### 1. Firewall Setup

```bash
# Allow PostgreSQL only from localhost
sudo ufw allow from 127.0.0.1 to any port 5432

# Deny external access to PostgreSQL
sudo ufw deny 5432

# Enable firewall
sudo ufw enable
```

### 2. PostgreSQL Security

The setup automatically configures:
- ✅ Local-only access (no external connections)
- ✅ Strong password authentication
- ✅ Proper user privileges
- ✅ Secure configuration files

### 3. Regular Security Updates

```bash
# Create update script
cat > /home/update-system.sh << 'EOF'
#!/bin/bash
sudo apt update
sudo apt upgrade -y
sudo systemctl restart postgresql
EOF

chmod +x /home/update-system.sh

# Schedule monthly updates
(crontab -l 2>/dev/null; echo "0 2 1 * * /home/update-system.sh") | crontab -
```

## 📊 Monitoring and Maintenance

### 1. Database Health Monitoring

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# View PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log

# Check database size
PGPASSWORD='your_password' psql -h localhost -U analytics_user -d analytics_dashboard -c "SELECT pg_size_pretty(pg_database_size('analytics_dashboard'));"
```

### 2. Performance Monitoring

```bash
# Check active connections
PGPASSWORD='your_password' psql -h localhost -U analytics_user -d analytics_dashboard -c "SELECT count(*) FROM pg_stat_activity WHERE datname='analytics_dashboard';"

# Check database statistics
PGPASSWORD='your_password' psql -h localhost -U analytics_user -d analytics_dashboard -c "SELECT schemaname,tablename,n_tup_ins,n_tup_upd,n_tup_del FROM pg_stat_user_tables;"
```

### 3. Automated Backups

The setup creates automatic daily backups at 2 AM:
- **Location:** `/home/backups/postgresql/`
- **Retention:** 30 days
- **Format:** Compressed SQL dumps

## 🆘 Troubleshooting

### Common Issues

**1. Connection Refused**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check if port is listening
sudo netstat -tlnp | grep 5432

# Restart PostgreSQL
sudo systemctl restart postgresql
```

**2. Authentication Failed**
```bash
# Check pg_hba.conf configuration
sudo cat /etc/postgresql/*/main/pg_hba.conf | grep analytics

# Reset user password
sudo -u postgres psql -c "ALTER USER analytics_user PASSWORD 'new_password';"
```

**3. Permission Denied**
```bash
# Grant all privileges again
sudo -u postgres psql analytics_dashboard -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO analytics_user;"
sudo -u postgres psql analytics_dashboard -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO analytics_user;"
```

**4. Disk Space Issues**
```bash
# Check disk usage
df -h

# Clean old backups
find /home/backups/postgresql/ -name "*.sql.gz" -mtime +30 -delete

# Vacuum database
PGPASSWORD='your_password' psql -h localhost -U analytics_user -d analytics_dashboard -c "VACUUM FULL;"
```

## 🔄 Migration from External Database

If you're migrating from Railway or another service:

### 1. Export from Old Database
```bash
# Export from Railway (example)
PGPASSWORD='old_password' pg_dump -h old_host -U old_user -d old_database > migration.sql
```

### 2. Import to Hostinger Database
```bash
# Import to local PostgreSQL
PGPASSWORD='your_password' psql -h localhost -U analytics_user -d analytics_dashboard < migration.sql
```

### 3. Update Application
```bash
# Update .env file
DATABASE_URL=postgresql://analytics_user:your_password@localhost:5432/analytics_dashboard

# Restart application
pm2 restart analytics-dashboard
```

## 📈 Performance Optimization

### 1. PostgreSQL Configuration

```bash
# Edit postgresql.conf for better performance
sudo nano /etc/postgresql/*/main/postgresql.conf
```

Recommended settings for VPS:
```
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
```

### 2. Regular Maintenance

```bash
# Create maintenance script
cat > /home/maintain-postgresql.sh << 'EOF'
#!/bin/bash
PGPASSWORD='your_password' psql -h localhost -U analytics_user -d analytics_dashboard << SQL
VACUUM ANALYZE;
REINDEX DATABASE analytics_dashboard;
SQL
EOF

chmod +x /home/maintain-postgresql.sh

# Schedule weekly maintenance
(crontab -l 2>/dev/null; echo "0 3 * * 0 /home/maintain-postgresql.sh") | crontab -
```

## 🎉 Benefits of Hostinger PostgreSQL

### Advantages
- ✅ **Cost Effective:** No additional database hosting fees
- ✅ **High Performance:** Local database access (no network latency)
- ✅ **Full Control:** Complete administrative access
- ✅ **Data Ownership:** Your data stays on your server
- ✅ **Customizable:** Configure PostgreSQL exactly as needed
- ✅ **Integrated:** Everything on one server for easier management

### Considerations
- ⚠️ **Backup Responsibility:** You manage backups (automated scripts provided)
- ⚠️ **Maintenance:** You handle PostgreSQL updates (scripts provided)
- ⚠️ **Monitoring:** You monitor database health (tools provided)

## 📞 Support

After setup, you'll have:
- ✅ PostgreSQL running locally on your VPS
- ✅ All application tables created
- ✅ Default users configured
- ✅ Automatic backups scheduled
- ✅ Monitoring scripts available
- ✅ Security properly configured

Your Analytics Dashboard will be fully functional with a robust, local PostgreSQL database!