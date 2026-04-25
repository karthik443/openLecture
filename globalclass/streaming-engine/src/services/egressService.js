// Egress Service — HLS Transcoding Pipeline (ADR-001)
//
// PRODUCTION implementation:
//   Calls LiveKit Cloud's EgressClient to start a RoomCompositeEgress job.
//   LiveKit transcodes the SFU output to LL-HLS segments (2s chunks) and
//   writes them to the MinIO S3 bucket. Nginx proxies /hls/* to MinIO,
//   delivering segments to bulk-tier viewers at ~2-3s latency.
//
// PROTOTYPE implementation (LiveKit Free tier — no Egress access):
//   In-memory tracking of "active egresses" only. Instead of real transcoded
//   segments, the hlsUrl points to Apple's public LL-HLS test stream so the
//   adaptive player can be demonstrated live during the viva.
//   MinIO is still running as the CDN origin infrastructure.
//
// To switch to production: replace the body of startHLSEgress below with the
// commented-out EgressClient code and set LIVEKIT_EGRESS_ENABLED=true in .env.

// Apple's public LL-HLS test stream — used as prototype stand-in content.
// In production this URL is replaced by http://localhost/hls/<lectureId>/live.m3u8
// (MinIO-hosted segments written by LiveKit Egress).
const PROTOTYPE_HLS_URL = 'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8';

// Maps lectureId → egressId for production egress lifecycle management.
// NOTE: In prototype mode this Map is not used for getHLSUrl() — see below.
// In production (real EgressClient), use Redis instead of this Map so that
// all scaled streaming-engine instances share egress state.
const activeEgresses = new Map();

// ---------------------------------------------------------------------------
// startHLSEgress — called when instructor goes live
// ---------------------------------------------------------------------------
export async function startHLSEgress(lectureId) {
  if (activeEgresses.has(lectureId)) {
    // Idempotent: egress already started for this lecture
    return getHLSUrl(lectureId);
  }

  // ── PROTOTYPE ────────────────────────────────────────────────────────────
  const mockEgressId = `proto-egress-${Date.now()}`;
  activeEgresses.set(lectureId, mockEgressId);
  console.log(`[Egress] PROTOTYPE: HLS egress started for lecture ${lectureId}`);
  console.log(`[Egress]   → Using Apple LL-HLS test stream as stand-in content`);
  console.log(`[Egress]   → PRODUCTION: Would call EgressClient.startRoomCompositeEgress()`);
  console.log(`[Egress]   → PRODUCTION: Segments written to MinIO hls/${lectureId}/ bucket`);
  return PROTOTYPE_HLS_URL;

  // ── PRODUCTION (uncomment when LiveKit Egress is enabled) ────────────────
  // import { EgressClient, EncodedFileType, SegmentedFileProtocol } from 'livekit-server-sdk';
  // const egress = new EgressClient(
  //   process.env.LIVEKIT_URL,
  //   process.env.LIVEKIT_API_KEY,
  //   process.env.LIVEKIT_API_SECRET
  // );
  // const info = await egress.startRoomCompositeEgress(lectureId, {
  //   file: {
  //     protocol: SegmentedFileProtocol.HLS,
  //     filenamePrefix:   `hls/${lectureId}/segment`,
  //     playlistName:     `hls/${lectureId}/index.m3u8`,
  //     livePlaylistName: `hls/${lectureId}/live.m3u8`,
  //     segmentDuration: 2,
  //     s3: {
  //       accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  //       secret:    process.env.MINIO_SECRET_KEY  || 'minioadmin',
  //       region:    'us-east-1',
  //       bucket:    'hls',
  //       endpoint:  process.env.MINIO_ENDPOINT || 'http://minio:9000',
  //       forcePathStyle: true,
  //     },
  //   }
  // });
  // activeEgresses.set(lectureId, info.egressId);
  // return `/hls/${lectureId}/live.m3u8`;  // served via Nginx → MinIO
}

// ---------------------------------------------------------------------------
// stopHLSEgress — called when instructor ends the lecture
// ---------------------------------------------------------------------------
export async function stopHLSEgress(lectureId) {
  const egressId = activeEgresses.get(lectureId);
  if (!egressId) return;

  activeEgresses.delete(lectureId);
  console.log(`[Egress] PROTOTYPE: HLS egress stopped for lecture ${lectureId}`);

  // PRODUCTION: await egress.stopEgress(egressId);
}

// ---------------------------------------------------------------------------
// getHLSUrl — returns the playback URL for an active lecture's HLS stream.
// Returns null if no egress is active (lecture not live or already ended).
//
// PROTOTYPE NOTE: returns PROTOTYPE_HLS_URL unconditionally (does NOT check
// activeEgresses). This is intentional: PROTOTYPE_HLS_URL is a constant —
// every scaled streaming-engine instance can serve it without sharing state.
// In production, replace with: return activeEgresses.has(lectureId)
//   ? `/hls/${lectureId}/live.m3u8` : null;
// AND back activeEgresses with Redis so all instances share egress state.
// ---------------------------------------------------------------------------
export function getHLSUrl(lectureId) {
  // PROTOTYPE: always available once egress is started on any instance
  // (startHLSEgress is called by /start and idempotently by /join,
  //  so any instance that receives a /join call will have the URL ready)
  return PROTOTYPE_HLS_URL;

  // PRODUCTION:
  // if (!activeEgresses.has(lectureId)) return null;
  // return `/hls/${lectureId}/live.m3u8`;
}
