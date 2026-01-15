import { useState, useEffect, useRef } from 'react';
import DataService, { StockData } from '../utils/data-service';
import { MarketEvent } from '../utils/supabase/events-api';
import { getCurrentMarketPeriod } from '../utils/market-status';
import StockAPI from '../utils/supabase/stock-api';
import { StockSection } from './stock-list/stock-section';
import { StockListSkeleton } from './stock-list/stock-list-skeleton';

interface WatchlistSectionProps {
  selectedTickers: string[];
  portfolioIntegration?: {
    enabled: boolean;
    method: 'auto' | 'manual';
    portfolioTickers?: string[];
    connectedAccounts?: any[];
  } | null;
  preloadedEventsData?: Record<string, any[]>;
  onTickerClick?: (ticker: string) => void;
  onEventClick?: (event: MarketEvent) => void;
  globalMaxPercentChange?: number; // Optional global max for consistent y-scale
}

export function WatchlistSection({
  selectedTickers,
  portfolioIntegration,
  preloadedEventsData = {},
  onTickerClick,
  onEventClick,
  globalMaxPercentChange
}: WatchlistSectionProps) {
  const [stocksData, setStocksData] = useState<Record<string, StockData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentMarketPeriod, setCurrentMarketPeriod] = useState<'premarket' | 'regular' | 'afterhours' | 'closed' | 'holiday'>('regular');
  const [marketClosePrices, setMarketClosePrices] = useState<Record<string, number>>({});
  const [centeredEventsByTicker, setCenteredEventsByTicker] = useState<Record<string, string | null>>({});
  const loadingRef = useRef(false);

  // Calculate watchlist tickers (exclude portfolio tickers)
  const watchlistTickers = portfolioIntegration?.enabled && portfolioIntegration.portfolioTickers
    ? selectedTickers.filter(ticker => !portfolioIntegration.portfolioTickers?.includes(ticker))
    : [];

  console.log('[WatchlistSection] selectedTickers:', selectedTickers);
  console.log('[WatchlistSection] portfolioTickers:', portfolioIntegration?.portfolioTickers);
  console.log('[WatchlistSection] watchlistTickers:', watchlistTickers);

  // Fetch and update market period from database
  useEffect(() => {
    const updateMarketPeriod = async () => {
      const period = await getCurrentMarketPeriod();
      setCurrentMarketPeriod(period as any);
    };
    
    updateMarketPeriod();
    
    // Update every minute
    const interval = setInterval(updateMarketPeriod, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch market close prices during after-hours and closed periods
  useEffect(() => {
    const fetchMarketClosePrices = async () => {
      if ((currentMarketPeriod === 'afterhours' || currentMarketPeriod === 'closed' || currentMarketPeriod === 'holiday') && watchlistTickers.length > 0) {
        const prices: Record<string, number> = {};
        
        await Promise.all(
          watchlistTickers.map(async (ticker) => {
            const closePrice = await StockAPI.getMarketClosePrice(ticker);
            if (closePrice !== null) {
              prices[ticker] = closePrice;
            }
          })
        );
        
        setMarketClosePrices(prices);
      }
    };
    
    fetchMarketClosePrices();
  }, [currentMarketPeriod, watchlistTickers]);

  // Load stock data for watchlist tickers
  useEffect(() => {
    const loadStockData = async () => {
      if (watchlistTickers.length === 0) {
        setStocksData({});
        setIsLoading(false);
        return;
      }

      // Prevent duplicate concurrent calls
      if (loadingRef.current) {
        return;
      }

      loadingRef.current = true;
      setIsLoading(true);

      try {
        const data = await DataService.getStocks(watchlistTickers);
        setStocksData(data || {});
      } catch (error) {
        console.error('Error loading watchlist stock data:', error);
      } finally {
        setIsLoading(false);
        loadingRef.current = false;
      }
    };

    loadStockData();
  }, [watchlistTickers.join(',')]); // Use join to compare array contents

  // Don't render if no watchlist tickers
  if (watchlistTickers.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="px-4">
        <StockListSkeleton count={watchlistTickers.length} />
      </div>
    );
  }

  return (
    <div className="p-[0px]">
      <StockSection
        title="Watchlist"
        tickers={watchlistTickers}
        stocksData={stocksData}
        currentMarketPeriod={currentMarketPeriod}
        marketClosePrices={marketClosePrices}
        preloadedEventsData={preloadedEventsData}
        centeredEventsByTicker={centeredEventsByTicker}
        portfolioIntegration={portfolioIntegration}
        onTickerClick={onTickerClick}
        onEventClick={onEventClick}
        globalMaxPercentChange={globalMaxPercentChange}
      />
    </div>
  );
}