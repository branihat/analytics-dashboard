import axios from 'axios';

// In production, use the same origin (Railway serves both frontend and backend)
// In development, use localhost backend
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8080');

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const uploadAPI = {
  uploadFile: (formData) => api.post('/upload/report', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadJSON: (data) => api.post('/upload/json', data),
  getStatus: () => api.get('/upload/status'),
};

export const featuresAPI = {
  getFeatures: () => api.get('/features'),
  getFeatureStats: () => api.get('/features/stats'),
  getFeatureViolations: (featureName, params = {}) => api.get(`/features/${featureName}/violations`, { params }),
  createFeature: (featureData) => api.post('/features', featureData),
  deleteFeature: (featureName) => api.delete(`/features/${featureName}`),
};

export const violationsAPI = {
  getViolations: (params = {}) => api.get('/violations', { params }),
  getFilters: () => api.get('/violations/filters'),
  getMapData: (params = {}) => api.get('/violations/map', { params }),
  searchViolations: (term, params = {}) => api.get(`/violations/search/${term}`, { params }),
  getViolation: (id) => api.get(`/violations/${id}`),
};

export const analyticsAPI = {
  getAnalytics: () => api.get('/analytics'),
  getKPIs: () => api.get('/analytics/kpis'),
  getPieChart: () => api.get('/analytics/charts/pie'),
  getTimeSeries: (params = {}) => api.get('/analytics/charts/timeseries', { params }),
  getDroneChart: () => api.get('/analytics/charts/drones'),
  getLocationChart: () => api.get('/analytics/charts/locations'),
  getSummary: () => api.get('/analytics/summary'),
};

export const boundariesAPI = {
  getBoundaries: () => api.get('/boundaries'),
  getKML: () => api.get('/boundaries/kml'),
};

export const sitesAPI = {
  getSites: () => api.get('/sites'),
  getSite: (id) => api.get(`/sites/${id}`),
  createSite: (siteData) => api.post('/sites', siteData),
  updateSite: (id, siteData) => api.put(`/sites/${id}`, siteData),
  deleteSite: (id) => api.delete(`/sites/${id}`),
};

export const healthAPI = {
  check: () => api.get('/health'),
};

export const usersAPI = {
  getProfile: () => api.get('/users/profile'),
  getUsers: () => api.get('/users/list'),
  updateUserName: (id, username) => api.patch(`/users/${id}/name`, { username }),
  updateOwnName: (username) => api.patch('/users/profile/name', { username })
};

export default api; 