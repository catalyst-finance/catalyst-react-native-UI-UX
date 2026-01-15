/**
 * ExpandedTimeline Component
 * 
 * Displays a vertical timeline of events for an expanded month.
 * Shows event cards with timeline dots and pulsing animation for next upcoming event.
 */

import React, { useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../constants/design-tokens';
import { EventCard } from './EventCard';
import { EventTypeIcon } from './EventTypeIcon';
import type { ExpandedTimelineProps } from './types';

export const ExpandedTimeline: React.FC<ExpandedTimelineProps> = ({
  monthIndex,
  year,
  events,
  onClose,
  onEventClick,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  const fullMonthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  // Sort events by date
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const dateA = a.actualDateTime ? new Date(a.actualDateTime).getTime() : 0;
      const dateB = b.actualDateTime ? new Date(b.actualDateTime).getTime() : 0;
      return dateA - dateB;
    });
  }, [events]);

  // Check if event is today
  const isEventToday = (dateStr: string | null | undefined) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    return date >= todayStart && date <= todayEnd;
  };

  // Find next upcoming event index
  const nextUpcomingIndex = useMemo(() => {
    const currentTime = new Date().getTime();
    return sortedEvents.findIndex((event) => {
      const eventDate = event.actualDateTime ? new Date(event.actualDateTime) : null;
      return eventDate ? eventDate.getTime() > currentTime : false;
    });
  }, [sortedEvents]);

  // Pulsing animation for next upcoming event
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (nextUpcomingIndex !== -1) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => pulse.stop();
    }
  }, [nextUpcomingIndex, pulseAnim]);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: themeColors.foreground }]}>
          {fullMonthNames[monthIndex]} {year}
        </Text>
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: themeColors.muted }]}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={[styles.closeButtonText, { color: themeColors.mutedForeground }]}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Timeline */}
      <View style={styles.timelineContainer}>
        {/* Vertical Timeline Line */}
        <View style={[styles.timelineLine, { backgroundColor: themeColors.border }]} />

        {/* Event Cards */}
        <View style={styles.eventsContainer}>
          {sortedEvents.map((event, eventIndex) => {
            const eventType = event.type || 'corporate';
            const isToday = isEventToday(event.actualDateTime);
            const isNextUpcoming = eventIndex === nextUpcomingIndex;

            return (
              <View key={event.id} style={styles.eventRow}>
                {/* Timeline Dot */}
                <View style={styles.dotContainer}>
                  {isNextUpcoming ? (
                    <Animated.View
                      style={[
                        styles.dot,
                        {
                          transform: [{ scale: pulseAnim }],
                        },
                      ]}
                    >
                      <EventTypeIcon eventType={eventType} size={20} />
                    </Animated.View>
                  ) : (
                    <View style={styles.dot}>
                      <EventTypeIcon eventType={eventType} size={20} />
                    </View>
                  )}
                </View>

                {/* Event Card */}
                <View style={styles.cardWrapper}>
                  <EventCard
                    event={event}
                    isToday={isToday}
                    isNextUpcoming={isNextUpcoming}
                    onPress={() => onEventClick?.(event)}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Empty State */}
      {sortedEvents.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: themeColors.mutedForeground }]}>
            No events for this month
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  timelineContainer: {
    position: 'relative',
    paddingLeft: 32,
    paddingRight: 16,
  },
  timelineLine: {
    position: 'absolute',
    left: 12,
    top: 0,
    bottom: 0,
    width: 1,
  },
  eventsContainer: {
    gap: 12,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dotContainer: {
    position: 'absolute',
    left: -30,
    top: 12,
    zIndex: 10,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrapper: {
    flex: 1,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
});
