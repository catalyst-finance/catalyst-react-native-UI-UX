import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { colors } from '../constants/design-tokens';

// Screens
import { HomeScreen } from '../screens/HomeScreen';
import { CopilotScreen } from '../screens/CopilotScreen';
import { DiscoverScreen } from '../screens/DiscoverScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

// Root Navigator - Just the Tab Navigator for now
// StockDetailScreen will be shown as a modal from HomeScreen
export const RootNavigator: React.FC = () => {
  const { isDark } = useTheme();
  
  // Ensure all values are the correct types
  const backgroundColor = isDark ? colors.dark.background : colors.light.background;
  const borderColor = isDark ? colors.dark.border : colors.light.border;
  const activeTintColor = isDark ? colors.dark.primary : colors.light.primary;
  const inactiveTintColor = isDark ? colors.dark.mutedForeground : colors.light.mutedForeground;
  const headerTintColor = isDark ? colors.dark.foreground : colors.light.foreground;

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarStyle: {
            backgroundColor: backgroundColor,
            borderTopColor: borderColor,
            borderTopWidth: 1,
          },
          tabBarActiveTintColor: activeTintColor,
          tabBarInactiveTintColor: inactiveTintColor,
          tabBarShowLabel: false,
          headerStyle: {
            backgroundColor: backgroundColor,
          },
          headerTintColor: headerTintColor,
        }}
      >
        <Tab.Screen
          name="Timeline"
          component={HomeScreen}
          options={{
            headerShown: false,
            tabBarIcon: ({ color, size, focused }) => (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginBottom: -8 }}>
                <Ionicons name={focused ? "home" : "home"} size={size} color={color} />
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="Copilot"
          component={CopilotScreen}
          options={{
            headerShown: false,
            tabBarIcon: ({ color, size, focused }) => (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginBottom: -8 }}>
                <Ionicons name={focused ? "sparkles" : "sparkles"} size={size} color={color} />
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="Discover"
          component={DiscoverScreen}
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginBottom: -8 }}>
                <Ionicons name={focused ? "search" : "search"} size={size} color={color} />
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginBottom: -8 }}>
                <Ionicons name={focused ? "person" : "person"} size={size} color={color} />
              </View>
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};
