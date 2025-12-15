import { GoogleGenAI, Type, Schema, GenerateContentResponse } from "@google/genai";
import { AnalysisReport, SearchParams, AnalysisError, MarketBrief, ScreenerMatch, ChatMessage, IPOItem, IPOReport } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// --- Persistence Helpers ---
const STORAGE_KEYS = {
  MARKET: 'equity_insight_market_v1',
  IPO_LIST: 'equity_insight_ipo_list_v1',
};

const loadCache = <T>(key: string): { data: T; timestamp: number } | null => {
  try {
    if (typeof window === 'undefined') return null;
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch { return null; }
};

const saveCache = (key: string, data: any, timestamp: number) => {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify({ data, timestamp }));
  } catch { /* ignore */ }
};

// --- Caching State ---
// Initialize from storage to prevent API calls on page reload
let marketCache = loadCache<MarketBrief>(STORAGE_KEYS.MARKET);
const MARKET_CACHE_TTL = 5 * 60 * 1000; // Increased to 5 mins to save quota

// Screener Cache: Map query string to data and timestamp
const SCREENER_CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const screenerCache = new Map<string, { data: ScreenerMatch[]; timestamp: number }>();
let lastScreenerQuery: string | null = null;

// IPO Cache
let ipoListCache = loadCache<IPOItem[]>(STORAGE_KEYS.IPO_LIST);
const IPO_CACHE_TTL = 60 * 60 * 1000; // Increased to 1 hour

// --- Helper Functions: Retry & Error Handling ---

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 2000
): Promise<T> => {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Attempt to parse nested JSON error if present in message
      let status = error.status || error.code;
      let msg = (error.message || "").toLowerCase();

      try {
         const jsonMatch = error.message?.match(/\{.*\}/);
         if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.error) {
                if (parsed.error.code) status = parsed.error.code;
                if (parsed.error.message) msg = parsed.error.message.toLowerCase();
                // Patch the error object so handleApiError sees the correct code later
                error.status = status;
                error.message = parsed.error.message || error.message;
            }
         }
      } catch(e) { /* ignore parse error */ }

      // Check for Retryable Conditions (429 Quota, 503 Overloaded, 500 Internal)
      const isQuota = status === 429 || 
                      msg.includes('quota') || 
                      msg.includes('resource_exhausted') ||
                      msg.includes('429');
      
      const isServer = status === 503 || status === 500 || msg.includes('overloaded');

      if ((isQuota || isServer) && i < maxRetries - 1) {
        // If Quota error, wait significantly longer (5s+) to allow bucket refill
        const baseDelay = isQuota ? 5000 : initialDelay;
        const delay = baseDelay * Math.pow(2, i); 
        console.warn(`Gemini API Attempt ${i + 1} failed (Status: ${status}). Retrying in ${delay}ms...`);
        await wait(delay);
        continue;
      }
      
      throw error;
    }
  }
  throw lastError;
};

