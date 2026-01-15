import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { Card } from '../ui/card';
import { IntradayMiniChart, DailyMiniChart } from '../charts';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface InlineChartCardProps {
  symbol: string;
  timeRange: string;
  onTickerClick?: (ticker: string) => void;
}

/**
 * InlineChartCard - Renders a mini price chart for a symbol inline in the response
 * Used when VIEW_CHART markers are detected in AI responses
 */
export default function InlineChartCard({ 
  symbol, 
  timeRange, 
  onTickerClick 
}: InlineChartCardProps) {
  const [chartData, setChartData] = useState<any[] | null>(null);
  const [quoteData, setQuoteData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  // Subscribe to real-time price updates
  useEffect(() => {
    // Import realtimePriceService when this component is copied into the mobile app
    // Assumes realtimePriceService is available in the mobile app's services
    if (typeof window !== 'undefined' && (window as any).realtimePriceService) {
      const service = (window as any).realtimePriceService;
      
      const handlePriceUpdate = (update: any) => {
        if (update.symbol === symbol) {
          // Update quote data with new current price
          setQuoteData((prev: any) => {
            if (!prev) return null;
            return {
              ...prev,
              close: update.close,
              change: update.close - (prev.previous_close || prev.close),
              change_percent: prev.previous_close 
                ? ((update.close - prev.previous_close) / prev.previous_close) * 100 
                : 0
            };
          });
        }
      };

      service.on('priceUpdate', handlePriceUpdate);

      return () => {
        service.off('priceUpdate', handlePriceUpdate);
      };
    }
  }, [symbol]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(false);

      try {
        // Normalize timeRange to uppercase to handle backend sending lowercase
        const normalizedTimeRange = timeRange.toUpperCase();
        
        // Determine date range based on timeRange
        // CRITICAL: Always use actual current time to fetch latest data
        const now = new Date();
        let startDate: Date;
        let table = 'one_minute_prices';
        let limit = 500;

        switch (normalizedTimeRange) {
          case '1D':
            // For 1D, we need to handle early morning hours before market open
            // If it's before 4 AM ET (pre-market start), show previous day's data
            // Otherwise, show today's data starting from 4 AM ET (pre-market open)
            
            // Convert current time to ET to check market hours
            const nowET = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
            const currentHourET = nowET.getHours();
            
            // Determine which day's data to show
            let marketDate: Date;
            if (currentHourET < 4) {
              // Before 4 AM ET - show previous day's data (yesterday 4 AM to 8 PM)
              marketDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            } else {
              // After 4 AM ET - show today's data (today 4 AM onwards)
              marketDate = now;
            }
            
            // Set start time to 4 AM ET (pre-market open) of the target market date
            // Create a date at midnight ET, then add 4 hours
            const marketDateET = new Date(marketDate.toLocaleString('en-US', { timeZone: 'America/New_York' }));
            const marketStartET = new Date(
              marketDateET.getFullYear(),
              marketDateET.getMonth(),
              marketDateET.getDate(),
              4, // 4 AM ET - pre-market start
              0,
              0,
              0
            );
            
            // Convert back to UTC for the query
            const marketStartETString = marketStartET.toLocaleString('en-US', { timeZone: 'America/New_York' });
            startDate = new Date(marketStartETString);
            
            table = 'one_minute_prices';
            limit = 720; // Full extended hours: pre-market (90min) + regular (390min) + after-hours (240min)
            break;
          case '5D':
            startDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
            table = 'one_minute_prices';
            limit = 1950;
            break;
          case '1W':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            table = 'ten_minute_prices';
            limit = 1000; // ~7 days of 10-minute data during market hours
            break;
          case '1M':
            // For 1M, go back 30 days but start from the beginning of that day (4 AM ET)
            // to ensure we capture complete trading days and align with AI discussions
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const thirtyDaysAgoET = new Date(thirtyDaysAgo.toLocaleString('en-US', { timeZone: 'America/New_York' }));
            const monthStartET = new Date(
              thirtyDaysAgoET.getFullYear(),
              thirtyDaysAgoET.getMonth(),
              thirtyDaysAgoET.getDate(),
              4, // 4 AM ET - pre-market start
              0,
              0,
              0
            );
            
            // Convert back to UTC for the query
            const monthStartETString = monthStartET.toLocaleString('en-US', { timeZone: 'America/New_York' });
            startDate = new Date(monthStartETString);
            
            table = 'ten_minute_prices';
            limit = 4500; // ~30 days of 10-minute data during market hours
            break;
          case '3M':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            table = 'daily_prices';
            limit = 90;
            break;
          case '6M':
            startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
            table = 'daily_prices';
            limit = 180;
            break;
          case '1Y':
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            table = 'daily_prices';
            limit = 365;
            break;
          case '5Y':
            startDate = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000);
            table = 'daily_prices';
            limit = 1825;
            break;
          default:
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }

        // Fetch price data
        // IMPORTANT: daily_prices uses 'date' column, intraday tables use 'timestamp' column
        const isDailyPricesTable = table === 'daily_prices';
        const timeColumnName = isDailyPricesTable ? 'date' : 'timestamp';
        const selectColumns = isDailyPricesTable 
          ? 'date,open,high,low,close,volume' 
          : 'timestamp,open,high,low,close,volume';
        
        const priceParams = new URLSearchParams();
        priceParams.append('select', selectColumns);
        priceParams.append('symbol', `eq.${symbol}`);
        priceParams.append(timeColumnName, `gte.${isDailyPricesTable ? startDate.toISOString().split('T')[0] : startDate.toISOString()}`);
        priceParams.append('order', `${timeColumnName}.asc`);
        priceParams.append('limit', limit.toString());

        const priceUrl = `https://${projectId}.supabase.co/rest/v1/${table}?${priceParams}`;
        
        console.log(`[InlineChartCard] Fetching ${symbol} ${timeRange} data from ${table}, start: ${startDate.toISOString()}, limit: ${limit}`);
        
        // Fetch both:
        // 1. finnhub_quote_snapshots for previous_close (authoritative daily baseline)
        // 2. stock_quote_now for current live price
        const snapshotParams = new URLSearchParams();
        snapshotParams.append('symbol', `eq.${symbol}`);
        snapshotParams.append('order', 'timestamp.desc');
        snapshotParams.append('limit', '1');
        
        const snapshotUrl = `https://${projectId}.supabase.co/rest/v1/finnhub_quote_snapshots?${snapshotParams}`;
        
        const liveQuoteParams = new URLSearchParams();
        liveQuoteParams.append('symbol', `eq.${symbol}`);
        liveQuoteParams.append('limit', '1');
        
        const liveQuoteUrl = `https://${projectId}.supabase.co/rest/v1/stock_quote_now?${liveQuoteParams}`;

        const [priceRes, snapshotRes, liveQuoteRes] = await Promise.all([
          fetch(priceUrl, {
            headers: {
              'apikey': publicAnonKey,
              'Authorization': `Bearer ${publicAnonKey}`
            }
          }),
          fetch(snapshotUrl, {
            headers: {
              'apikey': publicAnonKey,
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch(liveQuoteUrl, {
            headers: {
              'apikey': publicAnonKey,
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            }
          })
        ]);

        if (!priceRes.ok) throw new Error('Failed to fetch price data');
        if (!snapshotRes.ok) throw new Error('Failed to fetch snapshot data');
        if (!liveQuoteRes.ok) throw new Error('Failed to fetch live quote data');
        
        const prices = await priceRes.json();
        const snapshotResult = await snapshotRes.json();
        const liveQuoteResult = await liveQuoteRes.json();

        console.log(`[InlineChartCard] Received ${prices.length} price points for ${symbol}`);
        if (prices.length > 0) {
          const firstPoint = prices[0];
          const lastPoint = prices[prices.length - 1];
          // Handle both date and timestamp fields
          const firstTimeValue = firstPoint.date || firstPoint.timestamp;
          const lastTimeValue = lastPoint.date || lastPoint.timestamp;
          const firstTime = new Date(firstTimeValue);
          const lastTime = new Date(lastTimeValue);
          console.log(`[InlineChartCard] First point: ${firstTime.toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`);
          console.log(`[InlineChartCard] Last point: ${lastTime.toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`);
          console.log(`[InlineChartCard] Current time: ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`);
        }
        
        console.log(`[InlineChartCard] Snapshot data for ${symbol}:`, snapshotResult);
        console.log(`[InlineChartCard] Live quote data for ${symbol}:`, liveQuoteResult);

        // Map to chart format - convert date/timestamp strings to Unix milliseconds
        // IMPORTANT: daily_prices uses 'date' field, intraday tables use 'timestamp' field
        const mappedData = prices.map((row: any) => {
          // Handle both 'date' (daily_prices) and 'timestamp' (intraday tables)
          const timeValue = row.date || row.timestamp;
          return {
            timestamp: typeof timeValue === 'string' 
              ? new Date(timeValue).getTime() 
              : timeValue,
            price: row.close,
            value: row.close,
            volume: row.volume
          };
        });

        // Merge snapshot and live quote data:
        // - Use snapshot for previous_close (authoritative daily baseline)
        // - Use live quote for current price (most up-to-date)
        let mergedQuote = null;
        
        if (Array.isArray(snapshotResult) && snapshotResult.length > 0) {
          const snapshot = snapshotResult[0];
          mergedQuote = {
            ...snapshot,
            previous_close: snapshot.previous_close, // Authoritative baseline
          };
          
          // Override current price with live data if available
          if (Array.isArray(liveQuoteResult) && liveQuoteResult.length > 0) {
            const liveQuote = liveQuoteResult[0];
            mergedQuote.close = liveQuote.close;
            // Recalculate change and change_percent with live price and snapshot previous_close
            if (mergedQuote.previous_close) {
              mergedQuote.change = liveQuote.close - mergedQuote.previous_close;
              mergedQuote.change_percent = ((liveQuote.close - mergedQuote.previous_close) / mergedQuote.previous_close) * 100;
            }
          }
          
          console.log(`[InlineChartCard] Using merged quote:`, {
            close: mergedQuote.close,
            previous_close: mergedQuote.previous_close,
            change: mergedQuote.change,
            change_percent: mergedQuote.change_percent
          });
          setQuoteData(mergedQuote);
        } else if (Array.isArray(liveQuoteResult) && liveQuoteResult.length > 0) {
          // Fallback to live quote only if snapshot not available
          const liveQuote = liveQuoteResult[0];
          console.log(`[InlineChartCard] No snapshot, using live quote only:`, liveQuote);
          setQuoteData(liveQuote);
        } else {
          console.log(`[InlineChartCard] No quote data available, using last chart price`);
        }

        // CRITICAL: Append current price as a live data point if it differs from last historical point
        // This ensures the chart shows complete price movement including today's trading
        if (mappedData.length > 0 && mergedQuote?.close) {
          const lastHistoricalPoint = mappedData[mappedData.length - 1];
          const currentPrice = mergedQuote.close;
          const priceThreshold = 0.001; // Consider prices within 0.1 cents as the same
          
          // Check if current price differs meaningfully from last historical close
          if (Math.abs(currentPrice - lastHistoricalPoint.value) > priceThreshold) {
            // Determine timestamp for current price point
            // Use live quote timestamp if available, otherwise use current time
            let currentTimestamp = now.getTime();
            if (Array.isArray(liveQuoteResult) && liveQuoteResult.length > 0) {
              const liveQuote = liveQuoteResult[0];
              if (liveQuote.timestamp) {
                currentTimestamp = new Date(liveQuote.timestamp).getTime();
              } else if (liveQuote.timestamp_et) {
                currentTimestamp = new Date(liveQuote.timestamp_et).getTime();
              }
            }
            
            // Append current price as a live data point
            mappedData.push({
              timestamp: currentTimestamp,
              price: currentPrice,
              value: currentPrice,
              volume: 0, // No volume for current price point
              isLivePrice: true // Flag to identify this as current price (for potential styling)
            });
            
            console.log(`[InlineChartCard] ✨ Appended live price point: $${currentPrice.toFixed(2)} at ${new Date(currentTimestamp).toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`);
          } else {
            console.log(`[InlineChartCard] ℹ️ Current price ($${currentPrice.toFixed(2)}) matches last historical close, not appending duplicate point`);
          }
        }

        setChartData(mappedData);
        setIsLoading(false);
      } catch (err) {
        console.error('InlineChartCard fetch error:', err);
        setError(true);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [symbol, timeRange]);

  // finnhub_quote_snapshots uses snake_case columns: close, change_percent, previous_close
  const isPositive = quoteData ? (quoteData.change_percent || 0) >= 0 : true;
  const isIntraday = timeRange.toUpperCase() === '1D' || timeRange.toUpperCase() === '5D';
  
  // Determine snap interval for DailyMiniChart crosshair behavior
  const normalizedTimeRange = timeRange.toUpperCase();
  let snapInterval: 'hourly' | 'daily' | 'none' = 'none';
  if (normalizedTimeRange === '1W') {
    snapInterval = 'hourly'; // 1W uses 10-minute data, snap to hourly
  } else if (normalizedTimeRange === '1M') {
    snapInterval = 'daily'; // 1M uses 10-minute data, snap to daily
  }

  return (
    <motion.div
      whileHover={{ scale: 1.01, y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="p-3 bg-gradient-to-br from-background to-muted/20 border-2 hover:border-ai-accent/30 transition-all hover:shadow-lg">
        {isLoading ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
            Unable to load chart
          </div>
        ) : chartData && chartData.length > 0 ? (
          <>
            {isIntraday ? (
              <IntradayMiniChart 
                data={chartData}
                ticker={symbol}
                previousClose={quoteData?.previous_close ?? null}
                currentPrice={quoteData?.close ?? (chartData[chartData.length - 1]?.value || 0)}
                width={350}
                height={120}
                onTickerClick={onTickerClick}
              />
            ) : (
              <DailyMiniChart 
                data={chartData}
                ticker={symbol}
                previousClose={quoteData?.previous_close ?? null}
                currentPrice={quoteData?.close ?? (chartData[chartData.length - 1]?.value || 0)}
                width={350}
                height={120}
                onTickerClick={onTickerClick}
                snapInterval={snapInterval}
              />
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-24 text-muted-foreground text-sm">
            No data available
          </div>
        )}
      </Card>
    </motion.div>
  );
}