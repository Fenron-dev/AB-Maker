#!/usr/bin/env bash
# AB-Maker starten (Linux / macOS)
PROJEKT=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
VENV="$PROJEKT/.venv"
VENV_VV="$PROJEKT/.venv-vibevoice"

HAS_QWEN=false
HAS_VV=false
[ -f "$VENV/bin/python" ]    && HAS_QWEN=true
[ -f "$VENV_VV/bin/python" ] && HAS_VV=true

# ── Engine auswählen ──────────────────────────────────────────
if $HAS_QWEN && $HAS_VV; then
    echo ""
    echo "  Wähle TTS Engine:"
    echo "  1) Qwen3-TTS         (Standard, mehrsprachig)"
    echo "  2) VibeVoice-Realtime (Englisch, niedrige Latenz)"
    echo ""
    read -r -p "  Auswahl [1]: " choice
    case "${choice:-1}" in
        2) PYTHON="$VENV_VV/bin/python" ;;
        *) PYTHON="$VENV/bin/python"    ;;
    esac
elif $HAS_VV; then
    PYTHON="$VENV_VV/bin/python"
elif $HAS_QWEN; then
    PYTHON="$VENV/bin/python"
else
    echo "Keine virtuelle Umgebung gefunden."
    echo "Bitte zuerst setup.sh ausführen:"
    echo "  bash \"$PROJEKT/setup.sh\""
    read -r -p "[Enter]"
    exit 1
fi

# ── Qt-Plattform-Plugin vor Python-Start setzen ───────────────
if [ -z "${QT_QPA_PLATFORM:-}" ] && [ -n "${WAYLAND_DISPLAY:-}" ]; then
    WAYLAND_SOCK="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/$WAYLAND_DISPLAY"
    if [ -S "$WAYLAND_SOCK" ]; then
        export QT_QPA_PLATFORM=wayland
    fi
fi

exec "$PYTHON" "$PROJEKT/main.py" "$@"
