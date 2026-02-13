import json
from app.services.llm_service import call_llm
from app.services.pdf_processor import extract_full_text
from app.models.faq import FAQItem, FAQResponse
from app.utils.prompts import FAQ_PROMPT
from app.utils.file_utils import save_json, load_json, get_data_path


def generate_faqs(doc_id: str, doc_name: str, pdf_path: str) -> FAQResponse:
    """Generate 20 investor FAQs for a document using GPT-4."""
    text = extract_full_text(pdf_path)
    if not text.strip():
        return FAQResponse(doc_id=doc_id, doc_name=doc_name, status="error")

    if len(text) > 100000:
        text = text[:100000]

    prompt = FAQ_PROMPT.format(document_text=text)
    response = call_llm(prompt, json_mode=True)

    try:
        data = json.loads(response)
        # Handle both array and object with array inside
        if isinstance(data, dict):
            faqs_raw = data.get("faqs", data.get("questions", []))
        else:
            faqs_raw = data

        faqs = [FAQItem(question=f.get("question", ""), answer=f.get("answer", "")) for f in faqs_raw]
    except (json.JSONDecodeError, TypeError):
        return FAQResponse(doc_id=doc_id, doc_name=doc_name, status="error")

    result = FAQResponse(doc_id=doc_id, doc_name=doc_name, faqs=faqs, status="completed")

    # Cache result
    save_json(get_data_path("faqs", doc_id), result.model_dump())
    return result


def get_cached_faqs(doc_id: str) -> FAQResponse | None:
    """Get cached FAQ result."""
    data = load_json(get_data_path("faqs", doc_id))
    if data:
        return FAQResponse(**data)
    return None
