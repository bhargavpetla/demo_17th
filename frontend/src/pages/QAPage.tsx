import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, Loader2, FileText, Paperclip, Mic } from 'lucide-react';
import { askQuestionStreaming, getSession, addSessionMessage, createSession, getSuggestedQuestions } from '../api/client';
import type { ProvenanceSource } from '../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: ProvenanceSource[];
  loading?: boolean;
}

const QUICK_ACTIONS = [
  { title: 'Analyze Data', desc: 'Get insights from your documents' },
  { title: 'Compare Companies', desc: 'Side-by-side analysis' },
  { title: 'Brainstorm Ideas', desc: 'Explore creative solutions' },
  { title: 'Learn Something New', desc: 'Ask questions and discover' },
];

function formatMarkdown(text: string): string {
  let html = text;
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');
  html = html.replace(/^### (.*$)/gm, '<h3 class="text-base font-bold mt-3 mb-1">$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2 class="text-lg font-bold mt-4 mb-1">$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>');
  html = html.replace(/^[•\-]\s+(.*$)/gm, '<li class="ml-4 list-disc">$1</li>');
  html = html.replace(/^\d+\.\s+(.*$)/gm, '<li class="ml-4 list-decimal">$1</li>');
  html = html.replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul class="space-y-1 my-2">$1</ul>');
  html = html.replace(/\n\n/g, '</p><p class="mb-2">');
  html = html.replace(/\n/g, '<br/>');
  html = `<p class="mb-2">${html}</p>`;
  html = html.replace(/\[(.*?),\s*Page?\s*(\d+)\]/g, '<span class="inline-flex items-center gap-0.5 text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-md font-medium">$1, p.$2</span>');
  return html;
}

export default function QAPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    loadSuggestedQuestions();
  }, []);

  // Load session from URL param
  useEffect(() => {
    const sessionId = searchParams.get('session');
    if (sessionId && sessionId !== currentSessionId) {
      setCurrentSessionId(sessionId);
      loadSession(sessionId);
    } else if (!sessionId) {
      setCurrentSessionId(null);
      setMessages([]);
    }
  }, [searchParams]);

  const loadSession = async (sessionId: string) => {
    try {
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

  const loadSuggestedQuestions = async () => {
    try {
      const data = await getSuggestedQuestions();
      setSuggestedQuestions(data);
    } catch { /* ignore */ }
  };

  const ensureSession = async (): Promise<string> => {
    if (currentSessionId) return currentSessionId;
    try {
      const session = await createSession();
      setCurrentSessionId(session.id);
      setSearchParams({ session: session.id });
      // Refresh parent sidebar
      (window as any).__refreshSessions?.();
      return session.id;
    } catch {
      return '';
    }
  };

  const handleAsk = async (question: string) => {
    if (!question.trim() || isStreaming) return;

    const sessionId = await ensureSession();

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
          (window as any).__refreshSessions?.();
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
    <div className="flex-1 flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center py-20 animate-fade-in">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">What's the Move</h1>
              <p className="text-gray-400 mb-8">Ask anything about your investment memos</p>

              <div className="grid grid-cols-2 gap-3 max-w-md mx-auto mb-8">
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
                <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
                  {suggestedQuestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleAsk(q)}
                      className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700 transition-colors"
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

      {/* Input */}
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
  );
}
