#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════╗
# ║  AB-Maker – Standalone Executable bauen (Linux / macOS)    ║
# ╚══════════════════════════════════════════════════════════════╝

set -euo pipefail
PROJEKT=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
VENV="$PROJEKT/.venv"

if [ ! -f "$VENV/bin/python" ]; then
    echo "Fehler: .venv nicht gefunden. Bitte setup.sh zuerst ausführen."
    exit 1
fi

echo "Installiere PyInstaller…"
"$VENV/bin/pip" install pyinstaller --quiet

echo "Baue Executable…"
"$VENV/bin/pyinstaller" \
    --onedir \
    --name "AB-Maker" \
    --windowed \
    --add-data "$PROJEKT/frontend:frontend" \
    --add-data "$PROJEKT/data:data" \
    --hidden-import "uvicorn.logging" \
    --hidden-import "uvicorn.protocols.http.auto" \
    --hidden-import "uvicorn.protocols.websockets.auto" \
    --hidden-import "uvicorn.lifespan.on" \
    --hidden-import "fastapi" \
    --hidden-import "webview" \
    --collect-all "webview" \
    --noconfirm \
    "$PROJEKT/main.py"

echo ""
echo "Fertig! Executable unter: dist/AB-Maker/"
echo "Starten: ./dist/AB-Maker/AB-Maker"
