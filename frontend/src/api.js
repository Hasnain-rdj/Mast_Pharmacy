import axios from 'axios';
import { getStoredToken } from './utils';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

// Attach JWT token to every request if available
API.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to automatically handle token invalidation / 401 Unauthorized
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('expiry');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Settings API endpoints
export const fetchGlobalSettings = async () => {
  try {
    const response = await API.get('/api/settings');
    return response.data;
  } catch (error) {
    console.error('Error fetching global settings:', error);
    return null;
  }
};

export const updateGlobalSettings = async (settings) => {
  try {
    const response = await API.put('/api/settings', { settings });
    return response.data;
  } catch (error) {
    console.error('Error updating global settings:', error);
    return { error: error.response?.data?.message || 'Failed to update settings' };
  }
};

export default API;
