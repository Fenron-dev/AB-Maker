from pathlib import Path


def read_pdf(path: Path) -> str:
    try:
        import fitz  # PyMuPDF
    except ImportError as exc:
        raise RuntimeError(
            "Missing dependency for PDF: run 'pip install pymupdf'"
        ) from exc

    doc = fitz.open(str(path))
    pages: list[str] = []
    for page in doc:
        text = page.get_text().strip()
        if text:
            pages.append(text)
    doc.close()
    return "\n\n".join(pages)
