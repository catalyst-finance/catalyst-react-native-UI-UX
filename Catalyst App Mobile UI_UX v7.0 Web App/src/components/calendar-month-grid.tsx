import { useMemo, useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar, Clock, BarChart3, AlertCircle, Target, TrendingUp, DollarSign, Sparkles, Package, ShoppingCart, Users, Shield, Handshake, Building, Tag, Presentation, Scale, Landmark } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MarketEvent } from '../utils/supabase/events-api';
import { getCurrentTime } from '../utils/current-time';
import DataService from '../utils/data-service';
import { Badge } from './ui/badge';
import { eventTypeConfig, getEventTypeHexColor } from '../utils/formatting';

// Event Type Icon Components mapping (same as NewTodaySection)
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

interface CompanyInfo {
  ticker: string;
  logo: string;
  earliestEventDate: Date;
  eventTypes: string[]; // Array of event types for this ticker
}

interface MonthData {
  month: number;
  year: number;
  eventCount: number;
  companies: CompanyInfo[];
}

interface CalendarMonthGridProps {
  events: MarketEvent[];
  onMonthClick: (year: number, month: number) => void;
  year?: number;
  onYearChange?: (year: number) => void;
  selectedTickers?: string[];
  onTickerClick?: (ticker: string) => void;
  onEventClick?: (event: MarketEvent) => void;
}

