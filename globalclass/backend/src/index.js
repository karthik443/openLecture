require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initQAWebSocket } = require('./websocket/qaHandler');
const { initStreamingWebSocket } = require('./websocket/streamHandler');

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

// Q&A WebSocket — owned by: Aayush
initQAWebSocket(server);

// Streaming signaling WebSocket — owned by: Team (streaming)
initStreamingWebSocket(server);

server.listen(PORT, () => {
  console.log(`GlobalClass server running on port ${PORT}`);
});
