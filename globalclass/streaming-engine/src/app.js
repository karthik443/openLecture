import express from 'express';
import cors from 'cors';
import streamRoutes from './routes/stream.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/stream', streamRoutes);

// Health check — useful for Docker and nginx upstream health checks
app.get('/health', (req, res) =>
  res.json({ status: 'ok', service: 'streaming-engine' })
);

export default app;
