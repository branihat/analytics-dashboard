const express = require('express');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const InferredReports = require('../models/InferredReports');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dgf5874nz',
  api_key: process.env.CLOUDINARY_API_KEY || '873245158622578',
  api_secret: process.env.CLOUDINARY_API_SECRET || '3DF8o9ZZD-WIzuSKfS6kFQoVzp4'
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Helper function to get department folder name
const getDepartmentFolder = (department) => {
  const departmentMap = {
    'E&T Department': 'et-department',
    'Security Department': 'security-department',
    'Operation Department': 'operation-department',
    'Survey Department': 'survey-department',
    'Safety Department': 'safety-department',
    'Admin': 'admin',
    'Super Admin': 'super-admin'
  };
  return departmentMap[department] || 'general';
};

// Upload Inferred Report document
router.post('/upload', authenticateToken, upload.single('pdf'), async (req, res) => {
  try {
    console.log('🔍 Inferred Report Upload Request Started');
    console.log('📤 User:', req.user?.username, 'Department:', req.user?.department);
    console.log('📁 File received:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'No file');

    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.userType !== 'admin' && req.user.username !== 'AEROVANIA MASTER') {
      console.log('❌ Access denied - User is not admin');
      return res.status(403).json({ error: 'Only admins can upload inferred reports' });
    }

    if (!req.file) {
      console.log('❌ No file provided in request');
      return res.status(400).json({ error: 'No PDF file provided' });
    }

    // Get fields from request body
    const { hyperlink, siteName } = req.body;

    // Hyperlink is optional - can be added later via edit

    // Determine department based on user role
    let department = req.user.department;
    
    // If user is admin/super admin and has no department, use their role as department
    if (!department) {
      if (req.user.role === 'admin' || req.user.userType === 'admin') {
        department = 'Admin';
      } else if (req.user.username === 'AEROVANIA MASTER' || req.user.role === 'super_admin') {
        department = 'Super Admin';
      } else {
        console.log('❌ User has no department assigned');
        return res.status(400).json({ error: 'User department not found' });
      }
    }

    const departmentFolder = getDepartmentFolder(department);
    const timestamp = Date.now();
    const filename = `${timestamp}_${req.file.originalname}`;

    console.log('📂 Department:', department);
    console.log('📂 Department folder:', departmentFolder);
    console.log('📄 Generated filename:', filename);

    // Upload to Cloudinary
    console.log('☁️ Starting Cloudinary upload...');
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          folder: `inferred-reports/${departmentFolder}`,
          public_id: filename.replace('.pdf', ''),
          format: 'pdf',
          type: 'upload',
          access_mode: 'public'
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
      ).end(req.file.buffer);
    });

    // Save to database
    console.log('💾 Saving to database...');
    const documentData = {
      filename: req.file.originalname,
      cloudinary_url: uploadResult.secure_url,
      cloudinary_public_id: uploadResult.public_id,
      site_name: siteName || null,
      department: department,
      uploaded_by: req.user.id,
      file_size: req.file.size,
      hyperlink: hyperlink || null
    };

    const document = await InferredReports.createDocument(documentData);
    console.log('✅ Database save successful, document ID:', document.id);

    res.status(201).json({
      message: 'Inferred Report uploaded successfully',
      document: {
        id: document.id,
        filename: document.filename,
        department: document.department,
        upload_date: document.upload_date,
        file_size: document.file_size,
        hyperlink: document.hyperlink
      }
    });

    console.log('🎉 Inferred Report Upload completed successfully');

  } catch (error) {
    console.error('❌ Inferred Report Upload error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to upload document: ' + error.message });
  }
});

