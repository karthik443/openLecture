import 'dotenv/config';
import http from 'http';
import app from './app.js';

const PORT = process.env.PORT || 4001;
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`[Streaming Engine] Running on port ${PORT}`);
  console.log(`[Streaming Engine] LiveKit URL: ${process.env.LIVEKIT_URL || '⚠️  NOT SET'}`);
});
