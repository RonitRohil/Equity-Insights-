import React, { useState } from 'react';
import { generateAnalysis } from './services/geminiService';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { MarketDashboard } from './components/MarketDashboard';
import { StockScreener } from './components/StockScreener';
import { ChatAssistant } from './components/ChatAssistant';
import { IPODashboard } from './components/IPODashboard';
import { AnalysisReport, SearchParams, AnalysisError, MarketBrief, ScreenerMatch } from './types';
import { Search, Loader2, BarChart4, AlertTriangle, RefreshCw, LayoutDashboard, Filter, ChevronDown, Lightbulb, XCircle, Rocket } from 'lucide-react';

type ViewState = 'search' | 'market' | 'screener' | 'ipo';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('market');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState<AnalysisError | null>(null);
  
  // Shared state for Context Awareness in Chat
  const [marketData, setMarketData] = useState<MarketBrief | null>(null);
  const [screenerData, setScreenerData] = useState<ScreenerMatch[] | null>(null);
  const [ipoData, setIPOData] = useState<any | null>(null);

  // Default search params matching the prompt
  const [params, setParams] = useState<SearchParams>({
    ticker: 'RELIANCE',
    exchange: 'NSE',
    horizon: 'swing',
    lookback: 180
  });

  // Determine current context data for Chat Assistant
  const getCurrentContextData = () => {
    switch (currentView) {
      case 'market': return marketData;
      case 'screener': return screenerData;
      case 'ipo': return ipoData;
      case 'search': return report;
      default: return null;
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    setReport(null); // Clear previous report to avoid confusion
    
    try {
      const data = await generateAnalysis(params);
      setReport(data);
    } catch (err: any) {
      const isStructured = err && typeof err === 'object' && 'title' in err;
      if (isStructured) {
        setError(err as AnalysisError);
      } else {
        setError({
          title: "Unexpected Error",
          message: err.message || "An unknown error occurred.",
          details: String(err),
          isRetryable: true
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeFromScreener = (ticker: string) => {
    setParams({ ...params, ticker: ticker.toUpperCase() });
    setCurrentView('search');
    setReport(null); 
    setError(null);
  };

  const handleAnalyzeFromMarket = (ticker: string) => {
    setParams({ ...params, ticker: ticker.toUpperCase() });
    setCurrentView('search');
    setReport(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8">
      {/* Navigation Bar */}
      <nav className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between mb-8 pb-4 border-b border-slate-800 gap-4">
        <div 
          className="flex items-center gap-2 cursor-pointer self-start md:self-auto" 
          onClick={() => setCurrentView('market')}
        >
          <div className="bg-indigo-600 p-2 rounded-lg">
            <BarChart4 className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">EquityInsight Pro</h1>
            <p className="text-xs text-slate-400">AI-Powered Equity Research</p>
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2 text-sm font-medium text-slate-400 bg-slate-900/50 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
          <button 
            onClick={() => setCurrentView('market')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${currentView === 'market' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'hover:text-indigo-400 hover:bg-slate-800'}`}
          >
            <LayoutDashboard size={16} />
            <span>Market</span>
          </button>
          <button 
            onClick={() => setCurrentView('screener')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${currentView === 'screener' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'hover:text-indigo-400 hover:bg-slate-800'}`}
          >
            <Filter size={16} />
            <span>Screener</span>
          </button>
          <button 
            onClick={() => setCurrentView('ipo')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${currentView === 'ipo' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'hover:text-indigo-400 hover:bg-slate-800'}`}
          >
            <Rocket size={16} />
            <span>IPO Radar</span>
          </button>
          <button 
            onClick={() => setCurrentView('search')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${currentView === 'search' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'hover:text-indigo-400 hover:bg-slate-800'}`}
          >
            <Search size={16} />
            <span>Analyzer</span>
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto">
        
        {/* Market Dashboard View */}
        {currentView === 'market' && (
          <MarketDashboard 
            onDataUpdate={setMarketData} 
            onAnalyze={handleAnalyzeFromMarket}
          />
        )}

        {/* Screener View */}
        {currentView === 'screener' && (
          <StockScreener 
            onAnalyze={handleAnalyzeFromScreener} 
            onDataUpdate={setScreenerData}
          />
        )}

        {/* IPO View */}
        {currentView === 'ipo' && (
          <IPODashboard 
            onDataUpdate={setIPOData}
          />
        )}

        {/* Stock Analyzer View */}
        {currentView === 'search' && (
          <>
            <section className="mb-8 animate-fade-in">
              <form onSubmit={handleSearch} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row gap-4 items-end shadow-lg">
                <div className="flex-1 space-y-1 w-full">
                  <label className="text-xs font-bold text-slate-500 uppercase">Ticker Symbol</label>
                  <input 
                    type="text" 
                    value={params.ticker}
                    onChange={(e) => setParams({...params, ticker: e.target.value.toUpperCase()})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                    placeholder="e.g. RELIANCE"
                  />
                </div>
                
                <div className="w-full md:w-32 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Exchange</label>
                  <div className="relative">
                    <select 
                      value={params.exchange}
                      onChange={(e) => setParams({...params, exchange: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-4 pr-10 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer hover:bg-slate-700/50 transition-colors font-mono"
                    >
                      <option value="NSE">NSE</option>
                      <option value="BSE">BSE</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                  </div>
                </div>

                <div className="w-full md:w-48 space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Horizon</label>
                  <div className="relative">
                    <select 
                      value={params.horizon}
                      onChange={(e) => setParams({...params, horizon: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-4 pr-10 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer hover:bg-slate-700/50 transition-colors font-mono"
                    >
                      <option value="intraday">Intraday</option>
                      <option value="swing">Swing (Days)</option>
                      <option value="positional">Positional (Weeks)</option>
                      <option value="long-term">Long Term</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed h-[46px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Search size={18} />
                      <span>Generate Report</span>
                    </>
                  )}
                </button>
              </form>
            </section>

            {/* Granular Error Display */}
            {error && (
              <div className="group bg-gradient-to-br from-red-950/90 to-red-900/90 border border-red-500/60 p-1 rounded-2xl mb-8 animate-fade-in shadow-2xl backdrop-blur-md relative overflow-hidden">
                {/* Pulse animation for emphasis */}
                <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none"></div>
                
                <div className="bg-slate-950/40 p-6 rounded-xl relative z-10 flex flex-col md:flex-row items-start gap-5">
                   <div className="bg-red-500/20 p-3 rounded-xl flex-shrink-0 border border-red-500/30 shadow-inner">
                     <AlertTriangle className="text-red-500 drop-shadow-md" size={32} />
                   </div>
                   
                   <div className="flex-1 w-full">
                     <div className="flex justify-between items-start">
                        <h3 className="text-white font-bold text-xl mb-2 flex items-center gap-2 tracking-tight">
                          {error.title}
                        </h3>
                        {/* Quick dismiss x */}
                        <button onClick={() => setError(null)} className="text-red-300 hover:text-white transition-colors">
                            <XCircle size={20} />
                        </button>
                     </div>
                     
                     <p className="text-red-100/90 text-lg leading-relaxed mb-4 font-medium border-l-2 border-red-500 pl-4">
                       {error.message}
                     </p>
                     
                     {/* Contextual Hints based on Error Title */}
                     {error.title.includes("Ticker") && (
                       <div className="flex items-start gap-2 text-sm text-amber-200 bg-amber-900/20 p-3 rounded-lg mb-4 border border-amber-500/30">
                         <Lightbulb size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
                         <span><strong>Tip:</strong> Ensure the ticker symbol (e.g., RELIANCE) is correct for the selected exchange ({params.exchange}). Common names might differ from official tickers.</span>
                       </div>
                     )}
                     
                     {error.title.includes("Rate Limit") && (
                       <div className="flex items-start gap-2 text-sm text-blue-200 bg-blue-900/20 p-3 rounded-lg mb-4 border border-blue-500/30">
                         <Lightbulb size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
                         <span><strong>Tip:</strong> The AI model is busy. Please wait 30-60 seconds before retrying.</span>
                       </div>
                     )}

                     {error.details && (
                        <div className="mb-6 rounded-lg border border-red-900/50 overflow-hidden">
                          <button 
                            className="w-full bg-red-950/50 px-4 py-2 border-b border-red-900/30 text-xs font-bold text-red-300 uppercase tracking-wider flex items-center gap-2 hover:bg-red-900/70 transition-colors text-left"
                            onClick={(e) => e.currentTarget.nextElementSibling?.classList.toggle('hidden')}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            View Technical Details (Click to toggle)
                          </button>
                          <div className="hidden p-4 bg-black/40 text-xs font-mono text-red-200/70 overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
                            {error.details}
                          </div>
                        </div>
                     )}

                     <div className="flex flex-col sm:flex-row gap-3 mt-2">
                       {error.isRetryable && (
                         <button 
                           onClick={() => handleSearch()}
                           className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-lg font-bold transition-all shadow-lg shadow-red-900/40 hover:shadow-red-900/60 active:scale-[0.98] ring-2 ring-red-500/50 ring-offset-2 ring-offset-slate-900"
                         >
                           <RefreshCw size={18} />
                           Retry Analysis
                         </button>
                       )}
                       <button 
                         onClick={() => setError(null)}
                         className={`px-6 py-3 rounded-lg font-medium text-red-300 hover:text-white hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 ${!error.isRetryable ? 'w-full bg-slate-800' : ''}`}
                       >
                         Dismiss
                       </button>
                     </div>
                   </div>
                </div>
              </div>
            )}

            {/* Content Area */}
            {report ? (
              <AnalysisDashboard report={report} />
            ) : (
              !loading && !error && (
                <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-4">
                    <BarChart4 className="text-slate-600" size={32} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-300 mb-2">Ready to Analyze</h2>
                  <p className="text-slate-500 max-w-md mx-auto">
                    Enter a stock ticker above to generate a professional-grade equity research report with real-time data grounding and AI reasoning.
                  </p>
                </div>
              )
            )}
          </>
        )}
      </main>

      {/* Chat Assistant Overlay */}
      <ChatAssistant 
        contextData={getCurrentContextData()} 
        view={currentView} 
      />
    </div>
  );
};

export default App;