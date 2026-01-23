#!/bin/bash

# Hostinger VPS PostgreSQL Installation Script
# This script installs and configures PostgreSQL on your Hostinger VPS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Configuration
DB_NAME="analytics_dashboard"
DB_USER="analytics_user"
DB_PASSWORD=""

echo "🚀 Hostinger VPS PostgreSQL Setup"
echo "=================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please don't run this script as root. Use a sudo user instead."
    exit 1
fi

# Generate secure password
generate_password() {
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    print_info "Generated secure database password: $DB_PASSWORD"
}

# Update system
update_system() {
    print_info "Updating system packages..."
    sudo apt update && sudo apt upgrade -y
    print_status "System updated successfully"
}

# Install PostgreSQL
install_postgresql() {
    print_info "Installing PostgreSQL..."
    
    # Install PostgreSQL and contrib package
    sudo apt install -y postgresql postgresql-contrib postgresql-client
    
    # Start and enable PostgreSQL
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    
    print_status "PostgreSQL installed and started"
    
    # Check PostgreSQL version
    PG_VERSION=$(sudo -u postgres psql -t -c "SELECT version();" | head -1)
    print_info "Installed PostgreSQL version: $PG_VERSION"
}

# Configure PostgreSQL
configure_postgresql() {
    print_info "Configuring PostgreSQL..."
    
    # Generate password
    generate_password
    
    # Create database and user
    sudo -u postgres psql << EOF
-- Create database
CREATE DATABASE $DB_NAME;

-- Create user with password
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;

-- Grant additional privileges needed for the application
ALTER USER $DB_USER CREATEDB;
ALTER USER $DB_USER WITH SUPERUSER;

-- Connect to the new database and grant schema privileges
\c $DB_NAME
GRANT ALL ON SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;

-- Exit
\q
EOF

    print_status "Database and user created successfully"
    print_info "Database: $DB_NAME"
    print_info "Username: $DB_USER"
    print_info "Password: $DB_PASSWORD"
}

# Configure PostgreSQL for application access
configure_access() {
    print_info "Configuring PostgreSQL access..."
    
    # Find PostgreSQL version and config path
    PG_VERSION=$(sudo -u postgres psql -t -c "SELECT version();" | grep -oP '\d+\.\d+' | head -1)
    PG_CONFIG_DIR="/etc/postgresql/$PG_VERSION/main"
    
    print_info "PostgreSQL config directory: $PG_CONFIG_DIR"
    
    # Backup original configuration files
    sudo cp "$PG_CONFIG_DIR/postgresql.conf" "$PG_CONFIG_DIR/postgresql.conf.backup"
    sudo cp "$PG_CONFIG_DIR/pg_hba.conf" "$PG_CONFIG_DIR/pg_hba.conf.backup"
    
    # Configure postgresql.conf for local connections
    sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" "$PG_CONFIG_DIR/postgresql.conf"
    
    # Configure pg_hba.conf for local connections
    # Add local connection for our user
    echo "local   $DB_NAME   $DB_USER   md5" | sudo tee -a "$PG_CONFIG_DIR/pg_hba.conf"
    
    # Restart PostgreSQL to apply changes
    sudo systemctl restart postgresql
    
    print_status "PostgreSQL access configured"
}

# Test database connection
test_connection() {
    print_info "Testing database connection..."
    
    # Test connection
    PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 'Connection successful!' as status;" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        print_status "Database connection test successful!"
    else
        print_error "Database connection test failed!"
        exit 1
    fi
}

# Create connection string
create_connection_string() {
    CONNECTION_STRING="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
    
    print_info "Your PostgreSQL connection string:"
    echo ""
    echo "DATABASE_URL=$CONNECTION_STRING"
    echo ""
}

# Setup database security
setup_security() {
    print_info "Setting up database security..."
    
    # Configure firewall (PostgreSQL should only be accessible locally)
    sudo ufw allow from 127.0.0.1 to any port 5432
    
    # Ensure PostgreSQL is not accessible from outside
    sudo ufw deny 5432
    
    print_status "Database security configured (local access only)"
}

