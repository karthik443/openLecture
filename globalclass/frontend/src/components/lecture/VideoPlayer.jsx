// Video Player (Student view) — Powered by LiveKit SFU
// Flow: On mount, call streaming-engine to get a subscriber token.
//       The LiveKit SDK connects to the SFU and receives the instructor's
//       published video/audio. Students cannot publish.
//       If lecture not live yet, polls every 4s until it goes live.

import React, { useState, useEffect, useRef } from 'react';
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
import api from '../../services/api';

// Inner component — runs inside a LiveKitRoom so it can use hooks
function LectureScreenView() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  // Filter: show only remote (instructor's) tracks, not our own
  const remoteTracks = tracks.filter((t) => !t.participant?.isLocal);
  const displayTracks = remoteTracks.length > 0 ? remoteTracks : tracks;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <GridLayout tracks={displayTracks} style={{ flex: 1 }}>
        <ParticipantTile />
      </GridLayout>
      <RoomAudioRenderer />
    </div>
  );
}

export default function VideoPlayer({ lectureId, token: _authToken }) {
  const [session, setSession] = useState(null);   // LiveKit token + URL
  const [status, setStatus] = useState('waiting'); // waiting | connecting | live | ended
  const [lectureInfo, setLectureInfo] = useState(null);
  const pollRef = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    async function tryJoin() {
      try {
        const { data } = await api.post(`/stream/join/${lectureId}`);
        if (!isMounted.current) return;
        setSession(data);
        setLectureInfo({ title: data.lectureName, instructor: data.instructorName });
        setStatus('live');
      } catch (err) {
        if (!isMounted.current) return;
        // NOT_LIVE → lecture hasn't started yet, poll again
        if (err.response?.data?.code === 'NOT_LIVE') {
          setStatus('waiting');
          pollRef.current = setTimeout(tryJoin, 4000);
        } else {
          setStatus('ended');
        }
      }
    }

    tryJoin();

    return () => {
      isMounted.current = false;
      clearTimeout(pollRef.current);
    };
  }, [lectureId]);

  // ── Waiting for instructor to start ──
  if (status === 'waiting') {
    return (
      <div style={styles.container}>
        <div style={styles.statusBar}>
          <span style={{ ...styles.dot, animation: 'pulse 1.5s infinite' }} />
          <span style={{ color: '#f4a261', fontSize: 13 }}>Waiting for instructor to go live...</span>
        </div>
        <div style={styles.videoBox}>
          <div style={styles.overlay}>
            <div style={styles.spinner} />
            <p style={{ fontSize: 15, opacity: 0.8, marginTop: 16 }}>
              Checking every 4 seconds...
            </p>
          </div>
        </div>
        <style>{CSS}</style>
      </div>
    );
  }

  // ── Stream ended ──
  if (status === 'ended') {
    return (
      <div style={styles.container}>
        <div style={styles.videoBox}>
          <div style={styles.overlay}>
            <div style={{ fontSize: 48 }}>📺</div>
            <p style={{ fontSize: 15, opacity: 0.8, marginTop: 12 }}>
              The lecture stream has ended.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Live — inside LiveKit room ──
  return (
    <div style={styles.container}>
      <div style={styles.statusBar}>
        <h3 style={{ margin: 0, fontSize: 15 }}>
          {lectureInfo?.title || 'Live Lecture'}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ ...styles.dot, background: '#e63946' }} />
          <span style={{ color: '#e63946', fontSize: 13, fontWeight: 700 }}>LIVE</span>
          {lectureInfo?.instructor && (
            <span style={{ color: '#888', fontSize: 12 }}>
              · {lectureInfo.instructor}
            </span>
          )}
        </div>
      </div>

      {/* LiveKit room — students cannot publish */}
      <div style={{ height: 380, borderRadius: 8, overflow: 'hidden' }}>
        <LiveKitRoom
          token={session.livekitToken}
          serverUrl={session.livekitUrl}
          video={false}
          audio={false}
          onDisconnected={() => setStatus('ended')}
          style={{ height: '100%' }}
        >
          <LectureScreenView />
        </LiveKitRoom>
      </div>

      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
  @keyframes spin  { to{transform:rotate(360deg)} }
`;

const styles = {
  container: { display: 'flex', flexDirection: 'column' },
  statusBar: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  dot: {
    width: 10, height: 10, borderRadius: '50%',
    background: '#f4a261', display: 'inline-block',
  },
  videoBox: {
    width: '100%', aspectRatio: '16/9', background: '#000',
    borderRadius: 8, position: 'relative', overflow: 'hidden',
  },
  overlay: {
    position: 'absolute', inset: 0, display: 'flex',
    flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', color: '#fff',
  },
  spinner: {
    width: 40, height: 40, border: '3px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff', borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};
