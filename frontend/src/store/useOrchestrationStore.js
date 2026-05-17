import { create } from 'zustand';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';

const useOrchestrationStore = create((set, get) => ({
  activeSessionId: null,
  liveLogs: [],
  activeAgents: [], // List of agent names currently running
  
  // Start listening to a session
  startLiveMonitoring: (sessionId) => {
    set({ activeSessionId: sessionId, liveLogs: [], activeAgents: [] });
    
    const q = query(
      collection(db, "agentLogs"),
      where("workflowSessionId", "==", sessionId),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = [];
      const agents = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        logs.push(data);
        if (data.status === 'success') {
          agents.push(data.agent);
        }
      });
      
      set({ 
        liveLogs: logs,
        activeAgents: agents
      });
    });

    return unsubscribe;
  },
  
  clearSession: () => set({ activeSessionId: null, liveLogs: [], activeAgents: [] })
}));

export default useOrchestrationStore;
