@echo off
chcp 65001 > nul
set PROJEKT=%~dp0
set PYTHON_QWEN=%PROJEKT%.venv\Scripts\python.exe
set PYTHON_VV=%PROJEKT%.venv-vibevoice\Scripts\python.exe

:: ── Prüfen welche Venvs vorhanden sind ────────────────────
set HAS_QWEN=0
set HAS_VV=0
if exist "%PYTHON_QWEN%" set HAS_QWEN=1
if exist "%PYTHON_VV%"   set HAS_VV=1

:: ── Engine auswählen ──────────────────────────────────────
if "%HAS_QWEN%"=="1" if "%HAS_VV%"=="1" (
    echo.
    echo   Waehle TTS Engine:
    echo   1^) Qwen3-TTS          ^(Standard, mehrsprachig^)
    echo   2^) VibeVoice-Realtime ^(Englisch, niedrige Latenz^)
    echo.
    set /p CHOICE=  Auswahl [1]:
    if "!CHOICE!"=="2" (
        set PYTHON=%PYTHON_VV%
    ) else (
        set PYTHON=%PYTHON_QWEN%
    )
    goto :launch
)
if "%HAS_VV%"=="1" (
    set PYTHON=%PYTHON_VV%
    goto :launch
)
if "%HAS_QWEN%"=="1" (
    set PYTHON=%PYTHON_QWEN%
    goto :launch
)

echo Keine virtuelle Umgebung gefunden.
echo Bitte zuerst setup_windows.bat ausfuehren.
pause
exit /b 1

:launch
"%PYTHON%" "%PROJEKT%main.py" %*
