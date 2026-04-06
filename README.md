# CollabDoc — Real-Time Collaboration Platform

A real-time collaborative document editing platform built with **Operational Transformation (OT)**, enabling multiple users to edit the same document simultaneously with conflict-free merging. Think Google Docs, built from scratch.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Python 3.11+, FastAPI, WebSockets |
| OT Engine | Custom implementation (Insert/Delete/Transform) |
| Database | PostgreSQL (persistent storage) |
| Cache / Pub-Sub | Redis (active sessions, real-time broadcast) |
| Auth | JWT (python-jose + bcrypt) |
| ORM | SQLAlchemy (async) + Alembic (migrations) |
| Containerization | Docker + Docker Compose |

---

## Project Structure

```
collabdoc/
├── backend/
│   ├── ot_engine/          # Core OT algorithm (operation.py, transformer.py, document.py)
│   ├── db/                 # SQLAlchemy models + Alembic migrations
│   ├── services/           # Business logic (auth, document, permission, version)
│   ├── routers/            # FastAPI route handlers + WebSocket endpoint
│   ├── main.py             # FastAPI app entry point
│   ├── requirements.txt
│   └── .env.example        # Copy this to .env and fill in values
├── frontend/
│   ├── app/                # Next.js App Router pages
│   ├── components/         # React components (Editor, Presence, VersionHistory)
│   ├── lib/                # API client, OT client, WebSocket wrapper
│   ├── types/              # Shared TypeScript types
│   └── .env.local.example  # Copy this to .env.local and fill in values
├── docker-compose.yml      # PostgreSQL + Redis containers
└── README.md
```

---

## Prerequisites

Make sure you have these installed before starting:

