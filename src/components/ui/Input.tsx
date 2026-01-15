import React from 'react';
import { TextInput, TextInputProps, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { colors, borderRadius, spacing, typography } from '../../constants/design-tokens';

interface InputProps extends TextInputProps {}

export const Input: React.FC<InputProps> = ({ style, ...props }) => {
  const { isDark } = useTheme();
  
  return (
    <TextInput
      style={[
        styles.input,
        {
          backgroundColor: isDark ? colors.dark.inputBackground : colors.light.inputBackground,
          borderColor: isDark ? colors.dark.border : colors.light.border,
          color: isDark ? colors.dark.foreground : colors.light.foreground,
        },
        style
      ]}
      placeholderTextColor={isDark ? colors.dark.mutedForeground : colors.light.mutedForeground}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    height: 40,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.sans,
  },
});
