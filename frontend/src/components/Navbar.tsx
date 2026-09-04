import React from 'react';
import type { Person } from '../services/types';
import { Activity, FileText, CheckCircle2, TrendingUp, Stethoscope, User, Plus } from 'lucide-react';

interface NavbarProps {
  currentTab: 'documents' | 'verification' | 'trends' | 'doctor';
  onSelectTab: (tab: 'documents' | 'verification' | 'trends' | 'doctor') => void;
  persons: Person[];
  selectedPersonId: string;
  onSelectPerson: (id: string) => void;
  onAddPersonClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  persons,
  selectedPersonId,
  onSelectPerson,
  onAddPersonClick,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Family Health Records</h1>
              <p className="text-xs text-slate-500 font-medium">Longitudinal Analysis & Verification</p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden md:flex space-x-1">
            <button
              onClick={() => onSelectTab('documents')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'documents'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Documents</span>
            </button>

            <button
              onClick={() => onSelectTab('verification')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'verification'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Verification (HITL)</span>
            </button>

            <button
              onClick={() => onSelectTab('trends')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'trends'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Longitudinal Trends</span>
            </button>

            <button
              onClick={() => onSelectTab('doctor')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'doctor'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              <span>Doctor Visit Mode</span>
            </button>
          </nav>

          {/* Family Member Switcher */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              <div className="pl-2 pr-1 text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <select
                value={selectedPersonId}
                onChange={(e) => onSelectPerson(e.target.value)}
                className="bg-transparent border-none text-sm font-semibold text-slate-800 focus:outline-none pr-3 py-1 cursor-pointer"
              >
                {persons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.relationship_type})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onAddPersonClick}
              title="Add family member"
              className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
