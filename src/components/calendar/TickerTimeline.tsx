/**
 * TickerTimeline Component
 * 
 * Horizontal timeline for a single ticker showing events for a specific month.
 * Matches the design from UpcomingEventsTimeline on the stock detail page.
 */

import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../constants/design-tokens';
import { getEventTypeHexColor, getEventTypeLabel } from '../../utils/event-formatting';
import { formatEventDateTime } from '../../utils/formatting';
import { getEventIcon } from '../../utils/event-icons';
import type { MarketEvent } from '../../services/supabase/EventsAPI';

const EVENT_CARD_WIDTH = 280;

interface TickerTimelineProps {
  ticker: string;
  logoUrl?: string;
  events: MarketEvent[];
  onEventClick?: (event: MarketEvent) => void;
}

export const TickerTimeline: React.FC<TickerTimelineProps> = ({
  ticker,
  logoUrl,
  events,
  onEventClick,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  const scrollViewRef = useRef<ScrollView>(null);

  // Pulsing animation for next upcoming event
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.4)).current;

  // Sort events by date
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const dateA = a.actualDateTime ? new Date(a.actualDateTime).getTime() : 0;
      const dateB = b.actualDateTime ? new Date(b.actualDateTime).getTime() : 0;
      return dateA - dateB;
    });
  }, [events]);

  // Find next upcoming event (for pulsing animation)
  const nextUpcomingEvent = useMemo(() => {
    const now = new Date().getTime();
    return sortedEvents.find(event => {
      const eventDate = event.actualDateTime ? new Date(event.actualDateTime).getTime() : 0;
      return eventDate > now;
    });
  }, [sortedEvents]);

  // Pulsing animation effect
  useEffect(() => {
    if (nextUpcomingEvent) {
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
    }
  }, [nextUpcomingEvent, pulseAnim, pulseOpacity]);

  // Render event card
  const renderEventCard = (event: MarketEvent, isNextUpcoming: boolean) => {
    const eventColor = getEventTypeHexColor(event.type);
    const eventLabel = getEventTypeLabel(event.type);

    return (
      <View key={event.id} style={styles.eventCardWrapper}>
        {/* Timeline dot - positioned at top, centered */}
        <View style={styles.dotContainer}>
          {/* Background circle to block timeline */}
          <View
            style={[
              styles.dotBackground,
              { backgroundColor: isDark ? colors.dark.background : colors.light.background },
            ]}
          />

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
            <Ionicons name={getEventIcon(event.type)} size={12} color="#FFFFFF" />
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
            {/* Header: Type badge */}
            <View style={styles.cardHeader}>
              <View style={[styles.typeBadge, { backgroundColor: eventColor }]}>
                <Text style={styles.typeText}>{eventLabel}</Text>
              </View>
            </View>

            {/* Title */}
            <Text style={[styles.eventTitle, { color: themeColors.foreground }]} numberOfLines={2}>
              {event.title}
            </Text>

            {/* Date */}
            <Text style={[styles.eventDate, { color: themeColors.mutedForeground }]}>
              {formatEventDateTime(event.actualDateTime)}
            </Text>

            {/* Impact Rating */}
            {event.impactRating !== 0 && (
              <View
                style={[
                  styles.impactBadge,
                  {
                    backgroundColor:
                      event.impactRating > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.impactText,
                    {
                      color:
                        event.impactRating > 0 ? colors.light.positive : colors.light.negative,
                    },
                  ]}
                >
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

  return (
    <View style={styles.container}>
      {/* Timeline Container with Logo Inside ScrollView */}
      <View style={styles.timelineWrapper}>
        {/* Timeline line */}
        <View style={[styles.timelineLine, { backgroundColor: themeColors.border }]} />

        {/* Events horizontal scroll with logo */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.eventsScrollContent}
          snapToInterval={EVENT_CARD_WIDTH + 12}
          decelerationRate="fast"
          nestedScrollEnabled={true}
          onScrollBeginDrag={(e) => {
            // Disable parent scroll when horizontal scrolling starts
            e.stopPropagation();
          }}
        >
          {/* Ticker Logo/Badge - First item in scroll */}
          <View style={styles.tickerContainer}>
            {logoUrl ? (
              <ExpoImage
                source={{ uri: logoUrl }}
                style={styles.tickerLogo}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={[styles.tickerBadge, { backgroundColor: themeColors.muted }]}>
                <Text style={[styles.tickerText, { color: themeColors.mutedForeground }]}>
                  {ticker}
                </Text>
              </View>
            )}
          </View>

          {/* Event Cards */}
          {sortedEvents.map((event) =>
            renderEventCard(event, event.id === nextUpcomingEvent?.id)
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  timelineWrapper: {
    position: 'relative',
  },
  timelineLine: {
    height: 1,
    position: 'absolute',
    top: 20, // Aligned with dot center (24 padding - 4 to center with 24px dot)
    left: 0,
    right: 0,
    zIndex: 0,
  },
  eventsScrollContent: {
    paddingHorizontal: 4,
    paddingTop: 0,
    paddingBottom: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  tickerContainer: {
    width: 48,
    height: 48,
    marginRight: 12,
    marginTop: 84, // Align with center of event card (24 + 24 + 24 + 12 = 84)
    flexShrink: 0, // Prevent shrinking
  },
  tickerLogo: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  tickerBadge: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  eventCardWrapper: {
    alignItems: 'center',
    position: 'relative',
    paddingTop: 24, // Space for the dot + pulse overflow
    zIndex: 2,
  },
  eventCard: {
    width: EVENT_CARD_WIDTH,
    borderRadius: 12,
    padding: 12,
    marginTop: 24, // Space between dot and card
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dotContainer: {
    position: 'absolute',
    top: 8,
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
    marginBottom: 8,
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
