import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import apiClient from '../api/client';

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  profilePic: null,
  isLoading: true,
  error: null,

  updateProfilePic: async (uri) => {
    await SecureStore.setItemAsync('userProfilePic', uri);
    set({ profilePic: uri });
  },

  // Initialize and check for existing token in secure storage
  initAuth: async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('userToken');
      const storedPic = await SecureStore.getItemAsync('userProfilePic');
      if (storedToken) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        const response = await apiClient.get('/auth/me');
        if (response.data.success) {
          set({ 
            user: response.data.data, 
            token: storedToken, 
            profilePic: storedPic,
            isLoading: false 
          });
          return true;
        }
      }
    } catch (e) {
      console.log('No valid session found');
    }
    set({ isLoading: false, user: null, token: null });
    return false;
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { data, success } = response.data;
      
      if (success) {
        await SecureStore.setItemAsync('userToken', data.token);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        set({ user: data, token: data.token, isLoading: false });
        return true;
      }
      return false;
    } catch (error) {
      set({ 
        error: error.response?.data?.error?.message || 'Login failed', 
        isLoading: false 
      });
      return false;
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post('/auth/register', { name, email, password });
      const { data, success } = response.data;
      
      if (success) {
        await SecureStore.setItemAsync('userToken', data.token);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        set({ user: data, token: data.token, isLoading: false });
        return true;
      }
      return false;
    } catch (error) {
      set({ 
        error: error.response?.data?.error?.message || 'Registration failed', 
        isLoading: false 
      });
      return false;
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('userToken');
    delete apiClient.defaults.headers.common['Authorization'];
    set({ user: null, token: null });
  }
}));
