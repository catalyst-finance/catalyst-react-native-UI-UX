/**
 * Supabase Services Index
 * 
 * Re-exports all Supabase API services for convenient imports.
 */

export { supabase } from './client';
export { default as StockAPI } from './StockAPI';
export type { StockData } from './StockAPI';
export { default as IntradayPriceAPI } from './IntradayPriceAPI';
export type { IntradayPrice } from './IntradayPriceAPI';
export { default as HistoricalPriceAPI } from './HistoricalPriceAPI';
export type { HistoricalDataPoint, TimeRange } from './HistoricalPriceAPI';
export { default as RealtimeIntradayAPI } from './RealtimeIntradayAPI';
export { default as MarketStatusAPI } from './MarketStatusAPI';
export { default as EventsAPI } from './EventsAPI';
export type { MarketEvent } from './EventsAPI';
