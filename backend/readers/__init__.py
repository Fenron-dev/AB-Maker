"""
File reader factory: dispatches to format-specific readers and cleans up text.
"""

import re
from pathlib import Path

_SUPPORTED = {".txt", ".epub", ".pdf"}


def read_file(path: Path) -> str:
    """Read a book file and return clean, paragraph-separated plain text."""
    suffix = path.suffix.lower()

    if suffix == ".txt":
        from .txt_reader import read_txt
        raw = read_txt(path)
    elif suffix == ".epub":
        from .epub_reader import read_epub
        raw = read_epub(path)
    elif suffix == ".pdf":
        from .pdf_reader import read_pdf
        raw = read_pdf(path)
    else:
        raise ValueError(
            f"Unsupported format '{suffix}'. Supported: {', '.join(sorted(_SUPPORTED))}"
        )

    return _clean(raw)


def _clean(text: str) -> str:
    """Normalise whitespace and remove near-empty paragraphs."""
    paragraphs = re.split(r"\n{2,}", text)
    cleaned: list[str] = []
    for p in paragraphs:
        p = p.replace("\r", "").replace("\n", " ")
        p = re.sub(r"  +", " ", p).strip()
        if len(p) > 15:
            cleaned.append(p)
    return "\n\n".join(cleaned)
