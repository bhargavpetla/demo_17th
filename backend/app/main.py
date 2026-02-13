from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import documents, extraction, comparison, qa, faq
from app.utils.file_utils import ensure_dirs

app = FastAPI(
    title="VC Document Analyzer",
    description="AI-powered VC investment memo analysis, comparison, and Q&A",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router, prefix="/api/v1")
app.include_router(extraction.router, prefix="/api/v1")
app.include_router(comparison.router, prefix="/api/v1")
app.include_router(qa.router, prefix="/api/v1")
app.include_router(faq.router, prefix="/api/v1")


@app.on_event("startup")
async def startup():
    ensure_dirs()


@app.get("/api/v1/health")
async def health_check():
    return {"status": "healthy", "service": "vc-document-analyzer"}
