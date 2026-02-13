from fastapi import APIRouter
from app.models.extraction import ExtractionResult
from app.services.extraction_service import get_cached_extraction
from app.utils.file_utils import load_json

router = APIRouter(prefix="/comparison", tags=["comparison"])

DOCS_STORE_PATH = "data/documents.json"


@router.get("/documents", response_model=list[ExtractionResult])
async def get_comparison_data():
    """Get all documents with extraction data for comparison."""
    docs = load_json(DOCS_STORE_PATH) or {}
    results = []
    for doc_id in docs:
        cached = get_cached_extraction(doc_id)
        if cached and cached.status == "completed":
            results.append(cached)
    return results
