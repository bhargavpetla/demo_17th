import axios from 'axios';
import type { DocumentMetadata, ExtractionResult, QAResponse, QAHistoryItem, FAQResponse } from '../types';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120000,
});

// Documents
export async function uploadDocuments(files: File[]): Promise<DocumentMetadata[]> {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  const { data } = await api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function listDocuments(): Promise<{ documents: DocumentMetadata[]; total: number }> {
  const { data } = await api.get('/documents');
  return data;
}

export async function deleteDocument(docId: string): Promise<void> {
  await api.delete(`/documents/${docId}`);
}

export async function loadDemoDocuments(): Promise<DocumentMetadata[]> {
  const { data } = await api.post('/documents/demo/load');
  return data;
}

// Extraction
export async function getAllExtractions(): Promise<ExtractionResult[]> {
  const { data } = await api.get('/extraction/results');
  return data;
}

// Comparison
export async function getComparisonData(): Promise<ExtractionResult[]> {
  const { data } = await api.get('/comparison/documents');
  return data;
}

// Q&A
export async function askQuestion(question: string, docIds?: string[]): Promise<QAResponse> {
  const { data } = await api.post('/qa/ask', { question, doc_ids: docIds || null });
  return data;
}

export async function askQuestionStreaming(
  question: string,
  docIds: string[] | null,
  onToken: (token: string) => void,
  onSources: (sources: QAResponse['sources']) => void,
  onDone: () => void,
) {
  const response = await fetch(`${API_BASE}/qa/ask/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, doc_ids: docIds }),
  });

  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === 'answer') onToken(event.data);
          else if (event.type === 'sources') onSources(event.data);
          else if (event.type === 'done') onDone();
        } catch { /* skip malformed events */ }
      }
    }
  }
}

export async function getQAHistory(): Promise<QAHistoryItem[]> {
  const { data } = await api.get('/qa/history');
  return data;
}

export async function getSuggestedQuestions(): Promise<string[]> {
  const { data } = await api.get('/qa/suggested-questions');
  return data.questions || [];
}

// Sessions
export async function createSession(): Promise<{ id: string; title: string; created_at: string }> {
  const { data } = await api.post('/qa/sessions');
  return data;
}

export async function listSessions(): Promise<Array<{ id: string; title: string; created_at: string; updated_at: string; message_count: number }>> {
  const { data } = await api.get('/qa/sessions');
  return data;
}

export async function getSession(sessionId: string): Promise<{ id: string; title: string; messages: Array<{ role: string; content: string; sources?: any[] }> }> {
  const { data } = await api.get(`/qa/sessions/${sessionId}`);
  return data;
}

export async function addSessionMessage(sessionId: string, message: { role: string; content: string; sources?: any[] }): Promise<void> {
  await api.post(`/qa/sessions/${sessionId}/messages`, message);
}

export async function deleteSession(sessionId: string): Promise<void> {
  await api.delete(`/qa/sessions/${sessionId}`);
}

// FAQ
export async function generateFAQs(docId: string): Promise<FAQResponse> {
  const { data } = await api.post(`/faq/generate/${docId}`);
  return data;
}

export async function getFAQs(docId: string): Promise<FAQResponse> {
  const { data } = await api.get(`/faq/get/${docId}`);
  return data;
}

// Progress streaming
export function streamProgress(onEvent: (event: { doc_id: string; step: string; status: string; detail: string; progress: number }) => void): () => void {
  const eventSource = new EventSource(`${API_BASE}/documents/progress/stream`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onEvent(data);
    } catch { /* skip */ }
  };

  eventSource.onerror = () => {
    // Reconnect handled by EventSource
  };

  return () => eventSource.close();
}
