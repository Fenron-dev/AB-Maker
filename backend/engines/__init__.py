"""
Engine registry.

To add a new TTS engine:
  1. Create backend/engines/my_engine.py subclassing TTSEngine.
  2. Import it here and append an instance to _ENGINES.
"""

from .base import TTSEngine, Voice
from .qwen3_tts import Qwen3TTSEngine
from .vibevoice_tts import VibeVoiceEngine

_ENGINES: list[TTSEngine] = [
    e for e in [Qwen3TTSEngine(), VibeVoiceEngine()] if e.is_available
]


def get_available_engines() -> list[TTSEngine]:
    return list(_ENGINES)


def get_engine(engine_id: str) -> TTSEngine:
    for e in _ENGINES:
        if e.id == engine_id:
            return e
    raise ValueError(f"Unknown engine ID: {engine_id!r}")
