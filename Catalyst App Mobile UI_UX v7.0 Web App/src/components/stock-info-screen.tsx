import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { HorizontalTimeline } from './horizontal-timeline';
import { UpcomingEventsTimeline } from './upcoming-events-timeline';
import { CompanyOwnership } from './company-ownership';
import { CompanyExecutives } from './company-executives';

import { StockChart } from './stock-chart';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Clock,
  DollarSign,
  BarChart3,
  Building2,
  Globe,
  Phone,
  Calendar,
  Target,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Users,
  Loader2,
  Database,
  SearchX,
  Package,
  ShoppingCart,
  Shield,
  Handshake,
  Building,
  Tag,
  ChevronDown,
  ChevronUp,
  Filter,
  RotateCcw,
  Presentation,
  Scale,
  Landmark,
  ChevronRight
} from 'lucide-react';
import { 
  eventTypeConfig,
  formatCurrency,
  formatMarketCap,
  formatEventDateTime,
  stripCorporateSuffix,
  formatCompanyName,
  formatLargeNumber,
  formatPercentage,
  formatPercentageNoSign,
  formatPercentageFromDecimal,
  formatRatio,
  formatDate,
  formatVolumeInMillions,
  formatVolumeAlreadyInMillions
} from '../utils/formatting';
import DataService, { StockData } from '../utils/data-service';
import { MarketEvent } from '../utils/supabase/events-api';
import { getCurrentTime } from '../utils/current-time';
import StockAPI from '../utils/supabase/stock-api';
import { CompanyFinancials } from '../utils/supabase/client';

interface StockInfoScreenProps {
  ticker: string;
  onBack: () => void;
  onTickerClick?: (ticker: string) => void;
  onEventClick?: (event: MarketEvent) => void;
  scrollToEvents?: boolean;
  onScrollToEventsComplete?: () => void;
  onNavigateToFinancials?: (ticker: string) => void;
}

// Event Type Icon Components mapping
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

