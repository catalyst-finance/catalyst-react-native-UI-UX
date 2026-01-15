/**
 * Service Test Screen
 * 
 * Screen for testing all services and viewing their status.
 * Useful for debugging and verifying service integration.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../constants/design-tokens';
import { DataService } from '../services/DataService';
import { NetworkService } from '../services/NetworkService';
import { BackgroundFetchService } from '../services/BackgroundFetchService';
import { runIntegrationTests } from '../tests/integration/services.test';

interface TestResults {
  passed: number;
  failed: number;
  total: number;
  successRate: number;
}

export const ServiceTestScreen: React.FC = () => {
  const { isDark, theme, setTheme, toggleTheme } = useTheme();
  const { user, biometricAvailable } = useAuth();
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [networkStatus, setNetworkStatus] = useState<any>(null);
  const [bgFetchStatus, setBgFetchStatus] = useState<any>(null);

  useEffect(() => {
    loadServiceStatus();
  }, []);

  const loadServiceStatus = async () => {
    try {
      // Get cache stats
      const stats = await DataService.getCacheStats();
      setCacheStats(stats);

      // Get network status
      const netState = await NetworkService.getNetworkState();
      setNetworkStatus(netState);

      // Get background fetch status
      const bgStatus = await BackgroundFetchService.getStatus();
      setBgFetchStatus(bgStatus);
    } catch (error) {
      console.error('Error loading service status:', error);
    }
  };

  const handleRunTests = async () => {
    setIsRunningTests(true);
    setTestResults(null);

    try {
      const results = await runIntegrationTests();
      setTestResults(results);
    } catch (error) {
      console.error('Error running tests:', error);
    } finally {
      setIsRunningTests(false);
      await loadServiceStatus();
    }
  };

  const handleClearCache = async () => {
    try {
      await DataService.clearAllCache();
      await loadServiceStatus();
      console.log('✅ Cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  const handleTriggerBackgroundFetch = async () => {
    try {
      await BackgroundFetchService.triggerManualFetch();
      await loadServiceStatus();
      console.log('✅ Background fetch triggered');
    } catch (error) {
      console.error('Error triggering background fetch:', error);
    }
  };

  const bgColor = isDark ? '#000' : '#fff';
  const textColor = isDark ? '#fff' : '#000';
  const cardBg = isDark ? '#1a1a1a' : '#f5f5f5';
  const borderColor = isDark ? '#333' : '#ddd';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: textColor, marginBottom: 8 }}>
            Service Tests
          </Text>
          <Text style={{ fontSize: 14, color: isDark ? '#999' : '#666' }}>
            Test and monitor all services
          </Text>
        </View>

        {/* Auth Status */}
        <View style={{ 
          backgroundColor: cardBg, 
          padding: 16, 
          borderRadius: 12, 
          marginBottom: 16,
          borderWidth: 1,
          borderColor,
        }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: textColor, marginBottom: 12 }}>
            Authentication
          </Text>
          <View style={{ gap: 8 }}>
            <Text style={{ color: textColor }}>
              User: {user ? user.email : 'Not signed in'}
            </Text>
            <Text style={{ color: textColor }}>
              Biometric Available: {biometricAvailable ? '✅ Yes' : '❌ No'}
            </Text>
          </View>
        </View>

        {/* Theme Status */}
        <View style={{ 
          backgroundColor: cardBg, 
          padding: 16, 
          borderRadius: 12, 
          marginBottom: 16,
          borderWidth: 1,
          borderColor,
        }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: textColor, marginBottom: 12 }}>
            Theme
          </Text>
          <View style={{ gap: 8 }}>
            <Text style={{ color: textColor }}>Current Theme: {theme}</Text>
            <Text style={{ color: textColor }}>Dark Mode: {isDark ? '🌙 Yes' : '☀️ No'}</Text>
            <TouchableOpacity
              onPress={toggleTheme}
              style={{
                backgroundColor: isDark ? colors.dark.secondary : colors.light.primary,
                padding: 12,
                borderRadius: 8,
                marginTop: 8,
              }}
            >
              <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>
                Toggle Theme
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Cache Stats */}
        <View style={{ 
          backgroundColor: cardBg, 
          padding: 16, 
          borderRadius: 12, 
          marginBottom: 16,
          borderWidth: 1,
          borderColor,
        }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: textColor, marginBottom: 12 }}>
            Cache Statistics
          </Text>
          {cacheStats ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: textColor }}>Total Keys: {cacheStats.totalKeys}</Text>
              <Text style={{ color: textColor }}>Memory Keys: {cacheStats.memoryKeys}</Text>
              <Text style={{ color: textColor }}>Storage Keys: {cacheStats.storageKeys}</Text>
              <Text style={{ color: textColor }}>
                Total Size: {(cacheStats.totalSize / 1024).toFixed(2)} KB
              </Text>
              <TouchableOpacity
                onPress={handleClearCache}
                style={{
                  backgroundColor: '#FF3B30',
                  padding: 12,
                  borderRadius: 8,
                  marginTop: 8,
                }}
              >
                <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>
                  Clear Cache
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ActivityIndicator />
          )}
        </View>

        {/* Network Status */}
        <View style={{ 
          backgroundColor: cardBg, 
          padding: 16, 
          borderRadius: 12, 
          marginBottom: 16,
          borderWidth: 1,
          borderColor,
        }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: textColor, marginBottom: 12 }}>
            Network Status
          </Text>
          {networkStatus ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: textColor }}>
                Connected: {networkStatus.isConnected ? '✅ Yes' : '❌ No'}
              </Text>
              <Text style={{ color: textColor }}>
                Internet Reachable: {networkStatus.isInternetReachable ? '✅ Yes' : '❌ No'}
              </Text>
              <Text style={{ color: textColor }}>Type: {networkStatus.type}</Text>
            </View>
          ) : (
            <ActivityIndicator />
          )}
        </View>

        {/* Background Fetch Status */}
        <View style={{ 
          backgroundColor: cardBg, 
          padding: 16, 
          borderRadius: 12, 
          marginBottom: 16,
          borderWidth: 1,
          borderColor,
        }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: textColor, marginBottom: 12 }}>
            Background Fetch
          </Text>
          {bgFetchStatus ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: textColor }}>
                Registered: {bgFetchStatus.isRegistered ? '✅ Yes' : '❌ No'}
              </Text>
              <Text style={{ color: textColor }}>
                Last Fetch: {bgFetchStatus.lastFetchTime 
                  ? new Date(bgFetchStatus.lastFetchTime).toLocaleString()
                  : 'Never'}
              </Text>
              <TouchableOpacity
                onPress={handleTriggerBackgroundFetch}
                style={{
                  backgroundColor: isDark ? colors.dark.secondary : colors.light.primary,
                  padding: 12,
                  borderRadius: 8,
                  marginTop: 8,
                }}
              >
                <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>
                  Trigger Manual Fetch
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ActivityIndicator />
          )}
        </View>

        {/* Test Results */}
        {testResults && (
          <View style={{ 
            backgroundColor: cardBg, 
            padding: 16, 
            borderRadius: 12, 
            marginBottom: 16,
            borderWidth: 1,
            borderColor,
          }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: textColor, marginBottom: 12 }}>
              Test Results
            </Text>
            <View style={{ gap: 8 }}>
              <Text style={{ color: textColor }}>✅ Passed: {testResults.passed}</Text>
              <Text style={{ color: textColor }}>❌ Failed: {testResults.failed}</Text>
              <Text style={{ color: textColor }}>📊 Total: {testResults.total}</Text>
              <Text style={{ color: textColor }}>
                Success Rate: {testResults.successRate.toFixed(1)}%
              </Text>
            </View>
          </View>
        )}

        {/* Run Tests Button */}
        <TouchableOpacity
          onPress={handleRunTests}
          disabled={isRunningTests}
          style={{
            backgroundColor: isRunningTests ? '#666' : '#34C759',
            padding: 16,
            borderRadius: 12,
            marginBottom: 32,
          }}
        >
          {isRunningTests ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <ActivityIndicator color="#fff" />
              <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600', fontSize: 16 }}>
                Running Tests...
              </Text>
            </View>
          ) : (
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600', fontSize: 16 }}>
              Run Integration Tests
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ServiceTestScreen;
