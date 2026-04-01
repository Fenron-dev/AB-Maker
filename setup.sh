#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════╗
# ║  AB-Maker – Einmalige Einrichtung (Linux / macOS)           ║
# ╚══════════════════════════════════════════════════════════════╝

set -euo pipefail
PROJEKT=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
VENV="$PROJEKT/.venv"

clear
echo "╔══════════════════════════════════════════════════════════╗"
echo "║       AB-Maker  –  Einrichtung                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  Projektordner:  $PROJEKT"
echo "  Python-Env:     $VENV"
echo ""
echo "  Was wird installiert:"
echo "    ~400 MB  Python-Pakete (in .venv/ im Projektordner)"
echo "    ~4,5 GB  KI-Modell    (beim ersten Start automatisch)"
echo ""
echo "══════════════════════════════════════════════════════════"
read -r -p "  Einrichtung starten? [j/N] " ANT
echo ""
[[ "$ANT" =~ ^[jJyY]$ ]] || { echo "  Abgebrochen."; sleep 2; exit 0; }

# ── Python prüfen ─────────────────────────────────────────────
echo "  Suche Python 3.10+…"
PYTHON_CMD=""
for cmd in python3.12 python3.11 python3.10 python3; do
    if command -v "$cmd" &>/dev/null; then
        OK=$("$cmd" -c "import sys; print(sys.version_info >= (3,10))" 2>/dev/null)
        if [ "$OK" = "True" ]; then
            PYTHON_CMD="$cmd"
            break
        fi
    fi
done

if [ -z "$PYTHON_CMD" ]; then
    echo ""
    echo "  FEHLER: Python 3.10+ nicht gefunden."
    echo ""
    echo "  Linux (Debian/Ubuntu): sudo apt install python3 python3-venv"
    echo "  Linux (Arch):          sudo pacman -S python"
    echo "  macOS:                 brew install python"
    echo ""
    read -r -p "  [Enter zum Schließen]"
    exit 1
fi

echo "  ✓ $($PYTHON_CMD --version) gefunden."
echo ""

# ── Virtuelle Umgebung ────────────────────────────────────────
if [ -d "$VENV" ]; then
    echo "  ℹ Virtuelle Umgebung existiert bereits."
else
    echo "  Erstelle virtuelle Umgebung…"
    "$PYTHON_CMD" -m venv "$VENV"
    echo "  ✓ Virtuelle Umgebung erstellt."
fi

PIP="$VENV/bin/pip"
PYTHON="$VENV/bin/python"
echo ""

# ── pip aktualisieren ─────────────────────────────────────────
"$PIP" install --upgrade pip setuptools wheel --quiet

# ── PyTorch (GPU-aware) ───────────────────────────────────────
echo "  Erkenne Hardware…"
if command -v nvidia-smi &>/dev/null; then
    GPU=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1)
    echo "  GPU: $GPU"
    echo "  Installiere PyTorch mit CUDA…"
    "$PIP" install torch torchaudio --index-url https://download.pytorch.org/whl/cu121 --quiet
else
    echo "  Keine NVIDIA-GPU erkannt – CPU-Modus."
    "$PIP" install torch torchaudio --index-url https://download.pytorch.org/whl/cpu --quiet
fi
echo "  ✓ PyTorch installiert."
echo ""

# ── Abhängigkeiten installieren ───────────────────────────────
echo "  Installiere Abhängigkeiten (kann 5–15 Min. dauern)…"
"$PIP" install \
    fastapi "uvicorn[standard]" python-multipart \
    pywebview PyQt6 PyQt6-WebEngine qtpy \
    qwen-tts \
    soundfile numpy \
    ebooklib beautifulsoup4 pymupdf \
    --quiet
echo "  ✓ Alle Pakete installiert."
echo ""

# ── ffmpeg ────────────────────────────────────────────────────
echo "  Prüfe ffmpeg…"
if command -v ffmpeg &>/dev/null; then
    echo "  ✓ ffmpeg $(ffmpeg -version 2>&1 | head -1 | awk '{print $3}') gefunden."
else
    echo "  ffmpeg nicht gefunden – versuche Installation…"
    if command -v pacman &>/dev/null; then
        sudo pacman -S --noconfirm --needed ffmpeg 2>/dev/null && echo "  ✓ ffmpeg installiert." || echo "  ! ffmpeg konnte nicht installiert werden – M4B-Export nicht möglich."
    elif command -v apt &>/dev/null; then
        sudo apt install -y ffmpeg 2>/dev/null && echo "  ✓ ffmpeg installiert." || echo "  ! ffmpeg konnte nicht installiert werden."
    elif command -v brew &>/dev/null; then
        brew install ffmpeg 2>/dev/null && echo "  ✓ ffmpeg installiert." || echo "  ! ffmpeg konnte nicht installiert werden."
    else
        echo "  ! Bitte ffmpeg manuell installieren: https://ffmpeg.org/download.html"
    fi
fi
echo ""

# ── Qt-Hinweis (X11) ──────────────────────────────────────────
if [[ "$OSTYPE" == "linux-gnu"* ]] && [ -z "$WAYLAND_DISPLAY" ]; then
    echo "  Hinweis (X11): Falls Qt 'xcb'-Fehler auftritt:"
    if command -v pacman &>/dev/null; then
        echo "    sudo pacman -S xcb-util-cursor"
    elif command -v apt &>/dev/null; then
        echo "    sudo apt install libxcb-cursor0"
    fi
    echo ""
fi

# ── Ordner anlegen ────────────────────────────────────────────
mkdir -p "$PROJEKT/data"
echo "  ✓ Verzeichnisse angelegt."
echo ""

# ── Desktop-Datei für Linux ───────────────────────────────────
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    cat > "$PROJEKT/AB-Maker starten.desktop" << EOF
[Desktop Entry]
Type=Application
Name=AB-Maker – The Sonic Architect
Comment=Bücher in Hörbücher konvertieren
Exec=bash -c 'cd "$PROJEKT" && bash "$PROJEKT/start.sh"'
Terminal=false
Icon=$PROJEKT/frontend/icon.png
Categories=Audio;
EOF
    chmod +x "$PROJEKT/AB-Maker starten.desktop" 2>/dev/null || true
fi

# ── Fertig ────────────────────────────────────────────────────
echo "══════════════════════════════════════════════════════════"
echo "  ✓ Einrichtung abgeschlossen!"
echo ""
echo "  Starten:"
echo "    bash \"$PROJEKT/start.sh\""
echo ""
echo "  Oder Doppelklick auf 'AB-Maker starten.desktop' (Linux)"
echo "══════════════════════════════════════════════════════════"
echo ""
read -r -p "  [Enter zum Schließen]"
