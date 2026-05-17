const { addDocument } = require("../services/firebase.service");
const logger = require("../utils/logger");
const crypto = require("crypto");

/**
 * Security Logging Middleware
 * Intercepts all incoming requests, scrubs sensitive fields, inspects for malicious content,
 * and records real-time logs in Firestore `security_logs` collection.
 */
const securityLogger = async (req, res, next) => {
  const start = Date.now();
  const reqId = crypto.randomUUID();

  // Capture remote IP
  const clientIp = 
    req.headers["x-forwarded-for"] || 
    req.headers["x-real-ip"] || 
    req.socket.remoteAddress || 
    "127.0.0.1";

  // Scrub function for sensitive fields (e.g. passwords)
  const scrubPayload = (data) => {
    if (!data) return null;
    if (typeof data !== "object") return data;
    
    const scrubbed = { ...data };
    const sensitiveKeys = ["password", "token", "newPassword", "resetToken"];
    
    for (const key of Object.keys(scrubbed)) {
      if (sensitiveKeys.includes(key)) {
        scrubbed[key] = "******** [SCRUBBED FOR SECURITY] *******";
      } else if (typeof scrubbed[key] === "object") {
        scrubbed[key] = scrubPayload(scrubbed[key]);
      }
    }
    return scrubbed;
  };

  // Inspect for malicious payloads (SQL Injection, XSS)
  const inspectThreats = (payload) => {
    if (!payload) return { isThreat: false, threatType: null };
    const payloadStr = JSON.stringify(payload).toLowerCase();
    
    const sqlRegex = /union\s+select|select\s+.*\s+from|'or\s+'1'='1|--|#/;
    const xssRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|javascript:/;
    
    if (sqlRegex.test(payloadStr)) {
      return { isThreat: true, threatType: "SQL Injection Attempt" };
    }
    if (xssRegex.test(payloadStr)) {
      return { isThreat: true, threatType: "Cross-Site Scripting (XSS) Attempt" };
    }
    
    return { isThreat: false, threatType: null };
  };

  const scrubbedBody = scrubPayload(req.body);
  const threatCheck = inspectThreats(req.body);

  if (threatCheck.isThreat) {
    logger.warn(`[SECURITY BREACH WARNING] Potential ${threatCheck.threatType} from IP: ${clientIp} on route: ${req.method} ${req.originalUrl}`);
  }

  // Hook into response stream to capture status code and processing duration
  res.on("finish", async () => {
    const duration = Date.now() - start;
    const logData = {
      requestId: reqId,
      timestamp: new Date().toISOString(),
      ip: clientIp,
      method: req.method,
      path: req.originalUrl,
      headers: {
        host: req.headers.host,
        userAgent: req.headers["user-agent"],
        forwarded: req.headers["x-forwarded-for"] || null
      },
      payload: scrubbedBody,
      statusCode: res.statusCode,
      durationMs: duration,
      threatDetected: threatCheck.isThreat,
      threatType: threatCheck.threatType,
      isSuspicious: threatCheck.isThreat || res.statusCode >= 400 || duration > 3000
    };

    try {
      // Sync log to Firestore collection `security_logs`
      await addDocument("security_logs", reqId, logData);
      logger.debug(`[AUDIT] Log synced to Firestore: ${req.method} ${req.originalUrl} [${res.statusCode}] in ${duration}ms`);
    } catch (err) {
      logger.error(`Failed to write security log to Firestore: ${err.message}`);
    }
  });

  next();
};

/**
 * Custom function event logger
 * Use this to log function-level executions directly to Firebase for debugging
 */
const logSystemEvent = async (functionName, module, status, details = {}) => {
  const eventId = crypto.randomUUID();
  const eventData = {
    eventId,
    timestamp: new Date().toISOString(),
    functionName,
    module,
    status, // e.g. "SUCCESS", "FAILURE", "SUSPICIOUS"
    details
  };

  try {
    await addDocument("system_events", eventId, eventData);
    logger.info(`[SYSTEM EVENT] ${module}.${functionName} - ${status}`);
  } catch (err) {
    logger.error(`Failed to write system event to Firestore: ${err.message}`);
  }
};

module.exports = { securityLogger, logSystemEvent };
