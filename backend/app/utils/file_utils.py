import os
import uuid
import json
from app.config import UPLOAD_DIR


def ensure_dirs():
    """Ensure required directories exist."""
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs("chroma_db", exist_ok=True)
    os.makedirs("data", exist_ok=True)


def generate_doc_id() -> str:
    return str(uuid.uuid4())[:8]


def get_upload_path(doc_id: str, filename: str) -> str:
    return os.path.join(UPLOAD_DIR, f"{doc_id}_{filename}")


def save_json(filepath: str, data: dict):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)


def load_json(filepath: str) -> dict | None:
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            return json.load(f)
    return None


def get_data_path(category: str, doc_id: str) -> str:
    return os.path.join("data", category, f"{doc_id}.json")
