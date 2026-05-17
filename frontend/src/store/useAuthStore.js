import { create } from 'zustand';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../config/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

const API_BASE_URL = 'https://emperor-afraid-reformed.ngrok-free.dev/api';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  userSettings: null,
  userProfile: null,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  fetchUserProfile: async (firebaseUser) => {
    try {
      const token = await firebaseUser.getIdToken(true);
      const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const userProfile = response.data.data;
      await AsyncStorage.setItem('user', JSON.stringify(userProfile));
      set({ 
        user: userProfile, 
        token, 
        isAuthenticated: true, 
        isLoading: false,
        userSettings: userProfile.settingsDetails || null,
        userProfile: userProfile.profileDetails || null
      });
      return { success: true };
    } catch (error) {
      console.error("Error fetching user profile:", error);
      set({ 
        user: { id: firebaseUser.uid, email: firebaseUser.email }, 
        token: await firebaseUser.getIdToken(),
        isAuthenticated: true, 
        isLoading: false 
      });
      return { success: false, message: "Profile sync failed" };
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await get().fetchUserProfile(userCredential.user);
      return { success: true, role: get().user?.role || 'customer' };
    } catch (error) {
      set({ isLoading: false });
      let message = 'Login failed';
      if (error.code === 'auth/invalid-credential') message = 'Invalid email or password';
      else if (error.code === 'auth/too-many-requests') message = 'Too many attempts. Try again later.';
      return { success: false, message };
    }
  },

  signup: async (userData) => {
    set({ isLoading: true });
    try {
      const { email, password, ...profileData } = userData;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      const token = await userCredential.user.getIdToken();
      
      const response = await axios.post(`${API_BASE_URL}/auth/sync`, profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const userProfile = response.data.data;
      await AsyncStorage.setItem('user', JSON.stringify(userProfile));
      set({ 
        user: userProfile, 
        token, 
        isAuthenticated: true, 
        isLoading: false,
        userSettings: userProfile.settingsDetails || null,
        userProfile: userProfile.profileDetails || null
      });
      return { success: true, role: userProfile.role || 'customer' };
    } catch (error) {
      set({ isLoading: false });
      let message = 'Signup failed';
      if (error.code === 'auth/email-already-in-use') message = 'Email already registered';
      else if (error.code === 'auth/weak-password') message = 'Password should be at least 6 characters';
      return { success: false, message };
    }
  },

  logout: async () => {
    try {
      await signOut(auth);
      await AsyncStorage.removeItem('user');
      set({ user: null, token: null, isAuthenticated: false, userSettings: null, userProfile: null });
    } catch (error) {
      console.error("Logout error", error);
    }
  },

  updateProfile: async (updates) => {
    set({ isLoading: true });
    const { token } = get();
    try {
      const response = await axios.put(`${API_BASE_URL}/auth/profile`, updates, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const updatedUser = response.data.data;
      
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      set({ user: updatedUser, isLoading: false });
      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, message: error.response?.data?.message || 'Update failed' };
    }
  },

  updateSettings: async (settingsData) => {
    const { token } = get();
    try {
      const response = await axios.put(`${API_BASE_URL}/auth/settings`, settingsData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const updatedSettings = response.data.data;
      set({ userSettings: updatedSettings });
      
      // Also update local user cache
      const currentUser = get().user;
      if (currentUser) {
        const merged = { ...currentUser, settingsDetails: updatedSettings };
        await AsyncStorage.setItem('user', JSON.stringify(merged));
        set({ user: merged });
      }
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Settings update failed' };
    }
  },

  topUpWallet: async (amount) => {
    const { token } = get();
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/wallet/top-up`, 
        { amount, cardDetails: { simulated: true } },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const newBalance = response.data.walletBalance;
      const currentUser = get().user;
      if (currentUser) {
        const merged = { ...currentUser, walletBalance: newBalance };
        await AsyncStorage.setItem('user', JSON.stringify(merged));
        set({ user: merged });
      }
      return { success: true, walletBalance: newBalance };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Top-up failed' };
    }
  },

  initiateGatewayTopUp: async (amount, phone, gateway) => {
    const { token } = get();
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/wallet/top-up-gateway-initiate`, 
        { amount, phone, gateway },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return { 
        success: true, 
        sessionId: response.data.sessionId, 
        otpSimulated: response.data.otpSimulated 
      };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Gateway checkout failed' };
    }
  },

  verifyGatewayTopUp: async (sessionId, otpCode) => {
    const { token } = get();
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/wallet/top-up-gateway-verify`, 
        { sessionId, otpCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const newBalance = response.data.walletBalance;
      const currentUser = get().user;
      if (currentUser) {
        const merged = { ...currentUser, walletBalance: newBalance };
        await AsyncStorage.setItem('user', JSON.stringify(merged));
        set({ user: merged });
      }
      return { success: true, walletBalance: newBalance };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Verification failed' };
    }
  },

  refreshUserProfile: async () => {
    try {
      const { token } = get();
      if (!token) return;
      const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const userProfile = response.data.data;
      await AsyncStorage.setItem('user', JSON.stringify(userProfile));
      set({ 
        user: userProfile, 
        userSettings: userProfile.settingsDetails || null,
        userProfile: userProfile.profileDetails || null
      });
    } catch (err) {
      console.log("Failed to refresh profile:", err.message);
    }
  },

  uploadAvatar: async (imageUrl) => {
    const { token } = get();
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/upload-avatar`, 
        { imageUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local user state immediately so HamburgerMenu reflects new avatar
      const currentUser = get().user;
      if (currentUser) {
        const merged = { 
          ...currentUser, 
          avatar: imageUrl, 
          profileImage: imageUrl  // keep both fields in sync
        };
        await AsyncStorage.setItem('user', JSON.stringify(merged));
        set({ user: merged });
      }
      return { success: true };
    } catch (error) {
      // Even if server call fails, update local state so UI shows the new photo
      const currentUser = get().user;
      if (currentUser) {
        const merged = { ...currentUser, avatar: imageUrl, profileImage: imageUrl };
        await AsyncStorage.setItem('user', JSON.stringify(merged));
        set({ user: merged });
      }
      return { success: false, message: error.response?.data?.message || 'Avatar upload failed' };
    }
  },

  sendOtp: async (target, method) => {
    set({ isLoading: true });
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/send-otp`, { target, method });
      set({ isLoading: false });
      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, message: error.response?.data?.message || 'Failed to send code' };
    }
  },

  verifyOtp: async (target, otp, method) => {
    set({ isLoading: true });
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/verify-otp`, { target, otp, method });
      const { resetToken } = response.data;
      set({ isLoading: false });
      return { success: true, resetToken };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, message: error.response?.data?.message || 'Invalid code' };
    }
  },

  resetPassword: async (resetToken, newPassword) => {
    set({ isLoading: true });
    try {
      await axios.post(`${API_BASE_URL}/auth/reset-password`, { resetToken, newPassword });
      set({ isLoading: false });
      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      return { success: false, message: error.response?.data?.message || 'Password reset failed' };
    }
  },

  checkAuth: async () => {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const storedUser = await AsyncStorage.getItem('user');
          if (storedUser) {
             const token = await firebaseUser.getIdToken();
             const parsed = JSON.parse(storedUser);
             set({ 
               user: parsed, 
               token, 
               isAuthenticated: true,
               userSettings: parsed.settingsDetails || null,
               userProfile: parsed.profileDetails || null
             });
             resolve(true);
             get().fetchUserProfile(firebaseUser);
          } else {
             await get().fetchUserProfile(firebaseUser);
             resolve(true);
          }
        } else {
          set({ user: null, token: null, isAuthenticated: false });
          resolve(false);
        }
        unsubscribe();
      });
    });
  }
}));

export default useAuthStore;
