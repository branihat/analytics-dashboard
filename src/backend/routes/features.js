const express = require('express');
const router = express.Router();
const database = require('../utils/database');
const { syncFeaturesFromViolations, formatFeatureName } = require('../utils/featureSync');

// Initialize default features in database
const initializeDefaultFeatures = async () => {
  const defaultFeatures = [
    'ppe_kit_detection',
    'crowding_of_people', 
    'crowding_of_vehicles',
    'rest_shelter_lighting',
    'stagnant_water',
    'fire_smoke',
    'loose_boulder',
    'red_flag'
  ];

  try {
    // Create features table if it doesn't exist
    await database.run(`
      CREATE TABLE IF NOT EXISTS features (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1
      )
    `);

    // Insert default features if they don't exist
    for (const featureName of defaultFeatures) {
      const displayName = formatFeatureName(featureName);
      await database.run(
        'INSERT OR IGNORE INTO features (name, display_name) VALUES (?, ?)',
        [featureName, displayName]
      );
    }
  } catch (error) {
    console.error('Error initializing features:', error);
  }
};

// Initialize features on module load
initializeDefaultFeatures();

// Get all features
router.get('/', async (req, res) => {
  try {
    const features = await database.all(`
      SELECT 
        f.*,
        COUNT(v.id) as violation_count
      FROM features f
      LEFT JOIN violations v ON f.name = v.type
      WHERE f.is_active = 1
      GROUP BY f.id, f.name, f.display_name, f.description, f.created_at
      ORDER BY f.display_name
    `);

    res.json({
      success: true,
      features: features.map(feature => ({
        id: feature.id,
        name: feature.name,
        display_name: feature.display_name,
        description: feature.description,
        violation_count: feature.violation_count,
        created_at: feature.created_at
      })),
      total_count: features.length
    });
  } catch (error) {
    console.error('Error fetching features:', error);
    res.status(500).json({ error: 'Failed to fetch features' });
  }
});

// Create new feature
router.post('/', async (req, res) => {
  try {
    const { name, display_name, description } = req.body;

    if (!name || !display_name) {
      return res.status(400).json({ error: 'Name and display name are required' });
    }

    // Convert name to lowercase with underscores
    const featureName = name.toLowerCase().replace(/\s+/g, '_');

    const result = await database.run(
      'INSERT INTO features (name, display_name, description) VALUES (?, ?, ?)',
      [featureName, display_name, description || null]
    );

    const newFeature = await database.get(
      'SELECT * FROM features WHERE id = ?',
      [result.id]
    );

    res.json({
      success: true,
      message: 'Feature created successfully',
      feature: newFeature
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Feature with this name already exists' });
    }
    console.error('Error creating feature:', error);
    res.status(500).json({ error: 'Failed to create feature' });
  }
});

// Get feature statistics
router.get('/stats', async (req, res) => {
  try {
    const featureStats = await database.all(`
      SELECT 
        f.name as feature_name,
        f.display_name,
        COUNT(v.id) as violation_count,
        COUNT(DISTINCT v.drone_id) as drone_count,
        COUNT(DISTINCT v.location) as location_count,
        MIN(v.date) as first_detected,
        MAX(v.date) as last_detected
      FROM features f
      LEFT JOIN violations v ON f.name = v.type
      WHERE f.is_active = 1
      GROUP BY f.id, f.name, f.display_name
      ORDER BY violation_count DESC, f.display_name
    `);

    res.json({
      success: true,
      feature_stats: featureStats
    });
  } catch (error) {
    console.error('Error fetching feature stats:', error);
    res.status(500).json({ error: 'Failed to fetch feature statistics' });
  }
});

// Sync features from violations (called after upload)
router.post('/sync', async (req, res) => {
  try {
    await syncFeaturesFromViolations();
    res.json({
      success: true,
      message: 'Features synced successfully'
    });
  } catch (error) {
    console.error('Error syncing features:', error);
    res.status(500).json({ error: 'Failed to sync features' });
  }
});

// Delete a specific feature
router.delete('/:featureName', async (req, res) => {
  try {
    const { featureName } = req.params;
    
    // Delete the specific feature
    const result = await database.run('DELETE FROM features WHERE name = ?', [featureName]);
    
    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Feature not found'
      });
    }
    
    res.json({
      success: true,
      message: `Feature '${featureName}' deleted successfully`,
      data: { deleted_feature: featureName }
    });
  } catch (error) {
    console.error('Error deleting feature:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete feature'
    });
  }
});

// Get violations by specific feature
router.get('/:featureName/violations', async (req, res) => {
  try {
    const { featureName } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const violations = await database.all(`
      SELECT * FROM violations 
      WHERE type = ? 
      ORDER BY date DESC, timestamp DESC 
      LIMIT ? OFFSET ?
    `, [featureName, parseInt(limit), parseInt(offset)]);

    const totalCount = await database.get(
      'SELECT COUNT(*) as count FROM violations WHERE type = ?',
      [featureName]
    );

    res.json({
      success: true,
      feature_name: featureName,
      violations,
      total_count: totalCount.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching feature violations:', error);
    res.status(500).json({ error: 'Failed to fetch feature violations' });
  }
});

module.exports = router;