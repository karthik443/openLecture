// WebRTC hook — owned by: Team (streaming)
// Full implementation: instructor publishes stream, students subscribe

import { useEffect, useRef, useState, useCallback } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useWebRTC(lectureId, token, role) {
  const ws = useRef(null);
  const peerConnections = useRef(new Map()); // instructor: viewerId -> pc, student: 'instructor' -> pc
  const localStreamRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [connectionState, setConnectionState] = useState('disconnected'); // disconnected, connecting, connected, streaming
  const [streamEnded, setStreamEnded] = useState(false);

  // --- Instructor: start local camera ---
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, frameRate: 30 },
        audio: true,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('[WebRTC] Failed to get camera:', err);
      throw err;
    }
  }, []);

  // --- Instructor: stop local camera ---
  const stopCamera = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
  }, []);

  // --- Instructor: create a new peer connection for a viewer ---
  const createInstructorPC = useCallback((viewerId, wsRef) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks to this peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    pc.onicecandidate = (e) => {
      if (e.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'ICE_CANDIDATE',
          candidate: e.candidate,
          viewerId,
        }));
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] PC to ${viewerId}: ${pc.connectionState}`);
    };

    peerConnections.current.set(viewerId, pc);
    return pc;
  }, []);

  // --- Student: create peer connection for the instructor ---
  const createStudentPC = useCallback((wsRef) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    const stream = new MediaStream();
    setRemoteStream(stream);

    pc.ontrack = (e) => {
      e.streams[0].getTracks().forEach(track => {
        stream.addTrack(track);
      });
      setRemoteStream(new MediaStream(stream.getTracks()));
      setConnectionState('streaming');
    };

    pc.onicecandidate = (e) => {
      if (e.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'ICE_CANDIDATE',
          candidate: e.candidate,
        }));
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Student PC: ${pc.connectionState}`);
      if (pc.connectionState === 'connected') {
        setConnectionState('streaming');
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setConnectionState('disconnected');
      }
    };

    peerConnections.current.set('instructor', pc);
    return pc;
  }, []);

  // --- Start streaming (instructor only) ---
  const startStreaming = useCallback(async () => {
    if (role !== 'instructor') return;
    setConnectionState('connecting');

    try {
      const stream = await startCamera();
      localStreamRef.current = stream;

      // Connect WebSocket
      const url = `ws://localhost:4000/ws/stream?lectureId=${lectureId}&token=${token}`;
      ws.current = new WebSocket(url);

      ws.current.onopen = async () => {
        setConnectionState('streaming');
        console.log('[WebRTC] Instructor connected to signaling server');

        // Create an initial offer (will be sent to all current and future viewers)
        const pc = new RTCPeerConnection(ICE_SERVERS);
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.onicecandidate = (e) => {
          if (e.candidate && ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
              type: 'ICE_CANDIDATE',
              candidate: e.candidate,
            }));
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        ws.current.send(JSON.stringify({
          type: 'OFFER',
          sdp: pc.localDescription,
        }));

        peerConnections.current.set('__broadcast__', pc);
      };

      ws.current.onmessage = async (e) => {
        const msg = JSON.parse(e.data);

        switch (msg.type) {
          case 'ANSWER': {
            // A student answered — either set on the broadcast PC or a per-viewer PC
            const pc = peerConnections.current.get('__broadcast__');
            if (pc && pc.signalingState !== 'stable') {
              await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            } else {
              // Create a dedicated PC for this viewer
              const viewerPC = createInstructorPC(msg.viewerId, ws);
              const offer = await viewerPC.createOffer();
              await viewerPC.setLocalDescription(offer);
              ws.current.send(JSON.stringify({
                type: 'OFFER',
                sdp: viewerPC.localDescription,
              }));
            }
            break;
          }

          case 'ICE_CANDIDATE': {
            const pc = peerConnections.current.get(msg.viewerId) || peerConnections.current.get('__broadcast__');
            if (pc && msg.candidate) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
              } catch (err) {
                console.warn('[WebRTC] Failed to add ICE candidate:', err);
              }
            }
            break;
          }

          case 'VIEWER_COUNT':
            setViewerCount(msg.count);
            break;

          case 'VIEWER_LEFT': {
            const pc = peerConnections.current.get(msg.viewerId);
            if (pc) {
              pc.close();
              peerConnections.current.delete(msg.viewerId);
            }
            break;
          }
        }
      };

      ws.current.onclose = () => {
        console.log('[WebRTC] Instructor WS closed');
      };

    } catch (err) {
      console.error('[WebRTC] Failed to start streaming:', err);
      setConnectionState('disconnected');
    }
  }, [role, lectureId, token, startCamera, createInstructorPC]);

  // --- Stop streaming (instructor only) ---
  const stopStreaming = useCallback(() => {
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    ws.current?.close();
    stopCamera();
    setConnectionState('disconnected');
    setViewerCount(0);
  }, [stopCamera]);

  // --- Student: auto-connect on mount ---
  useEffect(() => {
    if (role !== 'student' || !lectureId || !token) return;

    setConnectionState('connecting');
    setStreamEnded(false);
    const url = `ws://localhost:4000/ws/stream?lectureId=${lectureId}&token=${token}`;
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      console.log('[WebRTC] Student connected to signaling server');
    };

    ws.current.onmessage = async (e) => {
      const msg = JSON.parse(e.data);

      switch (msg.type) {
        case 'OFFER': {
          // Close any existing PC and create a new one
          const existingPC = peerConnections.current.get('instructor');
          if (existingPC) {
            existingPC.close();
            peerConnections.current.delete('instructor');
          }

          const pc = createStudentPC(ws);
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          ws.current.send(JSON.stringify({
            type: 'ANSWER',
            sdp: pc.localDescription,
          }));
          setConnectionState('connecting');
          break;
        }

        case 'ICE_CANDIDATE': {
          const pc = peerConnections.current.get('instructor');
          if (pc && msg.candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
            } catch (err) {
              console.warn('[WebRTC] Failed to add ICE candidate:', err);
            }
          }
          break;
        }

        case 'STREAM_ENDED':
          setStreamEnded(true);
          setConnectionState('disconnected');
          peerConnections.current.forEach(pc => pc.close());
          peerConnections.current.clear();
          break;
      }
    };

    ws.current.onclose = () => {
      console.log('[WebRTC] Student WS closed');
    };

    return () => {
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
      ws.current?.close();
    };
  }, [role, lectureId, token, createStudentPC]);

  return {
    localStream,
    remoteStream,
    viewerCount,
    connectionState,
    streamEnded,
    startStreaming,
    stopStreaming,
  };
}
