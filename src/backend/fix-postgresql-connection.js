#!/usr/bin/env node

/**
 * PostgreSQL Connection Fix Script
 * 
 * This script attempts to fix common PostgreSQL connection issues on VPS
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

class PostgreSQLFixer {
  constructor() {
    this.dbName = 'analytics_dashboard';
    this.dbUser = 'analytics_user';
    this.dbPassword = '';
  }

  async fix() {
    console.log('🔧 PostgreSQL Connection Fix\n');

    try {
      await this.checkAndStartPostgreSQL();
      await this.setupDatabaseAndUser();
      await this.configureAuthentication();
      await this.testConnection();
      await this.updateEnvironmentFile();
      
      console.log('\n✅ PostgreSQL connection fix completed!');
      console.log('🚀 Try running your application again');
      
    } catch (error) {
      console.error('❌ Fix failed:', error.message);
      console.log('\n🆘 Manual steps required - see debug output above');
    }
  }

  async checkAndStartPostgreSQL() {
    console.log('🔍 Checking PostgreSQL service...');
    
    try {
      // Check if PostgreSQL is installed
      await this.runCommand('which psql');
      console.log('✅ PostgreSQL is installed');
      
      // Start PostgreSQL service
      await this.runCommand('sudo systemctl start postgresql');
      console.log('✅ PostgreSQL service started');
      
      // Enable PostgreSQL to start on boot
      await this.runCommand('sudo systemctl enable postgresql');
      console.log('✅ PostgreSQL enabled for auto-start');
      
      // Wait a moment for service to fully start
      await this.sleep(2000);
      
    } catch (error) {
      throw new Error(`PostgreSQL service issue: ${error.message}`);
    }
  }

  async setupDatabaseAndUser() {
    console.log('\n🔄 Setting up database and user...');
    
    // Generate secure password
    this.dbPassword = this.generatePassword();
    console.log(`✅ Generated secure password: ${this.dbPassword}`);
    
    try {
      // Create database and user using postgres superuser
      const sqlCommands = `
        -- Drop existing database and user if they exist
        DROP DATABASE IF EXISTS ${this.dbName};
        DROP USER IF EXISTS ${this.dbUser};
        
        -- Create database
        CREATE DATABASE ${this.dbName};
        
        -- Create user with password
        CREATE USER ${this.dbUser} WITH PASSWORD '${this.dbPassword}';
        
        -- Grant privileges
        GRANT ALL PRIVILEGES ON DATABASE ${this.dbName} TO ${this.dbUser};
        ALTER USER ${this.dbUser} CREATEDB;
        ALTER USER ${this.dbUser} WITH SUPERUSER;
        
        -- Connect to the new database and grant schema privileges
        \\c ${this.dbName}
        GRANT ALL ON SCHEMA public TO ${this.dbUser};
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${this.dbUser};
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${this.dbUser};
      `;
      
      // Write SQL commands to temporary file
      const tempSqlFile = '/tmp/setup_db.sql';
      fs.writeFileSync(tempSqlFile, sqlCommands);
      
      // Execute SQL commands
      await this.runCommand(`sudo -u postgres psql -f ${tempSqlFile}`);
      
      // Clean up temp file
      fs.unlinkSync(tempSqlFile);
      
      console.log('✅ Database and user created successfully');
      
    } catch (error) {
      throw new Error(`Database setup failed: ${error.message}`);
    }
  }

  async configureAuthentication() {
    console.log('\n🔧 Configuring PostgreSQL authentication...');
    
    try {
      // Find PostgreSQL version and config directory
      const versionOutput = await this.runCommand('sudo -u postgres psql -t -c "SELECT version();"');
      const versionMatch = versionOutput.match(/PostgreSQL (\d+\.\d+)/);
      const pgVersion = versionMatch ? versionMatch[1] : '14';
      
      const configDir = `/etc/postgresql/${pgVersion}/main`;
      console.log(`✅ Found PostgreSQL ${pgVersion} config directory: ${configDir}`);
      
      // Backup original files
      await this.runCommand(`sudo cp ${configDir}/postgresql.conf ${configDir}/postgresql.conf.backup`).catch(() => {});
      await this.runCommand(`sudo cp ${configDir}/pg_hba.conf ${configDir}/pg_hba.conf.backup`).catch(() => {});
      
      // Configure postgresql.conf
      await this.runCommand(`sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" ${configDir}/postgresql.conf`);
      console.log('✅ Configured postgresql.conf');
      
      // Add authentication rule to pg_hba.conf
      const hbaRule = `local   ${this.dbName}   ${this.dbUser}   md5`;
      await this.runCommand(`echo "${hbaRule}" | sudo tee -a ${configDir}/pg_hba.conf`);
      console.log('✅ Added authentication rule to pg_hba.conf');
      
      // Restart PostgreSQL to apply changes
      await this.runCommand('sudo systemctl restart postgresql');
      console.log('✅ PostgreSQL restarted');
      
      // Wait for restart
      await this.sleep(3000);
      
    } catch (error) {
      console.log('⚠️ Authentication configuration warning:', error.message);
      console.log('   Continuing with default configuration...');
    }
  }

  async testConnection() {
    console.log('\n🔗 Testing database connection...');
    
    const connectionString = `postgresql://${this.dbUser}:${this.dbPassword}@localhost:5432/${this.dbName}`;
    
    try {
      const pool = new Pool({
        connectionString: connectionString,
        ssl: false,
        connectionTimeoutMillis: 10000
      });

      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
      
      console.log('✅ Database connection successful!');
      console.log(`   Time: ${result.rows[0].current_time}`);
      console.log(`   Version: ${result.rows[0].pg_version.split(' ')[1]}`);
      
      client.release();
      await pool.end();
      
    } catch (error) {
      throw new Error(`Connection test failed: ${error.message}`);
    }
  }

  async updateEnvironmentFile() {
    console.log('\n📝 Updating environment file...');
    
    const envPath = path.join(__dirname, '.env');
    const connectionString = `postgresql://${this.dbUser}:${this.dbPassword}@localhost:5432/${this.dbName}`;
    
    try {
      let envContent = '';
      
      // Read existing .env file if it exists
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
        
        // Update DATABASE_URL
        if (envContent.includes('DATABASE_URL=')) {
          envContent = envContent.replace(/DATABASE_URL=.*/, `DATABASE_URL=${connectionString}`);
        } else {
          envContent += `\nDATABASE_URL=${connectionString}`;
        }
      } else {
        // Create new .env file
        envContent = `# Production Environment
NODE_ENV=production
PORT=8080

# Database Configuration
DATABASE_URL=${connectionString}

# JWT Configuration
JWT_SECRET=${this.generatePassword()}

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=dgf5874nz
CLOUDINARY_API_KEY=873245158622578
CLOUDINARY_API_SECRET=3DF8o9ZZD-WIzuSKfS6kFQoVzp4

# Security
HELMET_ENABLED=true
`;
      }
      
      // Write updated .env file
      fs.writeFileSync(envPath, envContent);
      console.log('✅ Environment file updated');
      
      // Save database configuration
      const configContent = `# PostgreSQL Configuration
# Generated on: ${new Date().toISOString()}

Database Name: ${this.dbName}
Database User: ${this.dbUser}
Database Password: ${this.dbPassword}
Connection String: ${connectionString}

# Test connection:
PGPASSWORD="${this.dbPassword}" psql -h localhost -U ${this.dbUser} -d ${this.dbName} -c "SELECT 'Connected!' as status;"
`;
      
      fs.writeFileSync('/tmp/postgresql-config.txt', configContent);
      console.log('✅ Database configuration saved to /tmp/postgresql-config.txt');
      
    } catch (error) {
      console.log('⚠️ Environment file update warning:', error.message);
    }
  }

  generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 20; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  runCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`${command}: ${error.message}`));
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
async function main() {
  const fixer = new PostgreSQLFixer();
  await fixer.fix();
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = PostgreSQLFixer;