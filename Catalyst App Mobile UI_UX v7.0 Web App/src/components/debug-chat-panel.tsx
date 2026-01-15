import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Card } from './ui/card';
import { Button } from './ui/button';

export function DebugChatPanel() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isTestRunning, setIsTestRunning] = useState(false);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    console.log(message);
  };

  const testEndpoint = async () => {
    setLogs([]);
    setIsTestRunning(true);
    
    try {
      addLog('🔍 Starting comprehensive endpoint test...');
      addLog(`📍 Project ID: ${projectId}`);
      addLog(`🔑 Anon Key (first 20 chars): ${publicAnonKey.substring(0, 20)}...`);
      
      // Test 1: Health endpoint
      addLog('');
      addLog('Test 1: Health endpoint');
      const healthUrl = `https://${projectId}.supabase.co/functions/v1/make-server-fe0a490e/health`;
      addLog(`URL: ${healthUrl}`);
      
      try {
        const healthResponse = await fetch(healthUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        });
        addLog(`✅ Health status: ${healthResponse.status} ${healthResponse.statusText}`);
        const healthData = await healthResponse.text();
        addLog(`Health response: ${healthData}`);
      } catch (error) {
        addLog(`❌ Health check failed: ${error}`);
      }

      // Test 2: Test endpoint
      addLog('');
      addLog('Test 2: Test endpoint');
      const testUrl = `https://${projectId}.supabase.co/functions/v1/make-server-fe0a490e/test`;
      addLog(`URL: ${testUrl}`);
      
      try {
        const testResponse = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        });
        addLog(`✅ Test status: ${testResponse.status} ${testResponse.statusText}`);
        const testData = await testResponse.text();
        addLog(`Test response: ${testData}`);
      } catch (error) {
        addLog(`❌ Test endpoint failed: ${error}`);
      }

      // Test 3: Chat endpoint OPTIONS (CORS preflight)
      addLog('');
      addLog('Test 3: Chat OPTIONS (CORS preflight)');
      const chatUrl = 'https://catalyst-copilot-2nndy.ondigitalocean.app/chat';
      addLog(`URL: ${chatUrl}`);
      
      try {
        const optionsResponse = await fetch(chatUrl, {
          method: 'OPTIONS',
          headers: {
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type, Authorization',
            'Origin': window.location.origin
          }
        });
        addLog(`✅ OPTIONS status: ${optionsResponse.status} ${optionsResponse.statusText}`);
        addLog(`CORS headers: ${JSON.stringify([...optionsResponse.headers.entries()])}`);
      } catch (error) {
        addLog(`❌ OPTIONS request failed: ${error}`);
      }

      // Test 4: Chat endpoint POST
      addLog('');
      addLog('Test 4: Chat POST request');
      addLog(`URL: ${chatUrl}`);
      
      const requestBody = {
        message: 'test',
        conversationHistory: [],
        selectedTickers: []
      };
      addLog(`Request body: ${JSON.stringify(requestBody)}`);
      
      try {
        const chatResponse = await fetch(chatUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify(requestBody)
        });
        
        addLog(`✅ Chat status: ${chatResponse.status} ${chatResponse.statusText}`);
        addLog(`Response headers: ${JSON.stringify([...chatResponse.headers.entries()])}`);
        
        const chatData = await chatResponse.text();
        addLog(`Chat response: ${chatData.substring(0, 500)}`);
      } catch (error) {
        addLog(`❌ Chat POST failed: ${error}`);
        if (error instanceof TypeError) {
          addLog(`TypeError details: ${error.message}`);
          addLog(`This usually indicates a CORS or network connectivity issue`);
        }
      }

      addLog('');
      addLog('✅ Test complete!');
      
    } catch (error) {
      addLog(`❌ Unexpected error: ${error}`);
    } finally {
      setIsTestRunning(false);
    }
  };

  return (
    <Card className="fixed top-16 left-4 right-4 max-w-2xl z-50 max-h-[70vh] overflow-hidden flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold">Chat Endpoint Debug Panel</h3>
        <Button 
          size="sm" 
          onClick={testEndpoint}
          disabled={isTestRunning}
        >
          {isTestRunning ? 'Testing...' : 'Run Test'}
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 bg-muted/30 font-mono text-xs space-y-1">
        {logs.length === 0 && (
          <div className="text-muted-foreground text-center py-8">
            Click "Run Test" to start debugging
          </div>
        )}
        {logs.map((log, index) => (
          <div 
            key={index} 
            className={`
              ${log.includes('❌') ? 'text-destructive' : ''}
              ${log.includes('✅') ? 'text-positive' : ''}
              ${log.includes('🔍') || log.includes('Test') ? 'font-semibold' : ''}
            `}
          >
            {log}
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-border bg-muted/50 text-xs text-muted-foreground">
        <div>New chat URL: https://catalyst-copilot-2nndy.ondigitalocean.app/chat</div>
        <div className="mt-1">Check browser console (F12) for additional network errors</div>
      </div>
    </Card>
  );
}