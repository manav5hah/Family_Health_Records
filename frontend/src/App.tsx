import React, { useState, useEffect } from 'react';
import type { Person, DocumentItem } from './services/types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { DocumentsPage } from './pages/DocumentsPage';
import { VerificationPage } from './pages/VerificationPage';
import { TrendsPage } from './pages/TrendsPage';
import { DoctorVisitPage } from './pages/DoctorVisitPage';
import { WelcomePage } from './pages/WelcomePage';
import { AddPersonModal } from './components/AddPersonModal';
import { RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [persons, setPersons] = useState<Person[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [currentTab, setCurrentTab] = useState<'documents' | 'verification' | 'trends' | 'doctor'>('documents');
  const [verifyingDocId, setVerifyingDocId] = useState<string | null>(null);
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initial load
  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const familyData = await api.getFamily();
        setPersons(familyData.members || []);
        if (familyData.members && familyData.members.length > 0) {
          setSelectedPersonId(familyData.members[0].id);
        }
      } catch (err) {
        console.error('Failed to load initial family data:', err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  // Load documents when selected person changes
  const loadDocuments = async () => {
    if (!selectedPersonId) return;
    try {
      const docs = await api.getDocuments(selectedPersonId);
      setDocuments(docs);
      // Auto select first document for verification if none selected
      if (docs.length > 0 && !verifyingDocId) {
        setVerifyingDocId(docs[0].id);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [selectedPersonId]);

  const currentPerson = persons.find(p => p.id === selectedPersonId) || null;

  const handleOpenVerification = (docId: string) => {
    setVerifyingDocId(docId);
    setCurrentTab('verification');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Loading Family Health Records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab === 'verification' && !verifyingDocId && documents.length > 0) {
            setVerifyingDocId(documents[0].id);
          }
        }}
        persons={persons}
        selectedPersonId={selectedPersonId}
        onSelectPerson={(id) => {
          setSelectedPersonId(id);
          setVerifyingDocId(null);
        }}
        onAddPersonClick={() => setIsAddPersonOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {persons.length === 0 ? (
          <WelcomePage onAddPersonClick={() => setIsAddPersonOpen(true)} />
        ) : (
          <>
            {currentTab === 'documents' && (
              <DocumentsPage
                documents={documents}
                currentPerson={currentPerson}
                onRefreshDocuments={loadDocuments}
                onOpenVerification={handleOpenVerification}
                onNavigateToTrends={() => setCurrentTab('trends')}
              />
            )}

            {currentTab === 'verification' && (
              verifyingDocId ? (
                <VerificationPage
                  documentId={verifyingDocId}
                  onBack={() => setCurrentTab('documents')}
                  onDocumentUpdated={loadDocuments}
                />
              ) : (
                <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
                  <p className="text-slate-600">No document selected for verification.</p>
                  <button
                    onClick={() => setCurrentTab('documents')}
                    className="mt-3 text-sm text-emerald-600 font-bold"
                  >
                    Go to Documents
                  </button>
                </div>
              )
            )}

            {currentTab === 'trends' && (
              <TrendsPage
                currentPerson={currentPerson}
                onOpenDocumentVerification={handleOpenVerification}
              />
            )}

            {currentTab === 'doctor' && (
              <DoctorVisitPage currentPerson={currentPerson} />
            )}
          </>
        )}
      </main>

      <AddPersonModal
        isOpen={isAddPersonOpen}
        onClose={() => setIsAddPersonOpen(false)}
        onPersonAdded={(newPerson) => {
          setPersons(prev => [...prev, newPerson]);
          setSelectedPersonId(newPerson.id);
        }}
      />
    </div>
  );
};

export default App;
