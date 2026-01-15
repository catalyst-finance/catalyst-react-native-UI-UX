import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import DataService from '../utils/data-service';
import { MarketEvent } from '../utils/supabase/events-api';
import EventsAPI from '../utils/supabase/events-api';
import { supabase, CATALYST_TABLE } from '../utils/supabase/client';
import { getEventTypeHexColor, getEventTypeLabel } from '../utils/formatting';

interface CatalystDebugProps {
  ticker?: string;
}

export function CatalystDebug({ ticker = 'AAPL' }: CatalystDebugProps) {
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [allEvents, setAllEvents] = useState<MarketEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicker, setSelectedTicker] = useState(ticker);
  const [rawDatabaseData, setRawDatabaseData] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>('unknown');

  const loadEvents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('🔍 Debug: Starting comprehensive event debug...');
      
      // Test direct Supabase connection
      console.log('🔗 Debug: Testing direct Supabase connection...');
      setConnectionStatus('testing...');
      
      try {
        const { data: rawData, error: rawError } = await supabase
          .from(CATALYST_TABLE)
          .select('*')
          .limit(10);
        
        if (rawError) {
          console.error('💥 Debug: Direct Supabase query failed:', rawError);
          setConnectionStatus(`error: ${rawError.message}`);
        } else {
          console.log('✅ Debug: Direct Supabase query successful:', rawData);
          setConnectionStatus(`connected (${rawData?.length || 0} records found)`);
          setRawDatabaseData(rawData || []);
        }
      } catch (directError) {
        console.error('💥 Debug: Direct Supabase connection failed:', directError);
        setConnectionStatus(`failed: ${directError}`);
      }

      // Test EventsAPI directly  
      console.log('🎯 Debug: Testing EventsAPI.getAllEvents()...');
      try {
        const directEvents = await EventsAPI.getAllEvents();
        console.log('🎯 Debug: Direct EventsAPI result:', {
          count: directEvents.length,
          sample: directEvents.slice(0, 3)
        });
      } catch (apiError) {
        console.error('💥 Debug: EventsAPI.getAllEvents() failed:', apiError);
      }

      console.log('🔍 Debug: Loading events for ticker:', selectedTicker);
      
      // Get events for specific ticker
      const tickerEvents = await DataService.getEventsByTicker(selectedTicker);
      console.log('📊 Debug: Events for ticker result:', {
        ticker: selectedTicker,
        count: tickerEvents.length,
        events: tickerEvents
      });
      
      // Get all events to see what's available
      const allEventsData = await DataService.getAllEvents();
      console.log('🌐 Debug: All events result:', {
        totalCount: allEventsData.length,
        events: allEventsData.slice(0, 5) // Show first 5 for debugging
      });
      
      setEvents(tickerEvents);
      setAllEvents(allEventsData);
    } catch (err) {
      console.error('❌ Debug: Error loading events:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [selectedTicker]);

  const testTickers = ['AAPL', 'TSLA', 'NVDA', 'AMD', 'MSFT', 'GOOGL', 'META', 'AMZN'];

  // Test chart data mapping specifically
  const testChartDataMapping = () => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    console.log('🔍 Chart Data Mapping Test:');
    console.log('Events for chart mapping:', events);
    
    // Simulate chart data points
    const mockChartData = [];
    for (let i = -30; i <= 0; i++) {
      const timestamp = now + (i * dayMs);
      const date = new Date(timestamp);
      
      // Check if any events match this date
      const matchingEvent = events.find(event => {
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
      
      if (matchingEvent) {
        // Event found for this date
      }
      
      mockChartData.push({
        date: date.toISOString().split('T')[0],
        value: 100 + Math.random() * 20,
        timestamp,
        catalyst: matchingEvent,
        dayIndex: i
      });
    }
    
    const pointsWithCatalysts = mockChartData.filter(point => point.catalyst);
    console.log(`📊 Chart mapping result: ${pointsWithCatalysts.length} data points with catalysts out of ${mockChartData.length} total points`);
    console.log('Points with catalysts:', pointsWithCatalysts);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-medium">Catalyst Debug Tool</h1>
        <div className="flex gap-2">
          <Button onClick={testChartDataMapping} disabled={isLoading} variant="outline" size="sm">
            Test Chart Mapping
          </Button>
          <Button onClick={loadEvents} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Ticker Selector */}
      <Card className="p-4">
        <h2 className="font-medium mb-3">Select Ticker to Debug</h2>
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

      {/* Connection Status */}
      <Card className="p-4">
        <h2 className="font-medium mb-3">Connection Status</h2>
        <div className="text-sm">
          <strong>Supabase Connection:</strong> {connectionStatus}
        </div>
      </Card>

      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <h3 className="font-medium text-red-800 mb-2">Error</h3>
          <p className="text-red-600 text-sm">{error}</p>
        </Card>
      )}

      {/* Raw Database Data */}
      {rawDatabaseData.length > 0 && (
        <Card className="p-4">
          <h2 className="font-medium mb-3">
            Raw Database Data ({rawDatabaseData.length} records sampled)
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {rawDatabaseData.slice(0, 5).map((record, index) => (
              <div key={index} className="border rounded p-3 text-xs">
                <pre className="whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(record, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Events for Selected Ticker */}
      <Card className="p-4">
        <h2 className="font-medium mb-3">
          Events for {selectedTicker} ({events.length} found)
        </h2>
        {events.length === 0 ? (
          <p className="text-muted-foreground text-sm">No events found for this ticker</p>
        ) : (
          <div className="space-y-3">
            {events.slice(0, 10).map((event, index) => (
              <div key={event.id || index} className="border rounded p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full border" 
                    style={{ backgroundColor: getEventTypeHexColor(event.type) }}
                  />
                  <span className="font-medium">{event.title}</span>
                  <span className="text-sm text-muted-foreground">
                    ({getEventTypeLabel(event.type)})
                  </span>
                </div>
                <div className="text-sm space-y-1">
                  <div><strong>Ticker:</strong> {event.ticker}</div>
                  <div><strong>Company:</strong> {event.company}</div>
                  <div><strong>Type:</strong> {event.type}</div>
                  <div><strong>Time:</strong> {event.time}</div>
                  <div><strong>DateTime:</strong> {event.actualDateTime || 'Not set'}</div>
                  <div><strong>Impact:</strong> {event.impactRating} ({event.confidence}% confidence)</div>
                  <div className="text-xs text-muted-foreground">
                    <strong>ID:</strong> {event.id}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <strong>AI Insight:</strong> {event.aiInsight.substring(0, 100)}...
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* All Events Summary */}
      <Card className="p-4">
        <h2 className="font-medium mb-3">
          Database Summary ({allEvents.length} total events)
        </h2>
        {allEvents.length === 0 ? (
          <p className="text-muted-foreground text-sm">No events found in database</p>
        ) : (
          <div className="space-y-3">
            {/* Event Type Breakdown */}
            <div>
              <h3 className="font-medium mb-2">Event Types:</h3>
              <div className="text-sm space-y-1">
                {Object.entries(
                  allEvents.reduce((acc, event) => {
                    acc[event.type] = (acc[event.type] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: getEventTypeHexColor(type) }}
                    />
                    <span>{getEventTypeLabel(type)}: {count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ticker Breakdown */}
            <div>
              <h3 className="font-medium mb-2">Top Tickers:</h3>
              <div className="text-sm">
                {Object.entries(
                  allEvents.reduce((acc, event) => {
                    acc[event.ticker] = (acc[event.ticker] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                )
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([ticker, count]) => (
                  <div key={ticker}>
                    <span className="font-medium">{ticker}:</span> {count}
                  </div>
                ))}
              </div>
            </div>

            {/* Sample Events */}
            <div>
              <h3 className="font-medium mb-2">Sample Events:</h3>
              <div className="space-y-2">
                {allEvents.slice(0, 3).map((event, index) => (
                  <div key={event.id || index} className="text-sm border rounded p-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: getEventTypeHexColor(event.type) }}
                      />
                      <span className="font-medium">{event.ticker}</span>
                      <span>{event.title}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {event.actualDateTime || 'No date'} • {getEventTypeLabel(event.type)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Chart Data Analysis */}
      <Card className="p-4">
        <h2 className="font-medium mb-3">Chart Data Analysis for {selectedTicker}</h2>
        <div className="text-sm space-y-2">
          <div>
            <strong>Events with valid actualDateTime:</strong> {
              events.filter(e => e.actualDateTime).length
            }
          </div>
          <div>
            <strong>Past events (before now):</strong> {
              events.filter(e => {
                if (!e.actualDateTime) return false;
                return new Date(e.actualDateTime) <= new Date();
              }).length
            }
          </div>
          <div>
            <strong>Future events (after now):</strong> {
              events.filter(e => {
                if (!e.actualDateTime) return false;
                return new Date(e.actualDateTime) > new Date();
              }).length
            }
          </div>
          <div>
            <strong>Events without dates:</strong> {
              events.filter(e => !e.actualDateTime).length
            }
          </div>
        </div>
      </Card>
    </div>
  );
}