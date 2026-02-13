import json
from datetime import datetime
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.models.qa import QARequest, QAResponse, QAHistoryItem
from app.services.rag_service import answer_question, answer_question_streaming, generate_suggested_questions
from app.utils.file_utils import save_json, load_json, generate_doc_id

router = APIRouter(prefix="/qa", tags=["qa"])

QA_HISTORY_PATH = "data/qa_history.json"
SESSIONS_PATH = "data/qa_sessions.json"


def _load_sessions() -> list[dict]:
    data = load_json(SESSIONS_PATH)
    return data if isinstance(data, list) else []


def _save_sessions(sessions: list[dict]):
    save_json(SESSIONS_PATH, sessions)


@router.post("/ask", response_model=QAResponse)
async def ask_question(request: QARequest):
    """Ask a question across all uploaded documents."""
    result = answer_question(request.question, request.doc_ids)

    history = load_json(QA_HISTORY_PATH) or []
    history.append({
        "id": generate_doc_id(),
        "question": result.question,
        "answer": result.answer,
        "sources": [s.model_dump() for s in result.sources],
        "asked_at": datetime.now().isoformat(),
    })
    save_json(QA_HISTORY_PATH, history)

    return result


@router.post("/ask/stream")
async def ask_question_streaming_endpoint(request: QARequest):
    """Ask a question with streaming response."""
    def event_stream():
        for event in answer_question_streaming(request.question, request.doc_ids):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/history", response_model=list[QAHistoryItem])
async def get_qa_history():
    """Get Q&A history."""
    history = load_json(QA_HISTORY_PATH) or []
    return [QAHistoryItem(**h) for h in history[-50:]]


@router.get("/suggested-questions")
async def get_suggested_questions():
    """Generate suggested questions based on uploaded documents."""
    questions = generate_suggested_questions()
    return {"questions": questions}


@router.post("/sessions")
async def create_session():
    """Create a new chat session."""
    sessions = _load_sessions()
    session = {
        "id": generate_doc_id(),
        "title": "New Chat",
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "messages": [],
    }
    sessions.insert(0, session)
    _save_sessions(sessions)
    return session


@router.get("/sessions")
async def list_sessions():
    """List all chat sessions."""
    sessions = _load_sessions()
    return [
        {
            "id": s["id"],
            "title": s["title"],
            "created_at": s["created_at"],
            "updated_at": s["updated_at"],
            "message_count": len(s.get("messages", [])),
        }
        for s in sessions
    ]


@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Get a specific session with messages."""
    sessions = _load_sessions()
    for s in sessions:
        if s["id"] == session_id:
            return s
    return {"error": "Session not found"}


@router.post("/sessions/{session_id}/messages")
async def add_session_message(session_id: str, message: dict):
    """Add a message to a session."""
    sessions = _load_sessions()
    for s in sessions:
        if s["id"] == session_id:
            s["messages"].append(message)
            if len(s["messages"]) == 1 and message.get("role") == "user":
                title = message["content"][:50]
                if len(message["content"]) > 50:
                    title += "..."
                s["title"] = title
            s["updated_at"] = datetime.now().isoformat()
            _save_sessions(sessions)
            return {"status": "ok"}
    return {"error": "Session not found"}


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a chat session."""
    sessions = _load_sessions()
    sessions = [s for s in sessions if s["id"] != session_id]
    _save_sessions(sessions)
    return {"message": "Session deleted"}
