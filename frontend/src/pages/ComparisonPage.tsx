import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowUpDown, Download } from 'lucide-react';
import { getComparisonData } from '../api/client';
import type { ExtractionResult } from '../types';

type SortField = 'company_name' | 'revenue' | 'ask' | 'tam';

const FIELDS = [
  { key: 'company_name', label: 'Company' },
  { key: 'pitch', label: 'Value Proposition' },
  { key: 'founders', label: 'Founders' },
  { key: 'business_model', label: 'Business Model' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'burn_rate', label: 'Burn Rate' },
  { key: 'runway', label: 'Runway' },
  { key: 'valuation', label: 'Valuation' },
  { key: 'tam', label: 'TAM' },
  { key: 'growth_rate', label: 'Growth Rate' },
  { key: 'traction', label: 'Key Traction' },
  { key: 'competitors', label: 'Competitors' },
  { key: 'ask', label: 'Funding Ask' },
  { key: 'use_of_funds', label: 'Use of Funds' },
  { key: 'risks', label: 'Key Risks' },
];

function getCellValue(ext: ExtractionResult, key: string): string {
  switch (key) {
    case 'company_name': return ext.company_name;
    case 'pitch': return ext.pitch;
    case 'founders': return ext.founders.map(f => `${f.name} (${f.role})`).join(', ');
    case 'business_model': return ext.business_model;
    case 'revenue': return ext.financials.revenue;
    case 'burn_rate': return ext.financials.burn_rate;
    case 'runway': return ext.financials.runway;
    case 'valuation': return ext.financials.valuation;
    case 'tam': return ext.tam.total_addressable_market;
    case 'growth_rate': return ext.traction.growth_rate;
    case 'traction': return ext.traction.milestones.join(', ');
    case 'competitors': return ext.competitors.join(', ');
    case 'ask': return ext.ask.amount;
    case 'use_of_funds': return ext.ask.use_of_funds.join(', ');
    case 'risks': return ext.risks.join('; ');
    default: return '';
  }
}

export default function ComparisonPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<ExtractionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('company_name');
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    getComparisonData()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const sortedData = [...data].sort((a, b) => {
    const va = getCellValue(a, sortField);
    const vb = getCellValue(b, sortField);
    return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  const exportCSV = () => {
    const headers = ['Field', ...sortedData.map(d => d.company_name)];
    const rows = FIELDS.map(f => [f.label, ...sortedData.map(d => `"${getCellValue(d, f.key).replace(/"/g, '""')}"`)]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vc_comparison.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (data.length < 2) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Need More Documents</h2>
        <p className="text-gray-500 mb-6">Upload at least 2 documents to compare.</p>
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
    <div className="max-w-full mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Comparison</h1>
          <p className="text-gray-500 mt-1">Comparing {data.length} investment memos side-by-side</p>
        </div>
        <div className="flex gap-3">
          <select
            value={sortField}
            onChange={(e) => handleSort(e.target.value as SortField)}
            className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="company_name">Sort by Name</option>
            <option value="revenue">Sort by Revenue</option>
            <option value="ask">Sort by Ask</option>
            <option value="tam">Sort by TAM</option>
          </select>
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 font-semibold text-gray-600 sticky left-0 bg-gray-50 min-w-[160px]">
                Field
              </th>
              {sortedData.map((ext) => (
                <th key={ext.doc_id} className="text-left px-4 py-3 font-semibold text-primary-700 min-w-[220px]">
                  {ext.company_name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FIELDS.slice(1).map((field, idx) => (
              <tr
                key={field.key}
                className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
              >
                <td className="px-4 py-3 font-medium text-gray-700 sticky left-0 bg-inherit">
                  {field.label}
                </td>
                {sortedData.map((ext) => (
                  <td key={ext.doc_id} className="px-4 py-3 text-gray-600">
                    {getCellValue(ext, field.key) || <span className="text-gray-300">N/A</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
