"""
Qwen3-TTS engine wrapper.
Supports standard preset voices, instruction mode, and voice cloning.
"""

from __future__ import annotations

import io
import sys
import warnings
from typing import Optional

import numpy as np

from .base import TTSEngine, Voice

_VOICES: list[Voice] = [
    Voice("serena",   "Serena",   "English",  "Warm, clear female voice"),
    Voice("vivian",   "Vivian",   "English",  "Bright, expressive female voice"),
    Voice("ryan",     "Ryan",     "English",  "Neutral male voice"),
    Voice("aiden",    "Aiden",    "English",  "Deep male voice"),
    Voice("dylan",    "Dylan",    "English",  "Young male voice"),
    Voice("eric",     "Eric",     "English",  "Authoritative male voice"),
    Voice("ono_anna", "Ono Anna", "Japanese", "Native Japanese female voice"),
    Voice("sohee",    "Sohee",    "Korean",   "Native Korean female voice"),
]

_LANGUAGES: list[str] = [
    "English", "German", "French", "Spanish", "Italian",
    "Portuguese", "Russian", "Japanese", "Korean", "Chinese",
]

_MODEL_SIZES: list[dict] = [
    {"id": "1.7b", "label": "1.7B (High Quality)", "description": "~4.5 GB – best results"},
    {"id": "0.6b", "label": "0.6B (Fast)",          "description": "~2.5 GB – faster, lighter"},
]


class Qwen3TTSEngine(TTSEngine):

    def __init__(self) -> None:
        self._model = None
        self._loaded_config: Optional[dict] = None

    # ── identity ─────────────────────────────────────────────────

    @property
    def id(self) -> str:
        return "qwen3-tts"

    @property
    def name(self) -> str:
        return "Qwen3-TTS"

    @property
    def description(self) -> str:
        return "High-quality multilingual TTS with voice cloning (Alibaba / HuggingFace)"

    # ── capabilities ─────────────────────────────────────────────

    @property
    def supports_cloning(self) -> bool:
        return True

    @property
    def supports_instruction(self) -> bool:
        return True

    def get_voices(self) -> list[Voice]:
        return _VOICES

    def get_languages(self) -> list[str]:
        return _LANGUAGES

    def get_model_sizes(self) -> list[dict]:
        return _MODEL_SIZES

    # ── lifecycle ────────────────────────────────────────────────

    def load(self, config: dict, progress_cb=None) -> None:
        """Load the appropriate Qwen3 model variant."""
        def _cb(msg: str) -> None:
            if progress_cb:
                progress_cb(msg)

        # Avoid reloading if config hasn't changed
        key = (config.get("voice_mode", "standard"), config.get("model_size", "1.7b"))
        if self._model is not None and self._loaded_config == key:
            return
        if self._model is not None:
            self.unload()

        # Suppress noisy internal warnings from qwen-tts
        old_stderr, sys.stderr = sys.stderr, io.StringIO()
        try:
            from qwen_tts import Qwen3TTSModel  # type: ignore
        finally:
            sys.stderr = old_stderr

        import torch  # type: ignore

        mode = config.get("voice_mode", "standard")
        size = "1.7B" if config.get("model_size", "1.7b") == "1.7b" else "0.6B"
        variant = "Base" if mode == "clone" else "CustomVoice"
        model_name = f"Qwen/Qwen3-TTS-12Hz-{size}-{variant}"

        # ── Resolve model files from local cache or HuggingFace ─────
        from huggingface_hub import snapshot_download  # type: ignore
        from backend.config import config_manager  # type: ignore

        model_dir = config_manager.get("model_dir") or None  # None = HF default cache

        try:
            # Fast path: model already in cache – no network needed
            local_path = snapshot_download(
                model_name,
                cache_dir=model_dir,
                local_files_only=True,
            )
            _cb(f"Model found – loading {model_name}…")
        except Exception:
            size_hint = "~4.5 GB" if size == "1.7B" else "~2.5 GB"
            _cb(f"Downloading {model_name} ({size_hint}) – first run only…")
            try:
                local_path = snapshot_download(model_name, cache_dir=model_dir)
                _cb("Download complete – loading model into memory…")
            except Exception:
                local_path = model_name
                _cb(f"Loading {model_name} (may download {size_hint})…")

        if torch.cuda.is_available():
            device = "cuda:0"
            dtype = torch.bfloat16
        else:
            device = "cpu"
            dtype = torch.float32

        warnings.filterwarnings("ignore", message=".*flash.attn.*")
        warnings.filterwarnings("ignore", message=".*TRANSFORMERS_CACHE.*")

        kwargs: dict = {"device_map": device, "dtype": dtype}
        try:
            import flash_attn  # type: ignore  # noqa: F401
            kwargs["attn_implementation"] = "flash_attention_2"
        except ImportError:
            pass

        _cb(f"Initialising model on {device}…")
        self._model = Qwen3TTSModel.from_pretrained(local_path, **kwargs)
        self._loaded_config = key

    def generate(self, text: str, config: dict) -> tuple[np.ndarray, int]:
        if self._model is None:
            raise RuntimeError("Qwen3-TTS model is not loaded. Call load() first.")

        mode = config.get("voice_mode", "standard")
        language = config.get("language", "English")
        speaker = config.get("speaker", "sohee")

        if mode == "clone":
            ref_audio = config.get("clone_audio_path", "")
            ref_text = config.get("clone_transcript", "").strip()
            if ref_text:
                wavs, sr = self._model.generate_voice_clone(
                    text=text,
                    language=language,
                    ref_audio=ref_audio,
                    ref_text=ref_text,
                )
            else:
                wavs, sr = self._model.generate_voice_clone(
                    text=text,
                    language=language,
                    ref_audio=ref_audio,
                    x_vector_only_mode=True,
                )
        elif mode == "instruction":
            instruction = config.get("instruction", "")
            wavs, sr = self._model.generate_custom_voice(
                text=text,
                language=language,
                speaker=speaker,
                instruct=instruction,
            )
        else:
            wavs, sr = self._model.generate_custom_voice(
                text=text,
                language=language,
                speaker=speaker,
            )

        return np.array(wavs[0], dtype=np.float32), int(sr)

    def unload(self) -> None:
        if self._model is not None:
            del self._model
            self._model = None
            self._loaded_config = None
            try:
                import torch  # type: ignore
                torch.cuda.empty_cache()
            except Exception:
                pass
