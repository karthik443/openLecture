// Instructor Stream (Broadcast view) — owned by: Team (streaming)
// TODO: capture local camera/mic, send via WebRTC

import React, { useRef } from 'react';
import { useWebRTC } from '../../hooks/useWebRTC';

export default function InstructorStream({ lectureId, token }) {
  const videoRef = useRef(null);
  useWebRTC(lectureId, token, 'instructor');

  // TODO (streaming team):
  // 1. navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  // 2. Attach local stream to videoRef.current.srcObject
  // 3. Add tracks to RTCPeerConnection

  return (
    <div>
      <h3>Your Stream (Instructor)</h3>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: '100%', background: '#111', aspectRatio: '16/9' }}
      />
    </div>
  );
}
