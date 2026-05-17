import axios from 'axios';

// IMPORTANT: Use your laptop's local IP address instead of 'localhost'
// to allow the physical phone (Expo Go) to connect to the backend.
const API_URL = 'https://emperor-afraid-reformed.ngrok-free.dev/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // Agents take time to think, so we set a long timeout
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(
  async (config) => {
    // In a real app, we'd get this from secure storage or Zustand
    // For now, we will let the authStore handle it
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
