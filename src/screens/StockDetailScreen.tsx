/**
 * StockDetailScreen - Complete stock detail view
 * Matches web app's stock-info-screen.tsx exactly
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Dimensions,
  Modal,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { colors } from '../constants/design-tokens';
import StockAPI from '../services/supabase/StockAPI';
import type { StockData, CompanyInfo } from '../services/supabase/StockAPI';
import HistoricalPriceAPI from '../services/supabase/HistoricalPriceAPI';
import EventsAPI, { MarketEvent } from '../services/supabase/EventsAPI';
import type { CompanyFinancials } from '../types/financials';
import { StockLineChart, TimeRange } from '../components/charts/StockLineChart';
import { UpcomingEventsTimeline } from '../components/events/UpcomingEventsTimeline';
import { CompanyOwnership } from '../components/ownership/CompanyOwnership';
import { CompanyExecutives } from '../components/executives/CompanyExecutives';
import { getEventTypeHexColor } from '../utils/event-formatting';
import {
  formatCurrency,
  formatMarketCap,
  formatPercentage,
  formatPercentageNoSign,
  formatRatio,
  formatVolumeInMillions,
  formatVolumeAlreadyInMillions,
  formatLargeNumber,
  formatEventDateTime,
} from '../utils/formatting';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface StockDetailScreenProps {
  ticker: string;
  onClose: () => void;
}

// Helper function to get color for performance values
const getPerformanceColor = (value: number | null | undefined, themeColors: any): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return themeColors.mutedForeground;
  }
  return value >= 0 ? colors.light.positive : colors.light.negative;
};

// Helper function to convert state names to abbreviations
const getStateAbbreviation = (state: string): string => {
  const stateMap: Record<string, string> = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
    'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
    'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
    'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
    'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
    'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
    'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
    'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
    'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
    'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
    'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC',
  };
  // If already 2 letters, return as-is
  if (state.length === 2) return state.toUpperCase();
  return stateMap[state] || state;
};

// Helper function to format description into paragraphs
const formatDescriptionIntoParagraphs = (text: string): string[] => {
  if (!text) return [];
  
  // Split by sentences (ending with . ! or ?)
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const paragraphs: string[] = [];
  
  // Group sentences into paragraphs (3 sentences each)
  for (let i = 0; i < sentences.length; i += 3) {
    const chunk = sentences.slice(i, i + 3).join(' ').trim();
    if (chunk) paragraphs.push(chunk);
  }
  
  return paragraphs.length > 0 ? paragraphs : [text];
};

export const StockDetailScreen: React.FC<StockDetailScreenProps> = ({ ticker, onClose }) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  // State
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [financials, setFinancials] = useState<CompanyFinancials | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingFinancials, setLoadingFinancials] = useState(true);
  const [loadingCompanyInfo, setLoadingCompanyInfo] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('1D');
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [isFinancialsModalOpen, setIsFinancialsModalOpen] = useState(false);

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

  // Calculate session-specific change based on current period
  const sessionSpecificChange = useMemo(() => {
    if (!stockData || currentPeriod === 'regular' || currentPeriod === 'closed') {
      return null;
    }

    const prevClose = stockData.previousClose || 0;
    const currentPr = stockData.currentPrice || 0;

    if (currentPeriod === 'premarket') {
      // Pre-market: change from previous close
      const dollarChange = currentPr - prevClose;
      const percentChange = prevClose > 0 ? (dollarChange / prevClose) * 100 : 0;
      return { dollarChange, percentChange };
    } else if (currentPeriod === 'afterhours') {
      // After-hours: change from regular session close
      // We'll use the day change as the reference since we don't track session closes separately
      const regularSessionClose = currentPr - stockData.priceChange;
      const dollarChange = currentPr - regularSessionClose;
      const percentChange = regularSessionClose > 0 ? (dollarChange / regularSessionClose) * 100 : 0;
      return { dollarChange, percentChange };
    }

    return null;
  }, [stockData, currentPeriod]);

  // Load stock data
  const loadStockData = useCallback(async () => {
    try {
      setError(null);
      const data = await StockAPI.getStock(ticker);
      setStockData(data);
    } catch (err) {
      console.error('Error loading stock data:', err);
      setError('Failed to load stock data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ticker]);

  // Load historical data for chart
  const loadHistoricalData = useCallback(async (range: TimeRange) => {
    try {
      const data = await HistoricalPriceAPI.fetchHistoricalData(ticker, range);
      setHistoricalData(data || []);
    } catch (err) {
      console.error('Error loading historical data:', err);
    }
  }, [ticker]);

  // Load events
  const loadEvents = useCallback(async () => {
    try {
      const eventsData = await EventsAPI.getEventsByTicker(ticker);
      setEvents(eventsData || []);
    } catch (err) {
      console.error('Error loading events:', err);
    }
  }, [ticker]);

  // Load financials
  const loadFinancials = useCallback(async () => {
    try {
      setLoadingFinancials(true);
      const data = await StockAPI.getFinancials(ticker);
      setFinancials(data);
    } catch (err) {
      console.error('Error loading financials:', err);
      // Don't set error for financials, just use null
      setFinancials(null);
    } finally {
      setLoadingFinancials(false);
    }
  }, [ticker]);

  // Load company info
  const loadCompanyInfo = useCallback(async () => {
    try {
      setLoadingCompanyInfo(true);
      const data = await StockAPI.getCompanyInfo(ticker);
      setCompanyInfo(data);
    } catch (err) {
      console.error('Error loading company info:', err);
      setCompanyInfo(null);
    } finally {
      setLoadingCompanyInfo(false);
    }
  }, [ticker]);

  // Initial load
  useEffect(() => {
    loadStockData();
    loadHistoricalData(timeRange);
    loadEvents();
    loadFinancials();
    loadCompanyInfo();
  }, [loadStockData, loadHistoricalData, loadEvents, loadFinancials, loadCompanyInfo, timeRange]);

  // Handle time range change
  const handleTimeRangeChange = useCallback((range: TimeRange) => {
    setTimeRange(range);
    loadHistoricalData(range);
  }, [loadHistoricalData]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadStockData(),
      loadHistoricalData(timeRange),
      loadEvents(),
      loadFinancials(),
      loadCompanyInfo(),
    ]);
  }, [loadStockData, loadHistoricalData, loadEvents, loadFinancials, loadCompanyInfo, timeRange]);

  // Handle back button
  const handleBack = () => {
    onClose();
  };

  // Convert events to catalyst format for chart - separate past and future
  const { chartCatalysts, pastChartEvents } = useMemo(() => {
    const now = Date.now();
    const past: MarketEvent[] = [];
    const future: { date: string; timestamp: number; catalyst: MarketEvent; dayIndex: number; position: number }[] = [];
    
    events.forEach((event, idx) => {
      const eventTime = new Date(event.actualDateTime || 0).getTime();
      if (eventTime < now) {
        past.push(event);
      } else {
        future.push({
          date: event.actualDateTime || '',
          timestamp: eventTime,
          catalyst: event,
          dayIndex: idx,
          position: 0,
        });
      }
    });
    
    return { chartCatalysts: future, pastChartEvents: past };
  }, [events]);

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView 
        style={[styles.container, { backgroundColor: themeColors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.mutedForeground }]}>
            Loading {ticker}...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error || !stockData) {
    return (
      <SafeAreaView 
        style={[styles.container, { backgroundColor: themeColors.background }]}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themeColors.foreground} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={themeColors.mutedForeground} />
          <Text style={[styles.errorTitle, { color: themeColors.foreground }]}>
            {error || 'Stock not found'}
          </Text>
          <Text style={[styles.errorText, { color: themeColors.mutedForeground }]}>
            Unable to load data for {ticker}
          </Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: themeColors.primary }]}
            onPress={loadStockData}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      {/* Header - Just back button */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={themeColors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stock Chart */}
        <View style={styles.chartContainer}>
          <StockLineChart
            data={historicalData}
            ticker={ticker}
            companyName={stockData.company || ticker}
            currentPrice={stockData.currentPrice || 0}
            previousClose={stockData.previousClose || 0}
            priceChange={stockData.priceChange}
            priceChangePercent={stockData.priceChangePercent}
            sessionChange={sessionSpecificChange?.dollarChange}
            marketPeriod={currentPeriod}
            defaultTimeRange={timeRange}
            onTimeRangeChange={handleTimeRangeChange}
            width={SCREEN_WIDTH}
            height={400}
            hideHeader={false}
            futureCatalysts={chartCatalysts}
            pastEvents={pastChartEvents}
          />
        </View>

        {/* Events Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.foreground }]}>
            Events
          </Text>
          
          <UpcomingEventsTimeline
            ticker={ticker}
            events={events}
            onEventClick={(event) => {
              // TODO: Navigate to event detail or show modal
              console.log('Event clicked:', event.id);
            }}
            showPastUpcomingToggle={true}
          />
        </View>

        {/* Company Info Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.foreground }]}>
            Company Information
          </Text>
          
          {loadingCompanyInfo ? (
            <View style={styles.loadingFinancials}>
              <ActivityIndicator size="small" color={themeColors.primary} />
              <Text style={[styles.loadingFinancialsText, { color: themeColors.mutedForeground }]}>
                Loading company info...
              </Text>
            </View>
          ) : companyInfo ? (
            <View style={styles.companyInfoContainer}>
              {/* Logo and Basic Info */}
              <View style={styles.companyHeader}>
                {companyInfo.logo ? (
                  <Image
                    source={{ uri: companyInfo.logo }}
                    style={styles.companyLogo}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={[styles.companyLogoPlaceholder, { backgroundColor: themeColors.muted }]}>
                    <Text style={[styles.companyLogoText, { color: themeColors.mutedForeground }]}>
                      {ticker.slice(0, 2)}
                    </Text>
                  </View>
                )}
                
                <View style={styles.companyHeaderInfo}>
                  <Text style={[styles.companyName, { color: themeColors.foreground }]}>
                    {companyInfo.name}
                  </Text>
                  {companyInfo.exchange && (
                    <Text style={[styles.companyExchange, { color: themeColors.mutedForeground }]}>
                      {companyInfo.exchange}
                    </Text>
                  )}
                  {companyInfo.weburl && (
                    <TouchableOpacity
                      style={styles.websiteLink}
                      onPress={() => Linking.openURL(companyInfo.weburl!)}
                    >
                      <Ionicons name="globe-outline" size={14} color={themeColors.primary} />
                      <Text style={[styles.websiteLinkText, { color: themeColors.primary }]}>
                        Visit Website
                      </Text>
                      <Ionicons name="open-outline" size={12} color={themeColors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Separator */}
              <View style={[styles.separator, { backgroundColor: themeColors.border }]} />

              {/* Company Details Grid */}
              <View style={styles.companyDetailsGrid}>
                <View style={styles.companyDetailItem}>
                  <Text style={[styles.companyDetailLabel, { color: themeColors.mutedForeground }]}>
                    Industry
                  </Text>
                  <Text style={[styles.companyDetailValue, { color: themeColors.foreground }]}>
                    {companyInfo.industry || companyInfo.gsubind || 'N/A'}
                  </Text>
                </View>
                
                <View style={styles.companyDetailItem}>
                  <Text style={[styles.companyDetailLabel, { color: themeColors.mutedForeground }]}>
                    Employees
                  </Text>
                  <Text style={[styles.companyDetailValue, { color: themeColors.foreground }]}>
                    {companyInfo.employeeTotal ? companyInfo.employeeTotal.toLocaleString() : 'N/A'}
                  </Text>
                </View>
                
                <View style={styles.companyDetailItem}>
                  <Text style={[styles.companyDetailLabel, { color: themeColors.mutedForeground }]}>
                    Headquarters
                  </Text>
                  <Text style={[styles.companyDetailValue, { color: themeColors.foreground }]}>
                    {companyInfo.city && companyInfo.state 
                      ? `${companyInfo.city}, ${getStateAbbreviation(companyInfo.state)}`
                      : companyInfo.city || companyInfo.country || 'N/A'}
                  </Text>
                </View>
                
                <View style={styles.companyDetailItem}>
                  <Text style={[styles.companyDetailLabel, { color: themeColors.mutedForeground }]}>
                    IPO Date
                  </Text>
                  <Text style={[styles.companyDetailValue, { color: themeColors.foreground }]}>
                    {companyInfo.ipo 
                      ? new Date(companyInfo.ipo).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })
                      : 'N/A'}
                  </Text>
                </View>
              </View>

              {/* About Section */}
              {companyInfo.description && (
                <>
                  <View style={[styles.separator, { backgroundColor: themeColors.border }]} />
                  
                  <View style={styles.aboutSection}>
                    <Text style={[styles.aboutTitle, { color: themeColors.foreground }]}>
                      About {companyInfo.name}
                    </Text>
                    <View style={styles.aboutContent}>
                      {formatDescriptionIntoParagraphs(companyInfo.description).map((paragraph, index) => (
                        <Text 
                          key={index} 
                          style={[styles.aboutParagraph, { color: themeColors.mutedForeground }]}
                        >
                          {paragraph}
                        </Text>
                      ))}
                    </View>
                  </View>
                </>
              )}
            </View>
          ) : (
            <View style={styles.companyInfoGrid}>
              <View style={styles.companyInfoItem}>
                <Text style={[styles.companyInfoLabel, { color: themeColors.mutedForeground }]}>
                  Sector
                </Text>
                <Text style={[styles.companyInfoValue, { color: themeColors.foreground }]}>
                  {stockData.sector || 'N/A'}
                </Text>
              </View>
              
              <View style={styles.companyInfoItem}>
                <Text style={[styles.companyInfoLabel, { color: themeColors.mutedForeground }]}>
                  Market Cap
                </Text>
                <Text style={[styles.companyInfoValue, { color: themeColors.foreground }]}>
                  {stockData.marketCap || 'N/A'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Key Statistics Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.foreground }]}>
            Key Statistics
          </Text>
          
          <View style={styles.statsGrid}>
            {/* Row 1 */}
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                Open
              </Text>
              <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                {formatCurrency(stockData.open)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                High
              </Text>
              <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                {formatCurrency(stockData.high)}
              </Text>
            </View>

            {/* Row 2 */}
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                Low
              </Text>
              <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                {formatCurrency(stockData.low)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                Previous Close
              </Text>
              <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                {formatCurrency(stockData.previousClose)}
              </Text>
            </View>

            {/* Row 3 */}
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                Volume
              </Text>
              <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                {formatVolumeInMillions(stockData.volume)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                Avg Volume (10D)
              </Text>
              <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                {financials?.avg_volume_10d 
                  ? formatVolumeAlreadyInMillions(financials.avg_volume_10d)
                  : 'N/A'}
              </Text>
            </View>

            {/* Row 4 */}
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                52W High
              </Text>
              <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                {financials?.week_52_high_value 
                  ? formatCurrency(financials.week_52_high_value)
                  : 'N/A'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                52W Low
              </Text>
              <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                {financials?.week_52_low_value 
                  ? formatCurrency(financials.week_52_low_value)
                  : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* Financials Card */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: themeColors.foreground }]}>
            Financials
          </Text>
          
          {loadingFinancials ? (
            <View style={styles.loadingFinancials}>
              <ActivityIndicator size="small" color={themeColors.primary} />
              <Text style={[styles.loadingFinancialsText, { color: themeColors.mutedForeground }]}>
                Loading financials...
              </Text>
            </View>
          ) : financials ? (
            <>
              {/* Always Visible Valuation Metrics */}
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                    Market Cap
                  </Text>
                  <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                    {formatMarketCap(financials.market_cap)}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                    Enterprise Value
                  </Text>
                  <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                    {formatMarketCap(financials.enterprise_value)}
                  </Text>
                </View>

                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                    P/E Ratio (TTM)
                  </Text>
                  <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                    {formatRatio(financials.pe_ttm)}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                    Forward P/E
                  </Text>
                  <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                    {formatRatio(financials.forward_pe)}
                  </Text>
                </View>
              </View>

              {/* Show More Button */}
              <TouchableOpacity 
                style={[styles.showMoreButton, { borderColor: themeColors.border }]}
                onPress={() => setIsFinancialsModalOpen(true)}
              >
                <Text style={[styles.showMoreButtonText, { color: themeColors.foreground }]}>
                  Show More
                </Text>
                <Ionicons name="chevron-forward" size={16} color={themeColors.foreground} />
              </TouchableOpacity>
            </>
          ) : (
            <Text style={[styles.placeholderText, { color: themeColors.mutedForeground }]}>
              Financial data unavailable
            </Text>
          )}
        </View>

        {/* Company Ownership Section */}
        <View style={styles.section}>
          <CompanyOwnership
            ticker={ticker}
            companyName={stockData?.company}
            shareOutstanding={companyInfo?.shareOutstanding}
            currentPrice={stockData?.currentPrice}
          />
        </View>

        {/* Company Executives Section */}
        <View style={styles.section}>
          <CompanyExecutives
            ticker={ticker}
            companyName={stockData?.company}
          />
        </View>

      </ScrollView>

      {/* Financials Modal */}
      <Modal
        visible={isFinancialsModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsFinancialsModalOpen(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: themeColors.background }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
            <View style={styles.modalHeaderLeft}>
              <View style={[styles.tickerBadge, { backgroundColor: themeColors.muted }]}>
                <Text style={[styles.tickerBadgeText, { color: themeColors.foreground }]}>
                  {ticker}
                </Text>
              </View>
              <View>
                <Text style={[styles.modalCompanyName, { color: themeColors.foreground }]}>
                  {stockData?.company || ticker}
                </Text>
                <Text style={[styles.modalSubtitle, { color: themeColors.mutedForeground }]}>
                  Financials
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setIsFinancialsModalOpen(false)}>
              <Ionicons name="close" size={24} color={themeColors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Modal Content */}
          <ScrollView 
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {financials ? (
              <>
                {/* Additional Valuation */}
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: themeColors.foreground }]}>
                    Additional Valuation
                  </Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        P/B Ratio
                      </Text>
                      <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                        {formatRatio(financials.pb)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        P/S Ratio (TTM)
                      </Text>
                      <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                        {formatRatio(financials.ps_ttm)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        P/FCF (TTM)
                      </Text>
                      <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                        {formatRatio(financials.pfcf_share_ttm)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        P/CF (TTM)
                      </Text>
                      <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                        {formatRatio(financials.pcf_share_ttm)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        EV/Revenue
                      </Text>
                      <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                        {formatRatio(financials.ev_revenue_ttm)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        EV/EBITDA
                      </Text>
                      <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                        {formatRatio(financials.ev_ebitda_ttm)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Profitability & Growth */}
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: themeColors.foreground }]}>
                    Profitability & Growth
                  </Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        EPS (TTM)
                      </Text>
                      <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                        {formatCurrency(financials.eps_ttm)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        Revenue/Share (TTM)
                      </Text>
                      <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                        {formatCurrency(financials.revenue_per_share_ttm)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        EPS Growth (YoY)
                      </Text>
                      <Text 
                        style={[
                          styles.statValue,
                          { color: getPerformanceColor(financials.eps_growth_ttm_yoy, themeColors) }
                        ]}
                      >
                        {formatPercentage(financials.eps_growth_ttm_yoy)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        Revenue Growth (YoY)
                      </Text>
                      <Text 
                        style={[
                          styles.statValue,
                          { color: getPerformanceColor(financials.revenue_growth_ttm_yoy, themeColors) }
                        ]}
                      >
                        {formatPercentage(financials.revenue_growth_ttm_yoy)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        EPS Growth (5Y CAGR)
                      </Text>
                      <Text 
                        style={[
                          styles.statValue,
                          { color: getPerformanceColor(financials.eps_growth_5y, themeColors) }
                        ]}
                      >
                        {formatPercentage(financials.eps_growth_5y)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        Revenue Growth (5Y)
                      </Text>
                      <Text 
                        style={[
                          styles.statValue,
                          { color: getPerformanceColor(financials.revenue_growth_5y, themeColors) }
                        ]}
                      >
                        {formatPercentage(financials.revenue_growth_5y)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Margins */}
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: themeColors.foreground }]}>
                    Margins
                  </Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        Net Profit Margin
                      </Text>
                      <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                        {formatPercentageNoSign(financials.net_profit_margin_ttm)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        Operating Margin
                      </Text>
                      <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                        {formatPercentageNoSign(financials.operating_margin_ttm)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        Gross Margin
                      </Text>
                      <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                        {formatPercentageNoSign(financials.gross_margin_ttm)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        Pretax Margin
                      </Text>
                      <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                        {formatPercentageNoSign(financials.pretax_margin_ttm)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Returns */}
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: themeColors.foreground }]}>
                    Returns
                  </Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        Return on Assets (TTM)
                      </Text>
                      <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                        {formatPercentageNoSign(financials.roa_ttm)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        Return on Equity (TTM)
                      </Text>
                      <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                        {formatPercentageNoSign(financials.roe_ttm)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        Return on Investment (TTM)
                      </Text>
                      <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                        {formatPercentageNoSign(financials.roi_ttm)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        ROE (5Y Avg)
                      </Text>
                      <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                        {formatPercentageNoSign(financials.roe_5y)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Balance Sheet */}
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: themeColors.foreground }]}>
                    Balance Sheet
                  </Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        Book Value/Share
                      </Text>
                      <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                        {formatCurrency(financials.book_value_per_share_annual)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        Tangible Book Value/Share
                      </Text>
                      <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                        {formatCurrency(financials.tangible_book_value_per_share_annual)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        Current Ratio
                      </Text>
                      <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                        {formatRatio(financials.current_ratio_annual)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        Quick Ratio
                      </Text>
                      <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                        {formatRatio(financials.quick_ratio_annual)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        LT Debt/Equity
                      </Text>
                      <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                        {formatRatio(financials.long_term_debt_equity_annual)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        Total Debt/Equity
                      </Text>
                      <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                        {formatRatio(financials.total_debt_total_equity_annual)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Efficiency */}
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: themeColors.foreground }]}>
                    Efficiency
                  </Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        Asset Turnover
                      </Text>
                      <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                        {formatRatio(financials.asset_turnover_ttm)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        Inventory Turnover
                      </Text>
                      <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                        {formatRatio(financials.inventory_turnover_ttm)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        Receivables Turnover
                      </Text>
                      <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                        {formatRatio(financials.receivables_turnover_ttm)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        Revenue/Employee
                      </Text>
                      <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                        {formatCurrency(financials.revenue_employee_ttm)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Dividends & Shareholder Returns */}
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: themeColors.foreground }]}>
                    Dividends & Shareholder Returns
                  </Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        Dividend/Share (Annual)
                      </Text>
                      <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                        {formatCurrency(financials.dividend_per_share_annual)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        Dividend Yield
                      </Text>
                      <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                        {formatPercentageNoSign(financials.current_dividend_yield_ttm)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        Payout Ratio (TTM)
                      </Text>
                      <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                        {formatPercentageNoSign(financials.payout_ratio_ttm)}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>
                        Payout Ratio (Annual)
                      </Text>
                      <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                        {formatPercentageNoSign(financials.payout_ratio_annual)}
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            ) : (
              <Text style={[styles.placeholderText, { color: themeColors.mutedForeground }]}>
                Financial data unavailable
              </Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 0,
  },
  backButton: {
    padding: 0,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: Platform.select({ ios: 40, android: 40, default: 20 }),
  },
  chartContainer: {
    marginBottom: 0,
  },
  section: {
    paddingLeft: 50,
    paddingRight: 0,
    paddingVertical: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  statItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  loadingFinancials: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  loadingFinancialsText: {
    marginLeft: 8,
    fontSize: 14,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 16,
    marginLeft: -25,
    marginRight: 25,
  },
  showMoreButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tickerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 12,
  },
  tickerBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalCompanyName: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalScrollView: {
    flex: 1,
  },
  modalContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  modalSection: {
    marginTop: 24,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
  },
  eventsContainer: {
    gap: 12,
  },
  eventCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  eventTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  eventTypeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    lineHeight: 20,
  },
  eventTime: {
    fontSize: 12,
    marginBottom: 8,
  },
  impactContainer: {
    marginTop: 4,
  },
  impactText: {
    fontSize: 12,
    fontWeight: '500',
  },
  moreEventsText: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  companyInfoGrid: {
    gap: 16,
  },
  companyInfoItem: {
    marginBottom: 12,
  },
  companyInfoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  companyInfoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  // New Company Info Styles
  companyInfoContainer: {
    gap: 16,
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  companyLogo: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  companyLogoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyLogoText: {
    fontSize: 20,
    fontWeight: '600',
  },
  companyHeaderInfo: {
    flex: 1,
    gap: 4,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '600',
  },
  companyExchange: {
    fontSize: 12,
  },
  websiteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  websiteLinkText: {
    fontSize: 13,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    marginVertical: 16,
  },
  companyDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  companyDetailItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  companyDetailLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  companyDetailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  aboutSection: {
    marginTop: 8,
  },
  aboutTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  aboutContent: {
    gap: 12,
  },
  aboutParagraph: {
    fontSize: 14,
    lineHeight: 22,
  },
});
