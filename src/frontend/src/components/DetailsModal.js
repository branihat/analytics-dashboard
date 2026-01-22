import React, { useState, useEffect } from 'react';
import { X, Upload } from 'lucide-react';

const DetailsModal = ({ 
  show, 
  document, 
  onClose, 
  onUploadAtr
}) => {
  // ATR upload states
  const [atrFile, setAtrFile] = useState(null);
  const [atrSite, setAtrSite] = useState('');
  const [atrDepartment, setAtrDepartment] = useState('');
  const [atrComment, setAtrComment] = useState('');
  const [uploadingAtr, setUploadingAtr] = useState(false);

  useEffect(() => {
    if (document) {
      // Reset ATR form
      setAtrFile(null);
      setAtrSite('');
      setAtrDepartment('');
      setAtrComment('');
      setUploadingAtr(false);
    }
  }, [document]);

  const handleUploadAtr = async () => {
    if (!atrFile || !atrSite || !atrDepartment) {
      return;
    }

    setUploadingAtr(true);
    try {
      await onUploadAtr(document.id, atrFile, atrSite, atrDepartment, atrComment);
      // Reset form
      setAtrFile(null);
      setAtrSite('');
      setAtrDepartment('');
      setAtrComment('');
    } catch (error) {
      console.error('Upload ATR error:', error);
    } finally {
      setUploadingAtr(false);
    }
  };



  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!show || !document) return null;

  return (
    <div className="modal-overlay details-modal-overlay" onClick={onClose}>
      <div className="modal-content details-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📊 Upload ATR</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body details-modal-body">
          <div className="document-info-header">
            <h3>{document.filename}</h3>
            <p className="document-meta">
              {document.department} • {formatDate(document.upload_date)} • {formatFileSize(document.file_size)}
            </p>
          </div>

          {/* ATR Upload Section */}
          <div className="detail-card">
            <div className="detail-card-header">
              <h4>📊 Upload ATR</h4>
            </div>
            <div className="detail-card-body">
              <div className="atr-upload-form">
                  <div className="form-group">
                    <label htmlFor="atr-file">PDF File *</label>
                    <input
                      type="file"
                      id="atr-file"
                      accept=".pdf"
                      onChange={(e) => {
                        if (e.target.files[0]) {
                          setAtrFile(e.target.files[0]);
                        }
                      }}
                      className="modal-input"
                    />
                    {atrFile && (
                      <div className="file-selected-info">
                        📄 {atrFile.name} ({formatFileSize(atrFile.size)})
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="atr-site">Site *</label>
                    <select
                      id="atr-site"
                      value={atrSite}
                      onChange={(e) => setAtrSite(e.target.value)}
                      className="modal-input"
                      required
                    >
                      <option value="">Select a site...</option>
                      <option value="Site A">Site A</option>
                      <option value="Site B">Site B</option>
                      <option value="Site C">Site C</option>
                      <option value="Bukaro">Bukaro</option>
                      <option value="BNK Mines">BNK Mines</option>
                      <option value="Dhori">Dhori</option>
                      <option value="Kathara">Kathara</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="atr-department">Department *</label>
                    <select
                      id="atr-department"
                      value={atrDepartment}
                      onChange={(e) => setAtrDepartment(e.target.value)}
                      className="modal-input"
                      required
                    >
                      <option value="">Select a department...</option>
                      <option value="E&T Department">E&T Department</option>
                      <option value="Security Department">Security Department</option>
                      <option value="Operation Department">Operation Department</option>
                      <option value="Survey Department">Survey Department</option>
                      <option value="Safety Department">Safety Department</option>
                      <option value="Admin">Admin</option>
                      <option value="Super Admin">Super Admin</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="atr-comment">Comment (Optional)</label>
                    <textarea
                      id="atr-comment"
                      value={atrComment}
                      onChange={(e) => setAtrComment(e.target.value)}
                      className="modal-textarea"
                      placeholder="Add a comment about this ATR..."
                      rows={3}
                      maxLength={500}
                    />
                    <span className="char-count">{atrComment.length}/500</span>
                  </div>

                  <button 
                    className="btn-add" 
                    onClick={handleUploadAtr}
                    disabled={!atrFile || !atrSite || !atrDepartment || uploadingAtr}
                  >
                    {uploadingAtr ? (
                      <>
                        <div className="spinner-small"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload size={16} /> Upload ATR
                      </>
                    )}
                  </button>
                </div>
            </div>
          </div>


        </div>

        <div className="modal-footer">
          <button className="btn-close-modal" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailsModal;
