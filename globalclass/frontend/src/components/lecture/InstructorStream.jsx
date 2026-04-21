// Instructor Stream (Broadcast view) — owned by: Team (streaming)
// Captures local camera/mic, sends via WebRTC to all students

import React, { useRef, useEffect } from 'react';
import { useWebRTC } from '../../hooks/useWebRTC';

export default function InstructorStream({ lectureId, token }) {
  const videoRef = useRef(null);
  const {
    localStream,
    viewerCount,
    connectionState,
    startStreaming,
    stopStreaming,
  } = useWebRTC(lectureId, token, 'instructor');

  // Attach local stream to video element
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const isStreaming = connectionState === 'streaming';

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 12,
      }}>
        <h3 style={{ margin: 0 }}>Your Stream (Instructor)</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Viewer count badge */}
          {isStreaming && (
            <span style={{
              background: '#2a9d8f22', color: '#2a9d8f',
              padding: '4px 12px', borderRadius: 12,
              fontSize: 13, fontWeight: 600,
            }}>
              👁 {viewerCount} viewer{viewerCount !== 1 ? 's' : ''}
            </span>
          )}

          {/* Connection status */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 13, color: isStreaming ? '#2a9d8f' : '#888',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: isStreaming ? '#2a9d8f' : '#ccc',
              display: 'inline-block',
            }} />
            {isStreaming ? 'LIVE' : connectionState}
          </span>
        </div>
      </div>

      {/* Video preview */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          width: '100%', background: '#111',
          aspectRatio: '16/9', borderRadius: 8,
        }}
      />

      {/* Controls */}
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        {!isStreaming ? (
          <button
            onClick={startStreaming}
            style={{
              padding: '10px 24px', background: '#2a9d8f',
              color: '#fff', border: 'none', borderRadius: 6,
              cursor: 'pointer', fontSize: 14, fontWeight: 600,
            }}
          >
            🎥 Start Streaming
          </button>
        ) : (
          <button
            onClick={stopStreaming}
            style={{
              padding: '10px 24px', background: '#e63946',
              color: '#fff', border: 'none', borderRadius: 6,
              cursor: 'pointer', fontSize: 14, fontWeight: 600,
            }}
          >
            ⏹ Stop Streaming
          </button>
        )}
      </div>
    </div>
  );
}
