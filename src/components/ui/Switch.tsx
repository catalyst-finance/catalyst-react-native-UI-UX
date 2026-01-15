import React from 'react';
import { Switch as RNSwitch, View, StyleSheet, ViewProps } from 'react-native';
import { colors } from '../../constants/design-tokens';
import { useTheme } from '../../contexts/ThemeContext';

interface SwitchProps extends ViewProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({
  value,
  onValueChange,
  disabled = false,
  style,
  ...props
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  return (
    <View style={[styles.container, style]} {...props}>
      <RNSwitch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: themeColors.switchBackground, true: themeColors.primary }}
        thumbColor="#ffffff"
        ios_backgroundColor={themeColors.switchBackground}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
  },
});
