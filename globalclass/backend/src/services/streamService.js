// Streaming Service — owned by: Team (streaming)
// Manages stream session lifecycle via the lectures table

import pool from '../config/db.js';

export async function startSession(lectureId, instructorId) {
  // Verify instructor owns this lecture and set it live
  const result = await pool.query(
    `UPDATE lectures SET status = 'live' WHERE id = $1 AND instructor_id = $2 RETURNING *`,
    [lectureId, instructorId]
  );
  if (!result.rows[0]) throw new Error('Lecture not found or not authorized');

  return {
    lectureId,
    role: 'publisher',
    wsEndpoint: `ws://localhost:4000/ws/stream?lectureId=${lectureId}`,
  };
}

export async function joinSession(lectureId, studentId) {
  // Verify lecture is live
  const result = await pool.query(
    `SELECT * FROM lectures WHERE id = $1 AND status = 'live'`,
    [lectureId]
  );
  if (!result.rows[0]) throw new Error('Lecture is not live');

  return {
    lectureId,
    role: 'viewer',
    wsEndpoint: `ws://localhost:4000/ws/stream?lectureId=${lectureId}`,
  };
}

export async function endSession(lectureId) {
  await pool.query(
    `UPDATE lectures SET status = 'ended' WHERE id = $1`,
    [lectureId]
  );
  return { lectureId, message: 'Stream ended' };
}

const streamService = { startSession, joinSession, endSession };
export default streamService;
