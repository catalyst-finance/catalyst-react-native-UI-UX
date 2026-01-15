import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ViewProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/design-tokens';
import { useTheme } from '../../contexts/ThemeContext';

interface AccordionItemProps extends ViewProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export const AccordionItem: React.FC<AccordionItemProps> = ({
  title,
  children,
  defaultOpen = false,
  style,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  return (
    <View style={[styles.item, { borderBottomColor: themeColors.border }, style]} {...props}>
      <Pressable
        style={[styles.trigger, { backgroundColor: themeColors.card }]}
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text style={[styles.title, { color: themeColors.foreground }]}>{title}</Text>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={themeColors.mutedForeground}
        />
      </Pressable>
      
      {isOpen && (
        <View style={[styles.content, { backgroundColor: themeColors.muted }]}>
          {children}
        </View>
      )}
    </View>
  );
};

interface AccordionProps extends ViewProps {
  children: React.ReactNode;
}

export const Accordion: React.FC<AccordionProps> = ({ children, style, ...props }) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  return (
    <View style={[styles.accordion, { borderColor: themeColors.border }, style]} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  accordion: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  item: {
    borderBottomWidth: 1,
  },
  trigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
