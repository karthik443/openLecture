// Video Player (Student view) — owned by: Team (streaming)
// Connects to the instructor's WebRTC stream and displays remote video

import React, { useRef, useEffect } from 'react';
import { useWebRTC } from '../../hooks/useWebRTC';

export default function VideoPlayer({ lectureId, token }) {
  const videoRef = useRef(null);
  const {
    remoteStream,
    connectionState,
    streamEnded,
  } = useWebRTC(lectureId, token, 'student');

  // Attach remote stream to video element
  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const isStreaming = connectionState === 'streaming';

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 12,
      }}>
        <h3 style={{ margin: 0 }}>Live Lecture</h3>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 13,
          color: isStreaming ? '#2a9d8f' : streamEnded ? '#e63946' : '#f4a261',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: isStreaming ? '#2a9d8f' : streamEnded ? '#e63946' : '#f4a261',
            display: 'inline-block',
            animation: isStreaming ? 'none' : (streamEnded ? 'none' : 'pulse 1.5s infinite'),
          }} />
          {isStreaming ? 'LIVE' : streamEnded ? 'Stream Ended' : 'Waiting for stream...'}
        </span>
      </div>

      <div style={{ position: 'relative' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            width: '100%', background: '#000',
            aspectRatio: '16/9', borderRadius: 8,
          }}
        />

        {/* Overlay when not streaming */}
        {!isStreaming && (
          <div style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)', borderRadius: 8, color: '#fff',
          }}>
            {streamEnded ? (
              <>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📺</div>
                <p style={{ fontSize: 16, opacity: 0.8 }}>The lecture stream has ended.</p>
              </>
            ) : (
              <>
                <div style={{
                  width: 40, height: 40, border: '3px solid #fff',
                  borderTopColor: 'transparent', borderRadius: '50%',
                  animation: 'spin 1s linear infinite', marginBottom: 12,
                }} />
                <p style={{ fontSize: 16, opacity: 0.8 }}>Waiting for instructor to start streaming...</p>
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
