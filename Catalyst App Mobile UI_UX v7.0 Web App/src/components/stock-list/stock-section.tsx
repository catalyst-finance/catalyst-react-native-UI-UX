import { StockListItem } from './stock-list-item';
import { StockData } from '../../utils/data-service';
import { MarketEvent } from '../../utils/supabase/events-api';

interface StockSectionProps {
  title: string;
  tickers: string[];
  stocksData: Record<string, StockData>;
  currentMarketPeriod: 'premarket' | 'regular' | 'afterhours' | 'closed' | 'holiday';
  marketClosePrices: Record<string, number>;
  preloadedEventsData: Record<string, any[]>;
  centeredEventsByTicker: Record<string, string | null>;
  portfolioIntegration?: {
    enabled: boolean;
    method: 'auto' | 'manual';
    portfolioTickers?: string[];
    connectedAccounts?: any[];
  } | null;
  onTickerClick?: (ticker: string) => void;
  onEventClick?: (event: MarketEvent) => void;
  globalMaxPercentChange?: number; // Optional global max for consistent y-scale across sections
}

export function StockSection({
  title,
  tickers,
  stocksData,
  currentMarketPeriod,
  marketClosePrices,
  preloadedEventsData,
  centeredEventsByTicker,
  portfolioIntegration,
  onTickerClick,
  onEventClick,
  globalMaxPercentChange
}: StockSectionProps) {
  if (tickers.length === 0) {
    return null;
  }

  // Calculate global percentage change range for standardized y-scale
  const percentageChanges: number[] = [];
  tickers.forEach(ticker => {
    const stock = stocksData[ticker];
    if (stock && stock.previousClose && stock.previousClose !== 0) {
      const changePercent = ((stock.currentPrice - stock.previousClose) / stock.previousClose) * 100;
      percentageChanges.push(Math.abs(changePercent));
    }
  });
  
  const maxPercentChange = globalMaxPercentChange !== undefined ? globalMaxPercentChange : (percentageChanges.length > 0 ? Math.max(...percentageChanges) : undefined);

  return (
    <div>
      <h2 className="text-[15px] font-semibold text-foreground m-[0px]">{title}</h2>
      <div className="space-y-0">
        {tickers.map((ticker, index) => {
          const stock = stocksData[ticker];
          
          if (!stock) {
            return (
              <div key={ticker}>
                <div className="opacity-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{ticker}</h3>
                      <p className="text-sm text-muted-foreground">Data unavailable</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">--</p>
                      <p className="text-sm text-muted-foreground">--</p>
                    </div>
                  </div>
                </div>
                {index < tickers.length - 1 && (
                  <div className="border-b border-border" />
                )}
              </div>
            );
          }

          return (
            <StockListItem
              key={ticker}
              ticker={ticker}
              stock={stock}
              index={index}
              totalItems={tickers.length}
              currentMarketPeriod={currentMarketPeriod}
              marketClosePrices={marketClosePrices}
              preloadedEventsData={preloadedEventsData[ticker] || []}
              centeredEventId={centeredEventsByTicker[ticker]}
              maxPercentChange={maxPercentChange}
              portfolioIntegration={portfolioIntegration}
              onTickerClick={onTickerClick}
              onEventClick={onEventClick}
            />
          );
        })}
      </div>
    </div>
  );
}