// Get Inferred Reports with filtering
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const { department, site, startDate, search } = req.query;
    
    // All users (admin and regular) can see all inferred reports
    // Regular users can upload ATRs but cannot upload/edit/delete inferred reports
    const documents = await InferredReports.getAllDocuments();
    console.log('📊 Backend - Fetched documents count:', documents.length);
    if (documents.length > 0) {
      console.log('📊 Backend - First document:', documents[0]);
    }

    // Apply filters
    if (department && department !== 'all') {
      documents = documents.filter(doc => doc.department === department);
    }
    
    if (site && site !== 'all') {
      documents = documents.filter(doc => doc.site_name === site);
    }

    if (startDate) {
      const filterDate = new Date(startDate);
      filterDate.setHours(0, 0, 0, 0); // Set to start of day
      documents = documents.filter(doc => {
        const docDate = new Date(doc.upload_date);
        docDate.setHours(0, 0, 0, 0); // Set to start of day
        return docDate.getTime() === filterDate.getTime();
      });
    }
    
    if (search && search.trim()) {
      const searchTerm = search.toLowerCase().trim();
      documents = documents.filter(doc => 
        (doc.filename && doc.filename.toLowerCase().includes(searchTerm)) ||
        (doc.site_name && doc.site_name.toLowerCase().includes(searchTerm)) ||
        (doc.comment && doc.comment.toLowerCase().includes(searchTerm))
      );
    }

    // Get ATR status for each document
    const database = require('../utils/databaseHybrid');
    const documentsWithAtr = await Promise.all(
      documents.map(async (doc) => {
        try {
          const atr = await database.get(
            'SELECT id, filename, cloudinary_url FROM atr_documents WHERE inferred_report_id = ?',
            [doc.id]
          );
          
          return {
            id: doc.id,
            filename: doc.filename,
            site_name: doc.site_name || null,
            department: doc.department,
            uploaded_by: doc.uploaded_by_name || 'Unknown',
            upload_date: doc.upload_date,
            file_size: doc.file_size,
            cloudinary_url: doc.cloudinary_url,
            comment: doc.comment || null,
            ai_report_url: doc.ai_report_url || null,
            ai_report_public_id: doc.ai_report_public_id || null,
            hyperlink: doc.hyperlink || null,
            canDelete: doc.uploaded_by === req.user.id || req.user.role === 'admin',
            canEdit: doc.uploaded_by === req.user.id || req.user.role === 'admin',
            hasAtr: !!atr,
            atrId: atr?.id || null,
            atrFilename: atr?.filename || null,
            atrUrl: atr?.cloudinary_url || null
          };
        } catch (error) {
          console.error('Error fetching ATR for document:', doc.id, error);
          return {
            ...doc,
            hasAtr: false,
            atrId: null,
            atrFilename: null,
            atrUrl: null
          };
        }
      })
    );

    res.json({
      documents: documentsWithAtr
    });

  } catch (error) {
    console.error('❌ List documents error:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to fetch documents: ' + error.message });
  }
});

// View/Download Inferred Report document
router.get('/view/:id', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Inferred Report View Request - Document ID:', req.params.id);
    console.log('👤 User:', req.user?.username, 'Department:', req.user?.department);

    const document = await InferredReports.getDocumentById(req.params.id);

    if (!document) {
      console.log('❌ Document not found:', req.params.id);
      return res.status(404).json({ error: 'Document not found' });
    }

    // All authenticated users can view inferred reports
    // No department check needed

    console.log('📄 Document found:', document.filename);
    console.log('🔗 Cloudinary public_id:', document.cloudinary_public_id);
    console.log('🔗 Cloudinary URL:', document.cloudinary_url);

    // Use direct Cloudinary URL
    const viewUrl = document.cloudinary_url;

    console.log('✅ Using direct Cloudinary URL:', viewUrl);

    // Return the URL for viewing
    res.json({
      filename: document.filename,
      url: viewUrl,
      department: document.department,
      upload_date: document.upload_date
    });

  } catch (error) {
    console.error('❌ View document error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to access document: ' + error.message });
  }
});

// Update comment
router.patch('/:id/comment', authenticateToken, async (req, res) => {
  try {
    const { comment } = req.body;
    const document = await InferredReports.getDocumentById(req.params.id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if user can edit
    const canEdit = req.user.role === 'admin' ||
      req.user.userType === 'admin' ||
      document.uploaded_by === req.user.id;

    if (!canEdit) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    await InferredReports.updateComment(req.params.id, comment);
    res.json({ message: 'Comment updated successfully', comment });

  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ error: 'Failed to update comment: ' + error.message });
  }
});

