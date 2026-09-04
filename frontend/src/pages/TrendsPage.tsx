import React, { useState, useEffect } from 'react';
import type { ParameterTrend, ComparisonMatrix, Person } from '../services/types';
import { api } from '../services/api';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceArea 
} from 'recharts';
import { TrendingUp, Table, Calendar, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';

interface TrendsPageProps {
  currentPerson: Person | null;
  onOpenDocumentVerification: (docId: string) => void;
}

export const TrendsPage: React.FC<TrendsPageProps> = ({
  currentPerson,
  onOpenDocumentVerification,
}) => {
  const [trends, setTrends] = useState<ParameterTrend[]>([]);
  const [matrix, setMatrix] = useState<ComparisonMatrix | null>(null);
  const [selectedCode, setSelectedCode] = useState<string>('hba1c');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!currentPerson) return;
    try {
      setLoading(true);
      const [trendData, matrixData] = await Promise.all([
        api.getTrends(currentPerson.id),
        api.getMatrix(currentPerson.id),
      ]);
      setTrends(trendData);
      setMatrix(matrixData);

      // Default selection if current selected not available
      if (trendData.length > 0 && !trendData.some(t => t.canonical_code === selectedCode)) {
        setSelectedCode(trendData[0].canonical_code);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentPerson?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  const categories = ['All', ...Array.from(new Set(trends.map(t => t.category)))];
  const filteredTrends = selectedCategory === 'All' 
    ? trends 
    : trends.filter(t => t.category === selectedCategory);

  const currentTrend = trends.find(t => t.canonical_code === selectedCode) || trends[0];

  const chartData = currentTrend ? currentTrend.points.map(p => ({
    date: p.date,
    value: p.value,
    unit: p.unit,
    originalName: p.original_name,
    originalValue: p.original_value,
    flag: p.abnormal_flag,
    documentId: p.document_id,
    page: p.source_page,
  })) : [];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Longitudinal Health Trends</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tracking biomarker trajectories over time for <strong>{currentPerson?.name}</strong>
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setViewMode('chart')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-colors ${
              viewMode === 'chart' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Interactive Chart</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-colors ${
              viewMode === 'table' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Multi-Year Grid</span>
          </button>
        </div>
      </div>

      {trends.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-dashed border-slate-300 text-center">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-700">No laboratory data recorded yet</p>
          <p className="text-sm text-slate-500 mt-1">Upload reports in the Documents section to populate trend graphs.</p>
        </div>
      ) : viewMode === 'chart' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Parameter Picker Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            {/* Category tabs */}
            <div className="flex flex-wrap gap-1.5 bg-white p-2.5 rounded-xl border border-slate-200">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Parameter List */}
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-[550px] overflow-y-auto">
              {filteredTrends.map((t) => {
                const isSelected = t.canonical_code === selectedCode;
                return (
                  <button
                    key={t.canonical_code}
                    onClick={() => setSelectedCode(t.canonical_code)}
                    className={`w-full text-left p-3.5 flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-emerald-50/70 border-l-4 border-emerald-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <h4 className={`text-sm font-bold ${isSelected ? 'text-emerald-900' : 'text-slate-800'}`}>
                        {t.canonical_name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">{t.category} • {t.points.length} record(s)</p>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-black text-slate-900">
                        {t.latest_value}
                      </span>
                      <span className="text-xs text-slate-500 ml-1">{t.unit}</span>
                      {t.is_abnormal && (
                        <div className="text-[10px] text-rose-600 font-bold mt-0.5">Abnormal</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Chart Card */}
          <div className="lg:col-span-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            {currentTrend ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                      {currentTrend.category}
                    </span>
                    <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
                      {currentTrend.canonical_name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Standard Unit: <strong>{currentTrend.unit}</strong>
                      {currentTrend.reference_low !== undefined && currentTrend.reference_high !== undefined && (
                        <span className="ml-3 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                          Normal Biological Reference: {currentTrend.reference_low} - {currentTrend.reference_high} {currentTrend.unit}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl font-black text-slate-900">{currentTrend.latest_value}</span>
                    <span className="text-xs font-bold text-slate-500 ml-1">{currentTrend.unit}</span>
                    <p className="text-xs text-slate-400 mt-0.5">Latest: {currentTrend.latest_date}</p>
                  </div>
                </div>

                {/* Recharts Line Chart */}
                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={12} tickLine={false} unit={` ${currentTrend.unit}`} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs space-y-1">
                                <p className="font-bold text-slate-200">{data.date}</p>
                                <p className="text-emerald-400 font-extrabold text-sm">
                                  {data.value} {data.unit}
                                </p>
                                <p className="text-slate-400">Reported: {data.originalName} ({data.originalValue})</p>
                                {data.flag && (
                                  <p className="text-rose-400 font-bold">Flag: {data.flag}</p>
                                )}
                                <p className="text-slate-400 text-[10px]">Click to view source page {data.page}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />

                      {/* Normal Reference Band */}
                      {currentTrend.reference_low !== undefined && currentTrend.reference_high !== undefined && (
                        <ReferenceArea
                          y1={currentTrend.reference_low}
                          y2={currentTrend.reference_high}
                          fill="#10b981"
                          fillOpacity={0.08}
                          stroke="#10b981"
                          strokeOpacity={0.2}
                        />
                      )}

                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#059669"
                        strokeWidth={3}
                        dot={{ r: 5, fill: '#059669', strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 8, fill: '#047857' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Click-through Record Citations */}
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                    Source Provenance Points ({chartData.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {chartData.map((cd, idx) => (
                      <div
                        key={idx}
                        onClick={() => onOpenDocumentVerification(cd.documentId)}
                        className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-800">{cd.date}:</span>
                          <span className="font-black text-slate-900">{cd.value} {cd.unit}</span>
                          {cd.flag && (
                            <span className="text-[10px] font-bold text-rose-600">[{cd.flag}]</span>
                          )}
                        </div>
                        <div className="flex items-center text-emerald-600 space-x-1 font-medium">
                          <span>Page {cd.page}</span>
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        /* Multi-Year Longitudinal Comparison Grid (Section 10) */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-bold text-slate-900">Multi-Date Biomarker Comparison Table</h3>
            <p className="text-xs text-slate-500">Cross-document longitudinal comparison matrix across recorded test dates</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Biomarker / Test Name</th>
                  <th className="p-3.5">Unit</th>
                  {matrix?.dates.map((d) => (
                    <th key={d} className="p-3.5 text-right font-mono">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matrix?.rows.map((row) => (
                  <tr key={row.canonical_code} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">{row.canonical_name}</td>
                    <td className="p-3.5 text-slate-500 font-medium">{row.unit}</td>
                    {matrix.dates.map((d) => {
                      const cell = row.values[d];
                      const isAbnormal = !!cell?.abnormal_flag;
                      return (
                        <td key={d} className={`p-3.5 text-right font-semibold ${isAbnormal ? 'text-rose-600 font-bold bg-rose-50/50' : 'text-slate-800'}`}>
                          {cell?.display}
                          {isAbnormal && <span className="ml-1 text-[10px]">[{cell.abnormal_flag}]</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
