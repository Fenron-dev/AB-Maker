"""
AB-Maker – The Sonic Architect
Entry point: starts FastAPI server + opens pywebview desktop window.
"""

import os
import sys

# ── Qt platform selection (must happen BEFORE any Qt/webview import) ──────────
if sys.platform == "linux" and not os.environ.get("QT_QPA_PLATFORM"):
    wayland_display = os.environ.get("WAYLAND_DISPLAY")
    if wayland_display:
        xdg_runtime = os.environ.get("XDG_RUNTIME_DIR", f"/run/user/{os.getuid()}")
        wayland_sock = os.path.join(xdg_runtime, wayland_display)
        if os.path.exists(wayland_sock):
            os.environ["QT_QPA_PLATFORM"] = "wayland"
    # else: Qt uses xcb — needs libxcb-cursor0 (sudo apt install libxcb-cursor0)

import socket
import threading
import time
from pathlib import Path


def find_free_port() -> int:
    with socket.socket() as s:
        s.bind(("", 0))
        return s.getsockname()[1]


def wait_for_server(port: int, timeout: float = 15.0) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection(("127.0.0.1", port), 0.3):
                return True
        except OSError:
            time.sleep(0.1)
    return False


def run_server(port: int) -> None:
    import uvicorn
    from backend.app import create_app

    app = create_app()
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")


class PyWebviewAPI:
    """Python methods callable from JavaScript via window.pywebview.api.*"""

    def open_file_dialog(self):
        import webview
        result = webview.windows[0].create_file_dialog(
            webview.OPEN_DIALOG,
            allow_multiple=True,
            file_types=(
                "Book files (*.txt;*.epub;*.pdf)",
                "Text files (*.txt)",
                "EPUB files (*.epub)",
                "PDF files (*.pdf)",
                "All files (*.*)",
            ),
        )
        return list(result) if result else []

    def open_folder_dialog(self):
        import webview
        result = webview.windows[0].create_file_dialog(webview.FOLDER_DIALOG)
        return result[0] if result else None

    def open_path(self, path: str):
        import subprocess
        from pathlib import Path as P

        p = P(path)
        try:
            if sys.platform == "win32":
                if p.is_file():
                    subprocess.run(["explorer", "/select,", str(p)])
                else:
                    subprocess.run(["explorer", str(p)])
            elif sys.platform == "darwin":
                if p.is_file():
                    subprocess.run(["open", "-R", str(p)])
                else:
                    subprocess.run(["open", str(p)])
            else:
                subprocess.run(["xdg-open", str(p.parent if p.is_file() else p)])
        except Exception as e:
            return str(e)
        return None


def main() -> None:
    port = find_free_port()

    server_thread = threading.Thread(
        target=run_server, args=(port,), daemon=True
    )
    server_thread.start()

    if not wait_for_server(port):
        print("ERROR: Backend server failed to start.", file=sys.stderr)
        sys.exit(1)

    try:
        import webview
    except ImportError:
        # Headless / dev mode – just keep server alive
        print(f"pywebview not found. Open http://127.0.0.1:{port} in your browser.")
        server_thread.join()
        return

    api = PyWebviewAPI()
    webview.create_window(
        "AB-Maker – The Sonic Architect",
        f"http://127.0.0.1:{port}",
        width=1280,
        height=820,
        min_size=(960, 640),
        background_color="#11131c",
        js_api=api,
    )
    webview.start(debug="--debug" in sys.argv)


if __name__ == "__main__":
    main()
