import { useState, useCallback, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { MessageSquare, FileText, GitCompare, HelpCircle, Upload, Plus, Trash2, Loader2, FolderOpen, X, BarChart3, ChevronDown, ChevronRight } from 'lucide-react';
import { uploadDocuments, loadDemoDocuments, listDocuments, deleteDocument, listSessions, createSession, deleteSession } from '../../api/client';
import type { DocumentMetadata } from '../../types';

interface Session {
  id: string;
  title: string;
  message_count: number;
}

const navItems = [
  { path: '/', label: 'Chat', icon: MessageSquare },
  { path: '/results', label: 'Results', icon: BarChart3 },
  { path: '/comparison', label: 'Compare', icon: GitCompare },
  { path: '/faq', label: 'FAQ', icon: HelpCircle },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [docsExpanded, setDocsExpanded] = useState(true);
  const [historyExpanded, setHistoryExpanded] = useState(true);

  useEffect(() => {
    loadDocuments();
    loadSessions();
  }, []);

  // Poll for document status updates when any doc is still processing/uploaded
  useEffect(() => {
    const hasProcessing = documents.some(d => d.status === 'uploaded' || d.status === 'processing');
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      loadDocuments();
    }, 2000);
    return () => clearInterval(interval);
  }, [documents]);

  const loadDocuments = async () => {
    try {
      const data = await listDocuments();
      setDocuments(data.documents);
    } catch { /* ignore */ }
  };

  const loadSessions = async () => {
    try {
      const data = await listSessions();
      setSessions(data);
    } catch { /* ignore */ }
  };

  // Expose refresh functions via window for child components
  useEffect(() => {
    (window as any).__refreshDocs = loadDocuments;
    (window as any).__refreshSessions = loadSessions;
    (window as any).__sessions = sessions;
    (window as any).__setSessions = setSessions;
    return () => {
      delete (window as any).__refreshDocs;
      delete (window as any).__refreshSessions;
      delete (window as any).__sessions;
      delete (window as any).__setSessions;
    };
  }, [sessions]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    setFiles(prev => [...prev, ...pdfFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 20 * 1024 * 1024,
  });

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      await uploadDocuments(files);
      setFiles([]);
      setShowUpload(false);
      loadDocuments();
      navigate('/results');
    } catch { /* ignore */ }
    setUploading(false);
  };

  const handleLoadDemo = async () => {
    setLoadingDemo(true);
    try {
      await loadDemoDocuments();
      setShowUpload(false);
      loadDocuments();
      navigate('/results');
    } catch { /* ignore */ }
    setLoadingDemo(false);
  };

  const handleDeleteDoc = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    try {
      await deleteDocument(docId);
      loadDocuments();
    } catch { /* ignore */ }
  };

  const handleNewChat = async () => {
    try {
      const session = await createSession();
      setSessions(prev => [{ id: session.id, title: session.title, message_count: 0 }, ...prev]);
      navigate('/?session=' + session.id);
    } catch { /* ignore */ }
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      await deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch { /* ignore */ }
  };

  const processedCount = documents.filter(d => d.status === 'processed').length;
  const processingCount = documents.filter(d => d.status === 'processing' || d.status === 'uploaded').length;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-4 py-3 border-b border-gray-100">
          <Link to="/" className="no-underline">
            <img src="/NSOffice Logo - Dark-Vps2lMvs.png" alt="NSOffice.AI" className="h-6" />
          </Link>
        </div>

        {/* New Chat + Upload */}
        <div className="p-3 space-y-2">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="w-full flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload Documents
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-3 pb-2 space-y-0.5">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm no-underline transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1 overflow-y-auto px-3">
          {/* Chat History */}
          <div className="mb-3">
            <button onClick={() => setHistoryExpanded(!historyExpanded)} className="flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wider w-full py-1">
              {historyExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              History
            </button>
            {historyExpanded && (
              <div className="space-y-0.5 mt-1">
                {sessions.length === 0 ? (
                  <p className="text-xs text-gray-400 px-2">No conversations yet</p>
                ) : (
                  sessions.slice(0, 20).map(session => (
                    <button
                      key={session.id}
                      onClick={() => navigate('/?session=' + session.id)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs text-gray-600 hover:bg-gray-50 rounded transition-colors group"
                    >
                      <MessageSquare className="w-3 h-3 shrink-0" />
                      <span className="truncate flex-1">{session.title}</span>
                      <Trash2
                        className="w-3 h-3 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 shrink-0"
                        onClick={(e) => handleDeleteSession(e, session.id)}
                      />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Documents */}
          <div>
            <button onClick={() => setDocsExpanded(!docsExpanded)} className="flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wider w-full py-1">
              {docsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Documents ({processedCount})
              {processingCount > 0 && <Loader2 className="w-3 h-3 animate-spin ml-1 text-primary-500" />}
            </button>
            {docsExpanded && (
              <div className="space-y-0.5 mt-1">
                {documents.length === 0 ? (
                  <p className="text-xs text-gray-400 px-2">No documents</p>
                ) : (
                  documents.map(doc => (
                    <div key={doc.id} className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-600 rounded group hover:bg-gray-50">
                      <FileText className={`w-3 h-3 shrink-0 ${doc.status === 'processed' ? 'text-green-500' : doc.status === 'error' ? 'text-red-400' : 'text-gray-400'}`} />
                      <span className="truncate flex-1">{doc.original_filename}</span>
                      {doc.status === 'processing' && <Loader2 className="w-3 h-3 animate-spin text-primary-500 shrink-0" />}
                      <Trash2
                        className="w-3 h-3 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 shrink-0 cursor-pointer"
                        onClick={(e) => handleDeleteDoc(e, doc.id)}
                      />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* User */}
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
          VC Analyzer v1.0
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 flex flex-col">
        <Outlet />
      </main>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowUpload(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Upload Documents</h2>
              <button onClick={() => setShowUpload(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragActive ? 'text-primary-500' : 'text-gray-400'}`} />
              <p className="text-sm font-medium text-gray-700">{isDragActive ? 'Drop here' : 'Drag & drop PDFs'}</p>
              <p className="text-xs text-gray-500 mt-1">or click to browse</p>
            </div>

            {files.length > 0 && (
              <div className="mt-3 space-y-1">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary-500" />
                      <span className="text-gray-700 truncate">{file.name}</span>
                    </div>
                    <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={handleUpload}
                disabled={files.length === 0 || uploading}
                className="flex-1 flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors text-sm"
              >
                {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload</>}
              </button>
              <button
                onClick={handleLoadDemo}
                disabled={loadingDemo}
                className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors text-sm"
              >
                {loadingDemo ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</> : <><FolderOpen className="w-4 h-4" /> Demo Docs</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
