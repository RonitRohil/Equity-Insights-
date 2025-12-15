import React from 'react';
import { AnalysisReport, Evidence, Scenario, ReasoningStep } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  BarChart2, 
  Activity,
  FileText,
  Search,
  ShieldAlert,
  Target,
  ArrowRightCircle,
  StopCircle,
  Brain,
  Calculator,
  Eye,
  Flag,
  Lightbulb,
  HelpCircle,
  Minus
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface Props {
  report: AnalysisReport;
}

const MetricCard: React.FC<{ label: string; value: string | number; subValue?: string; trend?: 'up' | 'down' | 'neutral' }> = ({ label, value, subValue, trend }) => (
  <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
    <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">{label}</div>
    <div className="text-2xl font-mono font-bold text-slate-100">{value}</div>
    {subValue && <div className={`text-xs mt-1 ${trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-slate-500'}`}>{subValue}</div>}
  </div>
);

const ScenarioCard: React.FC<{ type: string; data: Scenario; color: string }> = ({ type, data, color }) => (
  <div className={`p-4 rounded-lg border-l-4 bg-slate-800/50 ${color}`}>
    <div className="flex justify-between items-center mb-2">
      <h4 className="font-bold uppercase text-sm tracking-wide text-slate-200">{type} Case</h4>
      <span className="text-xs font-mono bg-slate-900 px-2 py-1 rounded text-slate-300">{data.probability}</span>
    </div>
    <div className="mb-2">
      <span className="text-xs text-slate-400">Target:</span>
      <span className="ml-2 font-mono font-bold text-lg">{data.target_price}</span>
    </div>
    <p className="text-sm text-slate-400 leading-relaxed">{data.description}</p>
  </div>
);

