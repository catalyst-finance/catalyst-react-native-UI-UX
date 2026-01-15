import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { fonts } from './src/utils/fonts';
import { NetworkService } from './src/services/NetworkService';
import { DataService } from './src/services/DataService';
import { BackgroundFetchService } from './src/services/BackgroundFetchService';
import { populateTestData } from './src/utils/test-data-helper';

// Keep the splash screen visible while we load fonts
SplashScreen.preventAutoHideAsync();

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error);
    console.error('Error info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
            Something went wrong
          </Text>
          <Text style={{ fontSize: 14, color: '#666', textAlign: 'center' }}>
            {this.state.error?.message || 'Unknown error'}
          </Text>
          <Text style={{ fontSize: 12, color: '#999', marginTop: 10, textAlign: 'center' }}>
            {this.state.error?.stack}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

function AppContent() {
  const { isDark } = useTheme();
  
  console.log('AppContent rendering, isDark:', isDark);
  
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
    </>
  );
}

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        console.log('App starting...');
        
        // Initialize services
        console.log('Initializing services...');
        
        // 1. Initialize NetworkService (must be first)
        await NetworkService.init();
        console.log('✅ NetworkService initialized');
        
        // 2. Load fonts
        console.log('Loading Gotham fonts...');
        await Font.loadAsync(fonts);
        console.log('✅ Fonts loaded successfully');
        
        // 3. Preload cache for common data
        console.log('Preloading cache...');
        const preloadKeys = [
          'watchlist',
          'portfolio',
          'market_status',
          'user_preferences',
        ];
        const preloadedCount = await DataService.preloadCache(preloadKeys);
        console.log(`✅ Preloaded ${preloadedCount} cache entries`);
        
        // 4. Initialize BackgroundFetchService
        console.log('Initializing background fetch...');
        const bgFetchSuccess = await BackgroundFetchService.init();
        if (bgFetchSuccess) {
          console.log('✅ BackgroundFetchService initialized');
        } else {
          console.warn('⚠️ BackgroundFetchService not available');
        }
        
        // 5. Get cache statistics (for debugging)
        const cacheStats = await DataService.getCacheStats();
        console.log('📊 Cache stats:', cacheStats);
        
        console.log('✅ All services initialized successfully');
        
        // Add test data for development
        if (__DEV__) {
          console.log('🧪 Populating test data for HomeScreen...');
          await populateTestData();
        }
        
        // Artificial delay for splash screen (optional)
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        console.warn('Error during initialization:', e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }
  
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
