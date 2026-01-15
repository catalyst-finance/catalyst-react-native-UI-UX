import { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

import { 
  Search, 
  TrendingUp, 
  Clock, 
  Sparkles, 
  Filter,
  Calendar,
  DollarSign,
  BarChart3,
  Loader2,
  ChevronDown,
  X,
  ArrowLeft,
  AlertCircle,
  Target,
  Users,
  Package,
  ShoppingCart,
  Shield,
  Handshake,
  Building,
  Tag,
  Presentation,
  Scale,
  Landmark
} from 'lucide-react';
import DataService from '../utils/data-service';
import { MarketEvent } from '../utils/supabase/events-api';
import { eventTypeConfig, formatImpactRating, getImpactColor, formatCurrency, formatMarketCap } from '../utils/formatting';
import { getCurrentTime } from '../utils/current-time';

interface SectorTrend {
  sector: string;
  catalysts: number;
  avgImpact: number;
  trend: 'up' | 'down' | 'flat';
}

// Event Type Icon Components (imported from lucide-react)
const eventTypeIcons = {
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

const popularSearches = [
  'Earnings', 'FDA approvals', 'Stock splits', 'Merger rumors', 'Product launches'
];

interface DiscoveryScreenProps {
  onTickerClick: (ticker: string) => void;
  onEventClick?: (event: MarketEvent) => void;
  onAIRecommendationsClick?: () => void;
  selectedTickers?: string[];
  onAddTicker?: (ticker: string) => void;
}

// Add stock data interface for search results
interface StockSearchResult {
  symbol: string;
  company: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  marketCap: string;
  industry: string; // Use industry instead of sector
}

export function DiscoveryScreen({ onTickerClick, onEventClick, onAIRecommendationsClick, selectedTickers, onAddTicker }: DiscoveryScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [searchResults, setSearchResults] = useState<MarketEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isAiRecommendationsOpen, setIsAiRecommendationsOpen] = useState(false);
  const [matchedStock, setMatchedStock] = useState<StockSearchResult | null>(null);

  // Load events from database - get more events for better diversity in trending catalysts
  useEffect(() => {
    const loadEvents = async () => {
      try {
        setIsLoading(true);
        // Get all events for maximum diversity
        const eventData = await DataService.getAllEvents();
        setEvents(eventData);
      } catch (error) {
        console.error('Error loading events:', error);
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, []);

  // Map popular searches to better search terms
  const mapSearchQuery = (query: string): string => {
    const queryLower = query.toLowerCase();
    const searchMappings: Record<string, string> = {
      'earnings': 'earnings',
      'fda approvals': 'fda',
      'fda approval': 'fda',
      'stock splits': 'split',
      'merger rumors': 'merger',
      'product launches': 'launch',
      'product launch': 'launch'
    };
    
    return searchMappings[queryLower] || query;
  };

  // Handle search
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setMatchedStock(null);
        setIsSearching(false);
        return;
      }

      try {
        setIsSearching(true);
        
        // Try to search for stocks by ticker OR company name using DataService.searchStocks
        // This will handle fuzzy matching and misspellings
        try {
          const stockSearchResults = await DataService.searchStocks(searchQuery.trim(), 5);
          
          // If we found stock results, use the first/best match
          if (stockSearchResults.length > 0) {
            const bestMatch = stockSearchResults[0];
            setMatchedStock({
              symbol: bestMatch.symbol,
              company: bestMatch.company,
              currentPrice: bestMatch.currentPrice,
              priceChange: bestMatch.priceChange,
              priceChangePercent: bestMatch.priceChangePercent,
              marketCap: bestMatch.marketCap,
              industry: bestMatch.industry || bestMatch.sector // Prefer industry, fallback to sector
            });
            console.log('✅ Found stock match:', bestMatch.symbol, bestMatch.company);
          } else {
            setMatchedStock(null);
          }
        } catch (error) {
          console.error('❌ Error searching stocks:', error);
          setMatchedStock(null);
        }
        
        // Map the search query to better terms if it's a popular search
        const mappedQuery = mapSearchQuery(searchQuery);
        
        let results = await DataService.searchEvents(mappedQuery);
        
        // If no results with mapped query, try original query
        if (results.length === 0 && mappedQuery !== searchQuery) {
          results = await DataService.searchEvents(searchQuery);
        }
        
        // If still no results, try partial matches
        if (results.length === 0) {
          results = events.slice(0, 3); // Show some events as fallback
        }
        
        setSearchResults(results);
      } catch (error) {
        console.error('❌ Error searching events:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, events]);

  // Scroll to top when filter changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeFilter]);

  // Convert events to trending catalysts format - show diverse events from all stocks
  const getTrendingCatalysts = () => {
    const now = getCurrentTime();
    const upcomingEvents = events.filter(event => {
      if (!event.actualDateTime) {
        return true;
      }
      
      const eventDate = new Date(event.actualDateTime);
      const isUpcoming = eventDate > now;
      
      return isUpcoming;
    });
    
    // Randomize and take more events for better diversity
    const shuffledEvents = [...upcomingEvents].sort(() => Math.random() - 0.5);
    const selectedEvents = shuffledEvents.slice(0, 20); // Increased from 6 to 20 for more diversity
    
    return selectedEvents.map(event => ({
      ...event,
      sentiment: event.impactRating > 0 ? 'bullish' as const : 
                event.impactRating < 0 ? 'bearish' as const : 'neutral' as const,
      mentions: Math.floor(Math.random() * 2000) + 500 // Mock mentions for now
    }));
  };

  // Generate sector trends from events
  const getSectorTrends = (): SectorTrend[] => {
    const sectorMap = new Map<string, { count: number, totalImpact: number }>();
    
    events.forEach(event => {
      if (event.sector) {
        const current = sectorMap.get(event.sector) || { count: 0, totalImpact: 0 };
        sectorMap.set(event.sector, {
          count: current.count + 1,
          totalImpact: current.totalImpact + Math.abs(event.impactRating)
        });
      }
    });

    return Array.from(sectorMap.entries()).map(([sector, data]) => ({
      sector,
      catalysts: data.count,
      avgImpact: data.count > 0 ? data.totalImpact / data.count : 0,
      trend: data.totalImpact / data.count > 1.5 ? 'up' as const : 
             data.totalImpact / data.count < 0.5 ? 'down' as const : 'flat' as const
    })).slice(0, 4);
  };



  const formatSectorImpact = (impact: number) => {
    if (impact > 0) {
      return `+${impact.toFixed(1)}`;
    } else if (impact < 0) {
      return impact.toFixed(1);
    } else {
      return '0.0';
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const trendingCatalysts = getTrendingCatalysts();
  const sectorTrends = getSectorTrends();
  const displayEvents = searchQuery ? searchResults : trendingCatalysts;
  const totalSearchResults = searchQuery ? (matchedStock ? searchResults.length + 1 : searchResults.length) : 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10 p-4">
        <div className="flex items-center justify-center mb-4">
          <h1 className="text-[20px] font-medium">Discover</h1>
        </div>
        
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search stocks, events, or sectors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-12"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted rounded-full"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Filter Tabs */}
        <ScrollArea className="w-full">
          <div className="flex items-center gap-2 pb-2">
            {(['all', 'today', 'week', 'month'] as const).map((filter) => (
              <Button
                key={filter}
                size="sm"
                variant={activeFilter === filter ? 'default' : 'outline'}
                onClick={() => setActiveFilter(filter)}
                className={`${activeFilter === filter ? 'bg-ai-accent hover:bg-ai-accent/90' : ''} whitespace-nowrap`}
              >
                {filter === 'all' ? 'All Time' : 
                 filter === 'today' ? 'Today' :
                 filter === 'week' ? 'This Week' : 'This Month'}
              </Button>
            ))}
            <Button size="sm" variant="outline" className="whitespace-nowrap">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </ScrollArea>
      </div>

      {/* Popular Searches - Only show when not searching */}
      {!searchQuery && (
        <div className="p-4 pb-2 border-b border-border">
          <h2 className="font-semibold mb-3">Popular Searches</h2>
          <div className="flex flex-wrap gap-2">
            {popularSearches.map((search, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-sm"
                onClick={() => setSearchQuery(search)}
              >
                {search}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* AI Recommendations - Right below Popular Searches, collapsible */}
      {!searchQuery && (
        <div className="p-4 pb-2 border-b border-border">
          <Collapsible open={isAiRecommendationsOpen} onOpenChange={setIsAiRecommendationsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-ai-accent" />
                  <h2 className="font-semibold">AI Recommendations</h2>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${isAiRecommendationsOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <Card className="bg-gradient-to-r from-ai-accent/5 to-ai-accent/10 border-ai-accent/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-ai-accent rounded-lg flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm mb-1">Biotech FDA Approvals</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Based on your portfolio, we've identified 3 upcoming FDA decisions with high probability of approval.
                      </p>
                      <Button 
                        size="sm" 
                        className="bg-ai-accent hover:bg-ai-accent/90 text-white"
                        onClick={onAIRecommendationsClick}
                      >
                        View Recommendations
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="p-4 space-y-6">

          {/* Trending Catalysts */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-ai-accent" />
              <h2 className="font-semibold">
                {searchQuery ? `Search Results (${totalSearchResults})` : 'Trending Events'}
              </h2>
            </div>
            
            {isLoading || isSearching ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-ai-accent mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {isSearching ? 'Searching...' : 'Loading catalysts...'}
                </p>
              </div>
            ) : displayEvents.length === 0 ? (
              <div className="text-center py-8">
                <Search className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No events found for your search' : 'No trending catalysts available'}
                </p>
                {searchQuery && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSearch}
                    className="mt-3"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Discovery
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Stock Ticker Card - Show when matched */}
                {searchQuery && matchedStock && (
                  <Card 
                    className="cursor-pointer hover:border-ai-accent/50 transition-colors border-2 dark:border-2 bg-gradient-to-br from-ai-accent/5 to-background"
                    onClick={() => onTickerClick?.(matchedStock.symbol)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex flex-col gap-2">
                          <Badge 
                            className="bg-ai-accent text-white text-sm cursor-pointer hover:bg-ai-accent/80 w-fit px-3 py-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTickerClick?.(matchedStock.symbol);
                            }}
                          >
                            {matchedStock.symbol}
                          </Badge>
                          <div className="space-y-1">
                            <h3 className="font-semibold text-sm leading-5 mb-0 p-[0px]">{matchedStock.company}</h3>
                            <p className="text-sm text-muted-foreground">{matchedStock.industry}</p>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className={`text-sm font-medium ${
                            matchedStock.priceChange >= 0 ? 'text-positive' : 'text-negative'
                          }`}>
                            {matchedStock.priceChange >= 0 ? '+' : ''}{matchedStock.priceChangePercent.toFixed(2)}%
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(matchedStock.currentPrice)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {matchedStock.marketCap}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {displayEvents.map((catalyst) => {
                  const eventConfig = eventTypeConfig[catalyst.type as keyof typeof eventTypeConfig] || eventTypeConfig.launch;
                  const EventIcon = eventTypeIcons[catalyst.type as keyof typeof eventTypeIcons] || eventTypeIcons.launch;
                  
                  return (
                    <Card 
                      key={catalyst.id} 
                      className="cursor-pointer hover:border-ai-accent/50 transition-colors border-2 dark:border-2"
                      onClick={() => onEventClick?.(catalyst)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex flex-col items-start gap-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 ${eventConfig.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                                <EventIcon className="w-3.5 h-3.5 text-white" />
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {eventConfig.label}
                              </Badge>
                            </div>
                            <div className="space-y-1">
                              <h3 className="font-semibold text-sm leading-5 mb-1 p-[0px]">{catalyst.title}</h3>
                              <p className="text-sm text-muted-foreground">{catalyst.company}</p>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                          </div>
                          <div className="text-right space-y-1">
                            <Badge 
                              className="bg-ai-accent text-white text-xs cursor-pointer hover:bg-ai-accent/80"
                              onClick={(e) => {
                                e.stopPropagation();
                                onTickerClick?.(catalyst.ticker);
                              }}
                            >
                              {catalyst.ticker}
                            </Badge>
                            {catalyst.priceChange !== undefined && catalyst.priceChangePercent !== undefined && (
                              <div className={`text-sm font-medium ${
                                catalyst.priceChange >= 0 ? 'text-positive' : 'text-negative'
                              }`}>
                                {catalyst.priceChange >= 0 ? '+' : ''}{catalyst.priceChangePercent.toFixed(2)}%
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {catalyst.currentPrice ? formatCurrency(catalyst.currentPrice) : 'Market Price'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatMarketCap(catalyst.marketCap)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">
                            <div className="flex items-center gap-1 mb-1">
                              <Clock className="w-3 h-3" />
                              <span>{catalyst.timeUntil || catalyst.time}</span>
                            </div>
                            <div className="text-xs text-muted-foreground/70">
                              {catalyst.actualDateTime}
                            </div>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getImpactColor(catalyst.impactRating)}`}
                          >
                            {formatImpactRating(catalyst.impactRating)}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sector Trends - Only show when not searching */}
          {!searchQuery && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-ai-accent" />
                <h2 className="font-semibold">Sector Activity</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {sectorTrends.map((sector, index) => (
                  <Card key={index} className="cursor-pointer hover:border-ai-accent/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-sm">{sector.sector}</h3>
                        <div className={`w-2 h-2 rounded-full ${
                          sector.trend === 'up' ? 'bg-positive' :
                          sector.trend === 'down' ? 'bg-negative' :
                          'bg-neutral'
                        }`} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Catalysts</span>
                          <span className="font-medium">{sector.catalysts}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Avg Impact</span>
                          <span className={`font-medium ${
                            sector.avgImpact > 0 ? 'text-positive' :
                            sector.avgImpact < 0 ? 'text-negative' :
                            'text-neutral'
                          }`}>
                            {formatSectorImpact(sector.avgImpact)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}