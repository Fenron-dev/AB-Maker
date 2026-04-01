"""
Abstract base class for all TTS engines.
New engines: subclass TTSEngine, implement required methods,
then register the instance in engines/__init__.py.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class Voice:
    id: str
    name: str
    language: str = "English"
    description: str = ""


class TTSEngine(ABC):
    """
    Interface that every TTS engine must implement.

    engine_config dict keys used by engines (common subset):
        voice_mode      : "standard" | "instruction" | "clone"
        language        : "English" | "German" | …
        speaker         : voice id string
        instruction     : free-text style instruction (mode=instruction)
        clone_audio_path: path to reference audio file  (mode=clone)
        clone_transcript: optional transcript of the reference audio
        model_size      : "1.7b" | "0.6b" | … (engine-specific)
    """

    # ── identity ─────────────────────────────────────────────────

    @property
    @abstractmethod
    def id(self) -> str:
        """Short snake_case identifier, e.g. 'qwen3-tts'."""
        ...

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable name, e.g. 'Qwen3-TTS'."""
        ...

    @property
    @abstractmethod
    def description(self) -> str:
        """One-sentence description shown in the UI."""
        ...

    # ── capabilities ─────────────────────────────────────────────

    @property
    def is_available(self) -> bool:
        """Return False if required packages are not installed in the current venv."""
        return True

    @property
    def supports_cloning(self) -> bool:
        return False

    @property
    def supports_instruction(self) -> bool:
        return False

    def get_voices(self) -> list[Voice]:
        return []

    def get_languages(self) -> list[str]:
        return ["English"]

    def get_model_sizes(self) -> list[dict]:
        """Return list of {id, label, description} dicts, or empty list."""
        return []

    # ── lifecycle ────────────────────────────────────────────────

    @abstractmethod
    def load(self, config: dict, progress_cb=None) -> None:
        """
        Load model into memory. Called once before first generate().
        progress_cb(message: str) may be called with status strings during
        slow operations like model download or initial load.
        """
        ...

    @abstractmethod
    def generate(self, text: str, config: dict) -> tuple:
        """
        Synthesise text.

        Returns (audio_ndarray, sample_rate_int).
        audio_ndarray: 1-D float32 numpy array, values in [-1, 1].
        """
        ...

    def unload(self) -> None:
        """Release model from GPU/CPU memory. Override if needed."""
        pass

    # ── serialisation ────────────────────────────────────────────

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "is_available": self.is_available,
            "supports_cloning": self.supports_cloning,
            "supports_instruction": self.supports_instruction,
            "voices": [
                {"id": v.id, "name": v.name, "language": v.language, "description": v.description}
                for v in self.get_voices()
            ],
            "languages": self.get_languages(),
            "model_sizes": self.get_model_sizes(),
        }
