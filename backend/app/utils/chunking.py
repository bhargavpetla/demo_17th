from app.config import CHUNK_SIZE, CHUNK_OVERLAP


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[dict]:
    """Split text into overlapping chunks, preserving sentence boundaries."""
    if not text.strip():
        return []

    sentences = []
    current = ""
    for char in text:
        current += char
        if char in ".!?\n" and len(current.strip()) > 10:
            sentences.append(current.strip())
            current = ""
    if current.strip():
        sentences.append(current.strip())

    chunks = []
    current_chunk = ""
    current_word_count = 0

    for sentence in sentences:
        words = sentence.split()
        word_count = len(words)

        if current_word_count + word_count > chunk_size and current_chunk:
            chunks.append(current_chunk.strip())
            # Keep overlap
            overlap_words = current_chunk.split()[-overlap:] if overlap > 0 else []
            current_chunk = " ".join(overlap_words) + " " + sentence
            current_word_count = len(overlap_words) + word_count
        else:
            current_chunk += " " + sentence
            current_word_count += word_count

    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    return [{"text": chunk, "index": i} for i, chunk in enumerate(chunks)]


def chunk_pages(pages: list[dict], chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[dict]:
    """Chunk text from pages while preserving page number metadata."""
    chunks = []
    current_chunk = ""
    current_word_count = 0
    current_page = 1

    for page in pages:
        page_num = page["page_number"]
        text = page["text"]
        sentences = text.replace("\n", " ").split(". ")

        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
            words = sentence.split()
            word_count = len(words)

            if current_word_count + word_count > chunk_size and current_chunk:
                chunks.append({
                    "text": current_chunk.strip(),
                    "page_number": current_page,
                    "index": len(chunks),
                })
                overlap_words = current_chunk.split()[-overlap:] if overlap > 0 else []
                current_chunk = " ".join(overlap_words) + " " + sentence
                current_word_count = len(overlap_words) + word_count
                current_page = page_num
            else:
                if not current_chunk:
                    current_page = page_num
                current_chunk += " " + sentence
                current_word_count += word_count

    if current_chunk.strip():
        chunks.append({
            "text": current_chunk.strip(),
            "page_number": current_page,
            "index": len(chunks),
        })

    return chunks
