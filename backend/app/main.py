from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

from app.db import run_migrations
from app.routers import (
    expenses,
    formula,
    groups,
    members,
    settlements,
    stats,
    transactions,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    run_migrations()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="splitjar", version="0.1.0", lifespan=lifespan)

    @app.middleware("http")
    async def frame_ancestors(request: Request, call_next):
        response: Response = await call_next(request)
        # Opt-in frame-ancestors. Default is to set no restriction so the app
        # embeds cleanly inside whatever reverse proxy / dashboard the user
        # has — same posture as similar self-hosted dashboards. Users who
        # want to lock embedding down to a specific origin can set the env.
        fa = os.environ.get("SPLITJAR_FRAME_ANCESTORS")
        if fa:
            response.headers["Content-Security-Policy"] = f"frame-ancestors {fa}"
        if "x-frame-options" in response.headers:
            del response.headers["x-frame-options"]
        return response

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    app.include_router(groups.router)
    app.include_router(members.router)
    app.include_router(expenses.router)
    app.include_router(stats.router)
    app.include_router(settlements.router)
    app.include_router(transactions.router)
    app.include_router(formula.router)

    static_dir = Path(os.environ.get("SPLITJAR_STATIC_DIR", "/app/static"))
    if static_dir.exists():
        index_file = static_dir / "index.html"

        app.mount(
            "/assets",
            StaticFiles(directory=static_dir / "assets"),
            name="assets",
        )

        @app.get("/{full_path:path}", include_in_schema=False)
        def spa(full_path: str):
            candidate = static_dir / full_path
            if full_path and candidate.is_file():
                return FileResponse(candidate)
            return FileResponse(index_file)

    return app


app = create_app()
