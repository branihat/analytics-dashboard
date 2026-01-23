# 🗄️ PostgreSQL Database Clone Guide

This guide will help you clone your Railway PostgreSQL database to a new PostgreSQL database.

## 📋 What Gets Cloned

Your PostgreSQL database contains:
- ✅ **admin** table - Admin user accounts
- ✅ **user** table - Regular user accounts  
- ✅ **inferred_reports** table - Inferred report documents
- ✅ **atr_documents** table - ATR document records
- ✅ **uploaded_atr** table - Uploaded ATR documents

**Note:** SQLite database (`violations.db`) is separate and needs to be copied as a file.

---

## 🎯 Step 1: Create a New PostgreSQL Database

Choose one of these options:

### Option A: Supabase (Free Tier Available) ⭐ Recommended
1. Go to [supabase.com](https://supabase.com)
2. Sign up / Login
3. Create a new project
4. Go to **Settings** → **Database**
5. Copy the **Connection String** (URI format)
   - Format: `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`

### Option B: Neon (Free Tier Available)
1. Go to [neon.tech](https://neon.tech)
2. Sign up / Login
3. Create a new project
4. Copy the **Connection String**
   - Format: `postgresql://[user]:[password]@[host]/[database]?sslmode=require`

### Option C: Hostinger VPS (If you have VPS)
1. SSH into your VPS
2. Install PostgreSQL:
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   ```
3. Create database:
   ```bash
   sudo -u postgres psql
   CREATE DATABASE analytics_db;
   CREATE USER analytics_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE analytics_db TO analytics_user;
   \q
   ```
4. Connection string: `postgresql://analytics_user:your_password@localhost:5432/analytics_db`

### Option D: Railway (New Project)
1. Go to [railway.app](https://railway.app)
2. Create new project
3. Add **PostgreSQL** service
4. Copy the **DATABASE_URL** from service settings

---

## 🔧 Step 2: Install PostgreSQL Tools

You need `pg_dump` and `pg_restore` (or `psql`) to clone the database.

### Windows:
1. Download PostgreSQL from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
2. Install PostgreSQL (includes command-line tools)
3. Add to PATH: `C:\Program Files\PostgreSQL\16\bin`

### macOS:
```bash
brew install postgresql
```

### Linux:
```bash
sudo apt update
sudo apt install postgresql-client
```

### Using Docker (No Installation Needed):
```bash
# Use Docker to run pg_dump without installing PostgreSQL
docker pull postgres:16
```

---

## 📦 Step 3: Clone the Database

### Method 1: Using pg_dump + pg_restore (Recommended - Fastest)

**Old Database URL:**
```
postgresql://postgres:yaVFUmPvjlfJJRDmjTHrUtyXnpvFMbaD@shinkansen.proxy.rlwy.net:45978/railway
```

**New Database URL:**
```
postgresql://user:password@host:port/database
```

#### On Windows/Mac/Linux:
```bash
# Set variables (replace with your actual URLs)
export OLD_DB="postgresql://postgres:yaVFUmPvjlfJJRDmjTHrUtyXnpvFMbaD@shinkansen.proxy.rlwy.net:45978/railway"
export NEW_DB="postgresql://user:password@host:port/database"

# Dump the old database
pg_dump "$OLD_DB" --format=custom --no-owner --no-privileges -f backup.dump

# Restore to new database
pg_restore --no-owner --no-privileges --clean --if-exists -d "$NEW_DB" backup.dump
```

#### On Windows PowerShell:
```powershell
# Set variables
$OLD_DB = "postgresql://postgres:yaVFUmPvjlfJJRDmjTHrUtyXnpvFMbaD@shinkansen.proxy.rlwy.net:45978/railway"
$NEW_DB = "postgresql://user:password@host:port/database"

# Dump
pg_dump $OLD_DB --format=custom --no-owner --no-privileges -f backup.dump

# Restore
pg_restore --no-owner --no-privileges --clean --if-exists -d $NEW_DB backup.dump
```

### Method 2: Using Docker (No Installation Required)

```bash
# Set variables
export OLD_DB="postgresql://postgres:yaVFUmPvjlfJJRDmjTHrUtyXnpvFMbaD@shinkansen.proxy.rlwy.net:45978/railway"
export NEW_DB="postgresql://user:password@host:port/database"

# Dump using Docker
docker run --rm -e PGPASSWORD="" postgres:16 \
  pg_dump "$OLD_DB" --format=custom --no-owner --no-privileges > backup.dump

# Restore using Docker
docker run --rm -i -e PGPASSWORD="" postgres:16 \
  pg_restore --no-owner --no-privileges --clean --if-exists -d "$NEW_DB" < backup.dump
```

### Method 3: Using SQL Dump (Simpler, but slower)

```bash
# Dump as SQL file
pg_dump "$OLD_DB" --no-owner --no-privileges > backup.sql

# Restore from SQL file
psql "$NEW_DB" < backup.sql
```

---

## ✅ Step 4: Verify the Clone

### Check Tables:
```bash
# Connect to new database
psql "$NEW_DB"

# List all tables
\dt

# Check admin table
SELECT COUNT(*) FROM admin;

# Check user table
SELECT COUNT(*) FROM "user";

# Check inferred_reports table
SELECT COUNT(*) FROM inferred_reports;

# Exit
\q
```

### Expected Output:
You should see:
- `admin` table with your admin users
- `user` table with regular users
- `inferred_reports` table with report records
- `atr_documents` table (if exists)
- `uploaded_atr` table (if exists)

---

## 🔄 Step 5: Update Your Application

### Update Environment Variables:

**In your hosting platform (Railway/Hostinger/etc.):**
```
DATABASE_URL=postgresql://user:password@host:port/database
```

**Or in your `.env` file:**
```env
DATABASE_URL=postgresql://user:password@host:port/database
```

### Test the Connection:

```bash
# Test from your app directory
cd src/backend
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT COUNT(*) FROM admin').then(res => {
  console.log('✅ Connection successful! Admin count:', res.rows[0].count);
  process.exit(0);
}).catch(err => {
  console.error('❌ Connection failed:', err.message);
  process.exit(1);
});
"
```

---

## 📁 Step 6: Clone SQLite Database (Optional)

Your SQLite database (`violations.db`) is separate and contains:
- Violations data
- Features
- Sites
- Video links

### To Clone SQLite:

1. **Copy the file:**
   ```bash
   # From your local machine
   cp src/backend/data/violations.db backup_violations.db
   
   # Upload to new server (if deploying)
   scp backup_violations.db user@hostinger:/path/to/app/src/backend/data/
   ```

2. **Or use SQLite dump:**
   ```bash
   # Dump SQLite to SQL file
   sqlite3 src/backend/data/violations.db .dump > violations_backup.sql
   
   # Restore on new server
   sqlite3 new_violations.db < violations_backup.sql
   ```

---

## 🛠️ Troubleshooting

### Error: "connection refused"
- Check if the database URL is correct
- Verify the database server is accessible
- Check firewall settings

### Error: "authentication failed"
- Verify username and password
- Check if user has proper permissions

### Error: "database does not exist"
- Create the database first:
  ```sql
  CREATE DATABASE your_database_name;
  ```

### Error: "relation already exists"
- Use `--clean` flag in pg_restore (already included in commands above)
- Or drop tables manually before restoring

### Error: "permission denied"
- Make sure the user has CREATE, INSERT, UPDATE, DELETE permissions
- Grant privileges:
  ```sql
  GRANT ALL PRIVILEGES ON DATABASE your_db TO your_user;
  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
  ```

---

## 🔐 Security Notes

⚠️ **IMPORTANT:**
1. **Change the password** on the old Railway database after cloning
2. **Don't commit** database URLs with passwords to Git
3. **Use environment variables** for database URLs
4. **Rotate credentials** regularly

---

## 📝 Quick Reference Commands

### Complete Clone Script (Save as `clone-db.sh`):

```bash
#!/bin/bash

# Configuration
OLD_DB="postgresql://postgres:yaVFUmPvjlfJJRDmjTHrUtyXnpvFMbaD@shinkansen.proxy.rlwy.net:45978/railway"
NEW_DB="postgresql://user:password@host:port/database"

echo "🔄 Starting database clone..."
echo "📦 Dumping old database..."

# Dump
pg_dump "$OLD_DB" --format=custom --no-owner --no-privileges -f backup.dump

if [ $? -eq 0 ]; then
    echo "✅ Dump successful!"
    echo "📥 Restoring to new database..."
    
    # Restore
    pg_restore --no-owner --no-privileges --clean --if-exists -d "$NEW_DB" backup.dump
    
    if [ $? -eq 0 ]; then
        echo "✅ Clone successful!"
        echo "🧹 Cleaning up..."
        rm backup.dump
        echo "✅ Done!"
    else
        echo "❌ Restore failed!"
        exit 1
    fi
else
    echo "❌ Dump failed!"
    exit 1
fi
```

### Run the script:
```bash
chmod +x clone-db.sh
./clone-db.sh
```

---

## 🎯 Next Steps

After cloning:
1. ✅ Update `DATABASE_URL` in your hosting environment
2. ✅ Test the application with new database
3. ✅ Verify all data is present
4. ✅ Update old database password (security)
5. ✅ Keep backup files safe (but don't commit to Git!)

---

## 💡 Pro Tips

1. **Test locally first** - Clone to a local PostgreSQL before deploying
2. **Keep backups** - Save the `.dump` file before deleting
3. **Verify counts** - Compare row counts between old and new databases
4. **Monitor logs** - Check application logs after switching databases
5. **Gradual migration** - Consider running both databases in parallel initially

---

## 📞 Need Help?

If you encounter issues:
1. Check the error message carefully
2. Verify database URLs are correct
3. Test database connection separately
4. Check PostgreSQL logs on the server
5. Ensure all required tables exist
