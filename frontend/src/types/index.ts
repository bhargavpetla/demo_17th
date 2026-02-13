export interface DocumentMetadata {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  page_count: number;
  status: string;
  upload_date: string;
  error_message?: string;
}

export interface Founder {
  name: string;
  role: string;
  background: string;
}

export interface Financials {
  revenue: string;
  burn_rate: string;
  runway: string;
  valuation: string;
}

export interface TAM {
  total_addressable_market: string;
  serviceable_market: string;
}

export interface Traction {
  metrics: string[];
  growth_rate: string;
  milestones: string[];
}

export interface Ask {
  amount: string;
  use_of_funds: string[];
}

export interface ExtractionResult {
  doc_id: string;
  company_name: string;
  pitch: string;
  founders: Founder[];
  business_model: string;
  financials: Financials;
  tam: TAM;
  traction: Traction;
  competitors: string[];
  ask: Ask;
  risks: string[];
  status: string;
  error_message?: string;
}

export interface ProvenanceSource {
  doc_name: string;
  page: number;
  snippet: string;
}

export interface QAResponse {
  question: string;
  answer: string;
  sources: ProvenanceSource[];
}

export interface QAHistoryItem extends QAResponse {
  id: string;
  asked_at: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQResponse {
  doc_id: string;
  doc_name: string;
  faqs: FAQItem[];
  status: string;
}
