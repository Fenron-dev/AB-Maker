"""
Job manager: creates, tracks and persists conversion jobs.
WebSocket subscriptions allow real-time progress streaming.
"""

import asyncio
import json
import threading
import uuid
from datetime import datetime
from pathlib import Path
from typing import Callable, Optional

from fastapi import WebSocket

_JOBS_FILE = Path(__file__).parent.parent / "data" / "jobs.json"


class JobManager:
    def __init__(self) -> None:
        self._jobs: dict[str, dict] = {}
        self._subscribers: dict[str, list[WebSocket]] = {}
        self._cancel_flags: dict[str, bool] = {}
        self._lock = threading.Lock()
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._load()

    # ── persistence ──────────────────────────────────────────────

    def _load(self) -> None:
        if _JOBS_FILE.exists():
            try:
                data = json.loads(_JOBS_FILE.read_text(encoding="utf-8"))
                # Restore only finished jobs (library)
                self._jobs = {
                    jid: job
                    for jid, job in data.items()
                    if job.get("status") in ("complete", "error")
                }
            except Exception:
                pass

    def _save(self) -> None:
        _JOBS_FILE.parent.mkdir(parents=True, exist_ok=True)
        _JOBS_FILE.write_text(
            json.dumps(self._jobs, indent=2, default=str, ensure_ascii=False),
            encoding="utf-8",
        )

    # ── public API ───────────────────────────────────────────────

    def set_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    def create_job(self, data: dict) -> str:
        job_id = str(uuid.uuid4())
        job: dict = {
            "id": job_id,
            "status": "pending",
            "input_files": data.get("input_files", []),
            "engine": data.get("engine", "qwen3-tts"),
            "engine_config": data.get("engine_config", {}),
            "output_format": data.get("output_format", "m4b"),
            "progress": {"current": 0, "total": 0, "text": ""},
            "output_path": None,
            "file_size": None,
            "duration_seconds": None,
            "error": None,
            "log": [],
            "created_at": datetime.now().isoformat(),
            "started_at": None,
            "completed_at": None,
        }
        with self._lock:
            self._jobs[job_id] = job
            self._subscribers[job_id] = []
            self._cancel_flags[job_id] = False
        return job_id

    def get_job(self, job_id: str) -> Optional[dict]:
        return self._jobs.get(job_id)

    def list_jobs(self) -> list:
        return list(self._jobs.values())

    def get_completed_jobs(self) -> list:
        return [j for j in self._jobs.values() if j["status"] == "complete"]

    def cancel_job(self, job_id: str) -> None:
        with self._lock:
            self._cancel_flags[job_id] = True

    def delete_job(self, job_id: str) -> None:
        with self._lock:
            self._jobs.pop(job_id, None)
        self._save()

    def is_cancelled(self, job_id: str) -> bool:
        return self._cancel_flags.get(job_id, False)

    # ── WebSocket subscriptions ──────────────────────────────────

    async def subscribe(self, job_id: str, websocket: WebSocket) -> None:
        with self._lock:
            self._subscribers.setdefault(job_id, []).append(websocket)

        # Immediately push current state to the new subscriber
        job = self.get_job(job_id)
        if job:
            try:
                await websocket.send_json({"type": "state", "job": job})
            except Exception:
                pass

        # Keep the connection open until client disconnects
        try:
            while True:
                await websocket.receive_text()
        except Exception:
            pass
        finally:
            with self._lock:
                subs = self._subscribers.get(job_id, [])
                try:
                    subs.remove(websocket)
                except ValueError:
                    pass

    def _broadcast(self, job_id: str, message: dict) -> None:
        """Schedule broadcast on the async event loop from a background thread."""
        if self._loop and not self._loop.is_closed():
            asyncio.run_coroutine_threadsafe(
                self._async_broadcast(job_id, message), self._loop
            )

    async def _async_broadcast(self, job_id: str, message: dict) -> None:
        subs = list(self._subscribers.get(job_id, []))
        dead = []
        for ws in subs:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        with self._lock:
            for ws in dead:
                try:
                    self._subscribers[job_id].remove(ws)
                except (ValueError, KeyError):
                    pass

    # ── job execution ────────────────────────────────────────────

    def run_job(self, job_id: str) -> None:
        """Called in a background thread by app.py."""
        from .processor import run_conversion

        job = self._jobs.get(job_id)
        if not job:
            return

        job["status"] = "running"
        job["started_at"] = datetime.now().isoformat()
        self._broadcast(job_id, {"type": "status", "status": "running"})

        def progress_cb(current: int, total: int, text: str, log_line: Optional[str] = None) -> bool:
            """Return False to request cancellation."""
            job["progress"] = {"current": current, "total": total, "text": text}
            msg: dict = {"type": "progress", "current": current, "total": total, "text": text}
            if log_line:
                entry = {"time": datetime.now().strftime("%H:%M:%S"), "text": log_line}
                job["log"].append(entry)
                msg["log_entry"] = entry
            self._broadcast(job_id, msg)
            return not self._cancel_flags.get(job_id, False)

        try:
            result = run_conversion(job, progress_cb)

            if self._cancel_flags.get(job_id):
                job["status"] = "cancelled"
                self._broadcast(job_id, {"type": "cancelled"})
            else:
                job["status"] = "complete"
                job["output_path"] = str(result["path"])
                job["file_size"] = result.get("file_size")
                job["duration_seconds"] = result.get("duration_seconds")
                job["completed_at"] = datetime.now().isoformat()
                self._broadcast(
                    job_id,
                    {
                        "type": "complete",
                        "output_path": str(result["path"]),
                        "file_size": result.get("file_size"),
                        "duration_seconds": result.get("duration_seconds"),
                    },
                )
                self._save()

        except Exception as exc:
            job["status"] = "error"
            job["error"] = str(exc)
            self._broadcast(job_id, {"type": "error", "message": str(exc)})
            self._save()


job_manager = JobManager()
