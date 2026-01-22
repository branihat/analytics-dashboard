import React, { useState, useEffect } from 'react';
import { Search, Filter, ArrowUpDown, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { violationsAPI } from '../services/api';
import toast from 'react-hot-toast';
import '../styles/TableView.css';

// Image component that uses backend proxy for Google Drive images (same as MapView)
const ImageWithFallback = ({ src, alt, className }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Use backend image proxy for all external images, especially Google Drive
  const getImageUrl = (originalSrc) => {
    if (!originalSrc) return '';

    // For external URLs (including Google Drive), use the backend image proxy
    if (originalSrc.startsWith('http')) {
      const encodedUrl = encodeURIComponent(originalSrc);
      // Use the API base URL from environment or default to current origin
      const apiBaseUrl = process.env.REACT_APP_API_URL || 
        (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');
      const proxyUrl = `${apiBaseUrl}/api/image-proxy?url=${encodedUrl}`;
      console.log('🔍 TableView Image URL Debug:');
      console.log('  Original URL:', originalSrc);
      console.log('  API Base URL:', apiBaseUrl);
      console.log('  Encoded URL:', encodedUrl);
      console.log('  Final Proxy URL:', proxyUrl);
      console.log('  Proxy URL Length:', proxyUrl.length);
      return proxyUrl;
    }

    return originalSrc;
  };

  const imageUrl = getImageUrl(src);

  const handleLoad = () => {
    console.log('Image loaded successfully:', imageUrl);
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = async (e) => {
    console.error('Image failed to load:', imageUrl);
    console.error('Original URL:', src);
    console.error('Error details:', e);
    console.error('Error type:', e.type);
    console.error('Error target:', e.target);

    // Try to get more details about the error from the backend
    if (imageUrl.includes('/api/image-proxy')) {
      try {
        console.log('Testing backend proxy response...');
        const response = await fetch(imageUrl);
        console.log('Backend response status:', response.status);
        console.log('Backend response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Backend error details:', errorData);
        } else {
          console.log('Backend proxy returned OK, but image element failed to load');
          console.log('This might be a CORS or content-type issue');
        }
      } catch (fetchError) {
        console.error('Could not fetch error details:', fetchError);
      }
    }

    setIsLoading(false);
    setHasError(true);
  };

  // Reset state when src changes
  useEffect(() => {
    console.log('Image src changed to:', src);
    setIsLoading(true);
    setHasError(false);
  }, [src]);

  if (hasError) {
    return (
      <div className={`${className} bg-gray-100 flex items-center justify-center`}>
        <div className="text-center text-xs text-gray-500">
          <div className="text-lg mb-1">📷</div>
          <div className="font-medium">Image not available</div>
          <div className="text-xs text-gray-400 mb-2">
            Failed URL: {imageUrl}
          </div>
          <div className="text-xs text-gray-400 mb-2">
            Original: {src}
          </div>
          <div className="text-xs text-red-500 mb-2">
            💡 Tip: Ensure Google Drive file is publicly accessible
          </div>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-xs mt-1 block"
          >
            View original
          </a>
          <button
            onClick={() => {
              console.log('Retrying image load...');
              setHasError(false);
              setIsLoading(true);
            }}
            className="text-blue-600 hover:underline text-xs mt-1 block"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} relative`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
        </div>
      )}
      <img
        src={imageUrl}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={handleLoad}
        onError={handleError}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </div>
  );
};

const TableView = () => {
  const [violations, setViolations] = useState([]);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    drone_id: '',
    violation_type: '',
    location: '',
    date_from: '',
    date_to: '',
    page: 1,
    limit: 10,
    sort_by: 'date',
    sort_order: 'desc'
  });
  const [filterOptions, setFilterOptions] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedViolation, setSelectedViolation] = useState(null);

  useEffect(() => {
    fetchViolations();
    fetchFilterOptions();
  }, [filters]);

  const fetchViolations = async () => {
    try {
      setLoading(true);
      const response = searchTerm
        ? await violationsAPI.searchViolations(searchTerm, filters)
        : await violationsAPI.getViolations(filters);

      setViolations(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching violations:', error);
      toast.error('Failed to load violations');
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      const response = await violationsAPI.getFilters();
      setFilterOptions(response.data.filters);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleSort = (field) => {
    setFilters(prev => ({
      ...prev,
      sort_by: field,
      sort_order: prev.sort_by === field && prev.sort_order === 'asc' ? 'desc' : 'asc',
      page: 1
    }));
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      setFilters(prev => ({ ...prev, page: 1 }));
      fetchViolations();
    }
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const clearFilters = () => {
    setFilters({
      drone_id: '',
      violation_type: '',
      location: '',
      date_from: '',
      date_to: '',
      page: 1,
      limit: 10,
      sort_by: 'date',
      sort_order: 'desc'
    });
    setSearchTerm('');
  };

  // Helper function to format violation type names
  const formatViolationType = (type) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getViolationTypeColor = (type) => {
    const formattedType = formatViolationType(type);
    const colors = {
      'Ppe Kit Detection': 'bg-red-100 text-red-800',
      'Crowding Of People': 'bg-cyan-100 text-cyan-800',
      'Crowding Of Vehicles': 'bg-blue-100 text-blue-800',
      'Rest Shelter Lighting': 'bg-green-100 text-green-800',
      'Stagnant Water': 'bg-yellow-100 text-yellow-800',
      'Fire Smoke': 'bg-orange-100 text-orange-800',
      'Loose Boulder': 'bg-amber-100 text-amber-800',
      'Red Flag': 'bg-rose-100 text-rose-800',
    };
    return colors[formattedType] || 'bg-gray-100 text-gray-800';
  };

  const SortButton = ({ field, children }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
    >
      <span>{children}</span>
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between animate-slideDown">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Violations Table</h1>
          <p className="text-gray-600 mt-1">
            {pagination.total_items || 0} total violations found
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-soft p-6 card-hover animate-slideUp custom-scrollbar">
        <div className="space-y-4 mb-6">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search violations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleSearch}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Drone ID</label>
              <select
                value={filters.drone_id}
                onChange={(e) => handleFilterChange('drone_id', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Drones</option>
                {filterOptions.drone_ids?.map(id => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Violation Type</label>
              <select
                value={filters.violation_type}
                onChange={(e) => handleFilterChange('violation_type', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                {filterOptions.violation_types?.map(type => (
                  <option key={type.value || type} value={type.value || type}>
                    {type.label || type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
              <select
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Locations</option>
                {filterOptions.locations?.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date From</label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date To</label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                  title="Clear all filters"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Drone ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Violation Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coordinates</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[...Array(5)].map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-6 bg-gray-200 rounded-full w-32"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-28"></div>
                        <div className="h-3 bg-gray-200 rounded w-20"></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-8 bg-gray-200 rounded w-16"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <SortButton field="drone_id">Drone ID</SortButton>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <SortButton field="type">Violation Type</SortButton>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <SortButton field="date">Date & Time</SortButton>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Coordinates
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {violations.map((violation, index) => (
                    <tr 
                      key={violation.id} 
                      className="hover:bg-blue-50 transition-all duration-200 hover:shadow-sm animate-fadeIn"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <span>{violation.drone_id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getViolationTypeColor(violation.type)} transition-all duration-200 hover:scale-105`}>
                          {formatViolationType(violation.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center space-x-1">
                          <span className="text-gray-400">📍</span>
                          <span>{violation.location}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium flex items-center space-x-1">
                            <span className="text-gray-400">📅</span>
                            <span>{violation.date}</span>
                          </div>
                          <div className="text-gray-500 flex items-center space-x-1 mt-1">
                            <span className="text-gray-400">🕐</span>
                            <span>{violation.timestamp}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="font-mono text-xs bg-gray-50 px-2 py-1 rounded">
                          <div className="text-gray-600">Lat: {violation.latitude.toFixed(6)}</div>
                          <div className="text-gray-600">Lng: {violation.longitude.toFixed(6)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedViolation(violation)}
                          className="group flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all duration-200 hover:shadow-md"
                        >
                          <Eye className="h-4 w-4 group-hover:scale-110 transition-transform" />
                          <span className="font-medium">View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {violations.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No violations found matching your criteria.</p>
              </div>
            )}

            {pagination.total_pages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((pagination.current_page - 1) * pagination.per_page) + 1} to{' '}
                  {Math.min(pagination.current_page * pagination.per_page, pagination.total_items)} of{' '}
                  {pagination.total_items} results
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.current_page - 1)}
                    disabled={pagination.current_page <= 1}
                    className="p-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <span className="px-4 py-2 text-sm text-gray-700">
                    Page {pagination.current_page} of {pagination.total_pages}
                  </span>

                  <button
                    onClick={() => handlePageChange(pagination.current_page + 1)}
                    disabled={pagination.current_page >= pagination.total_pages}
                    className="p-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selectedViolation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-slideUp">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-semibold text-gray-900 flex items-center space-x-2">
                  <span className="text-3xl">🔍</span>
                  <span>Violation Details</span>
                </h3>
                <button
                  onClick={() => setSelectedViolation(null)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center transition-all duration-200 hover:rotate-90"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">ID</label>
                  <p className="text-sm text-gray-900">{selectedViolation.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <p className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getViolationTypeColor(selectedViolation.type)}`}>
                    {formatViolationType(selectedViolation.type)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Drone ID</label>
                  <p className="text-sm text-gray-900">{selectedViolation.drone_id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <p className="text-sm text-gray-900">{selectedViolation.location}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <p className="text-sm text-gray-900">{selectedViolation.date}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Time</label>
                  <p className="text-sm text-gray-900">{selectedViolation.timestamp}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Coordinates</label>
                  <p className="text-sm text-gray-900 font-mono">
                    {selectedViolation.latitude.toFixed(6)}, {selectedViolation.longitude.toFixed(6)}
                  </p>
                </div>
              </div>

              {selectedViolation.image_url && (
                <div className="mt-6">
                  <label className="block text-lg font-medium text-gray-700 mb-4">Evidence Image</label>
                  <ImageWithFallback
                    src={selectedViolation.image_url}
                    alt={selectedViolation.type}
                    className="w-full h-96 object-contain rounded-lg border border-gray-200"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableView; 