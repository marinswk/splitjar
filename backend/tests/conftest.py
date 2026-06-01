from __future__ import annotations

import os
import tempfile
from pathlib import Path

import pytest


@pytest.fixture()
def app_client(monkeypatch):
    tmp = tempfile.TemporaryDirectory()
    monkeypatch.setenv("SPLITJAR_DATA_DIR", tmp.name)
    monkeypatch.setenv("SPLITJAR_DB_URL", f"sqlite:///{Path(tmp.name) / 'test.db'}")

    import importlib

    import app.db as db_mod

    importlib.reload(db_mod)
    import app.models  # noqa: F401  ensure models registered

    db_mod.init_db()

    from fastapi.testclient import TestClient

    import app.main as main_mod

    importlib.reload(main_mod)
    client = TestClient(main_mod.app)
    yield client
    tmp.cleanup()
