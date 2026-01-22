import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Eye, Trash2, Search, Filter, Edit2, Check, X } from 'lucide-react';
import '../styles/UploadATR.css';

const UploadedATR = () => {
  const { user } = useAuth();
  const [atrDocuments, setAtrDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [siteFilter, setSiteFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [editCommentValue, setEditCommentValue] = useState('');
  const [sites, setSites] = useState([]); // Dynamic sites from database

  const isAdmin = user?.role === 'admin' || user?.userType === 'admin' || user?.username === 'AEROVANIA MASTER';

  // Available departments
  const departments = [
    'Mining',
    'Survey',
    'Geology',
    'Environment',
    'Safety',
    'Mechanical',
    'Electrical'
  ];

  useEffect(() => {
    fetchATRDocuments();
    fetchSites(); // Fetch sites on mount
  }, []);

  useEffect(() => {
    fetchATRDocuments();
  }, [searchTerm, dateFilter, siteFilter, departmentFilter]);

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

  const fetchATRDocuments = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (dateFilter) params.startDate = dateFilter;
      if (siteFilter) params.site = siteFilter;
      if (departmentFilter) params.department = departmentFilter;
      
      const response = await api.get('/uploaded-atr/list', { params });
      const documentsData = response.data?.documents || [];
      setAtrDocuments(Array.isArray(documentsData) ? documentsData : []);
    } catch (error) {
      console.error('Error fetching ATR documents:', error);
      setAtrDocuments([]);
      toast.error('Failed to load ATR documents');
    } finally {
      setLoading(false);
    }
  };

  const handleViewATR = (atrLink) => {
    if (atrLink) {
      window.open(atrLink, '_blank');
    }
  };

  const handleDeleteATR = async (documentId, fileName) => {
    if (!window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return;
    }

    try {
      await api.delete(`/uploaded-atr/${documentId}`);
      toast.success('ATR document deleted successfully');
      fetchATRDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to delete ATR document';
      toast.error(errorMessage);
    }
  };

  const handleSearch = () => {
    fetchATRDocuments();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setDateFilter('');
    setSiteFilter('');
    setDepartmentFilter('');
  };

  const handleEditComment = (doc) => {
    setEditingComment(doc.id);
    setEditCommentValue(doc.comment || '');
  };

  const handleSaveComment = async (docId) => {
    try {
      await api.patch(`/uploaded-atr/${docId}/comment`, { comment: editCommentValue });
      toast.success('Comment updated successfully');
      setEditingComment(null);
      fetchATRDocuments();
    } catch (error) {
      console.error('Update comment error:', error);
      toast.error('Failed to update comment');
    }
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
    setEditCommentValue('');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="upload-atr-container">
      <div className="upload-atr-header">
        <h1>Uploaded ATR</h1>
        <p>View and manage Action Taken Reports for all sites</p>
      </div>

      {/* Filters and Search */}
      <div className="filters-section">
        <div className="filters-row">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by site name, file name, or comment..."
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
                value={siteFilter}
                onChange={(e) => setSiteFilter(e.target.value)}
                className="site-filter"
              >
                <option value="">All Sites</option>
                {sites.map(site => (
                  <option key={site.id} value={site.name}>{site.name}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Department Filter:</label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="department-filter"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
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

      {/* ATR Documents Table */}
      <div className="documents-section">
        <div className="documents-header">
          <div className="header-left">
            <h2>Action Taken Reports</h2>
            {isAdmin && (
              <span className="admin-badge">👑 Admin View</span>
            )}
          </div>
          <div className="header-right">
            <button onClick={fetchATRDocuments} className="refresh-button" disabled={loading}>
              {loading ? '🔄' : '↻'} Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading ATR documents...</p>
          </div>
        ) : atrDocuments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <h3>No ATR documents found</h3>
            <p>Upload your first ATR document to get started</p>
          </div>
        ) : (
          <div className="documents-table-wrapper">
            <table className="documents-table">
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Site Name</th>
                  <th>Department</th>
                  <th>Comment</th>
                  <th>Upload Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {atrDocuments.map((doc) => (
                  <tr key={doc.id}>
                    <td className="filename-cell">
                      <div className="file-info">
                        <span className="file-icon">📄</span>
                        <span className="filename">{doc.filename || 'Unknown'}</span>
                      </div>
                    </td>
                    <td>{doc.siteName || 'N/A'}</td>
                    <td>{doc.department || 'N/A'}</td>
                    <td className="comment-cell">
                      {editingComment === doc.id ? (
                        <div className="edit-field">
                          <textarea
                            value={editCommentValue}
                            onChange={(e) => setEditCommentValue(e.target.value)}
                            className="comment-textarea"
                            rows={2}
                            maxLength={500}
                          />
                          <div className="edit-actions-inline">
                            <button
                              onClick={() => handleSaveComment(doc.id)}
                              className="icon-button save"
                              title="Save"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="icon-button cancel"
                              title="Cancel"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="view-field">
                          <span className="field-value">{doc.comment || '-'}</span>
                          {doc.canEdit && (
                            <button
                              onClick={() => handleEditComment(doc)}
                              className="icon-button edit"
                              title="Edit Comment"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td>{formatDate(doc.uploadDate)}</td>
                    <td className="actions-cell">
                      <button
                        onClick={() => handleViewATR(doc.cloudinaryUrl)}
                        className="icon-button view"
                        title="View ATR Document"
                      >
                        <Eye size={18} />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteATR(doc.id, doc.filename)}
                          className="icon-button delete"
                          title="Delete ATR Document"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default UploadedATR;