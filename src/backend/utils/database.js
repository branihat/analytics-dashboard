/**
 * HYBRID DATABASE APPROACH
 * - PostgreSQL: User accounts (admin/user), ATR documents
 * - SQLite: Violations, reports, features, sites (keeps existing data safe)
 * 
 * This ensures:
 * 1. Existing violation data is NEVER touched or deleted
 * 2. User accounts and ATR documents persist across Railway deployments
 * 3. No data loss on redeploy
 */
const HybridDatabase = require('./databaseHybrid');

// Export the hybrid database instance
module.exports = HybridDatabase;
