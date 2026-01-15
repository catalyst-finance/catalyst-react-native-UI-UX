import { useState, useEffect, useRef, useMemo } from 'react';
import { Settings, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
import { Button } from './ui/button';
import { UpcomingEventsTimeline } from './upcoming-events-timeline';
import { CalendarMonthGrid } from './calendar-month-grid';
import DataService from '../utils/data-service';
import { MarketEvent } from '../utils/supabase/events-api';
import { getCurrentTime } from '../utils/current-time';

interface CalendarScreenProps {
  selectedTickers: string[];
  portfolioIntegration?: {
    enabled: boolean;
    method: 'auto' | 'manual';
    portfolioTickers?: string[];
    connectedAccounts?: any[];
  } | null;
  onTickerClick?: (ticker: string) => void;
  onEventClick?: (event: MarketEvent) => void;
}

export function CalendarScreen({ selectedTickers, portfolioIntegration, onTickerClick, onEventClick }: CalendarScreenProps) {
  // Combine selected tickers with portfolio tickers
  const allTickers = portfolioIntegration?.enabled && portfolioIntegration.portfolioTickers
    ? [...new Set([...selectedTickers, ...portfolioIntegration.portfolioTickers])]
    : selectedTickers;

  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [expandedQuarters, setExpandedQuarters] = useState<Set<string>>(new Set());
  
  // Memoize current year so it doesn't change on every render
  const currentYear = useMemo(() => getCurrentTime().getFullYear(), []);
  
  const [selectedYear, setSelectedYear] = useState(currentYear);
  
  // Use ref instead of state to persist across re-renders and year changes
  const hasScrolledToCurrentMonth = useRef(false);
  
  // Filter state
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      const fetchedEvents = await DataService.getEventsByTickers(allTickers);
      setEvents(fetchedEvents || []);
    };

    fetchEvents();
  }, [allTickers]);

  // DISABLED: Auto-scroll was causing issues when clicking months
  // useEffect(() => {
  //   // Exit if we've already scrolled
  //   if (hasScrolledToCurrentMonth.current) {
  //     return;
  //   }
  //   
  //   // Exit if no events loaded yet
  //   if (events.length === 0) {
  //     return;
  //   }
  //   
  //   // Exit if not viewing current year
  //   if (selectedYear !== currentYear) {
  //     return;
  //   }
  //
  //   console.log('[CalendarScreen ScrollEffect] Setting up scroll timer - will execute in 800ms');
  //   console.log('[CalendarScreen ScrollEffect] Events loaded:', events.length);
  //
  //   // Wait for content to render and layout to settle
  //   const scrollTimer = setTimeout(() => {
  //     // Double-check we haven't scrolled yet (in case effect ran multiple times)
  //     if (hasScrolledToCurrentMonth.current) {
  //       console.log('[CalendarScreen ScrollEffect] Already scrolled, aborting timer');
  //       return;
  //     }
  //     
  //     console.log('[CalendarScreen ScrollEffect] Timer fired! Starting scroll logic...');
  //     
  //     const currentMonthElement = document.querySelector('[data-current-month=\"true\"]');
  //     console.log('[CalendarScreen ScrollEffect] Current month element found:', !!currentMonthElement);
  //     
  //     if (currentMonthElement) {
  //       const elementRect = currentMonthElement.getBoundingClientRect();
  //       const elementTop = elementRect.top + window.scrollY;
  //       const elementHeight = elementRect.height;
  //       const viewportHeight = window.innerHeight;
  //       
  //       // Calculate scroll position to center the element vertically
  //       const scrollToPosition = elementTop - (viewportHeight / 2) + (elementHeight / 2);
  //       
  //       // Increase scroll by 30% to show more content below
  //       const adjustedScrollPosition = scrollToPosition * 1.3;
  //       
  //       console.log('[CalendarScreen ScrollEffect] Scrolling to position:', Math.max(0, adjustedScrollPosition));
  //       
  //       // Smooth scroll to position
  //       window.scrollTo({
  //         top: Math.max(0, adjustedScrollPosition),
  //         behavior: 'smooth'
  //       });
  //       
  //       hasScrolledToCurrentMonth.current = true;
  //       console.log('[CalendarScreen ScrollEffect] Set hasScrolledToCurrentMonth to true');
  //     }
  //   }, 800); // Wait for main-app scroll-to-top logic to complete
  //
  //   return () => {
  //     clearTimeout(scrollTimer);
  //   };
  // }, [events.length]); // Only run when events.length changes (0 -> 132)

  const handleMonthClick = (year: number, month: number) => {
    // Just update state, don't scroll
    // The CalendarMonthGrid component handles the expand/collapse animation internally
  };

  const handleToggleQuarter = (quarterKey: string) => {
    setExpandedQuarters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(quarterKey)) {
        newSet.delete(quarterKey);
      } else {
        newSet.add(quarterKey);
      }
      return newSet;
    });
  };

  // Get unique companies and event types from events
  const availableCompanies = [...new Set(events.map(e => e.ticker))].sort();
  const availableEventTypes = [...new Set(events.map(e => e.type))].sort();

  // Filter events based on selected filters
  const filteredEvents = events.filter(event => {
    const companyMatch = selectedCompanies.length === 0 || selectedCompanies.includes(event.ticker);
    const eventTypeMatch = selectedEventTypes.length === 0 || selectedEventTypes.includes(event.type);
    return companyMatch && eventTypeMatch;
  });

  const toggleCompanyFilter = (ticker: string) => {
    setSelectedCompanies(prev => 
      prev.includes(ticker) 
        ? prev.filter(t => t !== ticker)
        : [...prev, ticker]
    );
  };

  const toggleEventTypeFilter = (type: string) => {
    setSelectedEventTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const clearAllFilters = () => {
    setSelectedCompanies([]);
    setSelectedEventTypes([]);
  };

  const activeFilterCount = selectedCompanies.length + selectedEventTypes.length;

  return (
    <div className="min-h-screen bg-background pb-20" style={{ WebkitOverflowScrolling: 'touch', overflowY: 'auto', height: 'auto' }}>
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-40">
        <div className="px-4 py-4 border-b-0 pt-[16px] pr-[16px] pb-[0px] pl-[16px]">
          <div className="grid grid-cols-3 items-center mb-4">
            {/* Left spacer */}
            <div className="flex justify-start"></div>
            
            {/* Centered Title */}
            <h1 className="text-[20px] font-medium text-center">Calendar</h1>
            
            {/* Right Actions */}
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="px-[16px] pt-2 py-[0px]">
        {/* Filter Button */}
        <div className="mb-3 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-[12px] relative border border-border py-[0px]"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            <span className="text-sm">Filter</span>
            {activeFilterCount > 0 && (
              <span className="ml-2 bg-foreground text-background text-[10px] rounded-full h-4 px-1.5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="border border-border rounded-lg p-4 mb-4 bg-background">
            <div className="space-y-3">
              {/* Companies Filter */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Companies</span>
                  {selectedCompanies.length > 0 && (
                    <button
                      onClick={() => setSelectedCompanies([])}
                      className="text-xs text-foreground/60 hover:text-foreground"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableCompanies.map(ticker => (
                    <button
                      key={ticker}
                      onClick={() => toggleCompanyFilter(ticker)}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        selectedCompanies.includes(ticker)
                          ? 'bg-foreground text-background'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {ticker}
                    </button>
                  ))}
                </div>
              </div>

              {/* Event Types Filter */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Event Types</span>
                  {selectedEventTypes.length > 0 && (
                    <button
                      onClick={() => setSelectedEventTypes([])}
                      className="text-xs text-foreground/60 hover:text-foreground"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableEventTypes.map(type => (
                    <button
                      key={type}
                      onClick={() => toggleEventTypeFilter(type)}
                      className={`px-2 py-1 rounded text-xs transition-colors capitalize ${
                        selectedEventTypes.includes(type)
                          ? 'bg-foreground text-background'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {type.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear All Button */}
              {activeFilterCount > 0 && (
                <div className="pt-1">
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
                  >
                    <X className="h-3 w-3" />
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Calendar Month Grid - Add bottom padding for scrollability */}
        <div className="pb-[40vh] p-[0px]">
          <CalendarMonthGrid
            events={filteredEvents}
            onMonthClick={handleMonthClick}
            year={selectedYear}
            onYearChange={setSelectedYear}
            selectedTickers={allTickers}
            onTickerClick={onTickerClick}
            onEventClick={onEventClick}
          />
        </div>
      </div>
    </div>
  );
}