// Streaming Routes — owned by: Team (streaming)
import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import streamService from '../services/streamService.js';

const router = express.Router();

// POST /api/stream/start/:lectureId — instructor starts stream session
router.post('/start/:lectureId', authenticate, requireRole('instructor'), async (req, res) => {
  // TODO (streaming team): initialize SFU session, return stream token
  try {
    const session = await streamService.startSession(req.params.lectureId, req.user.id);
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stream/join/:lectureId — student joins stream
router.post('/join/:lectureId', authenticate, requireRole('student'), async (req, res) => {
  // TODO (streaming team): return viewer token / SFU endpoint
  try {
    const session = await streamService.joinSession(req.params.lectureId, req.user.id);
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stream/end/:lectureId — instructor ends stream
router.post('/end/:lectureId', authenticate, requireRole('instructor'), async (req, res) => {
  // TODO (streaming team): tear down SFU session, trigger recording save
  try {
    await streamService.endSession(req.params.lectureId);
    res.json({ message: 'Stream ended' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
