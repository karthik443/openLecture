// Q&A WebSocket Handler
// Observer Pattern: broadcasts ranked question updates to all clients in a lecture room

import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import qaService from '../services/qaService.js';

// lectureId -> Set of WebSocket clients
const rooms = new Map();

// lectureId -> active ranking strategy ('default' | 'votes' | 'recency')
const roomStrategies = new Map();

export const qaWss = new WebSocketServer({ noServer: true });

export function initQAWebSocket() {
  qaWss.on('connection', async (ws, req) => {
    const params = new URLSearchParams(req.url.replace('/ws/qa?', ''));
    const lectureId = params.get('lectureId');
    const token = params.get('token');

    try {
      ws.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      ws.close(4001, 'Unauthorized');
      return;
    }

    if (!rooms.has(lectureId)) rooms.set(lectureId, new Set());
    rooms.get(lectureId).add(ws);
    ws.lectureId = lectureId;

    // Push current state immediately so late joiners see existing questions
    try {
      const strategy = roomStrategies.get(lectureId) || 'default';
      const questions = await qaService.getRankedQuestions(lectureId, strategy);
      ws.send(JSON.stringify({ type: 'QUESTIONS_UPDATE', questions, strategy }));
    } catch (err) {
      ws.send(JSON.stringify({ type: 'ERROR', message: err.message }));
    }

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw);

        if (msg.type === 'SUBMIT_QUESTION') {
          await qaService.submitQuestion(lectureId, ws.user.id, msg.content);
          await broadcastQuestions(lectureId);
        }

        if (msg.type === 'VOTE') {
          await qaService.voteQuestion(msg.questionId, ws.user.id, lectureId);
          await broadcastQuestions(lectureId);
        }

        if (msg.type === 'MARK_ANSWERED') {
          if (ws.user.role !== 'instructor') {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Only instructors can mark questions answered' }));
            return;
          }
          await qaService.markAnswered(msg.questionId, lectureId);
          await broadcastQuestions(lectureId);
        }

        if (msg.type === 'SET_STRATEGY') {
          if (ws.user.role !== 'instructor') {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Only instructors can change ranking strategy' }));
            return;
          }
          const valid = ['default', 'votes', 'recency'];
          if (!valid.includes(msg.strategy)) {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid strategy' }));
            return;
          }
          roomStrategies.set(lectureId, msg.strategy);
          await broadcastQuestions(lectureId);
        }
      } catch (err) {
        ws.send(JSON.stringify({ type: 'ERROR', message: err.message }));
      }
    });

    ws.on('close', async () => {
      const room = rooms.get(lectureId);
      room?.delete(ws);
      // When last client leaves, do a final flush and clean up Redis buffer
      if (room?.size === 0) {
        rooms.delete(lectureId);
        roomStrategies.delete(lectureId);
        await qaService.finalFlushAndClean(lectureId);
      }
    });
  });

  // Flush all active lecture buffers to PostgreSQL every 5 seconds (NFR2 durability)
  setInterval(async () => {
    for (const [lectureId] of rooms) {
      await qaService.flushToDB(lectureId);
    }
  }, 5000);

  console.log('Q&A WebSocket initialized at /ws/qa');
}

export async function broadcastQuestions(lectureId) {
  const strategy = roomStrategies.get(lectureId) || 'default';
  const questions = await qaService.getRankedQuestions(lectureId, strategy);
  const payload = JSON.stringify({ type: 'QUESTIONS_UPDATE', questions, strategy });
  rooms.get(lectureId)?.forEach((client) => {
    if (client.readyState === 1) client.send(payload);
  });
}
