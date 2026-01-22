const express = require('express');
const router = express.Router();
const database = require('../utils/database');
const { body, validationResult } = require('express-validator');

// Validation middleware
const validateSite = [
    body('name').notEmpty().withMessage('Site name is required').isLength({ max: 100 }).withMessage('Site name too long'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description too long')
];

// Get all sites
router.get('/', async (req, res) => {
    try {
        const sites = await database.all(`
      SELECT s.*, 
             COUNT(vl.id) as video_count
      FROM sites s
      LEFT JOIN videos_links vl ON s.id = vl.site_id
      GROUP BY s.id, s.name, s.description, s.created_at
      ORDER BY s.name ASC
    `);

        res.json({
            success: true,
            data: sites
        });
    } catch (error) {
        console.error('Error fetching sites:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch sites'
        });
    }
});

// Get single site by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const site = await database.get(`
      SELECT s.*, 
             COUNT(vl.id) as video_count
      FROM sites s
      LEFT JOIN videos_links vl ON s.id = vl.site_id
      WHERE s.id = ?
      GROUP BY s.id, s.name, s.description, s.created_at
    `, [id]);

        if (!site) {
            return res.status(404).json({
                success: false,
                error: 'Site not found'
            });
        }

        res.json({
            success: true,
            data: site
        });
    } catch (error) {
        console.error('Error fetching site:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch site'
        });
    }
});

// Create new site
router.post('/', validateSite, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { name, description } = req.body;

        // Check if site name already exists
        const existingSite = await database.get('SELECT id FROM sites WHERE name = ?', [name]);
        if (existingSite) {
            return res.status(400).json({
                success: false,
                error: 'Site name already exists'
            });
        }

        const result = await database.run(`
      INSERT INTO sites (name, description)
      VALUES (?, ?)
    `, [name, description || null]);

        const newSite = await database.get(`
      SELECT * FROM sites WHERE id = ?
    `, [result.lastID]);

        res.status(201).json({
            success: true,
            message: 'Site created successfully',
            data: newSite
        });
    } catch (error) {
        console.error('Error creating site:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create site'
        });
    }
});

// Update site
router.put('/:id', validateSite, async (req, res) => {
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
        const { name, description } = req.body;

        // Check if site exists
        const existingSite = await database.get('SELECT id FROM sites WHERE id = ?', [id]);
        if (!existingSite) {
            return res.status(404).json({
                success: false,
                error: 'Site not found'
            });
        }

        // Check if new name conflicts with another site
        const nameConflict = await database.get('SELECT id FROM sites WHERE name = ? AND id != ?', [name, id]);
        if (nameConflict) {
            return res.status(400).json({
                success: false,
                error: 'Site name already exists'
            });
        }

        await database.run(`
      UPDATE sites 
      SET name = ?, description = ?
      WHERE id = ?
    `, [name, description || null, id]);

        const updatedSite = await database.get(`
      SELECT * FROM sites WHERE id = ?
    `, [id]);

        res.json({
            success: true,
            message: 'Site updated successfully',
            data: updatedSite
        });
    } catch (error) {
        console.error('Error updating site:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update site'
        });
    }
});

// Delete site
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const existingSite = await database.get('SELECT id FROM sites WHERE id = ?', [id]);
        if (!existingSite) {
            return res.status(404).json({
                success: false,
                error: 'Site not found'
            });
        }

        // Check if site has associated video links
        const hasVideoLinks = await database.get('SELECT id FROM videos_links WHERE site_id = ?', [id]);
        if (hasVideoLinks) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete site with associated video links'
            });
        }

        await database.run('DELETE FROM sites WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Site deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting site:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete site'
        });
    }
});

module.exports = router;