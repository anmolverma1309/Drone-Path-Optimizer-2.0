"""Vercel FastAPI entrypoint.

Exposes `app` at repository root so Vercel's Python runtime can detect it.
"""

from __future__ import annotations

import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "backend"

# Ensure backend modules like `core` and `api.test_endpoints` are importable.
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from main import app  # type: ignore  # noqa: E402,F401
