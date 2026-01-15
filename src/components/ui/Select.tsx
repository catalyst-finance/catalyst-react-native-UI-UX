import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Modal } from './Modal';
import { colors } from '../../constants/design-tokens';
import { useTheme } from '../../contexts/ThemeContext';

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  children: React.ReactNode;
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
}

const SelectContext = React.createContext<{
  selectedValue: string;
  onSelect: (value: string) => void;
  closeModal: () => void;
}>({
  selectedValue: '',
  onSelect: () => {},
  closeModal: () => {},
});

export const Select: React.FC<SelectProps> = ({
  value = '',
  onValueChange,
  placeholder = 'Select an option',
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value);
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  const handleSelect = (newValue: string) => {
    setSelectedValue(newValue);
    onValueChange?.(newValue);
    setIsOpen(false);
  };

  return (
    <SelectContext.Provider 
      value={{ 
        selectedValue, 
        onSelect: handleSelect, 
        closeModal: () => setIsOpen(false) 
      }}
    >
      <Pressable 
        style={[
          styles.trigger, 
          { 
            borderColor: themeColors.border, 
            backgroundColor: themeColors.inputBackground 
          }
        ]} 
        onPress={() => setIsOpen(true)}
      >
        <Text style={[styles.triggerText, { color: themeColors.foreground }]}>
          {selectedValue || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={themeColors.mutedForeground} />
      </Pressable>

      <Modal visible={isOpen} onClose={() => setIsOpen(false)}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: themeColors.foreground }]}>Select Option</Text>
          {children}
        </View>
      </Modal>
    </SelectContext.Provider>
  );
};

export const SelectItem: React.FC<SelectItemProps> = ({ value, children }) => {
  const { selectedValue, onSelect } = React.useContext(SelectContext);
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  const isSelected = selectedValue === value;

  return (
    <Pressable
      style={[
        styles.item, 
        isSelected && { backgroundColor: themeColors.muted }
      ]}
      onPress={() => onSelect(value)}
    >
      <Text style={[
        styles.itemText, 
        { color: themeColors.foreground },
        isSelected && styles.itemTextSelected
      ]}>
        {children}
      </Text>
      {isSelected && (
        <Ionicons name="checkmark" size={20} color={themeColors.primary} />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 6,
    minHeight: 40,
  },
  triggerText: {
    fontSize: 14,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  itemText: {
    fontSize: 16,
  },
  itemTextSelected: {
    fontWeight: '500',
  },
});