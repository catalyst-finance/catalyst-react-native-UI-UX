import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Calendar, TrendingUp, Loader2, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import DataService from '../utils/data-service';
import { MarketEvent } from '../utils/supabase/events-api';
import { getCurrentTime } from '../utils/current-time';

interface CatalystTimelineProps {
  selectedTickers: string[];
  onPeriodClick?: (period: { year: string; month?: string; quarter?: string; type: 'month' | 'quarter' }) => void;
  onJumpToEvents?: (period: { year: string; month?: string; quarter?: string; type: 'month' | 'quarter' }) => void;
  isFilterEnabled?: boolean;
  events?: MarketEvent[]; // Optional events from parent to avoid reloading
}

interface TimelineData {
  period: string;
  shortLabel: string;
  year: string;
  eventCount: number;
  isCurrentQuarter?: boolean;
  type: 'month' | 'quarter';
  month?: number; // 0-11 for months
  quarter?: number; // 0-3 for quarters
}

// Generate monthly timeline data for a specific quarter
const generateMonthlyTimelineData = (events: MarketEvent[], selectedTickers: string[], targetYear: number, targetQuarter: number): { data: TimelineData[], totalMonths: number } => {
  const now = getCurrentTime();
  const filteredEvents = events;
  
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  const data: TimelineData[] = [];
  
  // Count events by month - only future events
  const getEventCountForMonth = (year: number, month: number): number => {
    return filteredEvents.filter(event => {
      if (!event.actualDateTime) return false;
      const eventDate = new Date(event.actualDateTime);
      const isCorrectPeriod = eventDate.getFullYear() === year && eventDate.getMonth() === month;
      const isFuture = eventDate > now;
      return isCorrectPeriod && isFuture;
    }).length;
  };
  
  // Generate data for the 3 months in the selected quarter
  const startMonth = targetQuarter * 3;
  const endMonth = startMonth + 3;
  
  for (let monthIndex = startMonth; monthIndex < endMonth; monthIndex++) {
    const eventCount = getEventCountForMonth(targetYear, monthIndex);
    
    data.push({
      period: `${months[monthIndex]} ${targetYear}`,
      shortLabel: months[monthIndex],
      year: targetYear.toString(),
      eventCount,
      isCurrentQuarter: false,
      type: 'month',
      month: monthIndex
    });
  }
  
  return { data, totalMonths: 3 };
};

