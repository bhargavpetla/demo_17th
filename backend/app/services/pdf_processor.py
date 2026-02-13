import pdfplumber
from app.models.document import PageContent


def extract_text_with_pages(pdf_path: str) -> list[PageContent]:
    """Extract text from PDF page by page."""
    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            pages.append(PageContent(page_number=i + 1, text=text))
    return pages


def extract_full_text(pdf_path: str) -> str:
    """Extract all text from PDF as a single string."""
    pages = extract_text_with_pages(pdf_path)
    return "\n\n".join(p.text for p in pages if p.text.strip())


def get_page_count(pdf_path: str) -> int:
    with pdfplumber.open(pdf_path) as pdf:
        return len(pdf.pages)
