import os
import shutil
import json
import asyncio
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse
from app.config import UPLOAD_DIR, DEMO_DOCS_DIR, MAX_FILE_SIZE_MB
from app.models.document import DocumentMetadata, DocumentListResponse
from app.services.pdf_processor import extract_text_with_pages, get_page_count
from app.services.vector_service import add_document_to_store, delete_document_from_store
from app.services.extraction_service import extract_document
from app.utils.file_utils import generate_doc_id, save_json, load_json, ensure_dirs

router = APIRouter(prefix="/documents", tags=["documents"])

DOCS_STORE_PATH = "data/documents.json"

# Progress tracking for SSE
_progress_store: dict[str, list[dict]] = {}


def _load_docs() -> dict[str, dict]:
    data = load_json(DOCS_STORE_PATH)
    return data or {}


def _save_docs(docs: dict[str, dict]):
    save_json(DOCS_STORE_PATH, docs)


def _emit_progress(doc_id: str, step: str, status: str, detail: str = "", progress: int = 0):
    """Store a progress event for a document."""
    if doc_id not in _progress_store:
        _progress_store[doc_id] = []
    _progress_store[doc_id].append({
        "doc_id": doc_id,
        "step": step,
        "status": status,
        "detail": detail,
        "progress": progress,
        "timestamp": datetime.now().isoformat(),
    })


def _process_document(doc_id: str, filepath: str, filename: str):
    """Background task: extract text, chunk, embed, store in ChromaDB, and run extraction."""
    docs = _load_docs()
    try:
        docs[doc_id]["status"] = "processing"
        _save_docs(docs)

        # Step 1: Extract text
        _emit_progress(doc_id, "text_extraction", "started", f"Extracting text from {filename}...", 10)
        pages = extract_text_with_pages(filepath)
        page_count = len(pages)
        _emit_progress(doc_id, "text_extraction", "completed", f"Extracted text from {page_count} pages", 25)

        # Step 2: Chunking & embedding
        _emit_progress(doc_id, "embedding", "started", "Chunking text and generating embeddings...", 30)
        add_document_to_store(doc_id, filename, pages)
        _emit_progress(doc_id, "embedding", "completed", "Document indexed in vector database", 60)

        # Step 3: AI extraction
        _emit_progress(doc_id, "ai_extraction", "started", "Running AI analysis to extract key data...", 65)
        extract_document(doc_id, filepath)
        _emit_progress(doc_id, "ai_extraction", "completed", "AI extraction complete", 95)

        # Step 4: Done
        docs = _load_docs()
        docs[doc_id]["status"] = "processed"
        docs[doc_id]["page_count"] = page_count
        _save_docs(docs)
        _emit_progress(doc_id, "done", "completed", "Document fully processed!", 100)
    except Exception as e:
        docs = _load_docs()
        docs[doc_id]["status"] = "error"
        docs[doc_id]["error_message"] = str(e)
        _save_docs(docs)
        _emit_progress(doc_id, "error", "error", str(e), 0)


def _process_documents_parallel(doc_tasks: list[tuple[str, str, str]]):
    """Process multiple documents in parallel using threads."""
    with ThreadPoolExecutor(max_workers=min(len(doc_tasks), 5)) as executor:
        futures = []
        for doc_id, filepath, filename in doc_tasks:
            futures.append(executor.submit(_process_document, doc_id, filepath, filename))
        for f in futures:
            f.result()


@router.post("/upload", response_model=list[DocumentMetadata])
async def upload_documents(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
):
    """Upload one or more PDF documents."""
    ensure_dirs()
    results = []
    doc_tasks = []

    for file in files:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(400, f"Only PDF files are supported. Got: {file.filename}")

        content = await file.read()
        size_mb = len(content) / (1024 * 1024)
        if size_mb > MAX_FILE_SIZE_MB:
            raise HTTPException(400, f"File {file.filename} exceeds {MAX_FILE_SIZE_MB}MB limit")

        doc_id = generate_doc_id()
        safe_filename = file.filename.replace(" ", "_")
        filepath = os.path.join(UPLOAD_DIR, f"{doc_id}_{safe_filename}")

        with open(filepath, "wb") as f:
            f.write(content)

        doc_meta = DocumentMetadata(
            id=doc_id,
            filename=f"{doc_id}_{safe_filename}",
            original_filename=file.filename,
            file_size=len(content),
            status="uploaded",
            upload_date=datetime.now().isoformat(),
        )

        docs = _load_docs()
        docs[doc_id] = doc_meta.model_dump()
        _save_docs(docs)

        _emit_progress(doc_id, "upload", "completed", f"File uploaded: {file.filename}", 5)
        doc_tasks.append((doc_id, filepath, file.filename))
        results.append(doc_meta)

    if doc_tasks:
        background_tasks.add_task(_process_documents_parallel, doc_tasks)

    return results


