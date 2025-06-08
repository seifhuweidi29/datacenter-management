// src/api.js
import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api'; // replace with your backend API URL

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Navigation callback - will be set by the app
let navigateCallback = null;

export const setNavigateCallback = (callback) => {
  navigateCallback = callback;
};

// Add request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(`${API_URL}/token/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('access_token', access);

        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear tokens and redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        if (navigateCallback) {
          navigateCallback('/login');
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API calls
export const auth = {
  login: async (username, password) => {
    const response = await api.post('/token/', { username, password });
    return response.data;
  },
  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await api.post('/logout/', { refresh_token: refreshToken }, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
      }
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      if (navigateCallback) {
        navigateCallback('/login');
      }
    } catch (error) {
      // Clear tokens even if logout fails
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      if (navigateCallback) {
        navigateCallback('/login');
      }
      console.error('Logout failed:', error);
    }
  },
};

// Datacenter API calls
export const datacenters = {
  list: async () => {
    const response = await api.get('/datacenters/');
    return response.data;
  },
  get: async (id) => {
    const response = await api.get(`/datacenters/${id}/`);
    return response.data;
  },
};

// Equipment API calls
export const equipment = {
  list: async (datacenterId, filters = {}) => {
    const response = await api.get(`/datacenters/${datacenterId}/equipments/`, { params: filters });
    return response.data;
  },
  add: async (datacenterId, data) => {
    const response = await api.post(`/datacenters/${datacenterId}/equipments/add/`, data);
    return response.data;
  },
  modify: async (datacenterId, equipmentId, data) => {
    const response = await api.patch(`/datacenters/${datacenterId}/equipments/${equipmentId}/modify/`, data);
    return response.data;
  },
  delete: async (datacenterId, equipmentId) => {
    const response = await api.delete(`/datacenters/${datacenterId}/equipments/${equipmentId}/delete/`);
    return response.data;
  },
  getLicenseTypes: async (datacenterId) => {
    const response = await api.get(`/datacenters/${datacenterId}/equipments/license-types/`);
    return response.data;
  },
  getServiceTags: async (datacenterId) => {
    const response = await api.get(`/datacenters/${datacenterId}/equipments/service-tags/`);
    return response.data;
  },
  exportExcel: async (datacenterId, filters = {}) => {
    const response = await api.get(`/datacenters/${datacenterId}/equipments/export-excel/`, {
      params: filters,
      responseType: 'blob',
    });
    return response.data;
  },
  exportPDF: async (datacenterId) => {
    const response = await api.get(`/datacenters/${datacenterId}/equipments/export-pdf/`, {
      responseType: 'blob',
    });
    return response.data;
  },
  importExcel: async (datacenterId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/datacenters/${datacenterId}/equipments/import-excel/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  sendPDF: async (datacenterId, email) => {
    const response = await api.post(`/datacenters/${datacenterId}/equipments/send-pdf/`, { email });
    return response.data;
  },
};

export default api;