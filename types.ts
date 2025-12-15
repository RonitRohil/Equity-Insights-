
export interface QuantMetrics {
  current_price: number;
  pe_ratio: number | string;
  pb_ratio: number | string;
  rsi_14: number;
  macd: string;
  ma_50: number;
  ma_200: number;
  ma_crossover: boolean;
  vwap: number | string;
  atr_14: number | string;
  roe: string;
  debt_equity: string;
}

export interface TradePlan {
  action: "BUY" | "SELL" | "HOLD";
  entry_zone: string;
  stop_loss: string;
  targets: string[];
  rationale: string;
}

export interface Scenario {
  probability: string;
  target_price: string;
  description: string;
}

export interface Evidence {
  claim: string;
  data: string;
  source: string;
  confidence: number;
  type: 'entry' | 'stop' | 'target' | 'general';
}

export interface ReasoningStep {
  description: string;
  category: 'data' | 'logic' | 'projection' | 'risk';
  is_speculative: boolean;
}

export interface AnalysisReport {
  ticker: string;
  timestamp_ist: string;
  thesis: string;
  quant_metrics: QuantMetrics;
  trade_plan: TradePlan;
  scenarios: {
    base: Scenario;
    bull: Scenario;
    bear: Scenario;
  };
  risk_factors: string[];
  evidence_list: Evidence[];
  reasoning_trace: ReasoningStep[];
  alternative_paths: string[];
  confidence_score: number;
  chart_data_points?: { date: string; price: number }[]; // Simulated for visualization
}

export interface SearchParams {
  ticker: string;
  exchange: string;
  horizon: string;
  lookback: number;
}

export interface AnalysisError {
  title: string;
  message: string;
  details?: string;
  isRetryable: boolean;
}

// --- Market Dashboard Types ---

export interface MarketIndex {
  name: string;
  value: string;
  change: string;
  percentChange: string;
  trend: 'up' | 'down' | 'neutral';
}

export interface StockMover {
  ticker: string;
  price: string;
  change: string;
}

export interface SectorStat {
  sector: string;
  performance: string; // e.g., "+1.2%"
  trend: 'up' | 'down' | 'neutral';
}

export interface MarketNews {
  title: string;
  source: string;
  time: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface CorporateAction {
  company: string;
  type: string; // 'Dividend' | 'Buyback' | 'Split' | 'Bonus' | 'Rights'
  details: string;
  ex_date: string;
  impact: string; // 'Positive' | 'Negative' | 'Neutral'
}

export interface MarketBrief {
  timestamp_ist: string;
  market_sentiment: string;
  sentiment_score: number; // 0-100 (0=Extreme Fear, 100=Extreme Greed)
  indices: MarketIndex[];
  top_gainers: StockMover[];
  top_losers: StockMover[];
  sector_performance: SectorStat[];
  latest_news: MarketNews[];
  corporate_actions: CorporateAction[];
  fii_dii: {
    fii_net: string;
    dii_net: string;
    date: string;
  };
}

// --- Screener Types ---

export interface ScreenerMatch {
  ticker: string;
  name: string;
  sector: string;
  price: string;
  change: string;
  market_cap: string;
  pe_ratio: string;
  match_reason: string;
}

// --- IPO Types ---

export interface IPOItem {
  name: string;
  symbol: string; // or code
  status: 'Open' | 'Upcoming' | 'Closed' | 'Listed';
  type: 'Mainboard' | 'SME';
  openDate: string;
  closeDate: string;
  priceBand: string;
  issueSize: string;
  listingDate?: string;
  gmp: string; // Grey Market Premium
  gmpPercent: string; // e.g., "+45%"
}

export interface IPOReport {
  company_name: string;
  sector: string;
  summary: string;
  details: {
    price_band: string;
    lot_size: string;
    min_investment: string;
    issue_size: string;
    dates: {
      open: string;
      close: string;
      allotment: string;
      listing: string;
    };
    share_holding: {
      pre_issue: string;
      post_issue: string;
    };
  };
  subscription: {
    qib: string;
    nii: string;
    retail: string;
    total: string;
    as_of: string;
  };
  market_sentiment: {
    gmp: string;
    gmp_trend: 'Rising' | 'Falling' | 'Stable';
    est_listing_price: string;
    listing_gain_pct: string;
  };
  analysis: {
    business_model: string;
    financial_strengths: string[];
    risk_factors: string[];
    verdict: 'Apply' | 'Avoid' | 'May Apply' | 'Long Term';
    verdict_rationale: string;
  };
}

// --- Chat Types ---

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  isLite?: boolean; // True if this is a fast placeholder response
  timestamp: number;
}
