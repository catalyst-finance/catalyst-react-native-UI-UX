/**
 * EventCard Component
 * 
 * Displays individual event details in the expanded timeline.
 * Shows ticker badge, event title, and date/time badge.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../constants/design-tokens';
import type { EventCardProps } from './types';

export const EventCard: React.FC<EventCardProps> = ({
  event,
  isToday,
  onPress,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  // Format date for display
  const formatEventDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  // Format time in user's timezone
  const formatEventTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const ticker = event.symbol || event.ticker || 'N/A';
  const title = event.title || `${ticker} Event`;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: isDark
            ? 'rgba(39, 39, 42, 0.5)'
            : 'rgba(249, 250, 251, 1)',
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Date/Time Badge - Top Right Corner */}
      <View style={[styles.dateBadge, { backgroundColor: themeColors.muted }]}>
        <Text style={[styles.dateText, { color: themeColors.mutedForeground }]}>
          {isToday ? formatEventTime(event.actualDateTime) : formatEventDate(event.actualDateTime)}
        </Text>
      </View>

      {/* Ticker Badge */}
      <View style={styles.tickerBadge}>
        <Text style={styles.tickerText}>{ticker}</Text>
      </View>

      {/* Event Title */}
      <Text style={[styles.title, { color: themeColors.foreground }]} numberOfLines={2}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    padding: 12,
    position: 'relative',
  },
  dateBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  dateText: {
    fontSize: 10,
    fontWeight: '500',
  },
  tickerBadge: {
    backgroundColor: '#000000',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  tickerText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  title: {
    fontSize: 13,
    lineHeight: 18,
    paddingRight: 60,
  },
});
