const express = require('express');
const router = express.Router();
const database = require('../utils/database');
const { body, validationResult } = require('express-validator');

// Validation middleware
const validateVideoLink = [
  body('title').notEmpty().withMessage('Title is required').isLength({ max: 255 }).withMessage('Title too long'),
  body('video_url').isURL().withMessage('Valid URL is required'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description too long'),
  body('feature_id').optional().isString(),
  body('site_id').optional().isString()
];

// Get all video links
router.get('/', async (req, res) => {
  try {
    const { feature_id, site_id, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT vl.*, 
             f.display_name as feature_name
      FROM videos_links vl
      LEFT JOIN features f ON vl.feature_id = f.name
      WHERE 1=1
    `;
    const params = [];

    if (feature_id) {
      query += ' AND vl.feature_id = ?';
      params.push(feature_id);
    }

    if (site_id) {
      query += ' AND vl.site_id = ?';
      params.push(site_id);
    }

    query += ' ORDER BY vl.create_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const videoLinks = await database.all(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM videos_links WHERE 1=1';
    const countParams = [];
    
    if (feature_id) {
      countQuery += ' AND feature_id = ?';
      countParams.push(feature_id);
    }
    
    if (site_id) {
      countQuery += ' AND site_id = ?';
      countParams.push(site_id);
    }

    const totalResult = await database.get(countQuery, countParams);

    res.json({
      success: true,
      data: videoLinks,
      pagination: {
        total: totalResult.total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: totalResult.total > (parseInt(offset) + parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching video links:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch video links' 
    });
  }
});

// Get single video link by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const videoLink = await database.get(`
      SELECT vl.*, 
             f.display_name as feature_name
      FROM videos_links vl
      LEFT JOIN features f ON vl.feature_id = f.name
      WHERE vl.id = ?
    `, [id]);

    if (!videoLink) {
      return res.status(404).json({
        success: false,
        error: 'Video link not found'
      });
    }

    res.json({
      success: true,
      data: videoLink
    });
  } catch (error) {
    console.error('Error fetching video link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch video link'
    });
  }
});

// Create new video link
router.post('/', validateVideoLink, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { title, description, video_url, feature_id, site_id } = req.body;

    // Validate that site_id is provided (features are now optional)
    if (!site_id) {
      return res.status(400).json({
        success: false,
        error: 'site_id must be provided'
      });
    }

    // If feature_id is provided, validate it exists
    if (feature_id) {
      const featureExists = await database.get('SELECT id FROM features WHERE name = ?', [feature_id]);
      if (!featureExists) {
        return res.status(400).json({
          success: false,
          error: 'Invalid feature_id provided'
        });
      }
    }

    const result = await database.run(`
      INSERT INTO videos_links (title, description, video_url, feature_id, site_id)
      VALUES (?, ?, ?, ?, ?)
    `, [title, description || null, video_url, feature_id || null, site_id || null]);

    const newVideoLink = await database.get(`
      SELECT vl.*, 
             f.display_name as feature_name
      FROM videos_links vl
      LEFT JOIN features f ON vl.feature_id = f.name
      WHERE vl.id = ?
    `, [result.lastID]);

    res.status(201).json({
      success: true,
      message: 'Video link created successfully',
      data: newVideoLink
    });
  } catch (error) {
    console.error('Error creating video link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create video link'
    });
  }
});

// Update video link
router.put('/:id', validateVideoLink, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { title, description, video_url, feature_id, site_id } = req.body;

    // Check if video link exists
    const existingLink = await database.get('SELECT id FROM videos_links WHERE id = ?', [id]);
    if (!existingLink) {
      return res.status(404).json({
        success: false,
        error: 'Video link not found'
      });
    }

    // Validate that site_id is provided (features are now optional)
    if (!site_id) {
      return res.status(400).json({
        success: false,
        error: 'site_id must be provided'
      });
    }

    // If feature_id is provided, validate it exists
    if (feature_id) {
      const featureExists = await database.get('SELECT id FROM features WHERE name = ?', [feature_id]);
      if (!featureExists) {
        return res.status(400).json({
          success: false,
          error: 'Invalid feature_id provided'
        });
      }
    }

    await database.run(`
      UPDATE videos_links 
      SET title = ?, description = ?, video_url = ?, feature_id = ?, site_id = ?, update_date = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [title, description || null, video_url, feature_id || null, site_id || null, id]);

    const updatedVideoLink = await database.get(`
      SELECT vl.*, 
             f.display_name as feature_name
      FROM videos_links vl
      LEFT JOIN features f ON vl.feature_id = f.name
      WHERE vl.id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Video link updated successfully',
      data: updatedVideoLink
    });
  } catch (error) {
    console.error('Error updating video link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update video link'
    });
  }
});

// Delete video link
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingLink = await database.get('SELECT id FROM videos_links WHERE id = ?', [id]);
    if (!existingLink) {
      return res.status(404).json({
        success: false,
        error: 'Video link not found'
      });
    }

    await database.run('DELETE FROM videos_links WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Video link deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting video link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete video link'
    });
  }
});

// Get video links by feature
router.get('/feature/:featureId', async (req, res) => {
  try {
    const { featureId } = req.params;
    
    const videoLinks = await database.all(`
      SELECT vl.*, 
             f.display_name as feature_name
      FROM videos_links vl
      LEFT JOIN features f ON vl.feature_id = f.name
      WHERE vl.feature_id = ?
      ORDER BY vl.create_date DESC
    `, [featureId]);

    res.json({
      success: true,
      feature_id: featureId,
      data: videoLinks
    });
  } catch (error) {
    console.error('Error fetching feature video links:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch feature video links'
    });
  }
});

// Get video links by site
router.get('/site/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    
    const videoLinks = await database.all(`
      SELECT * FROM videos_links 
      WHERE site_id = ?
      ORDER BY create_date DESC
    `, [siteId]);

    res.json({
      success: true,
      site_id: siteId,
      data: videoLinks
    });
  } catch (error) {
    console.error('Error fetching site video links:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch site video links'
    });
  }
});

// Get statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await database.all(`
      SELECT 
        COUNT(*) as total_links,
        COUNT(CASE WHEN feature_id IS NOT NULL THEN 1 END) as feature_links,
        COUNT(CASE WHEN site_id IS NOT NULL THEN 1 END) as site_links,
        COUNT(CASE WHEN update_date IS NOT NULL THEN 1 END) as updated_links
      FROM videos_links
    `);

    const featureStats = await database.all(`
      SELECT 
        vl.feature_id,
        f.display_name as feature_name,
        COUNT(*) as link_count
      FROM videos_links vl
      LEFT JOIN features f ON vl.feature_id = f.name
      WHERE vl.feature_id IS NOT NULL
      GROUP BY vl.feature_id, f.display_name
      ORDER BY link_count DESC
    `);

    const siteStats = await database.all(`
      SELECT 
        site_id,
        COUNT(*) as link_count
      FROM videos_links
      WHERE site_id IS NOT NULL
      GROUP BY site_id
      ORDER BY link_count DESC
    `);

    res.json({
      success: true,
      stats: {
        overview: stats[0],
        by_feature: featureStats,
        by_site: siteStats
      }
    });
  } catch (error) {
    console.error('Error fetching video links stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

module.exports = router;