const express = require('express');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const Organization = require('../models/Organization');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dgf5874nz',
  api_key: process.env.CLOUDINARY_API_KEY || '873245158622578',
  api_secret: process.env.CLOUDINARY_API_SECRET || '3DF8o9ZZD-WIzuSKfS6kFQoVzp4'
});

// Configure multer for logo uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit for logos
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for logos'), false);
    }
  }
});

// Middleware to check if user is super admin
const requireSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.userType !== 'admin') {
    return res.status(403).json({ error: 'Only super admins can manage organizations' });
  }
  
  // Check for Aerovania super admin
  if (req.user.email !== 'superadmin@aero.com' && req.user.username !== 'SuperAdmin') {
    return res.status(403).json({ error: 'Only Aerovania super admins can manage organizations' });
  }
  
  next();
};

// Get all organizations
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Organizations List Request');
    console.log('👤 User:', req.user?.username, 'Role:', req.user?.role);

    const organizations = await Organization.getAllOrganizations();
    
    // Get stats for each organization
    const organizationsWithStats = await Promise.all(
      organizations.map(async (org) => {
        const stats = await Organization.getOrganizationStats(org.id);
        return {
          ...org,
          stats
        };
      })
    );

    res.json({
      organizations: organizationsWithStats
    });

  } catch (error) {
    console.error('❌ List organizations error:', error);
    res.status(500).json({ error: 'Failed to fetch organizations: ' + error.message });
  }
});

// Get organization by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Organization Details Request - ID:', req.params.id);

    const organization = await Organization.getOrganizationById(req.params.id);

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const stats = await Organization.getOrganizationStats(req.params.id);

    res.json({
      organization: {
        ...organization,
        stats
      }
    });

  } catch (error) {
    console.error('❌ Get organization error:', error);
    res.status(500).json({ error: 'Failed to fetch organization: ' + error.message });
  }
});

// Create new organization
router.post('/', authenticateToken, requireSuperAdmin, upload.single('logo'), async (req, res) => {
  try {
    console.log('🔍 Create Organization Request');
    console.log('👤 User:', req.user?.username);
    console.log('📁 File received:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'No file');

    const { name, code, description, contact_email, contact_phone, address } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'Organization name and code are required' });
    }

    // Check if organization code already exists
    const existingOrg = await Organization.getOrganizationByCode(code.toUpperCase());
    if (existingOrg) {
      return res.status(400).json({ error: 'Organization code already exists' });
    }

    let logo_url = null;

    // Upload logo to Cloudinary if provided
    if (req.file) {
      console.log('☁️ Uploading logo to Cloudinary...');
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: 'image',
              folder: `organizations/${code.toLowerCase()}/logos`,
              public_id: `logo_${Date.now()}`,
              transformation: [
                { width: 200, height: 200, crop: 'fit' },
                { quality: 'auto' }
              ]
            },
            (error, result) => {
              if (error) {
                console.log('❌ Cloudinary upload failed:', error.message);
                reject(error);
              } else {
                console.log('✅ Logo uploaded:', result.secure_url);
                resolve(result);
              }
            }
          ).end(req.file.buffer);
        });

        logo_url = uploadResult.secure_url;
      } catch (uploadError) {
        console.log('⚠️ Logo upload failed, continuing without logo:', uploadError.message);
      }
    }

    // Create organization
    const organizationData = {
      name: name.trim(),
      code: code.toUpperCase().trim(),
      description: description?.trim() || null,
      logo_url,
      contact_email: contact_email?.trim() || null,
      contact_phone: contact_phone?.trim() || null,
      address: address?.trim() || null,
      created_by: req.user.id
    };

    const organization = await Organization.createOrganization(organizationData);

    console.log('✅ Organization created successfully:', organization.id);

    res.status(201).json({
      message: 'Organization created successfully',
      organization
    });

  } catch (error) {
    console.error('❌ Create organization error:', error);
    res.status(500).json({ error: 'Failed to create organization: ' + error.message });
  }
});

// Update organization
router.put('/:id', authenticateToken, requireSuperAdmin, upload.single('logo'), async (req, res) => {
  try {
    console.log('🔍 Update Organization Request - ID:', req.params.id);

    const organization = await Organization.getOrganizationById(req.params.id);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const { name, code, description, contact_email, contact_phone, address } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'Organization name and code are required' });
    }

    // Check if code is being changed and if new code already exists
    if (code.toUpperCase() !== organization.code) {
      const existingOrg = await Organization.getOrganizationByCode(code.toUpperCase());
      if (existingOrg) {
        return res.status(400).json({ error: 'Organization code already exists' });
      }
    }

    let logo_url = organization.logo_url;

    // Upload new logo if provided
    if (req.file) {
      console.log('☁️ Uploading new logo to Cloudinary...');
      try {
        // Delete old logo if exists
        if (organization.logo_url) {
          const publicId = organization.logo_url.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`organizations/${organization.code.toLowerCase()}/logos/${publicId}`);
        }

        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              resource_type: 'image',
              folder: `organizations/${code.toLowerCase()}/logos`,
              public_id: `logo_${Date.now()}`,
              transformation: [
                { width: 200, height: 200, crop: 'fit' },
                { quality: 'auto' }
              ]
            },
            (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            }
          ).end(req.file.buffer);
        });

        logo_url = uploadResult.secure_url;
      } catch (uploadError) {
        console.log('⚠️ Logo upload failed:', uploadError.message);
      }
    }

    // Update organization
    const organizationData = {
      name: name.trim(),
      code: code.toUpperCase().trim(),
      description: description?.trim() || null,
      logo_url,
      contact_email: contact_email?.trim() || null,
      contact_phone: contact_phone?.trim() || null,
      address: address?.trim() || null
    };

    const updated = await Organization.updateOrganization(req.params.id, organizationData);

    if (!updated) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({
      message: 'Organization updated successfully'
    });

  } catch (error) {
    console.error('❌ Update organization error:', error);
    res.status(500).json({ error: 'Failed to update organization: ' + error.message });
  }
});

// Toggle organization status
router.patch('/:id/toggle-status', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    console.log('🔍 Toggle Organization Status - ID:', req.params.id);

    const updated = await Organization.toggleOrganizationStatus(req.params.id);

    if (!updated) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({
      message: 'Organization status updated successfully'
    });

  } catch (error) {
    console.error('❌ Toggle organization status error:', error);
    res.status(500).json({ error: 'Failed to update organization status: ' + error.message });
  }
});

// Delete organization
router.delete('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    console.log('🔍 Delete Organization Request - ID:', req.params.id);

    const organization = await Organization.getOrganizationById(req.params.id);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check if organization has users or data
    const stats = await Organization.getOrganizationStats(req.params.id);
    if (stats.users > 0 || stats.admins > 0 || stats.reports > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete organization with existing users or data. Please transfer or remove all associated data first.',
        stats
      });
    }

    // Delete logo from Cloudinary if exists
    if (organization.logo_url) {
      try {
        const publicId = organization.logo_url.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`organizations/${organization.code.toLowerCase()}/logos/${publicId}`);
      } catch (deleteError) {
        console.log('⚠️ Failed to delete logo from Cloudinary:', deleteError.message);
      }
    }

    const deleted = await Organization.deleteOrganization(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({
      message: 'Organization deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete organization error:', error);
    res.status(500).json({ error: 'Failed to delete organization: ' + error.message });
  }
});

module.exports = router;