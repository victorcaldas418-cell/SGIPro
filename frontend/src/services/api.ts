import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token injection is handled by AuthContext interceptors.
// This file is kept clean — only the base instance here.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status !== 401) {
      console.error('API Error:', error.response?.data || error.message);
    }
    return Promise.reject(error);
  }
);
