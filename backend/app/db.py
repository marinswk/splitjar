from __future__ import annotations

import os
from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlmodel import Session, SQLModel, create_engine


def _db_url() -> str:
    url = os.environ.get("SPLITJAR_DB_URL")
    if url:
        return url
    data_dir = Path(os.environ.get("SPLITJAR_DATA_DIR", "/data"))
    data_dir.mkdir(parents=True, exist_ok=True)
    return f"sqlite:///{data_dir / 'splitjar.db'}"


engine = create_engine(
    _db_url(),
    echo=False,
    connect_args={"check_same_thread": False},
)


@event.listens_for(Engine, "connect")
def _sqlite_pragmas(dbapi_conn, _):  # noqa: ANN001
    cur = dbapi_conn.cursor()
    cur.execute("PRAGMA journal_mode=WAL")
    cur.execute("PRAGMA foreign_keys=ON")
    cur.close()


def run_migrations() -> None:
    """Run Alembic migrations up to head against the configured DB URL."""
    from alembic import command
    from alembic.config import Config

    backend_root = Path(__file__).resolve().parent.parent
    cfg = Config(str(backend_root / "alembic.ini"))
    cfg.set_main_option("script_location", str(backend_root / "app" / "alembic"))
    cfg.set_main_option("sqlalchemy.url", _db_url())
    command.upgrade(cfg, "head")


def get_session() -> Iterator[Session]:
    with Session(engine) as session:
        yield session
