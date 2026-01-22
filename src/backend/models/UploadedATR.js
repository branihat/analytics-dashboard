const database = require('../utils/databaseHybrid');

class UploadedATRModel {
  async getAllATRDocuments() {
    try {
      const documents = await database.all(
        `SELECT ad.id, ad.filename, ad.site_name, ad.cloudinary_url, ad.cloudinary_public_id,
                ad.department, ad.uploaded_by, ad.upload_date, ad.file_size, ad.comment,
                ad.inferred_report_id,
                u.username as uploaded_by_name 
         FROM atr_documents ad 
         LEFT JOIN "user" u ON ad.uploaded_by = u.id 
         ORDER BY ad.upload_date DESC`
      );
      return documents;
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async getATRDocumentsBySite(siteName) {
    try {
      const documents = await database.all(
        `SELECT ad.id, ad.filename, ad.site_name, ad.cloudinary_url, ad.cloudinary_public_id,
                ad.department, ad.uploaded_by, ad.upload_date, ad.file_size, ad.comment,
                ad.inferred_report_id,
                u.username as uploaded_by_name 
         FROM atr_documents ad 
         LEFT JOIN "user" u ON ad.uploaded_by = u.id 
         WHERE ad.site_name = ? 
         ORDER BY ad.upload_date DESC`,
        [siteName]
      );
      return documents;
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async getATRDocumentsByDepartment(department) {
    try {
      const documents = await database.all(
        `SELECT ad.id, ad.filename, ad.site_name, ad.cloudinary_url, ad.cloudinary_public_id,
                ad.department, ad.uploaded_by, ad.upload_date, ad.file_size, ad.comment,
                ad.inferred_report_id,
                u.username as uploaded_by_name 
         FROM atr_documents ad 
         LEFT JOIN "user" u ON ad.uploaded_by = u.id 
         WHERE ad.department = ? 
         ORDER BY ad.upload_date DESC`,
        [department]
      );
      return documents;
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async getATRDocumentsByDateRange(startDate, endDate) {
    try {
      const documents = await database.all(
        `SELECT ad.id, ad.filename, ad.site_name, ad.cloudinary_url, 
                ad.department, ad.uploaded_by, ad.upload_date, ad.file_size,
                u.username as uploaded_by_name 
         FROM atr_documents ad 
         LEFT JOIN "user" u ON ad.uploaded_by = u.id 
         WHERE ad.upload_date BETWEEN ? AND ? 
         ORDER BY ad.upload_date DESC`,
        [startDate, endDate]
      );
      return documents;
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async searchATRDocuments(searchTerm) {
    try {
      const documents = await database.all(
        `SELECT ad.id, ad.filename, ad.site_name, ad.cloudinary_url, ad.cloudinary_public_id,
                ad.department, ad.uploaded_by, ad.upload_date, ad.file_size, ad.comment,
                ad.inferred_report_id,
                u.username as uploaded_by_name 
         FROM atr_documents ad 
         LEFT JOIN "user" u ON ad.uploaded_by = u.id 
         WHERE ad.site_name LIKE ? OR ad.filename LIKE ? OR ad.comment LIKE ?
         ORDER BY ad.upload_date DESC`,
        [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]
      );
      return documents;
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async getATRDocumentById(id) {
    try {
      const document = await database.get(
        `SELECT ad.id, ad.filename, ad.site_name, ad.cloudinary_url, ad.cloudinary_public_id,
                ad.department, ad.uploaded_by, ad.upload_date, ad.file_size, ad.comment,
                ad.inferred_report_id,
                u.username as uploaded_by_name 
         FROM atr_documents ad 
         LEFT JOIN "user" u ON ad.uploaded_by = u.id 
         WHERE ad.id = ?`,
        [id]
      );
      return document;
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async updateATRComment(id, comment) {
    try {
      const result = await database.run(
        'UPDATE atr_documents SET comment = ? WHERE id = ?',
        [comment, id]
      );
      return result.changes > 0;
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async deleteATRDocument(id) {
    try {
      const result = await database.run(
        'DELETE FROM atr_documents WHERE id = ?',
        [id]
      );
      return result.changes > 0;
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }
}

module.exports = new UploadedATRModel();