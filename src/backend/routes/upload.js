const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ViolationModel = require('../models/Violation');
const { syncFeaturesFromViolations } = require('../utils/featureSync');

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/reports';
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/json' || path.extname(file.originalname).toLowerCase() === '.json') {
    cb(null, true);
  } else {
    cb(new Error('Only JSON files are allowed'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.post('/report', upload.single('report'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please upload a JSON file containing the drone violation report'
      });
    }

    const filePath = req.file.path;
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    let reportData;
    try {
      reportData = JSON.parse(fileContent);
    } catch (parseError) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        error: 'Invalid JSON format',
        message: 'The uploaded file contains invalid JSON'
      });
    }

    try {
      const savedReport = await ViolationModel.addReport(reportData);
      
      // Sync features from newly uploaded violations
      try {
        await syncFeaturesFromViolations();
        console.log('Features synced after report upload');
      } catch (syncError) {
        console.error('Error syncing features after upload:', syncError);
        // Don't fail the upload if sync fails
      }
      
      fs.unlinkSync(filePath);

      res.status(201).json({
        success: true,
        message: 'Drone report uploaded and processed successfully',
        data: {
          report_id: savedReport.report_id,
          drone_id: savedReport.drone_id,
          date: savedReport.date,
          location: savedReport.location,
          violations_count: savedReport.violations.length,
          uploaded_at: savedReport.uploaded_at
        }
      });

    } catch (validationError) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        error: 'Validation failed',
        message: validationError.message
      });
    }

  } catch (error) {
    console.error('Upload error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process the uploaded report'
    });
  }
});

router.post('/json', async (req, res) => {
  try {
    const reportData = req.body;

    if (!reportData || Object.keys(reportData).length === 0) {
      return res.status(400).json({
        error: 'Empty request body',
        message: 'Please provide drone violation report data'
      });
    }

    try {
      const savedReport = await ViolationModel.addReport(reportData);

      // Sync features from newly uploaded violations
      try {
        await syncFeaturesFromViolations();
        console.log('Features synced after JSON upload');
      } catch (syncError) {
        console.error('Error syncing features after upload:', syncError);
        // Don't fail the upload if sync fails
      }

      res.status(201).json({
        success: true,
        message: 'Drone report processed successfully',
        data: {
          report_id: savedReport.report_id,
          drone_id: savedReport.drone_id,
          date: savedReport.date,
          location: savedReport.location,
          violations_count: savedReport.violations.length,
          uploaded_at: savedReport.uploaded_at
        }
      });

    } catch (validationError) {
      return res.status(400).json({
        error: 'Validation failed',
        message: validationError.message
      });
    }

  } catch (error) {
    console.error('JSON upload error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process the report data'
    });
  }
});

router.get('/status', async (req, res) => {
  try {
    const analytics = await ViolationModel.getAnalytics();
    const reportCount = await ViolationModel.getReportCount();
    
    res.json({
      success: true,
      upload_status: {
        total_reports: reportCount,
        total_violations: analytics.kpis.total_violations,
        unique_drones: analytics.kpis.unique_drones,
        unique_locations: analytics.kpis.unique_locations,
        last_upload: null // Can be enhanced later with last upload timestamp
      }
    });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ error: 'Failed to get upload status' });
  }
});

// Sample data clearing endpoint removed - using real data only

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'The uploaded file exceeds the maximum size limit'
      });
    }
    return res.status(400).json({ error: 'Upload error', message: error.message });
  }
  
  if (error.message === 'Only JSON files are allowed') {
    return res.status(400).json({
      error: 'Invalid file type',
      message: 'Only JSON files are allowed for drone reports'
    });
  }
  
  next(error);
});

module.exports = router; 