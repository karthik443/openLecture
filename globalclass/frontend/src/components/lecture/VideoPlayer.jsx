// Video Player (Student view) — owned by: Team (streaming)
// TODO: connect useWebRTC hook, render remote video stream

import React, { useRef } from 'react';
import { useWebRTC } from '../../hooks/useWebRTC';

export default function VideoPlayer({ lectureId, token }) {
  const videoRef = useRef(null);
  useWebRTC(lectureId, token, 'student');

  // TODO (streaming team): attach remote stream to videoRef.current.srcObject

  return (
    <div>
      <h3>Live Lecture</h3>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ width: '100%', background: '#000', aspectRatio: '16/9' }}
      />
    </div>
  );
}
