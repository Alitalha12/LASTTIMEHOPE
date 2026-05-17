import { create } from 'zustand';
import apiClient from '../api/client';

export const useBookingStore = create((set) => ({
  currentBooking: null,
  bookingResponse: null,
  agentTraces: [],
  isProcessing: false,
  error: null,

  requestService: async (userInput) => {
    set({ isProcessing: true, error: null, agentTraces: [], bookingResponse: null });
    try {
      const response = await apiClient.post('/service/request', { userInput });
      const { data, success, message } = response.data;
      
      if (success) {
        set({ 
          bookingResponse: response.data,
          currentBooking: data.booking || null,
          agentTraces: data.agent_trace || [],
          isProcessing: false 
        });
        return { success: true, message, data };
      }
      
      // Handle cases like "Clarification Needed" or "Dispute Triggered"
      set({ 
        bookingResponse: response.data,
        agentTraces: data?.agent_trace || [],
        isProcessing: false 
      });
      return { success: false, message, data };

    } catch (error) {
      set({ 
        error: error.response?.data?.error?.message || 'Service request failed', 
        isProcessing: false,
        agentTraces: error.response?.data?.data?.agent_trace || []
      });
      return { success: false, error: error.message };
    }
  },

  clearBooking: () => set({ currentBooking: null, bookingResponse: null, agentTraces: [], error: null })
}));
