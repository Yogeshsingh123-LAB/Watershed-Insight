"""
Vercel Serverless Function entry point for FastAPI backend.
"""
import os
import sys
import tempfile

# Set writable directory for matplotlib cache on serverless platforms
os.environ.setdefault("MPLCONFIGDIR", tempfile.gettempdir())

# Ensure repository root is on Python module path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.app.main import app
