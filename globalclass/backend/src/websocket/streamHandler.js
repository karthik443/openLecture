// WebRTC Signaling WebSocket — owned by: Team (streaming)
// Handles offer/answer/ICE candidate exchange between instructor and students

const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');

// lectureId -> { instructor: ws, viewers: Set<ws> }
const sessions = new Map();

function initStreamingWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws/stream' });

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
      sessions.set(lectureId, { instructor: null, viewers: new Set() });
    }

    const session = sessions.get(lectureId);

    if (ws.user.role === 'instructor') {
      session.instructor = ws;
    } else {
      session.viewers.add(ws);
    }

    ws.lectureId = lectureId;

    ws.on('message', (raw) => {
      // TODO (streaming team): handle WebRTC signaling messages
      // Expected message types:
      //   OFFER       — instructor sends SDP offer
      //   ANSWER      — student sends SDP answer
      //   ICE_CANDIDATE — either side sends ICE candidate
      try {
        const msg = JSON.parse(raw);
        handleSignaling(lectureId, ws, msg, session);
      } catch (err) {
        ws.send(JSON.stringify({ type: 'ERROR', message: err.message }));
      }
    });

    ws.on('close', () => {
      if (ws.user.role === 'instructor') session.instructor = null;
      else session.viewers.delete(ws);
    });
  });

  console.log('Streaming WebSocket initialized at /ws/stream');
}

function handleSignaling(lectureId, sender, msg, session) {
  // TODO (streaming team): implement signaling relay
  // OFFER: forward from instructor to all viewers
  // ANSWER: forward from viewer back to instructor
  // ICE_CANDIDATE: forward to the other party
}

module.exports = { initStreamingWebSocket };
