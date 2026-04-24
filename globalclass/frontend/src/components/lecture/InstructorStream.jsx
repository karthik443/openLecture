// Instructor Stream — Powered by LiveKit SFU
// Flow: Instructor clicks "Start Streaming" → API call to streaming-engine
//       → receives a LiveKit publisher token → LiveKit SDK handles all WebRTC
//       → students receive the stream directly from LiveKit's SFU

import React, { useState, useCallback } from 'react';
import {
  LiveKitRoom,
  VideoConference,
} from '@livekit/components-react';
import '@livekit/components-styles';
import api from '../../services/api';

export default function InstructorStream({ lectureId, token: _authToken }) {
  const [session, setSession] = useState(null); // { livekitToken, livekitUrl }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const startStreaming = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post(`/stream/start/${lectureId}`);
      setSession(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start stream. Check LiveKit config.');
    } finally {
      setLoading(false);
    }
  }, [lectureId]);

  const stopStreaming = useCallback(async () => {
    try {
      await api.post(`/stream/end/${lectureId}`);
    } catch {/* ignore */} finally {
      setSession(null);
    }
  }, [lectureId]);

  // ── Pre-stream state ──
  if (!session) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>Your Stream (Instructor)</h3>
          <span style={{ ...styles.statusDot, background: '#ccc' }} />
        </div>

        {/* Placeholder preview */}
        <div style={styles.preview}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎥</div>
          <p style={{ color: '#aaa', fontSize: 14 }}>
            Click start to go live. LiveKit SFU routes your stream to all students.
          </p>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <div style={{ marginTop: 12 }}>
          <button onClick={startStreaming} disabled={loading} style={styles.startBtn}>
            {loading ? 'Connecting to SFU...' : '🎥 Start Streaming'}
          </button>
        </div>
      </div>
    );
  }

  // ── Live state — inside LiveKit room ──
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Your Stream</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ ...styles.statusDot, background: '#2a9d8f' }} />
          <span style={{ color: '#2a9d8f', fontSize: 13, fontWeight: 600 }}>LIVE via SFU</span>
          <button onClick={stopStreaming} style={styles.stopBtn}>⏹ End Stream</button>
        </div>
      </div>

      {/* LiveKit room — SFU handles all WebRTC for us */}
      <div style={{ height: 420, borderRadius: 8, overflow: 'hidden' }}>
        <LiveKitRoom
          token={session.livekitToken}
          serverUrl={session.livekitUrl}
          video={true}
          audio={true}
          onDisconnected={() => setSession(null)}
          style={{ height: '100%' }}
        >
          <VideoConference />
        </LiveKitRoom>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column' },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  title: { margin: 0, fontSize: 16, fontWeight: 600 },
  statusDot: {
    width: 10, height: 10, borderRadius: '50%', display: 'inline-block',
  },
  preview: {
    width: '100%', aspectRatio: '16/9', background: '#111',
    borderRadius: 8, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
  },
  startBtn: {
    padding: '10px 24px', background: '#2a9d8f', color: '#fff',
    border: 'none', borderRadius: 6, cursor: 'pointer',
    fontSize: 14, fontWeight: 600,
  },
  stopBtn: {
    padding: '6px 14px', background: '#e63946', color: '#fff',
    border: 'none', borderRadius: 6, cursor: 'pointer',
    fontSize: 13, fontWeight: 600,
  },
  error: { color: '#e63946', fontSize: 13, margin: '8px 0 0' },
};
