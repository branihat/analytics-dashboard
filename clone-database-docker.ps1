# PostgreSQL Database Clone Script using Docker (No PostgreSQL Installation Required)
# This script clones your Railway PostgreSQL database to a new database using Docker

Write-Host "🗄️  PostgreSQL Database Clone Script (Docker)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is available
$dockerPath = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerPath) {
    Write-Host "❌ Error: Docker not found!" -ForegroundColor Red
    Write-Host "Please install Docker Desktop:" -ForegroundColor Yellow
    Write-Host "  https://www.docker.com/products/docker-desktop/" -ForegroundColor Gray
    exit 1
}

Write-Host "✅ Docker found!" -ForegroundColor Green
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

# Backup file name with timestamp
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = "backup_$timestamp.dump"
$currentDir = Get-Location

Write-Host ""
Write-Host "📦 Step 1: Pulling PostgreSQL Docker image..." -ForegroundColor Green
docker pull postgres:16 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to pull Docker image!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker image ready!" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Step 2: Dumping old database..." -ForegroundColor Green

# Extract password from OLD_DB URL for Docker
$oldDbParts = $OLD_DB -replace "postgresql://", "" -split "@"
$oldCreds = $oldDbParts[0] -split ":"
$oldPassword = $oldCreds[1]
$oldHostParts = $oldDbParts[1] -split ":"
$oldHost = $oldHostParts[0]
$oldPort = ($oldHostParts[1] -split "/")[0]
$oldDatabase = ($oldHostParts[1] -split "/")[1]

# Run pg_dump in Docker container
docker run --rm `
    -e PGPASSWORD=$oldPassword `
    -v "${currentDir}:/backup" `
    postgres:16 `
    pg_dump -h $oldHost -p $oldPort -U postgres -d $oldDatabase --format=custom --no-owner --no-privileges -f /backup/$BACKUP_FILE

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
Write-Host "📥 Step 3: Restoring to new database..." -ForegroundColor Green

# Extract password from NEW_DB URL for Docker
$newDbParts = $NEW_DB -replace "postgresql://", "" -split "@"
$newCreds = $newDbParts[0] -split ":"
$newUser = $newCreds[0]
$newPassword = $newCreds[1]
$newHostParts = $newDbParts[1] -split ":"
$newHost = $newHostParts[0]
$newPort = ($newHostParts[1] -split "/")[0]
$newDatabase = ($newHostParts[1] -split "/")[1]

# Run pg_restore in Docker container
docker run --rm -i `
    -e PGPASSWORD=$newPassword `
    -v "${currentDir}:/backup" `
    postgres:16 `
    pg_restore --no-owner --no-privileges --clean --if-exists -h $newHost -p $newPort -U $newUser -d $newDatabase /backup/$BACKUP_FILE

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
Write-Host "🔍 Step 4: Verifying clone..." -ForegroundColor Green

# Verify using Docker
Write-Host "Checking table counts..." -ForegroundColor Gray

try {
    $adminCount = docker run --rm `
        -e PGPASSWORD=$newPassword `
        postgres:16 `
        psql -h $newHost -p $newPort -U $newUser -d $newDatabase -t -c "SELECT COUNT(*) FROM admin;" 2>$null | ForEach-Object { $_.Trim() }
    
    $userCount = docker run --rm `
        -e PGPASSWORD=$newPassword `
        postgres:16 `
        psql -h $newHost -p $newPort -U $newUser -d $newDatabase -t -c 'SELECT COUNT(*) FROM "user";' 2>$null | ForEach-Object { $_.Trim() }
    
    $reportsCount = docker run --rm `
        -e PGPASSWORD=$newPassword `
        postgres:16 `
        psql -h $newHost -p $newPort -U $newUser -d $newDatabase -t -c "SELECT COUNT(*) FROM inferred_reports;" 2>$null | ForEach-Object { $_.Trim() }
    
    if ($adminCount -and $adminCount -match '^\d+$') {
        Write-Host "   ✅ admin table: $adminCount records" -ForegroundColor Green
    }
    if ($userCount -and $userCount -match '^\d+$') {
        Write-Host "   ✅ user table: $userCount records" -ForegroundColor Green
    }
    if ($reportsCount -and $reportsCount -match '^\d+$') {
        Write-Host "   ✅ inferred_reports table: $reportsCount records" -ForegroundColor Green
    }
} catch {
    Write-Host "   ⚠️  Could not verify tables (this is okay)" -ForegroundColor Yellow
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
$deleteBackup = Read-Host "Delete backup file (y/n)"
if ($deleteBackup -eq "y" -or $deleteBackup -eq "Y") {
    Remove-Item $BACKUP_FILE -ErrorAction SilentlyContinue
    Write-Host "Backup file deleted." -ForegroundColor Green
} else {
    Write-Host "Backup file kept: $BACKUP_FILE" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Done! 🎉" -ForegroundColor Green
