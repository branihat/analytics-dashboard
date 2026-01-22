const express = require('express');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const AtrDocument = require('../models/AtrDocument');
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

// Upload AI Report document
router.post('/upload', authenticateToken, upload.single('pdf'), async (req, res) => {
  try {
    console.log('🔍 AI Report Upload Request Started');
    console.log('📤 User:', req.user?.username, 'Department:', req.user?.department);
    console.log('📁 File received:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'No file');

    if (!req.file) {
      console.log('❌ No file provided in request');
      return res.status(400).json({ error: 'No PDF file provided' });
    }

    // Get optional fields from request body
    const { comment, hyperlink } = req.body;

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

    // Save to database
    console.log('💾 Saving to database...');
    const documentData = {
      filename: req.file.originalname,
      cloudinary_url: uploadResult.secure_url,
      cloudinary_public_id: uploadResult.public_id,
      department: department,
      uploaded_by: req.user.id,
      file_size: req.file.size,
      comment: comment || null,
      hyperlink: hyperlink || null
    };

    const document = await AtrDocument.createDocument(documentData);
    console.log('✅ Database save successful, document ID:', document.id);

    res.status(201).json({
      message: 'AI Report uploaded successfully',
      document: {
        id: document.id,
        filename: document.filename,
        department: document.department,
        upload_date: document.upload_date,
        file_size: document.file_size,
        comment: document.comment,
        hyperlink: document.hyperlink
      }
    });

    console.log('🎉 AI Report Upload completed successfully');

  } catch (error) {
    console.error('❌ AI Report Upload error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to upload document: ' + error.message });
  }
});

// Get AI Reports for user's department
router.get('/list', authenticateToken, async (req, res) => {
  try {
    let documents;

    // Admin can see all documents, users only see their department's documents
    if (req.user.role === 'admin' || req.user.userType === 'admin') {
      documents = await AtrDocument.getAllDocuments();
    } else {
      if (!req.user.department) {
        return res.status(400).json({ error: 'User department not found' });
      }
      documents = await AtrDocument.getDocumentsByDepartment(req.user.department);
    }

    res.json({
      documents: documents.map(doc => ({
        id: doc.id,
        filename: doc.filename,
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
        canEdit: doc.uploaded_by === req.user.id || req.user.role === 'admin'
      }))
    });

  } catch (error) {
    console.error('❌ List documents error:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ error: 'Failed to fetch documents: ' + error.message });
  }
});

// View/Download ATR document
router.get('/view/:id', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 ATR View Request - Document ID:', req.params.id);
    console.log('👤 User:', req.user?.username, 'Department:', req.user?.department);

    const document = await AtrDocument.getDocumentById(req.params.id);

    if (!document) {
      console.log('❌ Document not found:', req.params.id);
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if user can access this document
    const canAccess = req.user.role === 'admin' ||
      req.user.userType === 'admin' ||
      document.department === req.user.department;

    if (!canAccess) {
      console.log('❌ Access denied - User department:', req.user.department, 'Document department:', document.department);
      return res.status(403).json({ error: 'Access denied' });
    }

    console.log('📄 Document found:', document.filename);
    console.log('🔗 Cloudinary public_id:', document.cloudinary_public_id);
    console.log('🔗 Cloudinary URL:', document.cloudinary_url);

    // Use direct Cloudinary URL (works with unsigned preset)
    // If you need signed URLs, change your Cloudinary preset to "Signed" mode
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
    const document = await AtrDocument.getDocumentById(req.params.id);

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

    await AtrDocument.updateComment(req.params.id, comment);
    res.json({ message: 'Comment updated successfully', comment });

  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ error: 'Failed to update comment: ' + error.message });
  }
});

// Update hyperlink
router.patch('/:id/hyperlink', authenticateToken, async (req, res) => {
  try {
    const { hyperlink } = req.body;
    const document = await AtrDocument.getDocumentById(req.params.id);

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

    await AtrDocument.updateHyperlink(req.params.id, hyperlink);
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

    const document = await AtrDocument.getDocumentById(req.params.id);

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
          folder: `atr-documents/${departmentFolder}/ai-reports`,
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
    await AtrDocument.updateAiReport(req.params.id, uploadResult.secure_url, uploadResult.public_id);

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
    
    const document = await AtrDocument.getDocumentById(req.params.id);

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
    await AtrDocument.updateAiReport(req.params.id, null, null);

    res.json({
      message: 'AI Report deleted successfully'
    });

  } catch (error) {
    console.error('Delete AI Report error:', error);
    res.status(500).json({ error: 'Failed to delete AI Report: ' + error.message });
  }
});

// Delete AI Report document
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const document = await AtrDocument.getDocumentById(req.params.id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if user can delete this document
    const canDelete = req.user.role === 'admin' ||
      req.user.userType === 'admin' ||
      document.uploaded_by === req.user.id;

    if (!canDelete) {
      return res.status(403).json({ error: 'Permission denied' });
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
    const deleted = await AtrDocument.deleteDocument(req.params.id);

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