const EvidenceRow: React.FC<{ item: Evidence }> = ({ item }) => (
  <tr className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
    <td className="py-3 px-4 text-sm text-slate-200">{item.claim}</td>
    <td className="py-3 px-4 text-sm font-mono text-cyan-300">{item.data}</td>
    <td className="py-3 px-4 text-xs text-slate-400 truncate max-w-[150px]" title={item.source}>{item.source}</td>
    <td className="py-3 px-4">
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-16 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={`h-full ${item.confidence > 80 ? 'bg-green-500' : item.confidence > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
            style={{ width: `${item.confidence}%` }}
          />
        </div>
        <span className="text-xs font-mono text-slate-400">{item.confidence}%</span>
      </div>
    </td>
  </tr>
);

const ReasoningStepRow: React.FC<{ step: ReasoningStep; index: number; isLast: boolean }> = ({ step, index, isLast }) => {
  let Icon = Brain;
  let themeColor = "indigo"; // Default for logic
  
  // Define visual themes based on category
  switch (step.category) {
    case 'data':
      Icon = Eye;
      themeColor = "cyan";
      break;
    case 'projection':
      Icon = TrendingUp;
      themeColor = "purple";
      break;
    case 'risk':
      Icon = AlertTriangle;
      themeColor = "red";
      break;
    case 'logic':
    default:
      Icon = Brain;
      themeColor = "indigo";
      break;
  }

  // Map themeColor to specific Tailwind classes
  const colorMap: Record<string, { text: string; bg: string; border: string }> = {
    cyan: { text: "text-cyan-400", bg: "bg-cyan-500/5", border: "border-cyan-500/20" },
    indigo: { text: "text-indigo-400", bg: "bg-indigo-500/5", border: "border-indigo-500/20" },
    purple: { text: "text-purple-400", bg: "bg-purple-500/5", border: "border-purple-500/20" },
    red: { text: "text-red-400", bg: "bg-red-500/5", border: "border-red-500/20" },
  };

  const theme = colorMap[themeColor];
  const isSpeculative = step.is_speculative;
  
  return (
    <div className="relative pl-8 pb-6 last:pb-0 group">
      {/* Connector Line */}
      {!isLast && (
        <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-slate-800 group-hover:bg-slate-700 transition-colors"></div>
      )}
      
      {/* Node Number/Icon */}
      <div className={`absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center bg-slate-900 border z-10 shadow-lg ${isSpeculative ? 'border-amber-500/60 text-amber-500' : 'border-slate-700 text-slate-500'}`}>
         <span className="text-[10px] font-mono font-bold">{index + 1}</span>
      </div>

      <div className={`p-4 rounded-lg border transition-all hover:bg-opacity-20 ${theme.bg} ${isSpeculative ? 'border-dashed border-amber-500/50' : `border-solid ${theme.border}`}`}>
         <div className="flex items-center justify-between gap-2 mb-2">
            <div className={`flex items-center gap-2 ${theme.text}`}>
               <Icon size={16} />
               <span className="text-xs font-bold uppercase tracking-wider">{step.category}</span>
            </div>
            {isSpeculative && (
               <span className="flex items-center gap-1 text-[9px] font-bold uppercase bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">
                 <HelpCircle size={10} /> Speculative
               </span>
            )}
         </div>
         <p className={`text-sm leading-relaxed ${isSpeculative ? 'text-slate-300 italic' : 'text-slate-200'}`}>
            {step.description}
         </p>
      </div>
    </div>
  );
};

export const AnalysisDashboard: React.FC<Props> = ({ report }) => {
  const isBuy = report.trade_plan.action === 'BUY';
  const isSell = report.trade_plan.action === 'SELL';
  const actionColor = isBuy ? 'text-green-400' : isSell ? 'text-red-400' : 'text-yellow-400';
  const actionBg = isBuy ? 'bg-green-500' : isSell ? 'bg-red-500' : 'bg-yellow-500';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-700 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-black text-white tracking-tight">{report.ticker}</h1>
            <span className="text-slate-500 text-sm font-mono">{report.timestamp_ist} IST</span>
          </div>
          <p className="text-slate-300 text-lg leading-relaxed max-w-3xl border-l-2 border-indigo-500 pl-4">
            {report.thesis}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-400 mb-1">Confidence Score</div>
          <div className="text-3xl font-mono font-bold text-indigo-400">{report.confidence_score}%</div>
        </div>
      </div>

      {/* TRADE PLAN SUMMARY SECTION */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl relative">
         <div className={`absolute top-0 left-0 w-1 h-full ${actionBg}`}></div>
         
         <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-700/50">
            {/* Action */}
            <div className="p-5 flex flex-col items-center justify-center bg-slate-800/30">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Signal</span>
               <div className={`flex items-center gap-2 text-3xl font-black ${actionColor}`}>
                  {report.trade_plan.action}
                  {isBuy ? <TrendingUp size={28} /> : isSell ? <TrendingDown size={28} /> : <Minus size={28} />}
               </div>
               <div className="mt-1 flex items-center gap-1.5">
                 <div className="h-1.5 w-12 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${report.confidence_score}%` }}></div>
                 </div>
                 <span className="text-[10px] text-slate-400 font-mono">{report.confidence_score}% Conf.</span>
               </div>
            </div>

            {/* Entry */}
            <div className="p-5 flex flex-col items-center justify-center">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Entry Zone</span>
               <div className="text-xl font-mono font-bold text-white">{report.trade_plan.entry_zone}</div>
            </div>

            {/* Stop Loss */}
            <div className="p-5 flex flex-col items-center justify-center bg-red-900/5">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <StopCircle size={14} className="text-red-500" /> Stop Loss
               </span>
               <div className="text-xl font-mono font-bold text-red-400">{report.trade_plan.stop_loss}</div>
            </div>

            {/* Targets */}
            <div className="p-5 flex flex-col items-center justify-center bg-green-900/5">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Target size={14} className="text-green-500" /> Targets
               </span>
               <div className="flex flex-wrap gap-2 justify-center">
                  {report.trade_plan.targets.map((t, i) => (
                    <span key={i} className="font-mono font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded text-sm">
                      {t}
                    </span>
                  ))}
               </div>
            </div>
         </div>
         
         {/* Rationale Bar */}
         <div className="bg-slate-800/50 p-4 border-t border-slate-700 flex flex-col md:flex-row items-start gap-4">
             <div className="flex-shrink-0 bg-indigo-500/10 p-2 rounded text-indigo-400">
               <FileText size={16} />
             </div>
             <div>
               <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Strategy Rationale</span>
               <p className="text-sm text-slate-300 italic leading-relaxed">{report.trade_plan.rationale}</p>
             </div>
         </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Quant Data & Risks */}
        <div className="space-y-6">
          <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 shadow-xl">
            <h3 className="flex items-center gap-2 text-indigo-400 font-bold mb-4">
              <Activity size={18} /> Quantitative Metrics
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="Price" value={report.quant_metrics.current_price} />
              <MetricCard label="RSI (14)" value={report.quant_metrics.rsi_14} trend={report.quant_metrics.rsi_14 > 70 ? 'down' : report.quant_metrics.rsi_14 < 30 ? 'up' : 'neutral'} />
              <MetricCard label="P/E Ratio" value={report.quant_metrics.pe_ratio} />
              <MetricCard label="P/B Ratio" value={report.quant_metrics.pb_ratio} />
              <MetricCard label="SMA 50" value={report.quant_metrics.ma_50} />
              <MetricCard label="SMA 200" value={report.quant_metrics.ma_200} />
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 gap-4 text-sm">
               <div>
                  <span className="text-slate-500">MACD:</span> <span className="text-slate-300 font-mono ml-2">{report.quant_metrics.macd}</span>
               </div>
               <div>
                  <span className="text-slate-500">Debt/Eq:</span> <span className="text-slate-300 font-mono ml-2">{report.quant_metrics.debt_equity}</span>
               </div>
            </div>
          </div>

          <div className="bg-slate-900/50 p-6 rounded-xl border border-red-900/30 shadow-xl">
            <h3 className="flex items-center gap-2 text-red-400 font-bold mb-4">
              <ShieldAlert size={18} /> Risk Assessment
            </h3>
            <ul className="space-y-3">
              {report.risk_factors.map((risk, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <AlertTriangle size={14} className="mt-1 text-red-500 flex-shrink-0" />
                  <span className="leading-snug">{risk}</span>
                </li>
              ))}
            </ul>
         </div>
        </div>

        {/* Middle Column: Scenarios & Chart */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart Section */}
          <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 shadow-xl">
             <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2 text-indigo-400 font-bold">
                  <BarChart2 size={18} /> Price Action (Simulated)
                </h3>
             </div>
             {/* Added inline style to enforce dimensions and fix Recharts width(-1) error */}
             <div className="w-full h-[300px]" style={{ minHeight: '300px' }}>
               {report.chart_data_points && report.chart_data_points.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                    <LineChart data={report.chart_data_points}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                      <YAxis domain={['auto', 'auto']} stroke="#94a3b8" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', color: '#f1f5f9' }}
                        itemStyle={{ color: '#818cf8' }}
                      />
                      <Line type="monotone" dataKey="price" stroke="#818cf8" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                      <ReferenceLine y={report.quant_metrics.ma_50} stroke="#22c55e" strokeDasharray="3 3" label={{ value: 'SMA50', position: 'insideRight', fill: '#22c55e', fontSize: 10 }} />
                      <ReferenceLine y={report.quant_metrics.ma_200} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'SMA200', position: 'insideRight', fill: '#ef4444', fontSize: 10 }} />
                    </LineChart>
                  </ResponsiveContainer>
               ) : (
                  <div className="flex h-full items-center justify-center text-slate-500 text-sm border border-dashed border-slate-800 rounded-lg">
                     No chart data available for visualization
                  </div>
               )}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ScenarioCard type="Bull" data={report.scenarios.bull} color="border-green-500" />
            <ScenarioCard type="Base" data={report.scenarios.base} color="border-indigo-500" />
            <ScenarioCard type="Bear" data={report.scenarios.bear} color="border-red-500" />
          </div>

          {/* Reasoning Trace */}
          <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 shadow-xl">
            <h3 className="flex items-center gap-2 text-indigo-400 font-bold mb-6">
              <Lightbulb size={18} /> Analyst Reasoning Trace
            </h3>
            <div className="space-y-2">
              {report.reasoning_trace.map((step, idx) => (
                 <ReasoningStepRow 
                    key={idx} 
                    step={step} 
                    index={idx} 
                    isLast={idx === report.reasoning_trace.length - 1} 
                 />
              ))}
            </div>
            {report.alternative_paths.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-800">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                   <Brain size={14} /> Alternative Paths Considered
                </h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {report.alternative_paths.map((path, i) => (
                    <li key={i} className="text-xs text-slate-400 bg-slate-800/30 p-3 rounded border border-slate-800 flex gap-2 items-start">
                       <span className="text-slate-600 font-bold mt-0.5">•</span>
                       {path}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Evidence Table */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-700 shadow-xl overflow-hidden mt-6">
        <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-indigo-400 font-bold">
            <FileText size={18} /> Supporting Evidence
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-slate-400 text-xs uppercase tracking-wider">
                <th className="py-3 px-4 font-medium">Claim</th>
                <th className="py-3 px-4 font-medium">Data Point</th>
                <th className="py-3 px-4 font-medium">Source</th>
                <th className="py-3 px-4 font-medium">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {report.evidence_list.map((item, idx) => (
                <EvidenceRow key={idx} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="p-6 rounded-xl border border-slate-800 text-xs text-slate-500 bg-black/20">
        <h4 className="font-bold text-slate-400 mb-2">MANDATORY DISCLAIMER</h4>
        <p className="mb-2">
          This report is AI-generated for informational purposes only. It does not constitute financial advice, an offer to sell, or a solicitation of an offer to buy any securities.
        </p>
        <p>
          Investments in the securities market are subject to market risks. Read all the related documents carefully before investing. The generated data may contain hallucinations or inaccuracies. Always verify with official NSE/BSE sources before trading.
        </p>
      </div>
    </div>
  );
};