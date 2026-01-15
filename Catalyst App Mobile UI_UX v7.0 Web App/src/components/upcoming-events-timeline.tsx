import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, Calendar, BarChart3, AlertCircle, Rocket, TrendingUp, FileText, Users, Handshake, DollarSign, Scale, Shield, ShoppingCart, Building, Package, Tag, Presentation } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { getCurrentTime } from '../utils/current-time';
import { 
  eventTypeConfig,
  formatEventDateTime,
  formatCurrency,
  formatMarketCap,
  getImpactBackgroundColor
} from '../utils/formatting';
import { MarketEvent } from '../utils/supabase/events-api';
import DataService from '../utils/data-service';

// Event Type Icon Components mapping
const eventTypeIcons = {
  earnings: BarChart3,
  fda: AlertCircle,
  product: Rocket,
  guidance_update: TrendingUp,
  conference: Users,
  regulatory: FileText,
  investor_day: Presentation,
  partnership: Handshake,
  pricing: DollarSign,
  legal: Scale,
  defense_contract: Shield,
  commerce_event: ShoppingCart,
  corporate: Building,
  capital_markets: Building,
  merger: Handshake,
  launch: Rocket
};

interface UpcomingEventsTimelineProps {
  selectedTickers: string[];
  onEventClick?: (event: MarketEvent) => void;
  onTickerClick?: (ticker: string) => void;
  expandedQuarters?: Set<string>;
  onToggleQuarter?: (quarterKey: string) => void;
  showTickerBadge?: boolean;
  showMonthHeader?: boolean;
  variant?: 'default' | 'calendar';
  filterYear?: number;
  events?: MarketEvent[]; // Optional: provide events directly instead of fetching
  hidePastUpcomingToggle?: boolean; // Hide the toggle and use forcePastMode instead
  forcePastMode?: boolean; // Force past or upcoming mode when toggle is hidden
}

interface MonthGroup {
  month: string;
  monthIndex: number;
  year: number;
  displayName: string;
  events: MarketEvent[];
}

interface QuarterGroup {
  quarter: string;
  year: number;
  displayName: string;
  months: MonthGroup[];
  isCurrentQuarter: boolean;
}

function getQuarterFromMonth(month: number): number {
  return Math.floor(month / 3) + 1;
}

function getQuarterDisplayName(quarter: number, year: number, isCurrent: boolean): string {
  if (isCurrent) {
    return `Current Quarter - Q${quarter} ${year}`;
  }
  return `Q${quarter} ${year}`;
}

