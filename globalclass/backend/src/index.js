import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { initQAWebSocket, qaWss } from './websocket/qaHandler.js';
import { initStreamingWebSocket, streamWss } from './websocket/streamHandler.js';

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

// Initialize WebSocket handlers (registers event listeners on each WSS)
initQAWebSocket();
initStreamingWebSocket();

// Manual upgrade routing — routes incoming WS connections to the correct WSS
server.on('upgrade', (request, socket, head) => {
  const pathname = request.url.split('?')[0];

  if (pathname === '/ws/qa') {
    qaWss.handleUpgrade(request, socket, head, (ws) => {
      qaWss.emit('connection', ws, request);
    });
  } else if (pathname === '/ws/stream') {
    streamWss.handleUpgrade(request, socket, head, (ws) => {
      streamWss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`GlobalClass server running on port ${PORT}`);
});
