/**
 * HoldingsCard Component - React Native Port
 * 
 * Displays a stock position with shares and market value for users
 * who have connected their external brokerage accounts.
 * 
 * Layout:
 * - Ticker badge (left)
 * - Shares and market value (below ticker)
 * - Current price (right)
 * - Percentage change (below price)
 * - MiniChart (below all)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MiniChart } from './MiniChart';
import { AnimatedPrice } from '../ui/AnimatedPrice';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../constants/design-tokens';

interface DataPoint {
  timestamp: number;
  value: number;
  session?: string;
}

interface MarketEvent {
  id: string;
  type: string;
  [key: string]: any;
}

interface FutureCatalyst {
  date: string;
  timestamp: number;
  catalyst: MarketEvent;
  dayIndex: number;
  position: number;
}

interface HoldingsCardProps {
  ticker: string;
  company: string;
  currentPrice: number;
  previousClose: number | null;
  data: DataPoint[];
  shares?: number; // Optional - default to 0
  priceChange?: number; // Optional - calculated from currentPrice and previousClose
  priceChangePercent?: number; // Optional - calculated from currentPrice and previousClose
  futureCatalysts?: FutureCatalyst[];
  preMarketChange?: number; // percentage change in pre-market
  marketPeriod?: 'premarket' | 'regular' | 'afterhours' | 'closed' | 'holiday';
  onPress?: () => void;
}

export const HoldingsCard: React.FC<HoldingsCardProps> = ({
  ticker,
  company,
  currentPrice,
  previousClose,
  data,
  shares = 10, // Default to 10 shares for demo
  priceChange,
  priceChangePercent,
  futureCatalysts = [],
  preMarketChange,
  marketPeriod = 'regular', // Default to regular if not provided
  onPress,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  
  // Calculate price change if not provided
  const calculatedPriceChange = priceChange ?? (previousClose ? currentPrice - previousClose : 0);
  const calculatedPriceChangePercent = priceChangePercent ?? (previousClose && previousClose > 0 
    ? ((currentPrice - previousClose) / previousClose) * 100 
    : 0);
  
  const isPositive = calculatedPriceChange >= 0;
  const marketValue = shares * currentPrice;
  
  // Calculate percentage change from previous close
  const prevCloseChange = previousClose && previousClose > 0 
    ? ((currentPrice - previousClose) / previousClose) * 100 
    : calculatedPriceChangePercent;
  
  const isPrevClosePositive = (prevCloseChange ?? 0) >= 0;
  const isPreMarketPositive = (preMarketChange ?? 0) >= 0;
  
  // During regular hours, show only single percentage
  const showDualPercentages = marketPeriod !== 'regular';

  return (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={[styles.container, { backgroundColor: themeColors.card, shadowColor: isDark ? '#000' : '#000' }]}>
        {/* Header section */}
        <View style={styles.header}>
          {/* Left side: Ticker badge and holdings info */}
          <View style={styles.leftSection}>
            {/* Ticker badge */}
          <View style={[styles.tickerBadge, { backgroundColor: themeColors.primary }]}>
            <Text style={[styles.tickerText, { color: themeColors.primaryForeground }]}>{ticker}</Text>
          </View>
          
          {/* Shares and market value */}
          <View style={styles.holdingsInfo}>
            <Text style={[styles.sharesText, { color: themeColors.mutedForeground }]}>
              {shares.toFixed(0)} shares
            </Text>
            <Text style={[styles.separator, { color: themeColors.mutedForeground }]}> • </Text>
            <Text style={[styles.marketValueText, { color: themeColors.mutedForeground }]}>
              ${marketValue.toLocaleString('en-US', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
              })}
            </Text>
          </View>
        </View>

        {/* Right side: Current price and percentage change */}
        <View style={styles.rightSection}>
          {/* Current price */}
          <AnimatedPrice 
            price={currentPrice} 
            showCurrency={true}
            fontSize={20}
            fontWeight="600"
          />
          
          {/* During regular hours: show single percentage */}
          {!showDualPercentages && (
            <View style={styles.singleChangeRow}>
              <Text style={[
                styles.changeArrow,
                { color: isPrevClosePositive ? '#00C805' : '#FF5000' }
              ]}>
                {isPrevClosePositive ? '▲' : '▼'}
              </Text>
              <Text style={[
                styles.changeValue,
                { color: isPrevClosePositive ? '#00C805' : '#FF5000' }
              ]}>
                {Math.abs(prevCloseChange ?? 0).toFixed(2)}%
              </Text>
            </View>
          )}
          
          {/* During extended hours: show dual percentages with labels */}
          {showDualPercentages && (
            <View style={styles.changesRow}>
              {/* First percentage (Prev Close or Today) */}
              <View style={styles.changeItem}>
                <View style={styles.changeValueRow}>
                  <Text style={[
                    styles.changeArrow,
                    { color: isPrevClosePositive ? '#00C805' : '#FF5000' }
                  ]}>
                    {isPrevClosePositive ? '▲' : '▼'}
                  </Text>
                  <Text style={[
                    styles.changeValue,
                    { color: isPrevClosePositive ? '#00C805' : '#FF5000' }
                  ]}>
                    {Math.abs(prevCloseChange ?? 0).toFixed(2)}%
                  </Text>
                </View>
                <Text style={styles.changeLabel}>
                  {marketPeriod === 'premarket' ? 'Prev Close' : 'Today'}
                </Text>
              </View>

              {/* Second percentage (Pre-Market or After Hours) */}
              {preMarketChange !== undefined && (
                <View style={styles.changeItem}>
                  <View style={styles.changeValueRow}>
                    <Text style={[
                      styles.changeArrow,
                      { color: isPreMarketPositive ? '#00C805' : '#FF5000' }
                    ]}>
                      {isPreMarketPositive ? '▲' : '▼'}
                    </Text>
                    <Text style={[
                      styles.changeValue,
                      { color: isPreMarketPositive ? '#00C805' : '#FF5000' }
                    ]}>
                      {Math.abs(preMarketChange ?? 0).toFixed(2)}%
                    </Text>
                  </View>
                  <Text style={styles.changeLabel}>
                    {marketPeriod === 'premarket' ? 'Pre-Market' : 'After Hours'}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Chart section */}
      <View style={styles.chartSection}>
        <MiniChart
          data={data}
          previousClose={previousClose}
          currentPrice={currentPrice}
          ticker={ticker}
          futureCatalysts={futureCatalysts}
        />
      </View>
    </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'visible',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  leftSection: {
    flex: 1,
    alignSelf: 'flex-end',
  },
  tickerBadge: {
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  tickerText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  holdingsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sharesText: {
    fontSize: 14,
    color: '#71717A', // muted-foreground
    fontWeight: '400',
  },
  separator: {
    fontSize: 14,
    color: '#71717A',
  },
  marketValueText: {
    fontSize: 14,
    color: '#71717A',
    fontWeight: '500',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  singleChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  changesRow: {
    flexDirection: 'row',
    gap: 16,
  },
  changeItem: {
    alignItems: 'center',
  },
  changeValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  changeArrow: {
    fontSize: 10,
    fontWeight: '600',
  },
  changeValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  changeLabel: {
    fontSize: 11,
    color: '#666666',
    marginTop: 1,
  },
  chartSection: {
    marginTop: 8,
    overflow: 'visible',
  },
});
