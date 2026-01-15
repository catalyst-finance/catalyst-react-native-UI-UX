import React, { useState, useEffect } from 'react';
import DataService from './utils/data-service';
import { Button } from './components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';

export default function TestCompanyData() {
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runTest = async (symbol: string) => {
    setLoading(true);
    setResult(null);
    setError(null);
    
    try {
      console.log('🧪 Testing company data for:', symbol);
      
      // Clear cache first
      DataService.clearCache();
      console.log('🧪 Cache cleared');
      
      // Direct database check with timeout
      console.log('🧪 Checking database directly...');
      const { supabase } = await import('./utils/supabase/client');
      
      // Add timeout to prevent hanging
      const tableCheckPromise = supabase
        .from('company_information')
        .select('symbol, name, description')
        .limit(5);
        
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 10000)
      );
      
      const { data: tableCheck, error: tableError } = await Promise.race([
        tableCheckPromise,
        timeoutPromise
      ]) as any;
        
      console.log('🧪 Direct table check:', {
        error: tableError,
        dataCount: tableCheck?.length || 0,
        sampleData: tableCheck
      });
      
      // Fetch the stock data with timeout
      console.log('🧪 Fetching stock data...');
      const stockDataPromise = DataService.getStock(symbol);
      const stockTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Stock data fetch timeout')), 15000)
      );
      
      const stockData = await Promise.race([
        stockDataPromise,
        stockTimeoutPromise
      ]) as any;
      
      console.log('🧪 Stock data received:', stockData);
      
      setTestResults({
        symbol,
        stockData,
        hasDescription: !!stockData?.description,
        hasLogo: !!stockData?.logo,
        hasIndustry: !!stockData?.industry,
        description: stockData?.description?.substring(0, 200) + '...',
        logo: stockData?.logo,
        industry: stockData?.industry,
        employeeTotal: stockData?.employeeTotal,
        city: stockData?.city,
        state: stockData?.state,
        weburl: stockData?.weburl,
        lastUpdated: stockData?.lastUpdated
      });
    } catch (error) {
      console.error('🧪 Test error:', error);
      setTestResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Company Data Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => runTest('AAPL')} disabled={loading}>
              Test AAPL
            </Button>
            <Button onClick={() => runTest('TSLA')} disabled={loading}>
              Test TSLA
            </Button>
            <Button onClick={() => runTest('MSFT')} disabled={loading}>
              Test MSFT
            </Button>
            <Button onClick={() => runTest('GOOGL')} disabled={loading}>
              Test GOOGL
            </Button>
            <Button 
              onClick={() => DataService.clearCache()} 
              variant="outline"
              disabled={loading}
            >
              Clear Cache
            </Button>
          </div>

          {loading && (
            <div className="text-center py-8">
              <p>Loading company data...</p>
            </div>
          )}

          {testResults && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold">Test Results for {testResults.symbol}</h3>
              
              {testResults.error ? (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  Error: {testResults.error}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <strong>Has Description:</strong> {testResults.hasDescription ? '✅ Yes' : '❌ No'}
                    </div>
                    <div>
                      <strong>Has Logo:</strong> {testResults.hasLogo ? '✅ Yes' : '❌ No'}
                    </div>
                    <div>
                      <strong>Has Industry:</strong> {testResults.hasIndustry ? '✅ Yes' : '❌ No'}
                    </div>
                    <div>
                      <strong>Employee Count:</strong> {testResults.employeeTotal || 'N/A'}
                    </div>
                    <div>
                      <strong>Location:</strong> {testResults.city && testResults.state ? `${testResults.city}, ${testResults.state}` : 'N/A'}
                    </div>
                    <div>
                      <strong>Last Updated:</strong> {testResults.lastUpdated || 'N/A'}
                    </div>
                  </div>

                  {testResults.description && (
                    <div>
                      <strong>Description:</strong>
                      <p className="mt-2 text-sm text-gray-600">{testResults.description}</p>
                    </div>
                  )}

                  {testResults.logo && (
                    <div>
                      <strong>Logo URL:</strong>
                      <p className="mt-2 text-sm text-gray-600">{testResults.logo}</p>
                      <img src={testResults.logo} alt="Company logo" className="mt-2 w-16 h-16 object-contain border rounded" />
                    </div>
                  )}

                  {testResults.weburl && (
                    <div>
                      <strong>Website:</strong>
                      <a href={testResults.weburl} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:underline">
                        {testResults.weburl}
                      </a>
                    </div>
                  )}

                  <div className="mt-4 p-4 bg-gray-100 rounded">
                    <strong>Data Source Determination:</strong>
                    <p className="mt-2">
                      Based on the logic in stock-info-screen.tsx, this data would be classified as: 
                      <span className="font-semibold ml-2">
                        {(testResults.hasDescription || testResults.hasLogo || testResults.hasIndustry) ? 
                          '🟢 Real Company Data' : 
                          '🔴 Mock Data'
                        }
                      </span>
                    </p>
                  </div>

                  <details className="mt-4">
                    <summary className="cursor-pointer font-semibold">Raw Data</summary>
                    <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
                      {JSON.stringify(testResults.stockData, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}