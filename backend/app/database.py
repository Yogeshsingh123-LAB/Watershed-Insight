"""
database.py
===========
SQLAlchemy database setup and engine management for Watershed Insight.
Supports PostgreSQL (PostGIS optional) and SQLite fallback.
"""

from __future__ import annotations

import os
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from .config import settings

Base = declarative_base()


def get_db_url() -> str:
    url = settings.database_url
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


def create_db_engine(url: str | None = None):
    target_url = url or get_db_url()
    connect_args = {}
    if target_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
        engine = create_engine(target_url, connect_args=connect_args, pool_pre_ping=True)
    else:
        # PostgreSQL
        engine = create_engine(
            target_url,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
            pool_recycle=3600
        )
    return engine


engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db(target_engine=None) -> bool:
    """Create all database tables if they do not exist."""
    eng = target_engine or engine
    try:
        from . import models_db  # noqa: F401
        Base.metadata.create_all(bind=eng)
        return True
    except Exception as e:
        print(f"[ERROR] Database initialization failed: {e}")
        return False


def test_db_connection(target_engine=None) -> dict:
    """Test connection to the configured PostgreSQL / SQLite database."""
    eng = target_engine or engine
    try:
        with eng.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            val = result.scalar()
            db_type = "postgresql" if "postgres" in str(eng.url) else "sqlite"
            return {
                "status": "connected",
                "database_type": db_type,
                "url": str(eng.url).split("@")[-1] if "@" in str(eng.url) else str(eng.url),
                "test_query_result": val
            }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }
