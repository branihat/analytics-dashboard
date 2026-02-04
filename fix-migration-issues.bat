@echo off
echo 🚀 Fixing PostgreSQL Migration Issues
echo ======================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: Please run this script from the project root directory
    exit /b 1
)

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Node.js is not installed or not in PATH
    exit /b 1
)

REM Check if required dependencies are installed
if not exist "node_modules" if not exist "src\backend\node_modules" (
    echo ⚠️ Warning: Node modules not found. Installing dependencies...
    cd src\backend
    npm install
    cd ..\..
)

echo 🔍 Step 1: Testing database connections...
echo ----------------------------------------
node test-db-connection-simple.js

echo.
echo 🔧 Step 2: Adding organization columns to SQLite...
echo ------------------------------------------------
node add-organization-columns-sqlite.js

echo.
echo 🔍 Step 3: Running fixed migration script...
echo -------------------------------------------
node run-postgresql-migration-fixed.js

echo.
echo ✅ Migration fix completed!
echo.
echo 📋 Next steps:
echo 1. Test your application to ensure it works correctly
echo 2. Check that organization isolation is working
echo 3. Verify that new uploads are assigned to the correct organization
echo.