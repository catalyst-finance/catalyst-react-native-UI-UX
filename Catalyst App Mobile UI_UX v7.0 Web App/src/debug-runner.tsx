import { useState, useEffect } from 'react';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import DataService from './utils/data-service';
import { MarketEvent } from './utils/supabase/events-api';
import EventsAPI from './utils/supabase/events-api';
import { supabase, CATALYST_TABLE } from './utils/supabase/client';
import { getEventTypeHexColor, getEventTypeLabel } from './utils/formatting';

export function DebugRunner() {
  const [debugResults, setDebugResults] = useState<any>({});
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState('');

  const runComprehensiveDebug = async () => {
    setIsRunning(true);
    const results: any = { steps: [] };

    try {
      // Step 1: Test direct Supabase connection
      setCurrentStep('Testing Supabase connection...');
      console.log('🔍 Debug Step 1: Testing direct Supabase connection');
      
      try {
        const { data: rawData, error: rawError } = await supabase
          .from(CATALYST_TABLE)
          .select('*')
          .limit(5);
        
        results.steps.push({
          name: 'Supabase Connection',
          success: !rawError,
          data: {
            error: rawError?.message,
            recordCount: rawData?.length || 0,
            sampleRecord: rawData?.[0]
          }
        });
        
        console.log('✅ Supabase connection result:', { error: rawError, count: rawData?.length });
      } catch (error) {
        results.steps.push({
          name: 'Supabase Connection',
          success: false,
          data: { error: String(error) }
        });
      }

      // Step 2: Test EventsAPI
      setCurrentStep('Testing EventsAPI...');
      console.log('🔍 Debug Step 2: Testing EventsAPI.getAllEvents()');
      
      try {
        const allEvents = await EventsAPI.getAllEvents();
        results.steps.push({
          name: 'EventsAPI.getAllEvents()',
          success: true,
          data: {
            eventCount: allEvents.length,
            sampleEvent: allEvents[0],
            eventsWithDates: allEvents.filter(e => e.actualDateTime).length,
            eventsWithoutDates: allEvents.filter(e => !e.actualDateTime).length
          }
        });
        
        console.log('✅ EventsAPI result:', { count: allEvents.length, sample: allEvents[0] });
      } catch (error) {
        results.steps.push({
          name: 'EventsAPI.getAllEvents()',
          success: false,
          data: { error: String(error) }
        });
      }

      // Step 3: Test DataService
      setCurrentStep('Testing DataService...');
      console.log('🔍 Debug Step 3: Testing DataService.getEventsByTicker()');
      
      const testTickers = ['AAPL', 'TSLA', 'NVDA'];
      for (const ticker of testTickers) {
        try {
          const tickerEvents = await DataService.getEventsByTicker(ticker);
          results.steps.push({
            name: `DataService.getEventsByTicker(${ticker})`,
            success: true,
            data: {
              ticker,
              eventCount: tickerEvents.length,
              events: tickerEvents,
              eventsWithDates: tickerEvents.filter(e => e.actualDateTime).length
            }
          });
          
          console.log(`✅ DataService ${ticker} result:`, { count: tickerEvents.length, events: tickerEvents });
        } catch (error) {
          results.steps.push({
            name: `DataService.getEventsByTicker(${ticker})`,
            success: false,
            data: { ticker, error: String(error) }
          });
        }
      }

      // Step 4: Test Chart Data Mapping
      setCurrentStep('Testing chart data mapping...');
      console.log('🔍 Debug Step 4: Testing chart data mapping logic');
      
      try {
        const aaplEvents = await DataService.getEventsByTicker('AAPL');
        
        // Simulate chart data mapping
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        const chartPoints = [];
        
        for (let i = -30; i <= 0; i++) {
          const timestamp = now + (i * dayMs);
          const date = new Date(timestamp);
          
          // Find matching event for this date
          const matchingEvent = aaplEvents.find(event => {
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
          
          chartPoints.push({
            date: date.toISOString().split('T')[0],
            timestamp,
            catalyst: matchingEvent,
            dayIndex: i
          });
        }
        
        const pointsWithCatalysts = chartPoints.filter(p => p.catalyst);
        
        results.steps.push({
          name: 'Chart Data Mapping',
          success: true,
          data: {
            totalDataPoints: chartPoints.length,
            pointsWithCatalysts: pointsWithCatalysts.length,
            catalystPoints: pointsWithCatalysts,
            aaplEventCount: aaplEvents.length,
            aaplEventsWithDates: aaplEvents.filter(e => e.actualDateTime).length
          }
        });
        
        console.log('✅ Chart mapping result:', {
          total: chartPoints.length,
          withCatalysts: pointsWithCatalysts.length,
          catalystDetails: pointsWithCatalysts
        });
      } catch (error) {
        results.steps.push({
          name: 'Chart Data Mapping',
          success: false,
          data: { error: String(error) }
        });
      }

      // Step 5: Analyze actualDateTime formats
      setCurrentStep('Analyzing actualDateTime formats...');
      console.log('🔍 Debug Step 5: Analyzing actualDateTime formats');
      
      try {
        const { data: dateAnalysis } = await supabase
          .from(CATALYST_TABLE)
          .select('actualDateTime, ticker, title')
          .not('actualDateTime', 'is', null)
          .limit(10);

        const dateFormats = dateAnalysis?.map(item => ({
          ticker: item.ticker,
          title: item.title,
          actualDateTime: item.actualDateTime,
          dateType: typeof item.actualDateTime,
          parsedDate: new Date(item.actualDateTime).toISOString(),
          isValidDate: !isNaN(new Date(item.actualDateTime).getTime())
        })) || [];

        results.steps.push({
          name: 'DateTime Format Analysis',
          success: true,
          data: {
            sampleDates: dateFormats,
            validDates: dateFormats.filter(d => d.isValidDate).length,
            invalidDates: dateFormats.filter(d => !d.isValidDate).length
          }
        });
        
        console.log('✅ DateTime analysis:', dateFormats);
      } catch (error) {
        results.steps.push({
          name: 'DateTime Format Analysis',
          success: false,
          data: { error: String(error) }
        });
      }

    } catch (globalError) {
      results.globalError = String(globalError);
    }

    setDebugResults(results);
    setIsRunning(false);
    setCurrentStep('');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-medium">Catalyst Dots Debug Runner</h1>
        <Button onClick={runComprehensiveDebug} disabled={isRunning}>
          {isRunning ? 'Running...' : 'Run Comprehensive Debug'}
        </Button>
      </div>

      {isRunning && (
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">
            Current step: {currentStep}
          </div>
        </Card>
      )}

      {debugResults.steps && (
        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="font-medium mb-3">Debug Results Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {debugResults.steps.map((step: any, index: number) => (
                <div 
                  key={index} 
                  className={`p-3 rounded border ${step.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
                >
                  <div className="font-medium text-sm">{step.name}</div>
                  <div className={`text-xs ${step.success ? 'text-green-600' : 'text-red-600'}`}>
                    {step.success ? '✅ Success' : '❌ Failed'}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {debugResults.steps.map((step: any, index: number) => (
            <Card key={index} className="p-4">
              <h3 className="font-medium mb-2">{step.name}</h3>
              <div className={`text-sm mb-2 ${step.success ? 'text-green-600' : 'text-red-600'}`}>
                Status: {step.success ? 'Success' : 'Failed'}
              </div>
              <div className="bg-muted p-3 rounded">
                <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(step.data, null, 2)}
                </pre>
              </div>
            </Card>
          ))}

          {debugResults.globalError && (
            <Card className="p-4 border-red-200 bg-red-50">
              <h3 className="font-medium text-red-800 mb-2">Global Error</h3>
              <p className="text-red-600 text-sm">{debugResults.globalError}</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}