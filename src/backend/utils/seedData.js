const ViolationModel = require('../models/Violation');
const database = require('./database');

// Sample data removed - using real data only

async function clearDatabase() {
  try {
    await database.run('DELETE FROM violations');
    await database.run('DELETE FROM reports');
    console.log('Cleared existing data');
  } catch (error) {
    console.error('Failed to clear database:', error.message);
  }
}

// No seeding needed - using real data only
module.exports = { clearDatabase }; 