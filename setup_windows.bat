@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

echo ╔══════════════════════════════════════════════════════════╗
echo ║       AB-Maker  –  Einrichtung (Windows)                ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo   Projektordner: %~dp0
echo.
echo   Was wird installiert:
echo     .venv\            – Qwen3-TTS  (~400 MB + ~4,5 GB Modell)
echo     .venv-vibevoice\  – VibeVoice-Realtime (~400 MB + ~1,5 GB Modell)
echo.
echo ══════════════════════════════════════════════════════════
set /p ANT=  Einrichtung starten? [j/N]
if /i not "%ANT%"=="j" if /i not "%ANT%"=="y" (
    echo   Abgebrochen.
    timeout /t 2 > nul
    exit /b 0
)
echo.

:: ── Python suchen ──────────────────────────────────────────
set PYTHON_CMD=
for %%P in (python3.12.exe python3.11.exe python3.10.exe python.exe python3.exe) do (
    where %%P >nul 2>&1
    if !errorlevel! == 0 (
        for /f "tokens=*" %%V in ('%%P -c "import sys; print(sys.version_info >= (3,10))" 2^>nul') do (
            if "%%V"=="True" (
                set PYTHON_CMD=%%P
                goto :found_python
            )
        )
    )
)

echo   FEHLER: Python 3.10+ nicht gefunden.
echo   Bitte installieren: https://www.python.org/downloads/
echo   Wichtig: "Add Python to PATH" aktivieren!
pause
exit /b 1

:found_python
for /f "tokens=*" %%V in ('%PYTHON_CMD% --version 2^>&1') do set PY_VERSION=%%V
echo   OK: %PY_VERSION% gefunden.
echo.

:: ── GPU erkennen ────────────────────────────────────────────
set TORCH_INDEX=https://download.pytorch.org/whl/cpu
set GPU_INFO=CPU-Modus
nvidia-smi >nul 2>&1
if %errorlevel% == 0 (
    set TORCH_INDEX=https://download.pytorch.org/whl/cu121
    set GPU_INFO=NVIDIA GPU erkannt
)
echo   Hardware: %GPU_INFO%
echo.

:: ╔══════════════════════════════════════════════════════════╗
:: ║  Venv 1: Qwen3-TTS  (.venv)                             ║
:: ╚══════════════════════════════════════════════════════════╝
echo ══════════════════════════════════════════════════════════
echo   [1/2] Qwen3-TTS Venv  ^>  .venv\
echo ══════════════════════════════════════════════════════════

if exist "%~dp0.venv\Scripts\python.exe" (
    echo   Virtuelle Umgebung existiert bereits.
) else (
    echo   Erstelle virtuelle Umgebung...
    %PYTHON_CMD% -m venv "%~dp0.venv"
    echo   OK: Erstellt.
)

set PIP=%~dp0.venv\Scripts\pip.exe
"%PIP%" install --upgrade pip setuptools wheel --quiet
"%PIP%" install torch torchaudio --index-url %TORCH_INDEX% --quiet
"%PIP%" install fastapi "uvicorn[standard]" python-multipart pywebview PyQt6 PyQt6-WebEngine qtpy soundfile numpy ebooklib beautifulsoup4 pymupdf --quiet
"%PIP%" install qwen-tts --quiet
echo   OK: Qwen3-TTS Venv fertig.
echo.

:: ╔══════════════════════════════════════════════════════════╗
:: ║  Venv 2: VibeVoice  (.venv-vibevoice)                   ║
:: ╚══════════════════════════════════════════════════════════╝
echo ══════════════════════════════════════════════════════════
echo   [2/2] VibeVoice-Realtime Venv  ^>  .venv-vibevoice\
echo ══════════════════════════════════════════════════════════

if exist "%~dp0.venv-vibevoice\Scripts\python.exe" (
    echo   Virtuelle Umgebung existiert bereits.
) else (
    echo   Erstelle virtuelle Umgebung...
    %PYTHON_CMD% -m venv "%~dp0.venv-vibevoice"
    echo   OK: Erstellt.
)

set PIP_VV=%~dp0.venv-vibevoice\Scripts\pip.exe
"%PIP_VV%" install --upgrade pip setuptools wheel --quiet
"%PIP_VV%" install torch torchaudio --index-url %TORCH_INDEX% --quiet
"%PIP_VV%" install fastapi "uvicorn[standard]" python-multipart pywebview PyQt6 PyQt6-WebEngine qtpy soundfile numpy ebooklib beautifulsoup4 pymupdf --quiet
"%PIP_VV%" install "vibevoice[streamingtts] @ git+https://github.com/microsoft/VibeVoice.git" --quiet
if %errorlevel% == 0 (
    echo   OK: VibeVoice-Realtime Venv fertig.
) else (
    echo   ! VibeVoice konnte nicht installiert werden.
)
echo.

:: ── ffmpeg + sox ───────────────────────────────────────────
echo   Installiere ffmpeg und sox...
choco install ffmpeg sox --no-progress -y >nul 2>&1
if %errorlevel% == 0 (
    echo   OK: ffmpeg und sox installiert.
) else (
    echo   ! ffmpeg/sox konnten nicht installiert werden.
    echo     Bitte manuell: https://ffmpeg.org  /  https://sox.sourceforge.net
)
echo.

:: ── Verzeichnisse ──────────────────────────────────────────
if not exist "%~dp0data" mkdir "%~dp0data"
echo   OK: Verzeichnisse angelegt.
echo.

:: ── Fertig ─────────────────────────────────────────────────
echo ══════════════════════════════════════════════════════════
echo   OK: Einrichtung abgeschlossen!
echo.
echo   Starten: Doppelklick auf  start_windows.bat
echo   Beim Start wird die gewuenschte TTS Engine gewaehlt.
echo ══════════════════════════════════════════════════════════
echo.
pause
