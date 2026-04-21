import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import lectureRoutes from './routes/lectures.js';
import questionRoutes from './routes/questions.js';
import streamRoutes from './routes/stream.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/lectures', lectureRoutes);
app.use('/api/lectures', questionRoutes);  // /api/lectures/:id/questions
app.use('/api/stream', streamRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

export default app;