// Update hyperlink
router.patch('/:id/hyperlink', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.userType !== 'admin' && req.user.username !== 'AEROVANIA MASTER') {
      console.log('❌ Access denied - User is not admin');
      return res.status(403).json({ error: 'Only admins can edit hyperlinks' });
    }

    const { hyperlink } = req.body;
    const document = await InferredReports.getDocumentById(req.params.id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    await InferredReports.updateHyperlink(req.params.id, hyperlink);
    res.json({ message: 'Hyperlink updated successfully', hyperlink });

  } catch (error) {
    console.error('Update hyperlink error:', error);
    res.status(500).json({ error: 'Failed to update hyperlink: ' + error.message });
  }
});

// Upload AI Report PDF
router.post('/:id/ai-report', authenticateToken, upload.single('pdf'), async (req, res) => {
  try {
    console.log('🔍 AI Report PDF Upload Request');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file provided' });
    }

    const document = await InferredReports.getDocumentById(req.params.id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if user can edit
    const canEdit = req.user.role === 'admin' ||
      req.user.userType === 'admin' ||
      document.uploaded_by === req.user.id;

    if (!canEdit) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Delete old AI report from Cloudinary if exists
    if (document.ai_report_public_id) {
      try {
        await cloudinary.uploader.destroy(document.ai_report_public_id, {
          resource_type: 'raw'
        });
        console.log('✅ Old AI Report deleted from Cloudinary');
      } catch (deleteError) {
        console.log('⚠️ Failed to delete old AI Report:', deleteError.message);
      }
    }

    const departmentFolder = getDepartmentFolder(document.department);
    const timestamp = Date.now();
    const filename = `ai_report_${timestamp}_${req.file.originalname}`;

    // Upload to Cloudinary
    console.log('☁️ Uploading AI Report to Cloudinary...');
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          folder: `inferred-reports/${departmentFolder}/ai-reports`,
          public_id: filename.replace('.pdf', ''),
          format: 'pdf',
          type: 'upload',
          access_mode: 'public'
        },
        (error, result) => {
          if (error) {
            console.log('❌ Cloudinary upload failed:', error.message);
            reject(error);
          } else {
            console.log('✅ AI Report uploaded:', result.secure_url);
            resolve(result);
          }
        }
      ).end(req.file.buffer);
    });

    // Update database
    await InferredReports.updateAiReport(req.params.id, uploadResult.secure_url, uploadResult.public_id);

    res.json({
      message: 'AI Report uploaded successfully',
      ai_report_url: uploadResult.secure_url
    });

  } catch (error) {
    console.error('Upload AI Report error:', error);
    res.status(500).json({ error: 'Failed to upload AI Report: ' + error.message });
  }
});

// Delete AI Report PDF
router.delete('/:id/ai-report', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 AI Report Delete Request');
    
    const document = await InferredReports.getDocumentById(req.params.id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if user can edit
    const canEdit = req.user.role === 'admin' ||
      req.user.userType === 'admin' ||
      document.uploaded_by === req.user.id;

    if (!canEdit) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    if (!document.ai_report_public_id) {
      return res.status(404).json({ error: 'No AI Report found for this document' });
    }

    // Delete from Cloudinary
    try {
      await cloudinary.uploader.destroy(document.ai_report_public_id, {
        resource_type: 'raw'
      });
      console.log('✅ AI Report deleted from Cloudinary');
    } catch (deleteError) {
      console.log('⚠️ Failed to delete AI Report from Cloudinary:', deleteError.message);
    }

    // Update database (set to null)
    await InferredReports.updateAiReport(req.params.id, null, null);

    res.json({
      message: 'AI Report deleted successfully'
    });

  } catch (error) {
    console.error('Delete AI Report error:', error);
    res.status(500).json({ error: 'Failed to delete AI Report: ' + error.message });
  }
});

