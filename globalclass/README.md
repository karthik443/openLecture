# GlobalClass — Distributed Platform for Global Academic Lectures

A prototype implementation for the OpenLecture Software Engineering project (Team 43).

## Features Implemented

| Feature | Owner | Status |
|---------|-------|--------|
| User Auth (JWT + RBAC) | Shared | ✅ Complete |
| Course Catalog & Enrollment | Shared | ✅ Complete |
| Real-Time Q&A (WebSocket + Ranking) | Aayush | ✅ Complete |
| Live Video Streaming (WebRTC) | Team (streaming) | 🔧 In Progress |

## Tech Stack

- **Frontend:** React 18, React Router
- **Backend:** Node.js, Express, WebSocket (ws)
- **Database:** PostgreSQL 15
- **Cache:** Redis 7
- **Auth:** JWT (jsonwebtoken + bcryptjs)
- **Streaming:** WebRTC (signaling via WebSocket)

## Project Structure

```
globalclass/
├── backend/
│   ├── src/
│   │   ├── config/         # db.js, redis.js
│   │   ├── middleware/     # auth.js (JWT + RBAC)
│   │   ├── routes/         # auth, lectures, questions, stream
│   │   ├── services/       # qaService, streamService, rankingStrategy
│   │   ├── websocket/      # qaHandler (Q&A), streamHandler (WebRTC signaling)
│   │   ├── db/migrations/  # 001_init.sql
│   │   ├── app.js
│   │   └── index.js
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── lecture/    # VideoPlayer, InstructorStream
│   │   │   └── qa/         # QuestionList, QuestionInput, InstructorQAView
│   │   ├── hooks/          # useWebSocket (Q&A), useWebRTC (streaming)
│   │   ├── pages/          # Login, CourseCatalog, LecturePage
│   │   ├── services/       # api.js (axios)
│   │   └── App.jsx
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Setup Instructions

### Option 1: Docker (recommended)

```bash
git clone <repo-url>
cd globalclass
docker-compose up --build
```

Then run the database migration:
```bash
docker-compose exec backend npm run migrate
```

Visit: http://localhost:3000

### Option 2: Manual Setup

**Prerequisites:** Node.js 18+, PostgreSQL 15, Redis 7

**Backend:**
```bash
cd backend
cp .env.example .env    # fill in your values
npm install
npm run migrate         # runs SQL migration
npm run dev             # starts on port 4000
```

**Frontend:**
```bash
cd frontend
npm install
npm start               # starts on port 3000
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | None | Register user |
| POST | `/api/auth/login` | None | Login, get JWT |
| GET | `/api/lectures` | Any | Browse all lectures |
| POST | `/api/lectures` | Instructor | Create lecture |
| PATCH | `/api/lectures/:id/status` | Instructor | Go live / end |
| POST | `/api/lectures/:id/enroll` | Student | Enroll in lecture |
| GET | `/api/lectures/:id/questions` | Any | Get ranked Q&A |
| POST | `/api/lectures/:id/questions` | Any | Submit question |
| POST | `/api/lectures/:id/questions/:qid/vote` | Any | Upvote question |
| PATCH | `/api/lectures/:id/questions/:qid/answer` | Instructor | Mark answered |

## WebSocket Endpoints

| Path | Purpose | Owner |
|------|---------|-------|
| `ws://localhost:4000/ws/qa?lectureId=X&token=Y` | Real-time Q&A | Aayush |
| `ws://localhost:4000/ws/stream?lectureId=X&token=Y` | WebRTC signaling | Team (streaming) |

### Q&A WebSocket Message Types

**Client → Server:**
```json
{ "type": "SUBMIT_QUESTION", "content": "What is ..." }
{ "type": "VOTE", "questionId": "uuid" }
{ "type": "MARK_ANSWERED", "questionId": "uuid" }
```

**Server → Client:**
```json
{ "type": "QUESTIONS_UPDATE", "questions": [...] }
{ "type": "ERROR", "message": "..." }
```

## Design Patterns Demonstrated

- **Strategy Pattern** — `rankingStrategy.js`: pluggable question ranking (by votes, recency, combined)
- **Observer Pattern** — `qaHandler.js`: WebSocket broadcasts ranked updates to all clients in a lecture room

## Individual Contributions

| Member | Contribution |
|--------|-------------|
| Aayush | Q&A system (qaService, qaHandler, QuestionList, QuestionInput, InstructorQAView, rankingStrategy) |
| Team   | Video streaming (streamService, streamHandler, VideoPlayer, InstructorStream, useWebRTC) |
| Shared | Auth, lecture CRUD, DB schema, Docker setup |
