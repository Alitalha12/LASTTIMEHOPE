const http = require('http');

// Simple reverse proxy to simulate Nginx for Windows testing
const PROXY_PORT = 8888;
const BACKEND_PORT = 5000;

const server = http.createServer((clientReq, clientRes) => {
  const clientIp = clientReq.headers['x-forwarded-for'] || clientReq.socket.remoteAddress || '127.0.0.1';
  const timestamp = new Date().toISOString();
  
  // ─── Telemetry Log ────────────────────────────────
  console.log(`\n\x1b[35m[NGINX ACCESS LOG - ${timestamp}]\x1b[0m \x1b[32m${clientReq.method}\x1b[0m ${clientReq.url} | IP: ${clientIp}`);

  // ─── Simulated NGINX Rate Limiter ────────────────
  if (!ipTracker[clientIp]) {
    ipTracker[clientIp] = [];
  }
  
  // Clear old timestamps (older than 1 minute)
  const now = Date.now();
  ipTracker[clientIp] = ipTracker[clientIp].filter(time => now - time < 60000);
  
  // Rate Limit: 40 requests per minute at proxy level
  if (ipTracker[clientIp].length >= 40) {
    console.log(`\x1b[31m[NGINX SECURITY BLOCK]\x1b[0m Rate Limit Exceeded for IP: ${clientIp}. Blocking request directly from reverse proxy.`);
    clientRes.writeHead(429, { 
      'Content-Type': 'application/json',
      'Retry-After': '60'
    });
    clientRes.end(JSON.stringify({
      success: false,
      message: "NGINX: Too Many Requests. Rate limit exceeded (Max 40/min). Please try again later."
    }));
    return;
  }
  
  // Register hit
  ipTracker[clientIp].push(now);

  // ─── Suspicious Activity Inspection ───────────────
  const suspiciousHeaderKeys = ['x-exploit', 'x-malicious', 'eval', 'exec'];
  const hasSuspiciousHeader = Object.keys(clientReq.headers).some(h => suspiciousHeaderKeys.includes(h.toLowerCase()));
  
  if (hasSuspiciousHeader) {
    console.log(`\x1b[31m[NGINX THREAT DETECTED]\x1b[0m Blocked request from IP ${clientIp} due to malicious custom header injection.`);
    clientRes.writeHead(400, { 'Content-Type': 'text/plain' });
    clientRes.end('Bad Request: Security threat detected by NGINX reverse proxy.');
    return;
  }

  // Forward to backend
  console.log(`[NGINX SIMULATOR] Proxying request to backend on port ${BACKEND_PORT}...`);
  
  const options = {
    hostname: '127.0.0.1',
    port: BACKEND_PORT,
    path: clientReq.url,
    method: clientReq.method,
    headers: {
      ...clientReq.headers,
      'x-forwarded-for': clientIp,
      'x-real-ip': clientIp,
      'x-nginx-proxy': 'true',
      'x-nginx-version': '1.24.0-Simulator'
    }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    console.log(`[NGINX SIMULATOR] Received response from backend: ${proxyRes.statusCode}`);
    
    // Send back to client
    clientRes.writeHead(proxyRes.statusCode, {
      ...proxyRes.headers,
      'Server': 'nginx/1.24.0 (KaamKonnect Secure)',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    });
    proxyRes.pipe(clientRes, { end: true });
  });

  proxyReq.on('error', (e) => {
    console.error(`[NGINX SIMULATOR] Error proxying to backend: ${e.message}`);
    clientRes.writeHead(502);
    clientRes.end('Bad Gateway');
  });

  clientReq.pipe(proxyReq, { end: true });
});

// Cache for rate limits
const ipTracker = {};

server.listen(PROXY_PORT, () => {
  console.log(`[NGINX SIMULATOR] Reverse proxy running on http://localhost:${PROXY_PORT}`);
  console.log(`[NGINX SIMULATOR] All traffic will be routed to http://localhost:${BACKEND_PORT}`);
});
