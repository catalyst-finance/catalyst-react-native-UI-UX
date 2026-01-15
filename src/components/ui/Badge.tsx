import React from 'react';
import { View, Text, ViewProps, StyleSheet } from 'react-native';
import { typography, colors, borderRadius, spacing } from '../../constants/design-tokens';
import { useTheme } from '../../contexts/ThemeContext';

interface BadgeProps extends ViewProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  style,
  ...props
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  const getVariantStyle = () => {
    switch (variant) {
      case 'default':
        return {
          backgroundColor: themeColors.primary,
        };
      case 'secondary':
        return {
          backgroundColor: themeColors.secondary,
        };
      case 'destructive':
        return {
          backgroundColor: themeColors.destructive,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: themeColors.border,
        };
      case 'success':
        return {
          backgroundColor: themeColors.positive,
        };
      case 'warning':
        return {
          backgroundColor: themeColors.warning,
        };
      default:
        return {};
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'default':
        return themeColors.primaryForeground;
      case 'secondary':
        return themeColors.secondaryForeground;
      case 'destructive':
        return themeColors.destructiveForeground;
      case 'outline':
        return themeColors.foreground;
      case 'success':
      case 'warning':
        return '#ffffff';
      default:
        return themeColors.foreground;
    }
  };

  return (
    <View style={[styles.base, getVariantStyle(), style]} {...props}>
      {typeof children === 'string' ? (
        <Text style={[styles.text, { color: getTextColor() }]}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1],
  },
  text: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamily.medium,
  },
});
