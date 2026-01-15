import { supabase as supabaseClient } from '../supabase-client';

// Database types for the Catalyst Event Data table
export interface CatalystEventData {
  PrimaryID: string;
  type: string | null;
  title: string | null;
  company: string | null;
  ticker: string | null;
  sector: string | null;
  time: string | null;
  impactRating: number | null;
  confidence: number | null;
  aiInsight: string | null;
  actualDateTime: string | null;
  created_on: string | null;
  updated_on: string | null;
}

// Database types for the new stock_quote_now table
export interface StockQuoteNow {
  symbol: string;
  close: number | null; // current price (from WebSocket)
  timestamp: string | null; // quote timestamp
  volume: number | null; // volume
  ingested_at: string; // when data was ingested
  source: string; // data source (e.g., 'finnhub')
  timestamp_et: string | null; // ET timezone timestamp (generated column)
}

// Database types for company ownership table
export interface CompanyOwnership {
  id: number;
  symbol: string;
  name: string;
  share: number | null;
  change: number | null;
  filing_date: string | null;
  fetched_at: string;
}

// Database types for company executives table
export interface CompanyExecutive {
  id: number;
  symbol: string;
  name: string;
  position: string | null;
  age: number | null;
  compensation: number | null;
  currency: string | null;
  sex: string | null;
  since: string | null;
  fetched_at: string;
  raw: any | null;
}

// Database types for company financials table
export interface CompanyFinancials {
  id: number;
  symbol: string;
  metric_type: string;
  metric: any | null;
  series: any | null;
  pe_ratio: number | null;
  market_cap: number | null;
  week_52_high: number | null;
  week_52_low: number | null;
  beta: number | null;
  avg_volume: number | null;
  fetched_at: string;
  pb: number | null;
  pe_ttm: number | null;
  ps_ttm: number | null;
  pb_annual: number | null;
  pe_annual: number | null;
  ps_annual: number | null;
  pb_quarterly: number | null;
  forward_pe: number | null;
  ptbv_annual: number | null;
  ptbv_quarterly: number | null;
  pcf_share_ttm: number | null;
  pfcf_share_ttm: number | null;
  pcf_share_annual: number | null;
  pfcf_share_annual: number | null;
  pe_excl_extra_ttm: number | null;
  pe_incl_extra_ttm: number | null;
  pe_excl_extra_annual: number | null;
  pe_normalized_annual: number | null;
  pe_basic_excl_extra_ttm: number | null;
  eps_ttm: number | null;
  eps_annual: number | null;
  eps_normalized_annual: number | null;
  eps_excl_extra_items_ttm: number | null;
  eps_incl_extra_items_ttm: number | null;
  eps_excl_extra_items_annual: number | null;
  eps_incl_extra_items_annual: number | null;
  eps_basic_excl_extra_items_ttm: number | null;
  eps_basic_excl_extra_items_annual: number | null;
  eps_growth_3y: number | null;
  eps_growth_5y: number | null;
  eps_growth_ttm_yoy: number | null;
  eps_growth_quarterly_yoy: number | null;
  roa_5y: number | null;
  roe_5y: number | null;
  roi_5y: number | null;
  roa_rfy: number | null;
  roa_ttm: number | null;
  roe_rfy: number | null;
  roe_ttm: number | null;
  roi_ttm: number | null;
  roi_annual: number | null;
  gross_margin_5y: number | null;
  gross_margin_ttm: number | null;
  gross_margin_annual: number | null;
  pretax_margin_5y: number | null;
  pretax_margin_ttm: number | null;
  pretax_margin_annual: number | null;
  net_profit_margin_5y: number | null;
  net_profit_margin_ttm: number | null;
  net_profit_margin_annual: number | null;
  operating_margin_5y: number | null;
  operating_margin_ttm: number | null;
  operating_margin_annual: number | null;
  net_margin_growth_5y: number | null;
  enterprise_value: number | null;
  ev_ebitda_ttm: number | null;
  ev_revenue_ttm: number | null;
  current_ev_free_cash_flow_ttm: number | null;
  current_ev_free_cash_flow_annual: number | null;
  week_52_low_value: number | null;
  week_52_high_value: number | null;
  week_52_low_date: string | null;
  week_52_high_date: string | null;
  tbv_cagr_5y: number | null;
  focf_cagr_5y: number | null;
  capex_cagr_5y: number | null;
  ebitda_cagr_5y: number | null;
  ebitda_interim_cagr_5y: number | null;
  revenue_growth_3y: number | null;
  revenue_growth_5y: number | null;
  revenue_growth_ttm_yoy: number | null;
  revenue_growth_quarterly_yoy: number | null;
  revenue_share_growth_5y: number | null;
  revenue_employee_ttm: number | null;
  revenue_employee_annual: number | null;
  revenue_per_share_ttm: number | null;
  revenue_per_share_annual: number | null;
  quick_ratio_annual: number | null;
  quick_ratio_quarterly: number | null;
  current_ratio_annual: number | null;
  current_ratio_quarterly: number | null;
  long_term_debt_equity_annual: number | null;
  long_term_debt_equity_quarterly: number | null;
  total_debt_total_equity_annual: number | null;
  total_debt_total_equity_quarterly: number | null;
  asset_turnover_ttm: number | null;
  asset_turnover_annual: number | null;
  inventory_turnover_ttm: number | null;
  inventory_turnover_annual: number | null;
  receivables_turnover_ttm: number | null;
  receivables_turnover_annual: number | null;
  cash_flow_per_share_ttm: number | null;
  cash_flow_per_share_annual: number | null;
  cash_flow_per_share_quarterly: number | null;
  ebitda_per_share_ttm: number | null;
  ebitda_per_share_annual: number | null;
  book_value_per_share_annual: number | null;
  book_value_per_share_quarterly: number | null;
  book_value_share_growth_5y: number | null;
  cash_per_share_annual: number | null;
  cash_per_share_quarterly: number | null;
  tangible_book_value_per_share_annual: number | null;
  tangible_book_value_per_share_quarterly: number | null;
  dividend_per_share_ttm: number | null;
  payout_ratio_ttm: number | null;
  payout_ratio_annual: number | null;
  current_dividend_yield_ttm: number | null;
  dividend_indicated_annual: number | null;
  net_income_employee_ttm: number | null;
  net_income_employee_annual: number | null;
  net_interest_coverage_ttm: number | null;
  net_interest_coverage_annual: number | null;
  price_return_daily_5d: number | null;
  price_return_daily_13w: number | null;
  price_return_daily_26w: number | null;
  price_return_daily_52w: number | null;
  price_return_daily_ytd: number | null;
  price_return_daily_mtd: number | null;
  price_relative_to_sp500_4w: number | null;
  price_relative_to_sp500_13w: number | null;
  price_relative_to_sp500_26w: number | null;
  price_relative_to_sp500_52w: number | null;
  price_relative_to_sp500_ytd: number | null;
  three_month_ad_return_std: number | null;
  avg_volume_10d: number | null;
  avg_volume_3m: number | null;
}

