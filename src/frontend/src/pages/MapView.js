import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from 'react-leaflet';
import { Filter, RefreshCw } from 'lucide-react';
import { violationsAPI, boundariesAPI } from '../services/api';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import '../styles/MapView.css';

// Simple image component that works with Google Drive through backend proxy
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
      console.log('🔍 Frontend Image URL Debug:');
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

// Predefined colors for features - will be assigned dynamically
const featureColors = [
  '#FF4444', '#00CED1', '#1E90FF', '#32CD32', '#FFD700', 
  '#FF6347', '#8B4513', '#DC143C', '#9C27B0', '#E91E63', 
  '#F44336', '#FF9800', '#FF5722', '#795548', '#607D8B', 
  '#3F51B5', '#2196F3', '#00BCD4', '#009688', '#4CAF50', 
  '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#9E9E9E', 
  '#673AB7', '#FF1744', '#00E676', '#00B0FF', '#FFB300',
  '#6200EA', '#C51162', '#AA00FF', '#3D5AFE', '#2979FF',
  '#00ACC1', '#00695C', '#2E7D32', '#558B2F', '#827717'
];

// Function to generate a random color if we run out of predefined colors
const generateRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

// Removed unused availableColors array

const createCustomIcon = (color) => {
  return new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 6.9 12.5 28.5 12.5 28.5S25 19.4 25 12.5C25 5.6 19.4 0 12.5 0z" fill="${color}" stroke="#fff" stroke-width="2"/>
        <circle cx="12.5" cy="12.5" r="6" fill="#fff"/>
      </svg>
    `)}`,
    iconSize: [25, 41],
    iconAnchor: [12.5, 41],
    popupAnchor: [0, -35],
  });
};

const MapView = () => {
  const [violations, setViolations] = useState([]);
  const [boundaries, setBoundaries] = useState(null);
  const [filters, setFilters] = useState({
    drone_id: '',
    violation_type: '',
    date_from: '',
    date_to: '',
  });
  const [filterOptions, setFilterOptions] = useState({});
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [activeLegends, setActiveLegends] = useState([]);
  const [colorMap, setColorMap] = useState(new Map());

  useEffect(() => {
    fetchMapData();
    fetchBoundaries();
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchMapData();
  }, [filters]);

  const fetchMapData = async () => {
    try {
      setLoading(true);
      const response = await violationsAPI.getMapData(filters);
      setViolations(response.data.markers);
    } catch (error) {
      console.error('Error fetching map data:', error);
      toast.error('Failed to load map data');
    } finally {
      setLoading(false);
    }
  };

  const fetchBoundaries = async () => {
    try {
      const response = await boundariesAPI.getBoundaries();
      setBoundaries(response.data.data);
    } catch (error) {
      console.error('Error fetching boundaries:', error);
      toast.error('Failed to load boundary data');
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
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      drone_id: '',
      violation_type: '',
      date_from: '',
      date_to: '',
    });
  };

  // Helper function to get color for a violation type (read-only)
  const getViolationColor = (violationType) => {
    return colorMap.get(violationType) || '#999999'; // Default gray if not found
  };

  // Function to assign colors to new violation types
  const assignColorsToViolations = (violationTypes) => {
    const newColorMap = new Map(colorMap);
    
    violationTypes.forEach(type => {
      if (!newColorMap.has(type)) {
        // Get all currently used colors
        const usedColors = new Set(Array.from(newColorMap.values()));
        
        // Find the first available color from our predefined list
        const availableColor = featureColors.find(color => !usedColors.has(color));
        
        // If no predefined color is available, generate a random one
        const assignedColor = availableColor || generateRandomColor();
        
        newColorMap.set(type, assignedColor);
        console.log(`Assigned color ${assignedColor} to violation type: ${type}`);
      }
    });
    
    return newColorMap;
  };

  // Update color assignments and active legends based on current violations
  useEffect(() => {
    if (violations.length > 0) {
      const uniqueTypes = [...new Set(violations.map(v => v.type))];
      
      // Assign colors to any new violation types
      const newColorMap = assignColorsToViolations(uniqueTypes);
      
      // Update color map if there are changes
      if (newColorMap.size !== colorMap.size || 
          !uniqueTypes.every(type => colorMap.has(type))) {
        setColorMap(newColorMap);
      }
      
      // Update active legends
      const activeLegendsData = uniqueTypes.map(type => ({
        name: type,
        color: newColorMap.get(type)
      }));
      
      setActiveLegends(activeLegendsData);
    }
  }, [violations]);

  // Removed unused getViolationTypeColors function

  // Legend management functions removed - legend is now display-only

  const boundaryStyle = {
    color: '#3B82F6',
    weight: 2,
    fillColor: '#3B82F6',
    fillOpacity: 0.1,
  };

  return (
    <div className="map-view-container space-y-4">
      <div className="map-view-header flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Map View</h1>
          <p className="text-gray-600 mt-1">
            {violations.length} violations displayed on map
          </p>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="filter-button flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </button>
          <button
            onClick={fetchMapData}
            className="refresh-button flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="map-filters bg-white rounded-lg shadow-md p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Drone ID
              </label>
              <select
                value={filters.drone_id}
                onChange={(e) => handleFilterChange('drone_id', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Drones</option>
                {filterOptions.drone_ids?.map(id => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Violation Type
              </label>
              <select
                value={filters.violation_type}
                onChange={(e) => handleFilterChange('violation_type', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      <div className="map-container" style={{ height: '600px' }}>
        {loading ? (
          <div className="map-loading">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-600">Loading map data...</span>
          </div>
        ) : (
          <MapContainer
            center={[23.7489, 85.9852]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {boundaries && (
              <GeoJSON
                data={boundaries}
                style={boundaryStyle}
                onEachFeature={(feature, layer) => {
                  if (feature.properties && feature.properties.name) {
                    layer.bindPopup(`
                      <div>
                        <strong>${feature.properties.name}</strong><br/>
                        Type: ${feature.properties.type}<br/>
                        Security Level: ${feature.properties.security_level}
                      </div>
                    `);
                  }
                }}
              />
            )}

            {violations.map((violation) => (
              <Marker
                key={violation.id}
                position={[violation.latitude, violation.longitude]}
                icon={createCustomIcon(getViolationColor(violation.type))}
              >
                <Popup>
                  <div className="min-w-64">
                    <div className="flex items-center space-x-2 mb-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getViolationColor(violation.type) }}
                      ></div>
                      <strong className="text-lg">{violation.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong>
                    </div>

                    <div className="space-y-1 text-sm text-gray-600">
                      <p><strong>Drone:</strong> {violation.drone_id}</p>
                      <p><strong>Location:</strong> {violation.location}</p>
                      <p><strong>Date:</strong> {violation.date}</p>
                      <p><strong>Time:</strong> {violation.timestamp}</p>
                      <p><strong>Coordinates:</strong> {violation.latitude.toFixed(6)}, {violation.longitude.toFixed(6)}</p>
                    </div>

                    {violation.image_url && (
                      <div className="mt-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">Evidence Image</div>
                        <ImageWithFallback 
                          src={violation.image_url} 
                          alt={violation.type}
                          className="w-full h-32 object-cover rounded"
                        />
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      {activeLegends.length > 0 && (
        <div className="map-legend">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Features</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {activeLegends.map((legend) => (
              <div key={legend.name} className="legend-item">
                <div
                  className="legend-color"
                  style={{ backgroundColor: legend.color }}
                ></div>
                <span className="text-sm text-gray-700">{legend.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend management modal removed - legend is now display-only */}
    </div>
  );
};

export default MapView; 