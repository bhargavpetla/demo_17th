from pydantic import BaseModel


class FAQItem(BaseModel):
    question: str
    answer: str


class FAQResponse(BaseModel):
    doc_id: str
    doc_name: str
    faqs: list[FAQItem] = []
    status: str = "pending"  # pending, generating, completed, error
