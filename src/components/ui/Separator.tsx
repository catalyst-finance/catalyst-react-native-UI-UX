import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { colors } from '../../constants/design-tokens';
import { useTheme } from '../../contexts/ThemeContext';

interface SeparatorProps extends ViewProps {
  orientation?: 'horizontal' | 'vertical';
}

export const Separator: React.FC<SeparatorProps> = ({
  orientation = 'horizontal',
  style,
  ...props
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  return (
    <View
      style={[
        styles.separator,
        { backgroundColor: themeColors.border },
        orientation === 'horizontal' ? styles.horizontal : styles.vertical,
        style,
      ]}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  separator: {},
  horizontal: {
    height: 1,
    width: '100%',
  },
  vertical: {
    width: 1,
    height: '100%',
  },
});
