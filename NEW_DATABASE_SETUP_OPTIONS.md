# New PostgreSQL Database Setup Options

## Option 1: Hostinger PostgreSQL Addon (Recommended)

### Steps:
1. **Login to Hostinger Control Panel**
2. **Go to your VPS management**
3. **Add PostgreSQL addon** (usually $2-5/month)
4. **Note the connection details provided**

### Connection Format:
```
postgresql://username:password@hostname:port/database_name
```

Example:
```
postgresql://myuser:mypassword@localhost:5432/analytics_dashboard
```

---

## Option 2: Supabase (Free Tier - Recommended for Development)

### Steps:
1. **Go to [supabase.com](https://supabase.com)**
2. **Sign up for free account**
3. **Create new project**
4. **Go to Settings > Database**
5. **Copy the connection string**

### Free Tier Includes:
- ✅ 500MB database storage
- ✅ Up to 2GB bandwidth
- ✅ 50,000 monthly active users
- ✅ Automatic backups
- ✅ Real-time subscriptions

### Connection String Format:
```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

---

## Option 3: Neon (Generous Free Tier)

### Steps:
1. **Go to [neon.tech](https://neon.tech)**
2. **Sign up for free account**
3. **Create new project**
4. **Copy connection string from dashboard**

### Free Tier Includes:
- ✅ 3GB storage
- ✅ 1 database
- ✅ Automatic scaling
- ✅ Branching (like Git for databases)

### Connection String Format:
```
postgresql://username:password@ep-[endpoint].us-east-1.aws.neon.tech/dbname?sslmode=require
```

---

## Option 4: ElephantSQL (Simple Free Tier)

### Steps:
1. **Go to [elephantsql.com](https://elephantsql.com)**
2. **Sign up for free account**
3. **Create new instance (Tiny Turtle - Free)**
4. **Copy connection URL**

### Free Tier Includes:
- ✅ 20MB storage
- ✅ 5 concurrent connections
- ✅ Good for development/testing

---

## Option 5: Self-hosted PostgreSQL on VPS

### Installation Script:
```bash
#!/bin/bash
# Install PostgreSQL on Ubuntu VPS

# Update system
sudo apt update

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE analytics_dashboard;
CREATE USER analytics_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE analytics_dashboard TO analytics_user;
ALTER USER analytics_user CREATEDB;
\q
EOF

# Configure PostgreSQL for remote connections (if needed)
sudo nano /etc/postgresql/*/main/postgresql.conf
# Uncomment and change: listen_addresses = '*'

sudo nano /etc/postgresql/*/main/pg_hba.conf
# Add: host all all 0.0.0.0/0 md5

# Restart PostgreSQL
sudo systemctl restart postgresql

echo "PostgreSQL installed successfully!"
echo "Connection string: postgresql://analytics_user:your_secure_password@localhost:5432/analytics_dashboard"
```

---

## Quick Setup Script for Any Option

I'll create a script that helps you configure your new database: