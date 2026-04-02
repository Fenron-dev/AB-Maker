"""
VibeVoice-Realtime-0.5B engine wrapper.
Real-time streaming TTS by Microsoft — English only, ~1.5 GB model.

Install dependency:
  pip install "vibevoice[streamingtts] @ git+https://github.com/microsoft/VibeVoice.git"
"""

from __future__ import annotations

import copy
import urllib.request
from pathlib import Path
from typing import Optional

import numpy as np

from .base import TTSEngine, Voice

_MODEL_ID = "microsoft/VibeVoice-Realtime-0.5B"
_SAMPLE_RATE = 24_000

_VOICES: list[Voice] = [
    Voice("en-Carter_man",   "Carter",   "English", "Clear male voice"),
    Voice("en-Davis_man",    "Davis",    "English", "Neutral male voice"),
    Voice("en-Frank_man",    "Frank",    "English", "Deep male voice"),
    Voice("en-Mike_man",     "Mike",     "English", "Warm male voice"),
    Voice("en-Emma_woman",   "Emma",     "English", "Clear female voice"),
    Voice("en-Grace_woman",  "Grace",    "English", "Warm female voice"),
    Voice("de-Spk0_man",     "DE Male",  "German",  "German male voice"),
    Voice("de-Spk1_woman",   "DE Female","German",  "German female voice"),
]

_BASE_URL = "https://github.com/microsoft/VibeVoice/raw/main/demo/voices/streaming_model"

# Filename = voice id + ".pt"
def _voice_url(voice_id: str) -> str:
    return f"{_BASE_URL}/{voice_id}.pt"


