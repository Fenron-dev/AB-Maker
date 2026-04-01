@echo off
chcp 65001 > nul
set VENV=%~dp0.venv\Scripts

if not exist "%VENV%\python.exe" (
    echo Fehler: .venv nicht gefunden. Bitte setup_windows.bat ausfuehren.
    pause
    exit /b 1
)

echo Installiere PyInstaller...
"%VENV%\pip.exe" install pyinstaller --quiet

echo Baue Executable...
"%VENV%\pyinstaller.exe" ^
    --onedir ^
    --name "AB-Maker" ^
    --windowed ^
    --add-data "%~dp0frontend;frontend" ^
    --add-data "%~dp0data;data" ^
    --hidden-import "uvicorn.logging" ^
    --hidden-import "uvicorn.protocols.http.auto" ^
    --hidden-import "uvicorn.protocols.websockets.auto" ^
    --hidden-import "uvicorn.lifespan.on" ^
    --hidden-import "fastapi" ^
    --hidden-import "webview" ^
    --collect-all "webview" ^
    --noconfirm ^
    "%~dp0main.py"

echo.
echo Fertig! Executable unter: dist\AB-Maker\
echo Starten: dist\AB-Maker\AB-Maker.exe
echo.
pause
