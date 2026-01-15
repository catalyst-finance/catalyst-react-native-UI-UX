import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { BarChart3, AlertCircle, Target, TrendingUp, DollarSign, Sparkles, Package, ShoppingCart, Users, Shield, Handshake, Building, Tag, Presentation, Calendar, Scale, Landmark, Clock } from 'lucide-react';
import { eventTypeConfig, getEventTypeHexColor } from '../utils/formatting';
import { getCurrentTime } from '../utils/current-time';

// Event Type Icon Components mapping
const eventTypeIcons: Record<string, any> = {
  earnings: BarChart3,
  fda: AlertCircle,
  merger: Target,
  split: TrendingUp,
  dividend: DollarSign,
  launch: Sparkles,
  product: Package,
  capital_markets: DollarSign,
  legal: Scale,
  commerce_event: ShoppingCart,
  investor_day: Presentation,
  conference: Users,
  regulatory: Landmark,
  guidance_update: TrendingUp,
  partnership: Handshake,
  corporate: Building,
  pricing: Tag,
  defense_contract: Shield,
  guidance: TrendingUp
};

interface NewTodaySectionProps {
  preloadedEventsData: Record<string, MarketEvent[]>;
  onEventClick?: (event: MarketEvent) => void;
}

export function NewTodaySection({ preloadedEventsData, onEventClick }: NewTodaySectionProps) {
  // Get today's events (either occurred today or updated today)
  const now = getCurrentTime();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  // Collect all today's events across all tickers
  const todayEvents: MarketEvent[] = [];
  Object.keys(preloadedEventsData).forEach(ticker => {
    const tickerEvents = preloadedEventsData[ticker] || [];
    
    tickerEvents.forEach(event => {
      let isToday = false;
      
      // Check if event is scheduled for today BUT hasn't occurred yet
      if (event.actualDateTime) {
        const eventDate = new Date(event.actualDateTime);
        // Event must be today AND in the future (not past)
        if (eventDate >= todayStart && eventDate <= todayEnd && eventDate > now) {
          isToday = true;
        }
      }
      
      // Check if event was updated today (but only if it's not a past event)
      if (!isToday && event.updated_on) {
        const updatedDate = new Date(event.updated_on);
        if (updatedDate >= todayStart && updatedDate <= todayEnd) {
          // Only include if the event itself is upcoming, not past
          if (event.actualDateTime) {
            const eventDate = new Date(event.actualDateTime);
            if (eventDate > now) {
              isToday = true;
            }
          } else {
            // If no actualDateTime, include it (edge case)
            isToday = true;
          }
        }
      }
      
      if (isToday) {
        todayEvents.push(event);
      }
    });
  });

  // Sort by updated_on (most recent first), then by actualDateTime
  todayEvents.sort((a, b) => {
    const aUpdated = a.updated_on ? new Date(a.updated_on).getTime() : 0;
    const bUpdated = b.updated_on ? new Date(b.updated_on).getTime() : 0;
    if (aUpdated !== bUpdated) {
      return bUpdated - aUpdated; // Most recently updated first
    }
    const aTime = a.actualDateTime ? new Date(a.actualDateTime).getTime() : 0;
    const bTime = b.actualDateTime ? new Date(b.actualDateTime).getTime() : 0;
    return aTime - bTime;
  });

  if (todayEvents.length === 0) {
    return null;
  }

  // Format date for display
  const formatEventDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = getCurrentTime();
    
    // Calculate difference in months
    const monthsDiff = (date.getFullYear() - now.getFullYear()) * 12 + (date.getMonth() - now.getMonth());
    
    // If beyond 6 months, show quarter and year
    if (monthsDiff > 6 || monthsDiff < -6) {
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      const year = date.getFullYear();
      return `Q${quarter} ${year}`;
    }
    
    // Otherwise show full date
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  // Format time in user's timezone
  const formatEventTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  // Check if event is today
  const isEventToday = (dateStr: string | null) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    return date >= todayStart && date <= todayEnd;
  };

  // Determine events to display
  const displayedEvents = todayEvents; // Show all events by default
  
  return (
    <div>
      <div className="space-y-2">
        {displayedEvents.map((event) => {
          const eventType = (event.eventType || event.type || 'corporate') as string;
          const config = eventTypeConfig[eventType as keyof typeof eventTypeConfig] || eventTypeConfig.corporate;
          const IconComponent = eventTypeIcons[eventType] || Building;
          const isToday = isEventToday(event.actualDateTime);
          
          return (
            <div
              key={event.id}
              onClick={() => onEventClick?.(event)}
              className="bg-gradient-to-r from-gray-50 dark:from-gray-800/50 to-gray-100 dark:to-gray-800/80 rounded-lg p-3 cursor-pointer hover:bg-accent/30 transition-colors relative"
            >
              {/* Date/Time Badge - Top Right Corner */}
              <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs text-muted-foreground">
                {isToday ? (
                  <>
                    <Clock className="w-3 h-3" />
                    <span>{formatEventTime(event.actualDateTime)}</span>
                  </>
                ) : (
                  <>
                    <Calendar className="w-3 h-3" />
                    <span>{formatEventDate(event.actualDateTime)}</span>
                  </>
                )}
              </div>

              {/* Top row: Ticker Badge, Event Type Label */}
              <div className="flex items-center gap-2 mb-2 pr-20">
                {/* Ticker Badge */}
                <Badge className="bg-[rgb(0,0,0)] dark:bg-[rgb(0,0,0)] text-white text-xs rounded">
                  {event.symbol || event.ticker}
                </Badge>
                
                {/* Event Type Label */}
                <span className="text-xs text-muted-foreground text-[14px]">{config.label}</span>
              </div>
              
              {/* Event Type Icon and Title */}
              <div className="flex items-center gap-2">
                <div 
                  className="h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: getEventTypeHexColor(eventType) }}
                >
                  <IconComponent className="w-3.5 h-3.5 text-white" />
                </div>
                <p className="text-sm text-foreground">
                  {event.title || `${event.symbol || event.ticker} ${config.label}`}
                </p>
              </div>

              {/* AI Insight */}
              {event.aiInsight && (
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {event.aiInsight}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}