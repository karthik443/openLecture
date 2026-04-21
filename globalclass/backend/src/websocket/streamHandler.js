// WebRTC Signaling WebSocket — owned by: Team (streaming)
// Handles offer/answer/ICE candidate exchange between instructor and students

import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';

// lectureId -> { instructor: ws, viewers: Map<viewerId, ws>, currentOffer: sdp }
const sessions = new Map();

// Export the WSS so index.js can route upgrades to it
export const streamWss = new WebSocketServer({ noServer: true });

export function initStreamingWebSocket() {
  const wss = streamWss;

  wss.on('connection', (ws, req) => {
    const params = new URLSearchParams(req.url.replace('/ws/stream?', ''));
    const lectureId = params.get('lectureId');
    const token = params.get('token');

    try {
      ws.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      ws.close(4001, 'Unauthorized');
      return;
    }

    if (!sessions.has(lectureId)) {
      sessions.set(lectureId, { instructor: null, viewers: new Map(), currentOffer: null });
    }

    const session = sessions.get(lectureId);
    ws.lectureId = lectureId;

    if (ws.user.role === 'instructor') {
      session.instructor = ws;
      console.log(`[Stream] Instructor ${ws.user.name} connected to lecture ${lectureId}`);

      // Notify instructor of current viewer count
      ws.send(JSON.stringify({
        type: 'VIEWER_COUNT',
        count: session.viewers.size,
      }));
    } else {
      session.viewers.set(ws.user.id, ws);
      console.log(`[Stream] Student ${ws.user.name} joined lecture ${lectureId} (${session.viewers.size} viewers)`);

      // If instructor already has an offer, send it to the new student immediately
      if (session.currentOffer) {
        ws.send(JSON.stringify({
          type: 'OFFER',
          sdp: session.currentOffer,
          from: 'instructor',
        }));
      }

      // Notify instructor of updated viewer count
      if (session.instructor?.readyState === 1) {
        session.instructor.send(JSON.stringify({
          type: 'VIEWER_COUNT',
          count: session.viewers.size,
        }));
      }
    }

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw);
        handleSignaling(lectureId, ws, msg, session);
      } catch (err) {
        ws.send(JSON.stringify({ type: 'ERROR', message: err.message }));
      }
    });

    ws.on('close', () => {
      if (ws.user.role === 'instructor') {
        session.instructor = null;
        session.currentOffer = null;
        // Notify all viewers that stream ended
        session.viewers.forEach((viewer) => {
          if (viewer.readyState === 1) {
            viewer.send(JSON.stringify({ type: 'STREAM_ENDED' }));
          }
        });
        console.log(`[Stream] Instructor left lecture ${lectureId}`);
      } else {
        session.viewers.delete(ws.user.id);
        // Notify instructor of updated viewer count
        if (session.instructor?.readyState === 1) {
          session.instructor.send(JSON.stringify({
            type: 'VIEWER_COUNT',
            count: session.viewers.size,
          }));
          // Tell instructor to remove this peer
          session.instructor.send(JSON.stringify({
            type: 'VIEWER_LEFT',
            viewerId: ws.user.id,
          }));
        }
        console.log(`[Stream] Student left lecture ${lectureId} (${session.viewers.size} viewers)`);
      }

      // Cleanup empty sessions
      if (!session.instructor && session.viewers.size === 0) {
        sessions.delete(lectureId);
      }
    });
  });

  console.log('Streaming WebSocket initialized at /ws/stream');
}

function handleSignaling(lectureId, sender, msg, session) {
  switch (msg.type) {
    case 'OFFER': {
      // Instructor sends an offer — store it and broadcast to all current viewers
      session.currentOffer = msg.sdp;
      session.viewers.forEach((viewer) => {
        if (viewer.readyState === 1) {
          viewer.send(JSON.stringify({
            type: 'OFFER',
            sdp: msg.sdp,
            from: 'instructor',
          }));
        }
      });
      break;
    }

    case 'ANSWER': {
      // Student sends an answer — forward to instructor with student's ID
      if (session.instructor?.readyState === 1) {
        session.instructor.send(JSON.stringify({
          type: 'ANSWER',
          sdp: msg.sdp,
          viewerId: sender.user.id,
        }));
      }
      break;
    }

    case 'ICE_CANDIDATE': {
      if (sender.user.role === 'instructor') {
        // Instructor ICE candidate → forward to the target viewer (or all)
        if (msg.viewerId) {
          const viewer = session.viewers.get(msg.viewerId);
          if (viewer?.readyState === 1) {
            viewer.send(JSON.stringify({
              type: 'ICE_CANDIDATE',
              candidate: msg.candidate,
              from: 'instructor',
            }));
          }
        } else {
          // Broadcast to all viewers
          session.viewers.forEach((viewer) => {
            if (viewer.readyState === 1) {
              viewer.send(JSON.stringify({
                type: 'ICE_CANDIDATE',
                candidate: msg.candidate,
                from: 'instructor',
              }));
            }
          });
        }
      } else {
        // Student ICE candidate → forward to instructor with student's ID
        if (session.instructor?.readyState === 1) {
          session.instructor.send(JSON.stringify({
            type: 'ICE_CANDIDATE',
            candidate: msg.candidate,
            viewerId: sender.user.id,
          }));
        }
      }
      break;
    }

    default:
      sender.send(JSON.stringify({ type: 'ERROR', message: `Unknown message type: ${msg.type}` }));
  }
}
