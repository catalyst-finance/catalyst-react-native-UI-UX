import { useEffect, useState } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function TestChatEndpoint() {
  const [status, setStatus] = useState<string>('Testing...');

  useEffect(() => {
    const testEndpoint = async () => {
      try {
        // Test the chat endpoint
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-338c4fc3/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            message: 'test',
            conversationHistory: [],
            selectedTickers: []
          })
        });

        const text = await response.text();
        console.log('Chat endpoint response:', response.status, text);
        setStatus(`Status: ${response.status} - ${text.substring(0, 100)}`);
      } catch (error) {
        console.error('Test error:', error);
        setStatus(`Error: ${error}`);
      }
    };

    testEndpoint();
  }, []);

  return (
    <div className="fixed top-20 left-4 bg-background border border-border p-4 rounded-lg shadow-lg z-50 max-w-md">
      <h3 className="font-semibold mb-2">Chat Endpoint Test</h3>
      <p className="text-xs text-muted-foreground">{status}</p>
      <p className="text-xs text-muted-foreground mt-2">
        Endpoint: https://{projectId}.supabase.co/functions/v1/make-server-338c4fc3/chat
      </p>
    </div>
  );
}
