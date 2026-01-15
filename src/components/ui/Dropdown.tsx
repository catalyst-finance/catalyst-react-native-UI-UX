import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, FlatList, ViewProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/design-tokens';
import { useTheme } from '../../contexts/ThemeContext';

export interface DropdownOption {
  label: string;
  value: string;
  icon?: string;
}

interface DropdownProps extends ViewProps {
  options: DropdownOption[];
  value?: string;
  onSelect: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onSelect,
  placeholder = 'Select an option',
  disabled = false,
  style,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  
  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (optionValue: string) => {
    onSelect(optionValue);
    setIsOpen(false);
  };

  return (
    <View style={[styles.container, style]} {...props}>
      <Pressable
        style={[
          styles.trigger, 
          { 
            borderColor: themeColors.border, 
            backgroundColor: themeColors.inputBackground 
          },
          disabled && styles.disabled
        ]}
        onPress={() => !disabled && setIsOpen(true)}
        disabled={disabled}
      >
        <Text style={[
          styles.text, 
          { color: selectedOption ? themeColors.foreground : themeColors.mutedForeground }
        ]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={themeColors.mutedForeground} />
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setIsOpen(false)}>
          <View style={[styles.dropdown, { backgroundColor: themeColors.card }]}>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.option,
                    { borderBottomColor: themeColors.border },
                    item.value === value && { backgroundColor: themeColors.muted },
                  ]}
                  onPress={() => handleSelect(item.value)}
                >
                  <Text style={[styles.optionText, { color: themeColors.foreground }]}>
                    {item.label}
                  </Text>
                  {item.value === value && (
                    <Ionicons name="checkmark" size={20} color={themeColors.primary} />
                  )}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  trigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 14,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdown: {
    borderRadius: 8,
    width: '80%',
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: 14,
  },
});
