import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from './ui/badge';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { getCurrentTime } from '../utils/current-time';
import { formatEventDateTime, getImpactBackgroundColor } from '../utils/formatting';

interface CompactTimelineEvent {
  id: string;
  title: string;
  type: string;
  actualDateTime?: string;
  time?: string;
  aiInsight: string;
  impactRating: number;
  confidence?: number;
  isUpcoming: boolean;
  company?: string;
  ticker?: string;
  currentPrice?: number;
  marketCap?: number;
}

interface CompactHorizontalTimelineProps {
  events: CompactTimelineEvent[];
  eventTypeConfig: Record<string, any>;
  eventTypeIcons: Record<string, any>;
  onEventClick?: (event: CompactTimelineEvent) => void;
  onCenteredEventChange?: (eventId: string | null) => void;
  ticker?: string;
}

export function CompactHorizontalTimeline({ 
  events, 
  eventTypeConfig, 
  eventTypeIcons,
  onEventClick,
  onCenteredEventChange,
  ticker,
}: CompactHorizontalTimelineProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [showResetButton, setShowResetButton] = useState(false);
  const [centeredEventId, setCenteredEventId] = useState<string | null>(null);
  const hasInitialScrolled = useRef(false);
  const [isInitialScrolling, setIsInitialScrolling] = useState(false);

  // Sort events by date
  const sortedEvents = [...events].sort((a, b) => {
    if (!a.actualDateTime && !b.actualDateTime) return 0;
    if (!a.actualDateTime) return 1;
    if (!b.actualDateTime) return -1;
    
    const dateA = new Date(a.actualDateTime).getTime();
    const dateB = new Date(b.actualDateTime).getTime();
    
    return dateA - dateB;
  });

  const now = getCurrentTime();
  
  // Find the first upcoming event index
  const firstUpcomingIndex = sortedEvents.findIndex(event => {
    if (!event.actualDateTime) return event.isUpcoming;
    return new Date(event.actualDateTime).getTime() > now.getTime();
  });

  // Find nowIndex for positioning
  const nowIndex = firstUpcomingIndex !== -1 ? firstUpcomingIndex : sortedEvents.length;
  
  // Track scroll position to show/hide reset button
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || firstUpcomingIndex === -1) return;

    const handleScroll = () => {
      const cardSpacing = 74;
      const targetScroll = Math.max(0, (firstUpcomingIndex * cardSpacing) - (container.clientWidth / 2) + (cardSpacing / 2));
      
      // Show button if scrolled away from next upcoming event by more than 150px
      const scrollDiff = Math.abs(container.scrollLeft - targetScroll);
      setShowResetButton(scrollDiff > 150);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [firstUpcomingIndex]);

  // Track centered event based on scroll position
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || sortedEvents.length === 0) return;

    const handleScroll = () => {
      // Don't update centered event if a card is currently expanded
      if (expandedEventId) return;
      
      // Calculate which event is currently centered
      const cardSpacing = 74;
      const scrollLeft = container.scrollLeft;
      const containerCenter = scrollLeft + (container.clientWidth / 2);
      const paddingOffset = 0; // No padding
      
      // Find the closest event to center
      let closestIndex = -1;
      let closestDistance = Infinity;
      
      sortedEvents.forEach((_, index) => {
        const cardCenter = (index * cardSpacing) + paddingOffset + (cardSpacing / 2);
        const distance = Math.abs(containerCenter - cardCenter);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });
      
      if (closestIndex !== -1 && closestDistance < cardSpacing) {
        const newCenteredId = sortedEvents[closestIndex].id;
        if (newCenteredId !== centeredEventId) {
          setCenteredEventId(newCenteredId);
          onCenteredEventChange?.(newCenteredId);
        }
      } else {
        if (centeredEventId !== null) {
          setCenteredEventId(null);
          onCenteredEventChange?.(null);
        }
      }
    };

    // Initial check
    handleScroll();

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [sortedEvents, centeredEventId, onCenteredEventChange, expandedEventId]);

  // Reset to next upcoming event
  const handleResetScroll = () => {
    const container = scrollContainerRef.current;
    if (!container || firstUpcomingIndex === -1) return;

    const cardSpacing = 74;
    const targetScroll = Math.max(0, (firstUpcomingIndex * cardSpacing) - (container.clientWidth / 2) + (cardSpacing / 2));
    
    container.scrollTo({ left: targetScroll, behavior: 'smooth' });
    setExpandedEventId(null); // Close any expanded cards
  };

  // Initial scroll to next upcoming event on mount
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || firstUpcomingIndex === -1 || hasInitialScrolled.current) {
      return;
    }
    
    // Disable scroll snap during initial positioning
    setIsInitialScrolling(true);
    
    // Use setTimeout to ensure the content is fully rendered and scrollable
    const timeoutId = setTimeout(() => {
      const cardSpacing = 74;
      // Center the "Now" indicator which is positioned at nowIndex
      // The "Now" line is at (nowIndex * 74) + 36, so center that position
      const nowLinePosition = (nowIndex * cardSpacing) + 36;
      const targetScroll = Math.max(0, nowLinePosition - (container.clientWidth / 2));
      
      // Use instant scroll on initial load (no animation)
      container.scrollTo({ left: targetScroll, behavior: 'instant' });
      hasInitialScrolled.current = true;
      
      // Check the scroll position and re-enable snap after a brief delay
      setTimeout(() => {
        // Don't re-enable scroll snap yet - wait for user interaction
        // This prevents snap from shifting the view away from "Now"
        setTimeout(() => {
          setIsInitialScrolling(false); // Re-enable scroll snap after a longer delay
        }, 500); // Wait 500ms more before enabling snap
      }, 50);
    }, 100); // Give 100ms for the DOM to render
    
    return () => {
      clearTimeout(timeoutId);
      setIsInitialScrolling(false);
    };
  }, [firstUpcomingIndex, ticker]);

  // Recenter after expansion if 'expandedEventId' changes due to other interactions
  useEffect(() => {
    if (!expandedEventId) return;
    // center once on next paint, then again after the animation
    requestAnimationFrame(() => centerCardById(expandedEventId));
    const t = setTimeout(() => centerCardById(expandedEventId), 350);
    return () => clearTimeout(t);
  }, [expandedEventId]);

  // Measure and center an event card by id using DOM measurement.
  const centerCardById = (eventId: string, behavior: ScrollBehavior = 'smooth') => {
    const container = scrollContainerRef.current;
    const el = cardRefs.current[eventId];
    if (!container || !el) return;

    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    const currentScroll = container.scrollLeft;
    const elLeft = elRect.left - containerRect.left + currentScroll;
    const elCenter = elLeft + elRect.width / 2;

    const targetScroll = Math.max(0, elCenter - container.clientWidth / 2);
    container.scrollTo({ left: targetScroll, behavior });
  }

  // Handle event click - toggle expand
  const handleEventClick = (event: CompactTimelineEvent) => {
    const container = scrollContainerRef.current;
    
    if (expandedEventId === event.id) {
      // Collapsing - keep card centered and pulsing during collapse
      setExpandedEventId(null);
      // Keep this event as centered during collapse
      setCenteredEventId(event.id);
      onCenteredEventChange?.(event.id);
      
      // Scroll to center the collapsed card
      setTimeout(() => {
        if (!container) return;
        
        const eventIndex = sortedEvents.findIndex(e => e.id === event.id);
        if (eventIndex === -1) return;
        
        // Calculate position to center the compact card (72px wide)
        const compactCardWidth = 72;
        const gap = 2; // 2px gap
        
        // Position of the card's left edge (no padding offset)
        const cardLeftPosition = (eventIndex * (compactCardWidth + gap));
        
        // Center the compact card in the viewport
        const targetScroll = cardLeftPosition - (container.clientWidth / 2) + (compactCardWidth / 2);
        
        container.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
      }, 50);
      
      onEventClick?.(event);
    } else {
      // Expanding - first center the compact card, then expand it
      if (container) {
        const eventIndex = sortedEvents.findIndex(e => e.id === event.id);
        if (eventIndex !== -1) {
          // Set expanded state so element expands
          setExpandedEventId(event.id);
          setCenteredEventId(event.id);
          onCenteredEventChange?.(event.id);

          // Center the card by measuring its DOM position
          requestAnimationFrame(() => centerCardById(event.id, 'smooth'));
          // Re-center after animation completes to ensure it's exactly centered
          setTimeout(() => centerCardById(event.id, 'smooth'), 350);
        }
      } else {
        setExpandedEventId(event.id);
        setCenteredEventId(event.id);
        onCenteredEventChange?.(event.id);
      }
    }
  };

  if (sortedEvents.length === 0) {
    return null;
  }

  return (
    <div className="relative" style={{ left: '-1rem', width: 'calc(100% + 2rem)' }}>
      {/* Timeline line */}
      <div 
        className="absolute bg-border pointer-events-none h-[2px] dark:h-[2px]"
        style={{
          top: '2.75rem',
          left: '0',
          right: '0',
          width: '100vw',
          marginLeft: 'calc(-1 * max(0px, (100vw - 100%) / 2))',
          zIndex: 0
        }}
      />
      
      {/* "Now" indicator */}
      {nowIndex !== -1 && nowIndex < sortedEvents.length && (
        <div 
          className="absolute top-0 bottom-0 w-px bg-ai-accent z-10 pointer-events-none"
          style={{ 
            left: `${(nowIndex * 74) + 36}px`, // 74px spacing (72px card + 2px gap), 36px to center (no padding offset)
            transform: 'translateX(-0.5px)'
          }}
        >
          <div className="absolute left-1/2 transform -translate-x-1/2" style={{ top: '2.25rem' }}>
            <Badge variant="outline" className="text-[10px] bg-background px-1.5 py-0 border-ai-accent h-4">
              Now
            </Badge>
          </div>
        </div>
      )}

      {/* Scrollable Events */}
      <div 
        ref={scrollContainerRef}
        className="flex overflow-x-auto pb-2 scrollbar-hide relative snap-container"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          gap: '2px',
          // Disable snap during initial scroll positioning, only enable when no card is expanded
          scrollSnapType: (expandedEventId || isInitialScrolling) ? 'none' : 'x mandatory'
        }}
      >
        {/* Future events gradient background inside scroll container */}
        {nowIndex !== -1 && nowIndex < sortedEvents.length && (
          <div 
            className="absolute pointer-events-none"
            style={{ 
              left: `${(nowIndex * 74) - 1}px`, // Position at the gap between last past event and first upcoming event
              width: '300vw', // Extend far beyond to cover all future events
              top: '0',
              bottom: '0',
              zIndex: 1
            }}
          >
            {/* Horizontal gradient - Light mode */}
            <div 
              className="absolute inset-0 dark:hidden"
              style={{
                background: 'linear-gradient(to right, rgba(236, 236, 240, 0) 0%, rgba(236, 236, 240, 0.75) 15%, rgba(236, 236, 240, 0.75) 85%, rgba(236, 236, 240, 0) 100%)',
                pointerEvents: 'none',
                left: '-4%',
                width: '104%'
              }}
            />
            {/* Horizontal gradient - Dark mode */}
            <div 
              className="absolute inset-0 hidden dark:block"
              style={{
                background: 'linear-gradient(to right, rgba(48, 48, 48, 0) 0%, rgba(48, 48, 48, 0.85) 15%, rgba(48, 48, 48, 0.85) 85%, rgba(48, 48, 48, 0) 100%)',
                pointerEvents: 'none',
                left: '-4%',
                width: '104%'
              }}
            />
            {/* Vertical gradient overlay - top to bottom fade - Light mode */}
            <div 
              className="absolute inset-0 dark:hidden"
              style={{
                background: 'linear-gradient(to bottom, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0) 8%, rgba(255, 255, 255, 0) 92%, rgba(255, 255, 255, 1) 100%)',
                pointerEvents: 'none',
                left: '-4%',
                width: '104%'
              }}
            />
            {/* Vertical gradient overlay - top to bottom fade - Dark mode */}
            <div 
              className="absolute inset-0 hidden dark:block"
              style={{
                background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0) 8%, rgba(0, 0, 0, 0) 92%, rgba(0, 0, 0, 0.8) 100%)',
                pointerEvents: 'none',
                left: '-4%',
                width: '104%'
              }}
            />
          </div>
        )}
        
        {sortedEvents.map((event, index) => {
          const eventConfig = eventTypeConfig[event.type as keyof typeof eventTypeConfig] || eventTypeConfig.launch;
          const EventIcon = eventTypeIcons[event.type as keyof typeof eventTypeIcons] || eventTypeIcons.launch;
          const isExpanded = expandedEventId === event.id;
          const isNext = event.isUpcoming && index === firstUpcomingIndex;
          const isCentered = centeredEventId === event.id;
          const isPast = !event.isUpcoming;
          
          return (
            <motion.div
              key={event.id}
              ref={(el) => { cardRefs.current[event.id] = el as HTMLDivElement }}
              className="relative flex-shrink-0 snap-item"
              animate={{ 
                width: isExpanded ? 272 : 72,
              }}
              transition={{ 
                type: "spring",
                stiffness: 400,
                damping: 35,
                mass: 0.8
              }}
              style={{
                scrollSnapAlign: 'center',
                zIndex: 10,
                minHeight: '120px'
              }}
            >
              {/* Date above the timeline */}
              <div className="absolute left-1/2 transform -translate-x-1/2 text-[10px] text-muted-foreground" style={{ top: '0.5rem' }}>
                {event.actualDateTime && new Date(event.actualDateTime).toLocaleDateString('en-US', {
                  month: '2-digit',
                  day: '2-digit',
                  year: '2-digit'
                }).replace(/\//g, '/')}
              </div>

              {/* Large circular icon on timeline - replaces the small dot */}
              <div className="absolute left-1/2 transform -translate-x-1/2 z-20" style={{ top: '1.5rem' }}>
                {/* Background circle to block timeline line from showing through transparent past events */}
                <div className="absolute inset-0 w-10 h-10 bg-background rounded-full" style={{ zIndex: -1 }} />
                
                {isCentered ? (
                  <motion.div
                    className={`w-10 h-10 ${eventConfig.color} rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-105 transition-transform active:scale-95 ${isPast ? 'opacity-50' : ''}`}
                    onClick={() => handleEventClick(event)}
                    animate={{
                      boxShadow: [
                        '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                        '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                      ]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <EventIcon className="w-5 h-5 text-white" />
                  </motion.div>
                ) : (
                  <div 
                    className={`w-10 h-10 ${eventConfig.color} rounded-full flex items-center justify-center shadow-md cursor-pointer hover:scale-105 transition-transform active:scale-95 ${isPast ? 'opacity-50' : ''}`}
                    onClick={() => handleEventClick(event)}
                  >
                    <EventIcon className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>

              {/* Event type label and expand button grouped together */}
              <div 
                className="absolute left-1/2 transform -translate-x-1/2 w-full"
                style={{ top: '4.75rem' }}
              >
                <div className="flex flex-col items-center gap-0.5">
                  {/* Event type label */}
                  <div 
                    className={`text-[10px] text-center font-medium leading-tight line-clamp-2 w-full px-1 cursor-pointer ${isPast ? 'opacity-50' : ''}`}
                    onClick={() => handleEventClick(event)}
                  >
                    {eventConfig.label}
                  </div>

                  {/* Expand chevron button */}
                  <button 
                    onClick={() => handleEventClick(event)}
                    className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Event Card - Only shown when expanded */}
              {isExpanded && (
                <div className={`${isPast ? 'opacity-60' : ''}`} style={{ marginTop: '6.5rem' }}>
                  <motion.div
                    layout
                    className="rounded-lg cursor-pointer transition-all bg-background border-2 border-ai-accent shadow-lg"
                  >
                    {/* Expanded View - Full Details */}
                    <motion.div
                      key="expanded"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="p-3 cursor-pointer"
                      onClick={(e) => {
                        // Allow clicking the expanded card to navigate to event page
                        onEventClick?.(event);
                      }}
                    >
                      {/* Header with Icon and Close Button */}
                      <div className="flex items-start gap-2 mb-2">
                        <div className={`w-8 h-8 ${eventConfig.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <EventIcon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Badge variant="outline" className="text-[10px] mb-1">
                            {eventConfig.label}
                          </Badge>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedEventId(null);
                          }}
                          className="flex-shrink-0 p-1 hover:bg-muted rounded transition-colors"
                        >
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        </button>
                      </div>

                      {/* Title */}
                      <h4 className="font-semibold text-xs leading-tight mb-2 line-clamp-2">
                        {event.title}
                      </h4>

                      {/* Date/Time */}
                      <div className="text-[10px] text-muted-foreground mb-2">
                        {formatEventDateTime(event.actualDateTime)}
                      </div>

                      {/* AI Insight */}
                      {event.aiInsight && (
                        <div className={`${event.isUpcoming ? 'bg-ai-accent/5' : 'bg-muted/50'} rounded p-2 mb-2`}>
                          <p className="text-[10px] leading-relaxed line-clamp-3 text-muted-foreground">
                            {event.aiInsight}
                          </p>
                        </div>
                      )}

                      {/* Impact Rating */}
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <span className="text-[10px] text-muted-foreground">
                          {event.isUpcoming ? 'Expected' : 'Impact'}
                        </span>
                        <Badge 
                          style={{ 
                            backgroundColor: getImpactBackgroundColor(event.impactRating),
                            color: 'white'
                          }}
                          className="text-[10px] h-5"
                        >
                          {event.impactRating > 0 ? 'Bullish' : event.impactRating < 0 ? 'Bearish' : 'Neutral'} {Math.abs(event.impactRating)}
                        </Badge>
                      </div>

                      {/* Confidence for upcoming events */}
                      {event.isUpcoming && event.confidence && (
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-muted-foreground">AI Confidence</span>
                          <span className="text-[10px] text-ai-accent font-medium">{event.confidence}%</span>
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Reset Button */}
      <AnimatePresence>
        {showResetButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            onClick={handleResetScroll}
            className="absolute right-2 bottom-1 w-7 h-7 bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-900 text-black dark:text-white rounded-full shadow-lg flex items-center justify-center z-30 transition-colors border border-border"
            aria-label="Return to next upcoming event"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </motion.button>
        )}
      </AnimatePresence>

      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}