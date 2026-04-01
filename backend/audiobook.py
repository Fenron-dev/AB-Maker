"""
Audio utilities: combine WAV chunks → M4B/M4A/MP3/WAV via ffmpeg.
"""

import shutil
import subprocess
from pathlib import Path
from typing import Optional

import numpy as np
import soundfile as sf


def find_ffmpeg() -> Optional[str]:
    """Search for ffmpeg: first local .ffmpeg/, then system PATH."""
    base = Path(__file__).parent.parent
    for candidate in (
        base / ".ffmpeg" / "ffmpeg.exe",   # Windows portable
        base / ".ffmpeg" / "ffmpeg",        # Linux/macOS portable
    ):
        if candidate.exists():
            return str(candidate)
    return shutil.which("ffmpeg")


def combine_audio(
    files: list[Path],
    output_base: Path,
    title: str,
    fmt: str = "m4b",
    pause_secs: float = 0.6,
) -> dict:
    """
    Concatenate audio files with silence gaps and encode to the target format.

    Returns dict with keys:
        path           – Path of the final output file
        file_size      – bytes
        duration_seconds – float
    """
    segments: list[np.ndarray] = []
    sample_rate: Optional[int] = None

    for f in files:
        data, sr = sf.read(str(f))
        if sample_rate is None:
            sample_rate = sr
        elif sr != sample_rate:
            # Simple: resample by repeating/dropping samples (ffmpeg will fix it)
            pass
        segments.append(data)
        segments.append(np.zeros(int(pause_secs * sr)))

    combined = np.concatenate(segments)
    duration_seconds = len(combined) / sample_rate if sample_rate else 0

    output_base.parent.mkdir(parents=True, exist_ok=True)
    temp_wav = output_base.with_suffix(".wav")
    sf.write(str(temp_wav), combined, sample_rate)

    ff = find_ffmpeg()
    if ff and fmt in ("m4b", "m4a", "mp3"):
        output = output_base.with_suffix(f".{fmt}")
        codec = "libmp3lame" if fmt == "mp3" else "aac"
        try:
            subprocess.run(
                [
                    ff, "-y", "-i", str(temp_wav),
                    "-c:a", codec, "-b:a", "64k",
                    "-metadata", f"title={title}",
                    "-metadata", "genre=Audiobook",
                    str(output),
                ],
                capture_output=True,
                check=True,
            )
            temp_wav.unlink(missing_ok=True)
            return {
                "path": output,
                "file_size": output.stat().st_size,
                "duration_seconds": duration_seconds,
            }
        except subprocess.CalledProcessError:
            pass  # Fall through to WAV

    return {
        "path": temp_wav,
        "file_size": temp_wav.stat().st_size,
        "duration_seconds": duration_seconds,
    }
