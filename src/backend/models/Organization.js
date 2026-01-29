const database = require('../utils/databaseHybrid');

class OrganizationModel {
  async createOrganization(organizationData) {
    const { 
      name, 
      code,
      description,
      logo_url,
      contact_email,
      contact_phone,
      address,
      created_by
    } = organizationData;

    try {
      const result = await database.run(
        `INSERT INTO organizations 
         (name, code, description, logo_url, contact_email, contact_phone, address, created_by, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, code, description || null, logo_url || null, contact_email || null, contact_phone || null, address || null, created_by, new Date().toISOString()]
      );

      return {
        id: result.id,
        name,
        code,
        description,
        logo_url,
        contact_email,
        contact_phone,
        address,
        created_by,
        created_at: new Date().toISOString()
      };
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async getAllOrganizations() {
    try {
      const organizations = await database.all(
        `SELECT o.id, o.name, o.code, o.description, o.logo_url, o.contact_email, 
                o.contact_phone, o.address, o.created_at, o.is_active,
                u.username as created_by_name 
         FROM organizations o 
         LEFT JOIN admin u ON o.created_by = u.id 
         ORDER BY o.created_at DESC`
      );
      return organizations;
    } catch (err) {
      console.error('❌ Model error:', err);
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async getOrganizationById(id) {
    try {
      const organization = await database.get(
        `SELECT o.id, o.name, o.code, o.description, o.logo_url, o.contact_email, 
                o.contact_phone, o.address, o.created_at, o.is_active,
                u.username as created_by_name 
         FROM organizations o 
         LEFT JOIN admin u ON o.created_by = u.id 
         WHERE o.id = ?`,
        [id]
      );
      return organization;
    } catch (err) {
      console.error('❌ Model error:', err);
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async getOrganizationByCode(code) {
    try {
      const organization = await database.get(
        `SELECT o.id, o.name, o.code, o.description, o.logo_url, o.contact_email, 
                o.contact_phone, o.address, o.created_at, o.is_active,
                u.username as created_by_name 
         FROM organizations o 
         LEFT JOIN admin u ON o.created_by = u.id 
         WHERE o.code = ?`,
        [code]
      );
      return organization;
    } catch (err) {
      console.error('❌ Model error:', err);
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async updateOrganization(id, organizationData) {
    const { 
      name, 
      code,
      description,
      logo_url,
      contact_email,
      contact_phone,
      address
    } = organizationData;

    try {
      const result = await database.run(
        `UPDATE organizations 
         SET name = ?, code = ?, description = ?, logo_url = ?, 
             contact_email = ?, contact_phone = ?, address = ?, updated_at = ?
         WHERE id = ?`,
        [name, code, description, logo_url, contact_email, contact_phone, address, new Date().toISOString(), id]
      );
      return result.changes > 0;
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async toggleOrganizationStatus(id) {
    try {
      const result = await database.run(
        'UPDATE organizations SET is_active = NOT is_active, updated_at = ? WHERE id = ?',
        [new Date().toISOString(), id]
      );
      return result.changes > 0;
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async deleteOrganization(id) {
    try {
      const result = await database.run(
        'DELETE FROM organizations WHERE id = ?',
        [id]
      );
      return result.changes > 0;
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async getOrganizationStats(id) {
    try {
      // Get user count for this organization
      const userCount = await database.get(
        'SELECT COUNT(*) as count FROM "user" WHERE organization_id = ?',
        [id]
      );

      // Get admin count for this organization
      const adminCount = await database.get(
        'SELECT COUNT(*) as count FROM admin WHERE organization_id = ?',
        [id]
      );

      // Get reports count for this organization
      const reportsCount = await database.get(
        'SELECT COUNT(*) as count FROM inferred_reports WHERE organization_id = ?',
        [id]
      );

      return {
        users: userCount?.count || 0,
        admins: adminCount?.count || 0,
        reports: reportsCount?.count || 0
      };
    } catch (err) {
      console.error('❌ Stats error:', err);
      return { users: 0, admins: 0, reports: 0 };
    }
  }

  async getOrganizationUsers(organizationId) {
    try {
      // Get regular users (only select columns that exist)
      const users = await database.all(
        `SELECT u.id, u.username, u.email, u.full_name, u.department, 
                u.access_level, u.created_at,
                'user' as user_type
         FROM "user" u 
         WHERE u.organization_id = ? 
         ORDER BY u.created_at DESC`,
        [organizationId]
      );

      // Get admin users (only select columns that exist)
      const admins = await database.all(
        `SELECT a.id, a.username, a.email, a.full_name, 
                a.permissions as access_level, a.permissions, a.created_at,
                'admin' as user_type
         FROM admin a 
         WHERE a.organization_id = ? 
         ORDER BY a.created_at DESC`,
        [organizationId]
      );

      // Add missing fields with defaults
      const processedUsers = users.map(user => ({
        ...user,
        permissions: user.access_level,
        is_active: true,
        department: user.department || ''
      }));

      const processedAdmins = admins.map(admin => ({
        ...admin,
        is_active: true,
        department: '' // Admin table doesn't have department column
      }));

      // Combine and sort by creation date
      const allUsers = [...processedUsers, ...processedAdmins].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );

      return allUsers;
    } catch (err) {
      console.error('❌ Get organization users error:', err);
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async getUserByUsernameOrEmail(username, email) {
    try {
      const user = await database.get(
        'SELECT id, username, email FROM "user" WHERE username = ? OR email = ?',
        [username, email]
      );
      return user;
    } catch (err) {
      console.error('❌ Get user by username/email error:', err);
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async getAdminByUsernameOrEmail(username, email) {
    try {
      const admin = await database.get(
        'SELECT id, username, email FROM admin WHERE username = ? OR email = ?',
        [username, email]
      );
      return admin;
    } catch (err) {
      console.error('❌ Get admin by username/email error:', err);
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async createOrganizationUser(userData) {
    const { 
      username, 
      email,
      password,
      full_name,
      department,
      access_level,
      permissions,
      organization_id,
      created_by
    } = userData;

    try {
      // Hash the password
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await database.run(
        `INSERT INTO "user" 
         (username, email, password_hash, full_name, department, access_level, organization_id, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [username, email, hashedPassword, full_name, department, access_level, organization_id, new Date().toISOString()]
      );

      return {
        id: result.id,
        username,
        email,
        full_name,
        department,
        access_level,
        permissions: access_level, // Use access_level as permissions for users
        organization_id,
        created_by,
        created_at: new Date().toISOString(),
        user_type: 'user'
      };
    } catch (err) {
      console.error('❌ Create organization user error:', err);
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async createOrganizationAdmin(adminData) {
    const { 
      username, 
      email,
      password,
      full_name,
      department,
      access_level,
      permissions,
      organization_id,
      created_by
    } = adminData;

    try {
      // Hash the password
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);

      // Admin table only has: id, username, email, password_hash, full_name, permissions, organization_id, created_at
      const result = await database.run(
        `INSERT INTO admin 
         (username, email, password_hash, full_name, permissions, organization_id, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [username, email, hashedPassword, full_name, permissions || 'admin', organization_id, new Date().toISOString()]
      );

      return {
        id: result.id,
        username,
        email,
        full_name,
        department: '', // Admin table doesn't have department
        access_level: permissions || 'admin',
        permissions: permissions || 'admin',
        organization_id,
        created_by,
        created_at: new Date().toISOString(),
        user_type: 'admin'
      };
    } catch (err) {
      console.error('❌ Create organization admin error:', err);
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async deleteOrganizationUser(userId, organizationId) {
    try {
      const result = await database.run(
        'DELETE FROM "user" WHERE id = ? AND organization_id = ?',
        [userId, organizationId]
      );
      return result.changes > 0;
    } catch (err) {
      console.error('❌ Delete organization user error:', err);
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async deleteOrganizationAdmin(adminId, organizationId) {
    try {
      const result = await database.run(
        'DELETE FROM admin WHERE id = ? AND organization_id = ?',
        [adminId, organizationId]
      );
      return result.changes > 0;
    } catch (err) {
      console.error('❌ Delete organization admin error:', err);
      throw new Error(`Database error: ${err.message}`);
    }
  }
}

module.exports = new OrganizationModel();