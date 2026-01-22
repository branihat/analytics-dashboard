const express = require('express');
const ViolationModel = require('../models/Violation');

const router = express.Router();

// Restore violations with original timestamps and data
router.post('/violations', async (req, res) => {
  try {
    const { violations } = req.body;

    if (!violations || !Array.isArray(violations)) {
      return res.status(400).json({
        error: 'Invalid data format',
        message: 'Expected an array of violations in the request body'
      });
    }

    const result = await ViolationModel.bulkInsert(violations);

    res.json({
      success: true,
      message: 'Violations restored successfully',
      data: {
        inserted_count: result.inserted_count,
        failed_count: result.failed_count
      }
    });

  } catch (error) {
    console.error('Restore violations error:', error);
    res.status(500).json({
      error: 'Failed to restore violations',
      message: error.message
    });
  }
});

module.exports = router;
