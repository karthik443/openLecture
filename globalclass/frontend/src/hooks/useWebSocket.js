// Q&A WebSocket hook
import { useEffect, useRef, useCallback } from 'react';

const RECONNECT_DELAY_MS = 2000;  // initial backoff
const MAX_RECONNECT_DELAY_MS = 16000;  // cap at 16s
const MAX_RECONNECT_ATTEMPTS = 8;

export function useQAWebSocket(lectureId, token, onMessage) {
  const ws = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef(null);
  const isMounted = useRef(true);
  // Keep a ref to the latest onMessage so connect() never needs it as a dependency.
  // Without this, an inline arrow onMessage would give a new reference every render,
  // causing connect to be recreated, the effect to re-run, and the socket to reconnect
  // in a tight loop — so submitted questions would never appear.
  const onMessageRef = useRef(onMessage);
  useEffect(() => { onMessageRef.current = onMessage; });

  const connect = useCallback(() => {
    if (!lectureId || !token || !isMounted.current) return;

    const url = `ws://localhost:4000/ws/qa?lectureId=${lectureId}&token=${token}`;
    const socket = new WebSocket(url);
    ws.current = socket;

    socket.onopen = () => {
      reconnectAttempts.current = 0;
    };

    socket.onmessage = (e) => {
      try {
        onMessageRef.current(JSON.parse(e.data));
      } catch {
        console.error('Q&A WS: failed to parse message');
      }
    };

    socket.onerror = (e) => console.error('Q&A WS error', e);

    socket.onclose = (e) => {
      // 4001 = unauthorized — do not reconnect
      if (e.code === 4001 || !isMounted.current) return;
      if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
        console.warn('Q&A WS: max reconnect attempts reached');
        return;
      }

      // Exponential backoff: 2s, 4s, 8s, 16s, 16s, ...
      const delay = Math.min(
        RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempts.current),
        MAX_RECONNECT_DELAY_MS
      );
      reconnectAttempts.current += 1;
      console.log(`Q&A WS: reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
      reconnectTimer.current = setTimeout(connect, delay);
    };
  }, [lectureId, token]); // onMessage intentionally excluded — accessed via ref

  useEffect(() => {
    isMounted.current = true;
    connect();

    return () => {
      isMounted.current = false;
      clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  const send = useCallback((msg) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg));
    }
  }, []);

  return { send };
}
