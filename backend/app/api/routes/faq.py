import os
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.models.faq import FAQResponse
from app.services.faq_service import generate_faqs, get_cached_faqs
from app.utils.file_utils import load_json

router = APIRouter(prefix="/faq", tags=["faq"])

DOCS_STORE_PATH = "data/documents.json"


def _get_doc(doc_id: str) -> dict:
    docs = load_json(DOCS_STORE_PATH) or {}
    if doc_id not in docs:
        raise HTTPException(404, "Document not found")
    return docs[doc_id]


@router.post("/generate/{doc_id}", response_model=FAQResponse)
async def trigger_faq_generation(doc_id: str):
    """Generate FAQs for a document."""
    doc = _get_doc(doc_id)
    filepath = os.path.join("uploads", doc["filename"])
    if not os.path.exists(filepath):
        raise HTTPException(404, "Document file not found")

    result = generate_faqs(doc_id, doc["original_filename"], filepath)
    return result


@router.get("/get/{doc_id}", response_model=FAQResponse)
async def get_faqs(doc_id: str):
    """Get cached FAQs for a document."""
    doc = _get_doc(doc_id)
    cached = get_cached_faqs(doc_id)
    if cached:
        return cached
    return FAQResponse(doc_id=doc_id, doc_name=doc["original_filename"], status="pending")


@router.post("/regenerate/{doc_id}", response_model=FAQResponse)
async def regenerate_faqs(doc_id: str):
    """Regenerate FAQs for a document."""
    doc = _get_doc(doc_id)
    filepath = os.path.join("uploads", doc["filename"])
    if not os.path.exists(filepath):
        raise HTTPException(404, "Document file not found")

    result = generate_faqs(doc_id, doc["original_filename"], filepath)
    return result
