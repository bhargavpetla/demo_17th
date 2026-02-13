import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Loader2, RefreshCw, Search } from 'lucide-react';
import { listDocuments, getFAQs, generateFAQs } from '../api/client';
import type { DocumentMetadata, FAQItem, FAQResponse } from '../types';

export default function FAQPage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [faqData, setFaqData] = useState<FAQResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set([0, 1, 2]));

  useEffect(() => {
    listDocuments().then(res => {
      const processed = res.documents.filter(d => d.status === 'processed');
      setDocuments(processed);
      if (processed.length > 0) {
        setSelectedDocId(processed[0].id);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedDocId) return;
    setLoading(true);
    getFAQs(selectedDocId)
      .then(setFaqData)
      .catch(() => setFaqData(null))
      .finally(() => setLoading(false));
  }, [selectedDocId]);

  const handleGenerate = async () => {
    if (!selectedDocId) return;
    setGenerating(true);
    try {
      const result = await generateFAQs(selectedDocId);
      setFaqData(result);
      setExpandedIds(new Set([0, 1, 2]));
    } catch (err) {
      console.error('FAQ generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  const toggleExpand = (index: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const filteredFaqs = (faqData?.faqs || []).filter(
    f => !search || f.question.toLowerCase().includes(search.toLowerCase()) || f.answer.toLowerCase().includes(search.toLowerCase())
  );

  if (loading && documents.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Processed Documents</h2>
        <p className="text-gray-500 mb-6">Upload and process documents to generate FAQs.</p>
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Investor FAQ</h1>
          <p className="text-gray-500 mt-1">Auto-generated investor questions & answers</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {generating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
          ) : (
            <><RefreshCw className="w-4 h-4" /> Generate FAQs</>
          )}
        </button>
      </div>

      {/* Document selector */}
      <div className="mb-6">
        <select
          value={selectedDocId}
          onChange={(e) => setSelectedDocId(e.target.value)}
          className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm w-full max-w-sm"
        >
          {documents.map(doc => (
            <option key={doc.id} value={doc.id}>{doc.original_filename}</option>
          ))}
        </select>
      </div>

      {/* Search */}
      {faqData?.faqs && faqData.faqs.length > 0 && (
        <div className="mb-4 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions..."
            className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-primary-500"
          />
        </div>
      )}

      {/* FAQ loading */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
        </div>
      ) : !faqData || faqData.status === 'pending' ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500 mb-4">No FAQs generated yet for this document.</p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-primary-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            Generate 20 Investor FAQs
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredFaqs.map((faq, index) => (
            <FAQAccordionItem
              key={index}
              faq={faq}
              index={index}
              isExpanded={expandedIds.has(index)}
              onToggle={() => toggleExpand(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FAQAccordionItem({
  faq,
  index,
  isExpanded,
  onToggle,
}: {
  faq: FAQItem;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-fade-in">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-primary-500 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
        )}
        <span className="text-sm text-gray-400 font-mono w-6">{index + 1}.</span>
        <span className="text-sm font-medium text-gray-800">{faq.question}</span>
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 pl-14">
          <p className="text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
        </div>
      )}
    </div>
  );
}
