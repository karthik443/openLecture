const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const lectureRoutes = require('./routes/lectures');
const questionRoutes = require('./routes/questions');
const streamRoutes = require('./routes/stream');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/lectures', lectureRoutes);
app.use('/api/lectures', questionRoutes);  // /api/lectures/:id/questions
app.use('/api/stream', streamRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

module.exports = app;
