#!/bin/bash

echo "🚀 Fixing PostgreSQL Migration Issues"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed or not in PATH"
    exit 1
fi

# Check if required dependencies are installed
if [ ! -d "node_modules" ] && [ ! -d "src/backend/node_modules" ]; then
    echo "⚠️ Warning: Node modules not found. Installing dependencies..."
    cd src/backend
    npm install
    cd ../..
fi

echo "🔍 Step 1: Testing database connections..."
echo "----------------------------------------"
node test-db-connection-simple.js

echo ""
echo "🔧 Step 2: Adding organization columns to SQLite..."
echo "------------------------------------------------"
node add-organization-columns-sqlite.js

echo ""
echo "🔍 Step 3: Running fixed migration script..."
echo "-------------------------------------------"
node run-postgresql-migration-fixed.js

echo ""
echo "✅ Migration fix completed!"
echo ""
echo "📋 Next steps:"
echo "1. Test your application to ensure it works correctly"
echo "2. Check that organization isolation is working"
echo "3. Verify that new uploads are assigned to the correct organization"
echo ""