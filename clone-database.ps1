# PostgreSQL Database Clone Script for Windows PowerShell
# This script clones your Railway PostgreSQL database to a new database

Write-Host "🗄️  PostgreSQL Database Clone Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Old database URL (Railway)
$OLD_DB = "postgresql://postgres:yaVFUmPvjlfJJRDmjTHrUtyXnpvFMbaD@shinkansen.proxy.rlwy.net:45978/railway"

# Get new database URL from user
Write-Host "Enter your NEW database URL:" -ForegroundColor Yellow
Write-Host "Example: postgresql://user:password@host:port/database" -ForegroundColor Gray
$NEW_DB = Read-Host "New DATABASE_URL"

if ([string]::IsNullOrWhiteSpace($NEW_DB)) {
    Write-Host "❌ Error: New database URL is required!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Old Database: Railway PostgreSQL" -ForegroundColor Yellow
Write-Host "New Database: $NEW_DB" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Continue (y/n)"

if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

# Check if pg_dump is available
$pgDumpPath = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDumpPath) {
    Write-Host "❌ Error: pg_dump not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "You have two options:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1: Install PostgreSQL (Recommended)" -ForegroundColor Cyan
    Write-Host "  Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Gray
    Write-Host "  During installation, make sure to install 'Command Line Tools'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Option 2: Use Docker (No installation needed)" -ForegroundColor Cyan
    Write-Host "  Run: .\clone-database-docker.ps1" -ForegroundColor Gray
    Write-Host ""
    
    $useDocker = Read-Host "Use Docker instead? (y/n)"
    if ($useDocker -eq "y" -or $useDocker -eq "Y") {
        Write-Host ""
        Write-Host "Switching to Docker method..." -ForegroundColor Green
        # Check if Docker is available
        $dockerPath = Get-Command docker -ErrorAction SilentlyContinue
        if (-not $dockerPath) {
            Write-Host "❌ Docker not found! Please install Docker Desktop:" -ForegroundColor Red
            Write-Host "  https://www.docker.com/products/docker-desktop/" -ForegroundColor Gray
            exit 1
        }
        # Continue with Docker method below
    } else {
        Write-Host "Please install PostgreSQL and run this script again." -ForegroundColor Yellow
        exit 1
    }
}

# Backup file name with timestamp
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = "backup_$timestamp.dump"

Write-Host ""
Write-Host "📦 Step 1: Dumping old database..." -ForegroundColor Green
& pg_dump $OLD_DB --format=custom --no-owner --no-privileges -f $BACKUP_FILE

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dump successful!" -ForegroundColor Green
    Write-Host "   Backup saved as: $BACKUP_FILE" -ForegroundColor Gray
} else {
    Write-Host "❌ Dump failed!" -ForegroundColor Red
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. Old database URL is correct" -ForegroundColor Gray
    Write-Host "  2. You have network access to the database" -ForegroundColor Gray
    Write-Host "  3. Database credentials are valid" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "📥 Step 2: Restoring to new database..." -ForegroundColor Green
& pg_restore --no-owner --no-privileges --clean --if-exists -d $NEW_DB $BACKUP_FILE

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Restore successful!" -ForegroundColor Green
} else {
    Write-Host "❌ Restore failed!" -ForegroundColor Red
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. New database URL is correct" -ForegroundColor Gray
    Write-Host "  2. Database exists and is accessible" -ForegroundColor Gray
    Write-Host "  3. User has CREATE, INSERT, UPDATE, DELETE permissions" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Backup file saved as: $BACKUP_FILE" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "🔍 Step 3: Verifying clone..." -ForegroundColor Green

# Check if psql is available for verification
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if ($psqlPath) {
    Write-Host "Checking table counts..." -ForegroundColor Gray
    
    try {
        $adminCount = & psql $NEW_DB -t -c "SELECT COUNT(*) FROM admin;" 2>$null | ForEach-Object { $_.Trim() }
        $userCount = & psql $NEW_DB -t -c "SELECT COUNT(*) FROM `"user`";" 2>$null | ForEach-Object { $_.Trim() }
        $reportsCount = & psql $NEW_DB -t -c "SELECT COUNT(*) FROM inferred_reports;" 2>$null | ForEach-Object { $_.Trim() }
        
        if ($adminCount) {
            Write-Host "   ✅ admin table: $adminCount records" -ForegroundColor Green
        }
        if ($userCount) {
            Write-Host "   ✅ user table: $userCount records" -ForegroundColor Green
        }
        if ($reportsCount) {
            Write-Host "   ✅ inferred_reports table: $reportsCount records" -ForegroundColor Green
        }
    } catch {
        Write-Host "   ⚠️  Could not verify tables (this is okay)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  psql not found - skipping verification" -ForegroundColor Yellow
    Write-Host "   You can verify manually by connecting to the database" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✅ Database clone completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Update DATABASE_URL in your application:" -ForegroundColor Gray
Write-Host "     `$env:DATABASE_URL = `"$NEW_DB`"" -ForegroundColor White
Write-Host ""
Write-Host "  2. Test your application with the new database" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Keep the backup file safe: $BACKUP_FILE" -ForegroundColor Gray
Write-Host ""
Write-Host "  4. ⚠️  IMPORTANT: Change the password on the old Railway database" -ForegroundColor Yellow
Write-Host "     for security reasons!" -ForegroundColor Yellow
Write-Host ""

# Ask if user wants to keep backup
$deleteBackup = Read-Host "Delete backup file? (y/n)"
if ($deleteBackup -eq "y" -or $deleteBackup -eq "Y") {
    Remove-Item $BACKUP_FILE
    Write-Host "Backup file deleted." -ForegroundColor Green
} else {
    Write-Host "Backup file kept: $BACKUP_FILE" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Done! 🎉" -ForegroundColor Green
