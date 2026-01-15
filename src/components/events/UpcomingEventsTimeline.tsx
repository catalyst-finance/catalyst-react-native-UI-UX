/**
 * UpcomingEventsTimeline Component
 * 
 * Full-featured events timeline with hierarchical organization:
 * - Quarters (collapsible)
 * - Months (with event count badges)
 * - Events (horizontal scrolling cards with timeline dots)
 * 
 * Matches web app's upcoming-events-timeline.tsx
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../constants/design-tokens';
import EventsAPI, { MarketEvent } from '../../services/supabase/EventsAPI';
import { getEventTypeHexColor, getEventTypeLabel } from '../../utils/event-formatting';
import { formatEventDateTime } from '../../utils/formatting';
import { getEventIcon } from '../../utils/event-icons';

const EVENT_CARD_WIDTH = 280;

interface UpcomingEventsTimelineProps {
  ticker?: string;
  events?: MarketEvent[];
  onEventClick?: (event: MarketEvent) => void;
  showPastUpcomingToggle?: boolean;
  maxEvents?: number;
}

interface MonthGroup {
  month: string;
  monthIndex: number;
  year: number;
  displayName: string;
  events: MarketEvent[];
}

interface QuarterGroup {
  quarter: string;
  year: number;
  displayName: string;
  months: MonthGroup[];
  isCurrentQuarter: boolean;
  quarterKey: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const UpcomingEventsTimeline: React.FC<UpcomingEventsTimelineProps> = ({
  ticker,
  events: propEvents,
  onEventClick,
  showPastUpcomingToggle = true,
  maxEvents,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [expandedQuarters, setExpandedQuarters] = useState<Set<string>>(new Set());
  
  // Pulsing animation for next upcoming event
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.4)).current;

  // Load events
  useEffect(() => {
    const loadEvents = async () => {
      if (propEvents) {
        setEvents(propEvents);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        let fetchedEvents: MarketEvent[];
        if (ticker) {
          fetchedEvents = await EventsAPI.getEventsByTicker(ticker);
        } else if (showPastEvents) {
          fetchedEvents = await EventsAPI.getRecentEvents(maxEvents);
        } else {
          fetchedEvents = await EventsAPI.getUpcomingEvents(maxEvents);
        }
        setEvents(fetchedEvents);
      } catch (error) {
        console.error('Error loading events:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [ticker, propEvents, showPastEvents, maxEvents]);

  // Pulsing animation - echo/ripple effect
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.parallel([
        Animated.timing(pulseAnim, {
          toValue: 1.5,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim, pulseOpacity]);

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    const now = new Date();
    
    if (showPastEvents) {
      return events
        .filter(e => e.actualDateTime && new Date(e.actualDateTime) <= now)
        .sort((a, b) => {
          const dateA = new Date(a.actualDateTime || 0);
          const dateB = new Date(b.actualDateTime || 0);
          return dateB.getTime() - dateA.getTime(); // Most recent first
        });
    } else {
      return events
        .filter(e => e.actualDateTime && new Date(e.actualDateTime) > now)
        .sort((a, b) => {
          const dateA = new Date(a.actualDateTime || 0);
          const dateB = new Date(b.actualDateTime || 0);
          return dateA.getTime() - dateB.getTime(); // Soonest first
        });
    }
  }, [events, showPastEvents]);

  // Find next upcoming event (for pulsing dot)
  const nextUpcomingEvent = useMemo(() => {
    if (showPastEvents) return null;
    return filteredEvents[0] || null;
  }, [filteredEvents, showPastEvents]);

  // Group events by quarter and month
  const quarterGroups = useMemo(() => {
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
    const currentYear = now.getFullYear();

    const groups: Map<string, QuarterGroup> = new Map();

    filteredEvents.forEach(event => {
      if (!event.actualDateTime) return;
      
      const date = new Date(event.actualDateTime);
      const year = date.getFullYear();
      const month = date.getMonth();
      const quarter = Math.floor(month / 3) + 1;
      const quarterKey = `Q${quarter}-${year}`;
      
      if (!groups.has(quarterKey)) {
        const isCurrentQuarter = quarter === currentQuarter && year === currentYear;
        groups.set(quarterKey, {
          quarter: `Q${quarter}`,
          year,
          displayName: isCurrentQuarter ? `Current Quarter - Q${quarter} ${year}` : `Q${quarter} ${year}`,
          months: [],
          isCurrentQuarter,
          quarterKey,
        });
      }

      const quarterGroup = groups.get(quarterKey)!;
      let monthGroup = quarterGroup.months.find(m => m.monthIndex === month && m.year === year);
      
      if (!monthGroup) {
        monthGroup = {
          month: MONTH_NAMES[month],
          monthIndex: month,
          year,
          displayName: `${MONTH_NAMES[month]} ${year}`,
          events: [],
        };
        quarterGroup.months.push(monthGroup);
      }
      
      monthGroup.events.push(event);
    });

    // Sort months within each quarter
    groups.forEach(group => {
      group.months.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.monthIndex - b.monthIndex;
      });
    });

    // Convert to array and sort
    const sortedGroups = Array.from(groups.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return parseInt(a.quarter.slice(1)) - parseInt(b.quarter.slice(1));
    });

    return sortedGroups;
  }, [filteredEvents]);

  // Auto-expand current and next quarter
  useEffect(() => {
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
    const currentYear = now.getFullYear();
    
    const currentQuarterKey = `Q${currentQuarter}-${currentYear}`;
    const nextQuarter = currentQuarter === 4 ? 1 : currentQuarter + 1;
    const nextYear = currentQuarter === 4 ? currentYear + 1 : currentYear;
    const nextQuarterKey = `Q${nextQuarter}-${nextYear}`;

    setExpandedQuarters(new Set([currentQuarterKey, nextQuarterKey]));
  }, []);

  const toggleQuarter = useCallback((quarterKey: string) => {
    setExpandedQuarters(prev => {
      const next = new Set(prev);
      if (next.has(quarterKey)) {
        next.delete(quarterKey);
      } else {
        next.add(quarterKey);
      }
      return next;
    });
  }, []);

  // Render event card
  const renderEventCard = (event: MarketEvent, isNextUpcoming: boolean) => {
    const eventColor = getEventTypeHexColor(event.type);
    const eventLabel = getEventTypeLabel(event.type);
    
    return (
      <View key={event.id} style={styles.eventCardWrapper}>
        {/* Timeline dot - positioned at top, centered */}
        <View style={styles.dotContainer}>
          {/* Background circle to block timeline */}
          <View style={[
            styles.dotBackground,
            { backgroundColor: isDark ? colors.dark.background : colors.light.background }
          ]} />
          
          {isNextUpcoming && (
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  backgroundColor: eventColor,
                  transform: [{ scale: pulseAnim }],
                  opacity: pulseOpacity,
                },
              ]}
            />
          )}
          <View style={[styles.eventDot, { backgroundColor: eventColor }]}>
            <Ionicons 
              name={getEventIcon(event.type)} 
              size={12} 
              color="#FFFFFF" 
            />
          </View>
        </View>

        {/* Card below the dot */}
        <TouchableOpacity
          style={[
            styles.eventCard,
            { backgroundColor: isDark ? 'rgba(39, 39, 42, 0.8)' : '#FFFFFF' },
          ]}
          onPress={() => onEventClick?.(event)}
          activeOpacity={0.7}
        >
          {/* Card content */}
          <View style={styles.cardContent}>
            {/* Header: Ticker + Type */}
            <View style={styles.cardHeader}>
              <View style={styles.tickerBadge}>
                <Text style={styles.tickerText}>{event.ticker}</Text>
              </View>
              <View style={[styles.typeBadge, { backgroundColor: eventColor }]}>
                <Text style={styles.typeText}>{eventLabel}</Text>
              </View>
            </View>

            {/* Title */}
            <Text 
              style={[styles.eventTitle, { color: themeColors.foreground }]} 
              numberOfLines={2}
            >
              {event.title}
            </Text>

            {/* Date */}
            <Text style={[styles.eventDate, { color: themeColors.mutedForeground }]}>
              {formatEventDateTime(event.actualDateTime)}
            </Text>

            {/* Impact Rating */}
            {event.impactRating !== 0 && (
              <View style={[
                styles.impactBadge,
                { backgroundColor: event.impactRating > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)' }
              ]}>
                <Text style={[
                  styles.impactText,
                  { color: event.impactRating > 0 ? colors.light.positive : colors.light.negative }
                ]}>
                  {event.impactRating > 0 ? '▲ Bullish' : '▼ Bearish'} {Math.abs(event.impactRating)}
                </Text>
              </View>
            )}

            {/* AI Insight preview */}
            {event.aiInsight && (
              <Text 
                style={[styles.insightPreview, { color: themeColors.mutedForeground }]}
                numberOfLines={2}
              >
                {event.aiInsight.match(/^[^.!?]+[.!?]/)?.[0] || event.aiInsight.slice(0, 100)}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={themeColors.primary} />
        <Text style={[styles.loadingText, { color: themeColors.mutedForeground }]}>
          Loading events...
        </Text>
      </View>
    );
  }

  if (filteredEvents.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="calendar-outline" size={32} color={themeColors.mutedForeground} />
        <Text style={[styles.emptyText, { color: themeColors.mutedForeground }]}>
          {showPastEvents ? 'No past events' : 'No upcoming events'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Past/Upcoming Toggle */}
      {showPastUpcomingToggle && (
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              { borderColor: themeColors.border },
              showPastEvents && {
                backgroundColor: isDark ? '#FFFFFF' : '#000000',
              },
            ]}
            onPress={() => setShowPastEvents(true)}
          >
            <Text style={[
              styles.toggleText,
              { color: showPastEvents ? (isDark ? '#000000' : '#FFFFFF') : themeColors.mutedForeground }
            ]}>
              Past
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              { borderColor: themeColors.border },
              !showPastEvents && {
                backgroundColor: isDark ? '#FFFFFF' : '#000000',
              },
            ]}
            onPress={() => setShowPastEvents(false)}
          >
            <Text style={[
              styles.toggleText,
              { color: !showPastEvents ? (isDark ? '#000000' : '#FFFFFF') : themeColors.mutedForeground }
            ]}>
              Upcoming
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quarter Groups */}
      {quarterGroups.map(quarterGroup => (
        <View key={quarterGroup.quarterKey} style={styles.quarterContainer}>
          {/* Quarter Header */}
          <TouchableOpacity
            style={styles.quarterHeader}
            onPress={() => toggleQuarter(quarterGroup.quarterKey)}
          >
            <Text style={[styles.quarterTitle, { color: themeColors.foreground }]}>
              {quarterGroup.displayName}
            </Text>
            <Ionicons
              name={expandedQuarters.has(quarterGroup.quarterKey) ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={themeColors.mutedForeground}
              style={styles.quarterChevron}
            />
          </TouchableOpacity>

          {/* Expanded Content */}
          {expandedQuarters.has(quarterGroup.quarterKey) && (
            <View style={styles.quarterContent}>
              {/* Single Timeline Container for entire quarter */}
              <View style={styles.timelineContainer}>
                {/* Timeline line */}
                <View style={[styles.timelineLine, { backgroundColor: themeColors.border }]} />

                {/* Events horizontal scroll with month labels */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.eventsScrollContent}
                  snapToInterval={EVENT_CARD_WIDTH + 12}
                  decelerationRate="fast"
                >
                  {quarterGroup.months.map((monthGroup) => (
                    <View key={`month-${monthGroup.monthIndex}-${monthGroup.year}`} style={styles.monthSection}>
                      {/* Month Label above events */}
                      <View style={styles.monthLabelContainer}>
                        <View style={styles.monthHeader}>
                          <Text style={[styles.monthName, { color: themeColors.foreground }]}>
                            {monthGroup.month} {monthGroup.year}
                          </Text>
                          <View style={[styles.eventCountBadge, { backgroundColor: themeColors.muted }]}>
                            <Text style={[styles.eventCountText, { color: themeColors.mutedForeground }]}>
                              {monthGroup.events.length} event{monthGroup.events.length !== 1 ? 's' : ''}
                            </Text>
                          </View>
                        </View>
                      </View>
                      
                      {/* Events for this month in a row */}
                      <View style={styles.monthEventsRow}>
                        {monthGroup.events.map(event => 
                          renderEventCard(event, event.id === nextUpcomingEvent?.id)
                        )}
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  quarterContainer: {
    marginBottom: 16,
  },
  quarterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingLeft: 4,
    paddingRight: 64,
  },
  quarterTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  quarterChevron: {
    marginLeft: 'auto',
  },
  quarterContent: {
    marginTop: 8,
  },
  monthSection: {
    // Container for month label + events
  },
  monthLabelContainer: {
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  monthEventsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  monthName: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  eventCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  eventCountText: {
    fontSize: 12,
  },
  timelineContainer: {
    position: 'relative',
    paddingTop: 0,
  },
  timelineLine: {
    height: 1,
    marginBottom: 0,
    position: 'absolute',
    top: 52, // Aligned with dot center
    left: 0,
    right: 0,
    zIndex: 0,
  },
  eventsScrollContent: {
    paddingHorizontal: 4,
    paddingTop: 0,
    paddingBottom: 16,
    flexDirection: 'row',
    gap: 0,
  },
  eventCardWrapper: {
    alignItems: 'center',
    position: 'relative',
    paddingTop: 24, // Space for the dot + pulse overflow (24px to center on line)
    zIndex: 2, // Above timeline line
  },
  eventCard: {
    width: EVENT_CARD_WIDTH,
    borderRadius: 12,
    padding: 12,
    marginTop: 24, // More space between dot and card
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dotContainer: {
    position: 'absolute',
    top: 8, // Position 8px from top of wrapper (centers at 24px line position)
    alignSelf: 'center',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  dotBackground: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    zIndex: 1,
    opacity: 1,
  },
  pulseRing: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  eventDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 1,
    zIndex: 2,
  },
  cardContent: {
    // Content inside the card
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tickerBadge: {
    backgroundColor: '#000000',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tickerText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 12,
    marginBottom: 8,
  },
  impactBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  impactText: {
    fontSize: 11,
    fontWeight: '500',
  },
  insightPreview: {
    fontSize: 12,
    lineHeight: 16,
  },
});

export default UpcomingEventsTimeline;
