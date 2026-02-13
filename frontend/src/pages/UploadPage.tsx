import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Trash2, Loader2, FolderOpen } from 'lucide-react';
import { uploadDocuments, loadDemoDocuments } from '../api/client';
import { useDocumentStore } from '../store/documentStore';

export default function UploadPage() {
  const navigate = useNavigate();
  const { addDocuments } = useDocumentStore();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length !== acceptedFiles.length) {
      setError('Only PDF files are supported');
    }
    setFiles(prev => [...prev, ...pdfFiles]);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 20 * 1024 * 1024,
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const docs = await uploadDocuments(files);
      addDocuments(docs);
      setUploadComplete(true);
      setFiles([]);
      setTimeout(() => navigate('/extraction'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleLoadDemo = async () => {
    setLoadingDemo(true);
    setError(null);
    try {
      const docs = await loadDemoDocuments();
      addDocuments(docs);
      setUploadComplete(true);
      setTimeout(() => navigate('/extraction'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load demo documents.');
    } finally {
      setLoadingDemo(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-8 animate-fade-in">
        <img
          src="/NSOffice Logo - Dark-Vps2lMvs.png"
          alt="NSOffice.AI"
          className="h-12 mx-auto mb-4"
        />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          VC Investment Memo Analyzer
        </h1>
        <p className="text-gray-500 text-lg">
          Upload investment memos to extract, compare, and analyze with AI
        </p>
      </div>

      {uploadComplete ? (
        <div className="bg-white rounded-xl border border-green-200 p-8 text-center animate-fade-in">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Documents Uploaded!</h2>
          <p className="text-gray-500">Processing your documents... Redirecting to results.</p>
          <div className="mt-4">
            <Loader2 className="w-6 h-6 text-primary-500 animate-spin mx-auto" />
          </div>
        </div>
      ) : (
        <>
          {/* Drop zone */}
          <div
            {...getRootProps()}
            className={`bg-white rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-200 ${
              isDragActive
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload
              className={`w-12 h-12 mx-auto mb-4 ${
                isDragActive ? 'text-primary-500' : 'text-gray-400'
              }`}
            />
            <p className="text-lg font-medium text-gray-700 mb-1">
              {isDragActive ? 'Drop your PDFs here' : 'Drag & drop PDF files here'}
            </p>
            <p className="text-sm text-gray-500">
              or click to browse (max 20MB per file)
            </p>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-6 bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 animate-fade-in">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 animate-fade-in">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
              className="flex-1 flex items-center justify-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload {files.length > 0 ? `${files.length} File${files.length > 1 ? 's' : ''}` : 'Files'}
                </>
              )}
            </button>

            <button
              onClick={handleLoadDemo}
              disabled={loadingDemo}
              className="flex items-center justify-center gap-2 bg-white text-primary-600 border border-primary-300 px-6 py-3 rounded-lg font-medium hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loadingDemo ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading Demo...
                </>
              ) : (
                <>
                  <FolderOpen className="w-5 h-5" />
                  Load Demo Documents
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
