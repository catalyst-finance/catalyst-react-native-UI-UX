import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';

export function TestDigitalOceanChat() {
  const [status, setStatus] = useState('Click to test');
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');

  const testEndpoint = async () => {
    setStatus('Testing...');
    setResponse('');
    setError('');

    try {
      console.log('🧪 Testing DigitalOcean endpoint...');
      
      // First, test health endpoint
      console.log('Testing health endpoint...');
      const healthResponse = await fetch('https://catalyst-copilot-2nndy.ondigitalocean.app/health', {
        method: 'GET',
      });
      
      console.log('Health response status:', healthResponse.status);
      const healthData = await healthResponse.json();
      console.log('Health data:', healthData);
      
      setStatus(`Health check: ${healthResponse.ok ? '✅ OK' : '❌ FAILED'}`);
      setResponse(JSON.stringify(healthData, null, 2));

      // Now test chat endpoint
      console.log('Testing chat endpoint...');
      const chatResponse = await fetch('https://catalyst-copilot-2nndy.ondigitalocean.app/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'What is the current price of AAPL?',
          conversationHistory: [],
          selectedTickers: ['AAPL']
        })
      });

      console.log('Chat response status:', chatResponse.status);
      const chatData = await chatResponse.json();
      console.log('Chat data:', chatData);

      setStatus(`Chat test: ${chatResponse.ok ? '✅ OK' : '❌ FAILED'}`);
      setResponse(prev => prev + '\n\n--- CHAT RESPONSE ---\n' + JSON.stringify(chatData, null, 2));

    } catch (err) {
      console.error('❌ Test failed:', err);
      setError(err instanceof Error ? err.message : String(err));
      setStatus('❌ Failed - see error below');
    }
  };

  return (
    <Card className="fixed top-20 right-4 w-96 max-h-[80vh] overflow-hidden flex flex-col z-50">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold">DigitalOcean Endpoint Test</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Testing: https://catalyst-copilot-2nndy.ondigitalocean.app
        </p>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium mb-2">Status:</div>
            <div className="text-sm text-muted-foreground">{status}</div>
          </div>

          {error && (
            <div>
              <div className="text-sm font-medium mb-2 text-destructive">Error:</div>
              <div className="text-xs text-destructive bg-destructive/10 p-2 rounded font-mono">
                {error}
              </div>
            </div>
          )}

          {response && (
            <div>
              <div className="text-sm font-medium mb-2">Response:</div>
              <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                {response}
              </pre>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-border">
        <Button onClick={testEndpoint} className="w-full">
          Run Test
        </Button>
      </div>
    </Card>
  );
}