// Upload ATR for an inferred report
router.post('/:id/upload-atr', authenticateToken, upload.single('pdf'), async (req, res) => {
  try {
    console.log('🔍 ATR Upload Request Started for Inferred Report:', req.params.id);
    console.log('📤 User:', req.user?.username);

    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file provided' });
    }

    const { siteName, department, comment } = req.body;

    if (!siteName || !department) {
      return res.status(400).json({ error: 'Site name and department are required' });
    }

    // Verify inferred report exists
    const inferredReport = await InferredReports.getDocumentById(req.params.id);
    if (!inferredReport) {
      return res.status(404).json({ error: 'Inferred report not found' });
    }

    // Check if user can upload ATR for this report
    const canUpload = req.user.role === 'admin' ||
      req.user.userType === 'admin' ||
      inferredReport.uploaded_by === req.user.id;

    if (!canUpload) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const departmentFolder = getDepartmentFolder(department);
    const timestamp = Date.now();
    const filename = `atr_${timestamp}_${req.file.originalname}`;

    console.log('☁️ Starting Cloudinary upload for ATR...');
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          folder: `atr-documents/${departmentFolder}`,
          public_id: filename.replace('.pdf', ''),
          format: 'pdf',
          type: 'upload',
          access_mode: 'public'
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
      ).end(req.file.buffer);
    });

    // Save to atr_documents table
    console.log('💾 Saving ATR to database...');
    const database = require('../utils/databaseHybrid');
    const result = await database.run(
      `INSERT INTO atr_documents 
       (filename, cloudinary_url, cloudinary_public_id, site_name, department, uploaded_by, file_size, comment, inferred_report_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.file.originalname,
        uploadResult.secure_url,
        uploadResult.public_id,
        siteName,
        department,
        req.user.id,
        req.file.size,
        comment || null,
        req.params.id
      ]
    );

    console.log('✅ ATR saved successfully, ID:', result.id);

    res.status(201).json({
      message: 'ATR uploaded successfully',
      atr: {
        id: result.id,
        filename: req.file.originalname,
        siteName,
        department,
        comment: comment || null,
        inferredReportId: req.params.id
      }
    });

  } catch (error) {
    console.error('❌ ATR Upload error:', error);
    res.status(500).json({ error: 'Failed to upload ATR: ' + error.message });
  }
});

// Delete ATR document
router.delete('/:id/atr/:atrId', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Delete ATR Request - ATR ID:', req.params.atrId);
    
    const database = require('../utils/databaseHybrid');
    
    // Get ATR document
    const atr = await database.get(
      'SELECT * FROM atr_documents WHERE id = ?',
      [req.params.atrId]
    );
    
    if (!atr) {
      return res.status(404).json({ error: 'ATR document not found' });
    }
    
    // Verify this ATR belongs to the inferred report
    if (atr.inferred_report_id !== parseInt(req.params.id)) {
      return res.status(400).json({ error: 'ATR does not belong to this inferred report' });
    }
    
    // All authenticated users can delete ATRs
    // No additional permission check needed - just being authenticated is enough
    
    // Delete from Cloudinary
    if (atr.cloudinary_public_id) {
      try {
        await cloudinary.uploader.destroy(atr.cloudinary_public_id, {
          resource_type: 'raw'
        });
        console.log('✅ ATR deleted from Cloudinary');
      } catch (deleteError) {
        console.log('⚠️ Failed to delete ATR from Cloudinary:', deleteError.message);
      }
    }
    
    // Delete from database
    await database.run('DELETE FROM atr_documents WHERE id = ?', [req.params.atrId]);
    
    console.log('✅ ATR deleted successfully');
    res.json({ message: 'ATR deleted successfully' });
    
  } catch (error) {
    console.error('❌ Delete ATR error:', error);
    res.status(500).json({ error: 'Failed to delete ATR: ' + error.message });
  }
});

// Delete Inferred Report document
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin' && req.user.userType !== 'admin' && req.user.username !== 'AEROVANIA MASTER') {
      console.log('❌ Access denied - User is not admin');
      return res.status(403).json({ error: 'Only admins can delete inferred reports' });
    }

    const document = await InferredReports.getDocumentById(req.params.id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete original document from Cloudinary
    await cloudinary.uploader.destroy(document.cloudinary_public_id, {
      resource_type: 'raw'
    });

    // Delete AI report from Cloudinary if exists
    if (document.ai_report_public_id) {
      await cloudinary.uploader.destroy(document.ai_report_public_id, {
        resource_type: 'raw'
      });
    }

    // Delete from database
    const deleted = await InferredReports.deleteDocument(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ message: 'Document deleted successfully' });

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document: ' + error.message });
  }
});

module.exports = router;