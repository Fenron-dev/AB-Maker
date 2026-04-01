"""
Engine registry.

To add a new TTS engine:
  1. Create backend/engines/my_engine.py subclassing TTSEngine.
  2. Import it here and append an instance to _ENGINES.
"""

from .base import TTSEngine, Voice
from .qwen3_tts import Qwen3TTSEngine

_ENGINES: list[TTSEngine] = [
    Qwen3TTSEngine(),
    # Future engines go here, e.g. VibeVoiceEngine()
]


def get_available_engines() -> list[TTSEngine]:
    return list(_ENGINES)


def get_engine(engine_id: str) -> TTSEngine:
    for e in _ENGINES:
        if e.id == engine_id:
            return e
    raise ValueError(f"Unknown engine ID: {engine_id!r}")
