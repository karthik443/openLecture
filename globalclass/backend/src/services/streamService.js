// Streaming Service — owned by: Team (streaming)
// TODO: integrate with WebRTC SFU (mediasoup / simple-peer)

async function startSession(lectureId, instructorId) {
  // TODO (streaming team):
  // 1. Create SFU room for lectureId
  // 2. Generate instructor publish token
  // 3. Return SFU endpoint + token
  return {
    lectureId,
    role: 'publisher',
    sfuEndpoint: null,   // fill in when SFU is integrated
    token: null,
  };
}

async function joinSession(lectureId, studentId) {
  // TODO (streaming team):
  // 1. Verify lecture is live
  // 2. Generate viewer token for SFU room
  // 3. Return SFU endpoint + token
  return {
    lectureId,
    role: 'viewer',
    sfuEndpoint: null,   // fill in when SFU is integrated
    token: null,
  };
}

async function endSession(lectureId) {
  // TODO (streaming team):
  // 1. Close SFU room
  // 2. Trigger recording save to object storage
  return { lectureId };
}

module.exports = { startSession, joinSession, endSession };
