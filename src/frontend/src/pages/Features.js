import React, { useState, useEffect } from 'react';
import { Search, Plus, BarChart3, AlertTriangle, Eye, X } from 'lucide-react';
import { featuresAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import '../styles/Features.css';

const Features = () => {
  const { user } = useAuth();
  const [features, setFeatures] = useState([]);
  const [featureStats, setFeatureStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [featureViolations, setFeatureViolations] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFeature, setNewFeature] = useState({
    name: '',
    display_name: '',
    description: ''
  });

  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.userType === 'admin';

  useEffect(() => {
    fetchFeatures();
    fetchFeatureStats();
  }, []);

  const fetchFeatures = async () => {
    try {
      const response = await featuresAPI.getFeatures();
      setFeatures(response.data.features);
    } catch (error) {
      console.error('Error fetching features:', error);
      toast.error('Failed to load features');
    }
  };

  const fetchFeatureStats = async () => {
    try {
      const response = await featuresAPI.getFeatureStats();
      setFeatureStats(response.data.feature_stats);
    } catch (error) {
      console.error('Error fetching feature stats:', error);
      toast.error('Failed to load feature statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeatureViolations = async (featureName) => {
    try {
      const response = await featuresAPI.getFeatureViolations(featureName);
      setFeatureViolations(response.data.violations);
      setSelectedFeature(featureName);
    } catch (error) {
      console.error('Error fetching feature violations:', error);
      toast.error('Failed to load feature violations');
    }
  };

  const handleAddFeature = async (e) => {
    e.preventDefault();

    if (!newFeature.name || !newFeature.display_name) {
      toast.error('Name and display name are required');
      return;
    }

    try {
      await featuresAPI.createFeature(newFeature);
      toast.success('Feature created successfully');
      setShowAddModal(false);
      setNewFeature({ name: '', display_name: '', description: '' });
      fetchFeatures();
      fetchFeatureStats();
    } catch (error) {
      console.error('Error creating feature:', error);
      toast.error(error.response?.data?.error || 'Failed to create feature');
    }
  };

  const handleDeleteFeature = async (featureName, displayName) => {
    if (window.confirm(`Are you sure you want to delete the feature "${displayName}"? This action cannot be undone.`)) {
      try {
        await featuresAPI.deleteFeature(featureName);
        toast.success('Feature deleted successfully');
        fetchFeatures();
        fetchFeatureStats();
      } catch (error) {
        console.error('Error deleting feature:', error);
        toast.error('Failed to delete feature');
      }
    }
  };

  const filteredFeatures = features.filter(feature => {
    return feature.display_name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getFeatureStats = (featureName) => {
    return featureStats.find(stat => stat.feature_name === featureName) || {
      violation_count: 0,
      drone_count: 0,
      location_count: 0
    };
  };

  if (loading) {
    return (
      <div className="features-loading">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="features-container space-y-6">
      <div className="features-header flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Features</h1>
          <p className="text-sm text-gray-600 mt-1">Manage and monitor detection features</p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            Total: {features.length} features
          </span>
          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Feature</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Controls */}
      <div className="features-search-bar bg-white rounded-lg shadow p-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search features..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Features Grid */}
      <div className="features-grid">
        {filteredFeatures.map((feature) => {
          const stats = getFeatureStats(feature.name);
          return (
            <div
              key={feature.name}
              className="feature-card"
              onClick={() => fetchFeatureViolations(feature.name)}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {feature.display_name}
                    </h3>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFeature(feature.name, feature.display_name);
                      }}
                      className="text-red-600 hover:text-red-800 text-sm p-1 rounded hover:bg-red-50"
                      title="Delete feature"
                    >
                      🗑️
                    </button>
                  )}
                </div>

                {feature.description && (
                  <p className="text-sm text-gray-600 mb-4">{feature.description}</p>
                )}

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-red-600">{stats.violation_count}</div>
                    <div className="text-xs text-gray-500">Violations</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{stats.drone_count}</div>
                    <div className="text-xs text-gray-500">Drones</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{stats.location_count}</div>
                    <div className="text-xs text-gray-500">Locations</div>
                  </div>
                </div>

                {stats.last_detected && (
                  <div className="mt-4 text-xs text-gray-500">
                    Last detected: {new Date(stats.last_detected).toLocaleDateString()}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-center text-blue-600 hover:text-blue-700">
                  <Eye className="h-4 w-4 mr-1" />
                  <span className="text-sm">View Details</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredFeatures.length === 0 && (
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No features found</h3>
          <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
        </div>
      )}

      {/* Add Feature Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Add New Feature</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <form onSubmit={handleAddFeature} className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Feature Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={newFeature.name}
                    onChange={(e) => setNewFeature({ ...newFeature, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., safety_helmet_detection"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Use lowercase with underscores</p>
                </div>

                <div>
                  <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    id="display_name"
                    value={newFeature.display_name}
                    onChange={(e) => setNewFeature({ ...newFeature, display_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Safety Helmet Detection"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={newFeature.description}
                    onChange={(e) => setNewFeature({ ...newFeature, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Brief description of the feature..."
                    rows="3"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Feature
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feature Details Modal */}
      {selectedFeature && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {selectedFeature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Violations
                </h2>
                <button
                  onClick={() => setSelectedFeature(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {featureViolations.length > 0 ? (
                <div className="space-y-4">
                  {featureViolations.map((violation) => (
                    <div key={violation.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">Violation #{violation.id}</h4>
                          <p className="text-sm text-gray-500">
                            {violation.location} • {violation.date} {violation.timestamp}
                          </p>
                        </div>
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                          {violation.type}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Drone:</span> {violation.drone_id}
                        </div>
                        <div>
                          <span className="text-gray-500">Coordinates:</span> {violation.latitude}, {violation.longitude}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No violations found for this feature.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Features;