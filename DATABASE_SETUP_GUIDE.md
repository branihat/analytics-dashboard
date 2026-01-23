# Database Setup Guide

## Overview

Your application uses a **hybrid database approach** for optimal performance and data safety:

- **PostgreSQL**: User accounts (admin/user tables), ATR documents, inferred reports
- **SQLite**: Violations, reports, features, sites, video links

## ✅ Database Successfully Created!

Your database has been successfully initialized with all required tables and default data.

## 🔐 Default Login Credentials

### Admin Accounts
| Email | Password | Role |
|-------|----------|------|
| `admin1@ccl.com` | `Aerovania_grhns@2002` | Admin |
| `superadmin1@ccl.com` | `Super_Aerovania_grhns@2002` | Super Admin |

### Department User Accounts
| Department | Email | Password |
|------------|-------|----------|
| E&T Department | `et@ccl.com` | `deptet123` |
| Security | `security@ccl.com` | `deptsecurity123` |
| Operation | `operation@ccl.com` | `deptoperation123` |
| Survey | `survey@ccl.com` | `deptsurvey123` |
| Safety | `safety@ccl.com` | `deptsafety123` |

## 📊 Database Structure

### PostgreSQL Tables
- **admin**: Admin user accounts with full permissions
- **user**: Department user accounts with role-based access
- **inferred_reports**: AI-generated reports and documents
- **atr_documents**: ATR (Accident/Incident) documents

### SQLite Tables
- **violations**: Drone-detected violations and incidents
- **reports**: Violation reports grouped by drone and date
- **features**: Available violation types and detection features
- **sites**: Mining sites (Bukaro, BNK Mines, Dhori, Kathara)
- **videos_links**: Training and reference videos

## 🚀 Starting Your Application

1. **Start the backend server:**
   ```bash
   cd src/backend
   npm start
   ```

2. **Start the frontend (in a new terminal):**
   ```bash
   cd src/frontend
   npm start
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080

## 🔧 Database Management Scripts

### Verify Database Setup
```bash
cd src/backend
node verify-database.js
```

### Recreate Database (if needed)
```bash
cd src/backend
node create-database.js
```

## 🗄️ Database Configuration

### Environment Variables
Your database is configured via the `.env` file in `src/backend/`:

```env
DATABASE_URL=postgresql://postgres:yaVFUmPvjlfJJRDmjTHrUtyXnpvFMbaD@shinkansen.proxy.rlwy.net:45978/railway
NODE_ENV=development
PORT=8080
JWT_SECRET=neural-incident-commander-secret-key-2024
```

### Database Locations
- **PostgreSQL**: Remote Railway database (persistent across deployments)
- **SQLite**: `src/backend/data/violations.db` (local file)

## 📋 Default Data Created

### Features (27 violation types)
- PPE Kit Detection
- Crowding of People/Vehicles
- Fire/Smoke Detection
- Stagnant Water
- Loose Boulders
- Red Flag Status
- Rest Shelter Lighting
- And more...

### Sites (4 mining locations)
- Bukaro
- BNK Mines
- Dhori
- Kathara

## 🔒 Security Notes

1. **Change default passwords** after first login
2. **JWT Secret** is configured for session management
3. **Role-based access** is enforced throughout the application
4. **PostgreSQL** uses SSL in production environments

## 🆘 Troubleshooting

### Database Connection Issues
1. Verify PostgreSQL connection:
   ```bash
   cd src/backend
   node -e "const {Pool} = require('pg'); const pool = new Pool({connectionString: process.env.DATABASE_URL}); pool.query('SELECT NOW()').then(r => console.log('✅ Connected:', r.rows[0])).catch(e => console.error('❌ Error:', e.message)).finally(() => pool.end());"
   ```

2. Check SQLite database:
   ```bash
   cd src/backend
   ls -la data/violations.db
   ```

### Reset Database
If you need to completely reset the database:
```bash
cd src/backend
node create-database.js
```

## 📞 Support

If you encounter any issues:
1. Check the console logs for error messages
2. Verify environment variables are set correctly
3. Ensure both PostgreSQL and SQLite are accessible
4. Run the verification script to check database status

---

**Your database is now ready for use! 🎉**

You can start uploading violation data, managing users, and generating reports through the web interface.