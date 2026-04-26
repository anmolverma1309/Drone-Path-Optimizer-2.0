"""Vercel FastAPI entrypoint.

Exposes `app` at repository root with /api prefix for Vercel routing.
Frontend is served from dist/ at /, while backend API is at /api/*.
"""

from __future__ import annotations

import sys
from pathlib import Path
from fastapi import FastAPI
 

ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "backend"


if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from main import app as backend_app  # type: ignore  # noqa: E402,F401

# Create new FastAPI app that mounts backend at /api prefix
app = FastAPI(title="Drone Path Optimizer")


app.mount("/api", backend_app)
