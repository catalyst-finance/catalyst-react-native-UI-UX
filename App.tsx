import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { AppDataProvider } from './src/contexts/AppDataContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { fonts } from './src/utils/fonts';
import { NetworkService } from './src/services/NetworkService';
import { BackgroundFetchService } from './src/services/BackgroundFetchService';
import { populateTestData } from './src/utils/test-data-helper';
import { SplashLoadingScreen } from './src/components/SplashLoadingScreen';

// Keep the native splash screen visible initially
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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#000' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#fff' }}>
            Something went wrong
          </Text>
          <Text style={{ fontSize: 14, color: '#999', textAlign: 'center' }}>
            {this.state.error?.message || 'Unknown error'}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

function AppContent() {
  const { isDark } = useTheme();
  
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
    </>
  );
}

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [servicesReady, setServicesReady] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Starting...');

  // Initialize core services (fonts, network, etc.)
  useEffect(() => {
    async function initializeServices() {
      try {
        // Hide native splash immediately so we show our custom one
        await SplashScreen.hideAsync();
        
        // Initialize network service
        await NetworkService.init();
        
        // Load fonts
        await Font.loadAsync(fonts);
        setFontsLoaded(true);
        
        // Initialize background fetch
        await BackgroundFetchService.init();
        
        // Populate test data in dev mode
        if (__DEV__) {
          await populateTestData();
        }
        
        setServicesReady(true);
      } catch (error) {
        console.error('Error initializing services:', error);
        setServicesReady(true); // Continue anyway
      }
    }

    initializeServices();
  }, []);

  // Handle data loading progress from AppDataProvider
  const handleLoadingProgress = useCallback((progress: number, message: string) => {
    setLoadingProgress(progress);
    setLoadingMessage(message);
  }, []);

  // Handle when data is ready
  const handleDataReady = useCallback(() => {
    setDataReady(true);
  }, []);

  // Show splash screen until everything is ready
  const showSplash = !fontsLoaded || !servicesReady || !dataReady;

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider>
            <AppDataProvider
              onLoadingProgress={handleLoadingProgress}
              onReady={handleDataReady}
            >
              {showSplash ? (
                <SplashLoadingScreen
                  loadingProgress={loadingProgress}
                  loadingMessage={loadingMessage}
                />
              ) : (
                <AppContent />
              )}
            </AppDataProvider>
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
