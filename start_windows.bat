@echo off
chcp 65001 > nul
set VENV=%~dp0.venv\Scripts\python.exe

if not exist "%VENV%" (
    echo Virtuelle Umgebung nicht gefunden.
    echo Bitte zuerst setup_windows.bat ausfuehren.
    pause
    exit /b 1
)

"%VENV%" "%~dp0main.py" %*
