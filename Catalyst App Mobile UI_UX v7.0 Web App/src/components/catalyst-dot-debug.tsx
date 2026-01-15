import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { StockChart } from './stock-chart';
import DataService from '../utils/data-service';
import { MarketEvent } from '../utils/supabase/events-api';
import { getEventTypeHexColor } from '../utils/formatting';

interface CatalystDotDebugProps {
  ticker?: string;
}

export function CatalystDotDebug({ ticker = 'AAPL' }: CatalystDotDebugProps) {
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState(ticker);
  const [stockData, setStockData] = useState<any>(null);
  const [chartDataTest, setChartDataTest] = useState<any[]>([]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 CatalystDotDebug: Starting comprehensive debug for', selectedTicker);
      
      // 1. Load events
      const tickerEvents = await DataService.getEventsByTicker(selectedTicker);
      console.log('📅 CatalystDotDebug: Events loaded:', tickerEvents);
      setEvents(tickerEvents);
      
      // 2. Load stock data
      const stock = await DataService.getStock(selectedTicker);
      console.log('📈 CatalystDotDebug: Stock data loaded:', stock);
      setStockData(stock);
      
      // 3. Test chart data mapping
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      const testData = [];
      
      for (let i = -60; i <= 0; i++) {
        const timestamp = now + (i * dayMs);
        const date = new Date(timestamp);
        
        // Find matching event for this date
        const matchingEvent = tickerEvents.find(event => {
          if (!event.actualDateTime) return false;
          const eventTime = new Date(event.actualDateTime).getTime();
          const eventDate = new Date(eventTime);
          eventDate.setHours(0, 0, 0, 0);
          date.setHours(0, 0, 0, 0);
          
          const timeDiff = Math.abs(eventDate.getTime() - date.getTime());
          const isWithinTimeWindow = timeDiff <= dayMs;
          const isPastEvent = eventTime <= now;
          
          return isWithinTimeWindow && isPastEvent;
        });
        
        testData.push({
          date: date.toISOString().split('T')[0],
          value: 100 + Math.random() * 20,
          timestamp,
          catalyst: matchingEvent,
          dayIndex: i
        });
      }
      
      const dataWithCatalysts = testData.filter(d => d.catalyst);
      console.log('🧪 CatalystDotDebug: Test chart data mapping:', {
        totalPoints: testData.length,
        pointsWithCatalysts: dataWithCatalysts.length,
        catalystDetails: dataWithCatalysts.map(d => ({
          date: d.date,
          eventTitle: d.catalyst?.title,
          eventType: d.catalyst?.type
        }))
      });
      
      setChartDataTest(dataWithCatalysts);
      
    } catch (error) {
      console.error('❌ CatalystDotDebug: Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedTicker]);

  const testTickers = ['AAPL', 'TSLA', 'NVDA', 'AMD', 'MSFT', 'GOOGL', 'META', 'AMZN'];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-medium">Catalyst Dot Debug</h1>
        <Button onClick={loadData} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Ticker Selector */}
      <Card className="p-4">
        <h2 className="font-medium mb-3">Select Ticker</h2>
        <div className="flex flex-wrap gap-2">
          {testTickers.map(t => (
            <Button
              key={t}
              variant={selectedTicker === t ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTicker(t)}
            >
              {t}
            </Button>
          ))}
        </div>
      </Card>

      {/* Events Summary */}
      <Card className="p-4">
        <h2 className="font-medium mb-3">Events for {selectedTicker}</h2>
        <div className="text-sm space-y-2">
          <div>Total events: {events.length}</div>
          <div>Events with dates: {events.filter(e => e.actualDateTime).length}</div>
          <div>Past events: {events.filter(e => e.actualDateTime && new Date(e.actualDateTime) <= new Date()).length}</div>
          <div>Future events: {events.filter(e => e.actualDateTime && new Date(e.actualDateTime) > new Date()).length}</div>
        </div>
        
        {events.slice(0, 3).map((event, index) => (
          <div key={index} className="mt-3 p-2 border rounded text-sm">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: getEventTypeHexColor(event.type) }}
              />
              <span className="font-medium">{event.title}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Date: {event.actualDateTime || 'No date'} | Type: {event.type}
            </div>
          </div>
        ))}
      </Card>

      {/* Chart Data Test */}
      <Card className="p-4">
        <h2 className="font-medium mb-3">Chart Data Mapping Test</h2>
        <div className="text-sm space-y-2">
          <div>Data points with catalysts: {chartDataTest.length}</div>
          {chartDataTest.map((point, index) => (
            <div key={index} className="text-xs border rounded p-2">
              <div>Date: {point.date}</div>
              <div>Event: {point.catalyst?.title}</div>
              <div>Type: {point.catalyst?.type}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Live Chart Test */}
      {stockData && (
        <Card className="p-4">
          <h2 className="font-medium mb-3">Live Chart Test</h2>
          <div className="text-sm mb-4">
            This chart should show catalyst dots if data flow is working correctly.
            Check browser console for detailed debug logs.
          </div>
          <StockChart 
            ticker={selectedTicker} 
            stockData={stockData} 
          />
        </Card>
      )}
    </div>
  );
}