// Generate timeline data from actual events
const generateTimelineData = (events: MarketEvent[], selectedTickers: string[], timeOffset: number = 0): { data: TimelineData[], totalMonths: number } => {
  const now = getCurrentTime();
  const baseMonth = now.getMonth() + (timeOffset * 12); // Offset by full years
  const baseYear = now.getFullYear() + Math.floor(baseMonth / 12);
  const adjustedMonth = ((baseMonth % 12) + 12) % 12; // Handle negative values
  const currentQuarter = Math.floor(adjustedMonth / 3);
  
  // Events are already filtered by tickers in the data loading, so use them directly
  let filteredEvents = events;
  
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  const data: TimelineData[] = [];
  
  // Count events by time period - only future events
  const getEventCountForMonth = (year: number, month: number): number => {
    return filteredEvents.filter(event => {
      if (!event.actualDateTime) return false;
      const eventDate = new Date(event.actualDateTime);
      const isCorrectPeriod = eventDate.getFullYear() === year && eventDate.getMonth() === month;
      const isFuture = eventDate > now;
      return isCorrectPeriod && isFuture;
    }).length;
  };
  
  const getEventCountForQuarter = (year: number, quarter: number): number => {
    const startMonth = quarter * 3;
    const endMonth = startMonth + 3;
    const eventsInQuarter = filteredEvents.filter(event => {
      if (!event.actualDateTime) return false;
      const eventDate = new Date(event.actualDateTime);
      const eventMonth = eventDate.getMonth();
      const eventYear = eventDate.getFullYear();
      const isCorrectPeriod = eventYear === year && 
             eventMonth >= startMonth && 
             eventMonth < endMonth;
      const isFuture = eventDate > now;
      
      return isCorrectPeriod && isFuture;
    });
    
    return eventsInQuarter.length;
  };
  
  // For future years (timeOffset > 0), show only quarters
  // For current year (timeOffset = 0), show remaining months + quarters
  const remainingMonthsInQuarter = [];
  
  if (timeOffset === 0) {
    // Calculate remaining months in current quarter only for default view
    const quarterStartMonth = currentQuarter * 3;
    const quarterEndMonth = quarterStartMonth + 3;
    
    for (let month = adjustedMonth; month < quarterEndMonth; month++) {
      remainingMonthsInQuarter.push(month);
    }
    
    // Add remaining months in current quarter
    remainingMonthsInQuarter.forEach((month, index) => {
      const actualMonth = month % 12;
      const actualYear = baseYear + Math.floor(month / 12);
      const monthName = months[actualMonth];
      const eventCount = getEventCountForMonth(actualYear, actualMonth);
      
      data.push({
        period: `${monthName} ${actualYear}`,
        shortLabel: monthName,
        year: actualYear.toString(),
        eventCount,
        isCurrentQuarter: index === 0, // First month is current month
        type: 'month',
        month: actualMonth
      });
    });
  }
  
  // Determine quarters to show
  let quartersToShow, startQuarter, startYear;
  
  if (timeOffset === 0) {
    // Default view: Add 4 full quarters starting from next quarter
    quartersToShow = 4;
    startQuarter = (currentQuarter + 1) % 4;
    startYear = currentQuarter === 3 ? baseYear + 1 : baseYear;
  } else {
    // Future years: Continue from where the previous page left off
    quartersToShow = 5;
    
    // Calculate the last quarter shown on the default page
    const defaultNextQuarter = (currentQuarter + 1) % 4;
    const defaultNextYear = currentQuarter === 3 ? baseYear + 1 : baseYear;
    
    // The default page shows 4 quarters starting from defaultNextQuarter
    // So the last quarter shown is: (defaultNextQuarter + 3) % 4
    const lastQuarterShown = (defaultNextQuarter + 3) % 4;
    const lastYearShown = defaultNextYear + Math.floor((defaultNextQuarter + 3) / 4);
    
    // Start from the quarter after the last one shown
    // Add (timeOffset - 1) additional year jumps for multiple forward clicks
    const baseNextQuarter = (lastQuarterShown + 1) % 4;
    const baseNextYear = lastQuarterShown === 3 ? lastYearShown + 1 : lastYearShown;
    
    startQuarter = baseNextQuarter;
    startYear = baseNextYear + (timeOffset - 1);
  }
  
  for (let i = 0; i < quartersToShow; i++) {
    const targetQuarter = (startQuarter + i) % 4;
    const targetYear = startYear + Math.floor((startQuarter + i) / 4);
    const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];
    
    const eventCount = getEventCountForQuarter(targetYear, targetQuarter);
    
    data.push({
      period: `${quarterNames[targetQuarter]} ${targetYear}`,
      shortLabel: quarterNames[targetQuarter],
      year: targetYear.toString(),
      eventCount,
      isCurrentQuarter: false,
      type: 'quarter',
      quarter: targetQuarter
    });
  }
  
  // Calculate total months represented
  const totalMonths = timeOffset === 0 
    ? remainingMonthsInQuarter.length + (4 * 3) // remaining months + 4 quarters
    : 5 * 3; // 5 quarters for future years
  
  // Calculate total events in timeline periods  
  const totalTimelineEvents = data.reduce((sum, period) => sum + period.eventCount, 0);
  
  return { data, totalMonths };
};

const getIntensityColor = (count: number, isCurrentQuarter: boolean) => {
  // Updated event density scale: Low = 1-3, Medium = 4-7, High = 8+
  if (count >= 8) return 'bg-ai-accent';        // High density
  if (count >= 4) return 'bg-ai-accent/70';     // Medium density
  if (count >= 1) return 'bg-ai-accent/40';     // Low density
  return 'bg-ai-accent/20';                     // No events
};

// Get solid background color style for opaque circles
const getSolidBackgroundStyle = (count: number, isCurrentQuarter: boolean) => {
  const baseColor = '#6366F1'; // ai-accent color
  
  // Updated event density scale: Low = 1-3, Medium = 4-7, High = 8+
  if (count >= 8) return { backgroundColor: baseColor };       // High density - 100% opacity
  if (count >= 4) return { backgroundColor: `${baseColor}B3` }; // Medium density - 70% opacity
  if (count >= 1) return { backgroundColor: `${baseColor}66` }; // Low density - 40% opacity
  return { backgroundColor: `${baseColor}33` };                // No events - 20% opacity
};

