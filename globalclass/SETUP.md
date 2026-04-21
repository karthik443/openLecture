# GlobalClass — Quick Setup Guide

Step-by-step guide for new team members to get the project running from scratch.

---

## Prerequisites

- **Node.js v18+** — [Download](https://nodejs.org)
- **Docker Desktop** — [Download](https://www.docker.com/products/docker-desktop)
- **Git** — [Download](https://git-scm.com)

Verify installations:
```bash
node --version    # v18.x.x or higher
docker --version  # Docker version 2x.x.x
git --version
```

---

## Step 1 — Clone the Repository

```bash
git clone <your-repo-url>
cd globalclass
```

---

## Step 2 — Start PostgreSQL & Redis (Docker)

We use Docker to run the database and cache so you don't need to install them natively.

```bash
# Pull and start PostgreSQL
docker run -d \
  --name postgres-db \
  -e POSTGRES_USER=karthik \
  -e POSTGRES_PASSWORD=secret123 \
  -e POSTGRES_DB=lecture_app \
  -p 5432:5432 \
  postgres:15

# Pull and start Redis
docker run -d \
  --name redis-cache \
  -p 6379:6379 \
  redis:7
```

**Verify they're running:**
```bash
docker ps
```

You should see two containers (`postgres-db` and `redis-cache`) with status `Up`.

> **Tip:** If containers already exist from a previous run, start them with:
> ```bash
> docker start postgres-db redis-cache
> ```

---

## Step 3 — Backend Setup

```bash
cd backend
npm install
```

Create the `.env` file:
```bash
cp .env.example .env
```

Or create it manually with these values:
```env
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=lecture_app
DB_USER=karthik
DB_PASSWORD=secret123
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=supersecret12345
JWT_EXPIRES_IN=24h
```

Run the database migration (creates all tables):
```bash
npm run migrate
```

You should see: `Migration complete`

Start the backend:
```bash
npm run dev
```

You should see:
```
Q&A WebSocket initialized at /ws/qa
Streaming WebSocket initialized at /ws/stream
GlobalClass server running on port 4000
Redis connected
```

> **Leave this terminal running** and open a new one for the frontend.

---

## Step 4 — Frontend Setup

```bash
cd frontend
npm install
npm start
```

The app opens at **http://localhost:3000**

---

## Step 5 — Create Test Accounts

1. Go to **http://localhost:3000/register**
2. Register an **Instructor** account (select role = `instructor`)
3. Register a **Student** account (select role = `student`) — use a different browser or incognito

---

## Step 6 — Test Live Streaming

1. **Instructor:** Log in → Create Lecture → Click **"Go Live"** → Click **"Open Room"** → Click **"🎥 Start Streaming"** (allow camera)
2. **Student:** Log in (different browser) → Enroll in the lecture → Click **"Join Live"**
3. Student should see the instructor's live camera feed! 🎉

---

## Common Docker Commands

| Command | What it does |
|---------|-------------|
| `docker ps` | List running containers |
| `docker ps -a` | List all containers (including stopped) |
| `docker start postgres-db redis-cache` | Start existing containers |
| `docker stop postgres-db redis-cache` | Stop containers |
| `docker logs postgres-db` | View PostgreSQL logs |
| `docker logs redis-cache` | View Redis logs |
| `docker rm postgres-db` | Delete a container (must be stopped first) |

---

## Troubleshooting

**"Connection refused" on port 5432 or 6379:**
```bash
docker ps   # check if containers are running
docker start postgres-db redis-cache
```

**"Port already in use":**
```bash
# Find what's using the port
lsof -i :4000
kill -9 <PID>
```

**Migration fails:**
```bash
# Check PostgreSQL is accepting connections
docker logs postgres-db
# Wait a few seconds after starting the container, then retry
npm run migrate
```

**Docker permission denied:**
```bash
sudo usermod -aG docker $USER
# Log out and back in, then retry
```
