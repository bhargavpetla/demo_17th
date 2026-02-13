# VC Investment Memo Analyzer

AI-powered tool for venture capital professionals to upload, extract, compare, and analyze investment memos.

## Features

- **Document Upload**: Drag & drop PDF upload with batch support (up to 20MB per file)
- **AI Extraction**: Automatically extracts company name, founders, financials, TAM, traction, competitors, funding ask, and risks
- **Side-by-Side Comparison**: Compare multiple investment memos across all key fields with sorting and CSV export
- **Multi-Document Q&A**: Ask questions across all documents with AI-powered answers and source citations (Notebook LM style)
- **Investor FAQ**: Auto-generate 20 investor questions and answers for each memo
- **5 Demo Documents**: Pre-built realistic VC memos for instant demo

## Tech Stack

- **Backend**: Python FastAPI + OpenAI GPT-4 + ChromaDB
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Deployment**: Docker Compose

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- OpenAI API key

### 1. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 3. Open the App

Visit `http://localhost:5173` in your browser.

### Docker Deployment

```bash
# Set your OpenAI API key
export OPENAI_API_KEY=sk-your-key-here

# Build and run
docker-compose up --build

# Open http://localhost:3000
```

## Demo Workflow

1. **Upload**: Click "Load Demo Documents" to load 5 sample VC memos, or upload your own PDFs
2. **Extract**: View AI-extracted structured data for each company
3. **Compare**: Side-by-side comparison table across all key investment fields
4. **Q&A**: Ask questions like "Which company has the highest revenue?" with cited answers
5. **FAQ**: Generate 20 investor questions and answers for any document

## API Documentation

With the backend running, visit `http://localhost:8000/docs` for interactive API documentation.
