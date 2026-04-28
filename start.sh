#!/bin/bash
set -e

echo "===================================================="
echo "CollabDoc - Real-Time Collaboration Platform Startup"
echo "===================================================="

# 1. Boot up Infrastructure (PostgreSQL & Redis)
echo "[1/4] Booting Infrastructure (Docker Compose)..."
docker-compose up -d
echo "Waiting for PostgreSQL to be ready..."
sleep 5

# 2. Setup Backend
echo "[2/4] Setting up FastAPI Backend..."
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt
if [ ! -f ".env" ]; then
    cp .env.example .env
fi
echo "Running database migrations..."
alembic upgrade head

# 3. Boot Backend in background
echo "[3/4] Starting FastAPI Server (Port 8000)..."
uvicorn main:app --reload --port 8000 > backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 4. Setup and Boot Frontend
echo "[4/4] Setting up Next.js Frontend..."
cd frontend
npm install
if [ ! -f ".env.local" ]; then
    cp .env.local.example .env.local
fi
echo "Starting Next.js Server (Port 3000)..."
npm run dev &
FRONTEND_PID=$!
cd ..

echo "===================================================="
echo "✅ Everything is running!"
echo "👉 Frontend: http://localhost:3000"
echo "👉 Backend API Docs: http://localhost:8000/docs"
echo "===================================================="
echo "Press Ctrl+C to stop all servers."

# Wait for user interrupt
trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID; docker-compose stop; exit" INT TERM
wait
