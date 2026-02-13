from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DocumentMetadata(BaseModel):
    id: str
    filename: str
    original_filename: str
    file_size: int
    page_count: int = 0
    status: str = "uploaded"  # uploaded, processing, processed, error
    upload_date: str = ""
    error_message: Optional[str] = None


class DocumentListResponse(BaseModel):
    documents: list[DocumentMetadata]
    total: int


class PageContent(BaseModel):
    page_number: int
    text: str
