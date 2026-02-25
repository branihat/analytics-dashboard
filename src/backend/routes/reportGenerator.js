const express = require('express');
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Python service URL - supports both localhost and domain-based URLs
const PYTHON_SERVICE_URL = process.env.PYTHON_REPORT_SERVICE_URL || 'http://localhost:5000';

console.log('🐍 Python Report Service URL:', PYTHON_SERVICE_URL);

// Upload JSON to Python service
router.post('/upload-json', authenticateToken, async (req, res) => {
  try {
    console.log('📤 Forwarding JSON to Python service...');
    
    const jsonData = req.body;

    if (!jsonData || Object.keys(jsonData).length === 0) {
      return res.status(400).json({ error: 'No JSON data provided' });
    }

    // Forward to Python service
    const response = await axios.post(
      `${PYTHON_SERVICE_URL}/upload-json`,
      jsonData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 seconds
      }
    );

    console.log('✅ JSON uploaded to Python service');
    res.json({ message: 'JSON uploaded successfully', data: response.data });

  } catch (error) {
    console.error('❌ Upload JSON error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'Report generation service is unavailable. Please try again later.' 
      });
    }

    res.status(500).json({ 
      error: error.response?.data?.error || 'Failed to upload JSON to report service' 
    });
  }
});

// Generate report
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 Requesting report generation from Python service...');
    
    const { video_link } = req.body;

    if (!video_link) {
      return res.status(400).json({ error: 'Video link is required' });
    }

    // Request report generation from Python service
    const response = await axios.post(
      `${PYTHON_SERVICE_URL}/generate-report`,
      { video_link },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer', // Important for PDF
        timeout: 180000 // 3 minutes for report generation
      }
    );

    console.log('✅ Report generated successfully');

    // Forward the PDF to the client
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Drone_Report.pdf');
    res.send(Buffer.from(response.data));

  } catch (error) {
    console.error('❌ Generate report error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'Report generation service is unavailable. Please try again later.' 
      });
    }

    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ 
        error: 'Report generation timed out. Please try again.' 
      });
    }

    res.status(500).json({ 
      error: error.response?.data?.error || 'Failed to generate report' 
    });
  }
});

// Health check for Python service
router.get('/health', authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_SERVICE_URL}/`, { timeout: 5000 });
    res.json({ 
      status: 'connected', 
      message: response.data,
      serviceUrl: PYTHON_SERVICE_URL 
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'disconnected', 
      error: 'Python service is not reachable',
      serviceUrl: PYTHON_SERVICE_URL 
    });
  }
});

module.exports = router;
