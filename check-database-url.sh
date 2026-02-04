#!/bin/bash

# Check Database URL Configuration
# Run this script to see the current database configuration

echo "🔍 Checking Database URL Configuration..."
echo ""

# Check if we're in the right directory
if [ ! -f "src/backend/.env" ]; then
  echo "❌ .env file not found. Please run from the project root directory."
  echo "Expected location: src/backend/.env"
  exit 1
fi

echo "📂 Current directory: $(pwd)"
echo ""

# Check 1: Backend .env file
echo "🔍 Check 1: Backend .env file (src/backend/.env)"
if [ -f "src/backend/.env" ]; then
  echo "✅ Backend .env file exists"
  echo ""
  echo "📋 Database configuration in src/backend/.env:"
  echo "----------------------------------------"
  
  # Show database-related environment variables (hide sensitive parts)
  if grep -q "DATABASE_URL" src/backend/.env; then
    echo "DATABASE_URL found:"
    grep "DATABASE_URL" src/backend/.env | sed 's/:[^@]*@/:***@/g'
  else
    echo "❌ DATABASE_URL not found"
  fi
  
  if grep -q "DB_HOST" src/backend/.env; then
    echo "DB_HOST: $(grep "DB_HOST" src/backend/.env | cut -d'=' -f2)"
  fi
  
  if grep -q "DB_PORT" src/backend/.env; then
    echo "DB_PORT: $(grep "DB_PORT" src/backend/.env | cut -d'=' -f2)"
  fi
  
  if grep -q "DB_NAME" src/backend/.env; then
    echo "DB_NAME: $(grep "DB_NAME" src/backend/.env | cut -d'=' -f2)"
  fi
  
  if grep -q "DB_USER" src/backend/.env; then
    echo "DB_USER: $(grep "DB_USER" src/backend/.env | cut -d'=' -f2)"
  fi
  
  echo "----------------------------------------"
else
  echo "❌ Backend .env file not found"
fi

echo ""

# Check 2: Root .env file (if exists)
echo "🔍 Check 2: Root .env file"
if [ -f ".env" ]; then
  echo "✅ Root .env file exists"
  echo ""
  echo "📋 Database configuration in .env:"
  echo "----------------------------------------"
  
  if grep -q "DATABASE_URL" .env; then
    echo "DATABASE_URL found:"
    grep "DATABASE_URL" .env | sed 's/:[^@]*@/:***@/g'
  else
    echo "❌ DATABASE_URL not found"
  fi
  
  echo "----------------------------------------"
else
  echo "ℹ️ Root .env file does not exist (this is normal)"
fi

echo ""

# Check 3: Environment variables in current session
echo "🔍 Check 3: Current environment variables"
echo "----------------------------------------"
if [ -n "$DATABASE_URL" ]; then
  echo "DATABASE_URL (from environment): $(echo $DATABASE_URL | sed 's/:[^@]*@/:***@/g')"
else
  echo "❌ DATABASE_URL not set in environment"
fi

if [ -n "$DB_HOST" ]; then
  echo "DB_HOST: $DB_HOST"
fi

if [ -n "$DB_PORT" ]; then
  echo "DB_PORT: $DB_PORT"
fi

if [ -n "$DB_NAME" ]; then
  echo "DB_NAME: $DB_NAME"
fi

if [ -n "$DB_USER" ]; then
  echo "DB_USER: $DB_USER"
fi

echo "----------------------------------------"
echo ""

# Check 4: Test database connection
echo "🔍 Check 4: Testing database connection"
echo "----------------------------------------"

if [ -f "src/backend/utils/databaseHybrid.js" ]; then
  echo "Testing connection using databaseHybrid.js..."
  
  node -e "
  const database = require('./src/backend/utils/databaseHybrid');
  
  console.log('🔗 Attempting database connection...');
  
  database.get('SELECT 1 as test')
    .then(result => {
      console.log('✅ Database connection successful!');
      console.log('Test query result:', result);
      process.exit(0);
    })
    .catch(err => {
      console.log('❌ Database connection failed:', err.message);
      process.exit(1);
    });
  " 2>/dev/null || echo "⚠️ Could not test database connection"
else
  echo "❌ databaseHybrid.js not found"
fi

echo ""

# Check 5: Show database utility file configuration
echo "🔍 Check 5: Database utility configuration"
echo "----------------------------------------"

if [ -f "src/backend/utils/databaseHybrid.js" ]; then
  echo "📄 Database utility file exists: src/backend/utils/databaseHybrid.js"
  echo ""
  echo "Configuration details:"
  head -20 src/backend/utils/databaseHybrid.js | grep -E "(DATABASE_URL|DB_|postgresql|sqlite)" || echo "No obvious database config found in first 20 lines"
else
  echo "❌ Database utility file not found"
fi

echo ""
echo "🎯 Summary:"
echo "----------------------------------------"
echo "1. Check the .env files above for DATABASE_URL"
echo "2. Verify the database connection test passed"
echo "3. If connection fails, the DATABASE_URL might be incorrect"
echo ""
echo "💡 Common database URL formats:"
echo "PostgreSQL: postgresql://username:password@host:port/database"
echo "SQLite: file:./path/to/database.db"
echo ""
echo "🔧 To update database URL:"
echo "nano src/backend/.env"
echo "# Edit DATABASE_URL=your_database_url_here"
echo ""