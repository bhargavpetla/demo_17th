import os
import threading
from fastapi import APIRouter, HTTPException
from app.services.faq_service import generate_faqs, get_cached_faqs, set_faq_status
from app.utils.file_utils import load_json

router = APIRouter(prefix="/faq", tags=["faq"])

DOCS_STORE_PATH = "data/documents.json"

# Track which docs are currently generating FAQs
_generating: set[str] = set()


def _get_doc(doc_id: str) -> dict:
    docs = load_json(DOCS_STORE_PATH) or {}
    if doc_id not in docs:
        raise HTTPException(404, "Document not found")
    return docs[doc_id]


def _generate_in_background(doc_id: str, doc_name: str, filepath: str):
    """Run FAQ generation in a thread so it doesn't block."""
    try:
        generate_faqs(doc_id, doc_name, filepath)
    finally:
        _generating.discard(doc_id)


@router.post("/generate/{doc_id}")
async def trigger_faq_generation(doc_id: str):
    """Start FAQ generation in background."""
    doc = _get_doc(doc_id)
    filepath = os.path.join("uploads", doc["filename"])
    if not os.path.exists(filepath):
        raise HTTPException(404, "Document file not found")

    if doc_id in _generating:
        return {"doc_id": doc_id, "status": "generating", "message": "Already generating"}

    _generating.add(doc_id)
    set_faq_status(doc_id, doc["original_filename"], "generating")

    thread = threading.Thread(target=_generate_in_background, args=(doc_id, doc["original_filename"], filepath))
    thread.daemon = True
    thread.start()

    return {"doc_id": doc_id, "status": "generating", "message": "FAQ generation started"}


@router.get("/get/{doc_id}")
async def get_faqs(doc_id: str):
    """Get cached FAQs for a document, or current generation status."""
    doc = _get_doc(doc_id)
    cached = get_cached_faqs(doc_id)
    if cached:
        return cached.model_dump()

    if doc_id in _generating:
        return {"doc_id": doc_id, "doc_name": doc["original_filename"], "faqs": [], "status": "generating"}

    return {"doc_id": doc_id, "doc_name": doc["original_filename"], "faqs": [], "status": "pending"}


@router.post("/regenerate/{doc_id}")
async def regenerate_faqs(doc_id: str):
    """Regenerate FAQs for a document."""
    doc = _get_doc(doc_id)
    filepath = os.path.join("uploads", doc["filename"])
    if not os.path.exists(filepath):
        raise HTTPException(404, "Document file not found")

    if doc_id in _generating:
        return {"doc_id": doc_id, "status": "generating", "message": "Already generating"}

    _generating.add(doc_id)
    set_faq_status(doc_id, doc["original_filename"], "generating")

    thread = threading.Thread(target=_generate_in_background, args=(doc_id, doc["original_filename"], filepath))
    thread.daemon = True
    thread.start()

    return {"doc_id": doc_id, "status": "generating", "message": "FAQ regeneration started"}
