#!/bin/bash

# PostgreSQL Database Clone Script
# This script clones your Railway PostgreSQL database to a new database

echo "🗄️  PostgreSQL Database Clone Script"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Old database URL (Railway)
OLD_DB="postgresql://postgres:yaVFUmPvjlfJJRDmjTHrUtyXnpvFMbaD@shinkansen.proxy.rlwy.net:45978/railway"

# Get new database URL from user
echo -e "${YELLOW}Enter your NEW database URL:${NC}"
echo "Example: postgresql://user:password@host:port/database"
read -p "New DATABASE_URL: " NEW_DB

if [ -z "$NEW_DB" ]; then
    echo -e "${RED}❌ Error: New database URL is required!${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Old Database:${NC} Railway PostgreSQL"
echo -e "${YELLOW}New Database:${NC} $NEW_DB"
echo ""
read -p "Continue? (y/n): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Cancelled."
    exit 0
fi

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    echo -e "${RED}❌ Error: pg_dump not found!${NC}"
    echo "Please install PostgreSQL client tools:"
    echo "  macOS: brew install postgresql"
    echo "  Linux: sudo apt install postgresql-client"
    echo "  Windows: Download from postgresql.org"
    echo ""
    echo "Or use Docker method (see DATABASE_CLONE_GUIDE.md)"
    exit 1
fi

# Backup file name with timestamp
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).dump"

echo ""
echo -e "${GREEN}📦 Step 1: Dumping old database...${NC}"
pg_dump "$OLD_DB" --format=custom --no-owner --no-privileges -f "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dump successful!${NC}"
    echo -e "   Backup saved as: $BACKUP_FILE"
else
    echo -e "${RED}❌ Dump failed!${NC}"
    echo "Please check:"
    echo "  1. Old database URL is correct"
    echo "  2. You have network access to the database"
    echo "  3. Database credentials are valid"
    exit 1
fi

echo ""
echo -e "${GREEN}📥 Step 2: Restoring to new database...${NC}"
pg_restore --no-owner --no-privileges --clean --if-exists -d "$NEW_DB" "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Restore successful!${NC}"
else
    echo -e "${RED}❌ Restore failed!${NC}"
    echo "Please check:"
    echo "  1. New database URL is correct"
    echo "  2. Database exists and is accessible"
    echo "  3. User has CREATE, INSERT, UPDATE, DELETE permissions"
    echo ""
    echo "Backup file saved as: $BACKUP_FILE"
    exit 1
fi

echo ""
echo -e "${GREEN}🔍 Step 3: Verifying clone...${NC}"

# Check if psql is available for verification
if command -v psql &> /dev/null; then
    echo "Checking table counts..."
    
    ADMIN_COUNT=$(psql "$NEW_DB" -t -c "SELECT COUNT(*) FROM admin;" 2>/dev/null | xargs)
    USER_COUNT=$(psql "$NEW_DB" -t -c "SELECT COUNT(*) FROM \"user\";" 2>/dev/null | xargs)
    REPORTS_COUNT=$(psql "$NEW_DB" -t -c "SELECT COUNT(*) FROM inferred_reports;" 2>/dev/null | xargs)
    
    if [ ! -z "$ADMIN_COUNT" ]; then
        echo -e "   ${GREEN}✅ admin table: $ADMIN_COUNT records${NC}"
    fi
    if [ ! -z "$USER_COUNT" ]; then
        echo -e "   ${GREEN}✅ user table: $USER_COUNT records${NC}"
    fi
    if [ ! -z "$REPORTS_COUNT" ]; then
        echo -e "   ${GREEN}✅ inferred_reports table: $REPORTS_COUNT records${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  psql not found - skipping verification${NC}"
    echo "   You can verify manually by connecting to the database"
fi

echo ""
echo -e "${GREEN}✅ Database clone completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. Update DATABASE_URL in your application:"
echo "     export DATABASE_URL=\"$NEW_DB\""
echo ""
echo "  2. Test your application with the new database"
echo ""
echo "  3. Keep the backup file safe: $BACKUP_FILE"
echo ""
echo "  4. ⚠️  IMPORTANT: Change the password on the old Railway database"
echo "     for security reasons!"
echo ""

# Ask if user wants to keep backup
read -p "Delete backup file? (y/n): " delete_backup
if [ "$delete_backup" == "y" ] || [ "$delete_backup" == "Y" ]; then
    rm "$BACKUP_FILE"
    echo "Backup file deleted."
else
    echo "Backup file kept: $BACKUP_FILE"
fi

echo ""
echo "Done! 🎉"
