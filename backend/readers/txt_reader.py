from pathlib import Path


def read_txt(path: Path) -> str:
    """Try several encodings; raise on failure."""
    for enc in ("utf-8", "utf-8-sig", "latin-1", "cp1252"):
        try:
            return path.read_text(encoding=enc)
        except UnicodeDecodeError:
            continue
    raise RuntimeError(f"Cannot decode text file: {path}")
