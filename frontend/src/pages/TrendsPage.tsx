import React, { useState, useEffect } from 'react';
import type { ParameterTrend, ComparisonMatrix, Person } from '../services/types';
import { api } from '../services/api';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceArea 
} from 'recharts';
import { TrendingUp, Table, AlertCircle, RefreshCw, Download, ExternalLink } from 'lucide-react';

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

  const handleExport = () => {
    if (!matrix) return;
    let csv = 'Biomarker,Unit,' + matrix.dates.join(',') + '\n';
    matrix.rows.forEach(row => {
      const rowData = [
        `"${row.canonical_name}"`,
        `"${row.unit}"`,
        ...matrix.dates.map(d => `"${row.values[d]?.value || ''}"`)
      ];
      csv += rowData.join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${currentPerson?.name || 'patient'}_health_trends.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const categories = ['All', ...Array.from(new Set(trends.map(t => t.category)))];
  const filteredTrends = selectedCategory === 'All' 
    ? trends 
    : trends.filter(t => t.category === selectedCategory);

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
            onClick={handleExport}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-colors text-slate-600 hover:text-emerald-700 mr-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
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
        <div className="space-y-6">
          {/* Category tabs */}
          <div className="flex flex-wrap gap-1.5 bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredTrends.map((trend) => {
              const data = trend.points.map(p => ({
                date: p.date,
                value: p.value,
                unit: p.unit,
                originalName: p.original_name,
                originalValue: p.original_value,
                flag: p.abnormal_flag,
                documentId: p.document_id,
                page: p.source_page,
              }));

              return (
                <div key={trend.canonical_code} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">{trend.canonical_name}</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Standard Unit: <strong>{trend.unit}</strong>
                        {trend.reference_low !== undefined && trend.reference_high !== undefined && (
                          <span className="ml-3 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                            Ref: {trend.reference_low} - {trend.reference_high} {trend.unit}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xl font-black text-slate-900">{trend.latest_value}</span>
                      <span className="text-xs font-bold text-slate-500 ml-1">{trend.unit}</span>
                      {trend.is_abnormal && (
                        <div className="text-[10px] text-rose-600 font-bold mt-0.5">Abnormal History</div>
                      )}
                    </div>
                  </div>

                  <div className="h-64 w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs space-y-1">
                                  <p className="font-bold text-slate-200">{d.date}</p>
                                  <p className="text-emerald-400 font-extrabold text-sm">
                                    {d.value} {d.unit}
                                  </p>
                                  {d.flag && <p className="text-rose-400 font-bold">Flag: {d.flag}</p>}
                                  <p className="text-slate-400 text-[10px]">Click point to view source page {d.page}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />

                        {trend.reference_low !== undefined && trend.reference_high !== undefined && (
                          <ReferenceArea
                            y1={trend.reference_low}
                            y2={trend.reference_high}
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
                          strokeWidth={2}
                          dot={{ r: 4, fill: '#059669', strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 6, fill: '#047857', onClick: (_: any, payload: any) => onOpenDocumentVerification(payload.payload.documentId) }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Click-through Record Citations for the trend */}
                  <div className="pt-4 border-t border-slate-100 mt-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                      Recent Records
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {data.slice(-2).map((cd, idx) => (
                        <div
                          key={idx}
                          onClick={() => onOpenDocumentVerification(cd.documentId)}
                          className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-800">{cd.date}</span>
                            <span className="font-black text-slate-900">{cd.value}</span>
                          </div>
                          <div className="flex items-center text-emerald-600 space-x-1">
                            <span>Pg {cd.page}</span>
                            <ExternalLink className="w-3 h-3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
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
