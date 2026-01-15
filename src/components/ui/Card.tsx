import React from 'react';
import { View, Text, ViewProps, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { typography, colors, borderRadius, spacing } from '../../constants/design-tokens';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, style, ...props }) => {
  const { isDark } = useTheme();
  return (
    <View style={[
      styles.card,
      {
        backgroundColor: isDark ? colors.dark.card : colors.light.card,
        borderColor: isDark ? colors.dark.border : colors.light.border,
      },
      style
    ]} {...props}>
      {children}
    </View>
  );
};

export const CardHeader: React.FC<CardProps> = ({ children, style, ...props }) => {
  return (
    <View style={[styles.header, style]} {...props}>
      {children}
    </View>
  );
};

export const CardTitle: React.FC<TextProps> = ({ 
  children, 
  style,
  ...props 
}) => {
  const { isDark } = useTheme();
  return (
    <Text style={[
      styles.title,
      { color: isDark ? colors.dark.cardForeground : colors.light.cardForeground },
      style
    ]} {...props}>
      {children}
    </Text>
  );
};

export const CardDescription: React.FC<TextProps> = ({ 
  children, 
  style,
  ...props 
}) => {
  const { isDark } = useTheme();
  return (
    <Text style={[
      styles.description,
      { color: isDark ? colors.dark.mutedForeground : colors.light.mutedForeground },
      style
    ]} {...props}>
      {children}
    </Text>
  );
};

export const CardContent: React.FC<CardProps> = ({ children, style, ...props }) => {
  return (
    <View style={[styles.content, style]} {...props}>
      {children}
    </View>
  );
};

export const CardFooter: React.FC<CardProps> = ({ children, style, ...props }) => {
  return (
    <View style={[styles.footer, style]} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  header: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[6],
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.semibold,
    fontFamily: typography.fontFamily.medium,
  },
  description: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.sans,
  },
  content: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[6],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[6],
  },
});