export function CalendarMonthGrid({ events, onMonthClick, year: propYear, onYearChange, selectedTickers = [], onTickerClick, onEventClick }: CalendarMonthGridProps) {
  const now = getCurrentTime();
  const currentYear = useMemo(() => now.getFullYear(), []);
  const currentMonth = useMemo(() => now.getMonth(), []);
  
  const [selectedYear, setSelectedYear] = useState(propYear ?? currentYear);
  const [companiesWithLogos, setCompaniesWithLogos] = useState<Map<string, string>>(new Map());
  // Only expand current month if viewing the current year
  const [expandedMonth, setExpandedMonth] = useState<number | null>(
    (propYear ?? currentYear) === currentYear ? currentMonth : null
  );
  
  // Track if we've done initial expansion to prevent re-expanding on every render
  const hasInitialExpanded = useRef(false);
  
  // Touch gesture tracking for swipe navigation
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isAnimatingSwipe, setIsAnimatingSwipe] = useState<boolean>(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pendingYearChange, setPendingYearChange] = useState<number | null>(null);
  const [carouselOffset, setCarouselOffset] = useState<number>(0);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Sync internal state with prop changes
  useEffect(() => {
    if (propYear !== undefined) {
      setSelectedYear(propYear);
    }
  }, [propYear]);

  // Notify parent when year changes
  useEffect(() => {
    if (onYearChange) {
      onYearChange(selectedYear);
    }
  }, [selectedYear, onYearChange]);

  // Reset expanded month ONLY when year changes (not on every render)
  useEffect(() => {
    // Close any expanded month when switching years
    setExpandedMonth(null);
    // Reset the initial expansion flag when year changes
    hasInitialExpanded.current = false;
  }, [selectedYear]);

  // Auto-expand current month on initial load (only once)
  useEffect(() => {
    if (!hasInitialExpanded.current && selectedYear === currentYear) {
      setExpandedMonth(currentMonth);
      hasInitialExpanded.current = true;
    }
  }, [selectedYear, currentYear, currentMonth]);

  // Function to generate month data for any year
  const generateMonthDataForYear = (year: number): MonthData[] => {
    const data: MonthData[] = [];
    
    // Initialize 12 months for the specified year
    for (let i = 0; i < 12; i++) {
      data.push({
        month: i,
        year: year,
        eventCount: 0,
        companies: []
      });
    }

    // Count events per month and collect event types
    events.forEach(event => {
      if (!event.actualDateTime) return;
      
      const eventDate = new Date(event.actualDateTime);
      const eventMonth = eventDate.getMonth();
      const eventYear = eventDate.getFullYear();

      if (eventYear === year) {
        const monthInfo = data[eventMonth];
        monthInfo.eventCount++;
        
        // Track unique companies and their earliest event date
        const ticker = event.ticker || 'N/A';
        const existingCompany = monthInfo.companies.find(c => c.ticker === ticker);
        
        if (existingCompany) {
          // Update earliest event date if this event is earlier
          if (eventDate < existingCompany.earliestEventDate) {
            existingCompany.earliestEventDate = eventDate;
          }
          // Add event type to the company's eventTypes array
          if (!existingCompany.eventTypes.includes(event.eventType || event.type || 'corporate')) {
            existingCompany.eventTypes.push(event.eventType || event.type || 'corporate');
          }
        } else {
          // Add new company
          monthInfo.companies.push({ ticker, logo: '', earliestEventDate: eventDate, eventTypes: [event.eventType || event.type || 'corporate'] });
        }
      }
    });

    // Sort companies by earliest event date for each month
    data.forEach(monthInfo => {
      monthInfo.companies.sort((a, b) => a.earliestEventDate.getTime() - b.earliestEventDate.getTime());
    });

    return data;
  };

  // Group events by month for current year (used by existing logic)
  const monthData = useMemo(() => generateMonthDataForYear(selectedYear), [events, selectedYear]);

  const handleMonthClick = (monthIndex: number) => {
    if (expandedMonth === monthIndex) {
      setExpandedMonth(null);
    } else {
      setExpandedMonth(monthIndex);
    }
    onMonthClick(selectedYear, monthIndex);
  };
  
  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsDragging(true);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    touchEndX.current = e.touches[0].clientX;
    const offset = touchEndX.current - touchStartX.current;
    // Apply resistance at the edges (reduce movement by 30% for rubber band effect)
    setDragOffset(offset * 0.7);
  };
  
  const handleTouchEnd = () => {
    const swipeDistance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50; // Minimum distance in pixels to register as a swipe
    
    setIsDragging(false);
    
    // Swipe left (next year)
    if (swipeDistance > minSwipeDistance) {
      setPendingYearChange(selectedYear + 1);
      setIsAnimatingSwipe(true);
      setSwipeDirection('left');
      // Don't reset dragOffset yet - let it animate to completion
    }
    // Swipe right (previous year)
    else if (swipeDistance < -minSwipeDistance) {
      setPendingYearChange(selectedYear - 1);
      setIsAnimatingSwipe(true);
      setSwipeDirection('right');
      // Don't reset dragOffset yet - let it animate to completion
    } else {
      // Not enough swipe distance, snap back
      setDragOffset(0);
    }
    
    // Reset touch positions
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  // Filter events for expanded month
  const expandedMonthEvents = useMemo(() => {
    if (expandedMonth === null) return [];
    
    return events.filter(event => {
      if (!event.actualDateTime) return false;
      const eventDate = new Date(event.actualDateTime);
      return eventDate.getMonth() === expandedMonth && eventDate.getFullYear() === selectedYear;
    });
  }, [events, expandedMonth, selectedYear]);

  useEffect(() => {
    const fetchLogos = async () => {
      // Collect all unique tickers from all months
      const uniqueTickers = Array.from(
        new Set(monthData.flatMap(data => data.companies.map(company => company.ticker)))
      );

      if (uniqueTickers.length === 0) return;

      try {
        // Fetch all stock data at once (includes company logos)
        const stocksData = await DataService.getStocks(uniqueTickers);
        
        const logoMap = new Map<string, string>();
        Object.entries(stocksData).forEach(([ticker, stockData]) => {
          if (stockData.logo) {
            logoMap.set(ticker, stockData.logo);
          }
        });

        setCompaniesWithLogos(logoMap);
      } catch (error) {
        console.error('Error fetching company logos:', error);
      }
    };

    fetchLogos();
  }, [monthData]);

  // Helper function to render a month button
  const renderMonthButton = (data: MonthData, index: number, quarterHasEvents: boolean) => {
    const isCurrentMonth = data.month === now.getMonth() && data.year === now.getFullYear();
    const hasEvents = data.eventCount > 0;
    const totalCompanies = data.companies.length;
    const displayCompanies = data.companies.slice(0, 3); // Show max 3 tickers
    const remainingCount = totalCompanies - 3;
    const isExpanded = expandedMonth === data.month;
    
    // Use compressed height if quarter has no events
    const heightClass = quarterHasEvents ? 'h-32' : 'h-16';

    return (
      <button
        key={`${data.month}-${index}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Blur the button immediately to prevent browser auto-scroll
          (e.currentTarget as HTMLButtonElement).blur();
          handleMonthClick(data.month);
        }}
        data-current-month={isCurrentMonth ? 'true' : undefined}
        className={`
          relative p-3 rounded-lg border transition-all flex flex-col items-start ${heightClass}
          ${isCurrentMonth 
            ? 'bg-zinc-200 dark:bg-zinc-800 text-foreground border-zinc-300 dark:border-zinc-700' 
            : hasEvents 
              ? 'bg-background hover:bg-muted border-border hover:border-ai-accent/50' 
              : 'bg-muted/30 border-border/50 opacity-60'
          }
          ${isExpanded ? 'ring-2 ring-ai-accent' : ''}
        `}
      >
        {/* Month Name */}
        <div className={`text-xs font-medium mb-2 ${isCurrentMonth ? 'text-foreground' : 'text-foreground'}`}>
          {monthNames[data.month]}
        </div>

        {/* Ticker Badges with Event Type Icons */}
        {hasEvents && (
          <div className="w-full flex-1 flex flex-col gap-1.5 mt-1">
            {displayCompanies.map((company, idx) => {
              const displayEventTypes = company.eventTypes.slice(0, 3); // Max 3 icons per ticker
              
              return (
                <div key={`${data.month}-${company.ticker}-${idx}`} className="flex items-center gap-1">
                  {/* Ticker Badge */}
                  <Badge 
                    className={`text-[8px] px-1 py-0 h-4 rounded ${
                      isCurrentMonth 
                        ? 'bg-black dark:bg-black text-white' 
                        : 'bg-black dark:bg-black text-white'
                    }`}
                  >
                    {company.ticker}
                  </Badge>
                  
                  {/* Stacked Event Type Icons */}
                  <div className="flex -space-x-1.5">
                    {displayEventTypes.map((eventType, iconIdx) => {
                      const IconComponent = eventTypeIcons[eventType] || Building;
                      
                      return (
                        <div
                          key={`${company.ticker}-${eventType}-${iconIdx}`}
                          className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ring-1 ring-background"
                          style={{ backgroundColor: getEventTypeHexColor(eventType) }}
                        >
                          <IconComponent className="w-2 h-2 text-white" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            
            {/* Remaining tickers indicator */}
            {totalCompanies > 3 && (
              <div className={`text-[8px] mt-auto ${isCurrentMonth ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                +{remainingCount} more
              </div>
            )}
          </div>
        )}
      </button>
    );
  };

  // Helper function to render a collapsed/compact month (for past quarters)
  const renderCompactMonth = (data: MonthData, index: number) => {
    const isCurrentMonth = data.month === now.getMonth() && data.year === now.getFullYear();
    const hasEvents = data.eventCount > 0;
    const isExpanded = expandedMonth === data.month;
    
    // Collect all event types from all companies in this month
    const allEventTypes: string[] = [];
    data.companies.forEach(company => {
      company.eventTypes.forEach(eventType => {
        allEventTypes.push(eventType);
      });
    });
    
    // Limit to show only as many dots as can fit (estimate ~8-10 icons max with overlap)
    const displayEventTypes = allEventTypes.slice(0, 10);

    return (
      <button
        key={`${data.month}-${index}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          (e.currentTarget as HTMLButtonElement).blur();
          handleMonthClick(data.month);
        }}
        data-current-month={isCurrentMonth ? 'true' : undefined}
        className={`
          relative p-2 rounded-lg border transition-all flex items-center justify-between h-auto min-h-[36px]
          ${isCurrentMonth 
            ? 'bg-zinc-200 dark:bg-zinc-800 text-foreground border-zinc-300 dark:border-zinc-700' 
            : hasEvents 
              ? 'bg-background hover:bg-muted border-border hover:border-ai-accent/50' 
              : 'bg-muted/30 border-border/50 opacity-60'
          }
          ${isExpanded ? 'ring-2 ring-ai-accent' : ''}
        `}
      >
        {/* Month Name */}
        <div className={`text-[10px] font-medium ${isCurrentMonth ? 'text-foreground' : 'text-foreground'}`}>
          {monthNames[data.month]}
        </div>

        {/* Event Type Icons Stacked Horizontally - Same line, to the right */}
        {hasEvents && (
          <div className="flex -space-x-1">
            {displayEventTypes.map((eventType, idx) => {
              const IconComponent = eventTypeIcons[eventType] || Building;
              
              return (
                <div
                  key={`${data.month}-event-${idx}`}
                  className="w-3 h-3 rounded-full flex items-center justify-center flex-shrink-0 ring-1 ring-background"
                  style={{ backgroundColor: getEventTypeHexColor(eventType) }}
                >
                  <IconComponent className="w-1.5 h-1.5 text-white" />
                </div>
              );
            })}
          </div>
        )}
      </button>
    );
  };

  // Helper function to render expandable timeline
  const renderExpandedTimeline = (monthIndex: number) => {
    if (expandedMonth !== monthIndex) return null;

    // Sort events by date
    const sortedEvents = [...expandedMonthEvents].sort((a, b) => {
      const dateA = a.actualDateTime ? new Date(a.actualDateTime).getTime() : 0;
      const dateB = b.actualDateTime ? new Date(b.actualDateTime).getTime() : 0;
      return dateA - dateB;
    });

    // Format date for display
    const formatEventDate = (dateStr: string | null) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
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
      const today = getCurrentTime();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      return date >= todayStart && date <= todayEnd;
    };

    return (
      <AnimatePresence>
        <motion.div
          key={`timeline-${monthIndex}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="col-span-3 mt-3"
        >
          <div className="p-4 px-[0px] py-[16px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">{fullMonthNames[monthIndex]} {selectedYear}</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedMonth(null);
                }}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Event Cards List with Vertical Timeline */}
            <div className="relative pt-[0px] pr-[0px] pb-[0px] pl-[32px]">
              {/* Vertical Timeline Line */}
              <div 
                className="absolute left-3 top-0 bottom-0 w-px bg-border" 
                style={{ 
                  zIndex: 0
                }} 
              />

              <div className="space-y-3">
                {sortedEvents.map((event, eventIndex) => {
                  const eventType = (event.eventType || event.type || 'corporate') as string;
                  const config = eventTypeConfig[eventType as keyof typeof eventTypeConfig] || eventTypeConfig.corporate;
                  const IconComponent = eventTypeIcons[eventType] || Building;
                  const isToday = isEventToday(event.actualDateTime);
                  
                  // Check if this is an upcoming event
                  const eventDate = event.actualDateTime ? new Date(event.actualDateTime) : null;
                  const eventTime = eventDate ? eventDate.getTime() : 0;
                  const currentTime = getCurrentTime().getTime();
                  const isUpcoming = eventTime > currentTime;
                  
                  // Find if this is the next upcoming event
                  const isNextUpcoming = isUpcoming && eventIndex === sortedEvents.findIndex(e => {
                    const eDate = e.actualDateTime ? new Date(e.actualDateTime) : null;
                    return eDate ? eDate.getTime() > currentTime : false;
                  });
                  
                  return (
                    <div key={event.id} className="relative">
                      {/* Timeline Dot - positioned to center on the line */}
                      <div className="absolute top-1/2 transform -translate-y-1/2 z-10" style={{ left: '-20px' }}>
                        <div className="transform -translate-x-1/2">
                          {isNextUpcoming ? (
                            // Pulsing dot with icon for next upcoming event
                            <motion.div
                              className="w-5 h-5 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: getEventTypeHexColor(eventType) }}
                              animate={{
                                scale: [1, 1.3, 1],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            >
                              <IconComponent className="w-2.5 h-2.5 text-white" />
                            </motion.div>
                          ) : (
                            // Regular dot with event type icon
                            <div 
                              className="w-5 h-5 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: getEventTypeHexColor(eventType) }}
                            >
                              <IconComponent className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Event Card */}
                      <div
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

                        {/* Ticker Badge and Event Title */}
                        <div className="flex items-center gap-2 mb-1 pr-20">
                          <Badge className="bg-[rgb(0,0,0)] dark:bg-[rgb(0,0,0)] text-white text-xs rounded">
                            {event.symbol || event.ticker}
                          </Badge>
                        </div>
                        
                        {/* Event Title */}
                        <p className="text-sm text-foreground">
                          {event.title || `${event.symbol || event.ticker} ${config.label}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {sortedEvents.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No events for this month
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    );
  };

  // Helper function to render a quarter section for a specific year
  const renderQuarter = (quarterName: string, startMonth: number, endMonth: number, yearData: MonthData[]) => {
    const quarterMonths = yearData.slice(startMonth, endMonth);
    
    // Check if the quarter has any events
    const quarterHasEvents = quarterMonths.some(data => data.eventCount > 0);
    
    // Determine if this quarter should be collapsed (compact view)
    const isCurrentYear = yearData[0]?.year === currentYear;
    const isPastYear = yearData[0]?.year < currentYear;
    const quarterEndMonth = endMonth - 1; // Last month of the quarter (0-indexed)
    const isQuarterInPast = isCurrentYear && quarterEndMonth < currentMonth;
    
    // Use compact rendering for: past years OR past quarters in current year
    const useCompactView = isPastYear || isQuarterInPast;
    
    return (
      <div className="px-3">
        <div className="text-[10px] font-medium text-muted-foreground mb-2 px-1">{quarterName}</div>
        <div className="grid grid-cols-3 gap-3">
          {quarterMonths.map((data, index) => (
            <div key={data.month} className="contents">
              {useCompactView ? renderCompactMonth(data, index) : renderMonthButton(data, index, quarterHasEvents)}
            </div>
          ))}
        </div>
        
        {/* Inline expanded timeline appears after the row */}
        {quarterMonths.some(data => expandedMonth === data.month) && (
          <div className="grid grid-cols-1 mt-0">
            {quarterMonths.map(data => renderExpandedTimeline(data.month))}
          </div>
        )}
      </div>
    );
  };

  // Helper to render a complete year
  const renderYear = (year: number) => {
    // Generate data for this specific year
    const yearData = generateMonthDataForYear(year);
    
    return (
      <div className="w-full">
        {/* Year Header */}
        <div className="flex items-center justify-between mb-4 px-4">
          <button
            className="p-1 hover:bg-muted rounded"
            onClick={() => {
              setPendingYearChange(selectedYear - 1);
              setSwipeDirection('right');
              setIsAnimatingSwipe(true);
            }}
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <h2 className="text-[14px] font-medium">{year}</h2>
          <button
            className="p-1 hover:bg-muted rounded"
            onClick={() => {
              setPendingYearChange(selectedYear + 1);
              setSwipeDirection('left');
              setIsAnimatingSwipe(true);
            }}
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Month Grid */}
        <div className="space-y-4 bg-[rgba(0,0,0,0)]">
          {/* Q1 */}
          {renderQuarter('Q1', 0, 3, yearData)}

          {/* Q2 */}
          {renderQuarter('Q2', 3, 6, yearData)}

          {/* Q3 */}
          {renderQuarter('Q3', 6, 9, yearData)}

          {/* Q4 */}
          {renderQuarter('Q4', 9, 12, yearData)}
        </div>
      </div>
    );
  };

  return (
    <div 
      className="bg-background border border-border rounded-lg mb-6 py-[16px] overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      ref={containerRef}
    >
      {/* Carousel Container */}
      <div className="relative w-full overflow-hidden">
        <motion.div
          key={selectedYear} // Force re-mount when year changes to reset position
          initial={false} // Don't animate on mount/remount
          className="flex"
          style={{ width: '300%' }}
          animate={{
            x: isAnimatingSwipe && swipeDirection
              ? swipeDirection === 'left'
                ? '-66.666%'  // Swipe to next year (one year to the left)
                : '0%'  // Swipe to previous year (one year to the right)
              : `calc(-33.333% + ${dragOffset}px)`
          }}
          transition={{
            type: "tween",
            duration: isAnimatingSwipe ? 0.3 : (isDragging ? 0 : 0.3),
            ease: "easeOut"
          }}
          onAnimationComplete={() => {
            if (isAnimatingSwipe && pendingYearChange !== null) {
              // Animation completed - now update the year
              // The key change will cause instant reset to center
              setSelectedYear(pendingYearChange);
              setPendingYearChange(null);
              setIsAnimatingSwipe(false);
              setSwipeDirection(null);
              setDragOffset(0);
            }
          }}
        >
          {/* Previous Year */}
          <div className="w-1/3 flex-shrink-0">
            {renderYear(selectedYear - 1)}
          </div>
          
          {/* Current Year */}
          <div className="w-1/3 flex-shrink-0">
            {renderYear(selectedYear)}
          </div>
          
          {/* Next Year */}
          <div className="w-1/3 flex-shrink-0">
            {renderYear(selectedYear + 1)}
          </div>
        </motion.div>
      </div>
    </div>
  );
}