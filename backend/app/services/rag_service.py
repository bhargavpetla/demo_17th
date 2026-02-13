from app.services.llm_service import generate_single_embedding, call_llm, call_llm_streaming
from app.services.vector_service import query_documents
from app.utils.prompts import RAG_PROMPT
from app.models.qa import QAResponse, ProvenanceSource
from app.db.chroma_client import get_collection


def build_context(chunks: list[dict]) -> str:
    """Build context string from retrieved chunks."""
    context_parts = []
    for chunk in chunks:
        context_parts.append(
            f"[Document: {chunk['doc_name']}, Page {chunk['page_number']}]\n{chunk['text']}"
        )
    return "\n---\n".join(context_parts)


def answer_question(question: str, doc_ids: list[str] | None = None) -> QAResponse:
    """Answer a question using RAG over uploaded documents."""
    query_embedding = generate_single_embedding(question)
    chunks = query_documents(query_embedding, top_k=7, doc_ids=doc_ids)

    if not chunks:
        return QAResponse(
            question=question,
            answer="No relevant documents found. Please upload documents first.",
            sources=[],
        )

    context = build_context(chunks)
    prompt = RAG_PROMPT.format(context_chunks=context, user_question=question)
    answer = call_llm(prompt)

    sources = []
    seen = set()
    for chunk in chunks:
        key = f"{chunk['doc_name']}_{chunk['page_number']}"
        if key not in seen:
            seen.add(key)
            sources.append(ProvenanceSource(
                doc_name=chunk["doc_name"],
                page=chunk["page_number"],
                snippet=chunk["text"][:150] + "...",
            ))

    return QAResponse(question=question, answer=answer, sources=sources)


def answer_question_streaming(question: str, doc_ids: list[str] | None = None):
    """Stream answer using RAG over uploaded documents."""
    query_embedding = generate_single_embedding(question)
    chunks = query_documents(query_embedding, top_k=7, doc_ids=doc_ids)

    if not chunks:
        yield {"type": "answer", "data": "No relevant documents found. Please upload documents first."}
        yield {"type": "done", "data": ""}
        return

    context = build_context(chunks)
    prompt = RAG_PROMPT.format(context_chunks=context, user_question=question)

    for token in call_llm_streaming(prompt):
        yield {"type": "answer", "data": token}

    sources = []
    seen = set()
    for chunk in chunks:
        key = f"{chunk['doc_name']}_{chunk['page_number']}"
        if key not in seen:
            seen.add(key)
            sources.append({
                "doc_name": chunk["doc_name"],
                "page": chunk["page_number"],
                "snippet": chunk["text"][:150] + "...",
            })

    yield {"type": "sources", "data": sources}
    yield {"type": "done", "data": ""}


def generate_suggested_questions() -> list[str]:
    """Generate contextual suggested questions based on what documents are actually in the vector store."""
    try:
        collection = get_collection()
        count = collection.count()
        if count == 0:
            return []

        # Get unique document names from ChromaDB
        results = collection.get(limit=min(count, 200), include=["metadatas"])
        doc_names = list({m.get("doc_name", "") for m in results["metadatas"] if m.get("doc_name")})

        if not doc_names:
            return []

        # Build dynamic questions based on actual documents
        questions = []
        if len(doc_names) == 1:
            name = doc_names[0]
            questions = [
                f"What is {name} about?",
                f"What are the key risks mentioned in {name}?",
                f"What is the business model described in {name}?",
                f"What traction metrics are in {name}?",
                f"What is the funding ask in {name}?",
            ]
        else:
            names_str = ", ".join(doc_names[:5])
            questions = [
                f"Compare the business models across {names_str}",
                f"Which company has the strongest traction?",
                f"What are the common risks across all documents?",
                f"Compare the TAM of all companies",
                f"Which company requires the least funding?",
                f"Who are the founders and their backgrounds?",
            ]
        return questions
    except Exception:
        return []