export function CatalystTimeline({ selectedTickers, onPeriodClick, onJumpToEvents, isFilterEnabled = false, events: parentEvents }: CatalystTimelineProps) {
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeOffset, setTimeOffset] = useState(0); // 0 = current, 1 = next year, -1 = previous year
  const [drillDownMode, setDrillDownMode] = useState<{
    active: boolean;
    year: number;
    quarter: number;
  } | null>(null);
  
  // Track the clicked quarter index and transition state
  const [clickedQuarterIndex, setClickedQuarterIndex] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousTimelineData, setPreviousTimelineData] = useState<TimelineData[]>([]);

  // Helper function to handle period clicks
  const handlePeriodClick = (item: TimelineData) => {
    if (item.type === 'quarter' && !drillDownMode) {
      // Store current timeline data before transition
      setPreviousTimelineData([...timelineData]);
      
      // Find the index of the clicked quarter in the current timeline
      const quarterIndex = timelineData.findIndex(timelineItem => 
        timelineItem.type === item.type && 
        timelineItem.shortLabel === item.shortLabel && 
        timelineItem.year === item.year
      );
      
      setClickedQuarterIndex(quarterIndex);
      setIsTransitioning(true);
      
      // Delay the drill down to allow the push-out animation
      setTimeout(() => {
        setDrillDownMode({
          active: true,
          year: parseInt(item.year),
          quarter: item.quarter!
        });
        setIsTransitioning(false);
      }, 100); // Much faster transition to months
      
      // For quarter clicks, do NOT call any callbacks to prevent scrolling
      // Only drill down to monthly view
    } else if (item.type === 'month') {
      // Month clicked - jump to events in that month
      if (onJumpToEvents) {
        onJumpToEvents({
          year: item.year,
          month: item.shortLabel,
          type: 'month'
        });
      }
      
      // For month clicks, don't call onPeriodClick since we want different behavior
      // The onJumpToEvents handles the scrolling to events
    }
  };

  // Helper function to return to default view
  const handleBackToDefault = () => {
    setDrillDownMode(null);
    setClickedQuarterIndex(null);
    setIsTransitioning(false);
    setPreviousTimelineData([]);
  };
  
  // Use events from parent if provided, otherwise load from database
  useEffect(() => {
    if (parentEvents) {
      // Use events passed from parent (avoids reloading and flickering)
      setEvents(parentEvents);
      setIsLoading(false);
      return;
    }

    // Fallback: Load events from database if not provided by parent
    const loadEvents = async () => {
      try {
        setIsLoading(true);
        // Get events for specific tickers (same approach as dashboard)
        let eventData;
        if (selectedTickers.length > 0) {
          const allEvents = await DataService.getEventsByTickers(selectedTickers);
          // Filter for upcoming events only, just like the dashboard
          const now = getCurrentTime();
          eventData = allEvents.filter(event => {
            if (!event.actualDateTime) return true;
            const eventDate = new Date(event.actualDateTime);
            return eventDate > now;
          });
        } else if (isFilterEnabled) {
          // When filter is enabled but no stocks selected, show no events
          eventData = [];
        } else {
          // Normal mode with no specific tickers - show general events
          eventData = await DataService.getUpcomingEvents(100);
        }
        setEvents(eventData);
      } catch (error) {
        console.error('Error loading events for timeline:', error);
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, [parentEvents, selectedTickers, isFilterEnabled]); // Only reload if parentEvents change or fallback needed

  // Generate timeline data based on current mode
  const { data: timelineData, totalMonths } = drillDownMode
    ? generateMonthlyTimelineData(events, selectedTickers, drillDownMode.year, drillDownMode.quarter)
    : generateTimelineData(events, selectedTickers, timeOffset);
  const totalEvents = timelineData.reduce((sum, item) => sum + item.eventCount, 0);
  
  const handlePreviousPeriod = () => {
    setTimeOffset(prev => prev - 1);
  };
  
  const handleNextPeriod = () => {
    setTimeOffset(prev => prev + 1);
  };

  if (isLoading) {
    return (
      <Card className="border-0">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin text-ai-accent" />
            <span className="text-sm text-muted-foreground">Loading event timeline...</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="relative">
      <div className="pb-[8px] pt-[5px] pr-[0px] pl-[0px] mt-[0px] mr-[0px] mb-[10px] ml-[0px]">
        <motion.div 
          key={drillDownMode ? 'monthly' : 'quarterly'}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="text-sm font-medium text-foreground text-center"
        >
          {drillDownMode ? (
            `Q${drillDownMode.quarter + 1} ${drillDownMode.year} - Monthly View`
          ) : (
            `Looking ahead ${timeOffset > 0 ? `${totalMonths + (timeOffset * 12)}+ months` : totalMonths === 12 ? '12 months' : totalMonths > 12 ? '12+ months' : `${totalMonths} months`}`
          )}
        </motion.div>
      </div>

      <Card className="border-0 dark:border-0 relative overflow-hidden">

      {/* Navigation Arrows - only show in default mode */}
      <AnimatePresence>
        {!drillDownMode && (
          <>
            {/* Left Arrow - positioned on left edge, vertically centered */}
            {timeOffset > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10"
              >
                <ChevronLeft 
                  className="h-5 w-5 text-ai-accent cursor-pointer hover:text-ai-accent/80 transition-colors" 
                  onClick={handlePreviousPeriod}
                />
              </motion.div>
            )}

            {/* Right Arrow - positioned on right edge, vertically centered */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 z-10"
            >
              <ChevronRight 
                className="h-5 w-5 text-ai-accent cursor-pointer hover:text-ai-accent/80 transition-colors" 
                onClick={handleNextPeriod}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

        <CardContent className={`pt-0 ${drillDownMode ? 'pb-12' : 'pb-0'}`}>
          <div className="space-y-3">
            {/* Timeline */}
          <div className="relative">
            {/* Timeline line */}
            <motion.div 
              className="absolute top-4 left-0 right-0 h-0.5 bg-border"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
            
            {/* Timeline items container */}
            <motion.div 
              key={drillDownMode ? `monthly-${drillDownMode.quarter}` : `quarterly-${timeOffset}`}
              className="flex justify-between relative bg-[rgba(0,0,0,0)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <AnimatePresence mode="popLayout">
                {(isTransitioning ? previousTimelineData : timelineData).map((item, index) => {
                  // Adjust circle size based on number of time periods
                  const currentData = isTransitioning ? previousTimelineData : timelineData;
                  const circleSize = currentData.length > 6 ? 'w-7 h-7' : currentData.length > 5 ? 'w-7 h-7' : 'w-8 h-8';
                  const textSize = currentData.length > 6 ? 'text-[10px]' : 'text-xs';
                  
                  // Calculate animation based on current mode and clicked quarter position
                  const getAnimationProps = () => {
                    if (isTransitioning && clickedQuarterIndex !== null) {
                      // Transition state: push out non-selected quarters
                      const pushDirection = index < clickedQuarterIndex ? -300 : index > clickedQuarterIndex ? 300 : 0;
                      
                      if (index === clickedQuarterIndex) {
                        // The clicked quarter stays in place initially
                        return {
                          initial: { opacity: 1, scale: 1, x: 0, y: 0 },
                          animate: { opacity: 1, scale: 1, x: 0, y: 0 },
                          exit: { opacity: 0, scale: 0.8, x: 0, y: 0 },
                          transition: { duration: 0.3, ease: "easeOut" }
                        };
                      } else {
                        // Other quarters get pushed out
                        return {
                          initial: { opacity: 1, scale: 1, x: 0, y: 0 },
                          animate: { opacity: 0, scale: 0.6, x: pushDirection, y: 0 },
                          exit: { opacity: 0, scale: 0.6, x: pushDirection, y: 0 },
                          transition: { duration: 0.2, ease: "easeInOut" }
                        };
                      }
                    } else if (!drillDownMode) {
                      // Normal quarterly view - simple slide up animation
                      return {
                        initial: { opacity: 0, scale: 0.8, x: 0, y: 20 },
                        animate: { opacity: 1, scale: 1, x: 0, y: 0 },
                        exit: { opacity: 0, scale: 0.8, x: 0, y: -20 },
                        transition: {
                          duration: 0.4,
                          delay: index * 0.05,
                          ease: "easeOut"
                        }
                      };
                    } else {
                      // Drill-down mode - months pushing out horizontally from center
                      const totalMonths = timelineData.length;
                      const centerIndex = Math.floor(totalMonths / 2);
                      const distanceFromCenter = index - centerIndex;
                      
                      return {
                        initial: { 
                          opacity: 0, 
                          scale: 0.2,
                          x: 0, // All start from center
                          y: 0
                        },
                        animate: { 
                          opacity: 1, 
                          scale: 1,
                          x: 0, // Push out to natural positions
                          y: 0
                        },
                        exit: { 
                          opacity: 0, 
                          scale: 0.2,
                          x: 0, // Return to center
                          y: 0
                        },
                        transition: {
                          duration: 0.4,
                          delay: Math.abs(distanceFromCenter) * 0.03, // Fast stagger from center outward
                          ease: "backOut",
                          type: "spring",
                          stiffness: 400,
                          damping: 30
                        }
                      };
                    }
                  };
                  
                  const animProps = getAnimationProps();
                  
                  return (
                    <motion.div 
                      key={`${item.type}-${item.shortLabel}-${item.year}`}
                      layout
                      initial={animProps.initial}
                      animate={animProps.animate}
                      exit={animProps.exit}
                      transition={{
                        ...animProps.transition,
                        layout: { duration: 0.3 }
                      }}
                      className={`flex flex-col items-center ${item.eventCount > 0 ? 'cursor-pointer' : 'cursor-default'}`}
                      onClick={item.eventCount > 0 ? () => handlePeriodClick(item) : undefined}
                      whileHover={item.eventCount > 0 ? { 
                        scale: 1.05,
                        transition: { duration: 0.2 }
                      } : undefined}
                      whileTap={item.eventCount > 0 ? { 
                        scale: 0.95,
                        transition: { duration: 0.1 }
                      } : undefined}
                    >
                      {/* Event indicator - updated with new density scale and dynamic sizing */}
                      <motion.div 
                        className={`${circleSize} rounded-full flex items-center justify-center relative z-10 catalyst-dot ${
                          item.eventCount >= 8 
                            ? 'bg-ai-accent' 
                            : item.eventCount >= 4 
                              ? 'bg-[#6B7280]' 
                              : item.eventCount >= 1 
                                ? 'bg-[#9CA3AF] dark:bg-gray-600' 
                                : 'bg-[#D1D5DB] dark:bg-gray-700'
                        }`}
                        whileHover={item.eventCount > 0 ? {
                          boxShadow: "0 4px 12px rgba(21, 84, 240, 0.3)",
                          transition: { duration: 0.2 }
                        } : undefined}
                      >
                        <motion.span 
                          className={`${textSize} font-medium ${
                            item.eventCount >= 8
                              ? 'text-background'
                              : item.eventCount >= 4 
                                ? 'text-white' 
                                : item.eventCount >= 1
                                  ? 'text-gray-800 dark:text-white'
                                  : 'text-gray-800 dark:text-gray-300'
                          }`}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ 
                            duration: 0.3, 
                            delay: index * 0.05 + 0.2,
                            ease: "easeOut"
                          }}
                        >
                          {item.eventCount}
                        </motion.span>
                      </motion.div>
                      
                      {/* Period label */}
                      <motion.div 
                        className="mt-2 text-center"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ 
                          duration: 0.3, 
                          delay: index * 0.05 + 0.1,
                          ease: "easeOut"
                        }}
                      >
                        <div className={`text-xs font-medium ${item.eventCount > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {item.shortLabel}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {item.year}
                        </div>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          </div>
          
          {/* Back Button positioned at bottom-left underneath timeline */}
          <AnimatePresence>
            {drillDownMode && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex justify-start mt-4"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-ai-accent hover:text-ai-accent/80 hover:bg-ai-accent/10 px-2 h-7"
                  onClick={handleBackToDefault}
                >
                  <ArrowLeft className="h-3 w-3 mr-1" />
                  Back
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}