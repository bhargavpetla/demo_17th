import json
import traceback
from app.services.llm_service import call_llm
from app.services.pdf_processor import extract_full_text
from app.models.faq import FAQItem, FAQResponse
from app.utils.prompts import FAQ_PROMPT
from app.utils.file_utils import save_json, load_json, get_data_path


def set_faq_status(doc_id: str, doc_name: str, status: str):
    """Save a status-only FAQ entry (for generating/error states)."""
    result = FAQResponse(doc_id=doc_id, doc_name=doc_name, faqs=[], status=status)
    save_json(get_data_path("faqs", doc_id), result.model_dump())


def generate_faqs(doc_id: str, doc_name: str, pdf_path: str) -> FAQResponse:
    """Generate 20 investor FAQs for a document using GPT-4."""
    try:
        text = extract_full_text(pdf_path)
        if not text.strip():
            result = FAQResponse(doc_id=doc_id, doc_name=doc_name, status="error")
            save_json(get_data_path("faqs", doc_id), result.model_dump())
            return result

        if len(text) > 100000:
            text = text[:100000]

        prompt = FAQ_PROMPT.format(document_text=text)
        response = call_llm(prompt, json_mode=True)

        try:
            data = json.loads(response)
            # Handle all possible GPT response formats
            if isinstance(data, list):
                faqs_raw = data
            elif isinstance(data, dict):
                faqs_raw = data.get("faqs", data.get("questions", data.get("items", [])))
                # If GPT returned a single FAQ object instead of array
                if not faqs_raw and "question" in data and "answer" in data:
                    faqs_raw = [data]
            else:
                faqs_raw = []

            faqs = [FAQItem(question=f.get("question", ""), answer=f.get("answer", "")) for f in faqs_raw if isinstance(f, dict)]
        except (json.JSONDecodeError, TypeError) as e:
            print(f"FAQ parse error for {doc_id}: {e}")
            print(f"Raw response: {response[:500]}")
            result = FAQResponse(doc_id=doc_id, doc_name=doc_name, status="error")
            save_json(get_data_path("faqs", doc_id), result.model_dump())
            return result

        result = FAQResponse(doc_id=doc_id, doc_name=doc_name, faqs=faqs, status="completed")
        save_json(get_data_path("faqs", doc_id), result.model_dump())
        return result
    except Exception as e:
        print(f"FAQ generation failed for {doc_id}: {traceback.format_exc()}")
        result = FAQResponse(doc_id=doc_id, doc_name=doc_name, status="error")
        save_json(get_data_path("faqs", doc_id), result.model_dump())
        return result


def get_cached_faqs(doc_id: str) -> FAQResponse | None:
    """Get cached FAQ result."""
    data = load_json(get_data_path("faqs", doc_id))
    if data:
        faq = FAQResponse(**data)
        # Don't return "generating" status as cached — let the route handle that
        if faq.status == "generating":
            return None
        return faq
    return None