export function StockInfoScreen({ ticker, onBack, onTickerClick, onEventClick, scrollToEvents = false, onScrollToEventsComplete, onNavigateToFinancials }: StockInfoScreenProps) {
  const [catalystView, setCatalystView] = useState<'upcoming' | 'recent'>('upcoming');
  const [infoView, setInfoView] = useState<'stats' | 'company'>('stats');
  const [company, setCompany] = useState<StockData | null>(null);
  const [financials, setFinancials] = useState<CompanyFinancials | null>(null);
  const [events, setEvents] = useState<MarketEvent[]>([])
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingFinancials, setIsLoadingFinancials] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFinancialsDialogOpen, setIsFinancialsDialogOpen] = useState(false);
  const [performanceExpanded, setPerformanceExpanded] = useState(false);
  const [statsView, setStatsView] = useState<'statistics' | 'performance'>('statistics');
  
  // Event type filter state
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  
  // Timeline scroll state
  const [isNearNow, setIsNearNow] = useState(true);
  const [scrollToNow, setScrollToNow] = useState<(() => void) | null>(null);
  
  // Ref for the scrollable content container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Ref for the events section
  const eventsSectionRef = useRef<HTMLDivElement>(null);
  
  // Ref for the financials section
  const financialsSectionRef = useRef<HTMLDivElement>(null);

  // Scroll to top when screen opens or ticker changes - with aggressive enforcement
  useEffect(() => {
    // Scroll both the window AND the inner scroll container
    const scrollToTop = () => {
      // Scroll window
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      
      // Scroll inner container if it exists
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    };
    
    // Immediately scroll to top
    scrollToTop();
    
    // Force scroll to top multiple times to handle async content loading
    const scrollIntervals = [50, 100, 200, 300, 500, 800, 1000];
    const timers = scrollIntervals.map(delay => 
      setTimeout(() => {
        const windowScroll = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
        const containerScroll = scrollContainerRef.current?.scrollTop || 0;
        
        if (windowScroll !== 0 || containerScroll !== 0) {
          scrollToTop();
        }
      }, delay)
    );
    
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [ticker]);

  // Load stock data from DataService
  useEffect(() => {
    const loadStockData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const stockData = await DataService.getStock(ticker);
        
        if (stockData) {
          setCompany(stockData);
        } else {
          setError(`Unable to load data for ${ticker}. The stock might not be in our database or there may be a temporary connection issue.`);
          setCompany(null);
        }
      } catch (err) {
        console.error(`❌ [StockInfoScreen] Error loading ${ticker}:`, err);
        setError(err instanceof Error ? err.message : 'Failed to load stock data');
        setCompany(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadStockData();
  }, [ticker]);

  // Load events data from DataService
  useEffect(() => {
    const loadEvents = async () => {
      try {
        setIsLoadingEvents(true);
        // Get all events for this ticker (will be filtered properly)
        const eventData = await DataService.getEventsByTicker(ticker);
        setEvents(eventData);
      } catch (err) {

        // Don't set error for events, just use empty array
        setEvents([]);
      } finally {
        setIsLoadingEvents(false);
      }
    };

    loadEvents();
  }, [ticker]);

  // Load financials data from DataService
  useEffect(() => {
    const loadFinancials = async () => {
      try {
        setIsLoadingFinancials(true);
        const financialsData = await DataService.getFinancials(ticker);
        
        if (financialsData) {
          setFinancials(financialsData);
        } else {
          setFinancials(null);
        }
      } catch (err) {
        console.error(`❌ [StockInfoScreen] Error loading financials for ${ticker}:`, err);
        // Don't set error for financials, just use null
        setFinancials(null);
      } finally {
        setIsLoadingFinancials(false);
      }
    };

    loadFinancials();
  }, [ticker]);

  // Ensure scroll to top after content finishes loading
  useEffect(() => {
    if (!isLoading && !isLoadingEvents && !isLoadingFinancials) {
      // Both data sets have finished loading, ensure we're at the top
      const finalScrollCheck = setTimeout(() => {
        const windowScroll = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
        const containerScroll = scrollContainerRef.current?.scrollTop || 0;
        
        if (windowScroll !== 0 || containerScroll !== 0) {
          // Scroll window
          window.scrollTo({ top: 0, behavior: 'instant' });
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
          
          // Scroll inner container
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
          }
        }
      }, 100);
      
      return () => clearTimeout(finalScrollCheck);
    }
  }, [isLoading, isLoadingEvents, isLoadingFinancials]);

  // Auto-scroll to events section when requested
  useEffect(() => {
    if (scrollToEvents && !isLoading && !isLoadingEvents && eventsSectionRef.current) {
      // Wait for content to fully render
      const scrollTimer = setTimeout(() => {
        if (eventsSectionRef.current && scrollContainerRef.current) {
          // Get the position of the events section relative to the scroll container
          const eventsSection = eventsSectionRef.current;
          const scrollContainer = scrollContainerRef.current;
          
          // Calculate the scroll position
          const offsetTop = eventsSection.offsetTop - 20; // 20px padding from top
          
          // Scroll the container to the events section
          scrollContainer.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
          });
          
          // Notify parent that scroll is complete
          onScrollToEventsComplete?.();
        }
      }, 500); // Wait 500ms for content to render
      
      return () => clearTimeout(scrollTimer);
    }
  }, [scrollToEvents, isLoading, isLoadingEvents, onScrollToEventsComplete]);

  // Filter events into upcoming and past with proper date handling
  const now = getCurrentTime();
  
  const upcomingEvents = events.filter(event => {
    if (!event.actualDateTime) {
      return true; // If no date, assume upcoming
    }
    
    const eventDate = new Date(event.actualDateTime);
    const isUpcoming = eventDate > now;
    
    return isUpcoming;
  });
  
  const pastEvents = events.filter(event => {
    if (!event.actualDateTime) {
      return false; // Events without dates are not considered past
    }
    
    const eventDate = new Date(event.actualDateTime);
    return eventDate <= now;
  }).sort((a, b) => {
    // Sort past events by date, most recent first
    if (!a.actualDateTime && !b.actualDateTime) return 0;
    if (!a.actualDateTime) return 1;
    if (!b.actualDateTime) return -1;
    
    const dateA = new Date(a.actualDateTime).getTime();
    const dateB = new Date(b.actualDateTime).getTime();
    return dateB - dateA; // Most recent first (descending order)
  });

  // Filter events by selected event types (if any)
  const filteredUpcomingEvents = selectedEventTypes.length > 0 
    ? upcomingEvents.filter(event => selectedEventTypes.includes(event.type))
    : upcomingEvents;
    
  const filteredPastEvents = (selectedEventTypes.length > 0 
    ? pastEvents.filter(event => selectedEventTypes.includes(event.type))
    : pastEvents).sort((a, b) => {
    // Ensure filtered past events are also sorted by date, most recent first
    if (!a.actualDateTime && !b.actualDateTime) return 0;
    if (!a.actualDateTime) return 1;
    if (!b.actualDateTime) return -1;
    
    const dateA = new Date(a.actualDateTime).getTime();
    const dateB = new Date(b.actualDateTime).getTime();
    return dateB - dateA; // Most recent first (descending order)
  });

  // Get unique event types from all events for filter badges
  const getAvailableEventTypes = () => {
    // Use all events (both upcoming and past)
    const allEvents = [...upcomingEvents, ...pastEvents];
    if (!allEvents || allEvents.length === 0) return [];
    
    try {
      const uniqueTypes = [...new Set(allEvents.map(event => event.type).filter(type => type && type.trim()))];
      
      // Keep all event types separate as defined in eventTypeConfig
      const finalTypes = [...new Set(uniqueTypes)];
      
      return finalTypes.slice(0, 5).map(type => {
        const relatedTypes = [type];
        
        return {
          type,
          types: relatedTypes,
          config: eventTypeConfig[type as keyof typeof eventTypeConfig] || eventTypeConfig.launch,
          count: allEvents.filter(event => relatedTypes.includes(event.type)).length
        };
      });
    } catch (error) {
      return [];
    }
  };

  const availableEventTypes = getAvailableEventTypes();

  // Handle event type filter toggle
  const handleEventTypeToggle = (eventType: string | string[]) => {
    const typesToToggle = Array.isArray(eventType) ? eventType : [eventType];
    
    setSelectedEventTypes(prev => {
      // Check if any of the types are already selected
      const anySelected = typesToToggle.some(type => prev.includes(type));
      
      if (anySelected) {
        // Remove all types for this badge
        return prev.filter(type => !typesToToggle.includes(type));
      } else {
        // Add all types for this badge
        return [...prev, ...typesToToggle];
      }
    });
  };
  
  // Helper function to split text into paragraphs of 3 sentences each
  const formatDescriptionIntoParagraphs = (text: string): string[] => {
    // Split by sentence endings (. ! ?) followed by a space or end of string
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    // Group sentences into chunks of 3
    const paragraphs: string[] = [];
    for (let i = 0; i < sentences.length; i += 3) {
      const chunk = sentences.slice(i, i + 3).join(' ').trim();
      if (chunk) {
        paragraphs.push(chunk);
      }
    }
    
    return paragraphs.length > 0 ? paragraphs : [text];
  };

  // Helper function to get state abbreviation
  const getStateAbbreviation = (state: string): string => {
    const stateMap: Record<string, string> = {
      'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
      'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
      'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
      'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
      'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
      'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
      'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
      'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
      'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
      'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
    };
    
    // If already abbreviated (2 characters), return as is
    if (state.length === 2) {
      return state.toUpperCase();
    }
    
    // Otherwise look up the abbreviation
    return stateMap[state] || state;
  };
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-ai-accent mx-auto" />
          <div>
            <h2 className="text-xl text-foreground mb-2">Loading {ticker}</h2>
            <p className="text-muted-foreground">Fetching stock information...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (!company) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-8 w-8 text-negative mx-auto" />
          <div>
            <h2 className="text-xl text-foreground mb-2">Stock Not Found</h2>
            <p className="text-muted-foreground">Could not load data for {ticker}</p>
            <Button onClick={onBack} className="mt-4">
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="h-screen bg-background flex flex-col overflow-x-hidden overflow-y-hidden w-full max-w-full"
    >
      {/* Content */}
      <motion.div 
        ref={scrollContainerRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
        className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-full"
      >
        <div className="space-y-2 pb-[32px] overflow-x-hidden w-full max-w-full pt-[16px] pr-[16px] pl-[16px] px-[16px] py-[32px]">
          {/* Header - now part of scrollable content */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
            className="bg-background"
          >
            <div className="flex items-center gap-3 mb-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </div>

            {/* Stock Info */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge 
                      className="bg-ai-accent text-primary-foreground cursor-pointer hover:bg-ai-accent/80 rounded"
                      onClick={() => onTickerClick?.(company.symbol)}
                    >
                      {company.symbol}
                    </Badge>
                    <h1 className="text-[20px] font-medium">{formatCompanyName(company.company, company.symbol)}</h1>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stock Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25, ease: "easeOut" }}
          >
            <StockChart ticker={ticker} stockData={company} height="h-[312px]" />
          </motion.div>

          {/* Compact Timeline - Mini event preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.275, ease: "easeOut" }}
          >
            {!isLoadingEvents && events.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-[12px] p-[0px] mx-[0px] my-[20px] mt-[20px] mr-[0px] ml-[0px] text-[16px] font-bold font-normal">Events Timeline</h3>
                <UpcomingEventsTimeline
                  selectedTickers={[ticker]}
                  onEventClick={onEventClick}
                  onTickerClick={onTickerClick}
                  showTickerBadge={false}
                  showMonthHeader={false}
                />
              </div>
            )}
          </motion.div>

          {/* Company Information Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3, ease: "easeOut" }}
          >
            <Card className="border-0">
              <CardHeader className="pl-[10px]">
                <CardTitle>
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Company Logo and Basic Info */}
                  <div className="flex items-start gap-4">
                    {company.logo && (
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                          <img 
                            src={company.logo} 
                            alt={`${company.company} logo`}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              // Hide image if it fails to load
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <div>
                        <h3 className="font-medium text-lg">{company.company}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {company.exchange && (
                            <span>{company.exchange}</span>
                          )}
                        </div>
                      </div>
                      {company.weburl && (
                        <a 
                          href={company.weburl.startsWith('http') ? company.weburl : `https://${company.weburl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-ai-accent hover:text-ai-accent/80 transition-colors"
                        >
                          <Globe className="w-4 h-4" />
                          Visit Website
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Company Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {company.industry && (
                      <div>
                        <span className="text-muted-foreground">Industry</span>
                        <p className="font-medium">{company.industry}</p>
                      </div>
                    )}
                    {company.employeeTotal && (
                      <div>
                        <span className="text-muted-foreground">Employees</span>
                        <p className="font-medium">{company.employeeTotal.toLocaleString()}</p>
                      </div>
                    )}
                    {company.city && company.state && (
                      <div>
                        <span className="text-muted-foreground">Headquarters</span>
                        <p className="font-medium">{company.city}, {getStateAbbreviation(company.state)}</p>
                      </div>
                    )}
                    {company.ipo && (
                      <div>
                        <span className="text-muted-foreground">IPO Date</span>
                        <p className="font-medium">{new Date(company.ipo).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* About Section */}
                  <div>
                    <h4 className="font-medium mb-2">About {company.company}</h4>
                    <div className="text-sm leading-relaxed text-muted-foreground space-y-3">
                      {formatDescriptionIntoParagraphs(
                        company.description || 
                        `${company.company} is a ${company.sector?.toLowerCase() || 'technology'} company trading under the symbol ${company.symbol}. With a market capitalization of ${company.marketCap}, it represents a significant player in its sector.${company.dividendYield && company.dividendYield > 0 ? ` The company offers a dividend yield of ${company.dividendYield.toFixed(2)}%.` : ''}`
                      ).map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Key Statistics / Performance Card - Combined with Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.35, ease: "easeOut" }}
          >
            <Card className="border-0">
              <CardHeader className="pl-[10px] pt-[10px] pr-[24px] pb-[0px]">
                <div className="flex items-center gap-0.5 bg-muted/50 rounded-full p-0.5 w-fit">
                  <button
                    onClick={() => setStatsView('statistics')}
                    className={`px-3 py-1 rounded-full text-sm transition-all flex items-center ${
                      statsView === 'statistics' 
                        ? 'bg-foreground text-background font-medium' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Key Statistics
                  </button>
                  <button
                    onClick={() => setStatsView('performance')}
                    disabled={!financials}
                    className={`px-3 py-1 rounded-full text-sm transition-all flex items-center ${
                      statsView === 'performance' 
                        ? 'bg-foreground text-background font-medium' 
                        : 'text-muted-foreground hover:text-foreground'
                    } ${!financials ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Performance
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {statsView === 'statistics' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Open</p>
                      <p className="font-medium">{company.open ? formatCurrency(company.open) : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">High</p>
                      <p className="font-medium">{company.high ? formatCurrency(company.high) : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Low</p>
                      <p className="font-medium">{company.low ? formatCurrency(company.low) : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Previous Close</p>
                      <p className="font-medium">{company.previousClose ? formatCurrency(company.previousClose) : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Volume</p>
                      <p className="font-medium">{company.volume ? formatVolumeInMillions(company.volume) : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Volume (10D)</p>
                      <p className="font-medium">{financials?.avg_volume_10d ? formatVolumeAlreadyInMillions(financials.avg_volume_10d) : formatLargeNumber(company.avgVolume)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">52W High</p>
                      <p className="font-medium">
                        {financials?.week_52_high 
                          ? formatCurrency(financials.week_52_high)
                          : formatCurrency(company.week52High)
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">52W Low</p>
                      <p className="font-medium">
                        {financials?.week_52_low 
                          ? formatCurrency(financials.week_52_low)
                          : formatCurrency(company.week52Low)
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  financials && (
                    <div className="space-y-6">
                      {/* Price Performance */}
                      <div>
                        <div className="grid grid-cols-2 gap-4">
                          {financials.price_return_daily_5d !== null && financials.price_return_daily_5d !== undefined && (
                            <div>
                              <p className="text-sm text-muted-foreground">5-Day Return</p>
                              <p className={`font-medium ${financials.price_return_daily_5d >= 0 ? 'text-positive' : 'text-negative'}`}>
                                {formatPercentage(financials.price_return_daily_5d)}
                              </p>
                            </div>
                          )}
                          {financials.price_return_daily_mtd !== null && financials.price_return_daily_mtd !== undefined && (
                            <div>
                              <p className="text-sm text-muted-foreground">Month-to-Date</p>
                              <p className={`font-medium ${financials.price_return_daily_mtd >= 0 ? 'text-positive' : 'text-negative'}`}>
                                {formatPercentage(financials.price_return_daily_mtd)}
                              </p>
                            </div>
                          )}
                          {financials.price_return_daily_52w !== null && financials.price_return_daily_52w !== undefined && (
                            <div>
                              <p className="text-sm text-muted-foreground">52-Week Return</p>
                              <p className={`font-medium ${financials.price_return_daily_52w >= 0 ? 'text-positive' : 'text-negative'}`}>
                                {formatPercentage(financials.price_return_daily_52w)}
                              </p>
                            </div>
                          )}
                          {financials.price_return_daily_ytd !== null && financials.price_return_daily_ytd !== undefined && (
                            <div>
                              <p className="text-sm text-muted-foreground">Year-to-Date</p>
                              <p className={`font-medium ${financials.price_return_daily_ytd >= 0 ? 'text-positive' : 'text-negative'}`}>
                                {formatPercentage(financials.price_return_daily_ytd)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <Separator />

                      {/* Performance vs S&P 500 */}
                      <div>
                        <h4 className="font-medium mb-3 text-sm">Performance vs S&P 500</h4>
                        <div className="grid grid-cols-2 gap-4">
                          {financials.price_relative_to_sp500_52w !== null && financials.price_relative_to_sp500_52w !== undefined && (
                            <div>
                              <p className="text-sm text-muted-foreground">52-Week Relative</p>
                              <p className={`font-medium ${financials.price_relative_to_sp500_52w >= 0 ? 'text-positive' : 'text-negative'}`}>
                                {formatPercentage(financials.price_relative_to_sp500_52w)}
                              </p>
                            </div>
                          )}
                          {financials.price_relative_to_sp500_ytd !== null && financials.price_relative_to_sp500_ytd !== undefined && (
                            <div>
                              <p className="text-sm text-muted-foreground">YTD Relative</p>
                              <p className={`font-medium ${financials.price_relative_to_sp500_ytd >= 0 ? 'text-positive' : 'text-negative'}`}>
                                {formatPercentage(financials.price_relative_to_sp500_ytd)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Financials Card - Comprehensive financial metrics */}
          {financials && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4, ease: "easeOut" }}
              ref={financialsSectionRef}
            >
              <Card className="border-0">
                <CardHeader className="pl-[10px]">
                  <CardTitle>
                    Financials
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Valuation Metrics - Always visible */}
                    <div>
                      <h4 className="font-medium mb-3 text-sm">Valuation</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Market Cap</p>
                          <p className="font-medium">{financials.market_cap ? formatMarketCap(financials.market_cap) : 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Enterprise Value</p>
                          <p className="font-medium">{financials.enterprise_value ? formatMarketCap(financials.enterprise_value) : 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">P/E Ratio (TTM)</p>
                          <p className="font-medium">{financials.pe_ttm ? formatRatio(financials.pe_ttm) : 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Forward P/E</p>
                          <p className="font-medium">{financials.forward_pe ? formatRatio(financials.forward_pe) : 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Show More Button - Opens Dialog */}
                    <Dialog open={isFinancialsDialogOpen} onOpenChange={setIsFinancialsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" className="w-full mt-4 text-ai-accent hover:text-ai-accent/80">
                          Show More
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[80vh] p-0 overflow-hidden gap-0 flex flex-col">
                        <DialogHeader className="w-full flex-shrink-0">
                          <div className="flex items-center justify-between gap-2 px-4 sm:px-6 pt-[50px] pb-[10px] pr-[30px] pl-[30px]">
                            <DialogTitle className="flex flex-col gap-1 flex-1 min-w-0">
                              <Badge className="bg-ai-accent text-primary-foreground rounded flex-shrink-0 text-[14px] w-fit">
                                {ticker}
                              </Badge>
                              <span className="truncate text-[18px] text-left">{company.company || ticker}</span>
                              <span className="text-sm font-normal text-muted-foreground text-left">Financials</span>
                            </DialogTitle>
                          </div>
                        </DialogHeader>
                        <div className="flex-1 min-h-0 overflow-y-auto">
                          <div className="w-full pb-[24px] space-y-6 px-4 sm:px-6 pt-[0px] pr-[20px] pl-[30px]">
                            {/* More Valuation Metrics */}
                            <div>
                              <h4 className="font-medium mb-3 text-sm">Additional Valuation</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">P/B Ratio</p>
                                  <p className="font-medium">{financials.pb ? formatRatio(financials.pb) : 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">P/S Ratio (TTM)</p>
                                  <p className="font-medium">{financials.ps_ttm ? formatRatio(financials.ps_ttm) : 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">P/FCF (TTM)</p>
                                  <p className="font-medium">{financials.pfcf_share_ttm ? formatRatio(financials.pfcf_share_ttm) : 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">P/CF (TTM)</p>
                                  <p className="font-medium">{financials.pcf_share_ttm ? formatRatio(financials.pcf_share_ttm) : 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">EV/Revenue</p>
                                  <p className="font-medium">{financials.ev_revenue_ttm ? formatRatio(financials.ev_revenue_ttm) : 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">EV/EBITDA</p>
                                  <p className="font-medium">{financials.ev_ebitda_ttm ? formatRatio(financials.ev_ebitda_ttm) : 'N/A'}</p>
                                </div>
                              </div>
                            </div>

                            <Separator />

                            {/* Profitability & Growth */}
                            <div>
                              <h4 className="font-medium mb-3 text-sm">Profitability & Growth</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">EPS (TTM)</p>
                                  <p className="font-medium">{financials.eps_ttm ? formatCurrency(financials.eps_ttm) : 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Revenue/Share (TTM)</p>
                                  <p className="font-medium">{financials.revenue_per_share_ttm ? formatCurrency(financials.revenue_per_share_ttm) : 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">EPS Growth (YoY)</p>
                                  <p className={`font-medium ${financials.eps_growth_ttm_yoy !== null && financials.eps_growth_ttm_yoy !== undefined && financials.eps_growth_ttm_yoy >= 0 ? 'text-positive' : financials.eps_growth_ttm_yoy !== null && financials.eps_growth_ttm_yoy !== undefined ? 'text-negative' : ''}`}>
                                    {financials.eps_growth_ttm_yoy !== null && financials.eps_growth_ttm_yoy !== undefined ? formatPercentage(financials.eps_growth_ttm_yoy) : 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Revenue Growth (YoY)</p>
                                  <p className={`font-medium ${financials.revenue_growth_ttm_yoy !== null && financials.revenue_growth_ttm_yoy !== undefined && financials.revenue_growth_ttm_yoy >= 0 ? 'text-positive' : financials.revenue_growth_ttm_yoy !== null && financials.revenue_growth_ttm_yoy !== undefined ? 'text-negative' : ''}`}>
                                    {financials.revenue_growth_ttm_yoy !== null && financials.revenue_growth_ttm_yoy !== undefined ? formatPercentage(financials.revenue_growth_ttm_yoy) : 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">EPS Growth (5Y CAGR)</p>
                                  <p className="font-medium">{financials.eps_growth_5y ? formatPercentageNoSign(financials.eps_growth_5y) : 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Revenue Growth (5Y)</p>
                                  <p className="font-medium">{financials.revenue_growth_5y ? formatPercentageNoSign(financials.revenue_growth_5y) : 'N/A'}</p>
                                </div>
                              </div>
                            </div>

                            <Separator />

                            {/* Margins */}
                            <div>
                              <h4 className="font-medium mb-3 text-sm">Margins</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">Net Profit Margin</p>
                                  <p className="font-medium">{financials.net_profit_margin_ttm ? formatPercentageNoSign(financials.net_profit_margin_ttm) : 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Operating Margin</p>
                                  <p className="font-medium">{financials.operating_margin_ttm ? formatPercentageNoSign(financials.operating_margin_ttm) : 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Gross Margin</p>
                                  <p className="font-medium">{financials.gross_margin_ttm ? formatPercentageNoSign(financials.gross_margin_ttm) : 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Pretax Margin</p>
                                  <p className="font-medium">{financials.pretax_margin_ttm ? formatPercentageNoSign(financials.pretax_margin_ttm) : 'N/A'}</p>
                                </div>
                              </div>
                            </div>

                            <Separator />

                            {/* Returns */}
                            <div>
                              <h4 className="font-medium mb-3 text-sm">Returns</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">Return on Assets (TTM)</p>
                                  <p className="font-medium">{financials.roa_ttm ? formatPercentageNoSign(financials.roa_ttm) : 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Return on Equity (TTM)</p>
                                  <p className="font-medium">{financials.roe_ttm ? formatPercentageNoSign(financials.roe_ttm) : 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Return on Investment (TTM)</p>
                                  <p className="font-medium">{financials.roi_ttm ? formatPercentageNoSign(financials.roi_ttm) : 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">ROE (5Y Avg)</p>
                                  <p className="font-medium">{financials.roe_5y ? formatPercentageNoSign(financials.roe_5y) : 'N/A'}</p>
                                </div>
                              </div>
                            </div>

                            <Separator />

                            {/* Balance Sheet */}
                            <div>
                              <h4 className="font-medium mb-3 text-sm">Balance Sheet</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">Book Value/Share</p>
                                  <p className="font-medium">{financials.book_value_per_share_annual ? formatCurrency(financials.book_value_per_share_annual) : 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Tangible Book Value/Share</p>
                                  <p className="font-medium">{financials.tangible_book_value_per_share_annual ? formatCurrency(financials.tangible_book_value_per_share_annual) : 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Current Ratio</p>
                                  <p className="font-medium">{financials.current_ratio_annual ? formatRatio(financials.current_ratio_annual) : 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Quick Ratio</p>
                                  <p className="font-medium">{financials.quick_ratio_annual ? formatRatio(financials.quick_ratio_annual) : 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">LT Debt/Equity</p>
                                  <p className="font-medium">{financials.long_term_debt_equity_annual ? formatRatio(financials.long_term_debt_equity_annual) : 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Total Debt/Equity</p>
                                  <p className="font-medium">{financials.total_debt_total_equity_annual ? formatRatio(financials.total_debt_total_equity_annual) : 'N/A'}</p>
                                </div>
                              </div>
                            </div>

                            <Separator />

                            {/* Efficiency */}
                            <div>
                              <h4 className="font-medium mb-3 text-sm">Efficiency</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">Asset Turnover</p>
                                  <p className="font-medium">{financials.asset_turnover_ttm ? formatRatio(financials.asset_turnover_ttm) : 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Inventory Turnover</p>
                                  <p className="font-medium">{financials.inventory_turnover_ttm ? formatRatio(financials.inventory_turnover_ttm) : 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Receivables Turnover</p>
                                  <p className="font-medium">{financials.receivable_turnover_ttm ? formatRatio(financials.receivable_turnover_ttm) : 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Revenue/Employee</p>
                                  <p className="font-medium">{financials.revenue_per_employee_ttm ? formatCurrency(financials.revenue_per_employee_ttm) : 'N/A'}</p>
                                </div>
                              </div>
                            </div>

                            <Separator />

                            {/* Dividends & Shareholder Returns */}
                            <div>
                              <h4 className="font-medium mb-3 text-sm">Dividends & Shareholder Returns</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">Dividend/Share (Annual)</p>
                                  <p className="font-medium">{financials.dividend_per_share_annual ? formatCurrency(financials.dividend_per_share_annual) : 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Dividend Yield</p>
                                  <p className="font-medium">{financials.dividend_yield_indicated_annual ? formatPercentageNoSign(financials.dividend_yield_indicated_annual) : 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Payout Ratio</p>
                                  <p className="font-medium">{financials.payout_ratio_ttm ? formatPercentageNoSign(financials.payout_ratio_ttm) : 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Dividend Growth (5Y)</p>
                                  <p className="font-medium">{financials.dividend_growth_rate_5y ? formatPercentageNoSign(financials.dividend_growth_rate_5y) : 'N/A'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Company Ownership Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.45, ease: "easeOut" }}
          >
            <CompanyOwnership 
              ticker={ticker} 
              companyName={company.company}
              shareOutstanding={company.shareOutstanding} 
              currentPrice={company.currentPrice}
            />
          </motion.div>

          {/* Company Executives and Board of Directors */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5, ease: "easeOut" }}
          >
            <CompanyExecutives ticker={ticker} companyName={company.company} />
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}