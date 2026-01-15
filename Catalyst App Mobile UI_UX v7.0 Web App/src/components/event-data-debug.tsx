import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import DataService from '../utils/data-service';
import { getCurrentTimestamp } from '../utils/current-time';

interface EventDataDebugProps {
  ticker?: string;
}

export function EventDataDebug({ ticker = 'TSLA' }: EventDataDebugProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEventData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log(`🔍 EventDataDebug: Fetching events for ${ticker}`);
      const fetchedEvents = await DataService.getEventsByTicker(ticker);
      console.log(`🔍 EventDataDebug: Raw events fetched:`, fetchedEvents);
      
      // Group events by title to see duplicates
      const eventsByTitle = fetchedEvents.reduce((acc: any, event) => {
        if (!acc[event.title]) {
          acc[event.title] = [];
        }
        acc[event.title].push(event);
        return acc;
      }, {});
      
      console.log(`🔍 EventDataDebug: Events grouped by title:`, eventsByTitle);
      
      setEvents(fetchedEvents);
    } catch (err) {
      console.error('EventDataDebug error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();
  }, [ticker]);

  const now = getCurrentTimestamp();

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-4">
        <h1 className="text-[20px] font-medium">Event Data Debug - {ticker}</h1>
        <Button onClick={fetchEventData} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          Error: {error}
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-card border rounded-lg p-4">
          <h2 className="font-medium mb-2">Summary</h2>
          <div className="text-sm space-y-1">
            <div>Total Events: {events.length}</div>
            <div>Past Events: {events.filter(e => e.actualDateTime && new Date(e.actualDateTime).getTime() <= now).length}</div>
            <div>Future Events: {events.filter(e => e.actualDateTime && new Date(e.actualDateTime).getTime() > now).length}</div>
            <div>Events Without Date: {events.filter(e => !e.actualDateTime).length}</div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <h2 className="font-medium mb-2">Suspicious Events (2025 events with multiple occurrences)</h2>
          <div className="space-y-2">
            {events
              .filter(event => event.title?.includes('2025'))
              .map((event, index) => (
                <div key={index} className="text-xs bg-yellow-50 border border-yellow-200 rounded p-3">
                  <div><strong>Title:</strong> {event.title}</div>
                  <div><strong>ID:</strong> {event.id}</div>
                  <div><strong>actualDateTime:</strong> {event.actualDateTime || 'N/A'}</div>
                  <div><strong>Date Parsed:</strong> {event.actualDateTime ? new Date(event.actualDateTime).toISOString() : 'N/A'}</div>
                  <div><strong>Is Past:</strong> {event.actualDateTime ? (new Date(event.actualDateTime).getTime() <= now ? 'YES' : 'NO') : 'N/A'}</div>
                  <div><strong>Type:</strong> {event.type}</div>
                </div>
              ))
            }
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <h2 className="font-medium mb-2">All Events</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.map((event, index) => {
              const isPast = event.actualDateTime ? new Date(event.actualDateTime).getTime() <= now : null;
              return (
                <div key={index} className={`text-xs border rounded p-3 ${
                  isPast === true ? 'bg-blue-50 border-blue-200' : 
                  isPast === false ? 'bg-green-50 border-green-200' : 
                  'bg-gray-50 border-gray-200'
                }`}>
                  <div><strong>Title:</strong> {event.title}</div>
                  <div><strong>ID:</strong> {event.id}</div>
                  <div><strong>actualDateTime:</strong> {event.actualDateTime || 'N/A'}</div>
                  {event.actualDateTime && (
                    <>
                      <div><strong>Parsed Date:</strong> {new Date(event.actualDateTime).toLocaleDateString()}</div>
                      <div><strong>Year:</strong> {new Date(event.actualDateTime).getFullYear()}</div>
                      <div><strong>Is Past:</strong> {isPast ? 'YES' : 'NO'}</div>
                    </>
                  )}
                  <div><strong>Type:</strong> {event.type}</div>
                  <div><strong>Impact:</strong> {event.impactRating}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}