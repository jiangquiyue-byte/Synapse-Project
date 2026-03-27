"""Vercel Serverless Function entry point for FastAPI."""
import sys
import os

# Add the backend directory to Python path so app module is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.main import app

# Vercel expects the ASGI app to be named `app`
# This file re-exports the FastAPI app instance