- [Node.js](https://nodejs.org/) v18 or higher
- [Python](https://python.org/) 3.11 or higher
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (for PostgreSQL + Redis)
- [Git](https://git-scm.com/)

---

## Local Setup — Step by Step

### 1. Clone the repository

```bash
git clone https://github.com/shiavm006/Real-Time-Collaboration-Platform-System-Design-.git
cd Real-Time-Collaboration-Platform-System-Design-
```

### 2. Start the databases

Make sure Docker Desktop is running, then:

```bash
docker-compose up -d
```

This starts two containers:
- `collabdoc_postgres` on port `5432`
- `collabdoc_redis` on port `6379`

Verify they are running:

```bash
docker ps
```

Both containers should show status `Up`.

### 3. Set up the backend

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 4. Configure backend environment

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
DATABASE_URL=postgresql+asyncpg://collabdoc:collabdoc123@localhost:5432/collabdoc_db
REDIS_URL=redis://localhost:6379
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

Generate a secure `SECRET_KEY`:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 5. Run database migrations

```bash
# Still inside backend/ with venv active
alembic upgrade head
```

You should see all 6 tables created: `users`, `documents`, `document_permissions`, `operations`, `versions`, `sessions`.

Verify:

```bash
docker exec -it collabdoc_postgres psql -U collabdoc -d collabdoc_db -c "\dt"
```

### 6. Start the backend server

```bash
uvicorn main:app --reload --port 8000
```

Backend is now running at `http://localhost:8000`.

API docs available at `http://localhost:8000/docs`.

### 7. Set up the frontend

Open a new terminal tab:

```bash
cd frontend

# Install dependencies
npm install
```

### 8. Configure frontend environment

```bash
cp .env.local.example .env.local
```

Contents of `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 9. Start the frontend

```bash
npm run dev
```

Frontend is now running at `http://localhost:3000`.

---

## Running the Full Stack

You need three terminals running simultaneously:

| Terminal | Command | What it does |
|---|---|---|
| 1 | `docker-compose up -d` (from root) | Starts PostgreSQL + Redis |
| 2 | `cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000` | Starts FastAPI backend |
| 3 | `cd frontend && npm run dev` | Starts Next.js frontend |

Then open `http://localhost:3000` in your browser.

---

## Testing the API

Once the backend is running, open `http://localhost:8000/docs` for the interactive Swagger UI.

Quick test flow:

1. `POST /auth/register` — create an account
2. `POST /auth/login` — get a JWT token
3. Click **Authorize** in Swagger and paste the token
4. `POST /documents/` — create a document
5. Open `ws://localhost:8000/ws/{doc_id}?token={your_token}` — connect via WebSocket

---

## How It Works — Architecture Overview

```
Browser (Next.js)
    │
    ├── REST API (axios) ──────────► FastAPI Routers
    │                                    │
    └── WebSocket ────────────────► WebSocket Handler
                                         │
                                    OT Engine (transform ops)
                                         │
                               ┌─────────┴──────────┐
                          PostgreSQL              Redis
                     (users, docs, ops)    (active sessions,
                                            pub/sub broadcast)
```

**Operational Transformation flow:**

1. User A types a character → `InsertOperation` created locally
2. Operation sent to server via WebSocket with current revision
3. Server transforms the operation against any concurrent operations it hasn't seen
4. Transformed operation applied to server document state
5. Operation broadcast to all other connected clients
6. Each client applies the operation to their local state

---

## Key Design Decisions

**Why OT instead of last-write-wins?** OT preserves every user's intent even when edits happen simultaneously. Last-write-wins silently discards one user's work.

**Why Redis for active sessions?** WebSocket connections span multiple server workers. Redis pub/sub fans out operations to all connected clients regardless of which worker they're on.

**Why PostgreSQL for operations?** Every keystroke is stored as an `OperationLog` row, enabling full audit trails and version history reconstruction.

---

## Design Patterns Used

| Pattern | Where |
|---|---|
| Factory | `OperationFactory.create()` — creates Insert/Delete from raw dict |
| Observer | `ConnectionManager` — broadcasts ops to all document subscribers |
| Command | Each `Operation` is a command object with `apply()` and `to_dict()` |
| Strategy | `Transformer` — pluggable conflict resolution strategy |
| Singleton | `ConnectionManager` instance shared across the app |

---

## OOP Concepts

| Concept | Where |
|---|---|
| Abstraction | `Operation` abstract base class defines interface without implementation |
| Inheritance | `InsertOperation`, `DeleteOperation`, `NoOpOperation` extend `Operation` |
| Polymorphism | `op.apply(content)` works on any operation type without type checking |
| Encapsulation | `Document` class hides OT state — only exposes `apply_operation()` |

---

## SOLID Principles

| Principle | How |
|---|---|
| Single Responsibility | Each service has one job: `AuthService` only handles auth, `DocumentService` only handles CRUD |
| Open/Closed | Add a new operation type by extending `Operation` — no changes to `Transformer` |
| Liskov Substitution | Any `Operation` subclass can replace `Operation` without breaking `Document` |
| Interface Segregation | Thin service interfaces — routers only call what they need |
| Dependency Inversion | Services depend on abstract DB session, not concrete implementations |

---

## Common Issues

**`zsh: command not found: uvicorn`**
Virtual environment is not activated. Run `source venv/bin/activate` first.

**`ModuleNotFoundError: No module named 'ot_engine'`**
You are running Python from the wrong directory. Make sure you are inside `backend/` before running any Python commands.

**`docker: command not found`**
Docker Desktop is not running. Open it from your Applications folder and wait for it to fully start.

**`asyncpg build failed`**
Your Python version is too new for the pinned asyncpg. Run `pip install asyncpg --pre` to get the latest pre-release.

**WebSocket returns 403**
Your JWT token has expired. Login again via `POST /auth/login` to get a fresh token.

---

## Team

| Name | Role |
|---|---|
| Shivam Mittal | Full stack — OT engine, backend, frontend, system design |
| Divya Singh | Full stack — OT engine, backend, frontend, system design |

---

## License

MIT