import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Eye, Trash2, Upload, Search, Filter, Edit2, Check, X } from 'lucide-react';
import UploadModal from '../components/UploadModal';
import DetailsModal from '../components/DetailsModal';
import '../styles/UploadATR.css';

const InferredReports = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedSite, setSelectedSite] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingHyperlink, setEditingHyperlink] = useState(null);
  const [editHyperlinkValue, setEditHyperlinkValue] = useState('');
  const [sites, setSites] = useState([]); // Dynamic sites from database

  const isAdmin = user?.role === 'admin' || user?.userType === 'admin' || user?.username === 'AEROVANIA MASTER';

  useEffect(() => {
    fetchDocuments();
    fetchSites(); // Fetch sites on mount
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [selectedSite, dateFilter, searchTerm]);

  const fetchSites = async () => {
    try {
      const response = await api.get('/sites');
      if (response.data.success) {
        setSites(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching sites:', error);
      toast.error('Failed to load sites');
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = {};
      
      // Add filters to params
      if (selectedSite !== 'all') {
        params.site = selectedSite;
      }
      if (dateFilter) {
        params.startDate = dateFilter;
      }
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const response = await api.get('/inferred-reports/list', { params });
      const documentsData = response.data?.documents || [];
      console.log('📊 Fetched documents:', documentsData);
      console.log('📊 First document hyperlink:', documentsData[0]?.hyperlink);
      setDocuments(Array.isArray(documentsData) ? documentsData : []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments([]);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchDocuments();
  };

  const handleClearFilters = () => {
    setSelectedSite('all');
    setDateFilter('');
    setSearchTerm('');
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleUpload = async ({ file, siteName, hyperlink }) => {
    if (!file) {
      toast.error('Please select a PDF file');
      return;
    }

    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast.error('File size must be less than 25MB');
      return;
    }

    // Validate hyperlink only if provided
    if (hyperlink && !isValidUrl(hyperlink)) {
      toast.error('Please enter a valid URL for the hyperlink');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('siteName', siteName);
      formData.append('hyperlink', hyperlink);

      await api.post('/inferred-reports/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Inferred Report uploaded successfully!');
      setShowUploadModal(false);
      fetchDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to upload document';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleView = async (documentId) => {
    try {
      const response = await api.get(`/inferred-reports/view/${documentId}`);
      window.open(response.data.url, '_blank');
    } catch (error) {
      console.error('View error:', error);
      toast.error('Failed to open document');
    }
  };

  const handleDelete = async (documentId, filename) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) {
      return;
    }

    try {
      await api.delete(`/inferred-reports/${documentId}`);
      toast.success('Document deleted successfully');
      fetchDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.error || 'Failed to delete document');
    }
  };

  const openDetailsModal = (doc) => {
    setSelectedDocument(doc);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedDocument(null);
  };

  // Hyperlink Edit/Delete Handlers
  const handleEditHyperlink = (doc) => {
    setEditingHyperlink(doc.id);
    setEditHyperlinkValue(doc.hyperlink || '');
  };

  const handleSaveHyperlink = async (docId) => {
    // Validate URL
    if (!editHyperlinkValue.trim()) {
      toast.error('Hyperlink cannot be empty');
      return;
    }

    if (!isValidUrl(editHyperlinkValue.trim())) {
      toast.error('Please enter a valid URL');
      return;
    }

    try {
      await api.patch(`/inferred-reports/${docId}/hyperlink`, {
        hyperlink: editHyperlinkValue.trim()
      });
      toast.success('Hyperlink updated successfully');
      setEditingHyperlink(null);
      setEditHyperlinkValue('');
      fetchDocuments();
    } catch (error) {
      console.error('Update hyperlink error:', error);
      toast.error(error.response?.data?.error || 'Failed to update hyperlink');
    }
  };

  const handleCancelEditHyperlink = () => {
    setEditingHyperlink(null);
    setEditHyperlinkValue('');
  };

  const handleUploadAtr = async (documentId, file, site, department, comment) => {
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('siteName', site);
      formData.append('department', department);
      if (comment) formData.append('comment', comment);

      await api.post(`/inferred-reports/${documentId}/upload-atr`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('ATR uploaded successfully!');
      closeDetailsModal();
      fetchDocuments();
    } catch (error) {
      console.error('Upload ATR error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to upload ATR';
      toast.error(errorMessage);
      throw error;
    }
  };

  const handleViewAtr = (atrUrl) => {
    if (atrUrl) {
      window.open(atrUrl, '_blank');
    } else {
      toast.error('ATR URL not found');
    }
  };

  const handleDeleteAtr = async (inferredReportId, atrId, atrFilename) => {
    if (!window.confirm(`Are you sure you want to delete the ATR "${atrFilename}"?`)) {
      return;
    }

    try {
      await api.delete(`/inferred-reports/${inferredReportId}/atr/${atrId}`);
      toast.success('ATR deleted successfully');
      fetchDocuments();
    } catch (error) {
      console.error('Delete ATR error:', error);
      toast.error(error.response?.data?.error || 'Failed to delete ATR');
    }
  };

  return (
    <div className="upload-atr-container">
      <div className="upload-atr-header">
        <h1>Inferred Reports</h1>
      </div>

      {/* Filters and Search Section */}
      <div className="filters-section">
        <div className="filters-row">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by filename, site, or comment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} className="search-button">
              <Search size={18} />
              Search
            </button>
          </div>
          
          <div className="filter-controls">
            <div className="filter-group">
              <label>Date Filter:</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="date-filter"
              />
            </div>

            <div className="filter-group">
              <label>Site Filter:</label>
              <select
                value={selectedSite}
                onChange={(e) => setSelectedSite(e.target.value)}
                className="site-filter"
              >
                <option value="all">All Sites</option>
                {sites.map(site => (
                  <option key={site.id} value={site.name}>{site.name}</option>
                ))}
              </select>
            </div>
            
            <button onClick={handleClearFilters} className="clear-filters-button">
              <Filter size={16} />
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Upload Button - Admin Only */}
      {isAdmin && (
        <div className="upload-button-section">
          <button 
            className="upload-file-button"
            onClick={() => setShowUploadModal(true)}
            disabled={uploading}
          >
            <Upload size={20} />
            Upload Inferred Report
          </button>
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal
        showModal={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
        uploading={uploading}
        sites={sites}
      />

      {/* Documents List */}
      <div className="documents-section">
        <div className="documents-header">
          <div className="header-left">
            <h2>Inferred Reports</h2>
            {isAdmin && (
              <span className="admin-badge">👑 Admin View</span>
            )}
          </div>
          <div className="header-right">
            <button onClick={fetchDocuments} className="refresh-button" disabled={loading}>
              {loading ? '🔄' : '↻'} Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading documents...</p>
          </div>
        ) : !Array.isArray(documents) || documents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <h3>No inferred reports found</h3>
            <p>Upload your first inferred report to get started</p>
          </div>
        ) : (
          <div className="documents-table-wrapper">
            <table className="documents-table">
              <thead>
                <tr>
                  <th>S. No.</th>
                  <th>File Name</th>
                  <th>Actions</th>
                  <th>Site Name</th>
                  <th>Date/Time</th>
                  <th>Video Link</th>
                  <th>Upload ATR</th>
                </tr>
              </thead>
              <tbody>
                {documents.filter(doc => doc && doc.id).map((doc, index) => {
                  // Debug logging for hyperlink
                  if (index === 0) {
                    console.log('🔍 Document hyperlink value:', doc.hyperlink);
                    console.log('🔍 Document hyperlink type:', typeof doc.hyperlink);
                    console.log('🔍 Full document:', doc);
                  }
                  
                  return (
                  <tr key={doc.id}>
                    <td>{index + 1}</td>
                    <td className="filename-cell">
                      <div className="file-info">
                        <span className="file-icon">📄</span>
                        <span className="filename">{doc.filename || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="actions-cell">
                      <button
                        onClick={() => handleView(doc.id)}
                        className="icon-button view"
                        title="View Document"
                      >
                        <Eye size={18} />
                      </button>
                      {isAdmin && doc.canDelete && (
                        <button
                          onClick={() => handleDelete(doc.id, doc.filename)}
                          className="icon-button delete"
                          title="Delete Document"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                    <td>{doc.site_name || 'N/A'}</td>
                    <td>{doc.upload_date ? new Date(doc.upload_date).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'N/A'}</td>
                    <td className="video-link-cell">
                      {editingHyperlink === doc.id ? (
                        <div className="edit-field">
                          <input
                            type="url"
                            value={editHyperlinkValue}
                            onChange={(e) => setEditHyperlinkValue(e.target.value)}
                            placeholder="Enter video link URL"
                            className="hyperlink-input"
                          />
                          <button
                            onClick={() => handleSaveHyperlink(doc.id)}
                            className="icon-button save"
                            title="Save"
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={handleCancelEditHyperlink}
                            className="icon-button cancel"
                            title="Cancel"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <div className="view-field">
                          {doc.hyperlink ? (
                            <>
                              <a 
                                href={doc.hyperlink} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="video-link"
                                title="Open video link"
                              >
                                🔗 Link
                              </a>
                              {doc.canEdit && isAdmin && (
                                <button
                                  onClick={() => handleEditHyperlink(doc)}
                                  className="icon-button edit"
                                  title="Edit hyperlink"
                                >
                                  <Edit2 size={16} />
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="no-link">-</span>
                              {doc.canEdit && isAdmin && (
                                <button
                                  onClick={() => handleEditHyperlink(doc)}
                                  className="icon-button edit"
                                  title="Add hyperlink"
                                >
                                  <Edit2 size={16} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="upload-atr-cell">
                      {doc.hasAtr ? (
                        <div className="atr-uploaded">
                          <span className="atr-filename" title={doc.atrFilename}>
                            📄 {doc.atrFilename}
                          </span>
                          <div className="atr-actions">
                            <button
                              onClick={() => handleViewAtr(doc.atrUrl)}
                              className="icon-button view"
                              title="View ATR"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteAtr(doc.id, doc.atrId, doc.atrFilename)}
                              className="icon-button delete"
                              title="Delete ATR"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => openDetailsModal(doc)}
                          className="upload-atr-button"
                          title="Upload ATR Document"
                        >
                          <Upload size={16} />
                          <span>Upload ATR</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      <DetailsModal
        show={showDetailsModal}
        document={selectedDocument}
        onClose={closeDetailsModal}
        onUploadAtr={handleUploadAtr}
      />
    </div>
  );
};

export default InferredReports;