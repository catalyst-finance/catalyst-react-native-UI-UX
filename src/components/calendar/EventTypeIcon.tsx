/**
 * EventTypeIcon Component
 * 
 * Renders colored icon dots for different event types.
 * Used in calendar month cells to indicate event types.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { getEventTypeHexColor } from '../../utils/event-formatting';
import type { EventTypeIconProps } from './types';

export const EventTypeIcon: React.FC<EventTypeIconProps> = ({
  eventType,
  size = 16,
}) => {
  const backgroundColor = getEventTypeHexColor(eventType);

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
    />
  );
};

const styles = StyleSheet.create({
  icon: {
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
});
