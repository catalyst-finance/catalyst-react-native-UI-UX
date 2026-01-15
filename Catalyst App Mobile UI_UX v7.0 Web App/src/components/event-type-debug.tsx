import React from 'react';
import { eventTypeConfig, getEventTypeHexColor, getEventTypeLabel } from '../utils/formatting';
import { Card } from './ui/card';

// Debug component to test event type color mapping
export function EventTypeDebug() {
  // Event types from your Supabase database
  const databaseEventTypes = [
    'product', 'earnings', 'investor_day', 'regulatory', 'guidance_update', 
    'conference', 'commerce_event', 'partnership', 'merger', 'legal', 
    'corporate', 'pricing', 'capital_markets', 'defense_contract', 'guidance'
  ];

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Event Type Color Mapping Test</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {databaseEventTypes.map(eventType => {
          const hexColor = getEventTypeHexColor(eventType);
          const label = getEventTypeLabel(eventType);
          const config = eventTypeConfig[eventType as keyof typeof eventTypeConfig];
          
          return (
            <div key={eventType} className="flex items-center gap-3 p-3 border rounded">
              <div 
                className="w-6 h-6 rounded-full border border-gray-300 flex-shrink-0"
                style={{ backgroundColor: hexColor }}
              />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{label}</div>
                <div className="text-xs text-muted-foreground truncate">{eventType}</div>
                <div className="text-xs text-muted-foreground font-mono">{hexColor}</div>
                {!config && <div className="text-xs text-red-500">⚠️ Missing</div>}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 p-4 bg-muted rounded">
        <h3 className="font-medium mb-2">Status Summary:</h3>
        <div className="text-sm space-y-1">
          <div>• Total configured event types: {Object.keys(eventTypeConfig).length}</div>
          <div>• Database event types: {databaseEventTypes.length}</div>
          <div>• Missing configs: {databaseEventTypes.filter(type => !eventTypeConfig[type as keyof typeof eventTypeConfig]).length}</div>
          <div className="text-green-600 mt-2">
            {databaseEventTypes.filter(type => !eventTypeConfig[type as keyof typeof eventTypeConfig]).length === 0 
              ? "✅ All database event types have color configurations!" 
              : "❌ Some event types are missing color configurations"
            }
          </div>
        </div>
      </div>
    </Card>
  );
}