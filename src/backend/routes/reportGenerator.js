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

// Generate report and upload to Inferred Reports
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 Requesting report generation from Python service...');
    
    const { video_link, site_name, report_date } = req.body;

    if (!video_link) {
      return res.status(400).json({ error: 'Video link is required' });
    }

    if (!site_name) {
      return res.status(400).json({ error: 'Site name is required' });
    }

    if (!report_date) {
      return res.status(400).json({ error: 'Report date is required' });
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

    const pdfBuffer = Buffer.from(response.data);
    const timestamp = Date.now();
    const filename = `AI_Report_${timestamp}.pdf`;

    // Upload to Cloudinary
    console.log('☁️ Uploading report to Cloudinary...');
    const cloudinary = require('cloudinary').v2;
    
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dgf5874nz',
      api_key: process.env.CLOUDINARY_API_KEY || '873245158622578',
      api_secret: process.env.CLOUDINARY_API_SECRET || '3DF8o9ZZD-WIzuSKfS6kFQoVzp4'
    });

    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          folder: 'inferred-reports/ai-generated',
          public_id: filename.replace('.pdf', ''),
          format: 'pdf',
          type: 'upload',
          access_mode: 'public',
          chunk_size: 6000000 // 6MB chunks for large files
        },
        (error, result) => {
          if (error) {
            console.log('❌ Cloudinary upload failed:', error.message);
            reject(error);
          } else {
            console.log('✅ Cloudinary upload successful:', result.secure_url);
            resolve(result);
          }
        }
      );
      uploadStream.end(pdfBuffer);
    });

    // Save to Inferred Reports database
    console.log('💾 Saving to Inferred Reports...');
    const InferredReports = require('../models/InferredReports');
    
    // Determine department
    let department = req.user.department;
    if (!department) {
      if (req.user.role === 'admin' || req.user.userType === 'admin') {
        department = 'Admin';
      } else if (req.user.username === 'AEROVANIA MASTER' || req.user.role === 'super_admin') {
        department = 'Super Admin';
      } else {
        department = 'Admin';
      }
    }

    const documentData = {
      filename: filename,
      cloudinary_url: uploadResult.secure_url,
      cloudinary_public_id: uploadResult.public_id,
      site_name: site_name,
      department: department,
      uploaded_by: req.user.id,
      file_size: pdfBuffer.length,
      hyperlink: video_link,
      organization_id: req.user.organizationId,
      upload_date: new Date(report_date).toISOString()
    };

    const document = await InferredReports.createDocument(documentData);
    console.log('✅ Saved to Inferred Reports, document ID:', document.id);

    // Return success with document info
    res.json({
      success: true,
      message: 'Report generated and uploaded to Inferred Reports successfully',
      document: {
        id: document.id,
        filename: document.filename,
        cloudinary_url: document.cloudinary_url,
        site_name: document.site_name,
        upload_date: document.upload_date
      }
    });

  } catch (error) {
    console.error('❌ Generate report error:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error response:', error.response?.data);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'Report generation service is unavailable. Please try again later.',
        details: 'Python service not reachable at ' + PYTHON_SERVICE_URL
      });
    }

    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ 
        error: 'Report generation timed out. Please try again.',
        details: 'Request exceeded 180 second timeout'
      });
    }

    // More detailed error response
    const errorMessage = error.response?.data?.error || error.message || 'Failed to generate report';
    const errorDetails = {
      error: errorMessage,
      code: error.code,
      stage: error.response ? 'python_service' : 'backend_processing'
    };

    res.status(500).json(errorDetails);
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
