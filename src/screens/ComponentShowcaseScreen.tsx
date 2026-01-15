import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { colors } from '../constants/design-tokens';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Text,
  Badge,
  Modal,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Avatar,
  Progress,
  Select,
  Slider,
  Checkbox,
  Accordion,
  AccordionItem,
  Dropdown,
  Switch,
  Separator,
} from '../components/ui';
import { WatchlistCard } from '../components/charts/WatchlistCard';
import { HoldingsCard } from '../components/charts/HoldingsCard';
import { StockLineChart } from '../components/charts/StockLineChart';
import StockAPI, { StockData } from '../services/supabase/StockAPI';
import MarketStatusAPI from '../services/supabase/MarketStatusAPI';
import RealtimeIntradayAPI, { IntradayPrice } from '../services/supabase/RealtimeIntradayAPI';
import HistoricalPriceAPI, { HistoricalDataPoint, TimeRange } from '../services/supabase/HistoricalPriceAPI';

export const ComponentShowcaseScreen: React.FC = () => {
  const { isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('tab1');
  const [sliderValue, setSliderValue] = useState(50);
  const [checkboxValue, setCheckboxValue] = useState(false);
  const [switchValue, setSwitchValue] = useState(false);
  const [selectValue, setSelectValue] = useState('');
  const [dropdownValue, setDropdownValue] = useState('');
  
  // Real stock data state
  const [aaplData, setAaplData] = useState<StockData | null>(null);
  const [tslaData, setTslaData] = useState<StockData | null>(null);
  const [aaplIntradayData, setAaplIntradayData] = useState<HistoricalDataPoint[]>([]);
  const [tslaIntradayData, setTslaIntradayData] = useState<HistoricalDataPoint[]>([]);
  const [aaplHistoricalData, setAaplHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('1D');
  const [loading, setLoading] = useState(true);
  const [marketPeriod, setMarketPeriod] = useState<'premarket' | 'regular' | 'afterhours' | 'closed' | 'holiday'>('regular');
  const [isCrosshairActive, setIsCrosshairActive] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Fetch real stock data
  const fetchStockData = async (skipCache: boolean = false) => {
    try {
      const stocks = await StockAPI.getStocks(['AAPL', 'TSLA'], skipCache);
      
      if (stocks['AAPL']) setAaplData(stocks['AAPL']);
      if (stocks['TSLA']) setTslaData(stocks['TSLA']);
    } catch (error) {
      // Error fetching stock data
    }
  };

  // Fetch market period
  const fetchMarketPeriod = async () => {
    try {
      const period = await MarketStatusAPI.getCurrentMarketPeriod();
      setMarketPeriod(period);
    } catch (error) {
      // Error fetching market period
    }
  };

  // Handle real-time price updates - convert to HistoricalDataPoint format
  const handlePriceUpdate = (symbol: string, newPrice: IntradayPrice) => {
    const dataPoint: HistoricalDataPoint = {
      timestamp: newPrice.timestamp,
      value: newPrice.value,
      session: newPrice.session,
    };
    
    if (symbol === 'AAPL') {
      setAaplIntradayData(prev => {
        // Check if this timestamp already exists (avoid duplicates)
        const exists = prev.some(p => p.timestamp === dataPoint.timestamp);
        if (exists) return prev;
        
        // Append new price and keep sorted
        const updated = [...prev, dataPoint].sort((a, b) => a.timestamp - b.timestamp);
        
        return updated;
      });
    } else if (symbol === 'TSLA') {
      setTslaIntradayData(prev => {
        const exists = prev.some(p => p.timestamp === dataPoint.timestamp);
        if (exists) return prev;
        
        return [...prev, dataPoint].sort((a, b) => a.timestamp - b.timestamp);
      });
    }
  };

  // Fetch historical data for selected time range
  const fetchHistoricalData = async (timeRange: TimeRange) => {
    try {
      const data = await HistoricalPriceAPI.fetchHistoricalData('AAPL', timeRange);
      setAaplHistoricalData(data);
    } catch (error) {
      // Error fetching historical data
    }
  };

  // Handle crosshair state change
  const handleCrosshairChange = (isActive: boolean) => {
    setIsCrosshairActive(isActive);
    // Immediately disable/enable scrolling using native props for instant response
    if (scrollViewRef.current) {
      scrollViewRef.current.setNativeProps({ scrollEnabled: !isActive });
    }
  };
  const handleTimeRangeChange = async (range: TimeRange) => {
    // Fetch new data first
    await fetchHistoricalData(range);
    // Then update the selected range (this triggers component remount via key prop)
    setSelectedTimeRange(range);
  };

  // Initial fetch and setup real-time subscriptions
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      
      try {
        // Fetch initial data (use cache for faster load)
        await Promise.all([
          fetchStockData(false), // Use cache
          fetchMarketPeriod(),
        ]);

        // Fetch historical intraday data using HistoricalPriceAPI (same as StockLineChart 1D view)
        const [aaplPrices, tslaPrices] = await Promise.all([
          HistoricalPriceAPI.fetchHistoricalData('AAPL', '1D'),
          HistoricalPriceAPI.fetchHistoricalData('TSLA', '1D'),
        ]);

        setAaplIntradayData(aaplPrices);
        setTslaIntradayData(tslaPrices);

        // Fetch initial historical data for StockLineChart (1D uses 5-minute data from HistoricalPriceAPI)
        const aaplHistorical = await HistoricalPriceAPI.fetchHistoricalData('AAPL', '1D');
        setAaplHistoricalData(aaplHistorical);

        // Subscribe to real-time updates
        RealtimeIntradayAPI.subscribe('AAPL', handlePriceUpdate);
        RealtimeIntradayAPI.subscribe('TSLA', handlePriceUpdate);

      } catch (error) {
        // Error loading initial data
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();

    // Cleanup: unsubscribe on unmount
    return () => {
      RealtimeIntradayAPI.unsubscribeAll();
    };
  }, []);

  // Poll stock data (current price) every 10 seconds during market hours
  useEffect(() => {
    if (marketPeriod === 'closed' || marketPeriod === 'holiday') {
      return;
    }
    
    const interval = setInterval(() => {
      fetchStockData(true); // Update current price
      fetchMarketPeriod(); // Update market period
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [marketPeriod]);

  // Calculate session-specific price change
  const calculateSessionChange = (
    currentPrice: number,
    intradayData: HistoricalDataPoint[],
    marketPeriod: string,
    previousClose: number
  ): number => {
    if (intradayData.length === 0) return 0;

    if (marketPeriod === 'premarket') {
      // Pre-market: change from previous close
      return ((currentPrice - previousClose) / previousClose) * 100;
    } else if (marketPeriod === 'afterhours') {
      // After-hours: change from regular session close
      // Find the last regular session data point
      const regularSessionData = intradayData.filter(d => d.session === 'regular');
      if (regularSessionData.length > 0) {
        const regularClose = regularSessionData[regularSessionData.length - 1].value;
        return ((currentPrice - regularClose) / regularClose) * 100;
      }
      // Fallback to previous close if no regular session data
      return ((currentPrice - previousClose) / previousClose) * 100;
    } else {
      // Regular hours: use the full day change
      return ((currentPrice - previousClose) / previousClose) * 100;
    }
  };

  const aaplSessionChange = aaplData && aaplIntradayData.length > 0
    ? calculateSessionChange(
        aaplData.currentPrice,
        aaplIntradayData,
        marketPeriod,
        aaplData.previousClose || aaplData.currentPrice
      )
    : aaplData?.priceChangePercent || 0;

  const tslaSessionChange = tslaData && tslaIntradayData.length > 0
    ? calculateSessionChange(
        tslaData.currentPrice,
        tslaIntradayData,
        marketPeriod,
        tslaData.previousClose || tslaData.currentPrice
      )
    : tslaData?.priceChangePercent || 0;

  return (
    <ScrollView 
      ref={scrollViewRef}
      style={[styles.container, { backgroundColor: isDark ? colors.dark.background : colors.light.background }]} 
      scrollEnabled={!isCrosshairActive}
    >
      {/* Show loading indicator while fetching data */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? colors.dark.primary : colors.light.primary} />
          <Text style={styles.loadingText}>Loading stock data...</Text>
        </View>
      )}

      {/* Show charts once data is loaded */}
      {!loading && aaplData && (
        <>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? colors.dark.foreground : colors.light.foreground }]}>Watchlist (Real Data)</Text>
            <WatchlistCard
              ticker={aaplData.symbol}
              companyName={aaplData.company}
              currentPrice={aaplData.currentPrice}
              previousClose={aaplData.previousClose || aaplData.currentPrice}
              preMarketChange={aaplSessionChange}
              data={aaplIntradayData.length > 0 ? aaplIntradayData : []}
              marketPeriod={marketPeriod}
              futureCatalysts={[
                {
                  date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                  timestamp: Date.now() + 14 * 24 * 60 * 60 * 1000,
                  catalyst: { id: '1', type: 'earnings' },
                  dayIndex: 14,
                  position: 0.5,
                },
                {
                  date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
                  timestamp: Date.now() + 45 * 24 * 60 * 60 * 1000,
                  catalyst: { id: '2', type: 'product' },
                  dayIndex: 45,
                  position: 0.5,
                },
              ]}
            />
          </View>

          <Separator />
        </>
      )}

      {!loading && tslaData && (
        <>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? colors.dark.foreground : colors.light.foreground }]}>Holdings (Real Data)</Text>
            <HoldingsCard
              ticker={tslaData.symbol}
              company={tslaData.company}
              currentPrice={tslaData.currentPrice}
              priceChange={tslaData.priceChange}
              priceChangePercent={tslaData.priceChangePercent}
              previousClose={tslaData.previousClose || tslaData.currentPrice}
              shares={10}
              preMarketChange={tslaSessionChange}
              marketPeriod={marketPeriod}
              data={tslaIntradayData.length > 0 ? tslaIntradayData : []}
              futureCatalysts={[
                {
                  date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
                  timestamp: Date.now() + 21 * 24 * 60 * 60 * 1000,
                  catalyst: { id: '3', type: 'earnings' },
                  dayIndex: 21,
                  position: 0.5,
                },
                {
                  date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
                  timestamp: Date.now() + 60 * 24 * 60 * 60 * 1000,
                  catalyst: { id: '4', type: 'product' },
                  dayIndex: 60,
                  position: 0.5,
                },
              ]}
            />
          </View>

          <Separator />
        </>
      )}

      {/* StockLineChart - Full-featured stock detail chart */}
      {!loading && aaplData && (
        <>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? colors.dark.foreground : colors.light.foreground }]}>Stock Detail Chart (Real Data)</Text>
            <StockLineChart
              key={`stock-chart-${selectedTimeRange}`}
              ticker={aaplData.symbol}
              companyName={aaplData.company}
              data={aaplHistoricalData.length > 0 ? aaplHistoricalData : []}
              previousClose={aaplData.previousClose || aaplData.currentPrice}
              currentPrice={aaplData.currentPrice}
              priceChange={aaplData.priceChange}
              priceChangePercent={aaplData.priceChangePercent}
              sessionChange={aaplSessionChange}
              marketPeriod={marketPeriod}
              futureCatalysts={[
                {
                  date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                  timestamp: Date.now() + 14 * 24 * 60 * 60 * 1000,
                  catalyst: { id: '1', type: 'earnings' },
                  dayIndex: 14,
                  position: 0.5,
                },
                {
                  date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
                  timestamp: Date.now() + 45 * 24 * 60 * 60 * 1000,
                  catalyst: { id: '2', type: 'product' },
                  dayIndex: 45,
                  position: 0.5,
                },
                {
                  date: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toISOString(),
                  timestamp: Date.now() + 75 * 24 * 60 * 60 * 1000,
                  catalyst: { id: '5', type: 'conference' },
                  dayIndex: 75,
                  position: 0.5,
                },
              ]}
              defaultTimeRange={selectedTimeRange}
              onTimeRangeChange={handleTimeRangeChange}
              onCrosshairChange={handleCrosshairChange}
            />
          </View>

          <Separator />
        </>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: isDark ? colors.dark.foreground : colors.light.foreground }]}>Buttons</Text>
        <View style={styles.row}>
          <Button variant="default">Default</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
        </View>
        <View style={styles.row}>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </View>
      </View>

      <Separator />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: isDark ? colors.dark.foreground : colors.light.foreground }]}>Card</Text>
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>This is a card description</CardDescription>
          </CardHeader>
          <CardContent>
            <Text>Card content goes here</Text>
          </CardContent>
        </Card>
      </View>

      <Separator />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: isDark ? colors.dark.foreground : colors.light.foreground }]}>Badges</Text>
        <View style={styles.row}>
          <Badge variant="default">Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </View>
        <View style={styles.row}>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
        </View>
      </View>

      <Separator />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: isDark ? colors.dark.foreground : colors.light.foreground }]}>Input</Text>
        <Input placeholder="Enter text..." />
      </View>

      <Separator />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: isDark ? colors.dark.foreground : colors.light.foreground }]}>Avatar</Text>
        <View style={styles.row}>
          <Avatar
            src="https://i.pravatar.cc/150?img=1"
            size="sm"
          />
          <Avatar
            src="https://i.pravatar.cc/150?img=2"
            size="md"
          />
          <Avatar
            src="https://i.pravatar.cc/150?img=3"
            size="lg"
          />
        </View>
      </View>

      <Separator />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: isDark ? colors.dark.foreground : colors.light.foreground }]}>Progress</Text>
        <Progress value={65} />
      </View>

      <Separator />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: isDark ? colors.dark.foreground : colors.light.foreground }]}>Slider</Text>
        <Slider
          value={sliderValue}
          onValueChange={setSliderValue}
          minimumValue={0}
          maximumValue={100}
        />
        <Text>Value: {Math.round(sliderValue)}</Text>
      </View>

      <Separator />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: isDark ? colors.dark.foreground : colors.light.foreground }]}>Checkbox & Switch</Text>
        <View style={styles.row}>
          <Checkbox
            checked={checkboxValue}
            onCheckedChange={setCheckboxValue}
          />
          <Text>Checkbox</Text>
        </View>
        <View style={styles.row}>
          <Switch
            value={switchValue}
            onValueChange={setSwitchValue}
          />
          <Text>Switch</Text>
        </View>
      </View>

      <Separator />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: isDark ? colors.dark.foreground : colors.light.foreground }]}>Select</Text>
        <Select
          value={selectValue}
          onValueChange={setSelectValue}
          placeholder="Select an option"
        >
          <Text>Option 1</Text>
          <Text>Option 2</Text>
          <Text>Option 3</Text>
        </Select>
      </View>

      <Separator />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: isDark ? colors.dark.foreground : colors.light.foreground }]}>Dropdown</Text>
        <Dropdown
          options={[
            { label: 'Apple', value: 'apple' },
            { label: 'Banana', value: 'banana' },
            { label: 'Orange', value: 'orange' },
          ]}
          value={dropdownValue}
          onSelect={setDropdownValue}
          placeholder="Select a fruit"
        />
      </View>

      <Separator />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: isDark ? colors.dark.foreground : colors.light.foreground }]}>Tabs</Text>
        <Tabs defaultValue="tab1" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            <TabsTrigger value="tab3">Tab 3</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">
            <Text>Content for Tab 1</Text>
          </TabsContent>
          <TabsContent value="tab2">
            <Text>Content for Tab 2</Text>
          </TabsContent>
          <TabsContent value="tab3">
            <Text>Content for Tab 3</Text>
          </TabsContent>
        </Tabs>
      </View>

      <Separator />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: isDark ? colors.dark.foreground : colors.light.foreground }]}>Accordion</Text>
        <Accordion>
          <AccordionItem title="Section 1" defaultOpen>
            <Text>Content for section 1</Text>
          </AccordionItem>
          <AccordionItem title="Section 2">
            <Text>Content for section 2</Text>
          </AccordionItem>
          <AccordionItem title="Section 3">
            <Text>Content for section 3</Text>
          </AccordionItem>
        </Accordion>
      </View>

      <Separator />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: isDark ? colors.dark.foreground : colors.light.foreground }]}>Modal</Text>
        <Button onPress={() => setModalVisible(true)}>Open Modal</Button>
        <Modal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
        >
          <Text style={styles.modalTitle}>Modal Title</Text>
          <Text>This is modal content</Text>
          <Button onPress={() => setModalVisible(false)}>Close</Button>
        </Modal>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666666',
  },
});
