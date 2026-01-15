import React from 'react';
import { Pressable, Text, StyleSheet, PressableProps } from 'react-native';
import { typography, colors, borderRadius, spacing } from '../../constants/design-tokens';
import { useTheme } from '../../contexts/ThemeContext';

interface ButtonProps extends PressableProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  size = 'default',
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
      case 'secondary':
        return {
          backgroundColor: themeColors.secondary,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
        };
      case 'link':
        return {
          backgroundColor: 'transparent',
        };
      default:
        return {};
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'default':
        return themeColors.primaryForeground;
      case 'destructive':
        return themeColors.destructiveForeground;
      case 'outline':
      case 'ghost':
      case 'link':
        return themeColors.foreground;
      case 'secondary':
        return themeColors.secondaryForeground;
      default:
        return themeColors.foreground;
    }
  };

  return (
    <Pressable 
      style={({ pressed }) => {
        const baseStyles = [
          styles.base,
          getVariantStyle(),
          styles[size],
          pressed && { opacity: 0.7 },
        ];
        
        if (typeof style === 'function') {
          return [...baseStyles, style({ pressed })];
        }
        
        return [...baseStyles, style];
      }}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text style={[styles.text, { color: getTextColor() }, variant === 'link' && styles.linkText]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  text: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    fontFamily: typography.fontFamily.medium,
  },
  linkText: {
    textDecorationLine: 'underline',
  },
  // Sizes
  default: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  sm: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
  },
  lg: {
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[3],
  },
  icon: {
    width: 40,
    height: 40,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
});
