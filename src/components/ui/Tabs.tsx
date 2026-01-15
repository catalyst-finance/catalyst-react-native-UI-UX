import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../../constants/design-tokens';
import { useTheme } from '../../contexts/ThemeContext';

interface TabsProps {
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

interface TabsListProps {
  children: React.ReactNode;
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
}

const TabsContext = React.createContext<{
  activeTab: string;
  setActiveTab: (value: string) => void;
}>({
  activeTab: '',
  setActiveTab: () => {},
});

export const Tabs: React.FC<TabsProps> = ({ 
  defaultValue = '', 
  onValueChange,
  children 
}) => {
  const [activeTab, setActiveTab] = useState(defaultValue);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    onValueChange?.(value);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleTabChange }}>
      <View style={styles.container}>
        {children}
      </View>
    </TabsContext.Provider>
  );
};

export const TabsList: React.FC<TabsListProps> = ({ children }) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  return (
    <View style={[styles.list, { backgroundColor: themeColors.muted }]}>
      {children}
    </View>
  );
};

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ value, children }) => {
  const { activeTab, setActiveTab } = React.useContext(TabsContext);
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  const isActive = activeTab === value;

  return (
    <Pressable
      style={[
        styles.trigger, 
        isActive && [styles.triggerActive, { backgroundColor: themeColors.card }]
      ]}
      onPress={() => setActiveTab(value)}
    >
      <Text style={[
        styles.triggerText, 
        { color: isActive ? themeColors.foreground : themeColors.mutedForeground }
      ]}>
        {children}
      </Text>
    </Pressable>
  );
};

export const TabsContent: React.FC<TabsContentProps> = ({ value, children }) => {
  const { activeTab } = React.useContext(TabsContext);
  
  if (activeTab !== value) return null;

  return (
    <View style={styles.content}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flexDirection: 'row',
    borderRadius: 6,
    padding: 4,
  },
  trigger: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  triggerActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  triggerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    marginTop: 16,
  },
});