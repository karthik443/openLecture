import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { initQAWebSocket, qaWss } from './websocket/qaHandler.js';

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

// Initialize Q&A WebSocket handler
initQAWebSocket();

// Route WebSocket upgrade requests — only /qaws lives here now.
// /ws/stream was removed: streaming is owned by the streaming-engine service.
server.on('upgrade', (request, socket, head) => {
  const pathname = request.url.split('?')[0];

  if (pathname === '/qaws') {
    qaWss.handleUpgrade(request, socket, head, (ws) => {
      qaWss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`[Core API] Running on port ${PORT}`);
  console.log('[Core API] Owns: Auth, Catalog, Scheduling, Q&A WebSocket');
});

