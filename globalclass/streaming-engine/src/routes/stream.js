// Streaming Engine — Stream Routes
// Generates LiveKit access tokens for instructors and students.
// The browser connects directly to LiveKit's SFU using these tokens.
// This service owns session lifecycle (start / join / end).

import express from 'express';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { authenticate, requireRole } from '../middleware/auth.js';
import pool from '../config/db.js';

const router = express.Router();

// Verify LiveKit config on startup
if (!process.env.LIVEKIT_URL || !process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
  console.warn('[Stream] ⚠️  LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET not set. Token generation will fail.');
}

/**
 * Generate a LiveKit access token for the given identity and room.
 * @param {string} identity   - Unique user ID
 * @param {string} name       - Display name shown in the room
 * @param {string} room       - LiveKit room name (we use lectureId)
 * @param {boolean} canPublish - true for instructor, false for students
 */
async function generateLiveKitToken(identity, name, room, canPublish) {
  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    { identity, name, ttl: '10h' }
  );
  at.addGrant({
    roomJoin: true,
    room,
    canPublish,
    canSubscribe: true,
    canPublishData: true,
  });
  return await at.toJwt();
}

// ---------------------------------------------------------------------------
// POST /api/stream/start/:lectureId
// Instructor starts a live session.
// Marks lecture as 'live' in DB, returns a LiveKit publisher token.
// ---------------------------------------------------------------------------
router.post('/start/:lectureId', authenticate, requireRole('instructor'), async (req, res) => {
  const { lectureId } = req.params;
  try {
    // Verify instructor owns this lecture and it's not already ended
    const result = await pool.query(
      `UPDATE lectures
       SET status = 'live'
       WHERE id = $1 AND instructor_id = $2 AND status != 'ended'
       RETURNING *`,
      [lectureId, req.user.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Lecture not found, not authorized, or already ended' });
    }

    // LiveKit room name = lectureId (UUID, unique per lecture)
    const token = await generateLiveKitToken(
      req.user.id,
      req.user.name,
      lectureId,
      true // canPublish = true for instructor
    );

    console.log(`[Stream] Instructor ${req.user.name} started lecture ${lectureId}`);

    res.json({
      lectureId,
      role: 'publisher',
      livekitToken: token,
      livekitUrl: process.env.LIVEKIT_URL,
      roomName: lectureId,
    });
  } catch (err) {
    console.error('[Stream] startSession error:', err);
    res.status(500).json({ error: 'Failed to start stream' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/stream/join/:lectureId
// Student joins a live session.
// Verifies lecture is live, returns a LiveKit subscriber-only token.
// ---------------------------------------------------------------------------
router.post('/join/:lectureId', authenticate, async (req, res) => {
  const { lectureId } = req.params;
  try {
    const result = await pool.query(
      `SELECT l.*, u.name AS instructor_name
       FROM lectures l
       JOIN users u ON u.id = l.instructor_id
       WHERE l.id = $1 AND l.status = 'live'`,
      [lectureId]
    );

    if (!result.rows[0]) {
      return res.status(400).json({ error: 'Lecture is not live', code: 'NOT_LIVE' });
    }

    const token = await generateLiveKitToken(
      req.user.id,
      req.user.name,
      lectureId,
      false // canPublish = false for students
    );

    console.log(`[Stream] Student ${req.user.name} joined lecture ${lectureId}`);

    res.json({
      lectureId,
      role: 'subscriber',
      livekitToken: token,
      livekitUrl: process.env.LIVEKIT_URL,
      roomName: lectureId,
      lectureName: result.rows[0].title,
      instructorName: result.rows[0].instructor_name,
    });
  } catch (err) {
    console.error('[Stream] joinSession error:', err);
    res.status(500).json({ error: 'Failed to join stream' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/stream/end/:lectureId
// Instructor ends the session.
// Marks lecture as 'ended' in DB and closes the LiveKit room.
// ---------------------------------------------------------------------------
router.post('/end/:lectureId', authenticate, requireRole('instructor'), async (req, res) => {
  const { lectureId } = req.params;
  try {
    await pool.query(
      `UPDATE lectures SET status = 'ended' WHERE id = $1 AND instructor_id = $2`,
      [lectureId, req.user.id]
    );

    // Close the LiveKit room so all participants are disconnected immediately.
    // This is optional but ensures the SFU cleans up properly.
    try {
      const roomService = new RoomServiceClient(
        process.env.LIVEKIT_URL,
        process.env.LIVEKIT_API_KEY,
        process.env.LIVEKIT_API_SECRET
      );
      await roomService.deleteRoom(lectureId);
      console.log(`[Stream] LiveKit room ${lectureId} deleted`);
    } catch (livekitErr) {
      // Room may not exist if no one actually connected — that's fine
      console.warn(`[Stream] Could not delete LiveKit room: ${livekitErr.message}`);
    }

    console.log(`[Stream] Instructor ${req.user.name} ended lecture ${lectureId}`);
    res.json({ message: 'Stream ended', lectureId });
  } catch (err) {
    console.error('[Stream] endSession error:', err);
    res.status(500).json({ error: 'Failed to end stream' });
  }
});

export default router;
