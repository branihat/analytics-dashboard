import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, MapPin, Video } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { sitesAPI } from '../services/api';
import toast from 'react-hot-toast';
import '../styles/Sites.css';

const Sites = () => {
  const { user } = useAuth();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const isAdmin = user?.role === 'admin' || user?.userType === 'admin';

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      setLoading(true);
      const response = await sitesAPI.getSites();
      
      if (response.data.success) {
        setSites(response.data.data);
      } else {
        toast.error('Failed to fetch sites');
      }
    } catch (error) {
      console.error('Error fetching sites:', error);
      toast.error('Failed to fetch sites');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Site name is required');
      return;
    }

    try {
      let response;
      if (editingSite) {
        response = await sitesAPI.updateSite(editingSite.id, formData);
      } else {
        response = await sitesAPI.createSite(formData);
      }

      if (response.data.success) {
        toast.success(response.data.message);
        await fetchSites();
        handleCloseModal();
      } else {
        toast.error(response.data.error || 'Operation failed');
      }
    } catch (error) {
      console.error('Error saving site:', error);
      toast.error('Failed to save site');
    }
  };

  const handleEdit = (site) => {
    setEditingSite(site);
    setFormData({
      name: site.name,
      description: site.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (site) => {
    if (!window.confirm(`Are you sure you want to delete "${site.name}"?`)) {
      return;
    }

    try {
      const response = await sitesAPI.deleteSite(site.id);

      if (response.data.success) {
        toast.success(response.data.message);
        await fetchSites();
      } else {
        toast.error(response.data.error || 'Failed to delete site');
      }
    } catch (error) {
      console.error('Error deleting site:', error);
      toast.error('Failed to delete site');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSite(null);
    setFormData({ name: '', description: '' });
  };

  if (loading) {
    return (
      <div className="sites-loading">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="sites-container space-y-6">
      <div className="sites-header flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Site Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            {isAdmin ? 'Manage mining sites and locations' : 'View mining sites and locations'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Site</span>
          </button>
        )}
      </div>

      <div className="sites-grid">
        {sites.map((site) => (
          <div key={site.id} className="site-card">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">{site.name}</h3>
              </div>
              {isAdmin && (
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleEdit(site)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(site)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {site.description && (
              <p className="text-gray-600 text-sm mb-4">{site.description}</p>
            )}

            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Video className="h-4 w-4" />
                <span>{site.video_count || 0} video links</span>
              </div>
              <span>Created {new Date(site.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>

      {sites.length === 0 && (
        <div className="text-center py-12">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No sites found</h3>
          <p className="text-gray-600 mb-4">Get started by adding your first mining site.</p>
          {isAdmin && (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Site
            </button>
          )}
        </div>
      )}

      {/* Site Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">
              {editingSite ? 'Edit Site' : 'Add New Site'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Site Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter site name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter site description (optional)"
                  rows="3"
                />
              </div>

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
                  {editingSite ? 'Update' : 'Add'} Site
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sites;