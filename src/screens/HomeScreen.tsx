import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity, Dimensions, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { colors } from '../constants/design-tokens';
import { HoldingsCard } from '../components/charts/HoldingsCard';
import { WatchlistCard } from '../components/charts/WatchlistCard';
import { PortfolioChart } from '../components/charts/PortfolioChart';
import { CalendarMonthGrid } from '../components/calendar';
import { TimeRange } from '../components/charts/StockLineChart';
import StockAPI from '../services/supabase/StockAPI';
import HistoricalPriceAPI from '../services/supabase/HistoricalPriceAPI';
import { DataService } from '../services/DataService';
import type { StockData as APIStockData } from '../services/supabase/StockAPI';
import { TEST_PORTFOLIO_HOLDINGS, PortfolioHolding } from '../utils/test-data-helper';
import EventsAPI, { MarketEvent } from '../services/supabase/EventsAPI';
import { StockDetailScreen } from './StockDetailScreen';

type HomeTab = 'news' | 'focus' | 'calendar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Hardcoded default tickers until user settings are implemented
const DEFAULT_HOLDINGS: PortfolioHolding[] = [
  { ticker: 'TSLA', shares: 10, avgCost: 453.14, purchaseDate: '2026-01-02' },
  { ticker: 'MNMD', shares: 200, avgCost: 13.45, purchaseDate: '2026-01-02' },
  { ticker: 'TMC', shares: 500, avgCost: 6.42, purchaseDate: '2026-01-02' },
];
const DEFAULT_WATCHLIST = ['AAPL'];

