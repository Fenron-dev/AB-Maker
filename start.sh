#!/usr/bin/env bash
# AB-Maker starten (Linux / macOS)
PROJEKT=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
VENV="$PROJEKT/.venv"

if [ ! -f "$VENV/bin/python" ]; then
    echo "Virtuelle Umgebung nicht gefunden."
    echo "Bitte zuerst setup.sh ausführen:"
    echo "  bash \"$PROJEKT/setup.sh\""
    read -r -p "[Enter]"
    exit 1
fi

# Select Qt platform plugin before Python starts
# Only use wayland if the socket is actually reachable
if [ -z "$QT_QPA_PLATFORM" ] && [ -n "$WAYLAND_DISPLAY" ]; then
    WAYLAND_SOCK="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/$WAYLAND_DISPLAY"
    if [ -S "$WAYLAND_SOCK" ]; then
        export QT_QPA_PLATFORM=wayland
    fi
fi

exec "$VENV/bin/python" "$PROJEKT/main.py" "$@"
