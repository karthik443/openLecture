// src/setupProxy.js — Development proxy configuration
// Routes API calls to the correct service when running npm start (dev mode).
//
// In production/Docker, Nginx does this routing (see globalclass/nginx/nginx.conf).
// In dev, CRA's built-in proxy only supports one target, so we use
// http-proxy-middleware to replicate the same routing logic locally.
//
// Routing mirror of nginx.conf:
//   /api/stream/* → streaming-engine on port 4001
//   /api/*        → core-api on port 4000
//   /qaws         → core-api on port 4000 (WebSocket)

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  // Streaming Engine routes (must be listed BEFORE the generic /api catch-all)
  app.use(
    '/api/stream',
    createProxyMiddleware({
      target: 'http://localhost:4001',
      changeOrigin: true,
    })
  );

  // Core API — all other REST routes
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:4000',
      changeOrigin: true,
    })
  );

  // Q&A WebSocket — core-api
  app.use(
    '/qaws',
    createProxyMiddleware({
      target: 'http://localhost:4000',
      changeOrigin: true,
      ws: true, // proxy WebSocket upgrades
    })
  );
};
