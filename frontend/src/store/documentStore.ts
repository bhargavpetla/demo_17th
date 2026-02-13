import { create } from 'zustand';
import type { DocumentMetadata, ExtractionResult } from '../types';

interface DocumentStore {
  documents: DocumentMetadata[];
  extractions: ExtractionResult[];
  loading: boolean;
  error: string | null;
  setDocuments: (docs: DocumentMetadata[]) => void;
  addDocuments: (docs: DocumentMetadata[]) => void;
  setExtractions: (extractions: ExtractionResult[]) => void;
  removeDocument: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useDocumentStore = create<DocumentStore>((set) => ({
  documents: [],
  extractions: [],
  loading: false,
  error: null,

  setDocuments: (documents) => set({ documents }),
  addDocuments: (docs) =>
    set((state) => ({ documents: [...state.documents, ...docs] })),
  setExtractions: (extractions) => set({ extractions }),
  removeDocument: (id) =>
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
      extractions: state.extractions.filter((e) => e.doc_id !== id),
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
