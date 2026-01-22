import React, { useState } from 'react';
import { X, Upload, FileText } from 'lucide-react';

const UploadModal = ({ 
  showModal, 
  onClose, 
  onUpload, 
  uploading,
  sites = [] // Accept sites as prop
}) => {
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadSiteName, setUploadSiteName] = useState('');
  const [uploadHyperlink, setUploadHyperlink] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    onUpload({
      file: uploadFile,
      siteName: uploadSiteName,
      hyperlink: uploadHyperlink
    });
    // Reset form
    setUploadFile(null);
    setUploadSiteName('');
    setUploadHyperlink('');
  };

  const handleClose = () => {
    if (!uploading) {
      setUploadFile(null);
      setUploadSiteName('');
      setUploadHyperlink('');
      onClose();
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!showModal) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Upload Inferred Report</h2>
          <button 
            className="modal-close"
            onClick={handleClose}
            disabled={uploading}
          >
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {/* File Drop Zone */}
          <div
            className={`modal-dropzone ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {uploadFile ? (
              <div className="file-selected">
                <FileText size={48} />
                <p className="file-name">{uploadFile.name}</p>
                <p className="file-size">{formatFileSize(uploadFile.size)}</p>
                <button 
                  className="change-file-button"
                  onClick={() => setUploadFile(null)}
                >
                  Change File
                </button>
              </div>
            ) : (
              <>
                <div className="upload-icon">📄</div>
                <h3>Drop PDF file here or click to browse</h3>
                <p>Maximum file size: 25MB</p>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="file-input"
                  id="modal-file-input"
                />
                <label htmlFor="modal-file-input" className="browse-button">
                  Browse Files
                </label>
              </>
            )}
          </div>

          {/* Site Name Field */}
          <div className="form-group">
            <label htmlFor="upload-site-name">Site Name *</label>
            <select
              id="upload-site-name"
              value={uploadSiteName}
              onChange={(e) => setUploadSiteName(e.target.value)}
              required
            >
              <option value="">Select a site (required)...</option>
              {sites.map(site => (
                <option key={site.id || site} value={site.name || site}>
                  {site.name || site}
                </option>
              ))}
            </select>
          </div>

          {/* Hyperlink Field */}
          <div className="form-group">
            <label htmlFor="upload-hyperlink">Hyperlink (Optional)</label>
            <input
              type="url"
              id="upload-hyperlink"
              value={uploadHyperlink}
              onChange={(e) => setUploadHyperlink(e.target.value)}
              placeholder="https://drive.google.com/..."
            />
            <span className="field-hint">Google Drive link or any URL (can be added later)</span>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="cancel-button"
            onClick={handleClose}
            disabled={uploading}
          >
            Cancel
          </button>
          <button 
            className="upload-button"
            onClick={handleSubmit}
            disabled={uploading || !uploadFile || !uploadSiteName}
          >
            {uploading ? (
              <>
                <div className="spinner-small"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload size={18} />
                Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
