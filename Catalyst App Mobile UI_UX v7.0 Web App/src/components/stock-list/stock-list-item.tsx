import { Badge } from '../ui/badge';
import { AnimatedPriceDisplay } from '../animated-price-display';
import { StockChart } from '../stock-chart';
import { StockData } from '../../utils/data-service';
import { MarketEvent } from '../../utils/supabase/events-api';
import { formatCompanyName } from '../../utils/formatting';
import { getCurrentTime } from '../../utils/current-time';
import { isCurrentlyWeekend } from '../../utils/chart-time-utils';

interface StockListItemProps {
  ticker: string;
  stock: StockData;
  index: number;
  totalItems: number;
  currentMarketPeriod: 'premarket' | 'regular' | 'afterhours' | 'closed' | 'holiday';
  marketClosePrices: Record<string, number>;
  preloadedEventsData: any[];
  centeredEventId: string | null;
  maxPercentChange: number | undefined;
  portfolioIntegration?: {
    enabled: boolean;
    method: 'auto' | 'manual';
    portfolioTickers?: string[];
    connectedAccounts?: any[];
  } | null;
  onTickerClick?: (ticker: string) => void;
  onEventClick?: (event: MarketEvent) => void;
}

// Portfolio holdings (matching main app data)
const PORTFOLIO_HOLDINGS: Record<string, { shares: number; avgCost: number }> = {
  'TSLA': { shares: 10, avgCost: 453.14 },
  'MNMD': { shares: 200, avgCost: 13.45 },
  'TMC': { shares: 500, avgCost: 6.42 }
};

