import React, { useState, useRef } from 'react';
import type { DocumentItem, Person } from '../services/types';
import { api } from '../services/api';
import { 
  Upload, FileText, CheckCircle, AlertTriangle, 
  ExternalLink, Sparkles, Building2, User, Calendar, Trash2 
} from 'lucide-react';

interface DocumentsPageProps {
  documents: DocumentItem[];
  currentPerson: Person | null;
  onRefreshDocuments: () => void;
  onOpenVerification: (docId: string) => void;
  onNavigateToTrends?: () => void;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({
  documents,
  currentPerson,
  onRefreshDocuments,
  onOpenVerification,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);
  const [docToDelete, setDocToDelete] = useState<DocumentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentPerson) return;

    try {
      setIsUploading(true);
      setIngestStatus('Uploading and extracting text...');
      await api.uploadDocument(file, currentPerson.id, 'lab_report');
      setIngestStatus('Extraction complete!');
      onRefreshDocuments();
    } catch (err) {
      setIngestStatus('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setTimeout(() => setIngestStatus(null), 3000);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleIngestSample = async () => {
    try {
      setIsUploading(true);
      setIngestStatus('Ingesting sample report...');
      await api.ingestSample();
      setIngestStatus('Sample report ingested successfully!');
      onRefreshDocuments();
    } catch (err) {
      setIngestStatus('Failed to ingest sample report.');
    } finally {
      setIsUploading(false);
      setTimeout(() => setIngestStatus(null), 3000);
    }
  };

  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    try {
      setIsDeleting(true);
      await api.deleteDocument(docToDelete.id);
      setDocToDelete(null);
      onRefreshDocuments();
    } catch (err) {
      console.error('Failed to delete document:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const totalObs = documents.reduce((acc, d) => acc + (d.observation_count || 0), 0);
  const unverifiedDocs = documents.filter(d => d.status !== 'verified').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Patient</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{currentPerson?.name || 'No Patient'}</p>
          <p className="text-xs text-slate-500 mt-1">{currentPerson?.relationship_type} • {currentPerson?.dob || 'Age N/A'}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Total Documents</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{documents.length}</p>
          <p className="text-xs text-emerald-600 font-medium mt-1">Preserved original PDFs</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Extracted Observations</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{totalObs}</p>
          <p className="text-xs text-slate-500 mt-1">Laboratory parameters</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Review Status</span>
          <p className="text-xl font-bold text-amber-600 mt-1">{unverifiedDocs > 0 ? `${unverifiedDocs} Need Review` : 'All Verified'}</p>
          <p className="text-xs text-slate-500 mt-1">Human-in-the-loop validation</p>
        </div>
      </div>

      {/* Upload & Actions Bar */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Upload Medical Reports</h2>
          <p className="text-sm text-slate-500">Upload laboratory PDFs, prescriptions, or discharge summaries</p>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span>{isUploading ? 'Processing...' : 'Upload PDF'}</span>
          </button>

          <button
            onClick={handleIngestSample}
            disabled={isUploading}
            className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-200 disabled:opacity-50"
            title="Ingest the sample NSRL 10-page report"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Load Sample PDF</span>
          </button>
        </div>
      </div>

      {ingestStatus && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 font-medium">
          {ingestStatus}
        </div>
      )}

      {/* Document List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">Saved Medical Documents</h3>

        {documents.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-dashed border-slate-300 text-center">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-base font-medium text-slate-700">No documents uploaded yet</p>
            <p className="text-sm text-slate-500 mt-1">Upload your first lab report or click "Load Sample PDF" above to begin.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-base font-bold text-slate-900">{doc.filename}</h4>
                      {doc.status === 'verified' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle className="w-3 h-3 mr-1" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Needs Review
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2 text-xs text-slate-500">
                      {doc.document_date && (
                        <span className="flex items-center">
                          <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {doc.document_date}
                        </span>
                      )}
                      {doc.lab_or_clinic && (
                        <span className="flex items-center">
                          <Building2 className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {doc.lab_or_clinic}
                        </span>
                      )}
                      {doc.referring_doctor && (
                        <span className="flex items-center">
                          <User className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {doc.referring_doctor}
                        </span>
                      )}
                      <span>{doc.page_count} Pages</span>
                      <span>{(doc.file_size_bytes / (1024 * 1024)).toFixed(2)} MB</span>
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {doc.observation_count} Extracted Parameters
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 self-end md:self-center">
                  <button
                    onClick={() => onOpenVerification(doc.id)}
                    className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                  >
                    <span>Verify Data (HITL)</span>
                  </button>

                  <a
                    href={api.getPdfUrl(doc.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>View PDF</span>
                  </a>

                  <button
                    onClick={() => setDocToDelete(doc)}
                    title="Delete this medical report"
                    className="flex items-center space-x-1 bg-rose-50 hover:bg-rose-100 text-rose-700 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors border border-rose-200"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {docToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Medical Report</h3>
                <p className="text-xs text-slate-500">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-slate-700">
              Are you sure you want to delete <strong className="text-slate-900">{docToDelete.filename}</strong>?
            </p>

            <div className="text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 space-y-1">
              <p className="font-semibold">The following data will be permanently removed:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>The original stored PDF document</li>
                <li>All <strong>{docToDelete.observation_count}</strong> extracted laboratory observations</li>
                <li>Associated longitudinal trend entries and timeline points</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setDocToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center space-x-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Report'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
