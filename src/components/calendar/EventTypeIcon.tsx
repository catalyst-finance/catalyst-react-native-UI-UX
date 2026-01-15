/**
 * EventTypeIcon Component
 * 
 * Renders colored icon dots with event type icons inside.
 * Used in calendar month cells to indicate event types.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getEventTypeHexColor } from '../../utils/event-formatting';
import { getEventIcon } from '../../utils/event-icons';
import type { EventTypeIconProps } from './types';

export const EventTypeIcon: React.FC<EventTypeIconProps> = ({
  eventType,
  size = 16,
}) => {
  const backgroundColor = getEventTypeHexColor(eventType);
  const iconName = getEventIcon(eventType);
  const iconSize = size * 0.6; // Icon is 60% of dot size

  return (
    <View
      style={[
        styles.icon,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
      ]}
    >
      <Ionicons
        name={iconName}
        size={iconSize}
        color="#FFFFFF"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  icon: {
    borderWidth: 1,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
