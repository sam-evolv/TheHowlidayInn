import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { auth } from '@/lib/firebase';
import { getIdToken } from 'firebase/auth';

// Centralized HTTP client - uses VITE_API_BASE for cross-origin or empty for same-origin
const API_BASE = import.meta.env.VITE_API_BASE || '';
export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,  // send/receive cookies
});

// Add Firebase auth token to all requests
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      if (auth.currentUser) {
        const token = await getIdToken(auth.currentUser);
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to get auth token:', error);
      // Continue without auth - let the server handle the 401
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Add response interceptor for consistent error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    // Extract server error message if available and normalize it
    // But preserve the original AxiosError for status code checks
    const message = (error.response?.data as any)?.message || error.response?.data || error.message;
    error.message = typeof message === 'string' ? message : error.message;
    return Promise.reject(error);
  }
);
