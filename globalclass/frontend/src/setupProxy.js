// src/setupProxy.js — Development proxy configuration
// Routes API calls to the correct service when running npm start (dev mode).
//
// IMPORTANT: core-api (4000) and streaming-engine (4001) use `expose` in
// docker-compose, NOT `ports` — they are NOT reachable from the host.
// All traffic must go through the Nginx API gateway on port 80, which
// handles the /api/stream → streaming-engine and /api → core-api routing.
//
// Routing (all via Nginx on :80, which mirrors nginx.conf internally):
//   /api/stream/* → nginx:80 → streaming-engine:4001
//   /api/*        → nginx:80 → core-api:4000
//   /qaws         → nginx:80 → core-api:4000 (WebSocket)

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  // Streaming Engine routes (must be listed BEFORE the generic /api catch-all)
  // Nginx routes /api/stream → streaming-engine internally
  app.use(
    '/api/stream',
    createProxyMiddleware({
      target: 'http://localhost:80',
      changeOrigin: true,
    })
  );

  // Core API — all other REST routes
  // Nginx routes /api → core-api internally
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:80',
      changeOrigin: true,
    })
  );

  // Q&A WebSocket — proxied via Nginx to core-api
  app.use(
    '/qaws',
    createProxyMiddleware({
      target: 'http://localhost:80',
      changeOrigin: true,
      ws: true, // proxy WebSocket upgrades
    })
  );
};
