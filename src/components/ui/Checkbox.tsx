import React from 'react';
import { Pressable, View, StyleSheet, PressableProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/design-tokens';
import { useTheme } from '../../contexts/ThemeContext';

interface CheckboxProps extends Omit<PressableProps, 'onPress'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onCheckedChange,
  disabled = false,
  style,
  ...props
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  return (
    <Pressable
      style={[
        styles.checkbox,
        {
          borderColor: checked ? themeColors.primary : themeColors.border,
          backgroundColor: checked ? themeColors.primary : 'transparent',
        },
        disabled && styles.disabled,
        style,
      ]}
      onPress={() => !disabled && onCheckedChange(!checked)}
      disabled={disabled}
      {...props}
    >
      {checked && (
        <Ionicons name="checkmark" size={16} color={themeColors.primaryForeground} />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});
