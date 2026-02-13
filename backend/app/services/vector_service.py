from app.db.chroma_client import get_collection
from app.services.llm_service import generate_embeddings
from app.utils.chunking import chunk_pages
from app.models.document import PageContent


def add_document_to_store(doc_id: str, doc_name: str, pages: list[PageContent]):
    """Chunk document pages, generate embeddings, and store in ChromaDB."""
    page_dicts = [{"page_number": p.page_number, "text": p.text} for p in pages]
    chunks = chunk_pages(page_dicts)

    if not chunks:
        return

    texts = [c["text"] for c in chunks]
    embeddings = generate_embeddings(texts)

    collection = get_collection()
    ids = [f"{doc_id}_chunk_{c['index']}" for c in chunks]
    metadatas = [
        {
            "doc_id": doc_id,
            "doc_name": doc_name,
            "page_number": c["page_number"],
            "chunk_index": c["index"],
        }
        for c in chunks
    ]

    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=texts,
        metadatas=metadatas,
    )


def query_documents(query_embedding: list[float], top_k: int = 7, doc_ids: list[str] | None = None) -> list[dict]:
    """Query ChromaDB for relevant chunks."""
    collection = get_collection()
    where = None
    if doc_ids:
        where = {"doc_id": {"$in": doc_ids}}

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
        where=where,
        include=["documents", "metadatas", "distances"],
    )

    chunks = []
    if results and results["documents"]:
        for i, doc in enumerate(results["documents"][0]):
            meta = results["metadatas"][0][i]
            chunks.append({
                "text": doc,
                "doc_name": meta["doc_name"],
                "doc_id": meta["doc_id"],
                "page_number": meta["page_number"],
                "distance": results["distances"][0][i] if results["distances"] else 0,
            })
    return chunks


def delete_document_from_store(doc_id: str):
    """Remove all chunks for a document from ChromaDB."""
    collection = get_collection()
    # Get all IDs for this document
    results = collection.get(where={"doc_id": doc_id})
    if results and results["ids"]:
        collection.delete(ids=results["ids"])
