"""
FastAPI application – REST API + WebSocket + static file serving.
"""

import asyncio
import json
import shutil
from pathlib import Path
from typing import List

from fastapi import (
    FastAPI,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import config_manager
from .engines import get_available_engines, get_engine
from .job_manager import job_manager

_FRONTEND = Path(__file__).parent.parent / "frontend"
_UPLOADS = Path(__file__).parent.parent / "data" / "uploads"


def create_app() -> FastAPI:
    app = FastAPI(title="AB-Maker", docs_url=None, redoc_url=None)

    # ── startup ──────────────────────────────────────────────────

    @app.on_event("startup")
    async def _startup() -> None:
        _UPLOADS.mkdir(parents=True, exist_ok=True)
        # Give job_manager a reference to the running event loop so it can
        # broadcast WebSocket messages from background threads.
        job_manager.set_loop(asyncio.get_running_loop())

    # ── static files ─────────────────────────────────────────────

    app.mount("/static", StaticFiles(directory=str(_FRONTEND)), name="static")

    @app.get("/")
    async def index() -> FileResponse:
        return FileResponse(_FRONTEND / "index.html")

    # ── locales ──────────────────────────────────────────────────

    @app.get("/api/locales/{lang}")
    async def get_locale(lang: str) -> JSONResponse:
        locale_dir = _FRONTEND / "locales"
        f = locale_dir / f"{lang}.json"
        if not f.exists():
            f = locale_dir / "en.json"
        return JSONResponse(json.loads(f.read_text(encoding="utf-8")))

    # ── config ───────────────────────────────────────────────────

    @app.get("/api/config")
    async def get_config() -> dict:
        return config_manager.get_all()

    @app.put("/api/config")
    async def update_config(data: dict) -> dict:
        config_manager.update(data)
        return {"ok": True}

    @app.post("/api/config/reset")
    async def reset_config() -> dict:
        config_manager.reset()
        return config_manager.get_all()

    # ── engines ──────────────────────────────────────────────────

    @app.get("/api/engines")
    async def list_engines() -> list:
        return [e.to_dict() for e in get_available_engines()]

    # ── file upload (browser / drag-and-drop fallback) ───────────

    @app.post("/api/upload")
    async def upload_files(files: List[UploadFile]) -> dict:
        saved = []
        for f in files:
            dest = _UPLOADS / f.filename
            # Avoid collision
            counter = 1
            stem, suffix = dest.stem, dest.suffix
            while dest.exists():
                dest = _UPLOADS / f"{stem}_{counter}{suffix}"
                counter += 1
            with dest.open("wb") as fp:
                shutil.copyfileobj(f.file, fp)
            saved.append(str(dest))
        return {"files": saved}

    # ── jobs ─────────────────────────────────────────────────────

    @app.post("/api/jobs")
    async def create_job(data: dict) -> dict:
        import threading

        job_id = job_manager.create_job(data)
        t = threading.Thread(
            target=job_manager.run_job, args=(job_id,), daemon=True
        )
        t.start()
        return {"job_id": job_id}

    @app.get("/api/jobs")
    async def list_jobs() -> list:
        return job_manager.list_jobs()

    @app.get("/api/jobs/{job_id}")
    async def get_job(job_id: str) -> dict:
        job = job_manager.get_job(job_id)
        if not job:
            raise HTTPException(404, "Job not found")
        return job

    @app.delete("/api/jobs/{job_id}")
    async def cancel_job(job_id: str) -> dict:
        job_manager.cancel_job(job_id)
        return {"ok": True}

    # ── library ──────────────────────────────────────────────────

    @app.get("/api/library")
    async def list_library() -> list:
        return job_manager.get_completed_jobs()

    @app.delete("/api/library/{job_id}")
    async def delete_from_library(job_id: str) -> dict:
        job_manager.delete_job(job_id)
        return {"ok": True}

    @app.post("/api/library/{job_id}/reveal")
    async def reveal_file(job_id: str) -> dict:
        import subprocess
        import sys as _sys

        job = job_manager.get_job(job_id)
        if not job or not job.get("output_path"):
            raise HTTPException(404, "Output file not found")
        path = Path(job["output_path"])
        try:
            if _sys.platform == "win32":
                subprocess.run(["explorer", "/select,", str(path)])
            elif _sys.platform == "darwin":
                subprocess.run(["open", "-R", str(path)])
            else:
                subprocess.run(["xdg-open", str(path.parent)])
        except Exception:
            pass
        return {"ok": True}

    # ── WebSocket progress ────────────────────────────────────────

    @app.websocket("/ws/progress/{job_id}")
    async def progress_ws(websocket: WebSocket, job_id: str) -> None:
        await websocket.accept()
        await job_manager.subscribe(job_id, websocket)

    return app
