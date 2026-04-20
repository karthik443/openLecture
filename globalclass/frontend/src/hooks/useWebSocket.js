// Q&A WebSocket hook — owned by: Aayush
import { useEffect, useRef, useCallback } from 'react';

export function useQAWebSocket(lectureId, token, onMessage) {
  const ws = useRef(null);

  useEffect(() => {
    if (!lectureId || !token) return;

    const url = `ws://localhost:4000/ws/qa?lectureId=${lectureId}&token=${token}`;
    ws.current = new WebSocket(url);

    ws.current.onmessage = (e) => onMessage(JSON.parse(e.data));
    ws.current.onerror = (e) => console.error('Q&A WS error', e);

    return () => ws.current?.close();
  }, [lectureId, token]);

  const send = useCallback((msg) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg));
    }
  }, []);

  return { send };
}
