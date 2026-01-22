const database = require('../utils/database');
const { droneReportSchema, violationQuerySchema } = require('../validations/violationValidations');
const { processImageUrl } = require('../utils/imageUtils');

class ViolationModel {
  async addReport(reportData) {
    const { error, value } = droneReportSchema.validate(reportData);
    if (error) {
      const errorMessage = error.details && error.details.length > 0 
        ? error.details[0].message 
        : 'Unknown validation error';
      throw new Error(`Validation error: ${errorMessage}`);
    }

    const existingReport = await database.get(
      'SELECT report_id FROM reports WHERE drone_id = ? AND date = ?',
      [value.drone_id, value.date]
    );
    
    if (existingReport) {
      console.log(`Report for drone ${value.drone_id} on ${value.date} already exists. Deleting existing data to allow re-upload.`);
      
      // Delete existing violations for this report
      await database.run('DELETE FROM violations WHERE report_id = ?', [existingReport.report_id]);
      
      // Delete existing report
      await database.run('DELETE FROM reports WHERE report_id = ?', [existingReport.report_id]);
      
      console.log(`Existing report ${existingReport.report_id} and its violations have been deleted.`);
    }

    const reportId = `${value.drone_id}_${value.date}_${Date.now()}`;

    try {
      await database.run(
        'INSERT INTO reports (report_id, drone_id, date, location, total_violations) VALUES (?, ?, ?, ?, ?)',
        [reportId, value.drone_id, value.date, value.location, value.total_violations || value.violations.length]
      );

      for (const violation of value.violations) {
        const existingViolation = await database.get(
          'SELECT id FROM violations WHERE id = ?',
          [violation.id]
        );
        
        if (existingViolation) {
          console.log(`Violation ${violation.id} already exists, skipping...`);
          continue;
        }

        // Process the image URL to handle Google Drive links
        const processedImageUrl = processImageUrl(violation.image_url);
        console.log(`Processing image URL: ${violation.image_url} -> ${processedImageUrl}`);

        await database.run(`
          INSERT INTO violations (id, report_id, drone_id, date, location, type, timestamp, latitude, longitude, image_url, confidence, frame_number)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          violation.id,
          reportId,
          value.drone_id,
          value.date,
          value.location,
          violation.type,
          violation.timestamp,
          violation.latitude,
          violation.longitude,
          processedImageUrl,
          violation.confidence || null,
          violation.frame_number || null
        ]);
      }

      // Sync features from the newly added violations
      try {
        const { syncFeaturesFromViolations } = require('../utils/featureSync');
        await syncFeaturesFromViolations();
      } catch (syncError) {
        console.log('Note: Could not sync features automatically:', syncError.message);
        // Don't fail the upload if sync fails
      }

      const report = {
        report_id: reportId,
        drone_id: value.drone_id,
        date: value.date,
        location: value.location,
        violations: value.violations,
        uploaded_at: new Date()
      };

      return report;
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async getViolations(queryParams = {}) {
    const { error, value } = violationQuerySchema.validate(queryParams);
    if (error) {
      const errorMessage = error.details && error.details.length > 0 
        ? error.details[0].message 
        : 'Unknown validation error';
      throw new Error(`Query validation error: ${errorMessage}`);
    }

    let query = 'SELECT * FROM violations WHERE 1=1';
    const params = [];

    if (value.drone_id && value.drone_id.trim() !== '') {
      query += ' AND drone_id = ?';
      params.push(value.drone_id);
    }
    
    if (value.date_from && value.date_from.trim() !== '') {
      query += ' AND date >= ?';
      params.push(value.date_from);
    }
    
    if (value.date_to && value.date_to.trim() !== '') {
      query += ' AND date <= ?';
      params.push(value.date_to);
    }
    
    if (value.violation_type && value.violation_type.trim() !== '') {
      query += ' AND type = ?';
      params.push(value.violation_type);
    }
    
    if (value.location && value.location.trim() !== '') {
      query += ' AND location LIKE ?';
      params.push(`%${value.location}%`);
    }

    let orderBy = 'date';
    switch (value.sort_by) {
      case 'timestamp':
        orderBy = 'timestamp';
        break;
      case 'type':
        orderBy = 'type';
        break;
      case 'drone_id':
        orderBy = 'drone_id';
        break;
      default:
        orderBy = 'date, timestamp';
    }
    
    query += ` ORDER BY ${orderBy} ${value.sort_order.toUpperCase()}`;

    try {
      const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total').split(' ORDER BY')[0];
      const countResult = await database.get(countQuery, params);
      const totalItems = countResult.total;

      const offset = (value.page - 1) * value.limit;
      query += ' LIMIT ? OFFSET ?';
      params.push(value.limit, offset);

      const violations = await database.all(query, params);

      return {
        violations,
        pagination: {
          current_page: value.page,
          total_pages: Math.ceil(totalItems / value.limit),
          total_items: totalItems,
          per_page: value.limit
        }
      };
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async getAnalytics() {
    try {
      const totalViolationsResult = await database.get('SELECT COUNT(*) as total FROM violations');
      const totalViolations = totalViolationsResult.total;
      
      const typeDistribution = await database.all(`
        SELECT type as name, COUNT(*) as value 
        FROM violations 
        GROUP BY type
      `);

      const timeSeriesData = await database.all(`
        SELECT date, COUNT(*) as violations 
        FROM violations 
        GROUP BY date 
        ORDER BY date
      `);

      const droneStats = await database.all(`
        SELECT 
          drone_id,
          COUNT(*) as total_violations,
          GROUP_CONCAT(type || ':' || type_count) as violation_breakdown
        FROM (
          SELECT 
            drone_id, 
            type,
            COUNT(*) as type_count
          FROM violations 
          GROUP BY drone_id, type
        ) 
        GROUP BY drone_id
      `);

      const dronePerformance = droneStats.map(stat => {
        const breakdown = {};
        if (stat.violation_breakdown) {
          stat.violation_breakdown.split(',').forEach(item => {
            const [type, count] = item.split(':');
            breakdown[type] = parseInt(count);
          });
        }
        return {
          drone_id: stat.drone_id,
          total_violations: stat.total_violations,
          violation_breakdown: breakdown
        };
      });

      const locationStats = await database.all(`
        SELECT location, COUNT(*) as violations 
        FROM violations 
        GROUP BY location
      `);

      const uniqueDrones = await database.get('SELECT COUNT(DISTINCT drone_id) as count FROM violations');
      const uniqueLocations = await database.get('SELECT COUNT(DISTINCT location) as count FROM violations');
      const uniqueTypes = await database.get('SELECT COUNT(DISTINCT type) as count FROM violations');

      return {
        kpis: {
          total_violations: totalViolations,
          unique_drones: uniqueDrones.count,
          unique_locations: uniqueLocations.count,
          violation_types: uniqueTypes.count
        },
        charts: {
          type_distribution: typeDistribution,
          time_series: timeSeriesData,
          drone_performance: dronePerformance,
          location_breakdown: locationStats
        }
      };
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async getFilterOptions() {
    try {
      const droneIds = await database.all('SELECT DISTINCT drone_id FROM violations ORDER BY drone_id');
      
      // Get all features from features table with proper display names
      const allFeatures = await database.all('SELECT name, display_name FROM features WHERE is_active = 1 ORDER BY display_name');
      
      const locations = await database.all('SELECT DISTINCT location FROM violations ORDER BY location');
      const dates = await database.all('SELECT DISTINCT date FROM violations ORDER BY date');

      return {
        drone_ids: droneIds.map(row => row.drone_id),
        violation_types: allFeatures.map(row => ({
          value: row.name,
          label: row.display_name
        })),
        locations: locations.map(row => row.location),
        dates: { 
          min: dates[0]?.date || null, 
          max: dates[dates.length - 1]?.date || null, 
          all: dates.map(row => row.date) 
        }
      };
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async getMapData() {
    try {
      const violations = await database.all(`
        SELECT id, type, latitude, longitude, timestamp, date, drone_id, location, image_url
        FROM violations
        ORDER BY date DESC, timestamp DESC
      `);
      
      return violations;
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async getReportCount() {
    try {
      const result = await database.get('SELECT COUNT(*) as total FROM reports');
      return result.total;
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async resetAllData(keepFeatures = true) {
    try {
      // Get counts before deletion for reporting
      const violationsCount = await database.get('SELECT COUNT(*) as total FROM violations');
      const reportsCount = await database.get('SELECT COUNT(*) as total FROM reports');
      
      // Delete all violations first (due to foreign key constraints)
      await database.run('DELETE FROM violations');
      
      // Delete all reports
      await database.run('DELETE FROM reports');
      
      if (!keepFeatures) {
        // Delete ALL features including defaults
        await database.run('DELETE FROM features');
        console.log('All features deleted (including defaults)');
      } else {
        // Current behavior - reset and re-add defaults
        await database.run('DELETE FROM features');
        
        // Re-initialize default features
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

        const { formatFeatureName } = require('../utils/featureSync');
        
        for (const featureName of defaultFeatures) {
          const displayName = formatFeatureName(featureName);
          await database.run(
            'INSERT INTO features (name, display_name) VALUES (?, ?)',
            [featureName, displayName]
          );
        }
      }
      
      console.log('All violations and reports data has been reset');
      
      return {
        violations_deleted: violationsCount.total,
        reports_deleted: reportsCount.total,
        features_reset: keepFeatures ? 'defaults_restored' : 'all_deleted'
      };
    } catch (err) {
      throw new Error(`Database error during reset: ${err.message}`);
    }
  }

  async migrateImageUrls() {
    try {
      // Get all violations with Google Drive URLs that need migration
      const violations = await database.all(`
        SELECT id, image_url 
        FROM violations 
        WHERE image_url LIKE '%drive.google.com%' 
        AND image_url NOT LIKE '%thumbnail%'
      `);

      let migratedCount = 0;
      
      for (const violation of violations) {
        const processedUrl = processImageUrl(violation.image_url);
        if (processedUrl !== violation.image_url) {
          await database.run(
            'UPDATE violations SET image_url = ? WHERE id = ?',
            [processedUrl, violation.id]
          );
          migratedCount++;
          console.log(`Migrated image URL for violation ${violation.id}: ${violation.image_url} -> ${processedUrl}`);
        }
      }
      
      console.log(`Migrated ${migratedCount} image URLs to thumbnail format`);
      return { migrated_count: migratedCount };
    } catch (err) {
      throw new Error(`Database error during image URL migration: ${err.message}`);
    }
  }

  async bulkInsert(violations) {
    try {
      let insertedCount = 0;
      let failedCount = 0;

      for (const violation of violations) {
        try {
          // Check if violation already exists
          const existing = await database.get(
            'SELECT id FROM violations WHERE id = ?',
            [violation.id]
          );

          if (existing) {
            console.log(`Violation ${violation.id} already exists, skipping...`);
            failedCount++;
            continue;
          }

          // Insert violation with all original data including timestamps
          await database.run(`
            INSERT INTO violations (
              id, report_id, drone_id, date, location, type, 
              timestamp, latitude, longitude, image_url, 
              confidence, frame_number
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            violation.id,
            violation.report_id || null,
            violation.drone_id,
            violation.date,
            violation.location,
            violation.type,
            violation.timestamp,
            violation.latitude,
            violation.longitude,
            violation.image_url,
            violation.confidence || null,
            violation.frame_number || null
          ]);

          insertedCount++;
        } catch (err) {
          console.error(`Failed to insert violation ${violation.id}:`, err.message);
          failedCount++;
        }
      }

      // Sync features after bulk insert
      try {
        const { syncFeaturesFromViolations } = require('../utils/featureSync');
        await syncFeaturesFromViolations();
      } catch (syncError) {
        console.log('Note: Could not sync features automatically:', syncError.message);
      }

      return {
        inserted_count: insertedCount,
        failed_count: failedCount
      };
    } catch (err) {
      throw new Error(`Bulk insert error: ${err.message}`);
    }
  }
}

module.exports = new ViolationModel(); 