import os
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.models.extraction import ExtractionResult
from app.services.extraction_service import extract_document, get_cached_extraction
from app.utils.file_utils import load_json

router = APIRouter(prefix="/extraction", tags=["extraction"])

DOCS_STORE_PATH = "data/documents.json"


def _get_doc(doc_id: str) -> dict:
    docs = load_json(DOCS_STORE_PATH) or {}
    if doc_id not in docs:
        raise HTTPException(404, "Document not found")
    return docs[doc_id]


@router.get("/results/{doc_id}", response_model=ExtractionResult)
async def get_extraction_results(doc_id: str):
    """Get extraction results for a document."""
    _get_doc(doc_id)
    cached = get_cached_extraction(doc_id)
    if cached:
        return cached
    return ExtractionResult(doc_id=doc_id, status="pending")


@router.get("/results", response_model=list[ExtractionResult])
async def get_all_extractions():
    """Get extraction results for all documents."""
    docs = load_json(DOCS_STORE_PATH) or {}
    results = []
    for doc_id in docs:
        cached = get_cached_extraction(doc_id)
        if cached:
            results.append(cached)
        else:
            results.append(ExtractionResult(doc_id=doc_id, status="pending"))
    return results


@router.post("/process/{doc_id}", response_model=ExtractionResult)
async def trigger_extraction(doc_id: str, background_tasks: BackgroundTasks):
    """Manually trigger extraction for a document."""
    doc = _get_doc(doc_id)
    filepath = os.path.join("uploads", doc["filename"])
    if not os.path.exists(filepath):
        raise HTTPException(404, "Document file not found")

    result = extract_document(doc_id, filepath)
    return result
