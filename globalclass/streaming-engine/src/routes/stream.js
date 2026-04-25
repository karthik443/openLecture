// Streaming Engine — Stream Routes
// Generates LiveKit access tokens for instructors and students.
// Also manages HLS egress lifecycle (ADR-001 — hybrid streaming).
//
// Tier logic (ADR-001):
//   viewerTier = 'webrtc' → student gets a LiveKit token (priority tier, <1s latency)
//   viewerTier = 'hls'    → student gets an HLS URL     (bulk tier, ~2-3s latency)
//   Threshold: WEBRTC_PRIORITY_LIMIT env var (default: 500)

import express from 'express';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { authenticate, requireRole } from '../middleware/auth.js';
import pool from '../config/db.js';
import { startHLSEgress, stopHLSEgress, getHLSUrl } from '../services/egressService.js';

const router = express.Router();

// Priority tier limit from ADR-001 (set WEBRTC_PRIORITY_LIMIT=1 in .env for demo)
const WEBRTC_PRIORITY_LIMIT = parseInt(process.env.WEBRTC_PRIORITY_LIMIT || '500');

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

/**
 * Get current participant count for a LiveKit room.
 * Returns 0 if the room doesn't exist yet (no one connected).
 */
async function getRoomParticipantCount(lectureId) {
  try {
    const roomService = new RoomServiceClient(
      process.env.LIVEKIT_URL,
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET
    );
    const rooms = await roomService.listRooms([lectureId]);
    return rooms[0]?.numParticipants || 0;
  } catch {
    return 0; // Room not created yet — treat as empty
  }
}

// ---------------------------------------------------------------------------
// POST /api/stream/start/:lectureId
// Instructor starts a live session.
// Marks lecture as 'live' in DB, returns a LiveKit publisher token.
// Also starts HLS egress so the bulk-tier HLS path is ready immediately.
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

    // Start HLS egress for the bulk tier (ADR-001)
    // Runs in background — don't block the start response if it fails
    let hlsUrl = null;
    try {
      hlsUrl = await startHLSEgress(lectureId);
    } catch (egressErr) {
      console.warn(`[Stream] HLS egress start failed (non-fatal): ${egressErr.message}`);
    }

    console.log(`[Stream] Instructor ${req.user.name} started lecture ${lectureId}`);
    console.log(`[Stream] WebRTC priority limit: ${WEBRTC_PRIORITY_LIMIT} viewers`);

    res.json({
      lectureId,
      role: 'publisher',
      livekitToken: token,
      livekitUrl: process.env.LIVEKIT_URL,
      roomName: lectureId,
      hlsUrl, // HLS URL for the bulk tier (ready immediately)
    });
  } catch (err) {
    console.error('[Stream] startSession error:', err);
    res.status(500).json({ error: 'Failed to start stream' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/stream/join/:lectureId
// Student joins a live session.
// Returns viewerTier ('webrtc' or 'hls') based on current participant count.
// Priority tier: LiveKit token. Bulk tier: HLS URL.
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

    // Determine viewer tier based on current room occupancy (ADR-001)
    const participantCount = await getRoomParticipantCount(lectureId);
    const viewerTier = participantCount < WEBRTC_PRIORITY_LIMIT ? 'webrtc' : 'hls';

    console.log(`[Stream] Student ${req.user.name} joining lecture ${lectureId}`);
    console.log(`[Stream]   Room occupancy: ${participantCount}, limit: ${WEBRTC_PRIORITY_LIMIT} → tier: ${viewerTier}`);

    if (viewerTier === 'hls') {
      // Bulk tier — ensure egress is running on this instance (idempotent) and return HLS URL.
      // startHLSEgress is safe to call multiple times: it checks activeEgresses first.
      // This also fixes the scaled-instance case: if /start hit a different instance,
      // this instance starts its own "egress" (prototype: just returns the static URL).
      let hlsUrl = null;
      try {
        hlsUrl = await startHLSEgress(lectureId);
      } catch (egressErr) {
        console.warn(`[Stream] HLS egress unavailable, falling back to WebRTC: ${egressErr.message}`);
      }

      if (hlsUrl) {
        return res.json({
          lectureId,
          role: 'subscriber',
          viewerTier: 'hls',
          hlsUrl,
          lectureName: result.rows[0].title,
          instructorName: result.rows[0].instructor_name,
        });
      }
      // HLS unavailable — fall through to WebRTC
      console.warn('[Stream] HLS unavailable, falling back to WebRTC for bulk-tier viewer');
    }

    // Priority tier (or HLS fallback) — generate WebRTC token
    const token = await generateLiveKitToken(
      req.user.id,
      req.user.name,
      lectureId,
      false // canPublish = false for students
    );

    res.json({
      lectureId,
      role: 'subscriber',
      viewerTier: 'webrtc',
      livekitToken: token,
      livekitUrl: process.env.LIVEKIT_URL,
      roomName: lectureId,
      hlsUrl: getHLSUrl(lectureId), // provided so client can fall back if WebRTC drops
      lectureName: result.rows[0].title,
      instructorName: result.rows[0].instructor_name,
    });
  } catch (err) {
    console.error('[Stream] joinSession error:', err);
    res.status(500).json({ error: 'Failed to join stream' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/stream/hls-status/:lectureId
// Polls whether HLS egress is active and returns the playback URL.
// Used by the frontend for fallback polling when WebRTC disconnects.
// ---------------------------------------------------------------------------
router.get('/hls-status/:lectureId', authenticate, async (req, res) => {
  const hlsUrl = getHLSUrl(req.params.lectureId);
  res.json({ hlsUrl, active: !!hlsUrl });
});

// ---------------------------------------------------------------------------
// POST /api/stream/end/:lectureId
// Instructor ends the session.
// Marks lecture as 'ended' in DB, stops HLS egress, closes the LiveKit room.
// ---------------------------------------------------------------------------
router.post('/end/:lectureId', authenticate, requireRole('instructor'), async (req, res) => {
  const { lectureId } = req.params;
  try {
    await pool.query(
      `UPDATE lectures SET status = 'ended' WHERE id = $1 AND instructor_id = $2`,
      [lectureId, req.user.id]
    );

    // Stop HLS egress first (cleans up MinIO write stream)
    await stopHLSEgress(lectureId);

    // Close the LiveKit room so all participants are disconnected immediately.
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
