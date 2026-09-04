import React, { useState, useEffect } from 'react';
import type { DocumentItem, Observation } from '../services/types';
import { api } from '../services/api';
import { 
  Check, X, Edit3, CheckCircle2, 
  Search, ArrowLeft, ChevronLeft, ChevronRight, FileText, CheckCheck, RefreshCw, Trash2 
} from 'lucide-react';

interface VerificationPageProps {
  documentId: string;
  onBack: () => void;
  onDocumentUpdated: () => void;
}

export const VerificationPage: React.FC<VerificationPageProps> = ({
  documentId,
  onBack,
  onDocumentUpdated,
}) => {
  const [doc, setDoc] = useState<DocumentItem | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'needs_review' | 'abnormal' | 'verified'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingObs, setEditingObs] = useState<Observation | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const data = await api.getDocument(documentId);
      setDoc(data);
      setObservations(data.observations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  const handleVerify = async (obs: Observation, status: 'verified' | 'rejected' = 'verified') => {
    try {
      const updated = await api.updateObservation(obs.id, {
        verification_status: status,
      });
      setObservations(prev => prev.map(o => o.id === obs.id ? updated : o));
      onDocumentUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingObs) return;
    try {
      const updated = await api.updateObservation(editingObs.id, {
        value_text: editValue,
        value_numeric: parseFloat(editValue) || undefined,
        verification_status: 'corrected',
        correction_notes: editNotes,
      });
      setObservations(prev => prev.map(o => o.id === editingObs.id ? updated : o));
      setEditingObs(null);
      onDocumentUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveAll = async () => {
    const unverifiedIds = observations
      .filter(o => o.verification_status === 'needs_review')
      .map(o => o.id);

    if (unverifiedIds.length === 0) return;

    try {
      await api.bulkVerify(unverifiedIds, 'verified');
      loadDocument();
      onDocumentUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDocument = async () => {
    if (!doc) return;
    try {
      setIsDeleting(true);
      await api.deleteDocument(doc.id);
      onDocumentUpdated();
      onBack();
    } catch (err) {
      console.error('Failed to delete document:', err);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const filteredObservations = observations.filter(o => {
    if (filter === 'needs_review' && o.verification_status !== 'needs_review') return false;
    if (filter === 'abnormal' && !o.abnormal_flag) return false;
    if (filter === 'verified' && o.verification_status !== 'verified' && o.verification_status !== 'corrected') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return o.original_test_name.toLowerCase().includes(q) || 
             (o.canonical_test_name && o.canonical_test_name.toLowerCase().includes(q));
    }
    return true;
  });

  const pdfUrl = doc ? `${api.getPdfUrl(doc.id)}#page=${selectedPage}` : '';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Document not found.</p>
        <button onClick={onBack} className="mt-4 text-emerald-600 font-medium">Go Back</button>
      </div>
    );
  }

  const verifiedCount = observations.filter(o => o.verification_status === 'verified' || o.verification_status === 'corrected').length;
  const needsReviewCount = observations.filter(o => o.verification_status === 'needs_review').length;
  const abnormalCount = observations.filter(o => o.abnormal_flag).length;

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-slate-900">{doc.filename}</h2>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                {doc.document_date || 'Date N/A'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {doc.lab_or_clinic} • {doc.page_count} Pages • Total {observations.length} Extracted Tests
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-xs font-semibold">
            <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
              {verifiedCount} Verified
            </span>
            <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">
              {needsReviewCount} Needs Review
            </span>
            <span className="bg-rose-100 text-rose-800 px-2.5 py-1 rounded-full">
              {abnormalCount} Abnormal
            </span>
          </div>

          {needsReviewCount > 0 && (
            <button
              onClick={handleApproveAll}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Approve All High-Confidence</span>
            </button>
          )}

          <button
            onClick={() => setShowDeleteConfirm(true)}
            title="Delete this report"
            className="flex items-center space-x-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-rose-200"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Report</span>
          </button>
        </div>
      </div>

      {/* Split-Screen: PDF Viewer on Left, Verification Cards on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-220px)] min-h-[600px]">
        {/* Left Pane: PDF Viewer */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          {/* PDF Controls */}
          <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-medium text-slate-700">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-slate-900">Source Document (Page {selectedPage} of {doc.page_count})</span>
            </div>

            <div className="flex items-center space-x-1">
              <button
                disabled={selectedPage <= 1}
                onClick={() => setSelectedPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 py-1 bg-white border border-slate-200 rounded font-mono">
                {selectedPage} / {doc.page_count}
              </span>
              <button
                disabled={selectedPage >= doc.page_count}
                onClick={() => setSelectedPage(p => Math.min(doc.page_count, p + 1))}
                className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Embedded PDF iframe */}
          <div className="flex-1 bg-slate-100">
            <iframe
              src={pdfUrl}
              className="w-full h-full border-none"
              title="PDF Viewer"
            />
          </div>
        </div>

        {/* Right Pane: Extracted Observations Review List */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          {/* Search & Filter Toolbar */}
          <div className="p-4 border-b border-slate-200 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search test name (e.g. Creatinine, HbA1c, Glucose)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  filter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({observations.length})
              </button>
              <button
                onClick={() => setFilter('needs_review')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  filter === 'needs_review' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                Needs Review ({needsReviewCount})
              </button>
              <button
                onClick={() => setFilter('abnormal')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  filter === 'abnormal' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                Abnormal ({abnormalCount})
              </button>
              <button
                onClick={() => setFilter('verified')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  filter === 'verified' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Verified ({verifiedCount})
              </button>
            </div>
          </div>

          {/* Observations Scrollable Cards */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredObservations.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                No observations match the selected filter.
              </div>
            ) : (
              filteredObservations.map((obs) => {
                const isSelected = selectedPage === obs.source_page;
                const isAbnormal = !!obs.abnormal_flag;

                return (
                  <div
                    key={obs.id}
                    onClick={() => setSelectedPage(obs.source_page)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500'
                        : isAbnormal
                        ? 'border-rose-200 bg-rose-50/20 hover:border-rose-300'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-bold text-slate-900">{obs.original_test_name}</h4>
                          {isAbnormal && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                              FLAG: {obs.abnormal_flag}
                            </span>
                          )}
                          {obs.verification_status === 'verified' && (
                            <span className="text-emerald-600" title="Verified">
                              <CheckCircle2 className="w-4 h-4" />
                            </span>
                          )}
                        </div>

                        {obs.canonical_test_name && obs.canonical_test_name !== obs.original_test_name && (
                          <p className="text-xs text-slate-500 font-medium">
                            Normalized: {obs.canonical_test_name}
                          </p>
                        )}
                      </div>

                      {/* Result Value */}
                      <div className="text-right">
                        <span className={`text-base font-extrabold ${isAbnormal ? 'text-rose-700' : 'text-slate-900'}`}>
                          {obs.value_text}
                        </span>
                        {obs.original_unit && (
                          <span className="text-xs font-semibold text-slate-500 ml-1">
                            {obs.original_unit}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reference range & details */}
                    <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <div>
                        {obs.reference_text && (
                          <span>Ref: <strong className="text-slate-700">{obs.reference_text}</strong></span>
                        )}
                        {obs.method && (
                          <span className="ml-2 text-slate-400">({obs.method})</span>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] font-mono">
                          Page {obs.source_page}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-emerald-700 font-semibold text-[11px]">
                          {(obs.confidence * 100).toFixed(0)}% Conf.
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-3 flex items-center justify-end space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingObs(obs);
                          setEditValue(obs.value_text);
                          setEditNotes(obs.correction_notes || '');
                        }}
                        className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors flex items-center space-x-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVerify(obs, 'rejected');
                        }}
                        className="px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-md transition-colors flex items-center space-x-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVerify(obs, 'verified');
                        }}
                        disabled={obs.verification_status === 'verified'}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-colors flex items-center space-x-1 ${
                          obs.verification_status === 'verified'
                            ? 'bg-slate-100 text-slate-400 cursor-default'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{obs.verification_status === 'verified' ? 'Confirmed' : 'Confirm'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Edit Observation Modal */}
      {editingObs && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Correct Extracted Value</h3>
              <button onClick={() => setEditingObs(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
              <p><span className="text-slate-500">Test Name:</span> <strong>{editingObs.original_test_name}</strong></p>
              <p><span className="text-slate-500">Original AI Snippet:</span> <span className="font-mono text-slate-700">{editingObs.source_snippet}</span></p>
              <p><span className="text-slate-500">Source Page:</span> <strong>Page {editingObs.source_page}</strong></p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Correct Value</label>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Correction Rationale / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Corrected decimal point based on raw lab printout"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setEditingObs(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
              >
                Save Correction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Document Confirmation Modal */}
      {showDeleteConfirm && (
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
              Are you sure you want to delete <strong className="text-slate-900">{doc.filename}</strong>?
            </p>

            <div className="text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 space-y-1">
              <p className="font-semibold">The following data will be permanently removed:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>The original stored PDF document</li>
                <li>All <strong>{observations.length}</strong> extracted laboratory observations</li>
                <li>Associated longitudinal trend entries and timeline points</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteDocument}
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
