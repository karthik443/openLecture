// Q&A Service — owned by: Aayush
import pool from '../config/db.js';
import redis from '../config/redis.js';
import { rank } from './rankingStrategy.js';

const CACHE_TTL = 10; // seconds

function cacheKey(lectureId) {
  return `questions:${lectureId}`;
}

export async function getRankedQuestions(lectureId, strategy = 'default') {
  const key = cacheKey(lectureId);
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const result = await pool.query(
    `SELECT q.*, COUNT(v.id)::int AS vote_count
     FROM questions q
     LEFT JOIN votes v ON v.question_id = q.id
     WHERE q.lecture_id = $1
     GROUP BY q.id
     ORDER BY vote_count DESC, q.created_at ASC`,
    [lectureId]
  );

  const ranked = rank(result.rows, strategy);
  await redis.setEx(key, CACHE_TTL, JSON.stringify(ranked));
  return ranked;
}

export async function submitQuestion(lectureId, studentId, content) {
  const result = await pool.query(
    `INSERT INTO questions (lecture_id, student_id, content)
     VALUES ($1, $2, $3) RETURNING *`,
    [lectureId, studentId, content]
  );
  await redis.del(cacheKey(lectureId));
  return { ...result.rows[0], vote_count: 0 };
}

export async function voteQuestion(questionId, studentId) {
  try {
    await pool.query(
      `INSERT INTO votes (question_id, student_id) VALUES ($1, $2)`,
      [questionId, studentId]
    );
    const q = await pool.query(
      `SELECT lecture_id FROM questions WHERE id = $1`,
      [questionId]
    );
    await redis.del(cacheKey(q.rows[0].lecture_id));
    return { message: 'Vote recorded' };
  } catch (err) {
    if (err.code === '23505') throw new Error('Already voted');
    throw err;
  }
}

export async function markAnswered(questionId) {
  const result = await pool.query(
    `UPDATE questions SET is_answered = TRUE WHERE id = $1 RETURNING *`,
    [questionId]
  );
  await redis.del(cacheKey(result.rows[0].lecture_id));
  return result.rows[0];
}

export async function invalidateCache(lectureId) {
  await redis.del(cacheKey(lectureId));
}

const qaService = { getRankedQuestions, submitQuestion, voteQuestion, markAnswered, invalidateCache };
export default qaService;
