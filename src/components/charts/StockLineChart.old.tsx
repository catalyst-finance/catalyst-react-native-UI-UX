import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { VictoryLine, VictoryChart, VictoryAxis, VictoryScatter, VictoryArea } from 'victory-native';
import { colors, typography, spacing } from '../../constants/design-tokens';

interface DataPoint {
  timestamp: number;
  value: number;
  volume?: number;
  session?: string;
}

export type TimeRange = '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y' | '5Y';

interface StockLineChartProps {
  data: DataPoint[];
  previousClose: number | null;
  currentPrice: number;
  priceChange?: number;
  priceChangePercent?: number;
  width?: number;
  height?: number;
  onTimeRangeChange?: (range: TimeRange) => void;
  defaultTimeRange?: TimeRange;
  ticker?: string;
}

const TIME_RANGES: TimeRange[] = ['1D', '1W', '1M', '3M', 'YTD', '1Y', '5Y'];

export const StockLineChart: React.FC<StockLineChartProps> = ({
  data,
  previousClose,
  currentPrice,
  priceChange = 0,
  priceChangePercent = 0,
  width = Dimensions.get('window').width - 32,
  height = 300,
  onTimeRangeChange,
  defaultTimeRange = '1D',
  ticker = '',
}) => {
  const [selectedRange, setSelectedRange] = useState<TimeRange>(defaultTimeRange);

  if (data.length === 0) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.noDataText}>No data available</Text>
      </View>
    );
  }

  const effectivePreviousClose = previousClose || data[0]?.value || currentPrice;
  const isPositive = currentPrice >= effectivePreviousClose;
  const strokeColor = isPositive ? colors.light.positive : colors.light.negative;

  const chartData = data.map(point => ({
    x: point.timestamp,
    y: point.value,
  }));

  const handleRangeChange = (range: TimeRange) => {
    setSelectedRange(range);
    onTimeRangeChange?.(range);
  };

  return (
    <View style={[styles.container, { width }]}>
      {/* Price Header */}
      <View style={styles.header}>
        <Text style={styles.price}>${currentPrice.toFixed(2)}</Text>
        <Text style={[styles.change, isPositive ? styles.positive : styles.negative]}>
          {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
        </Text>
      </View>

      {/* Chart */}
      <VictoryChart
        width={width}
        height={height}
        padding={{ top: 20, bottom: 40, left: 50, right: 20 }}
      >
        <VictoryAxis
          style={{
            axis: { stroke: colors.light.border },
            tickLabels: { fill: colors.light.mutedForeground, fontSize: 10 },
          }}
        />
        <VictoryAxis
          dependentAxis
          style={{
            axis: { stroke: colors.light.border },
            tickLabels: { fill: colors.light.mutedForeground, fontSize: 10 },
            grid: { stroke: colors.light.border, strokeDasharray: '4,4' },
          }}
        />
        <VictoryArea
          data={chartData}
          style={{
            data: {
              fill: strokeColor,
              fillOpacity: 0.1,
              stroke: strokeColor,
              strokeWidth: 2,
            },
          }}
          interpolation="natural"
        />
      </VictoryChart>

      {/* Time Range Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.rangeSelector}
        contentContainerStyle={styles.rangeSelectorContent}
      >
        {TIME_RANGES.map(range => (
          <TouchableOpacity
            key={range}
            style={[
              styles.rangeButton,
              selectedRange === range && styles.rangeButtonActive,
            ]}
            onPress={() => handleRangeChange(range)}
          >
            <Text
              style={[
                styles.rangeButtonText,
                selectedRange === range && styles.rangeButtonTextActive,
              ]}
            >
              {range}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.light.card,
    borderRadius: 12,
    padding: spacing[4],
  },
  header: {
    marginBottom: spacing[4],
  },
  price: {
    fontSize: typography.fontSize['3xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.light.foreground,
    marginBottom: spacing[1],
  },
  change: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
  },
  positive: {
    color: colors.light.positive,
  },
  negative: {
    color: colors.light.negative,
  },
  noDataText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.sans,
    color: colors.light.mutedForeground,
    textAlign: 'center',
    marginTop: spacing[8],
  },
  rangeSelector: {
    marginTop: spacing[4],
  },
  rangeSelectorContent: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  rangeButton: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: 6,
    backgroundColor: colors.light.secondary,
  },
  rangeButtonActive: {
    backgroundColor: colors.light.primary,
  },
  rangeButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.light.secondaryForeground,
  },
  rangeButtonTextActive: {
    color: colors.light.primaryForeground,
  },
});
