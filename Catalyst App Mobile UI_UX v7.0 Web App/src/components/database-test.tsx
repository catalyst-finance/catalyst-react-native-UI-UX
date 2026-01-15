import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { supabase, CATALYST_TABLE } from '../utils/supabase/client';

export function DatabaseTest() {
  const [testResults, setTestResults] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);

  const runTests = async () => {
    setIsLoading(true);
    const results: any = {};
    
    try {
      // Test 1: Basic connection
      console.log('Test 1: Basic Supabase connection...');
      const { data: healthData, error: healthError } = await supabase
        .from(CATALYST_TABLE)
        .select('count')
        .limit(1);
      
      results.connection = {
        success: !healthError,
        error: healthError?.message,
        data: healthData
      };

      // Test 2: Count total records
      console.log('Test 2: Count total records...');
      const { count, error: countError } = await supabase
        .from(CATALYST_TABLE)
        .select('*', { count: 'exact', head: true });
        
      results.totalCount = {
        success: !countError,
        count: count,
        error: countError?.message
      };

      // Test 3: Sample records
      console.log('Test 3: Get sample records...');
      const { data: sampleData, error: sampleError } = await supabase
        .from(CATALYST_TABLE)
        .select('*')
        .limit(5);
        
      results.sampleRecords = {
        success: !sampleError,
        data: sampleData,
        error: sampleError?.message
      };

      // Test 4: Get unique tickers
      console.log('Test 4: Get unique tickers...');
      const { data: tickerData, error: tickerError } = await supabase
        .from(CATALYST_TABLE)
        .select('ticker')
        .not('ticker', 'is', null)
        .limit(20);
        
      const uniqueTickers = [...new Set(tickerData?.map(item => item.ticker) || [])];
      results.uniqueTickers = {
        success: !tickerError,
        tickers: uniqueTickers,
        error: tickerError?.message
      };

      // Test 5: Get events for specific ticker (AAPL)
      console.log('Test 5: Get events for AAPL...');
      const { data: aaplData, error: aaplError } = await supabase
        .from(CATALYST_TABLE)
        .select('*')
        .eq('ticker', 'AAPL');
        
      results.aaplEvents = {
        success: !aaplError,
        count: aaplData?.length || 0,
        data: aaplData,
        error: aaplError?.message
      };

      // Test 6: Check data types in events
      if (sampleData && sampleData.length > 0) {
        const firstEvent = sampleData[0];
        results.dataTypes = {
          sample: firstEvent,
          hasActualDateTime: !!firstEvent.actualDateTime,
          actualDateTimeValue: firstEvent.actualDateTime,
          actualDateTimeType: typeof firstEvent.actualDateTime
        };
      }

    } catch (error) {
      results.globalError = error;
      console.error('Global test error:', error);
    }

    setTestResults(results);
    setIsLoading(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-medium">Database Test</h1>
        <Button onClick={runTests} disabled={isLoading}>
          {isLoading ? 'Running Tests...' : 'Run Tests'}
        </Button>
      </div>

      {Object.keys(testResults).length > 0 && (
        <Card className="p-4">
          <h2 className="font-medium mb-3">Test Results</h2>
          <div className="space-y-4">
            {Object.entries(testResults).map(([testName, result]: [string, any]) => (
              <div key={testName} className="border rounded p-3">
                <h3 className="font-medium mb-2">{testName}</h3>
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}