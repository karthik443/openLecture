// WebRTC hook — owned by: Team (streaming)
// TODO: implement WebRTC peer connection using signaling WebSocket at /ws/stream

import { useEffect, useRef } from 'react';

export function useWebRTC(lectureId, token, role) {
  const ws = useRef(null);
  const pc = useRef(null); // RTCPeerConnection

  useEffect(() => {
    if (!lectureId || !token) return;

    const url = `ws://localhost:4000/ws/stream?lectureId=${lectureId}&token=${token}`;
    ws.current = new WebSocket(url);

    // TODO (streaming team):
    // 1. Create RTCPeerConnection with ICE servers
    // 2. If role === 'instructor': create offer, send via WS
    // 3. If role === 'student': wait for offer, send answer
    // 4. Exchange ICE candidates via WS

    return () => {
      ws.current?.close();
      pc.current?.close();
    };
  }, [lectureId, token, role]);

  return { pc };
}