// Database types for the finnhub_quote_snapshots table (official daily snapshots)
export interface FinnhubQuoteSnapshot {
  symbol: string;
  timestamp: string; // snapshot timestamp (PK with symbol)
  close: number | null; // closing price
  open: number | null; // opening price
  high: number | null; // day high
  low: number | null; // day low
  previous_close: number | null; // OFFICIAL previous close (only source for this value)
  change: number | null; // price change
  change_percent: number | null; // change percent
  volume: number | null; // volume
  source: string; // data source (e.g., 'finnhub')
  ingested_at: string; // when data was ingested
  timestamp_et: string | null; // ET timezone timestamp (generated column)
}

// Database types for the intraday_prices table (historical WebSocket feed)
export interface IntradayPrice {
  symbol: string;
  price: number; // price at this timestamp
  timestamp: string; // price timestamp (PK with symbol)
  volume: number | null; // volume
  source: string; // data source (e.g., 'finnhub')
  ingested_at: string; // when data was ingested
  timestamp_et: string | null; // ET timezone timestamp (generated column)
}

// Legacy Database types for the Catalyst Stock Data table (deprecated)
export interface CatalystStockData {
  symbol: string;
  company: string | null;
  currentPrice: number | null;
  priceChange: number | null;
  priceChangePercent: number | null;
  sector: string | null;
  marketCap: string | null;
  volume: number | null;
  avgVolume: number | null;
  peRatio: number | null;
  week52High: number | null;
  week52Low: number | null;
  marketCapValue: number | null;
  dividendYield: string | null;
  beta: number | null;
  eps: number | null;
  lastUpdated: string | null;
}

// Use singleton Supabase client from supabase-client.tsx
// This prevents multiple GoTrueClient instances
export const supabase = supabaseClient;

// Database types for the company_information table
export interface CompanyInformation {
  symbol: string;
  city: string | null;
  state: string | null;
  country: string | null;
  currency: string | null;
  description: string | null;
  employeeTotal: number | null;
  exchange: string | null;
  gsector: string | null;
  gind: string | null;
  gsubind: string | null;
  ipo: string | null;
  name: string | null;
  shareOutstanding: number | null;
  weburl: string | null;
  logo: string | null;
  finnhubIndustry: string | null;
  ingested_at: string | null;
  source: string | null;
  json: string | null;
  marketCapitalization: number | null;
}

// Table names
export const CATALYST_TABLE = 'event_data';
export const STOCK_TABLE = 'Catalyst Stock Data'; // Legacy table
export const STOCK_QUOTE_TABLE = 'stock_quote_now'; // Real-time current prices (WebSocket)
export const FINNHUB_SNAPSHOTS_TABLE = 'finnhub_quote_snapshots'; // Official daily snapshots with previous_close
export const INTRADAY_PRICES_TABLE = 'intraday_prices'; // Historical intraday price points (WebSocket)
export const COMPANY_INFO_TABLE = 'company_information'; // Company information table
export const DAILY_PRICES_TABLE = 'daily_prices'; // Daily historical prices table
export const WATCHLIST_TABLE = 'watchlist'; // Watchlist table
export const COMPANY_OWNERSHIP_TABLE = 'company_ownership'; // Company ownership table
export const COMPANY_EXECUTIVES_TABLE = 'company_executives'; // Company executives table
export const COMPANY_FINANCIALS_TABLE = 'company_financials'; // Company financials table