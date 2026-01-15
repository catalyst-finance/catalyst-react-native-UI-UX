import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../constants/design-tokens';
import { useTheme } from '../../contexts/ThemeContext';

interface ProgressProps {
  value: number; // 0-100
  style?: ViewStyle;
  color?: string;
  backgroundColor?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  style,
  color,
  backgroundColor,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  const clampedValue = Math.max(0, Math.min(100, value));

  const fillColor = color || themeColors.primary;
  const bgColor = backgroundColor || themeColors.muted;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }, style]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clampedValue}%`,
            backgroundColor: fillColor,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});