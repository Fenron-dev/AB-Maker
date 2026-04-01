import re
from pathlib import Path


def read_epub(path: Path) -> str:
    try:
        import ebooklib
        from ebooklib import epub
        from bs4 import BeautifulSoup
    except ImportError as exc:
        raise RuntimeError(
            "Missing dependency for EPUB: run 'pip install ebooklib beautifulsoup4'"
        ) from exc

    book = epub.read_epub(str(path), options={"ignore_ncx": True})
    sections: list[str] = []

    for item in book.get_items_of_type(ebooklib.ITEM_DOCUMENT):
        html = item.get_content().decode("utf-8", errors="ignore")
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "style", "nav"]):
            tag.decompose()
        text = soup.get_text(separator="\n")
        text = re.sub(r"\n{3,}", "\n\n", text).strip()
        if len(text) > 100:
            sections.append(text)

    return "\n\n".join(sections)
