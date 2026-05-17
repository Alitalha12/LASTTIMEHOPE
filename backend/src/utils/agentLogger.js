/**
 * Agent Logger Utility
 * Records the execution trace of each agent for the frontend to display
 */
class AgentLogger {
  constructor() {
    this.traces = [];
  }

  /**
   * Log an agent's execution step
   * @param {string} agentName - Name of the agent (e.g., "NLP Parser")
   * @param {string} status - "success", "error", or "pending"
   * @param {string} reasoning - Human readable explanation of what the agent did
   * @param {object} data - Any data output by the agent
   * @param {number} durationMs - How long the agent took
   */
  log(agentName, status, reasoning, data = null, durationMs = 0) {
    const traceRecord = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      agent: agentName,
      status,
      reasoning,
      data,
      durationMs,
      timestamp: new Date().toISOString()
    };
    
    this.traces.push(traceRecord);

    // Asynchronously log to Firestore for analytics
    try {
      const { getDb } = require("../config/firebase");
      const db = getDb();
      if (db) {
        db.collection("system_logs").doc(traceRecord.id).set(traceRecord).catch(err => {
          console.error("Failed to write log to Firestore", err);
        });
      }
    } catch (e) {
      // Ignore if DB not ready
    }

    return traceRecord;
  }

  /**
   * Get all recorded traces
   */
  getTraces() {
    return this.traces;
  }

  /**
   * Clear all traces
   */
  clear() {
    this.traces = [];
  }
}

module.exports = AgentLogger;
