#!/usr/bin/env node

// Script to update database schema for organizations
require('dotenv').config();
const { Pool } = require('pg');

async function updateDatabaseSchema() {
  let pool;
  
  try {
    console.log('🔍 Updating database schema for organizations...');
    
    // Create PostgreSQL connection
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL');
    
    // Start transaction
    await client.query('BEGIN');
    
    // 1. Create organizations table
    console.log('🔄 Creating organizations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        code TEXT UNIQUE NOT NULL,
        description TEXT,
        logo_url TEXT,
        contact_email TEXT,
        contact_phone TEXT,
        address TEXT,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Organizations table created');
    
    // 2. Insert default CCL organization
    console.log('🔄 Creating default CCL organization...');
    await client.query(`
      INSERT INTO organizations (name, code, description, is_active, created_at)
      VALUES ('Coal India Limited', 'CCL', 'Default organization for Coal India Limited operations', true, CURRENT_TIMESTAMP)
      ON CONFLICT (code) DO NOTHING
    `);
    console.log('✅ CCL organization created');
    
    // 3. Add organization_id column to admin table
    console.log('🔄 Adding organization_id to admin table...');
    try {
      await client.query(`
        ALTER TABLE admin 
        ADD COLUMN organization_id INTEGER REFERENCES organizations(id) DEFAULT 1
      `);
      console.log('✅ organization_id column added to admin table');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ organization_id column already exists in admin table');
      } else {
        throw error;
      }
    }
    
    // 4. Add organization_id column to user table
    console.log('🔄 Adding organization_id to user table...');
    try {
      await client.query(`
        ALTER TABLE "user" 
        ADD COLUMN organization_id INTEGER REFERENCES organizations(id) DEFAULT 1
      `);
      console.log('✅ organization_id column added to user table');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ organization_id column already exists in user table');
      } else {
        throw error;
      }
    }
    
    // 5. Add organization_id column to inferred_reports table
    console.log('🔄 Adding organization_id to inferred_reports table...');
    try {
      await client.query(`
        ALTER TABLE inferred_reports 
        ADD COLUMN organization_id INTEGER REFERENCES organizations(id) DEFAULT 1
      `);
      console.log('✅ organization_id column added to inferred_reports table');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ organization_id column already exists in inferred_reports table');
      } else {
        throw error;
      }
    }
    
    // 6. Add organization_id column to uploaded_atr table
    console.log('🔄 Adding organization_id to uploaded_atr table...');
    try {
      await client.query(`
        ALTER TABLE uploaded_atr 
        ADD COLUMN organization_id INTEGER REFERENCES organizations(id) DEFAULT 1
      `);
      console.log('✅ organization_id column added to uploaded_atr table');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ organization_id column already exists in uploaded_atr table');
      } else {
        throw error;
      }
    }
    
    // 7. Add organization_id column to atr_documents table
    console.log('🔄 Adding organization_id to atr_documents table...');
    try {
      await client.query(`
        ALTER TABLE atr_documents 
        ADD COLUMN organization_id INTEGER REFERENCES organizations(id) DEFAULT 1
      `);
      console.log('✅ organization_id column added to atr_documents table');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ organization_id column already exists in atr_documents table');
      } else {
        throw error;
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('✅ Database schema updated successfully');
    
    // Show current table structure
    console.log('');
    console.log('📋 Current admin table structure:');
    const adminColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'admin' 
      ORDER BY ordinal_position
    `);
    
    adminColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'}) ${col.column_default ? `default: ${col.column_default}` : ''}`);
    });
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error updating database schema:', error.message);
    if (pool) {
      const client = await pool.connect();
      await client.query('ROLLBACK');
      client.release();
    }
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

updateDatabaseSchema();