/**
 * CalendarMonthGrid Component - React Native Implementation
 * 
 * Full-featured calendar grid matching the web app exactly.
 * Displays 12 months organized by quarters with event counts,
 * company logos, event type indicators, and expandable timelines.
 */

import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../constants/design-tokens';
import StockAPI from '../../services/supabase/StockAPI';
import { EventTypeIcon } from './EventTypeIcon';
import { TickerTimeline } from './TickerTimeline';
import type { CalendarMonthGridProps, MonthData } from './types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const CalendarMonthGrid: React.FC<CalendarMonthGridProps> = ({
  events,
  onMonthClick,
  year: propYear,
  onYearChange,
  onEventClick,
  stocksData = {},
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const [selectedYear, setSelectedYear] = useState(propYear ?? currentYear);
  const selectedYearRef = useRef(selectedYear);
  
  // Keep ref in sync with state
  useEffect(() => {
    selectedYearRef.current = selectedYear;
  }, [selectedYear]);
  const [companiesWithLogos, setCompaniesWithLogos] = useState<Map<string, string>>(new Map());
  const [expandedMonth, setExpandedMonth] = useState<number | null>(
    (propYear ?? currentYear) === currentYear ? currentMonth : null
  );
  const expandedMonthRef = useRef(expandedMonth);

  // Keep ref in sync with state
  useEffect(() => {
    expandedMonthRef.current = expandedMonth;
  }, [expandedMonth]);

  const hasInitialExpanded = useRef(false);

  // Swipe gesture state
  const pan = useRef(new Animated.Value(0)).current;
  const [isAnimating, setIsAnimating] = useState(false);

  // Calculate carousel width (each view is full screen width)
  const carouselWidth = SCREEN_WIDTH;
  const centerOffset = -carouselWidth; // Start at middle view (-100% of screen width)

  // PanResponder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isAnimating && expandedMonthRef.current === null, // Only capture when no month is expanded
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        // Don't capture if a month is expanded (to allow horizontal timeline scrolling)
        if (isAnimating || expandedMonthRef.current !== null) return false;
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 0.8;
        const isSignificant = Math.abs(gestureState.dx) > 5;
        return isHorizontal && isSignificant;
      },
      onPanResponderTerminationRequest: () => false, // Don't allow termination during swipe
      onPanResponderGrant: () => {
        pan.flattenOffset();
        pan.setOffset(centerOffset);
      },
      onPanResponderMove: (_evt, gestureState) => {
        // Apply resistance for rubber band effect
        const resistance = 0.7;
        pan.setValue(gestureState.dx * resistance);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        const swipeThreshold = 50;
        const velocity = gestureState.vx;
        
        // Check velocity for quick swipes
        if (Math.abs(velocity) > 0.5) {
          if (velocity > 0) {
            // Swipe right = previous year
            handleSwipeYear(-1);
          } else {
            // Swipe left = next year
            handleSwipeYear(1);
          }
        } else if (gestureState.dx > swipeThreshold) {
          // Swipe right = previous year
          handleSwipeYear(-1);
        } else if (gestureState.dx < -swipeThreshold) {
          // Swipe left = next year
          handleSwipeYear(1);
        } else {
          // Snap back to current year
          Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: false,
            tension: 80,
            friction: 12,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        // Snap back to current year
        Animated.spring(pan, {
          toValue: 0,
          useNativeDriver: false,
          tension: 80,
          friction: 12,
        }).start();
      },
    })
  ).current;

  const handleSwipeYear = (direction: number) => {
    // Use ref to get the CURRENT year value (not stale closure)
    const currentYear = selectedYearRef.current;
    const newYear = currentYear + direction;
    
    setIsAnimating(true);
    
    // Animate to target position
    const targetOffset = direction > 0 ? -carouselWidth : carouselWidth;
    
    Animated.timing(pan, {
      toValue: targetOffset,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      // After animation completes, update year
      setSelectedYear(newYear);
      
      // Reset pan position AFTER a small delay to ensure state update completes
      setTimeout(() => {
        pan.setValue(0);
        pan.setOffset(centerOffset);
        setIsAnimating(false);
      }, 50);
    });
  };

  // Render year grid
  const renderYearGrid = (year: number) => {
    const yearData = generateMonthDataForYear(year);
    
    return (
      <View style={{ width: SCREEN_WIDTH }}>
        <View style={styles.gridContainer}>
          {renderQuarter('Q1', 0, 3, yearData)}
          {renderQuarter('Q2', 3, 6, yearData)}
          {renderQuarter('Q3', 6, 9, yearData)}
          {renderQuarter('Q4', 9, 12, yearData)}
        </View>
      </View>
    );
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Initialize pan position on mount
  useEffect(() => {
    pan.setOffset(centerOffset);
  }, []);

  // Notify parent when year changes
  useEffect(() => {
    if (onYearChange) {
      onYearChange(selectedYear);
    }
  }, [selectedYear, onYearChange]);

  // Reset expanded month when year changes
  useEffect(() => {
    setExpandedMonth(null);
    hasInitialExpanded.current = false;
  }, [selectedYear]);

  // Auto-expand current month on initial load
  useEffect(() => {
    if (!hasInitialExpanded.current && selectedYear === currentYear) {
      setExpandedMonth(currentMonth);
      hasInitialExpanded.current = true;
    }
  }, [selectedYear, currentYear, currentMonth]);

  // Sync internal state with prop changes
  useEffect(() => {
    if (propYear !== undefined) {
      setSelectedYear(propYear);
    }
  }, [propYear]);

  // Generate month data for any year
  const generateMonthDataForYear = (year: number): MonthData[] => {
    const data: MonthData[] = [];

    // Initialize 12 months
    for (let i = 0; i < 12; i++) {
      data.push({
        month: i,
        year: year,
        eventCount: 0,
        companies: [],
      });
    }

    // Count events per month and collect event types
    events.forEach(event => {
      if (!event.actualDateTime) return;

      const eventDate = new Date(event.actualDateTime);
      const eventMonth = eventDate.getMonth();
      const eventYear = eventDate.getFullYear();

      if (eventYear === year) {
        const monthInfo = data[eventMonth];
        monthInfo.eventCount++;

        // Track unique companies and their earliest event date
        const ticker = event.ticker || 'N/A';
        const existingCompany = monthInfo.companies.find(c => c.ticker === ticker);

        if (existingCompany) {
          // Update earliest event date if this event is earlier
          if (eventDate < existingCompany.earliestEventDate) {
            existingCompany.earliestEventDate = eventDate;
          }
          // Add event type to the company's eventTypes array
          const eventType = event.type || 'corporate';
          if (!existingCompany.eventTypes.includes(eventType)) {
            existingCompany.eventTypes.push(eventType);
          }
        } else {
          // Add new company
          monthInfo.companies.push({
            ticker,
            logo: '',
            earliestEventDate: eventDate,
            eventTypes: [event.type || 'corporate'],
          });
        }
      }
    });

    // Sort companies by earliest event date for each month
    data.forEach(monthInfo => {
      monthInfo.companies.sort((a, b) => a.earliestEventDate.getTime() - b.earliestEventDate.getTime());
    });

    return data;
  };

  // Group events by month for current year
  const monthData = useMemo(() => generateMonthDataForYear(selectedYear), [events, selectedYear]);

  const handleMonthClick = (monthIndex: number) => {
    if (expandedMonth === monthIndex) {
      setExpandedMonth(null);
    } else {
      setExpandedMonth(monthIndex);
    }
    onMonthClick?.(selectedYear, monthIndex);
  };

  const handlePrevYear = () => {
    if (isAnimating) return;
    handleSwipeYear(-1);
  };

  const handleNextYear = () => {
    if (isAnimating) return;
    handleSwipeYear(1);
  };

  // Filter events for expanded month
  const expandedMonthEvents = useMemo(() => {
    if (expandedMonth === null) return [];

    return events.filter(event => {
      if (!event.actualDateTime) return false;
      const eventDate = new Date(event.actualDateTime);
      return eventDate.getMonth() === expandedMonth && eventDate.getFullYear() === selectedYear;
    });
  }, [events, expandedMonth, selectedYear]);

  // Fetch company logos - use preloaded stocksData when available
  useEffect(() => {
    const fetchLogos = async () => {
      // Collect all unique tickers from all months
      const uniqueTickers = Array.from(
        new Set(monthData.flatMap(data => data.companies.map(company => company.ticker)))
      );

      if (uniqueTickers.length === 0) return;

      const logoMap = new Map<string, string>();
      const tickersToFetch: string[] = [];

      // First, use preloaded stocksData for logos
      uniqueTickers.forEach(ticker => {
        if (stocksData[ticker]?.logo) {
          logoMap.set(ticker, stocksData[ticker].logo);
        } else {
          tickersToFetch.push(ticker);
        }
      });

      // If we have all logos from preloaded data, set them immediately
      if (tickersToFetch.length === 0) {
        setCompaniesWithLogos(logoMap);
        return;
      }

      try {
        // Fetch remaining logos that weren't preloaded
        const fetchedStocksData = await StockAPI.getStocks(tickersToFetch);

        Object.entries(fetchedStocksData).forEach(([ticker, stockData]) => {
          if (stockData.logo) {
            logoMap.set(ticker, stockData.logo);
          }
        });

        setCompaniesWithLogos(logoMap);
      } catch (error) {
        console.error('Error fetching company logos:', error);
        // Still set the logos we got from preloaded data
        setCompaniesWithLogos(logoMap);
      }
    };

    fetchLogos();
  }, [monthData, stocksData]);

  // Render a full month button (for current/future quarters)
  const renderMonthButton = (data: MonthData, quarterHasEvents: boolean) => {
    const hasEvents = data.eventCount > 0;
    const displayCompanies = data.companies; // Show ALL companies
    const isExpanded = expandedMonth === data.month;

    return (
      <TouchableOpacity
        key={data.month}
        style={[
          styles.monthCell,
          { backgroundColor: themeColors.card, borderColor: themeColors.border },
          isExpanded && { borderColor: '#000000', borderWidth: 2 },
          !quarterHasEvents && styles.monthCellCompact,
        ]}
        onPress={() => handleMonthClick(data.month)}
        disabled={!hasEvents}
      >
        {/* Month Name */}
        <Text style={[styles.monthName, { color: themeColors.foreground }]}>
          {monthNames[data.month]}
        </Text>

        {/* Company Logos with Event Type Icons */}
        {hasEvents && quarterHasEvents && (
          <View style={styles.companiesContainer}>
            {displayCompanies.map((company, idx) => {
              const displayEventTypes = company.eventTypes.slice(0, 3);
              const logoUrl = companiesWithLogos.get(company.ticker);

              return (
                <View key={`${data.month}-${company.ticker}-${idx}`} style={styles.companyRow}>
                  {/* Company Logo or Ticker Badge */}
                  {logoUrl ? (
                    <ExpoImage
                      source={{ uri: logoUrl }}
                      style={styles.companyLogo}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View style={styles.tickerBadge}>
                      <Text style={styles.tickerText}>{company.ticker}</Text>
                    </View>
                  )}

                  {/* Event Type Icons */}
                  <View style={styles.eventIconsRow}>
                    {displayEventTypes.map((eventType, iconIdx) => (
                      <View key={`${company.ticker}-${eventType}-${iconIdx}`} style={styles.eventIconWrapper}>
                        <EventTypeIcon
                          eventType={eventType}
                          size={16}
                        />
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Render a compact month (for past quarters)
  const renderCompactMonth = (data: MonthData) => {
    const hasEvents = data.eventCount > 0;
    const isExpanded = expandedMonth === data.month;

    // Collect all event types from all companies
    const allEventTypes: string[] = [];
    data.companies.forEach(company => {
      company.eventTypes.forEach(eventType => {
        allEventTypes.push(eventType);
      });
    });

    const displayEventTypes = allEventTypes.slice(0, 10);

    return (
      <TouchableOpacity
        key={data.month}
        style={[
          styles.compactMonthCell,
          { backgroundColor: themeColors.card, borderColor: themeColors.border },
          isExpanded && { borderColor: '#000000', borderWidth: 2 },
        ]}
        onPress={() => handleMonthClick(data.month)}
        disabled={!hasEvents}
      >
        {/* Month Name */}
        <Text style={[styles.compactMonthName, { color: themeColors.foreground }]}>
          {monthNames[data.month]}
        </Text>

        {/* Event Type Icons */}
        {hasEvents && (
          <View style={styles.compactEventIcons}>
            {displayEventTypes.map((eventType, idx) => (
              <View key={`${data.month}-event-${idx}`} style={styles.compactEventDot}>
                <EventTypeIcon
                  eventType={eventType}
                  size={12}
                />
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Render a quarter section
  const renderQuarter = (quarterName: string, startMonth: number, endMonth: number, yearData: MonthData[]) => {
    const quarterMonths = yearData.slice(startMonth, endMonth);

    // Check if the quarter has any events
    const quarterHasEvents = quarterMonths.some(data => data.eventCount > 0);

    // Determine if this quarter should be collapsed (compact view)
    const isCurrentYear = yearData[0]?.year === currentYear;
    const isPastYear = yearData[0]?.year < currentYear;
    const quarterEndMonth = endMonth - 1;
    const isQuarterInPast = isCurrentYear && quarterEndMonth < currentMonth;

    // Use compact rendering for: past years OR past quarters in current year
    const useCompactView = isPastYear || isQuarterInPast;

    // Check if any month in this quarter is expanded
    const hasExpandedMonth = quarterMonths.some(data => expandedMonth === data.month);

    return (
      <View key={quarterName} style={styles.quarterSection}>
        <Text style={[styles.quarterLabel, { color: themeColors.mutedForeground }]}>
          {quarterName}
        </Text>
        <View style={styles.monthGrid}>
          {quarterMonths.map((data) => (
            <View key={data.month} style={styles.monthCellWrapper}>
              {useCompactView ? renderCompactMonth(data) : renderMonthButton(data, quarterHasEvents)}
            </View>
          ))}
        </View>

        {/* Expanded Timeline - Per-Ticker Horizontal Timelines */}
        {hasExpandedMonth && (
          <View style={styles.expandedTimelineWrapper}>
            {quarterMonths.map((data) => {
              if (expandedMonth !== data.month) return null;

              // Group events by ticker
              const eventsByTicker = new Map<string, typeof expandedMonthEvents>();
              expandedMonthEvents.forEach(event => {
                const ticker = event.ticker || 'N/A';
                if (!eventsByTicker.has(ticker)) {
                  eventsByTicker.set(ticker, []);
                }
                eventsByTicker.get(ticker)!.push(event);
              });

              // Sort tickers by earliest event date
              const sortedTickers = Array.from(eventsByTicker.entries()).sort((a, b) => {
                const earliestA = Math.min(...a[1].map(e => 
                  e.actualDateTime ? new Date(e.actualDateTime).getTime() : Infinity
                ));
                const earliestB = Math.min(...b[1].map(e => 
                  e.actualDateTime ? new Date(e.actualDateTime).getTime() : Infinity
                ));
                return earliestA - earliestB;
              });

              return (
                <View key={`timeline-${data.month}`}>
                  {/* Header with month name and close button */}
                  <View style={styles.timelineHeader}>
                    <Text style={[styles.timelineHeaderTitle, { color: themeColors.foreground }]}>
                      {new Date(selectedYear, data.month).toLocaleString('default', { month: 'long' })} {selectedYear}
                    </Text>
                    <TouchableOpacity
                      style={[styles.closeButton, { backgroundColor: themeColors.muted }]}
                      onPress={() => setExpandedMonth(null)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.closeButtonText, { color: themeColors.mutedForeground }]}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Vertical stack of horizontal timelines */}
                  <View style={styles.tickerTimelinesContainer}>
                    {sortedTickers.map(([ticker, tickerEvents]) => (
                      <TickerTimeline
                        key={ticker}
                        ticker={ticker}
                        logoUrl={companiesWithLogos.get(ticker)}
                        events={tickerEvents}
                        onEventClick={onEventClick}
                      />
                    ))}
                  </View>

                  {/* Empty state */}
                  {sortedTickers.length === 0 && (
                    <View style={styles.emptyState}>
                      <Text style={[styles.emptyText, { color: themeColors.mutedForeground }]}>
                        No events for this month
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
      {/* Year Navigation */}
      <View style={styles.yearNav}>
        <TouchableOpacity
          style={[styles.yearButton, { backgroundColor: themeColors.muted }]}
          onPress={handlePrevYear}
          disabled={isAnimating}
        >
          <Text style={[styles.yearButtonText, { color: themeColors.foreground }]}>‹</Text>
        </TouchableOpacity>

        <Text style={[styles.yearText, { color: themeColors.foreground }]}>
          {selectedYear}
        </Text>

        <TouchableOpacity
          style={[styles.yearButton, { backgroundColor: themeColors.muted }]}
          onPress={handleNextYear}
          disabled={isAnimating}
        >
          <Text style={[styles.yearButtonText, { color: themeColors.foreground }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Month Grid with Swipe Support - Carousel */}
      <View style={styles.swipeContainer} {...panResponder.panHandlers}>
        <Animated.View
          style={{
            flexDirection: 'row',
            width: SCREEN_WIDTH * 3,
            transform: [{ translateX: pan }],
          }}
        >
          {/* Previous Year */}
          <View key={`prev-${selectedYear}`} style={{ width: SCREEN_WIDTH }}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} scrollEnabled={false}>
              {renderYearGrid(selectedYear - 1)}
            </ScrollView>
          </View>

          {/* Current Year */}
          <View key={`current-${selectedYear}`} style={{ width: SCREEN_WIDTH }}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} scrollEnabled={!isAnimating}>
              {renderYearGrid(selectedYear)}
            </ScrollView>
          </View>

          {/* Next Year */}
          <View key={`next-${selectedYear}`} style={{ width: SCREEN_WIDTH }}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} scrollEnabled={false}>
              {renderYearGrid(selectedYear + 1)}
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 16,
    overflow: 'hidden',
  },
  yearNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  yearButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearButtonText: {
    fontSize: 20,
    fontWeight: '600',
  },
  yearText: {
    fontSize: 14,
    fontWeight: '500',
  },
  swipeContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  gridContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  quarterSection: {
    marginBottom: 16,
  },
  quarterLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 8,
  },
  monthGrid: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 25,
  },
  monthCellWrapper: {
    flex: 1,
    minWidth: 0,
    maxWidth: '31%',
  },
  monthCell: {
    minHeight: 120,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  monthCellCompact: {
    minHeight: 36,
  },
  monthName: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  companiesContainer: {
    flex: 1,
    width: '100%',
    gap: 6,
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  companyLogo: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  tickerBadge: {
    backgroundColor: '#000000',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    minWidth: 20,
    alignItems: 'center',
  },
  tickerText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '600',
  },
  eventIconsRow: {
    flexDirection: 'row',
    marginLeft: -4,
  },
  eventIconWrapper: {
    marginLeft: -4,
  },
  moreText: {
    fontSize: 8,
    marginTop: 4,
  },
  compactMonthCell: {
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactMonthName: {
    fontSize: 10,
    fontWeight: '500',
  },
  compactEventIcons: {
    flexDirection: 'row',
    marginLeft: -3,
  },
  compactEventDot: {
    marginLeft: -3,
  },
  expandedTimelineWrapper: {
    marginTop: 12,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingRight: 25,
  },
  timelineHeaderTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  tickerTimelinesContainer: {
    gap: 0,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
});