// Helper to handle API errors uniformly
const handleApiError = (error: any): never => {
  console.error("Gemini Analysis Error:", error);

  // Attempt to parse nested JSON error if present (redundant if retryOperation caught it, but good for safety)
  try {
     const jsonMatch = error.message?.match(/\{.*\}/);
     if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.error) {
            if (parsed.error.code) error.status = parsed.error.code;
            if (parsed.error.message) error.message = parsed.error.message;
        }
     }
  } catch(e) { /* ignore */ }

  const analysisError: AnalysisError = {
    title: "Analysis Failed",
    message: "An unexpected error occurred while generating the report.",
    details: error.message || String(error),
    isRetryable: true
  };

  const status = error.status || error.code;
  const msg = (error.message || "").toLowerCase();

  // Check for custom structured errors first
  if (error.title && error.message && error.isRetryable !== undefined) {
    throw error;
  }

  if (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("network")) {
    analysisError.title = "Network Connection Error";
    analysisError.message = "Unable to connect to the server. Please check your internet connection or try again later.";
    analysisError.isRetryable = true;
  } else if (status === 400 || msg.includes("400") || msg.includes("invalid argument")) {
    analysisError.title = "Invalid Request";
    analysisError.message = "The request was rejected. This might be due to an invalid ticker symbol or safety filters triggering.";
    analysisError.isRetryable = false;
  } else if (status === 401 || msg.includes("401") || msg.includes("api key")) {
    analysisError.title = "Authentication Error";
    analysisError.message = "Invalid API Key. Please ensure your API_KEY is correctly set in the environment.";
    analysisError.isRetryable = false;
  } else if (status === 403 || msg.includes("403")) {
    analysisError.title = "Permission Denied";
    analysisError.message = "Your API key does not have access to the required model or region.";
    analysisError.isRetryable = false;
  } else if (status === 404 || msg.includes("404")) {
    analysisError.title = "Resource Not Found";
    analysisError.message = "The requested AI model version might be deprecated or unavailable.";
    analysisError.isRetryable = false;
  } else if (status === 429 || msg.includes("429") || msg.includes("quota") || msg.includes("resource_exhausted")) {
    analysisError.title = "Rate Limit Exceeded";
    analysisError.message = "You have hit the API quota limit. Please wait a minute before trying again, or check your billing details.";
    analysisError.isRetryable = true;
  } else if (status === 500 || msg.includes("500")) {
    analysisError.title = "Server Error";
    analysisError.message = "Google's AI servers encountered an internal error. Please try again later.";
    analysisError.isRetryable = true;
  } else if (status === 503 || msg.includes("503") || msg.includes("overloaded")) {
    analysisError.title = "Service Overloaded";
    analysisError.message = "The Gemini API is currently experiencing high traffic. Please retry in a few moments.";
    analysisError.isRetryable = true;
  } else if (error instanceof SyntaxError || msg.includes("json") || msg.includes("parse")) {
    analysisError.title = "Data Parsing Error";
    analysisError.message = "The AI response could not be processed correctly. This is usually a temporary glitch.";
    analysisError.isRetryable = true;
  }

  throw analysisError;
};

// --- Analysis Report Logic ---

const reportSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    ticker: { type: Type.STRING },
    timestamp_ist: { type: Type.STRING, description: "Current timestamp in IST" },
    thesis: { type: Type.STRING, description: "A quick 2-line thesis summary." },
    quant_metrics: {
      type: Type.OBJECT,
      properties: {
        current_price: { type: Type.NUMBER },
        pe_ratio: { type: Type.STRING },
        pb_ratio: { type: Type.STRING },
        rsi_14: { type: Type.NUMBER },
        macd: { type: Type.STRING },
        ma_50: { type: Type.NUMBER },
        ma_200: { type: Type.NUMBER },
        ma_crossover: { type: Type.BOOLEAN },
        vwap: { type: Type.STRING },
        atr_14: { type: Type.STRING },
        roe: { type: Type.STRING },
        debt_equity: { type: Type.STRING },
      },
      required: ["current_price", "rsi_14", "ma_50", "ma_200"],
    },
    trade_plan: {
      type: Type.OBJECT,
      properties: {
        action: { type: Type.STRING, enum: ["BUY", "SELL", "HOLD"] },
        entry_zone: { type: Type.STRING },
        stop_loss: { type: Type.STRING },
        targets: { type: Type.ARRAY, items: { type: Type.STRING } },
        rationale: { type: Type.STRING },
      },
      required: ["action", "entry_zone", "stop_loss", "targets"],
    },
    scenarios: {
      type: Type.OBJECT,
      properties: {
        base: {
          type: Type.OBJECT,
          properties: { probability: { type: Type.STRING }, target_price: { type: Type.STRING }, description: { type: Type.STRING } }
        },
        bull: {
          type: Type.OBJECT,
          properties: { probability: { type: Type.STRING }, target_price: { type: Type.STRING }, description: { type: Type.STRING } }
        },
        bear: {
          type: Type.OBJECT,
          properties: { probability: { type: Type.STRING }, target_price: { type: Type.STRING }, description: { type: Type.STRING } }
        },
      },
      required: ["base", "bull", "bear"]
    },
    risk_factors: { type: Type.ARRAY, items: { type: Type.STRING } },
    evidence_list: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          claim: { type: Type.STRING },
          data: { type: Type.STRING },
          source: { type: Type.STRING },
          confidence: { type: Type.NUMBER, description: "Confidence percentage (0-100)" },
          type: { 
            type: Type.STRING, 
            enum: ["entry", "stop", "target", "general"],
            description: "Categorize evidence based on which trade plan element it justifies."
          }
        },
        required: ["claim", "data", "source", "confidence", "type"]
      }
    },
    reasoning_trace: { 
      type: Type.ARRAY, 
      description: "Structured step-by-step reasoning used to arrive at the thesis.",
      items: { 
        type: Type.OBJECT,
        properties: {
           description: { type: Type.STRING },
           category: { type: Type.STRING, enum: ["data", "logic", "projection", "risk"], description: "Type of reasoning step: data observation, logical inference, future projection, or risk identification." },
           is_speculative: { type: Type.BOOLEAN, description: "Set to true if this step involves low confidence (<70%) or uncertain future assumptions." }
        },
        required: ["description", "category", "is_speculative"]
      } 
    },
    alternative_paths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Alternative reasoning paths considered." },
    confidence_score: { type: Type.NUMBER, description: "Overall confidence score 0-100" },
    chart_data_points: {
      type: Type.ARRAY,
      description: "Generate 20 simulated data points representing the recent price trend for visualization.",
      items: {
        type: Type.OBJECT,
        properties: {
          date: { type: Type.STRING },
          price: { type: Type.NUMBER }
        }
      }
    }
  },
  required: ["ticker", "thesis", "quant_metrics", "trade_plan", "scenarios", "evidence_list", "reasoning_trace", "risk_factors"]
};

