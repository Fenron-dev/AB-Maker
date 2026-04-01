# AB-Maker – The Sonic Architect

Convert books (TXT, EPUB, PDF) into audiobooks using local AI text-to-speech.  
No cloud. No API key. Runs fully offline after the first model download.

![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20Windows-blue)
![Python](https://img.shields.io/badge/python-3.10%2B-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

- **Local TTS** — Powered by [Qwen3-TTS](https://github.com/QwenLM/Qwen-TTS), runs on CPU or NVIDIA GPU
- **Multiple voices** — Standard speakers or voice cloning
- **Book formats** — TXT, EPUB, PDF
- **Output formats** — M4B (chapters), MP3, WAV
- **Desktop app** — Native window via pywebview + FastAPI backend
- **Multilingual UI** — Auto-detects system language (DE/EN + more)

## Requirements

- Python 3.10 or newer
- ffmpeg (for M4B export)
- ~400 MB disk for Python packages
- ~1–5 GB disk for the AI model (downloaded on first run)
- NVIDIA GPU optional — CPU works too

## Installation

### Linux / macOS

```bash
git clone https://github.com/Fenron-dev/AB-Maker.git
cd AB-Maker
bash setup.sh
```

### Windows

```
git clone https://github.com/Fenron-dev/AB-Maker.git
cd AB-Maker
setup_windows.bat
```

## Starting the app

**Linux / macOS:**
```bash
bash start.sh
```

**Windows:**
```
start_windows.bat
```

Or double-click the `AB-Maker starten.desktop` shortcut created by `setup.sh` on Linux.

## Building a standalone executable

**Linux:**
```bash
bash build.sh
# Output: dist/AB-Maker/
```

**Windows:**
```
build_windows.bat
# Output: dist\AB-Maker\
```

Pre-built binaries are also available on the [Releases](../../releases) page.

## Configuration

On first launch the app creates `data/config.json` with defaults.  
All settings (model path, output folder, voice, language, …) can be changed in the Settings view inside the app.

## Project structure

```
AB-Maker/
├── main.py                 # Entry point (FastAPI + pywebview)
├── backend/
│   ├── app.py              # FastAPI routes
│   ├── config.py           # Config manager
│   ├── processor.py        # TTS pipeline
│   ├── audiobook.py        # M4B/MP3 assembly
│   ├── job_manager.py      # Async job queue
│   ├── engines/            # TTS engine adapters
│   └── readers/            # EPUB / PDF / TXT parsers
├── frontend/               # HTML/JS/CSS (pywebview)
├── data/                   # Runtime data (gitignored except .gitkeep)
├── setup.sh / setup_windows.bat
├── start.sh / start_windows.bat
└── build.sh / build_windows.bat
```

## License

MIT
