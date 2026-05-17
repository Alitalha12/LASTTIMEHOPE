import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useSettingsStore = create(
  persist(
    (set, get) => ({
      // System States
      aiMode: true,
      speed: 1000,
      developerMode: false,
      aiMemoryEnabled: false,
      historyDepth: 'last10', // 'last10', 'last30days', 'last90days', 'allTime'
      consentGiven: false,
      
      // UI States
      language: 'en',
      theme: 'default', // 'default' (Light), 'midnight' (Dark Blue), 'nature' (Greenish)
      
      // Actions
      toggleAiMode: () => set({ aiMode: !get().aiMode }),
      setSpeed: (val) => set({ speed: val }),
      toggleDeveloperMode: () => set({ developerMode: !get().developerMode }),
      setLanguage: (lang) => set({ language: lang }),
      setTheme: (theme) => set({ theme }),
      setAiMemoryEnabled: (val) => set({ aiMemoryEnabled: val }),
      setHistoryDepth: (depth) => set({ historyDepth: depth }),
      setConsentGiven: (val) => set({ consentGiven: val }),
      
      // Reset to defaults
      resetSettings: () => set({
        aiMode: true,
        speed: 1000,
        developerMode: false,
        language: 'en',
        theme: 'default',
        aiMemoryEnabled: false,
        historyDepth: 'last10',
        consentGiven: false,
      }),
    }),
    {
      name: 'kaamkonnect-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useSettingsStore;
