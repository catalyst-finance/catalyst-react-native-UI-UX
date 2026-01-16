import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator, TouchableOpacity, Dimensions, Platform, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import NewsDetailScreen from './NewsDetailScreen';
import NewsArticleCard from '../components/NewsArticleCard';
import { NewsItem, fetchAggregatedFeed, NewsCollectionType } from '../services/NewsService';

type HomeTab = 'news' | 'focus' | 'calendar';
type NewsSubTab = 'stocks' | 'policy' | 'macro';

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
    newsItems: preloadedNews,
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
  
  // News feed state
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsLoadingMore, setNewsLoadingMore] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [selectedNewsItem, setSelectedNewsItem] = useState<NewsItem | null>(null);
  const [showNewsDetail, setShowNewsDetail] = useState(false);
  const [newsSubTab, setNewsSubTab] = useState<NewsSubTab>('stocks');
  const [unseenNewsCount, setUnseenNewsCount] = useState(0);
  const [lastSeenNewsTime, setLastSeenNewsTime] = useState<number>(0);
  const seenArticleIdsRef = useRef<Set<string>>(new Set());
  const unseenArticleIdsRef = useRef<Set<string>>(new Set());
  const [hasMoreNews, setHasMoreNews] = useState(true);
  const [oldestNewsDate, setOldestNewsDate] = useState<string | null>(null);
  
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

  // Load last seen news time from storage
  useEffect(() => {
    const loadLastSeenTime = async () => {
      try {
        const stored = await AsyncStorage.getItem('lastSeenNewsTime');
        if (stored) {
          setLastSeenNewsTime(parseInt(stored, 10));
        }
      } catch (error) {
        console.error('[HomeScreen] Failed to load last seen news time:', error);
      }
    };
    loadLastSeenTime();
  }, []);

  // Initialize news from preloaded data
  useEffect(() => {
    if (preloadedNews.length > 0 && newsItems.length === 0) {
      setNewsItems(preloadedNews);
      // Set the oldest date for pagination
      if (preloadedNews.length > 0) {
        const oldestItem = preloadedNews[preloadedNews.length - 1];
        setOldestNewsDate(oldestItem.publishedAt);
      }
      // Count unseen items (newer than last seen time)
      if (lastSeenNewsTime > 0) {
        const unseenItems = preloadedNews.filter(item => {
          const itemTime = new Date(item.publishedAt).getTime();
          return itemTime > lastSeenNewsTime;
        });
        // Store unseen article IDs
        unseenArticleIdsRef.current = new Set(unseenItems.map(item => `${item.collection}-${item.id}`));
        setUnseenNewsCount(unseenItems.length);
      } else {
        // If never seen, all items are unseen (capped at 99)
        unseenArticleIdsRef.current = new Set(preloadedNews.slice(0, 99).map(item => `${item.collection}-${item.id}`));
        setUnseenNewsCount(Math.min(preloadedNews.length, 99));
      }
    }
  }, [preloadedNews, newsItems.length, lastSeenNewsTime]);

  // Load more older news when user scrolls to bottom
  const loadMoreNews = useCallback(async () => {
    if (newsLoadingMore || !hasMoreNews || !oldestNewsDate) return;
    
    setNewsLoadingMore(true);
    
    try {
      // Get all tickers from holdings and watchlist for personalized news
      const allTickers = [...allHoldingsTickers, ...watchlistTickers];
      
      // Fetch news older than the oldest item we have
      const olderItems = await fetchAggregatedFeed({
        tickers: allTickers.length > 0 ? allTickers : undefined,
        limit: 50,
        collections: ['news', 'press_releases', 'earnings_transcripts', 'government_policy', 'macro_economics'],
        dateLte: oldestNewsDate,
      });
      
      if (olderItems.length === 0) {
        setHasMoreNews(false);
      } else {
        // Filter out items we already have (by id)
        const existingIds = new Set(newsItems.map(item => item.id));
        const newItems = olderItems.filter(item => !existingIds.has(item.id));
        
        if (newItems.length === 0) {
          setHasMoreNews(false);
        } else {
          setNewsItems(prev => [...prev, ...newItems]);
          // Update oldest date
          const newOldestItem = newItems[newItems.length - 1];
          setOldestNewsDate(newOldestItem.publishedAt);
        }
      }
    } catch (error) {
      console.error('[HomeScreen] Failed to load more news:', error);
    } finally {
      setNewsLoadingMore(false);
    }
  }, [allHoldingsTickers, watchlistTickers, newsLoadingMore, hasMoreNews, oldestNewsDate, newsItems]);

  // Handle scroll to detect when user is near bottom
  const handleScroll = useCallback((event: any) => {
    if (activeTab !== 'news') return;
    
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 200; // Start loading when 200px from bottom
    
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      loadMoreNews();
    }
  }, [activeTab, loadMoreNews]);

  // Refresh news feed (pull-to-refresh)
  const refreshNewsFeed = useCallback(async () => {
    setNewsLoading(true);
    setNewsError(null);
    
    try {
      // Get all tickers from holdings and watchlist for personalized news
      const allTickers = [...allHoldingsTickers, ...watchlistTickers];
      
      // Get date from 7 days ago for fresh data
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const dateGte = oneWeekAgo.toISOString();
      
      const items = await fetchAggregatedFeed({
        tickers: allTickers.length > 0 ? allTickers : undefined,
        limit: 75,
        collections: ['news', 'press_releases', 'earnings_transcripts', 'government_policy', 'macro_economics'],
        dateGte,
      });
      
      setNewsItems(items);
      setHasMoreNews(true);
      
      // Update oldest date for pagination
      if (items.length > 0) {
        const oldestItem = items[items.length - 1];
        setOldestNewsDate(oldestItem.publishedAt);
      }
      
      // Count unseen items (newer than last seen time)
      if (items.length > 0) {
        if (lastSeenNewsTime > 0) {
          const unseenItems = items.filter(item => {
            const itemTime = new Date(item.publishedAt).getTime();
            return itemTime > lastSeenNewsTime;
          });
          // Store unseen article IDs (excluding already seen ones)
          unseenItems.forEach(item => {
            const articleId = `${item.collection}-${item.id}`;
            if (!seenArticleIdsRef.current.has(articleId)) {
              unseenArticleIdsRef.current.add(articleId);
            }
          });
          setUnseenNewsCount(unseenArticleIdsRef.current.size);
        } else {
          // If never seen, all items are unseen (capped at 99)
          items.slice(0, 99).forEach(item => {
            const articleId = `${item.collection}-${item.id}`;
            if (!seenArticleIdsRef.current.has(articleId)) {
              unseenArticleIdsRef.current.add(articleId);
            }
          });
          setUnseenNewsCount(Math.min(unseenArticleIdsRef.current.size, 99));
        }
      }
    } catch (error) {
      console.error('[HomeScreen] Failed to refresh news:', error);
      setNewsError('Failed to load news feed');
    } finally {
      setNewsLoading(false);
    }
  }, [allHoldingsTickers, watchlistTickers, lastSeenNewsTime]);

  // Save lastSeenNewsTime when all articles have been viewed
  useEffect(() => {
    if (unseenNewsCount === 0 && seenArticleIdsRef.current.size > 0) {
      const saveLastSeenTime = async () => {
        const now = Date.now();
        setLastSeenNewsTime(now);
        try {
          await AsyncStorage.setItem('lastSeenNewsTime', now.toString());
        } catch (error) {
          console.error('[HomeScreen] Failed to save last seen news time:', error);
        }
      };
      saveLastSeenTime();
    }
  }, [unseenNewsCount]);

  // Handle news item click - also marks as seen
  const handleNewsItemPress = useCallback((item: NewsItem) => {
    // Mark this article as seen
    const articleId = `${item.collection}-${item.id}`;
    if (unseenArticleIdsRef.current.has(articleId) && !seenArticleIdsRef.current.has(articleId)) {
      seenArticleIdsRef.current.add(articleId);
      unseenArticleIdsRef.current.delete(articleId);
      setUnseenNewsCount(prev => Math.max(0, prev - 1));
    }
    setSelectedNewsItem(item);
    setShowNewsDetail(true);
  }, []);

  // Handle close news detail
  const handleCloseNewsDetail = useCallback(() => {
    setShowNewsDetail(false);
    setSelectedNewsItem(null);
  }, []);

  // Get shares for a specific ticker
  const getSharesForTicker = (ticker: string): number => {
    const holding = allPortfolioHoldings.find(h => h.ticker === ticker);
    if (holding) return holding.shares;
    const testHolding = TEST_PORTFOLIO_HOLDINGS.find(h => h.ticker === ticker);
    return testHolding?.shares || 10;
  };

  // Pull to refresh - uses context's refreshData and refreshes news if on news tab
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshData();
      // Also refresh news if on news tab
      if (activeTab === 'news') {
        await refreshNewsFeed();
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshData, activeTab, refreshNewsFeed]);

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
    // Show badge with count on News tab whenever there are unseen items (even when active)
    const showBadge = tab === 'news' && unseenNewsCount > 0;
    
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
        <View style={styles.tabButtonContent}>
          <Text style={[
            styles.tabButtonText,
            { color: isActive ? themeColors.foreground : themeColors.mutedForeground },
            isActive && styles.tabButtonTextActive
          ]}>
            {label}
          </Text>
          {showBadge && (
            <View style={styles.unseenBadge}>
              <Text style={styles.unseenBadgeText}>
                {unseenNewsCount > 99 ? '99+' : unseenNewsCount}
              </Text>
            </View>
          )}
        </View>
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
        onScroll={handleScroll}
        scrollEventThrottle={400}
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
            <View style={styles.newsFeedContainer}>
              {/* News Sub-tabs */}
              <View style={styles.newsSubTabsContainer}>
                <TouchableOpacity
                  style={[
                    styles.newsSubTab,
                    { 
                      backgroundColor: newsSubTab === 'stocks' 
                        ? (isDark ? '#FFFFFF' : '#000000')
                        : (isDark ? '#1C1C1E' : '#F2F2F7'),
                      borderColor: 'transparent',
                    },
                    newsSubTab === 'stocks' && styles.newsSubTabActive,
                  ]}
                  onPress={() => setNewsSubTab('stocks')}
                >
                  <Text style={[
                    styles.newsSubTabText,
                    { 
                      color: newsSubTab === 'stocks' 
                        ? (isDark ? '#000000' : '#FFFFFF')
                        : themeColors.mutedForeground 
                    },
                    newsSubTab === 'stocks' && styles.newsSubTabTextActive,
                  ]}>
                    Stocks
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.newsSubTab,
                    { 
                      backgroundColor: newsSubTab === 'policy' 
                        ? (isDark ? '#FFFFFF' : '#000000')
                        : (isDark ? '#1C1C1E' : '#F2F2F7'),
                      borderColor: 'transparent',
                    },
                    newsSubTab === 'policy' && styles.newsSubTabActive,
                  ]}
                  onPress={() => setNewsSubTab('policy')}
                >
                  <Text style={[
                    styles.newsSubTabText,
                    { 
                      color: newsSubTab === 'policy' 
                        ? (isDark ? '#000000' : '#FFFFFF')
                        : themeColors.mutedForeground 
                    },
                    newsSubTab === 'policy' && styles.newsSubTabTextActive,
                  ]}>
                    Policy
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.newsSubTab,
                    { 
                      backgroundColor: newsSubTab === 'macro' 
                        ? (isDark ? '#FFFFFF' : '#000000')
                        : (isDark ? '#1C1C1E' : '#F2F2F7'),
                      borderColor: 'transparent',
                    },
                    newsSubTab === 'macro' && styles.newsSubTabActive,
                  ]}
                  onPress={() => setNewsSubTab('macro')}
                >
                  <Text style={[
                    styles.newsSubTabText,
                    { 
                      color: newsSubTab === 'macro' 
                        ? (isDark ? '#000000' : '#FFFFFF')
                        : themeColors.mutedForeground 
                    },
                    newsSubTab === 'macro' && styles.newsSubTabTextActive,
                  ]}>
                    Macro
                  </Text>
                </TouchableOpacity>
              </View>

              {newsLoading && newsItems.length === 0 ? (
                <View style={styles.newsLoadingContainer}>
                  <ActivityIndicator size="large" color={themeColors.primary} />
                  <Text style={[styles.newsLoadingText, { color: themeColors.mutedForeground }]}>
                    Loading news feed...
                  </Text>
                </View>
              ) : newsError && newsItems.length === 0 ? (
                <View style={styles.newsErrorContainer}>
                  <Text style={[styles.newsErrorText, { color: themeColors.mutedForeground }]}>
                    {newsError}
                  </Text>
                  <TouchableOpacity 
                    onPress={refreshNewsFeed}
                    style={[styles.newsRetryButton, { backgroundColor: themeColors.primary }]}
                  >
                    <Text style={styles.newsRetryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : newsItems.length === 0 ? (
                <View style={styles.newsEmptyContainer}>
                  <Text style={[styles.newsEmptyText, { color: themeColors.mutedForeground }]}>
                    No news available at the moment.
                  </Text>
                </View>
              ) : (
                <>
                  {newsItems
                    .filter((item) => {
                      if (newsSubTab === 'stocks') {
                        return ['news', 'press_releases', 'earnings_transcripts', 'price_targets', 'ownership'].includes(item.collection);
                      }
                      if (newsSubTab === 'policy') {
                        return item.collection === 'government_policy';
                      }
                      if (newsSubTab === 'macro') {
                        return item.collection === 'macro_economics';
                      }
                      return true;
                    })
                    .map((item) => (
                      <NewsArticleCard
                        key={`${item.collection}-${item.id}`}
                        item={item}
                        onPress={handleNewsItemPress}
                      />
                    ))}
                  {/* Loading more indicator */}
                  {newsLoadingMore && (
                    <View style={styles.newsLoadingMore}>
                      <ActivityIndicator size="small" color={themeColors.primary} />
                      <Text style={[styles.newsLoadingMoreText, { color: themeColors.mutedForeground }]}>
                        Loading older news...
                      </Text>
                    </View>
                  )}
                  {/* Load more button when not auto-loading */}
                  {hasMoreNews && !newsLoadingMore && newsItems.length > 0 && (
                    <TouchableOpacity 
                      onPress={loadMoreNews}
                      style={[styles.loadMoreButton, { borderColor: themeColors.border }]}
                    >
                      <Text style={[styles.loadMoreButtonText, { color: themeColors.mutedForeground }]}>
                        Load older news
                      </Text>
                    </TouchableOpacity>
                  )}
                  {/* End of news indicator */}
                  {!hasMoreNews && newsItems.length > 0 && (
                    <View style={styles.endOfNewsContainer}>
                      <Text style={[styles.endOfNewsText, { color: themeColors.mutedForeground }]}>
                        You've reached the end
                      </Text>
                    </View>
                  )}
                </>
              )}
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
      
      {/* News Detail Modal */}
      <Modal
        visible={showNewsDetail}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCloseNewsDetail}
      >
        {selectedNewsItem && (
          <NewsDetailScreen
            item={selectedNewsItem}
            onClose={handleCloseNewsDetail}
            onTickerPress={(ticker: string) => {
              // Close news detail and open stock detail
              handleCloseNewsDetail();
              setTimeout(() => handleStockClick(ticker), 300);
            }}
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
  tabButtonContent: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabButtonTextActive: {
    fontWeight: '600',
  },
  unseenBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    marginLeft: 6,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unseenBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
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
  // News feed styles
  newsFeedContainer: {
    flex: 1,
    paddingBottom: 20,
  },
  newsSubTabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  newsSubTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  newsSubTabActive: {
    borderWidth: 1,
  },
  newsSubTabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  newsSubTabTextActive: {
    fontWeight: '700',
  },
  newsLoadingContainer: {
    padding: 60,
    alignItems: 'center',
    gap: 12,
  },
  newsLoadingText: {
    fontSize: 14,
  },
  newsErrorContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  newsErrorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  newsRetryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  newsRetryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  newsEmptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  newsEmptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  newsLoadingMore: {
    padding: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  newsLoadingMoreText: {
    fontSize: 13,
  },
  loadMoreButton: {
    marginHorizontal: 16,
    marginVertical: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  loadMoreButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  endOfNewsContainer: {
    padding: 24,
    alignItems: 'center',
  },
  endOfNewsText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});
