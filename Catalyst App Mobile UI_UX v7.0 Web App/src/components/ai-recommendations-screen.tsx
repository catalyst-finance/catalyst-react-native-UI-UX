import { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowLeft, Sparkles, Activity, TrendingUp, Clock, DollarSign } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import DataService from '../utils/data-service';
import { MarketEvent } from '../utils/supabase/events-api';
import { getCurrentTime } from '../utils/current-time';

interface AIRecommendationsScreenProps {
  onBack: () => void;
  onEventClick: (event: MarketEvent) => void;
  portfolioTickers?: string[];
}

export function AIRecommendationsScreen({ onBack, onEventClick, portfolioTickers = [] }: AIRecommendationsScreenProps) {
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Scroll to top when screen opens
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    loadFDAEvents();
  }, []);

  const loadFDAEvents = async () => {
    try {
      setIsLoading(true);
      const allEvents = await DataService.getAllEvents();
      
      // Filter for FDA-related events
      const fdaEvents = allEvents.filter(event => 
        event.type.toLowerCase().includes('fda') || 
        event.title.toLowerCase().includes('fda') ||
        event.title.toLowerCase().includes('approval') ||
        event.type.toLowerCase().includes('approval')
      );
      
      setEvents(fdaEvents);
    } catch (error) {
      console.error('Error loading FDA events:', error);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1000000) {
      return `${(marketCap / 1000000).toFixed(1)}T`;
    } else if (marketCap >= 1000) {
      return `${(marketCap / 1000).toFixed(1)}B`;
    } else {
      return `${marketCap.toFixed(1)}M`;
    }
  };

  const getTimeUntilEvent = (eventDate: string) => {
    const now = getCurrentTime();
    const event = new Date(eventDate);
    const diffMs = event.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Past';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `${diffDays} days`;
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks`;
    return `${Math.ceil(diffDays / 30)} months`;
  };

  const getImpactBadge = (impact: number) => {
    if (impact > 0) {
      return <Badge className="bg-positive text-white">Bullish +{impact}</Badge>;
    } else if (impact < 0) {
      return <Badge className="bg-negative text-white">Bearish {impact}</Badge>;
    } else {
      return <Badge variant="outline">Neutral</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Activity className="w-8 h-8 animate-pulse text-ai-accent mx-auto mb-2" />
            <p className="text-muted-foreground">Loading FDA approval events...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-ai-accent to-ai-accent/80 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-semibold">FDA Approvals</h1>
              <p className="text-xs text-muted-foreground">AI-recommended biotech catalysts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="h-[calc(100vh-100px)]">
        <div className="p-4 space-y-4">
          {events.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No FDA Events Found</h3>
              <p className="text-muted-foreground text-sm">
                Check back later for new FDA approval opportunities.
              </p>
            </div>
          ) : (
            events.map((event) => (
              <Card 
                key={event.id} 
                className="overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onEventClick(event)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base mb-1">{event.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <span className="font-medium">{event.ticker}</span>
                        <span>•</span>
                        <span>{event.company}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {getImpactBadge(event.impactRating)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-muted-foreground">Time Until</div>
                        <div className="font-medium">
                          {event.actualDateTime ? getTimeUntilEvent(event.actualDateTime) : event.timeUntil || 'TBA'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-muted-foreground">Market Cap</div>
                        <div className="font-medium">{formatMarketCap(event.marketCap * 1000000)}</div>
                      </div>
                    </div>
                  </div>

                  {event.currentPrice && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Current Price</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">${event.currentPrice.toFixed(2)}</span>
                          {event.priceChangePercent && (
                            <span className={`text-sm ${event.priceChangePercent >= 0 ? 'text-positive' : 'text-negative'}`}>
                              {event.priceChangePercent >= 0 ? '+' : ''}{event.priceChangePercent.toFixed(2)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {event.aiInsight && (
                    <div className="mt-3 p-3 bg-ai-accent/5 border border-ai-accent/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-4 h-4 text-ai-accent" />
                        <span className="font-medium text-sm text-ai-accent">AI Insight</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{event.aiInsight}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}