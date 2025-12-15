import React, { useState, useEffect } from 'react';
import { IPOItem, IPOReport, AnalysisError } from '../types';
import { fetchIPOList, generateIPOReport } from '../services/geminiService';
import { 
  Rocket, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Loader2, 
  ArrowRight,
  Briefcase,
  PieChart,
  ShieldAlert,
  Info,
  ChevronLeft,
  Filter,
  X
} from 'lucide-react';

interface Props {
  onDataUpdate?: (data: any) => void;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles = {
    'Open': 'bg-green-500/20 text-green-400 border-green-500/50',
    'Upcoming': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
    'Closed': 'bg-slate-500/20 text-slate-400 border-slate-500/50',
    'Listed': 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50',
  };
  const style = styles[status as keyof typeof styles] || styles['Closed'];

  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${style}`}>
      {status}
    </span>
  );
};

const GMPBadge: React.FC<{ gmp: string, percent: string }> = ({ gmp, percent }) => {
  const isPositive = !percent.includes('-');
  // Simple heuristic: > 20% is strong green, > 0 is yellow/green, < 0 is red
  const numPercent = parseFloat(percent.replace(/[%+]/g, '')) || 0;
  
  let color = 'text-slate-400 bg-slate-800 border-slate-700';
  if (numPercent >= 30) color = 'text-green-400 bg-green-900/30 border-green-500/30';
  else if (numPercent > 0) color = 'text-yellow-400 bg-yellow-900/30 border-yellow-500/30';
  else if (numPercent <= 0) color = 'text-red-400 bg-red-900/30 border-red-500/30';

  return (
    <div className={`flex flex-col items-end px-2 py-1 rounded border ${color}`}>
       <span className="text-xs font-mono font-bold">{gmp}</span>
       <span className="text-[10px] font-bold">{percent}</span>
    </div>
  );
};

export const IPODashboard: React.FC<Props> = ({ onDataUpdate }) => {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [ipoList, setIPOList] = useState<IPOItem[]>([]);
  const [selectedIPO, setSelectedIPO] = useState<IPOReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<AnalysisError | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<string>('All');

  // Fetch List on Mount
  useEffect(() => {
    const loadList = async () => {
      setLoading(true);
      try {
        const data = await fetchIPOList();
        setIPOList(data);
        if(onDataUpdate) onDataUpdate(data);
      } catch (err: any) {
        setError({
          title: "Failed to fetch IPOs",
          message: err.message || "Could not retrieve IPO list.",
          isRetryable: true
        });
      } finally {
        setLoading(false);
      }
    };
    loadList();
  }, [onDataUpdate]);

  const handleAnalyze = async (ipoName: string) => {
    setAnalyzing(true);
    setError(null);
    try {
      const report = await generateIPOReport(ipoName);
      setSelectedIPO(report);
      setView('detail');
      if(onDataUpdate) onDataUpdate(report);
    } catch (err: any) {
      setError({
        title: "Analysis Failed",
        message: err.message || "Could not analyze the selected IPO.",
        isRetryable: true
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleBack = () => {
    setView('list');
    setSelectedIPO(null);
    setError(null);
    if(onDataUpdate) onDataUpdate(ipoList);
  };

  const filteredIPOList = ipoList.filter(ipo => {
    const statusMatch = statusFilter === 'All' || ipo.status === statusFilter;
    const typeMatch = typeFilter === 'All' || (ipo.type || 'Mainboard') === typeFilter;
    return statusMatch && typeMatch;
  });

  if (view === 'list') {
    return (
      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Rocket className="text-indigo-500" /> IPO Radar
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Track Mainboard & SME IPOs. Analyze GMP trends and subscription data before investing.
          </p>
        </div>

        {error && (
           <div className="bg-red-950/30 border border-red-500/30 p-6 rounded-xl flex items-center gap-4">
             <AlertTriangle className="text-red-500 flex-shrink-0" size={24} />
             <div>
               <h3 className="text-red-400 font-bold">{error.title}</h3>
               <p className="text-slate-300 text-sm">{error.message}</p>
             </div>
           </div>
        )}

        {/* Filter Controls */}
        <div className="flex flex-wrap gap-4 items-center bg-slate-900/50 p-4 rounded-xl border border-slate-700">
          <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
            <Filter size={16} />
            <span>Filter By:</span>
          </div>
          
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none hover:bg-slate-700/50 transition-colors"
          >
            <option value="All">All Status</option>
            <option value="Open">Open Now</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Closed">Closed</option>
            <option value="Listed">Listed</option>
          </select>

          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-800 border border-slate-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none hover:bg-slate-700/50 transition-colors"
          >
            <option value="All">All Exchanges</option>
            <option value="Mainboard">Mainboard</option>
            <option value="SME">SME</option>
          </select>

          {(statusFilter !== 'All' || typeFilter !== 'All') && (
            <button 
              onClick={() => { setStatusFilter('All'); setTypeFilter('All'); }}
              className="ml-auto text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium px-3 py-2 hover:bg-indigo-900/20 rounded-lg transition-colors"
            >
              <X size={14} /> Clear Filters
            </button>
          )}
        </div>

        {loading ? (
           <div className="flex flex-col items-center justify-center py-20">
             <Loader2 className="animate-spin text-indigo-500 mb-4" size={40} />
             <span className="text-slate-400 font-medium">Scanning Primary Market...</span>
           </div>
        ) : (
          <>
            {filteredIPOList.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                 <div className="text-slate-500 text-sm">No IPOs match your selected filters.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredIPOList.map((ipo, idx) => (
                    <div key={idx} className="bg-slate-900/50 border border-slate-700 hover:border-indigo-500/50 rounded-xl p-5 shadow-lg transition-all group relative overflow-hidden flex flex-col h-full">
                      <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex gap-2 mb-2">
                              <StatusBadge status={ipo.status} />
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wide ${ipo.type === 'SME' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' : 'bg-blue-500/10 text-blue-300 border-blue-500/30'}`}>
                                {ipo.type || 'Mainboard'}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors leading-tight">{ipo.name}</h3>
                            <p className="text-xs text-slate-500 font-mono mt-1">{ipo.symbol}</p>
                          </div>
                          <GMPBadge gmp={ipo.gmp} percent={ipo.gmpPercent} />
                      </div>
                      
                      <div className="space-y-2 text-sm text-slate-300 mb-6 flex-1">
                          <div className="flex justify-between border-b border-slate-800/50 pb-2">
                            <span className="text-slate-500 flex items-center gap-1 text-xs uppercase font-bold tracking-wider"><Calendar size={12}/> Dates</span>
                            <span className="font-mono text-xs">{ipo.openDate} - {ipo.closeDate}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-800/50 pb-2">
                            <span className="text-slate-500 flex items-center gap-1 text-xs uppercase font-bold tracking-wider"><DollarSign size={12}/> Price</span>
                            <span className="font-mono text-xs">{ipo.priceBand}</span>
                          </div>
                          <div className="flex justify-between border-b border-slate-800/50 pb-2">
                            <span className="text-slate-500 flex items-center gap-1 text-xs uppercase font-bold tracking-wider"><Briefcase size={12}/> Size</span>
                            <span className="font-mono text-xs">{ipo.issueSize}</span>
                          </div>
                      </div>

                      <button 
                        onClick={() => handleAnalyze(ipo.name)}
                        disabled={analyzing}
                        className="w-full bg-slate-800 hover:bg-indigo-600 text-white py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 border border-slate-700 hover:border-indigo-500 disabled:opacity-50"
                      >
                          {analyzing ? <Loader2 className="animate-spin" size={16} /> : <TrendingUp size={16} />}
                          Analyze Report
                      </button>
                    </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // DETAIL VIEW
  if (!selectedIPO) return null; // Should not happen

  const isPositiveVerdict = selectedIPO.analysis.verdict.includes('Apply');
  const isAvoid = selectedIPO.analysis.verdict.includes('Avoid');
  
  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
         <button onClick={handleBack} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <ChevronLeft size={24} />
         </button>
         <div>
            <h1 className="text-3xl font-black text-white tracking-tight">{selectedIPO.company_name}</h1>
            <div className="flex items-center gap-3 mt-1">
               <span className="text-sm text-indigo-400 font-bold bg-indigo-900/20 px-2 py-0.5 rounded border border-indigo-500/30">{selectedIPO.sector}</span>
               <span className="text-sm text-slate-500">{selectedIPO.summary}</span>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         
         {/* Left Column: Offer Details */}
         <div className="space-y-6">
            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 shadow-xl">
               <h3 className="flex items-center gap-2 text-indigo-400 font-bold mb-4">
                  <Briefcase size={18} /> Offer Details
               </h3>
               <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                     <span className="text-slate-400">Price Band</span>
                     <span className="text-white font-mono font-bold">{selectedIPO.details.price_band}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                     <span className="text-slate-400">Lot Size</span>
                     <span className="text-white font-mono">{selectedIPO.details.lot_size}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                     <span className="text-slate-400">Min Investment</span>
                     <span className="text-white font-mono">{selectedIPO.details.min_investment}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                     <span className="text-slate-400">Issue Size</span>
                     <span className="text-white font-mono">{selectedIPO.details.issue_size}</span>
                  </div>
                  <div className="pt-2">
                     <div className="text-xs text-slate-500 uppercase font-bold mb-2">Key Dates</div>
                     <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-800 p-2 rounded">
                           <div className="text-slate-400">Open</div>
                           <div className="text-white font-mono">{selectedIPO.details.dates.open}</div>
                        </div>
                        <div className="bg-slate-800 p-2 rounded">
                           <div className="text-slate-400">Close</div>
                           <div className="text-white font-mono">{selectedIPO.details.dates.close}</div>
                        </div>
                        <div className="bg-slate-800 p-2 rounded">
                           <div className="text-slate-400">Allotment</div>
                           <div className="text-white font-mono">{selectedIPO.details.dates.allotment}</div>
                        </div>
                        <div className="bg-slate-800 p-2 rounded">
                           <div className="text-slate-400">Listing</div>
                           <div className="text-white font-mono">{selectedIPO.details.dates.listing}</div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 shadow-xl">
               <h3 className="flex items-center gap-2 text-indigo-400 font-bold mb-4">
                  <PieChart size={18} /> Subscription Status
               </h3>
               <div className="space-y-4">
                  <div className="flex items-end justify-between mb-1">
                     <span className="text-sm text-slate-400">QIB</span>
                     <span className="text-lg font-mono font-bold text-white">{selectedIPO.subscription.qib}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                     <div className="bg-indigo-500 h-full" style={{width: '60%'}}></div>
                  </div>

                  <div className="flex items-end justify-between mb-1">
                     <span className="text-sm text-slate-400">NII (HNI)</span>
                     <span className="text-lg font-mono font-bold text-white">{selectedIPO.subscription.nii}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                     <div className="bg-cyan-500 h-full" style={{width: '40%'}}></div>
                  </div>

                  <div className="flex items-end justify-between mb-1">
                     <span className="text-sm text-slate-400">Retail</span>
                     <span className="text-lg font-mono font-bold text-white">{selectedIPO.subscription.retail}</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                     <div className="bg-green-500 h-full" style={{width: '75%'}}></div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
                     <span className="text-xs text-slate-500">As of {selectedIPO.subscription.as_of}</span>
                     <span className="text-sm font-bold text-white">Total: {selectedIPO.subscription.total}</span>
                  </div>
               </div>
            </div>
         </div>

         {/* Center Column: Analysis */}
         <div className="lg:col-span-2 space-y-6">
            
            {/* Verdict Card */}
            <div className={`p-6 rounded-xl border-l-4 shadow-xl ${isPositiveVerdict ? 'bg-green-900/20 border-green-500' : isAvoid ? 'bg-red-900/20 border-red-500' : 'bg-yellow-900/20 border-yellow-500'}`}>
               <div className="flex justify-between items-start mb-4">
                  <div>
                     <h3 className="text-xs font-bold uppercase tracking-wider mb-1 text-slate-400">Analyst Verdict</h3>
                     <div className={`text-2xl font-black ${isPositiveVerdict ? 'text-green-400' : isAvoid ? 'text-red-400' : 'text-yellow-400'}`}>
                        {selectedIPO.analysis.verdict}
                     </div>
                  </div>
                  {isPositiveVerdict ? <CheckCircle size={32} className="text-green-500 opacity-80"/> : 
                   isAvoid ? <AlertTriangle size={32} className="text-red-500 opacity-80"/> : <Info size={32} className="text-yellow-500 opacity-80"/>}
               </div>
               <p className="text-slate-300 italic text-sm leading-relaxed border-t border-white/5 pt-3">
                  "{selectedIPO.analysis.verdict_rationale}"
               </p>
            </div>

            {/* GMP & Strategy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700">
                  <h3 className="flex items-center gap-2 text-indigo-400 font-bold mb-4">
                     <TrendingUp size={18} /> Market Sentiment
                  </h3>
                  <div className="space-y-4">
                     <div className="bg-slate-800/50 p-4 rounded-lg flex justify-between items-center">
                        <span className="text-slate-400 text-sm">GMP</span>
                        <div className="text-right">
                           <div className="text-xl font-bold text-green-400">{selectedIPO.market_sentiment.gmp}</div>
                           <div className="text-xs text-slate-500">Trend: {selectedIPO.market_sentiment.gmp_trend}</div>
                        </div>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Est. Listing Price</span>
                        <span className="text-white font-mono font-bold">{selectedIPO.market_sentiment.est_listing_price}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Est. Listing Gains</span>
                        <span className="text-green-400 font-mono font-bold">{selectedIPO.market_sentiment.listing_gain_pct}</span>
                     </div>
                  </div>
               </div>

               <div className="bg-slate-900/50 p-6 rounded-xl border border-red-900/30">
                  <h3 className="flex items-center gap-2 text-red-400 font-bold mb-4">
                     <ShieldAlert size={18} /> Risk Factors
                  </h3>
                  <ul className="space-y-2">
                     {selectedIPO.analysis.risk_factors.map((risk, i) => (
                        <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                           <span className="mt-1.5 w-1 h-1 bg-red-500 rounded-full flex-shrink-0"></span>
                           {risk}
                        </li>
                     ))}
                  </ul>
               </div>
            </div>

            {/* Business & Strengths (Redesigned based on screenshot) */}
            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 shadow-xl">
               <h3 className="flex items-center gap-2 text-indigo-400 font-bold mb-4">
                  <Briefcase size={18} /> Business & Strengths
               </h3>
               <p className="text-slate-300 text-sm leading-relaxed mb-8">
                  {selectedIPO.analysis.business_model}
               </p>
               
               <h4 className="text-xs font-bold text-slate-500 uppercase mb-4 tracking-wider">Key Strengths</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedIPO.analysis.financial_strengths.map((strength, i) => (
                     <div key={i} className="bg-slate-800/40 p-4 rounded-lg border border-slate-700/50 flex items-start gap-3 hover:bg-slate-800/60 transition-colors">
                        <div className="mt-0.5 flex-shrink-0">
                           <CheckCircle size={18} className="text-green-500" />
                        </div>
                        <span className="text-sm text-slate-300 leading-relaxed">{strength}</span>
                     </div>
                  ))}
               </div>
            </div>

         </div>
      </div>
    </div>
  );
};
