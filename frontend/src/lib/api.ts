import axios from 'axios';

// The baseUrl comes from .env.local 
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// We can add interceptors here later to attach the JWT token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
       config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
