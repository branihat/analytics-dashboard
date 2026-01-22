const database = require('./database');

// Helper function to format feature names
const formatFeatureName = (name) => {
  return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// Helper function to normalize feature names to standard format
const normalizeFeatureName = (name) => {
  // Convert to lowercase and replace spaces with underscores
  let normalized = name.toLowerCase().replace(/\s+/g, '_');
  
  // Handle specific mappings for common variations
  const mappings = {
    'people_crowding': 'crowding_of_people',
    'ppe_kit_detection': 'ppe_kit_detection',
    'fire_smoke': 'fire_smoke',
    'crowding_of_people': 'crowding_of_people',
    'crowding_of_vehicles': 'crowding_of_vehicles',
    'rest_shelter_lighting': 'rest_shelter_lighting',
    'stagnant_water': 'stagnant_water',
    'loose_boulder': 'loose_boulder',
    'red_flag': 'red_flag'
  };
  
  return mappings[normalized] || normalized;
};

// Function to sync features from uploaded violations
const syncFeaturesFromViolations = async () => {
  try {
    // Get all unique violation types from violations table
    const violationTypes = await database.all(
      'SELECT DISTINCT type FROM violations WHERE type IS NOT NULL'
    );

    // Add any new features found in violations
    for (const violation of violationTypes) {
      const originalType = violation.type;
      const normalizedName = normalizeFeatureName(originalType);
      const displayName = formatFeatureName(normalizedName);
      
      // Insert or update the feature
      await database.run(
        'INSERT OR IGNORE INTO features (name, display_name) VALUES (?, ?)',
        [normalizedName, displayName]
      );
      
      // Update existing violations to use the normalized feature name
      await database.run(
        'UPDATE violations SET type = ? WHERE type = ?',
        [normalizedName, originalType]
      );
    }
    
    // Clean up duplicate features by keeping only the normalized ones
    await cleanupDuplicateFeatures();
    
    console.log(`Synced ${violationTypes.length} features from violations`);
  } catch (error) {
    console.error('Error syncing features from violations:', error);
    throw error;
  }
};

// Function to clean up duplicate features
const cleanupDuplicateFeatures = async () => {
  try {
    // Get all features
    const allFeatures = await database.all('SELECT * FROM features ORDER BY id');
    const seenNames = new Set();
    const toDelete = [];
    
    for (const feature of allFeatures) {
      const normalizedName = normalizeFeatureName(feature.name);
      
      if (seenNames.has(normalizedName)) {
        // This is a duplicate, mark for deletion
        toDelete.push(feature.id);
      } else {
        seenNames.add(normalizedName);
        // Update the feature to use normalized name if needed
        if (feature.name !== normalizedName) {
          await database.run(
            'UPDATE features SET name = ?, display_name = ? WHERE id = ?',
            [normalizedName, formatFeatureName(normalizedName), feature.id]
          );
        }
      }
    }
    
    // Delete duplicate features
    for (const id of toDelete) {
      await database.run('DELETE FROM features WHERE id = ?', [id]);
    }
    
    if (toDelete.length > 0) {
      console.log(`Cleaned up ${toDelete.length} duplicate features`);
    }
  } catch (error) {
    console.error('Error cleaning up duplicate features:', error);
  }
};

module.exports = {
  syncFeaturesFromViolations,
  formatFeatureName
};