import React, { useState, useEffect, useMemo } from 'react';
import { ScreenerMatch, AnalysisError } from '../types';
import { screenStocks, getScreenerState } from '../services/geminiService';
import { Search, Loader2, Filter, AlertTriangle, ArrowRight, Zap, ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  onAnalyze: (ticker: string) => void;
  onDataUpdate?: (data: ScreenerMatch[]) => void;
}

const PRESETS = [
  "Top 5 Nifty 50 Gainers today",
  "Banking stocks with low PE and high ROE",
  "IT Sector stocks breaking out",
  "Small Cap stocks with high volume",
  "Pharma stocks with positive news",
  "High Dividend Yield stocks > 4%"
];

type SortKey = keyof ScreenerMatch;
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

export const StockScreener: React.FC<Props> = ({ onAnalyze, onDataUpdate }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ScreenerMatch[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AnalysisError | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  // Restore state from cache on mount
  useEffect(() => {
    const cached = getScreenerState();
    if (cached) {
      setQuery(cached.query);
      setResults(cached.data);
      if (onDataUpdate) onDataUpdate(cached.data);
    }
  }, [onDataUpdate]);

  const handleScreen = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    setResults(null);
    setSortConfig(null); // Reset sort on new search
    try {
      const data = await screenStocks(searchQuery);
      setResults(data);
      if (onDataUpdate) onDataUpdate(data);
    } catch (err: any) {
      const isStructured = err && typeof err === 'object' && 'title' in err;
      if (isStructured) {
        setError(err as AnalysisError);
      } else {
        setError({
          title: "Screener Failed",
          message: err.message || "Could not complete the screening request.",
          isRetryable: true
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleScreen(query);
  };

  // Sorting Logic
  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedResults = useMemo(() => {
    if (!results) return null;
    if (!sortConfig) return results;

    const parseNumber = (val: string) => {
      // Remove commas, %, currency symbols, and other non-numeric chars except . and -
      const cleaned = val.replace(/,/g, '').replace(/%/g, '');
      const match = cleaned.match(/-?[\d.]+/);
      return match ? parseFloat(match[0]) : -Infinity;
    };

    return [...results].sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];

      let comparison = 0;

      // Numeric sorting for specific columns
      if (['price', 'change', 'pe_ratio', 'market_cap'].includes(sortConfig.key)) {
        const numA = parseNumber(valA);
        const numB = parseNumber(valB);
        comparison = numA - numB;
      } else {
        // String sorting for others
        comparison = String(valA).localeCompare(String(valB));
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [results, sortConfig]);

  const renderSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} className="text-indigo-400" /> 
      : <ArrowDown size={14} className="text-indigo-400" />;
  };

  const SortableHeader: React.FC<{ label: string; sortKey: SortKey; alignRight?: boolean }> = ({ label, sortKey, alignRight }) => (
    <th 
      className={`py-4 px-6 font-medium cursor-pointer group hover:bg-slate-800/50 transition-colors select-none ${alignRight ? 'text-right' : 'text-left'}`}
      onClick={() => handleSort(sortKey)}
    >
      <div className={`flex items-center gap-2 ${alignRight ? 'justify-end' : 'justify-start'}`}>
        {label}
        {renderSortIcon(sortKey)}
      </div>
    </th>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
      
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <Filter className="text-indigo-500" /> Smart Screener
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Describe your investment criteria in plain English, and AI will scan the market for you.
        </p>
      </div>

      {/* Search Input Area */}
      <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 shadow-xl">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative flex items-center">
            <Search className="absolute left-4 text-slate-500" size={20} />
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 'Find undervalued automobile stocks with growing revenue'"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-12 pr-32 py-4 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-inner text-lg"
            />
            <button 
              type="submit" 
              disabled={loading || !query.trim()}
              className="absolute right-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
              <span className="hidden sm:inline">Screen</span>
            </button>
          </div>
        </form>

        {/* Presets */}
        <div className="mt-6">
          <div className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wider">Quick Presets</div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(preset);
                  handleScreen(preset);
                }}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-indigo-500/50 text-slate-300 text-xs px-3 py-2 rounded-full transition-all"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-950/30 border border-red-500/30 p-6 rounded-xl flex items-center gap-4">
          <AlertTriangle className="text-red-500 flex-shrink-0" size={24} />
          <div>
            <h3 className="text-red-400 font-bold">{error.title}</h3>
            <p className="text-slate-300 text-sm">{error.message}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {sortedResults && (
        <div className="bg-slate-900/50 rounded-xl border border-slate-700 overflow-hidden shadow-xl animate-fade-in-up">
          <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
            <h3 className="font-bold text-indigo-400">Screening Results</h3>
            <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded">
              {sortedResults.length} Matches Found
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/80 text-slate-400 text-xs uppercase tracking-wider">
                  <SortableHeader label="Ticker" sortKey="ticker" />
                  <SortableHeader label="Price" sortKey="price" />
                  <SortableHeader label="Change" sortKey="change" />
                  <SortableHeader label="Sector" sortKey="sector" />
                  <SortableHeader label="P/E" sortKey="pe_ratio" />
                  <th className="py-4 px-6 font-medium">Match Reason</th>
                  <th className="py-4 px-6 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sortedResults.map((item, idx) => {
                  const isNegative = item.change.includes('-');
                  return (
                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="py-4 px-6 align-top">
                        <div className="font-bold text-white">{item.ticker}</div>
                        <div className="text-xs text-slate-500">{item.name}</div>
                      </td>
                      <td className={`py-4 px-6 font-mono align-top font-bold ${isNegative ? 'text-red-300' : 'text-green-300'}`}>
                        {item.price}
                      </td>
                      <td className={`py-4 px-6 font-mono font-bold align-top ${isNegative ? 'text-red-400' : 'text-green-400'}`}>
                         <div className="flex items-center gap-1.5">
                            {isNegative ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                            {item.change}
                         </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-300 align-top">
                        <span className="inline-block bg-indigo-900/30 px-3 py-1 rounded-full border border-indigo-500/20 text-indigo-200 text-xs font-semibold leading-tight max-w-[140px] whitespace-normal text-center shadow-sm">
                          {item.sector}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-mono text-sm text-slate-300 align-top">{item.pe_ratio}</td>
                      <td className="py-4 px-6 text-sm text-slate-400 align-top">
                        {item.match_reason}
                      </td>
                      <td className="py-4 px-6 text-right align-top">
                        <button 
                          onClick={() => onAnalyze(item.ticker)}
                          className="bg-indigo-600/10 hover:bg-indigo-600 hover:text-white text-indigo-400 border border-indigo-600/30 p-2 rounded-lg transition-all"
                          title="Analyze this stock"
                        >
                          <ArrowRight size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {!sortedResults && !loading && !error && (
        <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl">
           <div className="text-slate-600 mb-2">No results to display</div>
           <p className="text-slate-500 text-sm">Enter a query or select a preset to start screening.</p>
        </div>
      )}
    </div>
  );
};
