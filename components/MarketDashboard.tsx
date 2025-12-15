import React, { useEffect, useState, useCallback } from 'react';
import { MarketBrief, AnalysisError } from '../types';
import { getMarketOverview } from '../services/geminiService';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  RefreshCw, 
  Newspaper, 
  BarChart2, 
  DollarSign, 
  Globe,
  Loader2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Calendar
} from 'lucide-react';

interface Props {
  onDataUpdate?: (data: MarketBrief) => void;
  onAnalyze: (ticker: string) => void;
}

export const MarketDashboard: React.FC<Props> = ({ onDataUpdate, onAnalyze }) => {
  const [data, setData] = useState<MarketBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<AnalysisError | null>(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    // If we have data and it's a forced refresh (manual or interval), use refreshing state.
    // If we have no data, use full loading state.
    if (data && forceRefresh) {
      setRefreshing(true);
    } else if (!data) {
      setLoading(true);
    }
    
    if (!data) setError(null);

    try {
      const result = await getMarketOverview(forceRefresh);
      setData(result);
      if (onDataUpdate) onDataUpdate(result); // Pass data up to parent
      setError(null);
    } catch (err: any) {
        const isStructured = err && typeof err === 'object' && 'title' in err;
        const analysisError = isStructured ? (err as AnalysisError) : {
            title: "Market Data Error",
            message: err.message || "Failed to load market data.",
            details: String(err),
            isRetryable: true
        };
        setError(analysisError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [data, onDataUpdate]);

  useEffect(() => {
    // Initial load: forceRefresh = false to allow using cache
    fetchData(false);

    const intervalId = setInterval(() => {
      // Interval load: forceRefresh = true to get new data
      fetchData(true);
    }, 60000); // 60 seconds

    return () => clearInterval(intervalId);
  }, [fetchData]);

  // Initial Loading State
  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] animate-pulse">
        <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
        <h3 className="text-xl text-slate-400 font-medium">Scanning Market Data...</h3>
        <p className="text-sm text-slate-500 mt-2">Fetching live indices, flows, and news</p>
      </div>
    );
  }

  // Blocking Error State (Only if no data is available)
  if (error && !data) {
    return (
      <div className="max-w-3xl mx-auto mt-12">
        <div className="bg-red-950/30 border border-red-500/30 p-8 rounded-2xl animate-fade-in shadow-xl">
          <div className="flex flex-col items-center text-center">
            <div className="bg-red-500/10 p-4 rounded-full mb-4">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            <h3 className="text-2xl text-red-400 font-bold mb-2">{error.title}</h3>
            <p className="text-slate-300 mb-6 max-w-lg leading-relaxed">{error.message}</p>
            
            {error.details && (
              <div className="w-full bg-black/30 p-3 rounded-lg border border-red-900/30 text-xs font-mono text-red-300/70 mb-6 overflow-x-auto text-left">
                {error.details}
              </div>
            )}

            {error.isRetryable && (
              <button 
                onClick={() => fetchData(true)}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-red-900/20 hover:shadow-red-900/40"
              >
                <RefreshCw size={20} />
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
      
      {/* Non-blocking Error Toast (If refresh fails while data exists) */}
      {error && data && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center justify-between animate-fade-in">
           <div className="flex items-center gap-2">
             <AlertTriangle size={16} />
             <span><strong>Update Failed:</strong> {error.message}</span>
           </div>
           <button onClick={() => fetchData(true)} className="text-red-400 hover:text-red-300 underline text-xs">Retry</button>
        </div>
      )}

      {/* Header & Sentiment */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 gap-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Globe className="text-indigo-500" /> Market Overview
          </h2>
          <div className="flex items-center gap-3 mt-1">
             <p className="text-slate-400 text-sm font-mono flex items-center gap-1">
               <Clock size={12} />
               Updated: {data.timestamp_ist}
             </p>
             <button 
               onClick={() => fetchData(true)} 
               disabled={refreshing}
               className={`p-1.5 rounded-full hover:bg-slate-800 transition-all border border-transparent hover:border-slate-700 ${refreshing ? 'text-indigo-400 cursor-not-allowed' : 'text-slate-500 hover:text-indigo-400'}`}
               title="Refresh Data"
             >
               <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
             </button>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-slate-900/80 px-5 py-3 rounded-xl border border-slate-800 shadow-lg w-full md:w-auto">
          <div className="flex-1 text-right md:text-left md:flex-none">
            <div className="text-xs text-slate-500 uppercase font-bold">Market Sentiment</div>
            <div className={`text-xl font-bold ${data.sentiment_score > 60 ? 'text-green-400' : data.sentiment_score < 40 ? 'text-red-400' : 'text-yellow-400'}`}>
              {data.market_sentiment}
            </div>
          </div>
          <div className="w-14 h-14 rounded-full border-4 border-slate-700 flex items-center justify-center relative flex-shrink-0">
             <span className="text-xs font-bold text-white">{data.sentiment_score}</span>
             <svg className="absolute top-0 left-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-slate-800 opacity-50" />
                <circle 
                  cx="50" cy="50" r="46" 
                  fill="transparent" 
                  stroke={data.sentiment_score > 60 ? '#4ade80' : data.sentiment_score < 40 ? '#f87171' : '#facc15'} 
                  strokeWidth="8" 
                  strokeDasharray={`${data.sentiment_score * 2.89} 289`}
                  className="transition-all duration-1000 ease-out"
                />
             </svg>
          </div>
        </div>
      </div>

      {/* Indices Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.indices.map((idx, i) => (
          <div 
            key={i} 
            onClick={() => onAnalyze(idx.name)} // Even indices can be analyzed if the API supports it, or it prompts a search
            className="group bg-slate-800/40 p-5 rounded-xl border border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800/60 transition-all shadow-lg cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-10 bg-indigo-500/5 blur-3xl rounded-full -mr-5 -mt-5 group-hover:bg-indigo-500/10 transition-colors"></div>
            <div className="relative z-10">
              <div className="text-slate-400 text-xs font-bold uppercase mb-2 flex items-center justify-between">
                {idx.name}
                <ArrowRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-indigo-400" />
              </div>
              <div className="flex justify-between items-baseline">
                <div className="text-2xl font-mono font-bold text-white">{idx.value}</div>
                <div className={`flex items-center gap-1 font-mono text-sm font-bold ${idx.trend === 'up' ? 'text-green-400' : idx.trend === 'down' ? 'text-red-400' : 'text-slate-400'}`}>
                  {idx.trend === 'up' ? <TrendingUp size={14} /> : idx.trend === 'down' ? <TrendingDown size={14} /> : <Minus size={14} />}
                  {idx.percentChange}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Gainers/Losers & FII/DII - Spans 8 cols */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* FII / DII Flow */}
          <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 shadow-lg">
             <h3 className="flex items-center gap-2 text-indigo-400 font-bold mb-4">
               <DollarSign size={18} /> Institutional Flow ({data.fii_dii.date})
             </h3>
             <div className="grid grid-cols-2 gap-8">
               <div className="relative p-4 bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                 <div className={`absolute left-0 top-0 bottom-0 w-1 ${data.fii_dii.fii_net.includes('-') ? 'bg-red-500' : 'bg-green-500'}`}></div>
                 <div className="text-slate-400 text-xs uppercase mb-1 font-bold">FII Net Activity</div>
                 <div className={`text-2xl font-mono font-bold ${data.fii_dii.fii_net.includes('-') ? 'text-red-400' : 'text-green-400'}`}>
                   {data.fii_dii.fii_net} <span className="text-sm text-slate-500">Cr</span>
                 </div>
               </div>
               <div className="relative p-4 bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                 <div className={`absolute left-0 top-0 bottom-0 w-1 ${data.fii_dii.dii_net.includes('-') ? 'bg-red-500' : 'bg-green-500'}`}></div>
                 <div className="text-slate-400 text-xs uppercase mb-1 font-bold">DII Net Activity</div>
                 <div className={`text-2xl font-mono font-bold ${data.fii_dii.dii_net.includes('-') ? 'text-red-400' : 'text-green-400'}`}>
                   {data.fii_dii.dii_net} <span className="text-sm text-slate-500">Cr</span>
                 </div>
               </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gainers */}
            <div className="bg-slate-900/50 rounded-xl border border-slate-700 overflow-hidden shadow-lg flex flex-col h-full">
              <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center">
                <span className="text-green-400 font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
                    <TrendingUp size={16} /> Top Gainers
                </span>
              </div>
              <div className="flex-1">
                {data.top_gainers.map((stock, i) => (
                  <div 
                    key={i} 
                    onClick={() => onAnalyze(stock.ticker)}
                    className="flex justify-between items-center p-4 border-b border-slate-800 last:border-0 hover:bg-slate-800/60 cursor-pointer transition-all group"
                  >
                    <div>
                        <div className="font-bold text-slate-200 group-hover:text-indigo-300 transition-colors flex items-center gap-2">
                            {stock.ticker}
                            <ArrowRight size={12} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-indigo-400" />
                        </div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-300 font-mono text-sm">{stock.price}</div>
                      <div className="text-green-400 text-xs font-mono font-bold bg-green-500/10 px-1.5 py-0.5 rounded inline-block mt-1">
                        {stock.change}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Losers */}
            <div className="bg-slate-900/50 rounded-xl border border-slate-700 overflow-hidden shadow-lg flex flex-col h-full">
              <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center">
                <span className="text-red-400 font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
                    <TrendingDown size={16} /> Top Losers
                </span>
              </div>
              <div className="flex-1">
                {data.top_losers.map((stock, i) => (
                  <div 
                    key={i} 
                    onClick={() => onAnalyze(stock.ticker)}
                    className="flex justify-between items-center p-4 border-b border-slate-800 last:border-0 hover:bg-slate-800/60 cursor-pointer transition-all group"
                  >
                    <div>
                        <div className="font-bold text-slate-200 group-hover:text-indigo-300 transition-colors flex items-center gap-2">
                            {stock.ticker}
                            <ArrowRight size={12} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-indigo-400" />
                        </div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-300 font-mono text-sm">{stock.price}</div>
                      <div className="text-red-400 text-xs font-mono font-bold bg-red-500/10 px-1.5 py-0.5 rounded inline-block mt-1">
                        {stock.change}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: News & Sectors & Corporate Actions - Spans 4 cols */}
        <div className="lg:col-span-4 space-y-6">
           {/* Sector Performance */}
           <div className="bg-slate-900/50 rounded-xl border border-slate-700 shadow-lg overflow-hidden">
              <div className="p-4 border-b border-slate-700 bg-slate-800/30">
                <h3 className="flex items-center gap-2 text-indigo-400 font-bold text-sm uppercase tracking-wider">
                  <BarChart2 size={16} /> Sector Watch
                </h3>
              </div>
              <div className="divide-y divide-slate-800">
                {data.sector_performance.map((sec, i) => (
                  <div key={i} className="flex justify-between items-center p-3 hover:bg-slate-800/40 transition-colors">
                    <span className="text-slate-300 text-sm font-medium">{sec.sector}</span>
                    <span className={`font-mono text-sm font-bold px-2 py-0.5 rounded ${
                        sec.trend === 'up' ? 'text-green-400 bg-green-500/10' : 
                        sec.trend === 'down' ? 'text-red-400 bg-red-500/10' : 'text-slate-400 bg-slate-700/30'
                    }`}>
                      {sec.performance}
                    </span>
                  </div>
                ))}
              </div>
           </div>

           {/* Corporate Actions */}
           <div className="bg-slate-900/50 rounded-xl border border-slate-700 shadow-lg overflow-hidden">
             <div className="p-4 border-b border-slate-700 bg-slate-800/30">
               <h3 className="flex items-center gap-2 text-indigo-400 font-bold text-sm uppercase tracking-wider">
                 <Calendar size={16} /> Corporate Events
               </h3>
             </div>
             <div className="divide-y divide-slate-800">
               {data.corporate_actions.map((action, i) => (
                 <div key={i} className="p-4 hover:bg-slate-800/40 transition-colors flex justify-between items-start group">
                   <div>
                      <div className="flex items-center gap-2 mb-1">
                         <span className="text-slate-200 font-bold text-sm">{action.company}</span>
                         <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                            action.type === 'Dividend' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                            action.type === 'Buyback' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            action.type === 'Split' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                            'bg-slate-700 text-slate-400 border-slate-600'
                         }`}>{action.type}</span>
                      </div>
                      <div className="text-xs text-slate-400">{action.details}</div>
                   </div>
                   <div className="text-right">
                      <div className="text-xs font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                        {action.ex_date}
                      </div>
                      <div className={`text-[10px] mt-1 font-medium ${
                         action.impact === 'Positive' ? 'text-green-400' : 
                         action.impact === 'Negative' ? 'text-red-400' : 'text-slate-500'
                      }`}>
                        {action.impact}
                      </div>
                   </div>
                 </div>
               ))}
               {data.corporate_actions.length === 0 && (
                  <div className="p-4 text-center text-xs text-slate-500">No major upcoming actions found</div>
               )}
             </div>
           </div>

           {/* Market News */}
           <div className="bg-slate-900/50 rounded-xl border border-slate-700 overflow-hidden shadow-lg flex flex-col h-full">
             <div className="p-4 border-b border-slate-700 bg-slate-800/30">
               <h3 className="flex items-center gap-2 text-indigo-400 font-bold text-sm uppercase tracking-wider">
                  <Newspaper size={16} /> Market Pulse
               </h3>
             </div>
             <div className="divide-y divide-slate-800">
               {data.latest_news.map((news, i) => (
                 <div key={i} className="p-4 hover:bg-slate-800/40 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${news.sentiment === 'positive' ? 'text-green-400 border-green-500/30 bg-green-500/10' : news.sentiment === 'negative' ? 'text-red-400 border-red-500/30 bg-red-500/10' : 'text-slate-400 border-slate-600 bg-slate-700/30'}`}>
                        {news.sentiment}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{news.time}</span>
                    </div>
                    <h4 className="text-sm text-slate-200 font-medium leading-snug mb-2 group-hover:text-indigo-300 transition-colors">
                      {news.title}
                    </h4>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                        {news.source}
                    </div>
                 </div>
               ))}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};
