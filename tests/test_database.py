"""
test_database.py
================
Unit tests for PostgreSQL / SQLAlchemy database layer, schema initialization, models, and seeding.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.main import app
from backend.app.database import Base, test_db_connection, get_db_url
from backend.app.models_db import (
    UserDB,
    WatershedDB,
    InterventionDB,
    FieldInspectionDB,
    AuditLogDB,
    PhotoDB,
)
from scripts.seed_db import seed_database


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def test_engine(tmp_path):
    db_file = tmp_path / "test_watershed.db"
    engine = create_engine(f"sqlite:///{db_file}")
    Base.metadata.create_all(bind=engine)
    return engine


@pytest.fixture
def test_session(test_engine):
    Session = sessionmaker(bind=test_engine)
    session = Session()
    yield session
    session.close()


def test_db_url_formatting():
    url = get_db_url()
    assert isinstance(url, str)


def test_db_connection_health(test_engine):
    res = test_db_connection(test_engine)
    assert res["status"] == "connected"
    assert res["test_query_result"] == 1


def test_user_db_model(test_session):
    user = UserDB(
        id="usr_001",
        username="admin_user",
        password_hash="hashed_pw",
        full_name="Admin User",
        email="admin@gov.in",
        role="admin",
    )
    test_session.add(user)
    test_session.commit()

    fetched = test_session.query(UserDB).filter_by(username="admin_user").first()
    assert fetched is not None
    assert fetched.full_name == "Admin User"
    assert fetched.to_dict()["role"] == "admin"


def test_watershed_db_model(test_session):
    ws = WatershedDB(
        id="ws_test",
        code="WS_TEST",
        name="Test Watershed",
        district="Ahmednagar",
        state="Maharashtra",
        area_ha=500.0,
    )
    test_session.add(ws)
    test_session.commit()

    fetched = test_session.query(WatershedDB).filter_by(id="ws_test").first()
    assert fetched is not None
    assert fetched.to_dict()["area_ha"] == 500.0


def test_seed_database_execution(test_engine):
    seed_database(test_engine)
    Session = sessionmaker(bind=test_engine)
    session = Session()

    ws_count = session.query(WatershedDB).count()
    int_count = session.query(InterventionDB).count()
    insp_count = session.query(FieldInspectionDB).count()
    audit_count = session.query(AuditLogDB).count()

    assert ws_count > 0
    assert int_count > 0
    assert insp_count > 0
    assert audit_count > 0
    session.close()


def test_db_health_api(client):
    response = client.get("/api/v1/health/db")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["status"] == "online"
    assert "database" in json_data
