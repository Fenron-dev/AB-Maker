"""
Global configuration manager.
Reads/writes data/config.json, fills unset paths with OS-appropriate defaults.
"""

import json
from pathlib import Path
from typing import Any

_CONFIG_FILE = Path(__file__).parent.parent / "data" / "config.json"

_DEFAULTS: dict = {
    "output_dir": str(Path.home() / "Audiobooks"),
    "cache_dir": str(Path.home() / ".ab-maker" / "cache"),
    "model_dir": str(Path.home() / ".ab-maker" / "models"),
    "default_engine": "qwen3-tts",
    "default_output_format": "m4b",
    "default_language": "English",
    "default_speaker": "sohee",
    "default_model_size": "1.7b",
    "max_words_per_chunk": 150,
    "pause_between_chunks": 0.6,
    "ui_language": "auto",
}


class ConfigManager:
    def __init__(self) -> None:
        self._data: dict = {}
        self._load()

    # ── persistence ──────────────────────────────────────────────

    def _load(self) -> None:
        merged = {**_DEFAULTS}
        if _CONFIG_FILE.exists():
            try:
                saved = json.loads(_CONFIG_FILE.read_text(encoding="utf-8"))
                # Only override defaults where saved value is not empty
                for k, v in saved.items():
                    if v != "" and v is not None:
                        merged[k] = v
            except Exception:
                pass
        self._data = merged

    def save(self) -> None:
        _CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
        _CONFIG_FILE.write_text(
            json.dumps(self._data, indent=2, ensure_ascii=False), encoding="utf-8"
        )

    # ── public API ───────────────────────────────────────────────

    def get(self, key: str, default: Any = None) -> Any:
        return self._data.get(key, default)

    def get_all(self) -> dict:
        return dict(self._data)

    def update(self, patch: dict) -> None:
        self._data.update(patch)
        self.save()

    def reset(self) -> None:
        self._data = {**_DEFAULTS}
        self.save()


config_manager = ConfigManager()
