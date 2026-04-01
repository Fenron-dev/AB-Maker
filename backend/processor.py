"""
Conversion pipeline: read text → split chunks → TTS → combine audio.
"""

import hashlib
import re
import threading
from pathlib import Path
from typing import Callable, Optional

from .audiobook import combine_audio
from .config import config_manager
from .engines import get_engine
from .readers import read_file


def _hash(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()[:10]


def _split_chunks(text: str, max_words: int) -> list[str]:
    """Split text into chunks of ≤ max_words at sentence boundaries."""
    sentences = re.split(r"(?<=[.!?…])\s+", text)
    sentences = [s.strip() for s in sentences if s.strip()]

    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        candidate = (current + " " + sentence).strip()
        if len(candidate.split()) <= max_words:
            current = candidate
        else:
            if current:
                chunks.append(current)
            # Sentence itself too long? Split at commas.
            if len(sentence.split()) > max_words:
                parts = re.split(r"(?<=,)\s+", sentence)
                sub = ""
                for part in parts:
                    probe = (sub + " " + part).strip()
                    if len(probe.split()) <= max_words:
                        sub = probe
                    else:
                        if sub:
                            chunks.append(sub)
                        sub = part
                if sub:
                    current = sub
                else:
                    current = ""
            else:
                current = sentence
    if current:
        chunks.append(current)
    return chunks


def run_conversion(job: dict, progress_cb: Callable) -> dict:
    """
    Execute a full conversion job.

    progress_cb(current, total, text, log_line=None) → bool
        Return False to abort.
    """
    import soundfile as sf

    cfg: dict = job.get("engine_config", {})
    input_files: list[str] = job.get("input_files", [])
    output_fmt: str = job.get("output_format", "m4b")
    engine_id: str = job.get("engine", "qwen3-tts")
    job_id: str = job.get("id", "unknown")

    output_dir = Path(config_manager.get("output_dir"))
    cache_dir = Path(config_manager.get("cache_dir"))
    max_words = int(config_manager.get("max_words_per_chunk", 150))
    pause = float(config_manager.get("pause_between_chunks", 0.6))

    output_dir.mkdir(parents=True, exist_ok=True)

    # Load TTS engine – with heartbeat so the UI doesn't freeze during download
    if not progress_cb(0, 0, "Loading TTS engine...", f"Loading: {engine_id}"):
        raise RuntimeError("Cancelled")

    engine = get_engine(engine_id)

    # Heartbeat thread: sends periodic status while engine.load() blocks
    _load_status = ["Loading TTS engine..."]
    _load_done = threading.Event()

    def _heartbeat():
        import time
        while not _load_done.wait(3.0):
            progress_cb(0, 0, _load_status[0], None)

    hb = threading.Thread(target=_heartbeat, daemon=True)
    hb.start()

    def _load_progress(msg: str) -> None:
        _load_status[0] = msg
        progress_cb(0, 0, msg, msg)

    try:
        engine.load(cfg, progress_cb=_load_progress)
    finally:
        _load_done.set()

    all_chunk_files: list[Path] = []

    for file_path in input_files:
        fp = Path(file_path)
        if not fp.exists():
            progress_cb(0, 0, f"Skipping missing file: {fp.name}", f"WARN: not found: {fp}")
            continue

        progress_cb(0, 0, f"Reading {fp.name}…", f"Reading: {fp.name}")
        text = read_file(fp)
        chunks = _split_chunks(text, max_words)

        if not progress_cb(0, len(chunks), f"Split into {len(chunks)} chunks", f"{fp.name}: {len(chunks)} chunks"):
            raise RuntimeError("Cancelled")

        # Per-book, per-config cache directory
        config_hash = _hash(str(sorted(cfg.items())) + engine_id)
        book_cache = cache_dir / fp.stem / config_hash
        book_cache.mkdir(parents=True, exist_ok=True)

        for i, chunk in enumerate(chunks):
            chunk_hash = _hash(chunk + config_hash)
            cache_file = book_cache / f"{i:06d}_{chunk_hash}.wav"
            preview = (chunk[:60] + "…") if len(chunk) > 60 else chunk

            if not progress_cb(i, len(chunks), preview):
                raise RuntimeError("Cancelled")

            if cache_file.exists():
                all_chunk_files.append(cache_file)
                continue

            try:
                audio, sr = engine.generate(chunk, cfg)
                sf.write(str(cache_file), audio, sr)
                all_chunk_files.append(cache_file)
            except Exception as exc:
                msg = f"Chunk {i + 1} error: {exc}"
                progress_cb(i, len(chunks), msg, f"ERROR: {msg}")

    if not all_chunk_files:
        raise RuntimeError("No audio was generated. Check TTS engine logs.")

    progress_cb(
        len(all_chunk_files), len(all_chunk_files),
        "Combining audio segments…", "Combining audio…"
    )

    book_title = Path(input_files[0]).stem if input_files else "audiobook"
    output_base = output_dir / book_title

    result = combine_audio(all_chunk_files, output_base, book_title, output_fmt, pause)

    progress_cb(
        len(all_chunk_files), len(all_chunk_files),
        "Done!",
        f"Saved: {result['path']}"
    )
    return result
