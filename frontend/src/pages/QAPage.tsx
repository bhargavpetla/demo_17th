import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, FileText, Plus, Trash2, MessageSquare, ChevronLeft, ChevronRight, Paperclip, Mic } from 'lucide-react';
import { askQuestionStreaming, listDocuments, listSessions, createSession, getSession, addSessionMessage, deleteSession, getSuggestedQuestions } from '../api/client';
import type { ProvenanceSource, DocumentMetadata } from '../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: ProvenanceSource[];
  loading?: boolean;
}

interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

const QUICK_ACTIONS = [
  { title: 'Analyze Data', desc: 'Get insights from your documents' },
  { title: 'Compare Companies', desc: 'Side-by-side analysis' },
  { title: 'Brainstorm Ideas', desc: 'Explore creative solutions' },
  { title: 'Learn Something New', desc: 'Ask questions and discover' },
];

function formatMarkdown(text: string): string {
  let html = text;
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');
  // Headers
  html = html.replace(/^### (.*$)/gm, '<h3 class="text-base font-bold mt-3 mb-1">$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2 class="text-lg font-bold mt-4 mb-1">$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>');
  // Bullet points
  html = html.replace(/^[•\-]\s+(.*$)/gm, '<li class="ml-4 list-disc">$1</li>');
  // Numbered lists
  html = html.replace(/^\d+\.\s+(.*$)/gm, '<li class="ml-4 list-decimal">$1</li>');
  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul class="space-y-1 my-2">$1</ul>');
  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p class="mb-2">');
  html = html.replace(/\n/g, '<br/>');
  html = `<p class="mb-2">${html}</p>`;
  // Citations
  html = html.replace(/\[(.*?),\s*Page?\s*(\d+)\]/g, '<span class="inline-flex items-center gap-0.5 text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md font-medium">$1, p.$2</span>');
  return html;
}

export default function QAPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    loadSessions();
    loadDocuments();
    loadSuggestedQuestions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await listSessions();
      setSessions(data);
    } catch { /* ignore */ }
  };

  const loadDocuments = async () => {
    try {
      const data = await listDocuments();
      setDocuments(data.documents.filter(d => d.status === 'processed'));
    } catch { /* ignore */ }
  };

  const loadSuggestedQuestions = async () => {
    try {
      const data = await getSuggestedQuestions();
      setSuggestedQuestions(data);
    } catch { /* ignore */ }
  };

  const handleNewSession = async () => {
    try {
      const session = await createSession();
      setSessions(prev => [{ ...session, updated_at: session.created_at, message_count: 0 }, ...prev]);
      setCurrentSessionId(session.id);
      setMessages([]);
    } catch { /* ignore */ }
  };

  const handleSelectSession = async (sessionId: string) => {
    try {
      setCurrentSessionId(sessionId);
      const session = await getSession(sessionId);
      if (session.messages) {
        setMessages(session.messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          sources: m.sources as ProvenanceSource[] | undefined,
          loading: false,
        })));
      }
    } catch { /* ignore */ }
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      await deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    } catch { /* ignore */ }
  };

  const handleAsk = async (question: string) => {
    if (!question.trim() || isStreaming) return;

    let sessionId = currentSessionId;
    if (!sessionId) {
      try {
        const session = await createSession();
        sessionId = session.id;
        setCurrentSessionId(session.id);
        setSessions(prev => [{ ...session, updated_at: session.created_at, message_count: 0 }, ...prev]);
      } catch { /* ignore */ }
    }

    const userMsg: Message = { role: 'user', content: question };
    const assistantMsg: Message = { role: 'assistant', content: '', loading: true };
    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');

    if (sessionId) {
      addSessionMessage(sessionId, { role: 'user', content: question }).catch(() => {});
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    let fullAnswer = '';
    setIsStreaming(true);

    try {
      await askQuestionStreaming(
        question,
        null,
        (token) => {
          fullAnswer += token;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: fullAnswer, loading: true };
            return updated;
          });
        },
        (sources) => {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: 'assistant',
              content: fullAnswer,
              sources,
              loading: false,
            };
            return updated;
          });
          if (sessionId) {
            addSessionMessage(sessionId, { role: 'assistant', content: fullAnswer, sources }).catch(() => {});
          }
          setSessions(prev => prev.map(s =>
            s.id === sessionId
              ? { ...s, title: question.length > 50 ? question.slice(0, 50) + '...' : question, message_count: s.message_count + 2 }
              : s
          ));
        },
        () => {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = { ...last, loading: false };
            return updated;
          });
          setIsStreaming(false);
        },
      );
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          loading: false,
        };
        return updated;
      });
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk(input);
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-white border-r border-gray-200 flex flex-col overflow-hidden shrink-0`}>
        <div className="p-3 border-b border-gray-100">
          <button
            onClick={handleNewSession}
            className="w-full flex items-center gap-2 px-3 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">History</p>
          </div>
          {sessions.length === 0 ? (
            <p className="text-xs text-gray-400 px-3">No conversations yet</p>
          ) : (
            sessions.map(session => (
              <button
                key={session.id}
                onClick={() => handleSelectSession(session.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors group ${
                  currentSessionId === session.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate flex-1">{session.title}</span>
                <Trash2
                  className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 shrink-0"
                  onClick={(e) => handleDeleteSession(e, session.id)}
                />
              </button>
            ))
          )}
        </div>

        {/* Uploaded Documents */}
        <div className="border-t border-gray-100">
          <div className="px-3 py-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Documents</p>
          </div>
          <div className="px-3 pb-3 space-y-1 max-h-48 overflow-y-auto">
            {documents.length === 0 ? (
              <p className="text-xs text-gray-400">No documents uploaded</p>
            ) : (
              documents.map(doc => (
                <div key={doc.id} className="flex items-center gap-2 text-xs text-gray-600 py-1">
                  <FileText className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                  <span className="truncate">{doc.original_filename}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute z-10 bg-white border border-gray-200 rounded-r-lg p-1 hover:bg-gray-50 transition-colors"
        style={{ left: sidebarOpen ? '256px' : '0', top: 'calc(50% + 32px)' }}
      >
        {sidebarOpen ? <ChevronLeft className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
      </button>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto">
            {messages.length === 0 && (
              <div className="text-center py-16 animate-fade-in">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">What's the Move</h1>

                <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto mb-8">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.title}
                      onClick={() => handleAsk(action.desc)}
                      className="text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-primary-300 hover:shadow-sm transition-all"
                    >
                      <p className="text-sm font-semibold text-gray-800">{action.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{action.desc}</p>
                    </button>
                  ))}
                </div>

                {suggestedQuestions.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
                    {suggestedQuestions.map((q) => (
                      <button
                        key={q}
                        onClick={() => handleAsk(q)}
                        className="text-sm bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-full hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-3 animate-fade-in ${
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div
                      className="text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                  )}

                  {msg.loading && !msg.content && (
                    <div className="flex gap-1 py-1">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </div>
                  )}

                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-400 mb-2">Sources</p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((s, j) => (
                          <span
                            key={j}
                            className="inline-flex items-center gap-1 text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded-md"
                            title={s.snippet}
                          >
                            <FileText className="w-3 h-3" />
                            {s.doc_name}, p.{s.page}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="px-4 pb-4">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white border border-gray-200 rounded-2xl p-3 flex items-end gap-2 shadow-sm">
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                <Paperclip className="w-5 h-5" />
              </button>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything"
                rows={1}
                className="flex-1 resize-none border-0 bg-transparent px-1 py-1.5 text-sm focus:outline-none text-gray-800 placeholder-gray-400"
                style={{ maxHeight: '120px' }}
              />
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                <Mic className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleAsk(input)}
                disabled={!input.trim() || isStreaming}
                className="p-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                {isStreaming ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-2">
              Enterprise data or AI innovation — every source tracked.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
