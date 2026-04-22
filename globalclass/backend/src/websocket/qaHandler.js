// Q&A WebSocket Handler — owned by: Aayush
// Observer Pattern: broadcasts ranked question updates to all clients in a lecture room

import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import qaService from '../services/qaService.js';

// lectureId -> Set of WebSocket clients
const rooms = new Map();

// lectureId -> active ranking strategy ('default' | 'votes' | 'recency')
const roomStrategies = new Map();

// Export the WSS so index.js can route upgrades to it
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

    // Join lecture room
    if (!rooms.has(lectureId)) rooms.set(lectureId, new Set());
    rooms.get(lectureId).add(ws);
    ws.lectureId = lectureId;

    // Send current questions immediately so late joiners see existing state
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
          await qaService.voteQuestion(msg.questionId, ws.user.id);
          await broadcastQuestions(lectureId);
        }

        if (msg.type === 'MARK_ANSWERED') {
          if (ws.user.role !== 'instructor') {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Only instructors can mark questions answered' }));
            return;
          }
          await qaService.markAnswered(msg.questionId);
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
          // Bust cache so next broadcast re-ranks with new strategy
          await qaService.invalidateCache(lectureId);
          await broadcastQuestions(lectureId);
        }
      } catch (err) {
        ws.send(JSON.stringify({ type: 'ERROR', message: err.message }));
      }
    });

    ws.on('close', () => {
      rooms.get(lectureId)?.delete(ws);
    });
  });

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
