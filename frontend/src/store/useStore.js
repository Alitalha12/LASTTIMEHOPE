import { create } from 'zustand';
import axios from 'axios';
import useAuthStore from './useAuthStore';
import useOrchestrationStore from './useOrchestrationStore';
import useSettingsStore from './useSettingsStore';

// Backend URL
const API_BASE_URL = 'https://emperor-afraid-reformed.ngrok-free.dev/api';

const useStore = create((set, get) => ({
  // Orchestration State
  isProcessing: false,
  currentStep: 0,
  workflowSessionId: null,
  steps: [
    { id: 1, agent: 'IntentParser', title: 'NLP Intent Parser', description: 'Understanding your request...', status: 'pending' },
    { id: 2, agent: 'DisputeAgent', title: 'Safety & Dispute Agent', description: 'Checking for policy violations...', status: 'pending' },
    { id: 3, agent: 'DiscoveryAgent', title: 'Provider Discovery', description: 'Searching for local experts...', status: 'pending' },
    { id: 4, agent: 'RankingAgent', title: 'AI Ranker & Matcher', description: 'Finding the best professional...', status: 'pending' },
    { id: 5, agent: 'PricingAgent', title: 'Dynamic Pricing Engine', description: 'Calculating optimal quote...', status: 'pending' },
    { id: 6, agent: 'BookingAgent', title: 'ACID Transaction Agent', description: 'Securing your booking slot...', status: 'pending' },
    { id: 7, agent: 'NotificationAgent', title: 'Multi-Channel Alert', description: 'Dispatching confirmations...', status: 'pending' },
    { id: 8, agent: 'FollowupAgent', title: 'Automation Scheduler', description: 'Enabling live tracking...', status: 'pending' },
  ],
  
  // Results & Insights
  result: null,
  error: null,
  aiReasoning: [],
  extractedData: null,
  
  // Actions
  setProcessing: (val) => set({ isProcessing: val }),
  
  resetSteps: () => set({
    steps: get().steps.map(s => ({ ...s, status: 'pending', description: 'Pending...' })),
    currentStep: 0,
    result: null,
    error: null,
    aiReasoning: [],
    extractedData: null,
    workflowSessionId: null
  }),

  updateStep: (index, status, description) => set((state) => {
    const newSteps = [...state.steps];
    if (newSteps[index]) {
      newSteps[index] = { ...newSteps[index], status, description: description || newSteps[index].description };
    }
    return { steps: newSteps, currentStep: index };
  }),

  sendServiceRequest: async (userInput, options = {}) => {
    const { resetSteps, updateStep, setProcessing } = get();
    const currentUser = useAuthStore.getState().user;
    
    // Get settings values
    const settings = useSettingsStore.getState();
    const allowAIMemory = settings.aiMemoryEnabled;
    const historyDepth = settings.historyDepth;
    
    resetSteps();
    setProcessing(true);

    try {
      // Step 1: Initial Parsing UI Feedback
      updateStep(0, 'loading', 'Extracting service intent...');
      
      const response = await axios.post(`${API_BASE_URL}/service/request`, {
        userInput,
        userId: currentUser?.id || 'guest_user',
        budgetType: options.budgetType,
        maxBudget: options.maxBudget,
        selectionMode: options.selectionMode,
        scheduleMode: options.scheduleMode,
        allowAIMemory,
        historyDepth,
        emergencyMode: options.emergencyMode
      }, { timeout: 40000 });
      
      const data = response.data;
      
      if (!data.success) {
        throw new Error(data.message || 'AI Orchestrator failed to process');
      }

      // If backend returns a Session ID, start live monitoring
      if (data.workflowSessionId || (data.logs && data.logs.length > 0 && data.logs[0].workflowSessionId)) {
        const sid = data.workflowSessionId || data.logs[0].workflowSessionId;
        set({ workflowSessionId: sid });
        useOrchestrationStore.getState().startLiveMonitoring(sid);
      }

      // PAUSE GATE FOR MANUAL SELECTION
      if (data.status === "paused_for_manual_selection") {
        set({ 
          result: data, 
          isProcessing: false,
          shortlist: data.shortlist,
          aiReasoning: data.reasoning || []
        });
        
        // Mark first 3 steps as processed
        updateStep(0, 'success', 'NLP intent analysis complete');
        updateStep(1, 'success', 'Safety policies verified');
        updateStep(2, 'success', 'Collected provider bids (PAUSED for selection)');
        return;
      }

      // ORCHESTRATION REPLAY LOGIC
      const backendLogs = data.logs || [];
      
      for (let i = 0; i < get().steps.length; i++) {
        const uiStep = get().steps[i];
        const log = backendLogs.find(l => l.agent === uiStep.agent || l.agent.includes(uiStep.agent));
        
        updateStep(i, 'loading', uiStep.description);
        await new Promise(r => setTimeout(r, 600)); // Visual spacing

        if (log) {
          updateStep(i, 'success', log.reasoning || log.details || 'Completed successfully');
        } else {
          updateStep(i, 'success', 'Verified and passed');
        }
        await new Promise(r => setTimeout(r, 400));
      }

      set({ 
        result: data, 
        isProcessing: false,
        aiReasoning: data.reasoning || [],
        extractedData: data.data?.parsed_intent || null
      });

      if (options.emergencyMode && data.data && data.data.booking) {
        try {
          const { io } = require('socket.io-client');
          const socket = io('https://emperor-afraid-reformed.ngrok-free.dev', { transports: ['websocket'] });
          socket.on('connect', () => {
            socket.emit('emergency_request_broadcast', {
              bookingId: data.data.booking.booking_id,
              serviceName: data.data.booking.service_type || 'Emergency Service',
              area: data.data.booking.area || 'G-13',
              price: data.data.booking.price || 3000,
              customerName: currentUser?.fullName || 'Valued Customer'
            });
            setTimeout(() => socket.disconnect(), 1000);
          });
        } catch (sockErr) {
          console.error("Failed to emit emergency socket broadcast:", sockErr);
        }
      }
      
    } catch (err) {
      console.log('Orchestration handled error gracefully:', err.message);
      const current = get().currentStep;
      const userMessage = err.response?.data?.message || err.message;
      updateStep(current, 'error', userMessage);
      set({ error: userMessage, isProcessing: false });
    }
  },

  confirmManualSelection: async (selectedProviderId, scheduleMode = 'auto') => {
    const { updateStep, setProcessing, workflowSessionId } = get();
    setProcessing(true);

    try {
      // Start Phase 2 loader from Step 4 (Ranker)
      updateStep(3, 'loading', 'Applying rating matrix & bids...');
      
      const response = await axios.post(`${API_BASE_URL}/service/confirm-match`, {
        workflowSessionId,
        selectedProviderId,
        scheduleMode
      });
      
      const data = response.data;
      if (!data.success) {
        throw new Error(data.message || 'Verification resume failed');
      }

      const backendLogs = data.logs || [];
      
      // Resume replay for steps 4 to 8!
      for (let i = 3; i < get().steps.length; i++) {
        const uiStep = get().steps[i];
        const log = backendLogs.find(l => l.agent === uiStep.agent || l.agent.includes(uiStep.agent));
        
        updateStep(i, 'loading', uiStep.description);
        await new Promise(r => setTimeout(r, 600));

        if (log) {
          updateStep(i, 'success', log.reasoning || log.details || 'Completed');
        } else {
          updateStep(i, 'success', 'Verified');
        }
        await new Promise(r => setTimeout(r, 400));
      }

      set({ 
        result: data, 
        isProcessing: false,
        aiReasoning: data.reasoning || [],
        extractedData: data.data?.parsed_intent || null,
        shortlist: null // reset shortlist
      });
      
    } catch (err) {
      console.error('Confirmation failed:', err);
      updateStep(3, 'error', err.response?.data?.message || err.message);
      set({ error: err.message, isProcessing: false });
    }
  },

  // Notification State & Actions
  notifications: [],
  
  fetchNotifications: async (userId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/notifications/${userId}`);
      if (response.data.success) {
        set({ notifications: response.data.data });
      }
    } catch (err) {
      console.log("Failed to fetch notifications:", err.message);
    }
  },

  markNotificationRead: async (notificationId) => {
    try {
      await axios.put(`${API_BASE_URL}/notifications/${notificationId}/read`);
      set((state) => ({
        notifications: state.notifications.map((n) => 
          n.id === notificationId ? { ...n, status: 'read' } : n
        )
      }));
    } catch (err) {
      console.log("Failed to mark notification read:", err.message);
    }
  },

  addLocalNotification: (notif) => {
    set((state) => {
      const exists = state.notifications.some(n => n.id === notif.id);
      if (exists) return {};
      return { notifications: [notif, ...state.notifications] };
    });
  },

  registerExpoPushToken: async (userId, token) => {
    try {
      await axios.post(`${API_BASE_URL}/notifications/register-token`, { userId, token });
    } catch (err) {
      console.log("Failed to register Expo push token:", err.message);
    }
  }
}));

export default useStore;