export const generateAnalysis = async (params: SearchParams): Promise<AnalysisReport> => {
  if (!apiKey) throw { title: "Missing API Key", message: "API Key is not configured.", isRetryable: false } as AnalysisError;

  const prompt = `
    Act as a professional Indian-equity research analyst. 
    Perform a deep dive analysis for ${params.ticker} on ${params.exchange} with a '${params.horizon}' horizon.
    Lookback period: ${params.lookback} days.
    
    REQUIRED DATA TO FETCH & ANALYZE (Use Google Search):
    1. Fundamentals: P/E, P/B, Debt/Equity, ROE (Last available data).
    2. Technicals: Current Price, SMA 50, SMA 200, RSI(14), MACD, VWAP.
    3. Flows: Recent FII/DII sentiment or flow news.
    4. Macro: RBI Repo rate context, INR/USD trend, Brent Crude levels.
    5. Corporate Events/News: Recent announcements, earnings dates.
    
    ANALYSIS REQUIREMENTS:
    - Evidence-first reasoning. Cite sources.
    - Produce a structured trade plan.
    - Evaluate 3 scenarios (Base, Bull, Bear).
    - Provide a structured reasoning trace (Chain of Thought) that categorizes each step (e.g., is it a data observation or a projection?).
    - **CRITICAL**: In the 'evidence_list', explicitly categorize each item as 'entry' (supports entry zone), 'stop' (supports stop loss), 'target' (supports price targets), or 'general' (thesis/macro).
    - **CRITICAL**: In 'reasoning_trace', mark steps as 'is_speculative': true if the confidence is <70%.
    
    Use real-time data from Google Search to fill in the metrics. 
    If specific exact numbers aren't found, estimate based on latest available reports and explicitly state "Est." in the data field.
    
    OUTPUT FORMAT:
    Return the result STRICTLY as a raw JSON object. 
    Do not use Markdown formatting.
    Follow this schema exactly:
    ${JSON.stringify(reportSchema, null, 2)}
  `;

  try {
    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
      },
    }));

    let text = response.text || "";
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    // Heuristic: If text is short and contains refusal keywords, throw specific error before parsing
    const refusalPatterns = [
        "cannot find", "unable to find", "no data available", 
        "doesn't exist", "don't have information", "valid ticker", "not a valid"
    ];
    if (text.length < 500 && refusalPatterns.some(p => text.toLowerCase().includes(p))) {
         throw {
            title: "Ticker Not Found",
            message: `Unable to generate a report for '${params.ticker}'. The ticker symbol might be incorrect, delisted, or not supported by the available data sources.`,
            details: text,
            isRetryable: false
         } as AnalysisError;
    }

    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      text = text.substring(firstBrace, lastBrace + 1);
      return JSON.parse(text) as AnalysisReport;
    } else {
      throw new Error("Failed to parse analysis: Invalid JSON structure received.");
    }
  } catch (error: any) {
    handleApiError(error);
  }
};

// --- Market Dashboard Logic ---

const marketSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    timestamp_ist: { type: Type.STRING },
    market_sentiment: { type: Type.STRING, description: "Bullish, Bearish, or Neutral" },
    sentiment_score: { type: Type.NUMBER, description: "0 (Fear) to 100 (Greed)" },
    indices: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          value: { type: Type.STRING },
          change: { type: Type.STRING },
          percentChange: { type: Type.STRING },
          trend: { type: Type.STRING, enum: ["up", "down", "neutral"] }
        }
      }
    },
    top_gainers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          ticker: { type: Type.STRING },
          price: { type: Type.STRING },
          change: { type: Type.STRING }
        }
      }
    },
    top_losers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          ticker: { type: Type.STRING },
          price: { type: Type.STRING },
          change: { type: Type.STRING }
        }
      }
    },
    sector_performance: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sector: { type: Type.STRING },
          performance: { type: Type.STRING },
          trend: { type: Type.STRING, enum: ["up", "down", "neutral"] }
        }
      }
    },
    latest_news: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          source: { type: Type.STRING },
          time: { type: Type.STRING },
          sentiment: { type: Type.STRING, enum: ["positive", "negative", "neutral"] }
        }
      }
    },
    corporate_actions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          company: { type: Type.STRING },
          type: { type: Type.STRING, enum: ["Dividend", "Buyback", "Split", "Bonus", "Rights", "AGM"] },
          details: { type: Type.STRING },
          ex_date: { type: Type.STRING },
          impact: { type: Type.STRING, enum: ["Positive", "Negative", "Neutral"] }
        }
      }
    },
    fii_dii: {
      type: Type.OBJECT,
      properties: {
        fii_net: { type: Type.STRING },
        dii_net: { type: Type.STRING },
        date: { type: Type.STRING }
      }
    }
  },
  required: ["market_sentiment", "indices", "top_gainers", "top_losers", "sector_performance", "latest_news", "fii_dii", "corporate_actions"]
};

export const getMarketOverview = async (forceRefresh: boolean = false): Promise<MarketBrief> => {
  if (!apiKey) throw { title: "Missing API Key", message: "API Key is not configured.", isRetryable: false } as AnalysisError;

  // Check cache (TTL 5m)
  const now = Date.now();
  if (!forceRefresh && marketCache && (now - marketCache.timestamp < MARKET_CACHE_TTL)) {
    console.debug("Serving Market Data from Cache");
    return marketCache.data;
  }

  const prompt = `
    Fetch the latest live market data for the Indian Stock Market (NSE/BSE).
    1. INDICES: Get current values, changes, and % change for NIFTY 50, SENSEX, and BANK NIFTY.
    2. MOVERS: Identify top 3 Gainers and top 3 Losers from NIFTY 50 today.
    3. SECTORS: summarize performance of key sectors (IT, Bank, Auto, Pharma, Metal).
    4. NEWS: Top 4 latest market-moving news headlines.
    5. FII/DII: Latest available provisional net flow data.
    6. SENTIMENT: Analyze overall market mood.
    7. CORPORATE ACTIONS: List 4 upcoming major corporate actions (Dividends, Splits, Buybacks) with ex-dates within the next 14 days. Include details like amount or ratio.

    OUTPUT FORMAT:
    Return strictly raw JSON adhering to this schema:
    ${JSON.stringify(marketSchema, null, 2)}
  `;

  try {
    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
      },
    }));

    let text = response.text || "";
    if (!text) {
      throw new Error("Empty response received. The AI model might have filtered the content due to safety settings.");
    }
    
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      text = text.substring(firstBrace, lastBrace + 1);
      const data = JSON.parse(text) as MarketBrief;
      
      // Update Cache and Persist
      marketCache = { data, timestamp: Date.now() };
      saveCache(STORAGE_KEYS.MARKET, data, Date.now());
      return data;
    } else {
      throw new Error("Failed to parse market data: Invalid JSON structure.");
    }
  } catch (error: any) {
    handleApiError(error);
  }
};

// --- Screener Logic ---

const screenerSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    matches: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          ticker: { type: Type.STRING },
          name: { type: Type.STRING },
          sector: { type: Type.STRING },
          price: { type: Type.STRING },
          change: { type: Type.STRING, description: "Percentage change today" },
          market_cap: { type: Type.STRING },
          pe_ratio: { type: Type.STRING },
          match_reason: { type: Type.STRING, description: "Short explanation why this stock matches criteria" }
        }
      }
    }
  },
  required: ["matches"]
};

// Normalize keys to ensure consistent cache hits regardless of case/whitespace
const getCacheKey = (query: string) => query.trim().toLowerCase();

