import React from 'react';
import { Shield, FileText, Activity, Users, PlusCircle } from 'lucide-react';

interface WelcomePageProps {
  onAddPersonClick: () => void;
}

export const WelcomePage: React.FC<WelcomePageProps> = ({ onAddPersonClick }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-emerald-600 px-8 py-12 text-center text-white">
        <Shield className="w-16 h-16 mx-auto mb-6 opacity-90" />
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">
          Welcome to Family Health Records
        </h1>
        <p className="text-emerald-50 max-w-2xl mx-auto text-lg leading-relaxed">
          A privacy-focused, family-centric health record system that preserves your original medical documents, extracts clinical observations, and tracks longitudinal health trends.
        </p>
      </div>

      <div className="px-8 py-12">
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12">
          <div className="text-center">
            <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="font-bold text-slate-800 mb-2">Secure Storage</h3>
            <p className="text-sm text-slate-600">Store and view original medical reports directly in your browser.</p>
          </div>
          <div className="text-center">
            <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="font-bold text-slate-800 mb-2">Smart Extraction</h3>
            <p className="text-sm text-slate-600">Automatically extract test values and track them over time.</p>
          </div>
          <div className="text-center">
            <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="font-bold text-slate-800 mb-2">Family Centric</h3>
            <p className="text-sm text-slate-600">Manage health records for your entire family in one unified dashboard.</p>
          </div>
        </div>

        <div className="text-center bg-slate-50 rounded-xl p-8 max-w-2xl mx-auto border border-slate-100">
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Get Started</h2>
          <p className="text-slate-600 mb-6">
            To begin using the system, add your first family member to create their health profile.
          </p>
          <button
            onClick={onAddPersonClick}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold transition-colors shadow-sm"
          >
            <PlusCircle className="w-5 h-5" />
            Add Family Member
          </button>
        </div>
      </div>
    </div>
  );
};

