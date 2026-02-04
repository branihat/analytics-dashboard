// Migration script to add organization_id columns to violations and reports tables
require('dotenv').config({ path: './src/backend/.env' });
const database = require('./src/backend/utils/databaseHybrid');

async function migrateViolationsOrganization() {
  try {
    console.log('🔄 Starting violations organization migration...');

    // Check if organization_id column exists in violations table
    const violationsColumns = await database.all("PRAGMA table_info(violations)");
    const hasViolationsOrgId = violationsColumns.some(col => col.name === 'organization_id');
    const hasViolationsUploadedBy = violationsColumns.some(col => col.name === 'uploaded_by');

    if (!hasViolationsOrgId) {
      console.log('📊 Adding organization_id column to violations table...');
      await database.run('ALTER TABLE violations ADD COLUMN organization_id INTEGER DEFAULT 1');
      console.log('✅ Added organization_id to violations table');
    } else {
      console.log('✅ organization_id column already exists in violations table');
    }

    if (!hasViolationsUploadedBy) {
      console.log('📊 Adding uploaded_by column to violations table...');
      await database.run('ALTER TABLE violations ADD COLUMN uploaded_by INTEGER');
      console.log('✅ Added uploaded_by to violations table');
    } else {
      console.log('✅ uploaded_by column already exists in violations table');
    }

    // Check if organization_id column exists in reports table
    const reportsColumns = await database.all("PRAGMA table_info(reports)");
    const hasReportsOrgId = reportsColumns.some(col => col.name === 'organization_id');
    const hasReportsUploadedBy = reportsColumns.some(col => col.name === 'uploaded_by');

    if (!hasReportsOrgId) {
      console.log('📊 Adding organization_id column to reports table...');
      await database.run('ALTER TABLE reports ADD COLUMN organization_id INTEGER DEFAULT 1');
      console.log('✅ Added organization_id to reports table');
    } else {
      console.log('✅ organization_id column already exists in reports table');
    }

    if (!hasReportsUploadedBy) {
      console.log('📊 Adding uploaded_by column to reports table...');
      await database.run('ALTER TABLE reports ADD COLUMN uploaded_by INTEGER');
      console.log('✅ Added uploaded_by to reports table');
    } else {
      console.log('✅ uploaded_by column already exists in reports table');
    }

    // Update existing data to have CCL organization (ID = 1) as default
    const violationsCount = await database.get('SELECT COUNT(*) as count FROM violations WHERE organization_id IS NULL');
    if (violationsCount.count > 0) {
      console.log(`📊 Updating ${violationsCount.count} existing violations to CCL organization...`);
      await database.run('UPDATE violations SET organization_id = 1 WHERE organization_id IS NULL');
      console.log('✅ Updated existing violations');
    }

    const reportsCount = await database.get('SELECT COUNT(*) as count FROM reports WHERE organization_id IS NULL');
    if (reportsCount.count > 0) {
      console.log(`📊 Updating ${reportsCount.count} existing reports to CCL organization...`);
      await database.run('UPDATE reports SET organization_id = 1 WHERE organization_id IS NULL');
      console.log('✅ Updated existing reports');
    }

    console.log('🎉 Violations organization migration completed successfully!');
    
    // Show summary
    const totalViolations = await database.get('SELECT COUNT(*) as count FROM violations');
    const totalReports = await database.get('SELECT COUNT(*) as count FROM reports');
    
    console.log('📊 Migration Summary:');
    console.log(`   - Total violations: ${totalViolations.count}`);
    console.log(`   - Total reports: ${totalReports.count}`);
    console.log(`   - All existing data assigned to CCL organization (ID: 1)`);
    console.log(`   - New uploads will be organization-specific`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('❌ Error details:', error);
  } finally {
    // Close database connections
    await database.close();
  }
}

// Run migration
migrateViolationsOrganization();