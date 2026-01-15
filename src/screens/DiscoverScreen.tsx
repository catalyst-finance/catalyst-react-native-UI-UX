import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { colors } from '../constants/design-tokens';
import EventsAPI, { MarketEvent } from '../services/supabase/EventsAPI';
import StockAPI, { StockData } from '../services/supabase/StockAPI';
import { formatCurrency, formatMarketCap, formatImpactRating } from '../utils/formatting';
import { eventTypeConfig, getEventTypeHexColor } from '../utils/event-formatting';
import { getEventIcon } from '../utils/event-icons';
import { StockDetailScreen } from './StockDetailScreen';

interface SectorTrend {
  sector: string;
  catalysts: number;
  avgImpact: number;
  trend: 'up' | 'down' | 'flat';
}

const popularSearches = [
  'Earnings',
  'FDA approvals',
  'Stock splits',
  'Merger rumors',
  'Product launches',
];

type FilterType = 'all' | 'today' | 'week' | 'month';

export const DiscoverScreen: React.FC = () => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [searchResults, setSearchResults] = useState<MarketEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [matchedStock, setMatchedStock] = useState<StockData | null>(null);
  const [isAiRecommendationsOpen, setIsAiRecommendationsOpen] = useState(false);

  // Stock detail modal state
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [showStockDetail, setShowStockDetail] = useState(false);

  // Load events
  const loadEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      const upcomingEvents = await EventsAPI.getUpcomingEvents(50);
      const recentEvents = await EventsAPI.getRecentEvents(20);
      setEvents([...upcomingEvents, ...recentEvents]);
    } catch (error) {
      console.error('Error loading events:', error);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Map popular searches to better search terms
  const mapSearchQuery = (query: string): string => {
    const queryLower = query.toLowerCase();
    const searchMappings: Record<string, string> = {
      'earnings': 'earnings',
      'fda approvals': 'fda',
      'fda approval': 'fda',
      'stock splits': 'split',
      'merger rumors': 'merger',
      'product launches': 'launch',
      'product launch': 'launch',
    };
    return searchMappings[queryLower] || query;
  };

  // Handle search
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setMatchedStock(null);
        setIsSearching(false);
        return;
      }

      try {
        setIsSearching(true);

        // Search for stocks
        try {
          const stockSearchResults = await StockAPI.searchStocks(searchQuery.trim(), 5);
          if (stockSearchResults.length > 0) {
            setMatchedStock(stockSearchResults[0]);
          } else {
            setMatchedStock(null);
          }
        } catch (error) {
          console.error('Error searching stocks:', error);
          setMatchedStock(null);
        }

        // Search for events
        const mappedQuery = mapSearchQuery(searchQuery);
        let results = await EventsAPI.searchEvents(mappedQuery);

        if (results.length === 0 && mappedQuery !== searchQuery) {
          results = await EventsAPI.searchEvents(searchQuery);
        }

        if (results.length === 0) {
          results = events.slice(0, 3);
        }

        setSearchResults(results);
      } catch (error) {
        console.error('Error searching events:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, events]);

  // Get trending catalysts
  const getTrendingCatalysts = useCallback(() => {
    const now = new Date();
    const upcomingEvents = events.filter((event) => {
      if (!event.actualDateTime) return true;
      const eventDate = new Date(event.actualDateTime);
      return eventDate > now;
    });

    // Shuffle and take top events
    const shuffledEvents = [...upcomingEvents].sort(() => Math.random() - 0.5);
    return shuffledEvents.slice(0, 20);
  }, [events]);

  // Generate sector trends
  const getSectorTrends = useCallback((): SectorTrend[] => {
    const sectorMap = new Map<string, { count: number; totalImpact: number }>();

    events.forEach((event) => {
      if (event.sector) {
        const current = sectorMap.get(event.sector) || { count: 0, totalImpact: 0 };
        sectorMap.set(event.sector, {
          count: current.count + 1,
          totalImpact: current.totalImpact + Math.abs(event.impactRating),
        });
      }
    });

    return Array.from(sectorMap.entries())
      .map(([sector, data]) => ({
        sector,
        catalysts: data.count,
        avgImpact: data.count > 0 ? data.totalImpact / data.count : 0,
        trend:
          data.totalImpact / data.count > 1.5
            ? ('up' as const)
            : data.totalImpact / data.count < 0.5
            ? ('down' as const)
            : ('flat' as const),
      }))
      .slice(0, 4);
  }, [events]);

  const handleTickerClick = (ticker: string) => {
    setSelectedTicker(ticker);
    setShowStockDetail(true);
  };

  const handleCloseStockDetail = () => {
    setShowStockDetail(false);
    setSelectedTicker(null);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const getImpactColor = (rating: number): string => {
    if (rating > 0) return themeColors.positive;
    if (rating < 0) return themeColors.negative;
    return themeColors.mutedForeground;
  };

  const trendingCatalysts = getTrendingCatalysts();
  const sectorTrends = getSectorTrends();
  const displayEvents = searchQuery ? searchResults : trendingCatalysts;
  const totalSearchResults = searchQuery
    ? matchedStock
      ? searchResults.length + 1
      : searchResults.length
    : 0;

  // Render event card
  const renderEventCard = (event: MarketEvent) => {
    const config = eventTypeConfig[event.type as keyof typeof eventTypeConfig] || eventTypeConfig.launch;
    const iconName = getEventIcon(event.type);
    const eventColor = getEventTypeHexColor(event.type);

    return (
      <TouchableOpacity
        key={event.id}
        style={[styles.eventCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
        onPress={() => handleTickerClick(event.ticker)}
        activeOpacity={0.7}
      >
        <View style={styles.eventCardHeader}>
          <View style={styles.eventCardLeft}>
            <View style={styles.eventTypeRow}>
              <View style={[styles.eventTypeIcon, { backgroundColor: eventColor }]}>
                <Ionicons name={iconName} size={14} color="#ffffff" />
              </View>
              <View style={[styles.eventTypeBadge, { backgroundColor: themeColors.muted }]}>
                <Text style={[styles.eventTypeText, { color: themeColors.mutedForeground }]}>
                  {config.label}
                </Text>
              </View>
            </View>
            <Text style={[styles.eventTitle, { color: themeColors.foreground }]} numberOfLines={2}>
              {event.title}
            </Text>
            <Text style={[styles.eventCompany, { color: themeColors.mutedForeground }]}>
              {event.company}
            </Text>
          </View>
          <View style={styles.eventCardRight}>
            <TouchableOpacity
              style={[styles.tickerBadge, { backgroundColor: themeColors.primary }]}
              onPress={() => handleTickerClick(event.ticker)}
            >
              <Text style={styles.tickerText}>{event.ticker}</Text>
            </TouchableOpacity>
            {event.priceChangePercent !== undefined && (
              <Text
                style={[
                  styles.priceChange,
                  { color: event.priceChange && event.priceChange >= 0 ? themeColors.positive : themeColors.negative },
                ]}
              >
                {event.priceChange && event.priceChange >= 0 ? '+' : ''}
                {event.priceChangePercent?.toFixed(2)}%
              </Text>
            )}
            <Text style={[styles.currentPrice, { color: themeColors.mutedForeground }]}>
              {event.currentPrice ? formatCurrency(event.currentPrice) : 'N/A'}
            </Text>
            <Text style={[styles.marketCap, { color: themeColors.mutedForeground }]}>
              {formatMarketCap(event.marketCap)}
            </Text>
          </View>
        </View>
        <View style={styles.eventCardFooter}>
          <View style={styles.eventTime}>
            <Ionicons name="time-outline" size={12} color={themeColors.mutedForeground} />
            <Text style={[styles.eventTimeText, { color: themeColors.mutedForeground }]}>
              {event.timeUntil || event.time}
            </Text>
          </View>
          <View style={[styles.impactBadge, { borderColor: getImpactColor(event.impactRating) }]}>
            <Text style={[styles.impactText, { color: getImpactColor(event.impactRating) }]}>
              {formatImpactRating(event.impactRating)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render stock card (for search results)
  const renderStockCard = () => {
    if (!matchedStock) return null;

    return (
      <TouchableOpacity
        style={[
          styles.stockCard,
          { backgroundColor: themeColors.card, borderColor: themeColors.primary },
        ]}
        onPress={() => handleTickerClick(matchedStock.symbol)}
        activeOpacity={0.7}
      >
        <View style={styles.stockCardContent}>
          <View style={styles.stockCardLeft}>
            <TouchableOpacity
              style={[styles.tickerBadge, { backgroundColor: themeColors.primary }]}
              onPress={() => handleTickerClick(matchedStock.symbol)}
            >
              <Text style={styles.tickerText}>{matchedStock.symbol}</Text>
            </TouchableOpacity>
            <Text style={[styles.stockCompany, { color: themeColors.foreground }]} numberOfLines={1}>
              {matchedStock.company}
            </Text>
            <Text style={[styles.stockSector, { color: themeColors.mutedForeground }]}>
              {matchedStock.sector}
            </Text>
          </View>
          <View style={styles.stockCardRight}>
            <Text
              style={[
                styles.stockPriceChange,
                { color: matchedStock.priceChange >= 0 ? themeColors.positive : themeColors.negative },
              ]}
            >
              {matchedStock.priceChange >= 0 ? '+' : ''}
              {matchedStock.priceChangePercent.toFixed(2)}%
            </Text>
            <Text style={[styles.stockPrice, { color: themeColors.mutedForeground }]}>
              {formatCurrency(matchedStock.currentPrice)}
            </Text>
            <Text style={[styles.stockMarketCap, { color: themeColors.mutedForeground }]}>
              {matchedStock.marketCap}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: themeColors.muted }]}>
          <Ionicons name="search" size={16} color={themeColors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: themeColors.foreground }]}
            placeholder="Search stocks, events, or sectors..."
            placeholderTextColor={themeColors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color={themeColors.mutedForeground} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          {(['all', 'today', 'week', 'month'] as FilterType[]).map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                activeFilter === filter
                  ? { backgroundColor: themeColors.primary }
                  : { backgroundColor: themeColors.muted, borderColor: themeColors.border, borderWidth: 1 },
              ]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: activeFilter === filter ? '#ffffff' : themeColors.foreground },
                ]}
              >
                {filter === 'all'
                  ? 'All Time'
                  : filter === 'today'
                  ? 'Today'
                  : filter === 'week'
                  ? 'This Week'
                  : 'This Month'}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.filterButton, { backgroundColor: themeColors.muted, borderColor: themeColors.border, borderWidth: 1 }]}>
            <Ionicons name="filter" size={16} color={themeColors.foreground} />
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary} />}
      >
        {/* Popular Searches - Only show when not searching */}
        {!searchQuery && (
          <View style={[styles.section, { borderBottomColor: themeColors.border }]}>
            <Text style={[styles.sectionTitle, { color: themeColors.foreground }]}>Popular Searches</Text>
            <View style={styles.popularSearches}>
              {popularSearches.map((search, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.popularSearchButton, { backgroundColor: themeColors.muted, borderColor: themeColors.border }]}
                  onPress={() => setSearchQuery(search)}
                >
                  <Text style={[styles.popularSearchText, { color: themeColors.foreground }]}>{search}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* AI Recommendations - Collapsible */}
        {!searchQuery && (
          <View style={[styles.section, { borderBottomColor: themeColors.border }]}>
            <TouchableOpacity
              style={styles.aiRecommendationsHeader}
              onPress={() => setIsAiRecommendationsOpen(!isAiRecommendationsOpen)}
            >
              <View style={styles.aiRecommendationsTitle}>
                <Ionicons name="sparkles" size={20} color={themeColors.primary} />
                <Text style={[styles.sectionTitle, { color: themeColors.foreground, marginLeft: 8 }]}>
                  AI Recommendations
                </Text>
              </View>
              <Ionicons
                name={isAiRecommendationsOpen ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={themeColors.mutedForeground}
              />
            </TouchableOpacity>
            {isAiRecommendationsOpen && (
              <View style={[styles.aiCard, { backgroundColor: `${themeColors.primary}10`, borderColor: `${themeColors.primary}30` }]}>
                <View style={[styles.aiIconContainer, { backgroundColor: themeColors.primary }]}>
                  <Ionicons name="sparkles" size={16} color="#ffffff" />
                </View>
                <View style={styles.aiContent}>
                  <Text style={[styles.aiTitle, { color: themeColors.foreground }]}>Biotech FDA Approvals</Text>
                  <Text style={[styles.aiDescription, { color: themeColors.mutedForeground }]}>
                    Based on your portfolio, we've identified 3 upcoming FDA decisions with high probability of approval.
                  </Text>
                  <TouchableOpacity style={[styles.aiButton, { backgroundColor: themeColors.primary }]}>
                    <Text style={styles.aiButtonText}>View Recommendations</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Trending Events / Search Results */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up" size={20} color={themeColors.primary} />
            <Text style={[styles.sectionTitle, { color: themeColors.foreground, marginLeft: 8 }]}>
              {searchQuery ? `Search Results (${totalSearchResults})` : 'Trending Events'}
            </Text>
          </View>

          {isLoading || isSearching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={themeColors.primary} />
              <Text style={[styles.loadingText, { color: themeColors.mutedForeground }]}>
                {isSearching ? 'Searching...' : 'Loading catalysts...'}
              </Text>
            </View>
          ) : displayEvents.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search" size={32} color={themeColors.mutedForeground} />
              <Text style={[styles.emptyText, { color: themeColors.mutedForeground }]}>
                {searchQuery ? 'No events found for your search' : 'No trending catalysts available'}
              </Text>
              {searchQuery && (
                <TouchableOpacity style={[styles.backButton, { borderColor: themeColors.border }]} onPress={clearSearch}>
                  <Ionicons name="arrow-back" size={16} color={themeColors.foreground} />
                  <Text style={[styles.backButtonText, { color: themeColors.foreground }]}>Back to Discovery</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.eventsContainer}>
              {/* Stock card for search results */}
              {searchQuery && renderStockCard()}
              {/* Event cards */}
              {displayEvents.map(renderEventCard)}
            </View>
          )}
        </View>

        {/* Sector Activity - Only show when not searching */}
        {!searchQuery && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="sparkles" size={20} color={themeColors.primary} />
              <Text style={[styles.sectionTitle, { color: themeColors.foreground, marginLeft: 8 }]}>
                Sector Activity
              </Text>
            </View>
            <View style={styles.sectorGrid}>
              {sectorTrends.map((sector, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.sectorCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
                  activeOpacity={0.7}
                >
                  <View style={styles.sectorHeader}>
                    <Text style={[styles.sectorName, { color: themeColors.foreground }]} numberOfLines={1}>
                      {sector.sector}
                    </Text>
                    <View
                      style={[
                        styles.trendDot,
                        {
                          backgroundColor:
                            sector.trend === 'up'
                              ? themeColors.positive
                              : sector.trend === 'down'
                              ? themeColors.negative
                              : themeColors.mutedForeground,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.sectorStats}>
                    <View style={styles.sectorStat}>
                      <Text style={[styles.sectorStatLabel, { color: themeColors.mutedForeground }]}>Catalysts</Text>
                      <Text style={[styles.sectorStatValue, { color: themeColors.foreground }]}>{sector.catalysts}</Text>
                    </View>
                    <View style={styles.sectorStat}>
                      <Text style={[styles.sectorStatLabel, { color: themeColors.mutedForeground }]}>Avg Impact</Text>
                      <Text
                        style={[
                          styles.sectorStatValue,
                          {
                            color:
                              sector.avgImpact > 0
                                ? themeColors.positive
                                : sector.avgImpact < 0
                                ? themeColors.negative
                                : themeColors.mutedForeground,
                          },
                        ]}
                      >
                        {sector.avgImpact > 0 ? '+' : ''}
                        {sector.avgImpact.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Stock Detail Modal */}
      <Modal
        visible={showStockDetail}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCloseStockDetail}
      >
        {selectedTicker && <StockDetailScreen ticker={selectedTicker} onClose={handleCloseStockDetail} />}
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  clearButton: {
    padding: 4,
  },
  filterContainer: {
    flexGrow: 0,
  },
  filterContent: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  popularSearches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  popularSearchButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  popularSearchText: {
    fontSize: 13,
  },
  aiRecommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiRecommendationsTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  aiIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiContent: {
    flex: 1,
    marginLeft: 12,
  },
  aiTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  aiDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  aiButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  aiButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 13,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 12,
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 13,
  },
  eventsContainer: {
    gap: 12,
  },

  eventCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  eventCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  eventCardLeft: {
    flex: 1,
    marginRight: 12,
  },
  eventTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  eventTypeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  eventTypeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 4,
  },
  eventCompany: {
    fontSize: 13,
  },
  eventCardRight: {
    alignItems: 'flex-end',
  },
  tickerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  tickerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  priceChange: {
    fontSize: 13,
    fontWeight: '500',
  },
  currentPrice: {
    fontSize: 11,
    marginTop: 2,
  },
  marketCap: {
    fontSize: 11,
    marginTop: 2,
  },
  eventCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventTimeText: {
    fontSize: 12,
  },
  impactBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  impactText: {
    fontSize: 11,
    fontWeight: '500',
  },
  stockCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  stockCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stockCardLeft: {
    flex: 1,
  },
  stockCompany: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  stockSector: {
    fontSize: 13,
    marginTop: 4,
  },
  stockCardRight: {
    alignItems: 'flex-end',
  },
  stockPriceChange: {
    fontSize: 14,
    fontWeight: '500',
  },
  stockPrice: {
    fontSize: 12,
    marginTop: 4,
  },
  stockMarketCap: {
    fontSize: 12,
    marginTop: 2,
  },
  sectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sectorCard: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectorName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  trendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectorStats: {
    gap: 8,
  },
  sectorStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectorStatLabel: {
    fontSize: 11,
  },
  sectorStatValue: {
    fontSize: 12,
    fontWeight: '500',
  },
});
