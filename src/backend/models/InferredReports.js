const database = require('../utils/databaseHybrid');

class InferredReportsModel {
  async createDocument(documentData) {
    const { 
      filename, 
      cloudinary_url, 
      cloudinary_public_id, 
      site_name,
      department, 
      uploaded_by, 
      file_size,
      hyperlink,
      organization_id,
      upload_date
    } = documentData;

    try {
      // Use provided upload_date or default to current date
      const dateToUse = upload_date || new Date().toISOString();
      
      const result = await database.run(
        `INSERT INTO inferred_reports 
         (filename, cloudinary_url, cloudinary_public_id, site_name, department, uploaded_by, file_size, upload_date, hyperlink, organization_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [filename, cloudinary_url, cloudinary_public_id, site_name || null, department, uploaded_by, file_size, dateToUse, hyperlink, organization_id]
      );

      return {
        id: result.id,
        filename,
        cloudinary_url,
        department,
        uploaded_by,
        file_size,
        upload_date: dateToUse,
        hyperlink: hyperlink,
        organization_id: organization_id
      };
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async getDocumentsByDepartment(department) {
    try {
      const documents = await database.all(
        `SELECT ir.id, ir.filename, ir.cloudinary_url, ir.cloudinary_public_id, 
                ir.site_name, ir.department, ir.uploaded_by, ir.file_size, ir.upload_date,
                ir.comment, ir.ai_report_url, ir.ai_report_public_id, ir.hyperlink,
                u.username as uploaded_by_name 
         FROM inferred_reports ir 
         LEFT JOIN "user" u ON ir.uploaded_by = u.id 
         WHERE ir.department = ? 
         ORDER BY ir.upload_date DESC`,
        [department]
      );
      console.log('📊 Model - First document hyperlink:', documents[0]?.hyperlink);
      return documents;
    } catch (err) {
      console.error('❌ Model error:', err);
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async getAllDocuments() {
    try {
      const documents = await database.all(
        `SELECT ir.id, ir.filename, ir.cloudinary_url, ir.cloudinary_public_id, 
                ir.site_name, ir.department, ir.uploaded_by, ir.file_size, ir.upload_date,
                ir.comment, ir.ai_report_url, ir.ai_report_public_id, ir.hyperlink, ir.organization_id,
                u.username as uploaded_by_name 
         FROM inferred_reports ir 
         LEFT JOIN "user" u ON ir.uploaded_by = u.id 
         ORDER BY ir.upload_date DESC`
      );
      console.log('📊 Model - First document hyperlink:', documents[0]?.hyperlink);
      return documents;
    } catch (err) {
      console.error('❌ Model error:', err);
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async getDocumentsByOrganization(organizationId) {
    try {
      const documents = await database.all(
        `SELECT ir.id, ir.filename, ir.cloudinary_url, ir.cloudinary_public_id, 
                ir.site_name, ir.department, ir.uploaded_by, ir.file_size, ir.upload_date,
                ir.comment, ir.ai_report_url, ir.ai_report_public_id, ir.hyperlink, ir.organization_id,
                u.username as uploaded_by_name 
         FROM inferred_reports ir 
         LEFT JOIN "user" u ON ir.uploaded_by = u.id 
         WHERE ir.organization_id = ?
         ORDER BY ir.upload_date DESC`,
        [organizationId]
      );
      console.log('📊 Model - Organization filtered documents count:', documents.length);
      return documents;
    } catch (err) {
      console.error('❌ Model error:', err);
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async getDocumentById(id) {
    try {
      const document = await database.get(
        `SELECT ir.id, ir.filename, ir.cloudinary_url, ir.cloudinary_public_id, 
                ir.site_name, ir.department, ir.uploaded_by, ir.file_size, ir.upload_date,
                ir.comment, ir.ai_report_url, ir.ai_report_public_id, ir.hyperlink, ir.organization_id,
                u.username as uploaded_by_name 
         FROM inferred_reports ir 
         LEFT JOIN "user" u ON ir.uploaded_by = u.id 
         WHERE ir.id = ?`,
        [id]
      );
      return document;
    } catch (err) {
      console.error('❌ Model error:', err);
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async deleteDocument(id) {
    try {
      const result = await database.run(
        'DELETE FROM inferred_reports WHERE id = ?',
        [id]
      );
      return result.changes > 0;
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async deleteDocumentByUser(id, userId) {
    try {
      const result = await database.run(
        'DELETE FROM inferred_reports WHERE id = ? AND uploaded_by = ?',
        [id, userId]
      );
      return result.changes > 0;
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async updateComment(id, comment) {
    try {
      const result = await database.run(
        'UPDATE inferred_reports SET comment = ? WHERE id = ?',
        [comment, id]
      );
      return result.changes > 0;
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async updateHyperlink(id, hyperlink) {
    try {
      const result = await database.run(
        'UPDATE inferred_reports SET hyperlink = ? WHERE id = ?',
        [hyperlink, id]
      );
      return result.changes > 0;
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async updateAiReport(id, aiReportUrl, aiReportPublicId) {
    try {
      const result = await database.run(
        'UPDATE inferred_reports SET ai_report_url = ?, ai_report_public_id = ? WHERE id = ?',
        [aiReportUrl, aiReportPublicId, id]
      );
      return result.changes > 0;
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }
}

module.exports = new InferredReportsModel();