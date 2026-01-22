const express = require('express');
const ViolationModel = require('../models/Violation');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await ViolationModel.getViolations(req.query);
    res.json({
      success: true,
      data: result.violations,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get violations error:', error);

    if (error.message.includes('validation error')) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to retrieve violations',
      message: 'Internal server error'
    });
  }
});

router.get('/filters', async (req, res) => {
  try {
    const filterOptions = await ViolationModel.getFilterOptions();
    res.json({ success: true, filters: filterOptions });
  } catch (error) {
    console.error('Get filter options error:', error);
    res.status(500).json({
      error: 'Failed to get filter options',
      message: 'Internal server error'
    });
  }
});

router.get('/map', async (req, res) => {
  try {
    const mapData = await ViolationModel.getMapData();

    let filteredData = mapData;

    if (req.query.drone_id) {
      filteredData = filteredData.filter(v => v.drone_id === req.query.drone_id);
    }

    if (req.query.violation_type) {
      filteredData = filteredData.filter(v => v.type === req.query.violation_type);
    }

    if (req.query.date_from) {
      filteredData = filteredData.filter(v => v.date >= req.query.date_from);
    }

    if (req.query.date_to) {
      filteredData = filteredData.filter(v => v.date <= req.query.date_to);
    }

    res.json({
      success: true,
      markers: filteredData,
      count: filteredData.length
    });
  } catch (error) {
    console.error('Get map data error:', error);
    res.status(500).json({
      error: 'Failed to get map data',
      message: 'Internal server error'
    });
  }
});

router.get('/search/:term', async (req, res) => {
  try {
    const searchTerm = req.params.term.toLowerCase();

    const allViolations = await ViolationModel.getMapData();

    const searchResults = allViolations.filter(violation =>
      violation.type.toLowerCase().includes(searchTerm) ||
      violation.location.toLowerCase().includes(searchTerm) ||
      violation.drone_id.toLowerCase().includes(searchTerm)
    );

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedResults = searchResults.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedResults,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(searchResults.length / limit),
        total_items: searchResults.length,
        per_page: limit
      },
      search: {
        term: req.params.term,
        results_count: searchResults.length
      }
    });
  } catch (error) {
    console.error('Search violations error:', error);
    res.status(500).json({ error: 'Search failed', message: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const violationId = req.params.id;
    const allViolations = await ViolationModel.getMapData();
    const violation = allViolations.find(v => v.id === violationId);

    if (!violation) {
      return res.status(404).json({
        error: 'Violation not found',
        message: `No violation found with ID: ${violationId}`
      });
    }

    res.json({ success: true, data: violation });
  } catch (error) {
    console.error('Get violation by ID error:', error);
    res.status(500).json({ error: 'Failed to get violation', message: 'Internal server error' });
  }
});

// Reset all violations data (clear test data)
router.delete('/reset', async (req, res) => {
  try {
    const keepFeatures = req.query.keep_features !== 'false';
    const result = await ViolationModel.resetAllData(keepFeatures);
    
    res.json({
      success: true,
      message: keepFeatures 
        ? 'All violations data has been reset successfully' 
        : 'All violations and features data has been reset successfully',
      data: result
    });
  } catch (error) {
    console.error('Reset violations error:', error);
    res.status(500).json({
      error: 'Failed to reset violations data',
      message: 'Internal server error'
    });
  }
});

// Migrate image URLs to proper format
router.post('/migrate-images', async (req, res) => {
  try {
    const result = await ViolationModel.migrateImageUrls();
    res.json({
      success: true,
      message: 'Image URLs migrated successfully',
      data: {
        migrated_count: result.migrated_count
      }
    });
  } catch (error) {
    console.error('Migrate image URLs error:', error);
    res.status(500).json({
      error: 'Failed to migrate image URLs',
      message: 'Internal server error'
    });
  }
});

module.exports = router; 