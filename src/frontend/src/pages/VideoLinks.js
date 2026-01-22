import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ExternalLink, Video, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { sitesAPI } from '../services/api';
import '../styles/VideoLinks.css';

const VideoLinks = () => {
  const [videoLinks, setVideoLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSite, setFilterSite] = useState('');
  const [stats, setStats] = useState(null);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video_url: '',
    site_id: ''
  });

  const [errors, setErrors] = useState({});

  // Site management state
  const [sites, setSites] = useState([]);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');

  useEffect(() => {
    fetchVideoLinks();
    fetchSites();
    fetchStats();
  }, []);

  const fetchVideoLinks = async () => {
    try {
      const response = await fetch('/api/video-links');
      const data = await response.json();
      if (data.success) {
        setVideoLinks(data.data);
      }
    } catch (error) {
      console.error('Error fetching video links:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSites = async () => {
    try {
      const response = await sitesAPI.getSites();
      if (response.data.success) {
        setSites(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching sites:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/video-links/stats/summary');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const filteredLinks = videoLinks.filter(link => {
    const matchesSearch = link.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (link.description && link.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSite = !filterSite || link.site_id === filterSite;

    return matchesSearch && matchesSite;
  });

  const getVideoThumbnail = (url) => {
    // Extract YouTube video ID and return thumbnail
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    if (youtubeMatch) {
      return `https://img.youtube.com/vi/${youtubeMatch[1]}/mqdefault.jpg`;
    }
    return null;
  };

  const handleAddSite = async () => {
    if (!newSiteName.trim()) {
      alert('Please enter a site name');
      return;
    }

    try {
      const response = await sitesAPI.createSite({ name: newSiteName.trim() });
      if (response.data.success) {
        await fetchSites();
        setNewSiteName('');
        setShowSiteModal(false);
        setFormData({ ...formData, site_id: response.data.data.id });
        alert('Site added successfully!');
      } else {
        alert(response.data.error || 'Failed to add site');
      }
    } catch (error) {
      console.error('Error adding site:', error);
      alert('Failed to add site: ' + error.message);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.video_url.trim()) {
      newErrors.video_url = 'Video URL is required';
    } else {
      try {
        new URL(formData.video_url);
      } catch {
        newErrors.video_url = 'Please enter a valid URL';
      }
    }

    if (!formData.site_id) {
      newErrors.site_id = 'Please select a site';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const submitData = {
        title: formData.title,
        description: formData.description,
        video_url: formData.video_url,
        site_id: formData.site_id || null
      };

      const url = editingLink ? `/api/video-links/${editingLink.id}` : '/api/video-links';
      const method = editingLink ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (data.success) {
        await fetchVideoLinks();
        await fetchStats();
        handleCloseModal();
      } else {
        setErrors({ submit: data.error || 'Failed to save video link' });
      }
    } catch (error) {
      console.error('Error saving video link:', error);
      setErrors({ submit: 'Failed to save video link' });
    }
  };

  const handleEdit = (link) => {
    setEditingLink(link);
    setFormData({
      title: link.title,
      description: link.description || '',
      video_url: link.video_url,
      site_id: link.site_id || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this video link?')) {
      return;
    }

    try {
      const response = await fetch(`/api/video-links/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        await fetchVideoLinks();
        await fetchStats();
      } else {
        alert('Failed to delete video link');
      }
    } catch (error) {
      console.error('Error deleting video link:', error);
      alert('Failed to delete video link');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingLink(null);
    setFormData({
      title: '',
      description: '',
      video_url: '',
      site_id: ''
    });
    setErrors({});
  };

  const getSiteName = (siteId) => {
    const site = sites.find(s => s.id.toString() === siteId.toString());
    return site ? site.name : siteId;
  };

  if (loading) {
    return (
      <div className="video-links-loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="video-links-container space-y-6">
      {/* Header */}
      <div className="video-links-header flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Video Links</h1>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Video Link</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="video-links-stats grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="flex items-center">
              <Video className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Links</p>
                <p className="text-2xl font-bold text-gray-900">{stats.overview.total_links}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-bold">S</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Site Links</p>
                <p className="text-2xl font-bold text-gray-900">{stats.overview.site_links}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-bold">U</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Updated</p>
                <p className="text-2xl font-bold text-gray-900">{stats.overview.updated_links}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search videos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterSite}
            onChange={(e) => setFilterSite(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Sites</option>
            {sites.map(site => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Video Links Grid */}
      <div className="video-links-grid">
        {filteredLinks.map((link) => (
          <div key={link.id} className="video-card">
            {/* Video Thumbnail */}
            <div className="relative h-48 bg-gray-200">
              {getVideoThumbnail(link.video_url) ? (
                <img
                  src={getVideoThumbnail(link.video_url)}
                  alt={link.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Video className="h-16 w-16 text-gray-400" />
                </div>
              )}
              <div className="absolute top-2 right-2">
                <a
                  href={link.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-semibold text-lg text-gray-900 mb-2">{link.title}</h3>
              {link.description && (
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">{link.description}</p>
              )}

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-3">
                {link.site_id && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                    {getSiteName(link.site_id)}
                  </span>
                )}
              </div>

              {/* Metadata */}
              <div className="text-xs text-gray-500 mb-3">
                <p>Created: {new Date(link.create_date).toLocaleDateString()}</p>
                {link.update_date && (
                  <p>Updated: {new Date(link.update_date).toLocaleDateString()}</p>
                )}
              </div>

              {/* Actions */}
              {user?.role === 'admin' && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(link)}
                    className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded text-sm hover:bg-blue-100"
                  >
                    <Edit className="h-4 w-4 inline mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(link.id)}
                    className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded text-sm hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4 inline mr-1" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredLinks.length === 0 && (
        <div className="text-center py-12">
          <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No video links found</h3>
          <p className="text-gray-600">
            {searchTerm || filterSite
              ? 'Try adjusting your filters'
              : user?.role === 'admin' ? 'Add your first video link to get started' : 'No video links available'}
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">
              {editingLink ? 'Edit Video Link' : 'Add Video Link'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter video title"
                />
                {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Video URL *
                </label>
                <input
                  type="url"
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://youtube.com/watch?v=..."
                />
                {errors.video_url && <p className="text-red-600 text-sm mt-1">{errors.video_url}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Site *
                </label>
                <div className="flex space-x-2">
                  <select
                    value={formData.site_id}
                    onChange={(e) => setFormData({ ...formData, site_id: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a site</option>
                    {sites.map(site => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowSiteModal(true)}
                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 whitespace-nowrap"
                  >
                    Add Site
                  </button>
                </div>
                {errors.site_id && <p className="text-red-600 text-sm mt-1">{errors.site_id}</p>}
              </div>

              {errors.submit && <p className="text-red-600 text-sm">{errors.submit}</p>}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingLink ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Site Management Modal */}
      {showSiteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Add New Site</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Site Name *
                </label>
                <input
                  type="text"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter site name"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSite()}
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowSiteModal(false);
                    setNewSiteName('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddSite}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Add Site
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoLinks;