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
echo     ~400 MB  Python-Pakete
echo     ~4,5 GB  KI-Modell (beim ersten Start)
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
echo.
echo   Bitte installieren: https://www.python.org/downloads/
echo   Wichtig: "Add Python to PATH" aktivieren!
echo.
pause
exit /b 1

:found_python
for /f "tokens=*" %%V in ('%PYTHON_CMD% --version 2^>&1') do set PY_VERSION=%%V
echo   OK: %PY_VERSION% gefunden.
echo.

:: ── Virtuelle Umgebung ─────────────────────────────────────
if exist "%~dp0.venv\Scripts\python.exe" (
    echo   Virtuelle Umgebung existiert bereits.
) else (
    echo   Erstelle virtuelle Umgebung...
    %PYTHON_CMD% -m venv "%~dp0.venv"
    echo   OK: Virtuelle Umgebung erstellt.
)

set PIP=%~dp0.venv\Scripts\pip.exe
set PYTHON=%~dp0.venv\Scripts\python.exe
echo.

:: ── pip ───────────────────────────────────────────────────
"%PIP%" install --upgrade pip setuptools wheel --quiet

:: ── PyTorch ───────────────────────────────────────────────
echo   Erkenne Hardware...
nvidia-smi >nul 2>&1
if %errorlevel% == 0 (
    echo   NVIDIA GPU erkannt – installiere PyTorch mit CUDA...
    "%PIP%" install torch torchaudio --index-url https://download.pytorch.org/whl/cu121 --quiet
) else (
    echo   Keine NVIDIA GPU – CPU-Modus.
    "%PIP%" install torch torchaudio --index-url https://download.pytorch.org/whl/cpu --quiet
)
echo   OK: PyTorch installiert.
echo.

:: ── Abhängigkeiten ────────────────────────────────────────
echo   Installiere Abhängigkeiten...
"%PIP%" install fastapi "uvicorn[standard]" python-multipart pywebview PyQt6 PyQt6-WebEngine qtpy qwen-tts soundfile numpy ebooklib beautifulsoup4 pymupdf --quiet
echo   OK: Pakete installiert.
echo.

:: ── VibeVoice-Realtime (optional) ─────────────────────────
echo   Installiere VibeVoice-Realtime Engine (optional)...
"%PIP%" install "vibevoice[streamingtts] @ git+https://github.com/microsoft/VibeVoice.git" --quiet
if %errorlevel% == 0 (
    echo   OK: VibeVoice installiert.
) else (
    echo   ! VibeVoice konnte nicht installiert werden - Engine wird uebersprungen.
)
echo.

:: ── Verzeichnisse ─────────────────────────────────────────
if not exist "%~dp0data" mkdir "%~dp0data"
echo   OK: Verzeichnisse angelegt.
echo.

:: ── Fertig ────────────────────────────────────────────────
echo ══════════════════════════════════════════════════════════
echo   OK: Einrichtung abgeschlossen!
echo.
echo   Starten: Doppelklick auf  start_windows.bat
echo ══════════════════════════════════════════════════════════
echo.
pause
