import { useState, useEffect, useRef } from 'react';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import DataService, { StockData } from '../utils/data-service';
import { MarketEvent } from '../utils/supabase/events-api';
import { getCurrentMarketPeriod } from '../utils/market-status';
import StockAPI from '../utils/supabase/stock-api';
import { SortModal, SortState } from './stock-list/sort-modal';
import { StockSection } from './stock-list/stock-section';
import { StockListSkeleton } from './stock-list/stock-list-skeleton';

export type { SortState } from './stock-list/sort-modal';

interface HomeStocksListProps {
  selectedTickers: string[];
  onTickerClick?: (ticker: string) => void;
  preloadedEventsData?: Record<string, any[]>;
  onTickerOrderChange?: (newOrder: string[]) => void;
  sortState?: SortState;
  onSortStateChange?: (sortState: SortState) => void;
  onAddTicker?: (ticker: string) => void;
  onEventClick?: (event: MarketEvent) => void;
  portfolioIntegration?: {
    enabled: boolean;
    method: 'auto' | 'manual';
    portfolioTickers?: string[];
    connectedAccounts?: any[];
  } | null;
  stocksData?: Record<string, StockData>; // Optional pre-loaded stock data
  globalMaxPercentChange?: number; // Optional global max for consistent y-scale
}

export function HomeStocksList({ 
  selectedTickers, 
  onTickerClick, 
  preloadedEventsData = {},
  onTickerOrderChange,
  sortState = { method: null, direction: 'desc' },
  onSortStateChange,
  onAddTicker,
  onEventClick,
  portfolioIntegration,
  stocksData: preloadedStockData,
  globalMaxPercentChange
}: HomeStocksListProps) {
  const [stocksData, setStocksData] = useState<Record<string, StockData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSortModal, setShowSortModal] = useState(false);
  const [orderedTickers, setOrderedTickers] = useState<string[]>(selectedTickers);
  const [currentMarketPeriod, setCurrentMarketPeriod] = useState<'premarket' | 'regular' | 'afterhours' | 'closed' | 'holiday'>('regular');
  const [marketClosePrices, setMarketClosePrices] = useState<Record<string, number>>({});
  
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
      if ((currentMarketPeriod === 'afterhours' || currentMarketPeriod === 'closed' || currentMarketPeriod === 'holiday') && selectedTickers.length > 0) {
        const prices: Record<string, number> = {};
        
        await Promise.all(
          selectedTickers.map(async (ticker) => {
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
  }, [currentMarketPeriod, selectedTickers]);
  
  // Track centered events (no caching)
  const [centeredEventsByTicker, setCenteredEventsByTicker] = useState<Record<string, string | null>>({});
  const loadingRef = useRef(false);

  // Update ordered tickers when selectedTickers changes
  useEffect(() => {
    setOrderedTickers(selectedTickers);
  }, [selectedTickers]);

  // Load stock data
  useEffect(() => {
    const loadStockData = async () => {
      if (selectedTickers.length === 0) {
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
        const data = await DataService.getStocks(selectedTickers);
        setStocksData(data || {});
      } catch (error) {
        console.error('Error loading stock data:', error);
      } finally {
        setIsLoading(false);
        loadingRef.current = false;
      }
    };

    loadStockData();
  }, [selectedTickers]);

  const handleSaveOrder = (newOrder: string[], newSortState: SortState) => {
    setOrderedTickers(newOrder);
    if (onTickerOrderChange) {
      onTickerOrderChange(newOrder);
    }
    if (onSortStateChange) {
      onSortStateChange(newSortState);
    }
  };

  if (selectedTickers.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <div className="w-12 h-12 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
            <TrendingUp className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-2">No Focus Stocks</h3>
          <p className="text-sm text-muted-foreground">
            Add stocks to your watchlist to see their prices and performance here.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return <StockListSkeleton count={selectedTickers.length} />;
  }

  // Filter tickers based on search query
  const filteredTickers = orderedTickers.filter((ticker) => {
    if (!searchQuery.trim()) return true;
    const stock = stocksData[ticker];
    const query = searchQuery.toLowerCase();
    return (
      ticker.toLowerCase().includes(query) ||
      stock?.company.toLowerCase().includes(query) ||
      stock?.sector.toLowerCase().includes(query)
    );
  });

  // Separate holdings from watchlist
  const holdingTickers = portfolioIntegration?.enabled && portfolioIntegration.portfolioTickers
    ? filteredTickers.filter(ticker => portfolioIntegration.portfolioTickers?.includes(ticker))
    : [];
  
  // For focus stocks list, only show holdings OR all tickers if no portfolio
  const displayTickers = portfolioIntegration?.enabled && portfolioIntegration.portfolioTickers
    ? holdingTickers
    : filteredTickers;

  return (
    <>
      {/* Stock Cards */}
      <div className="space-y-6">
        {/* Holdings Section or All Stocks */}
        <StockSection
          title={portfolioIntegration?.enabled ? "Holdings" : "Focus Stocks"}
          tickers={displayTickers}
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

      {/* Sort Modal */}
      {showSortModal && (
        <SortModal
          tickers={orderedTickers}
          stocksData={stocksData}
          onClose={() => setShowSortModal(false)}
          onSave={handleSaveOrder}
          preloadedEventsData={preloadedEventsData}
          initialSortState={sortState}
          onTickerOrderChange={onTickerOrderChange}
        />
      )}
    </>
  );
}