export const HomeScreen: React.FC = () => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  
  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  
  // State
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<HomeTab>('focus');
  const [holdingsTickers, setHoldingsTickers] = useState<string[]>([]);
  const [watchlistTickers, setWatchlistTickers] = useState<string[]>([]);
  const [stocksData, setStocksData] = useState<Record<string, APIStockData>>({});
  const [intradayData, setIntradayData] = useState<Record<string, any[]>>({});
  const [portfolioHoldings, setPortfolioHoldings] = useState<PortfolioHolding[]>([]);
  const [events, setEvents] = useState<Record<string, MarketEvent[]>>({});
  const [isCrosshairActive, setIsCrosshairActive] = useState(false);
  const [portfolioTimeRange, setPortfolioTimeRange] = useState<TimeRange>('1D');
  
  // Stock detail modal state
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [showStockDetail, setShowStockDetail] = useState(false);

  // Convert holdings tickers to holdings with shares for PortfolioChart
  const holdings = useMemo(() => {
    // Use portfolio holdings if available, otherwise fall back to test data
    if (portfolioHoldings.length > 0) {
      return portfolioHoldings.map(h => ({
        ticker: h.ticker,
        shares: h.shares,
        avgCost: h.avgCost,
      }));
    }
    // Fall back to test portfolio holdings
    return TEST_PORTFOLIO_HOLDINGS.filter(h => holdingsTickers.includes(h.ticker)).map(h => ({
      ticker: h.ticker,
      shares: h.shares,
      avgCost: h.avgCost,
    }));
  }, [holdingsTickers, portfolioHoldings]);

  // Aggregate events from all holdings for portfolio chart
  const portfolioEvents = useMemo(() => {
    const allEvents: MarketEvent[] = [];
    const allTickers = [...holdingsTickers, ...watchlistTickers];
    allTickers.forEach(ticker => {
      const tickerEvents = events[ticker] || [];
      allEvents.push(...tickerEvents);
    });
    // Sort by date
    return allEvents.sort((a, b) => {
      const dateA = new Date(a.actualDateTime || 0).getTime();
      const dateB = new Date(b.actualDateTime || 0).getTime();
      return dateA - dateB;
    });
  }, [holdingsTickers, watchlistTickers, events]);

  // Aggregate events from holdings AND watchlist for calendar
  const calendarEvents = useMemo(() => {
    const allEvents: MarketEvent[] = [];
    const allTickers = [...holdingsTickers, ...watchlistTickers];
    allTickers.forEach(ticker => {
      const tickerEvents = events[ticker] || [];
      allEvents.push(...tickerEvents);
    });
    // Sort by date
    return allEvents.sort((a, b) => {
      const dateA = new Date(a.actualDateTime || 0).getTime();
      const dateB = new Date(b.actualDateTime || 0).getTime();
      return dateA - dateB;
    });
  }, [holdingsTickers, watchlistTickers, events]);

  // Count upcoming events in next 3 months
  const upcomingEventsCount = useMemo(() => {
    const now = Date.now();
    const threeMonthsFromNow = now + (90 * 24 * 60 * 60 * 1000); // 90 days in milliseconds
    
    return portfolioEvents.filter(event => {
      const eventTime = new Date(event.actualDateTime || 0).getTime();
      return eventTime >= now && eventTime <= threeMonthsFromNow;
    }).length;
  }, [portfolioEvents]);

  // Get upcoming events label based on time range
  const upcomingEventsLabel = useMemo(() => {
    const now = Date.now();
    let endTime: number;
    let label: string;

    switch (portfolioTimeRange) {
      case '1D':
      case '1W':
      case '1M':
      case '3M':
        endTime = now + (90 * 24 * 60 * 60 * 1000); // 3 months
        label = 'Next 3 Months';
        break;
      case 'YTD':
        const yearStart = new Date(now).setMonth(0, 1);
        const pastDuration = now - yearStart;
        endTime = now + Math.max(pastDuration, 90 * 24 * 60 * 60 * 1000);
        label = 'Next 3 Months';
        break;
      case '1Y':
        endTime = now + (365 * 24 * 60 * 60 * 1000); // 1 year
        label = 'Next Year';
        break;
      case '5Y':
        endTime = now + (5 * 365 * 24 * 60 * 60 * 1000); // 5 years
        label = 'Next 5 Years';
        break;
      default:
        endTime = now + (90 * 24 * 60 * 60 * 1000);
        label = 'Next 3 Months';
    }

    const count = portfolioEvents.filter(event => {
      const eventTime = new Date(event.actualDateTime || 0).getTime();
      return eventTime >= now && eventTime <= endTime;
    }).length;

    return { count, label };
  }, [portfolioEvents, portfolioTimeRange]);

  // Convert portfolio events to catalyst format
  const portfolioCatalysts = useMemo(() => {
    return portfolioEvents.map((event, idx) => ({
      date: event.actualDateTime || '',
      timestamp: new Date(event.actualDateTime || Date.now()).getTime(),
      catalyst: event,
      dayIndex: idx,
      position: 0,
    }));
  }, [portfolioEvents]);

  // Get shares for a specific ticker
  const getSharesForTicker = (ticker: string): number => {
    const holding = portfolioHoldings.find(h => h.ticker === ticker);
    if (holding) return holding.shares;
    const testHolding = TEST_PORTFOLIO_HOLDINGS.find(h => h.ticker === ticker);
    return testHolding?.shares || 10;
  };

  // Load tickers from cache (with hardcoded defaults for now)
  const loadTickers = useCallback(async () => {
    try {
      // Load holdings from cache, fall back to hardcoded defaults
      const cachedHoldings = await DataService.getCachedData<string[]>('holdings');
      if (cachedHoldings && cachedHoldings.length > 0) {
        setHoldingsTickers(cachedHoldings);
      } else {
        // Use hardcoded defaults
        setHoldingsTickers(DEFAULT_HOLDINGS.map(h => h.ticker));
      }

      // Load portfolio holdings with full details, fall back to hardcoded defaults
      const cachedPortfolioHoldings = await DataService.getCachedData<PortfolioHolding[]>('portfolio_holdings');
      if (cachedPortfolioHoldings && cachedPortfolioHoldings.length > 0) {
        setPortfolioHoldings(cachedPortfolioHoldings);
      } else {
        // Use hardcoded defaults
        setPortfolioHoldings(DEFAULT_HOLDINGS);
      }

      // Load watchlist from cache, fall back to hardcoded defaults
      const cachedWatchlist = await DataService.getCachedData<string[]>('watchlist');
      if (cachedWatchlist && cachedWatchlist.length > 0) {
        setWatchlistTickers(cachedWatchlist);
      } else {
        // Use hardcoded defaults
        setWatchlistTickers(DEFAULT_WATCHLIST);
      }
    } catch (error) {
      console.error('Error loading tickers:', error);
      // On error, use hardcoded defaults
      setHoldingsTickers(DEFAULT_HOLDINGS.map(h => h.ticker));
      setPortfolioHoldings(DEFAULT_HOLDINGS);
      setWatchlistTickers(DEFAULT_WATCHLIST);
    }
  }, []);

  // Load stock data
  const loadStockData = useCallback(async (tickers: string[]) => {
    if (tickers.length === 0) return;

    try {
      const data: Record<string, APIStockData> = {};
      
      // Fetch stock data for all tickers
      await Promise.all(
        tickers.map(async (ticker) => {
          try {
            const stockData = await StockAPI.getStock(ticker);
            if (stockData) {
              data[ticker] = stockData;
            }
          } catch (error) {
            console.error(`Error loading stock data for ${ticker}:`, error);
          }
        })
      );

      setStocksData(data);
    } catch (error) {
      console.error('Error loading stock data:', error);
    }
  }, []);

  // Load intraday data
  const loadIntradayData = useCallback(async (tickers: string[]) => {
    if (tickers.length === 0) return;

    try {
      const data: Record<string, any[]> = {};
      
      // Fetch intraday data for all tickers
      await Promise.all(
        tickers.map(async (ticker) => {
          try {
            const intradayPrices = await HistoricalPriceAPI.fetchHistoricalData(ticker, '1D');
            if (intradayPrices && intradayPrices.length > 0) {
              data[ticker] = intradayPrices;
            } else {
              // No intraday data available - mark as empty array to indicate we tried
              // This prevents infinite loading state
              data[ticker] = [];
            }
          } catch (error) {
            console.error(`Error loading intraday data for ${ticker}:`, error);
            // Mark as empty on error to prevent infinite loading
            data[ticker] = [];
          }
        })
      );

      setIntradayData(data);
    } catch (error) {
      console.error('Error loading intraday data:', error);
    }
  }, []);

  // Load events data
  const loadEventsData = useCallback(async (tickers: string[]) => {
    if (tickers.length === 0) return;

    try {
      const eventsData: Record<string, MarketEvent[]> = {};
      
      // Fetch ALL events (past and upcoming) for all tickers at once
      const allEvents = await EventsAPI.getEventsByTickers(tickers);
      
      // Group events by ticker
      allEvents.forEach(event => {
        const ticker = event.ticker || event.symbol || 'N/A';
        if (!eventsData[ticker]) {
          eventsData[ticker] = [];
        }
        eventsData[ticker].push(event);
      });

      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await loadTickers();
      setLoading(false);
    };

    initialize();
  }, [loadTickers]);

  // Load data when tickers change
  useEffect(() => {
    const allTickers = [...holdingsTickers, ...watchlistTickers];
    if (allTickers.length > 0) {
      loadStockData(allTickers);
      loadIntradayData(allTickers);
      loadEventsData(allTickers);
    }
  }, [holdingsTickers, watchlistTickers, loadStockData, loadIntradayData, loadEventsData]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    try {
      await loadTickers();
      const allTickers = [...holdingsTickers, ...watchlistTickers];
      if (allTickers.length > 0) {
        await Promise.all([
          loadStockData(allTickers),
          loadIntradayData(allTickers),
          loadEventsData(allTickers)
        ]);
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [holdingsTickers, watchlistTickers, loadTickers, loadStockData, loadIntradayData, loadEventsData]);

  // Handle stock click
  const handleStockClick = (ticker: string) => {
    console.log('Stock clicked:', ticker);
    setSelectedTicker(ticker);
    setShowStockDetail(true);
  };
  
  // Handle close stock detail
  const handleCloseStockDetail = () => {
    setShowStockDetail(false);
    setSelectedTicker(null);
  };

  // Handle crosshair state change
  const handleCrosshairChange = useCallback((isActive: boolean) => {
    console.log('[HomeScreen] Crosshair change:', isActive);
    setIsCrosshairActive(isActive);
  }, []);

  // Handle portfolio chart time range change
  const handlePortfolioTimeRangeChange = useCallback((range: TimeRange) => {
    setPortfolioTimeRange(range);
  }, []);

  // Render tab button
  const renderTabButton = (tab: HomeTab, label: string) => {
    const isActive = activeTab === tab;
    return (
      <TouchableOpacity
        key={tab}
        style={[
          styles.tabButton,
          isActive && styles.tabButtonActive,
          isActive && { borderBottomColor: themeColors.foreground }
        ]}
        onPress={() => setActiveTab(tab)}
      >
        <Text style={[
          styles.tabButtonText,
          { color: isActive ? themeColors.foreground : themeColors.mutedForeground },
          isActive && styles.tabButtonTextActive
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView 
        style={[styles.container, { backgroundColor: themeColors.background }]} 
        edges={['bottom']}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.mutedForeground }]}>
            Loading your stocks...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render empty state
  if (holdingsTickers.length === 0 && watchlistTickers.length === 0) {
    return (
      <SafeAreaView 
        style={[styles.container, { backgroundColor: themeColors.background }]} 
        edges={['bottom']}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.emptyContainer}
          scrollEnabled={!isCrosshairActive}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={[styles.emptyCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <Text style={[styles.emptyTitle, { color: themeColors.foreground }]}>
              No Stocks Yet
            </Text>
            <Text style={[styles.emptyText, { color: themeColors.mutedForeground }]}>
              Add stocks to your watchlist or connect your portfolio to get started.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: themeColors.background }]} 
      edges={['top']}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        scrollEnabled={!isCrosshairActive}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={themeColors.primary}
          />
        }
      >
        {/* Portfolio Chart - Above tabs, with side margins matching mini charts */}
        {holdings.length > 0 && (
          <View style={styles.portfolioChartContainer}>
            <PortfolioChart
              holdings={holdings}
              width={SCREEN_WIDTH - 32}
              height={312}
              futureCatalysts={portfolioCatalysts}
              onCrosshairChange={handleCrosshairChange}
              onTimeRangeChange={handlePortfolioTimeRangeChange}
            />
          </View>
        )}

        {/* Tab Navigation */}
        <View style={[styles.tabContainer, { borderBottomColor: themeColors.border }]}>
          {renderTabButton('news', 'News')}
          {renderTabButton('focus', 'Focus Stocks')}
          {renderTabButton('calendar', 'Calendar')}
        </View>

        {/* Tab Content - with padding */}
        <View style={styles.tabContent}>
          {activeTab === 'focus' && (
            <>
              {/* Holdings Section */}
              {holdingsTickers.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionHeader, { color: themeColors.foreground }]}>
                    Holdings
                  </Text>
                  <View style={styles.cardList}>
                    {holdingsTickers.map((ticker) => {
                      const stock = stocksData[ticker];
                      const intraday = intradayData[ticker];
                      const shares = getSharesForTicker(ticker);
                      const tickerEvents = events[ticker] || [];
                      
                      // Show loading only if we haven't tried to fetch data yet
                      // (intraday is undefined, not empty array)
                      if (!stock || intraday === undefined) {
                        return (
                          <View key={ticker} style={styles.cardContainer}>
                            <View style={[styles.loadingCard, { backgroundColor: themeColors.card }]}>
                              <ActivityIndicator size="small" color={themeColors.primary} />
                            </View>
                          </View>
                        );
                      }

                      // Render card even with empty intraday data - MiniChart handles empty state
                      return (
                        <View key={ticker} style={styles.cardContainer}>
                          <HoldingsCard
                            ticker={ticker}
                            company={stock.company}
                            currentPrice={stock.currentPrice}
                            previousClose={stock.previousClose ?? null}
                            shares={shares}
                            data={intraday || []}
                            futureCatalysts={tickerEvents.map((event, idx) => ({
                              date: event.actualDateTime || '',
                              timestamp: new Date(event.actualDateTime || Date.now()).getTime(),
                              catalyst: event,
                              dayIndex: idx,
                              position: 0,
                            }))}
                            onPress={() => handleStockClick(ticker)}
                          />
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Watchlist Section */}
              {watchlistTickers.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionHeader, { color: themeColors.foreground }]}>
                    Watchlist
                  </Text>
                  <View style={styles.cardList}>
                    {watchlistTickers.map((ticker) => {
                      const stock = stocksData[ticker];
                      const intraday = intradayData[ticker];
                      const tickerEvents = events[ticker] || [];
                      
                      // Show loading only if we haven't tried to fetch data yet
                      if (!stock || intraday === undefined) {
                        return (
                          <View key={ticker} style={styles.cardContainer}>
                            <View style={[styles.loadingCard, { backgroundColor: themeColors.card }]}>
                              <ActivityIndicator size="small" color={themeColors.primary} />
                            </View>
                          </View>
                        );
                      }

                      // Render card even with empty intraday data
                      return (
                        <View key={ticker} style={styles.cardContainer}>
                          <WatchlistCard
                            ticker={ticker}
                            company={stock.company}
                            currentPrice={stock.currentPrice}
                            previousClose={stock.previousClose ?? 0}
                            data={intraday || []}
                            futureCatalysts={tickerEvents.map((event, idx) => ({
                              date: event.actualDateTime || '',
                              timestamp: new Date(event.actualDateTime || Date.now()).getTime(),
                              catalyst: event,
                              dayIndex: idx,
                              position: 0,
                            }))}
                            onPress={() => handleStockClick(ticker)}
                          />
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
            </>
          )}

          {activeTab === 'news' && (
            <View style={styles.placeholderContainer}>
              <Text style={[styles.placeholderTitle, { color: themeColors.foreground }]}>
                News
              </Text>
              <Text style={[styles.placeholderText, { color: themeColors.mutedForeground }]}>
                Market news and updates coming soon.
              </Text>
            </View>
          )}

          {activeTab === 'calendar' && (
            <View style={styles.calendarContainer}>
              <CalendarMonthGrid
                events={calendarEvents}
                selectedTickers={[...holdingsTickers, ...watchlistTickers]}
              />
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* Stock Detail Modal */}
      <Modal
        visible={showStockDetail}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCloseStockDetail}
      >
        {selectedTicker && (
          <StockDetailScreen 
            ticker={selectedTicker} 
            onClose={handleCloseStockDetail}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: Platform.select({ ios: 120, android: 120, default: 100 }), // Extra padding for tab bar
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    maxWidth: 400,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  upcomingEventsContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    alignItems: 'center',
  },
  upcomingEventsText: {
    fontSize: 13,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tabButton: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomWidth: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabButtonTextActive: {
    fontWeight: '600',
  },
  tabContent: {
    paddingHorizontal: 16,
  },
  portfolioChartContainer: {
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  cardList: {
    gap: 12,
  },
  cardContainer: {
    marginBottom: 12,
  },
  loadingCard: {
    height: 120,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContainer: {
    padding: 40,
    alignItems: 'center',
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 14,
    textAlign: 'center',
  },
  calendarContainer: {
    flex: 1,
    minHeight: 600,
  },
});
