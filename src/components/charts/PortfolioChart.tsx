/**
 * PortfolioChart Component - React Native Implementation
 * 
 * Displays the total portfolio value over time by aggregating
 * all holdings (shares * price) for each timestamp.
 * 
 * Uses the same StockLineChart component for consistent styling.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { StockLineChart, TimeRange, FutureRange } from './StockLineChart';
import { AnimatedPrice } from '../ui/AnimatedPrice';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../constants/design-tokens';
import StockAPI from '../../services/supabase/StockAPI';
import HistoricalPriceAPI from '../../services/supabase/HistoricalPriceAPI';

interface Holding {
  ticker: string;
  shares: number;
  avgCost?: number;
}

interface PortfolioDataPoint {
  timestamp: number;
  value: number;
  session?: string;
}

// Purchase date - stocks were purchased on Jan 2, 2026
const PURCHASE_DATE = new Date('2026-01-02T00:00:00').getTime();

interface PortfolioChartProps {
  holdings: Holding[];
  width?: number;
  height?: number;
  defaultTimeRange?: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  futureCatalysts?: FutureCatalyst[];
  pastEvents?: any[]; // Past events to show on the chart
  onCrosshairChange?: (isActive: boolean) => void;
}

interface FutureCatalyst {
  date: string;
  timestamp: number;
  catalyst: any;
  dayIndex: number;
  position: number;
  tickerLogo?: string; // Optional logo URL for portfolio view
}

export const PortfolioChart: React.FC<PortfolioChartProps> = ({
  holdings,
  width,
  height = 312,
  defaultTimeRange = '1D',
  onTimeRangeChange,
  futureCatalysts = [],
  pastEvents = [],
  onCrosshairChange,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  // State
  const [loading, setLoading] = useState(true);
  const [portfolioData, setPortfolioData] = useState<PortfolioDataPoint[]>([]);
  const [currentValue, setCurrentValue] = useState(0);
  const [previousClose, setPreviousClose] = useState(0);
  const [dayChange, setDayChange] = useState(0);
  const [dayChangePercent, setDayChangePercent] = useState(0);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(defaultTimeRange);
  const [selectedFutureRange, setSelectedFutureRange] = useState<FutureRange>('3M');
  const [crosshairActive, setCrosshairActive] = useState(false);
  const [crosshairValue, setCrosshairValue] = useState<number | null>(null);
  const [crosshairTimestamp, setCrosshairTimestamp] = useState<number | null>(null);
  const [catalystsWithLogos, setCatalystsWithLogos] = useState<FutureCatalyst[]>([]);

  // Determine current market period based on time
  const currentPeriod = useMemo(() => {
    const now = new Date();
    
    // Convert to ET
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const utcTotalMinutes = utcHours * 60 + utcMinutes;
    
    // ET is UTC-5 (EST)
    const etOffset = -5 * 60;
    let etTotalMinutes = utcTotalMinutes + etOffset;
    
    // Handle day wraparound
    if (etTotalMinutes < 0) {
      etTotalMinutes += 24 * 60;
    } else if (etTotalMinutes >= 24 * 60) {
      etTotalMinutes -= 24 * 60;
    }
    
    // Check day of week in ET
    const etDate = new Date(now.getTime() + etOffset * 60 * 1000);
    const dayOfWeek = etDate.getUTCDay();
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 'closed' as const;
    }
    
    const preMarketStart = 4 * 60;
    const regularStart = 9 * 60 + 30;
    const regularEnd = 16 * 60;
    const afterHoursEnd = 20 * 60;
    
    if (etTotalMinutes < preMarketStart) {
      return 'closed' as const;
    } else if (etTotalMinutes < regularStart) {
      return 'premarket' as const;
    } else if (etTotalMinutes < regularEnd) {
      return 'regular' as const;
    } else if (etTotalMinutes < afterHoursEnd) {
      return 'afterhours' as const;
    } else {
      return 'closed' as const;
    }
  }, []);

  // Calculate cost basis from holdings
  const totalCostBasis = useMemo(() => {
    return holdings.reduce((total, h) => total + (h.shares * (h.avgCost || 0)), 0);
  }, [holdings]);

  // Calculate total gain/loss
  const totalGainLoss = currentValue - totalCostBasis;

  // Calculate session-specific change based on current period
  const sessionSpecificChange = useMemo(() => {
    if (selectedTimeRange !== '1D' || currentPeriod === 'regular') {
      return null;
    }

    // For extended hours, calculate change from appropriate reference point
    if (currentPeriod === 'premarket') {
      // Pre-market: change from previous close
      const dollarChange = currentValue - previousClose;
      const percentChange = previousClose > 0 ? (dollarChange / previousClose) * 100 : 0;
      return { dollarChange, percentChange };
    } else if (currentPeriod === 'afterhours' || currentPeriod === 'closed') {
      // After-hours or closed: change from regular session close
      // Find the regular session close from portfolio data
      const regularSessionData = portfolioData.filter(d => d.session === 'regular');
      
      if (regularSessionData.length > 0) {
        const regularSessionClose = regularSessionData[regularSessionData.length - 1].value;
        const dollarChange = currentValue - regularSessionClose;
        const percentChange = regularSessionClose > 0 ? (dollarChange / regularSessionClose) * 100 : 0;
        return { dollarChange, percentChange };
      }
      
      // Fallback if no regular session data available
      return null;
    }

    return null;
  }, [currentValue, previousClose, portfolioData, currentPeriod, selectedTimeRange]);

  // Handle crosshair changes from StockLineChart
  const handleCrosshairChange = useCallback((isActive: boolean, value?: number, timestamp?: number) => {
    console.log('[PortfolioChart] Crosshair change:', isActive, value);
    setCrosshairActive(isActive);
    if (isActive && value !== undefined) {
      setCrosshairValue(value);
      setCrosshairTimestamp(timestamp || null);
    } else {
      setCrosshairValue(null);
      setCrosshairTimestamp(null);
    }
    
    // Notify parent component
    if (onCrosshairChange) {
      console.log('[PortfolioChart] Calling parent onCrosshairChange:', isActive);
      onCrosshairChange(isActive);
    }
  }, [onCrosshairChange]);

  // Calculate current portfolio value from holdings
  const calculateCurrentValue = useCallback(async () => {
    if (holdings.length === 0) {
      setCurrentValue(0);
      setPreviousClose(0);
      setDayChange(0);
      setDayChangePercent(0);
      return;
    }

    try {
      let totalValue = 0;
      let totalPrevClose = 0;
      let holdingsWithData = 0;

      // Fetch current stock data for all holdings
      await Promise.all(
        holdings.map(async (holding) => {
          try {
            const stockData = await StockAPI.getStock(holding.ticker);
            if (stockData && stockData.currentPrice > 0) {
              const positionValue = holding.shares * stockData.currentPrice;
              const positionPrevClose = holding.shares * (stockData.previousClose ?? stockData.currentPrice);
              
              totalValue += positionValue;
              totalPrevClose += positionPrevClose;
              holdingsWithData++;
            } else {
              console.warn(`[PortfolioChart] No price data for ${holding.ticker}, excluding from portfolio value`);
            }
          } catch (error) {
            console.error(`Error fetching stock data for ${holding.ticker}:`, error);
          }
        })
      );

      // Only update if we have at least some data
      if (holdingsWithData > 0) {
        setCurrentValue(totalValue);
        setPreviousClose(totalPrevClose);
        
        const change = totalValue - totalPrevClose;
        setDayChange(change);
        
        if (totalPrevClose > 0) {
          setDayChangePercent((change / totalPrevClose) * 100);
        } else {
          setDayChangePercent(0);
        }
      } else {
        console.warn('[PortfolioChart] No holdings have price data');
      }
    } catch (error) {
      console.error('Error calculating portfolio value:', error);
    }
  }, [holdings]);

  // Load portfolio historical data
  const loadPortfolioData = useCallback(async () => {
    if (holdings.length === 0) {
      setPortfolioData([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // For 1D, use intraday data
      if (selectedTimeRange === '1D') {
        await loadIntradayPortfolioData();
      } else {
        await loadHistoricalPortfolioData();
      }
    } catch (error) {
      console.error('Error loading portfolio data:', error);
      setPortfolioData([]);
    } finally {
      setLoading(false);
    }
  }, [holdings, selectedTimeRange]);

  // Load intraday portfolio data (for 1D view)
  const loadIntradayPortfolioData = async () => {
    try {
      // Fetch intraday data for all holdings
      const intradayDataMap: Record<string, any[]> = {};
      const holdingsWithData: Holding[] = [];
      
      await Promise.all(
        holdings.map(async (holding) => {
          try {
            const intradayPrices = await HistoricalPriceAPI.fetchHistoricalData(holding.ticker, '1D');
            if (intradayPrices && intradayPrices.length > 0) {
              intradayDataMap[holding.ticker] = intradayPrices;
              holdingsWithData.push(holding);
            } else {
              console.warn(`[PortfolioChart] No intraday data for ${holding.ticker}, excluding from portfolio calculation`);
            }
          } catch (error) {
            console.error(`Error fetching intraday data for ${holding.ticker}:`, error);
          }
        })
      );

      // Only aggregate if we have at least one holding with data
      if (holdingsWithData.length > 0) {
        const portfolioHistory = aggregatePortfolioData(intradayDataMap, holdingsWithData);
        setPortfolioData(portfolioHistory);
      } else {
        console.warn('[PortfolioChart] No holdings have intraday data');
        setPortfolioData([]);
      }
    } catch (error) {
      console.error('Error loading intraday portfolio data:', error);
      setPortfolioData([]);
    }
  };

  // Load historical portfolio data (for 1W, 1M, etc.)
  const loadHistoricalPortfolioData = async () => {
    try {
      // Fetch historical data for all holdings
      const historicalDataMap: Record<string, any[]> = {};
      const holdingsWithData: Holding[] = [];
      
      await Promise.all(
        holdings.map(async (holding) => {
          try {
            const historicalPrices = await HistoricalPriceAPI.fetchHistoricalData(
              holding.ticker,
              selectedTimeRange
            );
            if (historicalPrices && historicalPrices.length > 0) {
              historicalDataMap[holding.ticker] = historicalPrices;
              holdingsWithData.push(holding);
            } else {
              console.warn(`[PortfolioChart] No historical data for ${holding.ticker}, excluding from portfolio calculation`);
            }
          } catch (error) {
            console.error(`Error fetching historical data for ${holding.ticker}:`, error);
          }
        })
      );

      // Only aggregate if we have at least one holding with data
      if (holdingsWithData.length > 0) {
        const portfolioHistory = aggregatePortfolioData(historicalDataMap, holdingsWithData);
        setPortfolioData(portfolioHistory);
      } else {
        console.warn('[PortfolioChart] No holdings have historical data');
        setPortfolioData([]);
      }
    } catch (error) {
      console.error('Error loading historical portfolio data:', error);
      setPortfolioData([]);
    }
  };

  // Aggregate portfolio data from multiple stocks
  const aggregatePortfolioData = (
    dataMap: Record<string, any[]>,
    holdingsList: Holding[]
  ): PortfolioDataPoint[] => {
    // Collect all unique timestamps
    const allTimestamps = new Set<number>();
    const pricesByTicker: Record<string, Map<number, { price: number; session?: string }>> = {};

    // Process each ticker's data
    holdingsList.forEach((holding) => {
      const tickerData = dataMap[holding.ticker];
      if (!tickerData) return;

      const priceMap = new Map<number, { price: number; session?: string }>();
      
      tickerData.forEach((dataPoint: any) => {
        const timestamp = typeof dataPoint.timestamp === 'number' 
          ? dataPoint.timestamp 
          : new Date(dataPoint.timestamp || dataPoint.date).getTime();
        
        const price = dataPoint.value ?? dataPoint.close ?? dataPoint.price ?? 0;
        const session = dataPoint.session;
        
        if (price > 0) {
          priceMap.set(timestamp, { price, session });
          allTimestamps.add(timestamp);
        }
      });

      pricesByTicker[holding.ticker] = priceMap;
    });

    // Sort timestamps
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
    
    // Track last known prices for forward-fill
    const lastKnownPrices: Record<string, number> = {};
    
    // Calculate portfolio value at each timestamp
    const portfolioHistory: PortfolioDataPoint[] = [];
    
    sortedTimestamps.forEach((timestamp) => {
      let portfolioValue = 0;
      let hasAllPrices = true;
      let session: string | undefined;

      // Before purchase date, portfolio value is 0
      if (timestamp < PURCHASE_DATE) {
        portfolioHistory.push({
          timestamp,
          value: 0,
          session,
        });
        return;
      }

      holdingsList.forEach((holding) => {
        const priceMap = pricesByTicker[holding.ticker];
        if (!priceMap) {
          hasAllPrices = false;
          return;
        }

        // Get price at this timestamp or use last known
        const priceData = priceMap.get(timestamp);
        let price: number;
        
        if (priceData) {
          price = priceData.price;
          lastKnownPrices[holding.ticker] = price;
          if (priceData.session) session = priceData.session;
        } else if (lastKnownPrices[holding.ticker]) {
          price = lastKnownPrices[holding.ticker];
        } else {
          hasAllPrices = false;
          return;
        }

        portfolioValue += holding.shares * price;
      });

      if (hasAllPrices && portfolioValue > 0) {
        portfolioHistory.push({
          timestamp,
          value: portfolioValue,
          session,
        });
      }
    });

    return portfolioHistory;
  };

  // Initial load
  useEffect(() => {
    calculateCurrentValue();
    loadPortfolioData();
  }, [calculateCurrentValue, loadPortfolioData]);

  // Fetch logos for catalysts
  useEffect(() => {
    const fetchLogos = async () => {
      if (futureCatalysts.length === 0) {
        setCatalystsWithLogos([]);
        return;
      }

      const catalystsWithLogosData = await Promise.all(
        futureCatalysts.map(async (catalyst) => {
          try {
            const ticker = catalyst.catalyst?.ticker;
            if (ticker) {
              const stockData = await StockAPI.getStock(ticker);
              return {
                ...catalyst,
                tickerLogo: stockData?.logo,
              };
            }
          } catch (error) {
            console.error(`Error fetching logo for ${catalyst.catalyst?.ticker}:`, error);
          }
          return catalyst;
        })
      );

      setCatalystsWithLogos(catalystsWithLogosData);
      
      // Prefetch all logo images to cache them
      const logoUrls = catalystsWithLogosData
        .filter(c => c.tickerLogo)
        .map(c => c.tickerLogo as string);
      const uniqueUrls = [...new Set(logoUrls)];
      uniqueUrls.forEach(url => {
        Image.prefetch(url).catch(() => {
          // Silently ignore prefetch errors
        });
      });
    };

    fetchLogos();
  }, [futureCatalysts]);

  // Handle time range change
  const handleTimeRangeChange = useCallback((range: TimeRange) => {
    setSelectedTimeRange(range);
    onTimeRangeChange?.(range);
  }, [onTimeRangeChange]);

  // Handle future range change
  const handleFutureRangeChange = useCallback((range: FutureRange) => {
    setSelectedFutureRange(range);
  }, []);

  // Format currency with commas
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Format number with commas (no currency symbol)
  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Render loading state
  if (loading && portfolioData.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.mutedForeground }]}>
            Loading portfolio...
          </Text>
        </View>
      </View>
    );
  }

  // Render empty state
  if (holdings.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: themeColors.foreground }]}>
            No Holdings
          </Text>
          <Text style={[styles.emptyText, { color: themeColors.mutedForeground }]}>
            Connect your portfolio to see your holdings chart.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Portfolio Header - styled exactly like StockLineChart */}
      <View style={styles.header}>
        {/* Portfolio Value label */}
        <View style={[styles.tickerBadge, { backgroundColor: themeColors.primary }]}>
          <Text style={[styles.tickerText, { color: themeColors.primaryForeground }]}>PORTFOLIO</Text>
        </View>
        
        {/* Price row */}
        <View style={styles.priceRow}>
          {crosshairActive && crosshairValue !== null ? (
            // Show crosshair price without animation
            <Text style={[styles.crosshairPrice, { color: themeColors.foreground }]}>
              ${crosshairValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          ) : (
            // Show current price with animation
            <AnimatedPrice 
              price={currentValue} 
              showCurrency={true}
              fontSize={28}
              fontWeight="600"
            />
          )}
        </View>
        
        {/* Change row - styled exactly like StockLineChart */}
        <View style={styles.changeContainer}>
          {(() => {
            // Calculate display values based on crosshair or current state
            const displayValue = crosshairActive && crosshairValue !== null ? crosshairValue : currentValue;
            const displayChange = displayValue - previousClose;
            const displayChangePercent = previousClose > 0 ? (displayChange / previousClose) * 100 : 0;
            const isDisplayPositive = displayChange >= 0;
            
            // Determine if we should show session-specific data
            // For portfolio, we'll show extended hours info when in 1D view and market is in extended hours
            const showSessionData = selectedTimeRange === '1D' 
              && sessionSpecificChange !== null 
              && currentPeriod !== 'regular'
              && !crosshairActive; // Don't show session data when crosshair is active
            
            const sessionDollarChange = sessionSpecificChange?.dollarChange || 0;
            const sessionPercentChange = sessionSpecificChange?.percentChange || 0;
            const isSessionPositive = sessionDollarChange >= 0;
            
            return (
              <View style={styles.changesColumn}>
                {/* Full day change - always visible */}
                <View style={styles.changeRow}>
                  <Text style={[styles.changeArrow, isDisplayPositive ? styles.positive : styles.negative]}>
                    {isDisplayPositive ? '▲' : '▼'}
                  </Text>
                  <Text style={[styles.changeValue, isDisplayPositive ? styles.positive : styles.negative]}>
                    ${formatNumber(Math.abs(displayChange))} ({isDisplayPositive ? '+' : ''}{displayChangePercent.toFixed(2)}%)
                  </Text>
                  <Text style={[styles.changeLabel, { color: themeColors.mutedForeground }]}>
                    {showSessionData ? (currentPeriod === 'premarket' ? 'Prev Close' : 'Today') : ''}
                  </Text>
                </View>

                {/* Session-specific change - visible only in extended hours on 1D */}
                <View style={styles.changeRow}>
                  {showSessionData ? (
                    <>
                      <Text style={[styles.changeArrow, isSessionPositive ? styles.positive : styles.negative]}>
                        {isSessionPositive ? '▲' : '▼'}
                      </Text>
                      <Text style={[styles.changeValue, isSessionPositive ? styles.positive : styles.negative]}>
                        ${formatNumber(Math.abs(sessionDollarChange))} ({isSessionPositive ? '+' : ''}{sessionPercentChange.toFixed(2)}%)
                      </Text>
                      <Text style={[styles.changeLabel, { color: themeColors.mutedForeground }]}>
                        {currentPeriod === 'premarket' ? 'Pre-Market' : 'After Hours'}
                      </Text>
                    </>
                  ) : (
                    // Empty row to maintain height
                    <Text style={styles.emptyRow}> </Text>
                  )}
                </View>
              </View>
            );
          })()}
        </View>
      </View>

      {/* Chart with side padding */}
      <View style={styles.chartContainer}>
        <StockLineChart
          data={portfolioData}
          previousClose={previousClose}
          currentPrice={currentValue}
          priceChange={dayChange}
          priceChangePercent={dayChangePercent}
          futureCatalysts={catalystsWithLogos}
          pastEvents={pastEvents}
          width={width ? width - 32 : undefined}
          height={height - 80} // Account for header
          ticker="PORTFOLIO"
          companyName="Your Portfolio"
          defaultTimeRange={selectedTimeRange}
          defaultFutureRange={selectedFutureRange}
          onTimeRangeChange={handleTimeRangeChange}
          onFutureRangeChange={handleFutureRangeChange}
          onCrosshairChange={handleCrosshairChange}
          hideHeader={true}
          showTickerLogos={true}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  loadingContainer: {
    height: 312,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  chartContainer: {
    paddingHorizontal: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  portfolioLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  portfolioValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  changeArrow: {
    fontSize: 11,
    marginRight: 4,
  },
  changeValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  changeLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  tickerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  tickerText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  priceRow: {
    marginBottom: 4,
  },
  changesColumn: {
    flexDirection: 'column',
    gap: 4,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 20,
  },
  positive: {
    color: 'rgb(0, 200, 5)',
  },
  negative: {
    color: 'rgb(255, 80, 0)',
  },
  emptyRow: {
    fontSize: 14,
    minHeight: 20,
    lineHeight: 20,
  },
  crosshairPrice: {
    fontSize: 28,
    fontWeight: '600',
  },
});

export default PortfolioChart;
