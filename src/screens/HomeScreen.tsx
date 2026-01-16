import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity, Dimensions, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAppData } from '../contexts/AppDataContext';
import { colors } from '../constants/design-tokens';
import { HoldingsCard } from '../components/charts/HoldingsCard';
import { WatchlistCard } from '../components/charts/WatchlistCard';
import { PortfolioChart } from '../components/charts/PortfolioChart';
import { CalendarMonthGrid } from '../components/calendar';
import { ExternalAccountsSection } from '../components/portfolio';
import { ManualPosition } from '../components/portfolio/ManualPositionEntry';
import { TimeRange } from '../components/charts/StockLineChart';
import { TEST_PORTFOLIO_HOLDINGS, PortfolioHolding } from '../utils/test-data-helper';
import { MarketEvent } from '../services/supabase/EventsAPI';
import { StockDetailScreen } from './StockDetailScreen';

type HomeTab = 'news' | 'focus' | 'calendar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const HomeScreen: React.FC = () => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  
  // Get preloaded data from context
  const {
    holdingsTickers,
    watchlistTickers,
    portfolioHoldings,
    stocksData,
    intradayData,
    events,
    refreshData,
  } = useAppData();
  
  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Local UI state only
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<HomeTab>('focus');
  const [isCrosshairActive, setIsCrosshairActive] = useState(false);
  const [portfolioTimeRange, setPortfolioTimeRange] = useState<TimeRange>('1D');
  
  // Stock detail modal state
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [showStockDetail, setShowStockDetail] = useState(false);
  
  // External accounts state
  const [connectedAccounts, setConnectedAccounts] = useState<Array<{
    institution: string;
    accountType: string;
    accounts?: any[];
    connectionId?: string;
    lastUpdated?: string;
  }>>([]);
  const [manualPositions, setManualPositions] = useState<ManualPosition[]>([]);
  
  // Local state for additional holdings/watchlist added during session
  const [additionalHoldings, setAdditionalHoldings] = useState<string[]>([]);
  const [additionalPortfolioHoldings, setAdditionalPortfolioHoldings] = useState<PortfolioHolding[]>([]);
  
  // Combine preloaded tickers with any added during session
  const allHoldingsTickers = useMemo(() => 
    [...holdingsTickers, ...additionalHoldings], 
    [holdingsTickers, additionalHoldings]
  );
  const allPortfolioHoldings = useMemo(() => 
    [...portfolioHoldings, ...additionalPortfolioHoldings], 
    [portfolioHoldings, additionalPortfolioHoldings]
  );

  // Convert holdings tickers to holdings with shares for PortfolioChart
  const holdings = useMemo(() => {
    // Use portfolio holdings if available, otherwise fall back to test data
    if (allPortfolioHoldings.length > 0) {
      return allPortfolioHoldings.map(h => ({
        ticker: h.ticker,
        shares: h.shares,
        avgCost: h.avgCost,
      }));
    }
    // Fall back to test portfolio holdings
    return TEST_PORTFOLIO_HOLDINGS.filter(h => allHoldingsTickers.includes(h.ticker)).map(h => ({
      ticker: h.ticker,
      shares: h.shares,
      avgCost: h.avgCost,
    }));
  }, [allHoldingsTickers, allPortfolioHoldings]);

  // Aggregate events from all holdings for portfolio chart
  const portfolioEvents = useMemo(() => {
    const allEvents: MarketEvent[] = [];
    const allTickers = [...allHoldingsTickers, ...watchlistTickers];
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
  }, [allHoldingsTickers, watchlistTickers, events]);

  // Aggregate events from holdings AND watchlist for calendar
  const calendarEvents = useMemo(() => {
    const allEvents: MarketEvent[] = [];
    const allTickers = [...allHoldingsTickers, ...watchlistTickers];
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
  }, [allHoldingsTickers, watchlistTickers, events]);

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

  // Separate past and future events
  const { pastPortfolioEvents, futurePortfolioEvents } = useMemo(() => {
    const now = Date.now();
    const past: MarketEvent[] = [];
    const future: MarketEvent[] = [];
    
    portfolioEvents.forEach(event => {
      const eventTime = new Date(event.actualDateTime || 0).getTime();
      if (eventTime < now) {
        past.push(event);
      } else {
        future.push(event);
      }
    });
    
    return { pastPortfolioEvents: past, futurePortfolioEvents: future };
  }, [portfolioEvents]);

  // Convert future portfolio events to catalyst format
  const portfolioCatalysts = useMemo(() => {
    return futurePortfolioEvents.map((event, idx) => ({
      date: event.actualDateTime || '',
      timestamp: new Date(event.actualDateTime || Date.now()).getTime(),
      catalyst: event,
      dayIndex: idx,
      position: 0,
    }));
  }, [futurePortfolioEvents]);

  // Calculate current market period based on time
  const currentMarketPeriod = useMemo((): 'premarket' | 'regular' | 'afterhours' | 'closed' => {
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
      return 'closed';
    }
    
    const preMarketStart = 4 * 60;
    const regularStart = 9 * 60 + 30;
    const regularEnd = 16 * 60;
    const afterHoursEnd = 20 * 60;
    
    if (etTotalMinutes < preMarketStart) {
      return 'closed';
    } else if (etTotalMinutes < regularStart) {
      return 'premarket';
    } else if (etTotalMinutes < regularEnd) {
      return 'regular';
    } else if (etTotalMinutes < afterHoursEnd) {
      return 'afterhours';
    } else {
      return 'closed';
    }
  }, []);

  // Calculate after-hours change for each ticker
  const afterHoursChanges = useMemo(() => {
    const changes: Record<string, number> = {};
    
    // Only calculate during after-hours
    if (currentMarketPeriod !== 'afterhours') {
      return changes;
    }
    
    // For each ticker, find the regular session close and calculate after-hours change
    Object.keys(intradayData).forEach(ticker => {
      const data = intradayData[ticker];
      if (!data || data.length === 0) return;
      
      const stock = stocksData[ticker];
      if (!stock) return;
      
      // Find the last regular session data point
      let regularSessionClose: number | null = null;
      for (let i = data.length - 1; i >= 0; i--) {
        const point = data[i];
        if (point.session === 'regular') {
          regularSessionClose = point.value;
          break;
        }
      }
      
      // Calculate after-hours change percentage
      if (regularSessionClose !== null && regularSessionClose > 0) {
        const afterHoursChange = ((stock.currentPrice - regularSessionClose) / regularSessionClose) * 100;
        changes[ticker] = afterHoursChange;
      }
    });
    
    return changes;
  }, [intradayData, stocksData, currentMarketPeriod]);

  // Get shares for a specific ticker
  const getSharesForTicker = (ticker: string): number => {
    const holding = allPortfolioHoldings.find(h => h.ticker === ticker);
    if (holding) return holding.shares;
    const testHolding = TEST_PORTFOLIO_HOLDINGS.find(h => h.ticker === ticker);
    return testHolding?.shares || 10;
  };

  // Pull to refresh - uses context's refreshData
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshData]);

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

  // Handle account connected via Plaid
  const handleAccountConnected = useCallback((data: { holdings: any[]; accountInfo: any }) => {
    // Add the connected account
    setConnectedAccounts(prev => [...prev, data.accountInfo]);
    
    // TODO: Process holdings and add to portfolio
    // For now, just log the holdings
    console.log('Connected account holdings:', data.holdings);
    
    // In a full implementation, you would:
    // 1. Parse the holdings data
    // 2. Add them to portfolioHoldings state
    // 3. Update holdingsTickers
    // 4. Cache the data
  }, []);

  // Handle account disconnected
  const handleAccountDisconnected = useCallback((connectionId: string) => {
    setConnectedAccounts(prev => prev.filter(acc => acc.connectionId !== connectionId));
    // TODO: Remove associated holdings
  }, []);

  // Handle manual positions added
  const handleManualPositionsAdded = useCallback((positions: ManualPosition[]) => {
    setManualPositions(prev => [...prev, ...positions]);
    
    // Add the tickers to holdings if not already present
    const newTickers = positions.map(p => p.symbol).filter(
      ticker => !allHoldingsTickers.includes(ticker)
    );
    
    if (newTickers.length > 0) {
      setAdditionalHoldings(prev => [...prev, ...newTickers]);
    }
    
    // Add to portfolio holdings
    const newHoldings: PortfolioHolding[] = positions.map(p => ({
      ticker: p.symbol,
      shares: p.shares,
      avgCost: p.avgCost,
      purchaseDate: new Date().toISOString().split('T')[0],
    }));
    
    setAdditionalPortfolioHoldings(prev => {
      // Merge with existing holdings (update if ticker exists, add if new)
      const updated = [...prev];
      newHoldings.forEach(newHolding => {
        const existingIndex = updated.findIndex(h => h.ticker === newHolding.ticker);
        if (existingIndex >= 0) {
          // Average the cost basis
          const existing = updated[existingIndex];
          const totalShares = existing.shares + newHolding.shares;
          const totalValue = (existing.shares * existing.avgCost) + (newHolding.shares * newHolding.avgCost);
          updated[existingIndex] = {
            ...existing,
            shares: totalShares,
            avgCost: totalValue / totalShares,
          };
        } else {
          updated.push(newHolding);
        }
      });
      return updated;
    });
  }, [allHoldingsTickers]);

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

  // Render empty state
  if (allHoldingsTickers.length === 0 && watchlistTickers.length === 0) {
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
        {/* Portfolio Chart - Above tabs, full width with header padding */}
        {holdings.length > 0 && (
          <PortfolioChart
            holdings={holdings}
            width={SCREEN_WIDTH}
            height={312}
            futureCatalysts={portfolioCatalysts}
            pastEvents={pastPortfolioEvents}
            onCrosshairChange={handleCrosshairChange}
            onTimeRangeChange={handlePortfolioTimeRangeChange}
            stocksData={stocksData}
          />
        )}

        {/* Tab Navigation */}
        <View style={[styles.tabContainer, { borderTopColor: themeColors.border }]}>
          {renderTabButton('news', 'News')}
          {renderTabButton('focus', 'Focus Stocks')}
          {renderTabButton('calendar', 'Calendar')}
        </View>

        {/* Tab Content - with padding */}
        <View style={styles.tabContent}>
          {activeTab === 'focus' && (
            <>
              {/* Holdings Section */}
              {allHoldingsTickers.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionHeader, { color: themeColors.foreground }]}>
                    Holdings
                  </Text>
                  <View style={styles.cardList}>
                    {allHoldingsTickers.map((ticker) => {
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
                            marketPeriod={currentMarketPeriod}
                            preMarketChange={afterHoursChanges[ticker]}
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
                            marketPeriod={currentMarketPeriod}
                            preMarketChange={afterHoursChanges[ticker]}
                            onPress={() => handleStockClick(ticker)}
                          />
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* External Accounts Section */}
              <View style={styles.section}>
                <ExternalAccountsSection
                  connectedAccounts={connectedAccounts}
                  manualPositions={manualPositions}
                  onAccountConnected={handleAccountConnected}
                  onAccountDisconnected={handleAccountDisconnected}
                  onManualPositionsAdded={handleManualPositionsAdded}
                />
              </View>
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
                selectedTickers={[...allHoldingsTickers, ...watchlistTickers]}
                stocksData={stocksData}
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
    borderTopWidth: 1,
    paddingTop: 16,
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
