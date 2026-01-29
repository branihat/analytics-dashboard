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
}

module.exports = new OrganizationModel();