def _move_to_device(obj, device):
    """Recursively move tensors to device, preserving all object types."""
    import torch
    if isinstance(obj, torch.Tensor):
        return obj.to(device)
    if isinstance(obj, dict):
        return {k: _move_to_device(v, device) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        moved = [_move_to_device(v, device) for v in obj]
        return type(obj)(moved)
    # ModelOutput and other dataclass-like objects: move attributes in-place
    if hasattr(obj, "__dict__"):
        for k, v in obj.__dict__.items():
            setattr(obj, k, _move_to_device(v, device))
        return obj
    return obj


class VibeVoiceEngine(TTSEngine):

    def __init__(self) -> None:
        self._processor = None
        self._model = None
        self._device: Optional[str] = None
        # Voice presets cached on CPU to save GPU memory between calls
        self._voice_cache: dict[str, object] = {}
        self._loaded = False

    # ── identity ─────────────────────────────────────────────────

    @property
    def id(self) -> str:
        return "vibevoice"

    @property
    def name(self) -> str:
        return "VibeVoice-Realtime"

    @property
    def description(self) -> str:
        return "Real-time streaming TTS by Microsoft (0.5B · English · low latency)"

    # ── capabilities ─────────────────────────────────────────────

    @property
    def is_available(self) -> bool:
        try:
            import vibevoice  # noqa: F401
            return True
        except ImportError:
            return False

    @property
    def supports_cloning(self) -> bool:
        return False

    @property
    def supports_instruction(self) -> bool:
        return False

    def get_voices(self) -> list[Voice]:
        return _VOICES

    def get_languages(self) -> list[str]:
        return ["English"]

    def get_model_sizes(self) -> list[dict]:
        return [
            {
                "id": "0.5b",
                "label": "0.5B (Realtime)",
                "description": "~1.5 GB – streaming, ~200 ms first-chunk latency",
            }
        ]

    # ── lifecycle ────────────────────────────────────────────────

    def load(self, config: dict, progress_cb=None) -> None:
        def _cb(msg: str) -> None:
            if progress_cb:
                progress_cb(msg)

        if self._loaded:
            return

        try:
            import torch
            from vibevoice.processor.vibevoice_streaming_processor import (
                VibeVoiceStreamingProcessor,
            )
            from vibevoice.modular.modeling_vibevoice_streaming_inference import (
                VibeVoiceStreamingForConditionalGenerationInference,
            )
        except ImportError as exc:
            raise RuntimeError(
                "VibeVoice is not installed.\n"
                "Run: pip install "
                '"vibevoice[streamingtts] @ git+https://github.com/microsoft/VibeVoice.git"'
            ) from exc

        from huggingface_hub import snapshot_download
        from backend.config import config_manager

        model_dir = config_manager.get("model_dir") or None

        # Resolve local model path (download once if absent)
        try:
            local_path = snapshot_download(
                _MODEL_ID, cache_dir=model_dir, local_files_only=True
            )
            _cb(f"Model found – loading {_MODEL_ID}…")
        except Exception:
            _cb(f"Downloading {_MODEL_ID} (~1.5 GB) – first run only…")
            try:
                local_path = snapshot_download(_MODEL_ID, cache_dir=model_dir)
                _cb("Download complete – loading model into memory…")
            except Exception:
                local_path = _MODEL_ID
                _cb(f"Loading {_MODEL_ID} (may download ~1.5 GB)…")

        device = "cuda" if torch.cuda.is_available() else "cpu"
        load_dtype = torch.bfloat16 if device == "cuda" else torch.float32

        # Prefer flash_attention_2 on CUDA if available, else sdpa
        attn_impl = "sdpa"
        if device == "cuda":
            try:
                import flash_attn  # noqa: F401
                attn_impl = "flash_attention_2"
            except ImportError:
                pass

        import warnings

        _cb("Loading processor…")
        self._processor = VibeVoiceStreamingProcessor.from_pretrained(local_path)

        _cb(f"Initialising model on {device}…")
        with warnings.catch_warnings():
            warnings.filterwarnings("ignore", message=".*not initialized from the model checkpoint.*")
            warnings.filterwarnings("ignore", message=".*should probably be trained.*")
            self._model = VibeVoiceStreamingForConditionalGenerationInference.from_pretrained(
                local_path,
                torch_dtype=load_dtype,
                device_map=device,
                attn_implementation=attn_impl,
            )
        _cb("Note: some encoder weights (stage 6) are not in the checkpoint – audio quality may vary.")
        self._model.eval()
        self._model.set_ddpm_inference_steps(num_steps=5)
        self._device = device
        self._loaded = True
        _cb("VibeVoice-Realtime ready.")

    def unload(self) -> None:
        if self._model is not None:
            del self._model
            self._model = None
        if self._processor is not None:
            del self._processor
            self._processor = None
        self._voice_cache.clear()
        self._loaded = False
        self._device = None
        try:
            import torch
            torch.cuda.empty_cache()
        except Exception:
            pass

    # ── generation ───────────────────────────────────────────────

    def generate(self, text: str, config: dict) -> tuple[np.ndarray, int]:
        if not self._loaded or self._model is None:
            raise RuntimeError("VibeVoice model is not loaded. Call load() first.")

        import torch

        speaker = config.get("speaker", "en-Carter_man")
        # Fall back to first available voice if the stored speaker ID is from another engine
        valid_ids = {v.id for v in _VOICES}
        if speaker not in valid_ids:
            speaker = _VOICES[0].id
        voice_cpu = self._get_voice(speaker)

        # Deep-copy + move to device — generate() mutates the KV cache
        voice_on_device = _move_to_device(copy.deepcopy(voice_cpu), self._device)

        inputs = self._processor.process_input_with_cached_prompt(
            text=text,
            cached_prompt=voice_on_device,
            padding=True,
            return_tensors="pt",
            return_attention_mask=True,
        )
        for key in inputs:
            if torch.is_tensor(inputs[key]):
                inputs[key] = inputs[key].to(self._device)

        # Pull the TTS-specific keys out of inputs before splatting,
        # so they are not passed twice as keyword arguments.
        tts_lm_input_ids      = inputs.pop("tts_lm_input_ids")
        tts_lm_attention_mask = inputs.pop("tts_lm_attention_mask")
        tts_text_ids          = inputs.pop("tts_text_ids")

        outputs = self._model.generate(
            **inputs,
            tts_lm_input_ids=tts_lm_input_ids,
            tts_lm_attention_mask=tts_lm_attention_mask,
            tts_text_ids=tts_text_ids,
            all_prefilled_outputs=_move_to_device(copy.deepcopy(voice_cpu), self._device),
            cfg_scale=1.5,
            tokenizer=self._processor.tokenizer,
        )

        audio_np = outputs.speech_outputs[0].cpu().float().numpy()
        return audio_np, _SAMPLE_RATE

    # ── voice preset management ──────────────────────────────────

    def _get_voice(self, speaker: str) -> object:
        """Return the voice KV-cache tensor dict for *speaker*, cached on CPU."""
        if speaker in self._voice_cache:
            return self._voice_cache[speaker]

        import torch
        from backend.config import config_manager

        cache_root = Path(
            config_manager.get("model_dir")
            or Path.home() / ".cache" / "huggingface" / "hub"
        )
        voice_dir = cache_root / "vibevoice_voices"

        # Check if already downloaded
        local_pt = voice_dir / f"{speaker}.pt"
        if not local_pt.exists():
            url = _voice_url(speaker)
            voice_dir.mkdir(parents=True, exist_ok=True)
            urllib.request.urlretrieve(url, str(local_pt))

        data = torch.load(str(local_pt), map_location="cpu", weights_only=False)
        self._voice_cache[speaker] = data
        return data