export function UpcomingEventsTimeline({
  selectedTickers,
  onEventClick,
  onTickerClick,
  expandedQuarters: controlledExpandedQuarters,
  onToggleQuarter,
  showTickerBadge = true,
  showMonthHeader = true,
  variant = 'default',
  filterYear,
  events: providedEvents,
  hidePastUpcomingToggle = false,
  forcePastMode = false
}: UpcomingEventsTimelineProps) {
  const [internalExpandedQuarters, setInternalExpandedQuarters] = useState<Set<string>>(new Set());
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [hasAutoScrolled, setHasAutoScrolled] = useState(false);
  
  // Use controlled state if provided, otherwise use internal state
  const expandedQuarters = controlledExpandedQuarters ?? internalExpandedQuarters;

  const now = getCurrentTime();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentQuarter = getQuarterFromMonth(currentMonth);

  // Determine if we're viewing a past, current, or future year
  const viewingYear = filterYear ?? currentYear;
  const isCurrentYear = viewingYear === currentYear;
  const isPastYear = viewingYear < currentYear;
  const isFutureYear = viewingYear > currentYear;

  // Fetch events when selectedTickers change
  useEffect(() => {
    // If events are provided directly, use those instead of fetching
    if (providedEvents !== undefined) {
      setEvents(providedEvents);
      setLoading(false);
      return;
    }

    const fetchEvents = async () => {
      if (!selectedTickers || selectedTickers.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const fetchedEvents = await DataService.getEventsByTickers(selectedTickers);
        setEvents(fetchedEvents || []);
      } catch (error) {
        console.error('Error fetching events:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [selectedTickers, providedEvents]);

  // Group events by quarter and month
  const quarterGroups = useMemo(() => {
    // Safety check: return empty array if events is undefined or not an array
    if (!events || !Array.isArray(events)) {
      return [];
    }
    
    // Filter events based on toggle, but include all events from current month when showing upcoming
    let filteredEvents = events.filter(event => {
      if (!event.actualDateTime) return false;
      const eventDate = new Date(event.actualDateTime);
      const eventTime = eventDate.getTime();
      const eventYear = eventDate.getFullYear();
      const eventMonth = eventDate.getMonth();
      
      // Apply year filter if provided
      if (filterYear !== undefined && eventYear !== filterYear) {
        return false;
      }
      
      // For past years, show all events (they're all in the past)
      if (isPastYear) {
        return eventTime <= now.getTime();
      }
      
      // For future years, show all events (they're all upcoming)
      if (isFutureYear) {
        return eventTime > now.getTime();
      }
      
      // For current year, use the toggle
      // When showing past events, only show events that have already occurred
      if (showPastEvents || forcePastMode) {
        return eventTime <= now.getTime();
      }
      
      // When showing upcoming events:
      // - Include all events from current month (both past and upcoming)
      // - Include only future events from other months
      const isCurrentMonth = eventYear === currentYear && eventMonth === currentMonth;
      if (isCurrentMonth) {
        return true; // Include all events from current month
      }
      return eventTime > now.getTime(); // Only future events for other months
    });

    // Sort by date (ascending - oldest to newest)
    const sortedEvents = [...filteredEvents].sort((a, b) => {
      const dateA = a.actualDateTime ? new Date(a.actualDateTime).getTime() : Infinity;
      const dateB = b.actualDateTime ? new Date(b.actualDateTime).getTime() : Infinity;
      return dateA - dateB;
    });

    // Group by year, quarter, then month
    const quarterMap = new Map<string, QuarterGroup>();

    sortedEvents.forEach(event => {
      if (!event.actualDateTime) return;
      
      const eventDate = new Date(event.actualDateTime);
      const eventMonth = eventDate.getMonth();
      const eventYear = eventDate.getFullYear();
      const eventQuarter = getQuarterFromMonth(eventMonth);
      
      const quarterKey = `${eventYear}-Q${eventQuarter}`;
      const isCurrentQuarter = eventYear === currentYear && eventQuarter === currentQuarter;

      if (!quarterMap.has(quarterKey)) {
        quarterMap.set(quarterKey, {
          quarter: `Q${eventQuarter}`,
          year: eventYear,
          displayName: getQuarterDisplayName(eventQuarter, eventYear, isCurrentQuarter),
          months: [],
          isCurrentQuarter
        });
      }

      const quarterGroup = quarterMap.get(quarterKey)!;
      let monthGroup = quarterGroup.months.find(m => m.monthIndex === eventMonth && m.year === eventYear);

      if (!monthGroup) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        monthGroup = {
          month: monthNames[eventMonth],
          monthIndex: eventMonth,
          year: eventYear,
          displayName: `${monthNames[eventMonth]} ${eventYear}`,
          events: []
        };
        quarterGroup.months.push(monthGroup);
      }

      monthGroup.events.push(event);
    });

    // Sort quarters and months (ascending order - oldest first)
    const sortedQuarters = Array.from(quarterMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      const qA = parseInt(a.quarter.substring(1));
      const qB = parseInt(b.quarter.substring(1));
      return qA - qB;
    });
    
    // Sort months within each quarter
    sortedQuarters.forEach(quarter => {
      quarter.months.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.monthIndex - b.monthIndex;
      });
    });
    
    return sortedQuarters;
  }, [events, now, currentYear, currentMonth, currentQuarter, showPastEvents, filterYear, isPastYear, isFutureYear, forcePastMode]);

  // Auto-expand the next quarter after the current quarter
  useEffect(() => {
    // Only do this if we're not using controlled state
    if (controlledExpandedQuarters) return;
    
    // Find the first non-current quarter (which will be the next quarter)
    const nextQuarter = quarterGroups.find(qg => !qg.isCurrentQuarter);
    if (nextQuarter) {
      const nextQuarterKey = `${nextQuarter.year}-${nextQuarter.quarter}`;
      setInternalExpandedQuarters(prev => {
        if (!prev.has(nextQuarterKey)) {
          return new Set([...prev, nextQuarterKey]);
        }
        return prev;
      });
    }
  }, [quarterGroups, controlledExpandedQuarters]);

  // Auto-scroll to the next upcoming event after render
  useEffect(() => {
    if (hasAutoScrolled || showPastEvents || loading || quarterGroups.length === 0) return;

    // Wait for the DOM to render completely
    const scrollTimer = setTimeout(() => {
      // Find the next upcoming event (the one with pulsing dot - has unique class)
      const pulsingDot = document.querySelector('.pulsing-catalyst-dot')?.parentElement?.parentElement?.parentElement;
      
      if (pulsingDot) {
        const scrollContainer = pulsingDot.closest('.overflow-x-auto');
        if (scrollContainer) {
          const containerWidth = scrollContainer.clientWidth;
          const elementLeft = (pulsingDot as HTMLElement).offsetLeft;
          const elementWidth = (pulsingDot as HTMLElement).offsetWidth;
          
          // Calculate scroll position to center the element
          const scrollPosition = elementLeft - (containerWidth / 2) + (elementWidth / 2);
          
          scrollContainer.scrollTo({
            left: scrollPosition,
            behavior: 'smooth'
          });
          
          setHasAutoScrolled(true);
        }
      }
    }, 500); // Wait for animations to complete

    return () => clearTimeout(scrollTimer);
  }, [quarterGroups, hasAutoScrolled, showPastEvents, loading]);

  const toggleQuarter = (quarterKey: string) => {
    if (onToggleQuarter) {
      // Use controlled toggle if provided
      onToggleQuarter(quarterKey);
    } else {
      // Otherwise use internal state
      setInternalExpandedQuarters(prev => {
        const newSet = new Set(prev);
        if (newSet.has(quarterKey)) {
          newSet.delete(quarterKey);
        } else {
          newSet.add(quarterKey);
        }
        return newSet;
      });
    }
  };

  if (quarterGroups.length === 0) {
    return (
      <>
        {/* Toggle between Past and Upcoming for current year, badge for other years */}
        <div className="flex items-center justify-center mb-4">
          {isCurrentYear ? (
            <div className="flex items-center gap-0.5 bg-muted/50 rounded-full p-0.5">
              <button
                onClick={() => setShowPastEvents(true)}
                className={`w-[110px] px-3 py-1 rounded-full text-sm transition-all flex items-center justify-center ${
                  showPastEvents
                    ? 'bg-foreground text-background font-medium' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Past
              </button>
              <button
                onClick={() => setShowPastEvents(false)}
                className={`w-[110px] px-3 py-1 rounded-full text-sm transition-all flex items-center justify-center ${
                  !showPastEvents
                    ? 'bg-foreground text-background font-medium' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Upcoming
              </button>
            </div>
          ) : (
            <div className="w-[110px] px-3 py-1 rounded-full text-sm bg-foreground text-background font-medium flex items-center justify-center">
              {isPastYear ? 'Past' : 'Upcoming'}
            </div>
          )}
        </div>
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No {isPastYear ? 'past' : isFutureYear ? 'upcoming' : showPastEvents ? 'past' : 'upcoming'} events</h3>
            <p className="text-sm text-muted-foreground">
              No {isPastYear ? 'past' : isFutureYear ? 'upcoming' : showPastEvents ? 'past' : 'upcoming'} catalysts found for your selected stocks.
            </p>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toggle between Past and Upcoming for current year, badge for other years - Hidden when hidePastUpcomingToggle is true */}
      {!hidePastUpcomingToggle && (
        <div className="flex items-center justify-center">
          {isCurrentYear ? (
            <div className="flex items-center gap-0.5 bg-muted/50 rounded-full p-0.5">
              <button
                onClick={() => setShowPastEvents(true)}
                className={`w-[110px] px-3 py-1 rounded-full text-sm transition-all flex items-center justify-center ${
                  showPastEvents
                    ? 'bg-foreground text-background font-medium' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Past
              </button>
              <button
                onClick={() => setShowPastEvents(false)}
                className={`w-[110px] px-3 py-1 rounded-full text-sm transition-all flex items-center justify-center ${
                  !showPastEvents
                    ? 'bg-foreground text-background font-medium' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Upcoming
              </button>
            </div>
          ) : (
            <div className="w-[110px] px-3 py-1 rounded-full text-sm bg-foreground text-background font-medium flex items-center justify-center">
              {isPastYear ? 'Past' : 'Upcoming'}
            </div>
          )}
        </div>
      )}
      {quarterGroups.map((quarterGroup) => {
        const quarterKey = `${quarterGroup.year}-${quarterGroup.quarter}`;
        const isExpanded = expandedQuarters.has(quarterKey);
        const showExpanded = quarterGroup.isCurrentQuarter || isExpanded;

        return (
          <div key={quarterKey} className="space-y-4">
            {/* Quarter Header - Only show if not hiding toggle */}
            {!hidePastUpcomingToggle && !quarterGroup.isCurrentQuarter && (
              <Collapsible
                open={isExpanded}
                onOpenChange={() => toggleQuarter(quarterKey)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full flex items-center justify-start p-4 h-auto hover:bg-muted/50 relative px-[12px] py-[0px]"
                  >
                    <span className="text-black text-lg font-medium">
                      {quarterGroup.displayName}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground absolute right-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground absolute right-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            )}

            {/* Current Quarter Header (non-collapsible) - Only show if not hiding toggle */}
            {!hidePastUpcomingToggle && quarterGroup.isCurrentQuarter && (
              <div className="flex items-center justify-start gap-2 px-[16px] pt-2 pb-2 m-[0px] py-[0px]">
                <span className="text-black text-lg font-medium">
                  {quarterGroup.displayName.replace(/^Current Quarter\s*-?\s*/i, '')}
                </span>
              </div>
            )}

            {/* Month Timelines */}
            <AnimatePresence>
              {showExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="space-y-6 overflow-hidden"
                >
                  {quarterGroup.months.map((monthGroup) => {
                    // Create a unique ID for this month that can be scrolled to
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const monthId = `month-${monthNames[monthGroup.monthIndex]}-${monthGroup.year}`;
                    
                    return (
                      <div key={`${monthGroup.year}-${monthGroup.monthIndex}`} id={monthId} data-month-id={monthId} className="space-y-3">
                      {/* Month Label */}
                      {showMonthHeader && (
                        <div className="px-4 flex justify-center items-center gap-2 mt-[0px] mr-[0px] mb-[15px] ml-[0px]">
                          <Badge variant="secondary" className="text-sm px-4 py-1">
                            {monthGroup.displayName}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {monthGroup.events.length} {monthGroup.events.length === 1 ? 'event' : 'events'}
                          </Badge>
                        </div>
                      )}

                      {/* Horizontal scrolling event cards with timeline */}
                      <div className="relative">
                        {/* Horizontal Timeline Line - Full Width */}
                        <div 
                          className="absolute bg-border pointer-events-none left-0 right-0" 
                          style={{ 
                            top: '3.5rem',
                            height: '1px',
                            zIndex: 0
                          }} 
                        />
                        
                        <div 
                          className="relative overflow-x-auto pb-2 scrollbar-hide"
                          style={{
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                            scrollBehavior: 'smooth',
                            scrollSnapType: 'x mandatory'
                          }}
                        >

                        <div 
                          className={`flex gap-4 ${monthGroup.events.length === 1 ? 'justify-center' : 'px-4'}`} 
                          style={{ width: monthGroup.events.length === 1 ? '100%' : 'max-content' }}
                        >
                          {monthGroup.events.map((event, eIndex) => {
                            const eventConfig = eventTypeConfig[event.type as keyof typeof eventTypeConfig] || eventTypeConfig.launch;
                            const EventIcon = eventTypeIcons[event.type as keyof typeof eventTypeIcons] || eventTypeIcons.launch;
                            const eventDate = event.actualDateTime ? new Date(event.actualDateTime) : null;
                            const eventTime = eventDate ? eventDate.getTime() : 0;
                            const currentTime = now.getTime();
                            const isUpcoming = eventTime > currentTime;
                            const isPast = !isUpcoming;
                            
                            // Find if this is the first upcoming event in this month
                            const isNextUpcoming = isUpcoming && eIndex === monthGroup.events.findIndex(e => {
                              const eDate = e.actualDateTime ? new Date(e.actualDateTime) : null;
                              return eDate ? eDate.getTime() > currentTime : false;
                            });
                            
                            return (
                              <motion.div
                                key={event.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: eIndex * 0.05 }}
                                className="relative w-72 flex-shrink-0"
                                style={{ scrollSnapAlign: 'center' }}
                              >
                                {/* Event Date and Timeline dot */}
                                <div className="absolute left-1/2 transform -translate-x-1/2 z-20" style={{ top: '3.5rem' }}>
                                  {/* Event Date above the dot */}
                                  {eventDate && (
                                    <div className="absolute bottom-full mb-[20px] left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-background px-1 mx-[0px] my-[8px] mt-[0px] mr-[0px] ml-[0px]">
                                      <span className="text-xs font-medium text-foreground m-[0px] p-[0px] text-[14px] text-[13px]">
                                        {`${eventDate.getMonth() + 1}/${eventDate.getDate()}/${eventDate.getFullYear()}`}
                                      </span>
                                    </div>
                                  )}
                                  <div className="transform -translate-y-1/2">
                                    {isNextUpcoming ? (
                                      // Pulsing dot for next upcoming event
                                      <motion.div
                                        className={`w-8 h-8 ${eventConfig.color} rounded-full catalyst-dot pulsing-catalyst-dot flex items-center justify-center shadow-md`}
                                        animate={{
                                          scale: [1, 1.1, 1],
                                        }}
                                        transition={{
                                          duration: 2,
                                          repeat: Infinity,
                                          ease: "easeInOut"
                                        }}
                                      >
                                        <EventIcon className="w-4 h-4 text-white" />
                                      </motion.div>
                                    ) : (
                                      // Regular dot with event type color
                                      <div 
                                        className={`w-8 h-8 rounded-full catalyst-dot ${eventConfig.color} flex items-center justify-center shadow-md`}
                                      >
                                        <EventIcon className="w-4 h-4 text-white" />
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Event Card with top margin for timeline */}
                                <div className={`mt-20 ${isPast ? 'opacity-75' : ''}`}>
                                  <Card
                                    className="cursor-pointer transition-all hover:border-ai-accent/50 h-full"
                                    onClick={() => onEventClick?.(event)}
                                  >
                                    <CardContent className="p-4">
                                      {variant === 'calendar' ? (
                                        // Calendar variant: Ticker badge and company name on top line
                                        <>
                                          {/* Top line: Ticker and Company Name */}
                                          <div className="flex items-center gap-2 mb-3">
                                            <Badge 
                                              className="bg-ai-accent text-background text-xs cursor-pointer hover:bg-ai-accent/80 rounded"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onTickerClick?.(event.ticker);
                                              }}
                                            >
                                              {event.ticker}
                                            </Badge>
                                            <p className="text-xs text-muted-foreground">
                                              {event.company}
                                            </p>
                                          </div>

                                          {/* Event Header */}
                                          <div className="flex items-start gap-3 mb-3">
                                            <div className="flex-1 min-w-0">
                                              <h4 className="font-semibold text-sm leading-tight mb-1">
                                                {event.title}
                                              </h4>
                                              <span className="text-xs mb-2 text-muted-foreground block">
                                                {eventConfig.label}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Event Details - No price change */}
                                          <div className="space-y-2">
                                            <div className="flex items-center justify-between pt-2 border-t border-border">
                                              <div className="text-xs text-muted-foreground">
                                                {formatEventDateTime(event.actualDateTime)}
                                              </div>
                                              {event.impactRating !== undefined && (
                                                <Badge 
                                                  style={{ 
                                                    backgroundColor: getImpactBackgroundColor(event.impactRating),
                                                    color: 'white'
                                                  }}
                                                  className="text-xs"
                                                >
                                                  {event.impactRating > 0 ? 'Bullish' : event.impactRating < 0 ? 'Bearish' : 'Neutral'} {Math.abs(event.impactRating)}
                                                </Badge>
                                              )}
                                            </div>

                                            {event.aiInsight && (
                                              <div className="text-xs text-muted-foreground pt-1">
                                                {event.aiInsight?.match(/^[^.!?]+[.!?]/)?.[0] || event.aiInsight}
                                              </div>
                                            )}
                                          </div>
                                        </>
                                      ) : (
                                        // Default variant: Original layout
                                        <>
                                          {/* Event Header */}
                                          <div className="flex items-start gap-3 mb-3">
                                            <div className="flex-1 min-w-0">
                                              <h4 className="font-semibold text-sm leading-tight mb-1">
                                                {event.title}
                                              </h4>
                                              <span className="text-xs mb-2 text-muted-foreground block">
                                                {eventConfig.label}
                                              </span>
                                              {showTickerBadge && (
                                                <p className="text-xs text-muted-foreground">
                                                  {event.company}
                                                </p>
                                              )}
                                            </div>
                                          </div>

                                          {/* Event Details */}
                                          <div className="space-y-2">
                                            {showTickerBadge && (
                                              <div className="flex items-center justify-between">
                                                <Badge 
                                                  className="bg-ai-accent text-background text-xs cursor-pointer hover:bg-ai-accent/80 rounded"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    onTickerClick?.(event.ticker);
                                                  }}
                                                >
                                                  {event.ticker}
                                                </Badge>
                                                {event.priceChange !== undefined && event.priceChangePercent !== undefined && (
                                                  <div className={`text-xs font-medium ${event.priceChange >= 0 ? 'text-positive' : 'text-negative'}`}>
                                                    {event.priceChange >= 0 ? '+' : ''}{event.priceChangePercent.toFixed(2)}%
                                                  </div>
                                                )}
                                              </div>
                                            )}

                                            <div className="flex items-center justify-between pt-2 border-t border-border">
                                              <div className="text-xs text-muted-foreground">
                                                {formatEventDateTime(event.actualDateTime)}
                                              </div>
                                              {event.impactRating !== undefined && (
                                                <Badge 
                                                  style={{ 
                                                    backgroundColor: getImpactBackgroundColor(event.impactRating),
                                                    color: 'white'
                                                  }}
                                                  className="text-xs"
                                                >
                                                  {event.impactRating > 0 ? 'Bullish' : event.impactRating < 0 ? 'Bearish' : 'Neutral'} {Math.abs(event.impactRating)}
                                                </Badge>
                                              )}
                                            </div>

                                            {event.aiInsight && (
                                              <div className="text-xs text-muted-foreground pt-1">
                                                {event.aiInsight?.match(/^[^.!?]+[.!?]/)?.[0] || event.aiInsight}
                                              </div>
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </CardContent>
                                  </Card>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                        </div>
                      </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}