# Create backup script
create_backup_script() {
    print_info "Creating database backup script..."
    
    # Create backup directory
    sudo mkdir -p /home/backups/postgresql
    sudo chown $USER:$USER /home/backups/postgresql
    
    # Create backup script
    cat > /home/backup-postgresql.sh << EOF
#!/bin/bash
# PostgreSQL Backup Script

BACKUP_DIR="/home/backups/postgresql"
DATE=\$(date +%Y%m%d-%H%M%S)
DB_NAME="$DB_NAME"
DB_USER="$DB_USER"

# Create backup
PGPASSWORD="$DB_PASSWORD" pg_dump -h localhost -U \$DB_USER \$DB_NAME > \$BACKUP_DIR/\${DB_NAME}-\${DATE}.sql

# Compress backup
gzip \$BACKUP_DIR/\${DB_NAME}-\${DATE}.sql

# Keep only last 30 backups
ls -t \$BACKUP_DIR/\${DB_NAME}-*.sql.gz | tail -n +31 | xargs rm -f

echo "Backup completed: \${DB_NAME}-\${DATE}.sql.gz"
EOF

    chmod +x /home/backup-postgresql.sh
    
    # Add to crontab for daily backups at 2 AM
    (crontab -l 2>/dev/null; echo "0 2 * * * /home/backup-postgresql.sh") | crontab -
    
    print_status "Backup script created and scheduled"
}

# Create database monitoring script
create_monitoring_script() {
    print_info "Creating database monitoring script..."
    
    cat > /home/monitor-postgresql.sh << EOF
#!/bin/bash
# PostgreSQL Monitoring Script

DB_NAME="$DB_NAME"
DB_USER="$DB_USER"

echo "🔍 PostgreSQL Status Check"
echo "=========================="

# Check PostgreSQL service status
if systemctl is-active --quiet postgresql; then
    echo "✅ PostgreSQL service is running"
else
    echo "❌ PostgreSQL service is not running"
    exit 1
fi

# Check database connection
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U \$DB_USER -d \$DB_NAME -c "SELECT 'Database connection OK' as status;" > /dev/null 2>&1

if [ \$? -eq 0 ]; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    exit 1
fi

# Show database size
DB_SIZE=\$(PGPASSWORD="$DB_PASSWORD" psql -h localhost -U \$DB_USER -d \$DB_NAME -t -c "SELECT pg_size_pretty(pg_database_size('\$DB_NAME'));" | xargs)
echo "📊 Database size: \$DB_SIZE"

# Show connection count
CONN_COUNT=\$(PGPASSWORD="$DB_PASSWORD" psql -h localhost -U \$DB_USER -d \$DB_NAME -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname='\$DB_NAME';" | xargs)
echo "🔗 Active connections: \$CONN_COUNT"

echo "✅ All checks passed!"
EOF

    chmod +x /home/monitor-postgresql.sh
    
    print_status "Monitoring script created"
}

# Save configuration
save_configuration() {
    print_info "Saving configuration..."
    
    # Create configuration file
    cat > /home/postgresql-config.txt << EOF
# Hostinger PostgreSQL Configuration
# Generated on: $(date)

Database Name: $DB_NAME
Database User: $DB_USER
Database Password: $DB_PASSWORD
Connection String: postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME

# Management Commands:
# - Backup: /home/backup-postgresql.sh
# - Monitor: /home/monitor-postgresql.sh
# - Connect: PGPASSWORD="$DB_PASSWORD" psql -h localhost -U $DB_USER -d $DB_NAME

# Service Management:
# - Start: sudo systemctl start postgresql
# - Stop: sudo systemctl stop postgresql
# - Restart: sudo systemctl restart postgresql
# - Status: sudo systemctl status postgresql

# Configuration Files:
# - Main config: /etc/postgresql/*/main/postgresql.conf
# - Access config: /etc/postgresql/*/main/pg_hba.conf
# - Logs: /var/log/postgresql/

# Backup Location: /home/backups/postgresql/
EOF

    print_status "Configuration saved to /home/postgresql-config.txt"
}

# Main installation process
main() {
    echo "Starting PostgreSQL installation on Hostinger VPS..."
    echo ""
    
    update_system
    install_postgresql
    configure_postgresql
    configure_access
    test_connection
    setup_security
    create_backup_script
    create_monitoring_script
    save_configuration
    create_connection_string
    
    echo ""
    echo "🎉 PostgreSQL installation completed successfully!"
    echo ""
    echo "📋 Important Information:"
    echo "========================"
    echo "Database Name: $DB_NAME"
    echo "Database User: $DB_USER"
    echo "Database Password: $DB_PASSWORD"
    echo ""
    echo "🔗 Connection String for your .env file:"
    echo "DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
    echo ""
    echo "🔧 Management Commands:"
    echo "- Test connection: /home/monitor-postgresql.sh"
    echo "- Create backup: /home/backup-postgresql.sh"
    echo "- View config: cat /home/postgresql-config.txt"
    echo ""
    echo "📁 Important Files:"
    echo "- Configuration: /home/postgresql-config.txt"
    echo "- Backup script: /home/backup-postgresql.sh"
    echo "- Monitor script: /home/monitor-postgresql.sh"
    echo ""
    print_warning "IMPORTANT: Save the database password securely!"
    print_warning "The password is also saved in /home/postgresql-config.txt"
    echo ""
    print_status "Your PostgreSQL database is ready for use!"
}

# Run main function
main