import json
from app.services.llm_service import call_llm
from app.services.pdf_processor import extract_full_text
from app.models.extraction import ExtractionResult, Founder, Financials, TAM, Traction, Ask
from app.utils.prompts import EXTRACTION_PROMPT
from app.utils.file_utils import save_json, load_json, get_data_path


def extract_document(doc_id: str, pdf_path: str) -> ExtractionResult:
    """Extract structured data from a VC memo PDF using GPT-4."""
    text = extract_full_text(pdf_path)
    if not text.strip():
        return ExtractionResult(doc_id=doc_id, status="error", error_message="No text extracted from PDF")

    # Truncate if too long (GPT-4 Turbo has 128K context)
    if len(text) > 100000:
        text = text[:100000]

    prompt = EXTRACTION_PROMPT.format(document_text=text)
    response = call_llm(prompt, json_mode=True)

    try:
        data = json.loads(response)
    except json.JSONDecodeError:
        return ExtractionResult(doc_id=doc_id, status="error", error_message="Failed to parse LLM response as JSON")

    result = ExtractionResult(
        doc_id=doc_id,
        company_name=data.get("company_name", ""),
        pitch=data.get("pitch", ""),
        founders=[Founder(**f) for f in data.get("founders", [])],
        business_model=data.get("business_model", ""),
        financials=Financials(**data.get("financials", {})),
        tam=TAM(**data.get("tam", {})),
        traction=Traction(**data.get("traction", {})),
        competitors=data.get("competitors", []),
        ask=Ask(**data.get("ask", {})),
        risks=data.get("risks", []),
        status="completed",
    )

    # Cache result
    save_json(get_data_path("extractions", doc_id), result.model_dump())
    return result


def get_cached_extraction(doc_id: str) -> ExtractionResult | None:
    """Get cached extraction result."""
    data = load_json(get_data_path("extractions", doc_id))
    if data:
        return ExtractionResult(**data)
    return None
