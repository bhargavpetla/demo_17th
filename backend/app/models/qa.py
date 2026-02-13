from pydantic import BaseModel
from typing import Optional


class ProvenanceSource(BaseModel):
    doc_name: str
    page: int
    snippet: str


class QARequest(BaseModel):
    question: str
    doc_ids: Optional[list[str]] = None


class QAResponse(BaseModel):
    question: str
    answer: str
    sources: list[ProvenanceSource] = []


class QAHistoryItem(BaseModel):
    id: str
    question: str
    answer: str
    sources: list[ProvenanceSource] = []
    asked_at: str