export const screenStocks = async (query: string, forceRefresh: boolean = false): Promise<ScreenerMatch[]> => {
  if (!apiKey) throw { title: "Missing API Key", message: "API Key is not configured.", isRetryable: false } as AnalysisError;

  const cacheKey = getCacheKey(query);

  // Check cache (TTL 15 mins)
  const now = Date.now();
  const cached = screenerCache.get(cacheKey);

  if (!forceRefresh && cached && (now - cached.timestamp < SCREENER_CACHE_TTL)) {
    console.debug(`Serving Screener Data from Cache for query: "${query}" (Key: "${cacheKey}")`);
    lastScreenerQuery = query; // Store original query to preserve UI text
    return cached.data;
  }

  const prompt = `
    Act as a Smart Stock Screener for Indian Equities (NSE).
    USER CRITERIA: "${query}"

    Task:
    1. Identify 5-8 stocks that best match the user's criteria.
    2. Use Google Search to find their *latest* real-time price, today's % change, and key metrics.
    3. Ensure data is accurate and up-to-date.

    OUTPUT FORMAT:
    Return strictly raw JSON adhering to this schema:
    ${JSON.stringify(screenerSchema, null, 2)}
  `;

  try {
    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
      },
    }));

    let text = response.text || "";
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      text = text.substring(firstBrace, lastBrace + 1);
      const json = JSON.parse(text);
      const matches = json.matches as ScreenerMatch[];
      
      // Update Cache
      screenerCache.set(cacheKey, { data: matches, timestamp: Date.now() });
      lastScreenerQuery = query;

      return matches;
    } else {
      throw new Error("Failed to parse screener results.");
    }
  } catch (error: any) {
    handleApiError(error);
  }
};

// Export to allow components to restore state of the last active query
export const getScreenerState = () => {
  if (lastScreenerQuery) {
    const cacheKey = getCacheKey(lastScreenerQuery);
    const cached = screenerCache.get(cacheKey);
    if (cached) {
      return {
        query: lastScreenerQuery, // Return original string for input field
        data: cached.data
      };
    }
  }
  return null;
};

// --- IPO Logic ---

const ipoListSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    ipos: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          symbol: { type: Type.STRING },
          status: { type: Type.STRING, enum: ["Open", "Upcoming", "Closed", "Listed"] },
          type: { type: Type.STRING, enum: ["Mainboard", "SME"] }, // Added type
          openDate: { type: Type.STRING },
          closeDate: { type: Type.STRING },
          priceBand: { type: Type.STRING },
          issueSize: { type: Type.STRING },
          listingDate: { type: Type.STRING },
          gmp: { type: Type.STRING },
          gmpPercent: { type: Type.STRING },
        }
      }
    }
  },
  required: ["ipos"]
};

export const fetchIPOList = async (forceRefresh: boolean = false): Promise<IPOItem[]> => {
  if (!apiKey) throw { title: "Missing API Key", message: "API Key is not configured.", isRetryable: false } as AnalysisError;

  const now = Date.now();
  if (!forceRefresh && ipoListCache && (now - ipoListCache.timestamp < IPO_CACHE_TTL)) {
    return ipoListCache.data;
  }

  const prompt = `
    Find the latest Mainboard and SME IPOs in India for ${new Date().toDateString()}.
    
    Task:
    1. Identify IPOs that are currently 'Open', 'Upcoming' (next 7 days), or 'Recently Listed' (last 14 days).
    2. Fetch their Price Band, Dates, Issue Size.
    3. Identify if the IPO is 'Mainboard' or 'SME' category.
    4. **Important**: Search for the latest 'Grey Market Premium' (GMP) for each.
    
    OUTPUT FORMAT:
    Return strictly raw JSON adhering to this schema:
    ${JSON.stringify(ipoListSchema, null, 2)}
  `;

  try {
    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1,
      },
    }));

    let text = response.text || "";
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      text = text.substring(firstBrace, lastBrace + 1);
      const json = JSON.parse(text);
      const items = json.ipos as IPOItem[];
      ipoListCache = { data: items, timestamp: Date.now() };
      saveCache(STORAGE_KEYS.IPO_LIST, items, Date.now());
      return items;
    } else {
      throw new Error("Failed to parse IPO list.");
    }
  } catch (error: any) {
    handleApiError(error);
  }
};

const ipoReportSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    company_name: { type: Type.STRING },
    sector: { type: Type.STRING },
    summary: { type: Type.STRING },
    details: {
      type: Type.OBJECT,
      properties: {
        price_band: { type: Type.STRING },
        lot_size: { type: Type.STRING },
        min_investment: { type: Type.STRING },
        issue_size: { type: Type.STRING },
        dates: {
          type: Type.OBJECT,
          properties: {
             open: { type: Type.STRING },
             close: { type: Type.STRING },
             allotment: { type: Type.STRING },
             listing: { type: Type.STRING },
          }
        },
        share_holding: {
           type: Type.OBJECT,
           properties: { pre_issue: { type: Type.STRING }, post_issue: { type: Type.STRING } }
        }
      }
    },
    subscription: {
      type: Type.OBJECT,
      properties: {
        qib: { type: Type.STRING },
        nii: { type: Type.STRING },
        retail: { type: Type.STRING },
        total: { type: Type.STRING },
        as_of: { type: Type.STRING }
      }
    },
    market_sentiment: {
      type: Type.OBJECT,
      properties: {
        gmp: { type: Type.STRING },
        gmp_trend: { type: Type.STRING, enum: ["Rising", "Falling", "Stable"] },
        est_listing_price: { type: Type.STRING },
        listing_gain_pct: { type: Type.STRING }
      }
    },
    analysis: {
      type: Type.OBJECT,
      properties: {
        business_model: { type: Type.STRING },
        financial_strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        risk_factors: { type: Type.ARRAY, items: { type: Type.STRING } },
        verdict: { type: Type.STRING, enum: ["Apply", "Avoid", "May Apply", "Long Term"] },
        verdict_rationale: { type: Type.STRING }
      }
    }
  },
  required: ["company_name", "sector", "summary", "details", "subscription", "market_sentiment", "analysis"]
};

export const generateIPOReport = async (ipoName: string): Promise<IPOReport> => {
  if (!apiKey) throw { title: "Missing API Key", message: "API Key is not configured.", isRetryable: false } as AnalysisError;

  const prompt = `
    Act as a professional IPO Analyst.
    Perform a detailed Due Diligence report for the IPO: "${ipoName}".
    
    Task:
    1. Fetch official RHP details: Dates, Price, Lot Size, Issue Structure.
    2. Analyze Subscription Status (QIB, NII, Retail) if open/closed.
    3. Find the latest GMP and calculate estimated listing gain.
    4. Analyze Financials (Revenue/Profit growth) and Business Model.
    5. Provide a clear Verdict (Apply/Avoid).

    OUTPUT FORMAT:
    Return strictly raw JSON adhering to this schema:
    ${JSON.stringify(ipoReportSchema, null, 2)}
  `;

  try {
    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
      },
    }));

    let text = response.text || "";
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      text = text.substring(firstBrace, lastBrace + 1);
      return JSON.parse(text) as IPOReport;
    } else {
      throw new Error("Failed to parse IPO report.");
    }
  } catch (error: any) {
    handleApiError(error);
  }
};

// --- Chat Logic ---

export const generateChatResponseLite = async (message: string, context: string): Promise<string> => {
  if (!apiKey) throw new Error("API Key Missing");

  const prompt = `
    You are an AI financial assistant in an app called "EquityInsight Pro".
    
    CURRENT CONTEXT:
    ${context}

    USER QUERY: "${message}"

    INSTRUCTIONS:
    - You are the "Lite" model. Your goal is SPEED.
    - Provide a concise, 1-2 sentence answer based *strictly* on the provided context or general knowledge.
    - Do NOT perform any searches (you can't).
    - If the user asks about specific data in the context, summarize it quickly.
  `;

  try {
    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash', // Fallback to 2.5 Flash as Lite preview was 404ing
      contents: prompt,
      config: {
        temperature: 0.3,
      }
    }));
    return response.text || "I'm processing that...";
  } catch (e) {
    console.error("Lite Chat Error:", e);
    return "I'm thinking...";
  }
};

export const generateChatResponseDetailed = async (message: string, context: string): Promise<string> => {
  if (!apiKey) throw new Error("API Key Missing");

  const prompt = `
    You are an AI financial analyst in "EquityInsight Pro".
    
    CURRENT VIEW DATA (Context):
    ${context}

    USER QUERY: "${message}"

    INSTRUCTIONS:
    - Provide a detailed, helpful response.
    - Use the provided context data as your primary source.
    - If the user asks for external information (news, definitions, broader trends), use Google Search to find the latest info.
    - Cite sources if you use Search.
    - Be friendly but professional.
  `;

  try {
    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.3,
      }
    }));
    return response.text || "I couldn't generate a detailed response.";
  } catch (e) {
    console.error("Detailed Chat Error:", e);
    return "Sorry, I encountered an error fetching detailed information.";
  }
};