@router.get("", response_model=DocumentListResponse)
async def list_documents():
    """List all uploaded documents."""
    docs = _load_docs()
    doc_list = [DocumentMetadata(**d) for d in docs.values()]
    doc_list.sort(key=lambda d: d.upload_date, reverse=True)
    return DocumentListResponse(documents=doc_list, total=len(doc_list))


@router.get("/progress/stream")
async def stream_progress():
    """SSE endpoint to stream processing progress for all documents."""
    async def event_stream():
        sent_counts: dict[str, int] = {}
        idle_count = 0
        while True:
            has_new = False
            for doc_id, events in list(_progress_store.items()):
                start = sent_counts.get(doc_id, 0)
                if start < len(events):
                    for event in events[start:]:
                        yield f"data: {json.dumps(event)}\n\n"
                        has_new = True
                    sent_counts[doc_id] = len(events)

            if has_new:
                idle_count = 0
            else:
                idle_count += 1

            if idle_count > 300:
                break

            await asyncio.sleep(1)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{doc_id}", response_model=DocumentMetadata)
async def get_document(doc_id: str):
    """Get a specific document's metadata."""
    docs = _load_docs()
    if doc_id not in docs:
        raise HTTPException(404, "Document not found")
    return DocumentMetadata(**docs[doc_id])


@router.delete("/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document and its data."""
    docs = _load_docs()
    if doc_id not in docs:
        raise HTTPException(404, "Document not found")

    delete_document_from_store(doc_id)

    filepath = os.path.join(UPLOAD_DIR, docs[doc_id]["filename"])
    if os.path.exists(filepath):
        os.remove(filepath)

    del docs[doc_id]
    _save_docs(docs)

    for subdir in ["extractions", "faqs"]:
        path = os.path.join("data", subdir, f"{doc_id}.json")
        if os.path.exists(path):
            os.remove(path)

    _progress_store.pop(doc_id, None)

    return {"message": "Document deleted"}


@router.post("/demo/load", response_model=list[DocumentMetadata])
async def load_demo_documents(background_tasks: BackgroundTasks):
    """Load the 5 demo VC memo documents."""
    ensure_dirs()
    results = []
    doc_tasks = []

    if not os.path.exists(DEMO_DOCS_DIR):
        raise HTTPException(404, "Demo documents directory not found")

    pdf_files = [f for f in os.listdir(DEMO_DOCS_DIR) if f.endswith(".pdf")]
    if not pdf_files:
        raise HTTPException(404, "No demo documents found")

    for filename in sorted(pdf_files):
        src_path = os.path.join(DEMO_DOCS_DIR, filename)
        doc_id = generate_doc_id()
        dest_path = os.path.join(UPLOAD_DIR, f"{doc_id}_{filename}")
        shutil.copy2(src_path, dest_path)

        file_size = os.path.getsize(src_path)
        doc_meta = DocumentMetadata(
            id=doc_id,
            filename=f"{doc_id}_{filename}",
            original_filename=filename,
            file_size=file_size,
            status="uploaded",
            upload_date=datetime.now().isoformat(),
        )

        docs = _load_docs()
        docs[doc_id] = doc_meta.model_dump()
        _save_docs(docs)

        _emit_progress(doc_id, "upload", "completed", f"Demo file loaded: {filename}", 5)
        doc_tasks.append((doc_id, dest_path, filename))
        results.append(doc_meta)

    if doc_tasks:
        background_tasks.add_task(_process_documents_parallel, doc_tasks)

    return results
