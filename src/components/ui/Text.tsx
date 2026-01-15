import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { typography, colors } from '../../constants/design-tokens';

interface TextProps extends RNTextProps {
  children: React.ReactNode;
  variant?: 'default' | 'muted' | 'primary' | 'secondary' | 'destructive';
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
}

export const Text: React.FC<TextProps> = ({
  variant = 'default',
  size = 'base',
  weight = 'normal',
  style,
  children,
  ...props
}) => {
  const { isDark } = useTheme();
  
  const getColor = () => {
    const colorMap = isDark ? colors.dark : colors.light;
    switch (variant) {
      case 'muted': return colorMap.mutedForeground;
      case 'primary': return colorMap.primary;
      case 'secondary': return colorMap.secondaryForeground;
      case 'destructive': return colorMap.destructive;
      default: return colorMap.foreground;
    }
  };
  
  return (
    <RNText
      style={[
        styles.base,
        { color: getColor() },
        size && styles[size],
        weight && styles[weight],
        style
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
};

const styles = StyleSheet.create({
  base: {
    fontFamily: typography.fontFamily.sans,
  },
  xs: { fontSize: typography.fontSize.xs },
  sm: { fontSize: typography.fontSize.sm },
  base: { fontSize: typography.fontSize.base },
  lg: { fontSize: typography.fontSize.lg },
  xl: { fontSize: typography.fontSize.xl },
  '2xl': { fontSize: typography.fontSize['2xl'] },
  '3xl': { fontSize: typography.fontSize['3xl'] },
  normal: { fontWeight: typography.fontWeight.normal },
  medium: { fontWeight: typography.fontWeight.medium, fontFamily: typography.fontFamily.medium },
  semibold: { fontWeight: typography.fontWeight.semibold, fontFamily: typography.fontFamily.medium },
  bold: { fontWeight: typography.fontWeight.bold, fontFamily: typography.fontFamily.bold },
});
