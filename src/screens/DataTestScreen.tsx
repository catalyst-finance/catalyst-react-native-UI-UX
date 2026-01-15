/**
 * Data Test Screen
 * 
 * Tests Supabase connection and StockAPI functionality
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { colors } from '../constants/design-tokens';
import { Button } from '../components/ui/Button';
import StockAPI, { StockData } from '../services/supabase/StockAPI';

export const DataTestScreen: React.FC = () => {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [stockData, setStockData] = useState<StockData | null>(null);

  const testGetStock = async () => {
    setLoading(true);
    setResult('Fetching AAPL...');
    
    try {
      const stock = await StockAPI.getStock('AAPL');
      
      if (stock) {
        setStockData(stock);
        setResult(`✅ Success! Got data for ${stock.symbol}`);
      } else {
        setResult('❌ No data returned');
      }
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testGetMultipleStocks = async () => {
    setLoading(true);
    setResult('Fetching AAPL, MSFT, TSLA...');
    
    try {
      const stocks = await StockAPI.getStocks(['AAPL', 'MSFT', 'TSLA']);
      const count = Object.keys(stocks).length;
      
      if (count > 0) {
        const symbols = Object.keys(stocks).join(', ');
        setResult(`✅ Success! Got ${count} stocks: ${symbols}`);
        setStockData(stocks['AAPL'] || null);
      } else {
        setResult('❌ No data returned');
      }
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testSearchStocks = async () => {
    setLoading(true);
    setResult('Searching for "apple"...');
    
    try {
      const results = await StockAPI.searchStocks('apple', 5);
      
      if (results.length > 0) {
        const symbols = results.map(s => s.symbol).join(', ');
        setResult(`✅ Success! Found ${results.length} stocks: ${symbols}`);
        setStockData(results[0]);
      } else {
        setResult('❌ No results found');
      }
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testClearCache = async () => {
    setLoading(true);
    setResult('Clearing cache...');
    
    try {
      await StockAPI.clearCache();
      setResult('✅ Cache cleared successfully');
      setStockData(null);
    } catch (error) {
      setResult(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>StockAPI Test</Text>
        <Text style={styles.subtitle}>Test Supabase connection and data fetching</Text>

        {/* Test Buttons */}
        <View style={styles.buttonGroup}>
          <Button 
            onPress={testGetStock} 
            disabled={loading}
            variant="default"
          >
            Test Get Single Stock (AAPL)
          </Button>

          <Button 
            onPress={testGetMultipleStocks} 
            disabled={loading}
            variant="default"
          >
            Test Get Multiple Stocks
          </Button>

          <Button 
            onPress={testSearchStocks} 
            disabled={loading}
            variant="default"
          >
            Test Search Stocks
          </Button>

          <Button 
            onPress={testClearCache} 
            disabled={loading}
            variant="outline"
          >
            Clear Cache
          </Button>
        </View>

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={isDark ? colors.dark.primary : colors.light.primary} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}

        {/* Result */}
        {result && !loading && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Result:</Text>
            <Text style={styles.resultText}>{result}</Text>
          </View>
        )}

        {/* Stock Data Display */}
        {stockData && !loading && (
          <View style={styles.dataContainer}>
            <Text style={styles.dataTitle}>Stock Data:</Text>
            
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Symbol:</Text>
              <Text style={styles.dataValue}>{stockData.symbol}</Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Company:</Text>
              <Text style={styles.dataValue}>{stockData.company}</Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Current Price:</Text>
              <Text style={styles.dataValue}>${stockData.currentPrice.toFixed(2)}</Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Change:</Text>
              <Text style={[
                styles.dataValue,
                { color: stockData.priceChange >= 0 ? '#00C805' : '#FF5000' }
              ]}>
                {stockData.priceChange >= 0 ? '+' : ''}{stockData.priceChange.toFixed(2)} 
                ({stockData.priceChangePercent >= 0 ? '+' : ''}{stockData.priceChangePercent.toFixed(2)}%)
              </Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Previous Close:</Text>
              <Text style={styles.dataValue}>
                {stockData.previousClose ? `$${stockData.previousClose.toFixed(2)}` : 'N/A'}
              </Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Volume:</Text>
              <Text style={styles.dataValue}>{stockData.volume.toLocaleString()}</Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Market Cap:</Text>
              <Text style={styles.dataValue}>{stockData.marketCap}</Text>
            </View>

            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Sector:</Text>
              <Text style={styles.dataValue}>{stockData.sector}</Text>
            </View>

            {stockData.lastUpdated && (
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Last Updated:</Text>
                <Text style={styles.dataValue}>
                  {new Date(stockData.lastUpdated).toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>Instructions:</Text>
          <Text style={styles.instructionsText}>
            1. Make sure you're connected to the internet{'\n'}
            2. Click any test button to fetch data from Supabase{'\n'}
            3. First fetch will be slow, subsequent fetches use cache{'\n'}
            4. Check console logs for detailed information{'\n'}
            5. Clear cache to force fresh data fetch
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 24,
  },
  buttonGroup: {
    gap: 12,
    marginBottom: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666666',
  },
  resultContainer: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
    color: '#333333',
    fontFamily: 'monospace',
  },
  dataContainer: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  dataTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dataLabel: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  dataValue: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  instructions: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 13,
    color: '#1565c0',
    lineHeight: 20,
  },
});
