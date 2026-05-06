import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import auth, documents, websocket

load_dotenv()

# Comma-separated list of allowed origins; defaults to local dev + the deployed frontend.
_default_origins = (
    "http://localhost:3000,"
    "http://localhost:3001,"
    "http://127.0.0.1:3000,"
    "https://real-time-collaboration-platform-sy.vercel.app"
)
_origins_env = os.getenv("CORS_ORIGINS", _default_origins)
ALLOWED_ORIGINS = [o.strip() for o in _origins_env.split(",") if o.strip()]

app = FastAPI(title="CollabDoc API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(websocket.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
