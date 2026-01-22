const database = require('../utils/databaseHybrid');

class AtrDocumentModel {
  async createDocument(documentData) {
    const { 
      filename, 
      cloudinary_url, 
      cloudinary_public_id, 
      department, 
      uploaded_by, 
      file_size,
      comment,
      hyperlink
    } = documentData;

    try {
      const result = await database.run(
        `INSERT INTO atr_documents 
         (filename, cloudinary_url, cloudinary_public_id, department, uploaded_by, file_size, upload_date) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [filename, cloudinary_url, cloudinary_public_id, department, uploaded_by, file_size, new Date().toISOString()]
      );

      return {
        id: result.id,
        filename,
        cloudinary_url,
        department,
        uploaded_by,
        file_size,
        upload_date: new Date().toISOString()
      };
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }

  async getDocumentsByDepartment(department) {
    try {
      const documents = await database.all(
        `SELECT ad.id, ad.filename, ad.cloudinary_url, ad.cloudinary_public_id, 
                ad.department, ad.uploaded_by, ad.file_size, ad.upload_date, ad.site_name,
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

  async getAllDocuments() {
    try {
      const documents = await database.all(
        `SELECT ad.id, ad.filename, ad.cloudinary_url, ad.cloudinary_public_id, 
                ad.department, ad.uploaded_by, ad.file_size, ad.upload_date, ad.site_name,
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

  async getDocumentById(id) {
    try {
      const document = await database.get(
        `SELECT ad.id, ad.filename, ad.cloudinary_url, ad.cloudinary_public_id, 
                ad.department, ad.uploaded_by, ad.file_size, ad.upload_date, ad.site_name,
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

  async deleteDocument(id) {
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

  async deleteDocumentByUser(id, userId) {
    try {
      const result = await database.run(
        'DELETE FROM atr_documents WHERE id = ? AND uploaded_by = ?',
        [id, userId]
      );
      return result.changes > 0;
    } catch (err) {
      throw new Error(`Database error: ${err.message}`);
    }
  }


}

module.exports = new AtrDocumentModel();