export function StockListItem({
  ticker,
  stock,
  index,
  totalItems,
  currentMarketPeriod,
  marketClosePrices,
  preloadedEventsData,
  centeredEventId,
  maxPercentChange,
  portfolioIntegration,
  onTickerClick,
  onEventClick
}: StockListItemProps) {
  // Calculate isPositive based on previousClose (same logic as chart)
  const isPositive = stock.previousClose 
    ? stock.currentPrice >= stock.previousClose 
    : stock.priceChange >= 0;

  const tickerEvents = preloadedEventsData || [];
  const hasEvents = tickerEvents.length > 0;

  // Transform events for compact timeline
  const now = getCurrentTime();
  const transformedEvents = tickerEvents.map((event: MarketEvent) => ({
    ...event,
    isUpcoming: event.actualDateTime ? new Date(event.actualDateTime).getTime() > now.getTime() : false
  }));

  // Calculate upcoming events in next 3 months for the label
  const nowTime = now.getTime();
  const threeMonthsFromNow = nowTime + (90 * 24 * 60 * 60 * 1000); // 90 days
  const upcomingEventsIn3Months = tickerEvents.filter((event: MarketEvent) => {
    if (!event.actualDateTime) return false;
    const eventTime = new Date(event.actualDateTime).getTime();
    return eventTime > nowTime && eventTime <= threeMonthsFromNow;
  }).length;

  // Calculate global min/max for this stock based on maxPercentChange
  let globalMin: number | undefined;
  let globalMax: number | undefined;
  
  // Disabled: This was causing y-scale issues when stocks moved in different directions
  // The symmetrical range doesn't work well for all stocks
  // if (maxPercentChange !== undefined && stock.previousClose) {
  //   // Calculate price range that corresponds to maxPercentChange
  //   // Center the range around previous close
  //   const percentDecimal = maxPercentChange / 100;
  //   globalMin = stock.previousClose * (1 - percentDecimal);
  //   globalMax = stock.previousClose * (1 + percentDecimal);
  // }

  return (
    <div>
      <div className="px-[0px] py-[16px] pt-[16px] pr-[0px] pb-[20px] pl-[0px]">
        <div 
          className="space-y-3 cursor-pointer hover:bg-accent/30 transition-colors"
          onClick={() => onTickerClick?.(ticker)}
        >
          {/* Top row: Ticker badge and price */}
          <div className="flex items-center justify-between">
            <Badge className="bg-ai-accent text-primary-foreground text-xs rounded">
              {ticker}
            </Badge>
            <AnimatedPriceDisplay
              ticker={ticker}
              currentPrice={stock.currentPrice}
              priceChange={stock.priceChange}
              priceChangePercent={stock.priceChangePercent}
              isPositive={isPositive}
              previousClose={stock.previousClose}
            />
          </div>
          
          {/* Company name OR portfolio position (shares and market value) */}
          <div className="flex items-start justify-between mt-[-10px] mb-[25px] mr-[0px] ml-[0px]">
            {portfolioIntegration?.enabled && (() => {
              const positionData = PORTFOLIO_HOLDINGS[ticker];
              if (positionData) {
                const shares = positionData.shares;
                const marketValue = shares * stock.currentPrice;
                
                return (
                  <div className="flex items-center gap-2 text-[14px] text-muted-foreground mr-[8px] flex-1 min-w-0 mt-[5px] mb-[0px] ml-[0px]">
                    <span>{shares.toFixed(0)} shares</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="font-medium text-foreground text-[rgb(113,113,130)]">
                      ${marketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                );
              }
              return null;
            })()}
            
            {/* Show company name only if not in portfolio */}
            {!(portfolioIntegration?.enabled && PORTFOLIO_HOLDINGS[ticker]) && (
              <h3 className="font-semibold leading-tight text-[rgb(0,0,0)] dark:text-[rgb(255,255,255)] text-[14px] font-normal mr-[8px] flex-1 min-w-0 mt-[5px] mb-[0px] ml-[0px]">
                {formatCompanyName(stock.company, ticker)}
              </h3>
            )}
            
            {/* During pre-market, after-hours, closed periods, and holidays, show dual percentage display */}
            {(currentMarketPeriod === 'premarket' || currentMarketPeriod === 'afterhours' || currentMarketPeriod === 'closed' || currentMarketPeriod === 'holiday') && stock.previousClose ? (
              <div className="flex items-center gap-2 flex-shrink-0">
                {currentMarketPeriod === 'premarket' ? (
                  <>
                    {/* Yesterday's change from previous day */}
                    {(() => {
                      const yesterdayChange = stock.previousSessionChange || 0;
                      const yesterdayChangePercent = stock.previousSessionChangePercent || 0;
                      const isPositiveYesterday = yesterdayChange >= 0;
                      
                      return (
                        <div className={`flex items-center gap-0.5 text-[13.2px] font-medium ${
                          isPositiveYesterday ? 'text-positive' : 'text-negative'
                        }`}>
                          <span>{isPositiveYesterday ? '▲' : '▼'} {Math.abs(yesterdayChangePercent).toFixed(2)}%</span>
                        </div>
                      );
                    })()}
                    {/* Pre-market change */}
                    {(() => {
                      const preMarketChange = stock.currentPrice - stock.previousClose;
                      const preMarketChangePercent = stock.previousClose !== 0 ? (preMarketChange / stock.previousClose) * 100 : 0;
                      const isPositivePreMarket = preMarketChange >= 0;
                      
                      return (
                        <div className={`flex items-center gap-0.5 text-[13.2px] font-medium ${
                          isPositivePreMarket ? 'text-positive' : 'text-negative'
                        }`}>
                          <span>{isPositivePreMarket ? '▲' : '▼'} {preMarketChangePercent.toFixed(2)}%</span>
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    {/* Today's change */}
                    {(() => {
                      const actualMarketClose = marketClosePrices[ticker];
                      const marketClose = actualMarketClose || stock.previousClose + stock.priceChange;
                      const todayChange = marketClose - stock.previousClose;
                      const todayChangePercent = stock.previousClose !== 0 ? (todayChange / stock.previousClose) * 100 : 0;
                      const isPositiveToday = todayChange >= 0;
                      
                      return (
                        <div className={`flex items-center gap-0.5 text-[13.2px] font-medium ${
                          isPositiveToday ? 'text-positive' : 'text-negative'
                        }`}>
                          <span>{isPositiveToday ? '▲' : '▼'} {todayChangePercent.toFixed(2)}%</span>
                        </div>
                      );
                    })()}
                    {/* After-hours change */}
                    {(() => {
                      const actualMarketClose = marketClosePrices[ticker];
                      const marketClose = actualMarketClose || stock.previousClose + stock.priceChange;
                      const afterHoursChange = stock.currentPrice - marketClose;
                      const afterHoursChangePercent = marketClose !== 0 ? (afterHoursChange / marketClose) * 100 : 0;
                      const isPositiveAfterHours = afterHoursChange >= 0;
                      
                      return (
                        <div className={`flex items-center gap-0.5 text-[13.2px] font-medium ${
                          isPositiveAfterHours ? 'text-positive' : 'text-negative'
                        }`}>
                          <span>{isPositiveAfterHours ? '▲' : '▼'} {afterHoursChangePercent.toFixed(2)}%</span>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            ) : (
              /* Regular hours: show single percentage */
              <div className={`text-[13.2px] font-medium flex-shrink-0 ${
                isPositive ? 'text-positive' : 'text-negative'
              }`}>
                {isPositive ? '▲' : '▼'} {stock.priceChangePercent.toFixed(2)}%
              </div>
            )}
          </div>
          
          {/* Labels for periods during extended hours */}
          {(currentMarketPeriod === 'premarket' || currentMarketPeriod === 'afterhours' || currentMarketPeriod === 'closed' || currentMarketPeriod === 'holiday') && stock.previousClose && (() => {
            // Determine if we're on a weekend or holiday (using shared utility)
            const isWeekend = isCurrentlyWeekend();
            const isHoliday = currentMarketPeriod === 'holiday';
            
            // For closed period: show "Today" on weekdays, "Prev Close" on weekends/holidays
            const firstLabel = currentMarketPeriod === 'premarket' 
              ? 'Prev Close' 
              : ((currentMarketPeriod === 'closed' && isWeekend) || isHoliday ? 'Prev Close' : 'Today');
            
            const secondLabel = currentMarketPeriod === 'premarket' 
              ? 'Pre-Market' 
              : 'After Hours';
            
            return (
              <div className="flex items-center justify-end gap-2 mt-[-30px] mb-[12px] mr-[0px] ml-[0px]">
                <span className="text-[11px] text-muted-foreground text-center min-w-[60px]">
                  {firstLabel}
                </span>
                <span className="text-[11px] text-muted-foreground text-center min-w-[60px]">
                  {secondLabel}
                </span>
              </div>
            );
          })()}
          
          {/* Inline chart */}
          <div className="w-full">
            <StockChart 
              key={`chart-${ticker}`}
              ticker={ticker}
              stockData={stock}
              miniMode={true}
              preloadedEventsData={preloadedEventsData}
              highlightedEventId={null}
              onEventClick={onEventClick}
              centeredEventId={centeredEventId}
              disableAnimation={false}
              globalMinValue={globalMin}
              globalMaxValue={globalMax}
            />
          </div>
        </div>
      </div>
      
      {index < totalItems - 1 && (
        <div className={`border-b border-border ${!hasEvents ? 'mt-[28px]' : ''}`} />
      )}
    </div>
  );
}