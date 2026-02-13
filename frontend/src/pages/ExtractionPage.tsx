import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Users, DollarSign, TrendingUp, Loader2, GitCompare, MessageSquare, RefreshCw, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { listDocuments, getAllExtractions, streamProgress } from '../api/client';
import { useDocumentStore } from '../store/documentStore';
import type { ExtractionResult } from '../types';

interface ProgressEvent {
  doc_id: string;
  step: string;
  status: string;
  detail: string;
  progress: number;
}

const STEP_LABELS: Record<string, string> = {
  upload: 'File Uploaded',
  text_extraction: 'Extracting Text',
  embedding: 'Generating Embeddings',
  ai_extraction: 'AI Analysis',
  done: 'Complete',
  error: 'Error',
};

export default function ExtractionPage() {
  const navigate = useNavigate();
  const { documents, setDocuments, extractions, setExtractions } = useDocumentStore();
  const [loading, setLoading] = useState(true);
  const [progressMap, setProgressMap] = useState<Record<string, ProgressEvent[]>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [docsRes, extractionsRes] = await Promise.all([
        listDocuments(),
        getAllExtractions(),
      ]);
      setDocuments(docsRes.documents);
      setExtractions(extractionsRes);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to progress events
    const cleanup = streamProgress((event) => {
      setProgressMap(prev => {
        const docEvents = prev[event.doc_id] || [];
        return { ...prev, [event.doc_id]: [...docEvents, event] };
      });

      // Refresh data when a document finishes processing
      if (event.step === 'done' || event.step === 'error') {
        setTimeout(fetchData, 500);
      }
    });

    // Also poll for updates
    const interval = setInterval(async () => {
      const extractionsRes = await getAllExtractions();
      setExtractions(extractionsRes);
      const docsRes = await listDocuments();
      setDocuments(docsRes.documents);
    }, 5000);

    return () => {
      cleanup();
      clearInterval(interval);
    };
  }, []);

  const completedExtractions = extractions.filter(e => e.status === 'completed');
  const processingCount = documents.filter(d => d.status === 'processing' || d.status === 'uploaded').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Documents Yet</h2>
        <p className="text-gray-500 mb-6">Upload investment memos to see extraction results.</p>
        <button
          onClick={() => navigate('/')}
          className="bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          Upload Documents
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Extraction Results</h1>
          <p className="text-gray-500 mt-1">
            {completedExtractions.length} of {documents.length} documents processed
            {processingCount > 0 && (
              <span className="text-primary-500 ml-2">
                ({processingCount} processing...)
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 text-gray-600 bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => navigate('/comparison')}
            disabled={completedExtractions.length < 2}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            <GitCompare className="w-4 h-4" />
            Compare
          </button>
          <button
            onClick={() => navigate('/qa')}
            disabled={completedExtractions.length === 0}
            className="flex items-center gap-2 bg-white text-primary-600 border border-primary-300 px-4 py-2 rounded-lg font-medium hover:bg-primary-50 disabled:opacity-50 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Ask Questions
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {extractions.map((ext) => (
          <DocumentCard key={ext.doc_id} extraction={ext} progress={progressMap[ext.doc_id] || []} />
        ))}
      </div>
    </div>
  );
}

function DocumentCard({ extraction, progress }: { extraction: ExtractionResult; progress: ProgressEvent[] }) {
  const isProcessing = extraction.status !== 'completed';

  // Determine current step from progress events
  const latestEvent = progress.length > 0 ? progress[progress.length - 1] : null;
  const currentProgress = latestEvent?.progress || 0;

  const steps = ['upload', 'text_extraction', 'embedding', 'ai_extraction', 'done'];

  if (isProcessing) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
          <span className="text-sm font-medium text-primary-600">
            {latestEvent ? latestEvent.detail : 'Queued for processing...'}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
          <div
            className="bg-primary-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${currentProgress}%` }}
          />
        </div>

        {/* Step-by-step breakdown */}
        <div className="space-y-2">
          {steps.map((step) => {
            const stepEvents = progress.filter(e => e.step === step);
            const isCompleted = stepEvents.some(e => e.status === 'completed');
            const isStarted = stepEvents.some(e => e.status === 'started');
            const isError = stepEvents.some(e => e.status === 'error');

            return (
              <div key={step} className="flex items-center gap-2">
                {isError ? (
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                ) : isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                ) : isStarted ? (
                  <Loader2 className="w-4 h-4 text-primary-500 animate-spin shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-300 shrink-0" />
                )}
                <span className={`text-xs ${isCompleted ? 'text-green-600' : isStarted ? 'text-primary-600' : 'text-gray-400'}`}>
                  {STEP_LABELS[step] || step}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow animate-fade-in">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">{extraction.company_name || 'Unknown'}</h3>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{extraction.pitch}</p>
      </div>

      <div className="space-y-3">
        {extraction.founders.length > 0 && (
          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <p className="text-sm text-gray-600">
              {extraction.founders.map(f => f.name).join(', ')}
            </p>
          </div>
        )}

        {extraction.ask.amount && (
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-500 shrink-0" />
            <p className="text-sm text-gray-600">
              Ask: <span className="font-medium">{extraction.ask.amount}</span>
            </p>
          </div>
        )}

        {extraction.financials.revenue && (
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500 shrink-0" />
            <p className="text-sm text-gray-600">
              Revenue: <span className="font-medium">{extraction.financials.revenue}</span>
            </p>
          </div>
        )}

        {extraction.tam.total_addressable_market && (
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-500 shrink-0" />
            <p className="text-sm text-gray-600">
              TAM: <span className="font-medium">{extraction.tam.total_addressable_market}</span>
            </p>
          </div>
        )}
      </div>

      {extraction.risks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-400 uppercase mb-2">Key Risks</p>
          <div className="flex flex-wrap gap-1">
            {extraction.risks.slice(0, 3).map((risk, i) => (
              <span
                key={i}
                className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full"
              >
                {risk.length > 30 ? risk.slice(0, 30) + '...' : risk}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
