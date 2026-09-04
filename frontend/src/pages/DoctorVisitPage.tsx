import React, { useState, useEffect } from 'react';
import type { DoctorVisitSummary, Person } from '../services/types';
import { api } from '../services/api';
import { 
  Printer, Stethoscope, AlertTriangle, MessageSquare, 
  HelpCircle, RefreshCw, ShieldCheck 
} from 'lucide-react';

interface DoctorVisitPageProps {
  currentPerson: Person | null;
}

export const DoctorVisitPage: React.FC<DoctorVisitPageProps> = ({ currentPerson }) => {
  const [summary, setSummary] = useState<DoctorVisitSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentPerson) return;
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const data = await api.getDoctorSummary(currentPerson.id);
        setSummary(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [currentPerson?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-12 text-slate-500">
        Unable to load physician summary.
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header / Action Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center space-x-2">
            <Stethoscope className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">Doctor Visit Preparation Report</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Condensed evidence summary and discussion questions for consultation with your physician
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Export PDF</span>
        </button>
      </div>

      {/* AI Safety Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3 text-xs text-amber-900 print:border-slate-300">
        <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-amber-950">AI Clinical Safety Principle</h4>
          <p className="mt-0.5 leading-relaxed">
            This document is generated to assist you in preparing for a discussion with your family physician.
            <strong> It does not formulate a clinical diagnosis, calculate drug dosages, or replace professional medical advice.</strong> All findings are strictly grounded in your verified medical records.
          </p>
        </div>
      </div>

      {/* Printable Clinical Summary Sheet */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
        {/* Patient Demographics Header */}
        <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">PATIENT HEALTH SUMMARY</span>
            <h1 className="text-2xl font-black text-slate-900 mt-1">{summary.patient.name}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-600 font-medium">
              <span><strong>Gender:</strong> {summary.patient.gender || 'N/A'}</span>
              <span>•</span>
              <span><strong>Age/DOB:</strong> {summary.patient.dob || 'N/A'}</span>
              <span>•</span>
              <span><strong>Blood Group:</strong> {summary.patient.blood_group || 'N/A'}</span>
              <span>•</span>
              <span><strong>Relationship:</strong> {summary.patient.relationship}</span>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-500 font-mono">
            <p><strong>Generated:</strong> {summary.summary_date}</p>
            <p><strong>Available Reports:</strong> {summary.total_documents}</p>
            <p><strong>Total Tests:</strong> {summary.total_observations}</p>
          </div>
        </div>

        {/* Section 0: Overall Observation */}
        {summary.overall_observation && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Overall Health Trend Observation
            </h3>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm leading-relaxed">
              {summary.overall_observation}
            </div>
          </div>
        )}

        {/* Section 1: Questions & Discussion Points for Doctor */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Suggested Discussion Points for Physician
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {summary.discussion_points.map((dp, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{dp.topic}</span>
                  <span className="text-[11px] text-slate-500 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                    {dp.source}
                  </span>
                </div>
                <p className="text-slate-600 font-medium">
                  <strong>Record Evidence:</strong> {dp.observation}
                </p>
                <div className="bg-emerald-50 text-emerald-950 p-2.5 rounded-lg border border-emerald-100 flex items-start space-x-2">
                  <HelpCircle className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
                  <p className="font-semibold leading-relaxed">
                    <strong>Suggested Question:</strong> "{dp.suggested_question}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Recent Out-of-Range / Abnormal Findings */}
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Recent Noteworthy & Out-of-Range Laboratory Findings
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3">Test Parameter</th>
                  <th className="p-3">Reported Value</th>
                  <th className="p-3">Flag</th>
                  <th className="p-3">Biological Reference Range</th>
                  <th className="p-3">Report Date</th>
                  <th className="p-3 text-right">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.abnormal_findings.map((af, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{af.test_name}</td>
                    <td className="p-3 font-extrabold text-rose-700">
                      {af.value} {af.unit}
                    </td>
                    <td className="p-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                        {af.flag}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 font-medium">{af.reference || '—'}</td>
                    <td className="p-3 text-slate-600">{af.date || 'Recent'}</td>
                    <td className="p-3 text-right font-mono text-slate-500">Page {af.source_page}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Key Biomarker Longitudinal Snapshot */}
        <div className="space-y-3 pt-4 border-t border-slate-200">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            Biomarker Trajectory Snapshot
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {summary.key_trends.slice(0, 8).map((t) => (
              <div key={t.canonical_code} className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                <span className="text-[11px] font-medium text-slate-500 block truncate">{t.canonical_name}</span>
                <div className="flex items-baseline space-x-1 mt-1">
                  <span className="text-base font-black text-slate-900">{t.latest_value}</span>
                  <span className="text-[11px] text-slate-500 font-bold">{t.unit}</span>
                </div>
                {t.reference_low !== undefined && t.reference_high !== undefined && (
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Ref: {t.reference_low} - {t.reference_high}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer Signature Block for Physician Notes */}
        <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs text-slate-500">
          <div>
            <p className="font-bold text-slate-700 mb-8">Physician Notes & Recommendations:</p>
            <div className="border-b border-dashed border-slate-300 w-full mb-3"></div>
            <div className="border-b border-dashed border-slate-300 w-full mb-3"></div>
            <div className="border-b border-dashed border-slate-300 w-full mb-3"></div>
          </div>
          <div className="flex flex-col justify-end items-end">
            <div className="border-t border-slate-400 w-48 pt-1 text-center font-medium text-slate-700">
              Doctor's Signature & Date
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
