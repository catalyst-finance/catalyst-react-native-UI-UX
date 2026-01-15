import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Badge } from './ui/badge';
import { getCurrentTime } from '../utils/current-time';

interface HorizontalTimelineEvent {
  id: string;
  title: string;
  type: string;
  actualDateTime?: string;
  timeUntil?: string;
  time?: string;
  aiInsight: string;
  impactRating: number;
  confidence?: number;
  isUpcoming: boolean;
}

interface HorizontalTimelineProps {
  events: HorizontalTimelineEvent[];
  eventTypeConfig: Record<string, any>;
  eventTypeIcons: Record<string, any>;
  formatEventDateTime: (date?: string) => string;
  onScrollStateChange?: (isNearNow: boolean, scrollToNow: () => void) => void;
  onEventClick?: (event: HorizontalTimelineEvent) => void;
  onCenteredEventChange?: (eventId: string | null) => void;
}

export function HorizontalTimeline({ 
  events, 
  eventTypeConfig, 
  eventTypeIcons, 
  formatEventDateTime,
  onScrollStateChange,
  onEventClick,
  onCenteredEventChange
}: HorizontalTimelineProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasInitialScrolled = useRef(false);
  const scrollAttemptCount = useRef(0);
  const onScrollStateChangeRef = useRef(onScrollStateChange);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isNearNow, setIsNearNow] = useState(true);

  // Keep the ref updated with the latest callback
  useEffect(() => {
    onScrollStateChangeRef.current = onScrollStateChange;
  }, [onScrollStateChange]);

  // Sort events by date - past events (most recent first) then future events (soonest first)
  const sortedEvents = [...events].sort((a, b) => {
    if (!a.actualDateTime && !b.actualDateTime) return 0;
    if (!a.actualDateTime) return 1;
    if (!b.actualDateTime) return -1;
    
    const dateA = new Date(a.actualDateTime).getTime();
    const dateB = new Date(b.actualDateTime).getTime();
    
    return dateA - dateB; // Chronological order
  });

  // Find the current time position and first upcoming event
  const now = getCurrentTime();
  
  // Find nowIndex - first event with future date (for "Now" line positioning)
  // This is the authoritative source for determining upcoming events
  const nowIndex = sortedEvents.findIndex(event => {
    if (!event.actualDateTime) return false;
    return new Date(event.actualDateTime).getTime() > now.getTime();
  });
  
  // Find the first upcoming event index (for initial centering)
  // Use actual date comparison rather than relying solely on isUpcoming flag
  const firstUpcomingIndex = sortedEvents.findIndex(event => {
    if (!event.actualDateTime) return event.isUpcoming; // Fallback to flag if no date
    return new Date(event.actualDateTime).getTime() > now.getTime();
  });
  

  
  // Calculate time progression for overlay - position relative to event cards
  let timeProgressionWidth = 0;
  if (sortedEvents.length > 0) {
    // Find the position of "now" relative to the timeline
    let nowPosition = 0;
    
    // Calculate based on actual event positions
    for (let i = 0; i < sortedEvents.length; i++) {
      const event = sortedEvents[i];
      if (!event.actualDateTime) continue;
      
      const eventTime = new Date(event.actualDateTime).getTime();
      const nowTime = now.getTime();
      
      if (eventTime > nowTime) {
        // Current time is before this event
        if (i > 0) {
          // Interpolate between previous and current event
          const prevEvent = sortedEvents[i - 1];
          if (prevEvent.actualDateTime) {
            const prevTime = new Date(prevEvent.actualDateTime).getTime();
            const ratio = (nowTime - prevTime) / (eventTime - prevTime);
            nowPosition = (i - 1) + ratio;
          } else {
            nowPosition = i;
          }
        } else {
          nowPosition = 0;
        }
        break;
      } else if (i === sortedEvents.length - 1) {
        // Current time is after all events
        nowPosition = sortedEvents.length;
      }
    }
    
    // Convert position to pixels (288px card + 16px gap = 304px per card)
    const cardSpacing = 304; // w-72 (288px) + gap-4 (16px)
    const cardWidth = 288; // w-72
    // Account for the offset to the center of the first card
    timeProgressionWidth = (cardWidth / 2) + (nowPosition * cardSpacing);
  }

  const scrollToNow = () => {
    if (!scrollContainerRef.current) return;
    const targetIndex = firstUpcomingIndex !== -1 ? firstUpcomingIndex : nowIndex;
    if (targetIndex === -1) return;
    const cardSpacing = 304; // w-72 (288px) + gap-4 (16px)
    const targetScroll = Math.max(0, (targetIndex * cardSpacing) - (scrollContainerRef.current.clientWidth / 2) + (cardSpacing / 2));
    scrollContainerRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
  };

  // Update scroll indicators and "near now" status
  const updateScrollIndicators = () => {
    if (!scrollContainerRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setScrollPosition(scrollLeft);
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    
    // Calculate which event card is centered in the viewport
    const viewportCenter = scrollLeft + (clientWidth / 2);
    const cardSpacing = 304; // w-72 (288px) + gap-4 (16px)
    const padding = 24; // px-6 padding
    
    // Find the index of the centered card
    const centeredIndex = Math.round((viewportCenter - padding - (cardSpacing / 2)) / cardSpacing);
    
    // Get the centered event if valid
    const centeredEvent = sortedEvents[centeredIndex];
    if (centeredEvent && onCenteredEventChange) {
      onCenteredEventChange(centeredEvent.id);
    } else if (onCenteredEventChange) {
      onCenteredEventChange(null);
    }
    
    // Check if we're near the first upcoming event position
    const targetIndex = firstUpcomingIndex !== -1 ? firstUpcomingIndex : nowIndex;
    if (targetIndex !== -1 && targetIndex < sortedEvents.length) {
      const targetPositionPx = (targetIndex * cardSpacing) + (cardSpacing / 2); // Center of the target card
      const distanceFromTarget = Math.abs(targetPositionPx - viewportCenter);
      
      // Consider "near" if within 200px of the target position
      const newIsNearNow = distanceFromTarget < 200;
      setIsNearNow(newIsNearNow);
      
      // Notify parent of scroll state changes using ref to avoid dependency issues
      if (onScrollStateChangeRef.current) {
        onScrollStateChangeRef.current(newIsNearNow, scrollToNow);
      }
    } else {
      setIsNearNow(true); // If no target position, don't show the button
      if (onScrollStateChangeRef.current) {
        onScrollStateChangeRef.current(true, scrollToNow);
      }
    }
  };

  // Separate effect for initial scroll that only runs once when data is ready
  useEffect(() => {
    const container = scrollContainerRef.current;
    
    // Only attempt scroll if we have events and haven't scrolled yet
    if (!container || hasInitialScrolled.current || sortedEvents.length === 0) {
      return;
    }

    const targetIndex = firstUpcomingIndex !== -1 ? firstUpcomingIndex : nowIndex;
    
    // Don't try to scroll if we don't have a valid target
    if (targetIndex === -1) {
      return;
    }

    const attemptScroll = () => {
      scrollAttemptCount.current += 1;
      
      // Check if container is ready (has width)
      if (container.clientWidth === 0) {
        // Retry up to 10 times
        if (scrollAttemptCount.current < 10) {
          setTimeout(attemptScroll, 100);
        }
        return;
      }

      const cardSpacing = 304; // w-72 (288px) + gap-4 (16px)
      const targetScroll = Math.max(0, (targetIndex * cardSpacing) - (container.clientWidth / 2) + (cardSpacing / 2));
      
      container.scrollTo({ left: targetScroll, behavior: 'auto' });
      hasInitialScrolled.current = true;
    };

    // Start attempting to scroll
    const timeout = setTimeout(attemptScroll, 100);
    
    return () => clearTimeout(timeout);
  }, [sortedEvents.length, firstUpcomingIndex, nowIndex]);

  // Separate effect for scroll indicators
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    updateScrollIndicators();
    container.addEventListener('scroll', updateScrollIndicators);

    return () => container.removeEventListener('scroll', updateScrollIndicators);
  }, [sortedEvents.length, firstUpcomingIndex, nowIndex]); // Only re-run when event positions change

  if (sortedEvents.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">No events to display</p>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Full-width timeline line that extends to screen edges */}
      <div 
        className="absolute bg-border pointer-events-none h-[2px] dark:h-[2px]"
        style={{
          top: '2rem',
          left: '50%',
          width: '100vw',
          marginLeft: '-50vw',
          zIndex: 0
        }}
      />
      
      {/* Timeline Container */}
      <div className="relative">
        
        {/* "Now" separator line - static position based on timeline */}
        {nowIndex !== -1 && (
          <div 
            className="absolute top-0 bottom-0 w-px bg-ai-accent z-10"
            style={{ 
              left: `${(nowIndex * 304) + 152 + 24}px`, // 304px spacing, 152px to center (half of 304), 24px for px-6 padding
              transform: 'translateX(-0.5px)'
            }}
          >
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
              <Badge variant="outline" className="text-xs bg-background px-2 py-0.5 border-ai-accent">
                Now
              </Badge>
            </div>
          </div>
        )}

        {/* Scrollable Events */}
        <div 
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-6 relative"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            scrollBehavior: 'smooth',
            scrollSnapType: 'x mandatory'
          }}
        >
          {/* Time Progression Overlay - Thicker line on top of timeline */}
          {timeProgressionWidth > 0 && (
            <div 
              className="absolute left-0 bg-gradient-to-r from-ai-accent/40 to-ai-accent/15 pointer-events-none" 
              style={{ 
                top: '2rem',
                transform: 'translateY(-1px)',
                height: '3px',
                width: `${timeProgressionWidth}px`,
                marginLeft: '24px', // Account for px-6 padding
                zIndex: 1
              }} 
            />
          )}
          
          {sortedEvents.map((event, index) => {
            const eventConfig = eventTypeConfig[event.type as keyof typeof eventTypeConfig] || eventTypeConfig.launch;
            const EventIcon = eventTypeIcons[event.type as keyof typeof eventTypeIcons] || eventTypeIcons.launch;
            const isNext = event.isUpcoming && index === nowIndex; // First upcoming event
            const isPast = !event.isUpcoming;
            
            return (
              <div
                key={event.id}
                className="relative flex-shrink-0 w-72"
                style={{ scrollSnapAlign: 'center' }}
              >
                {/* Timeline dot */}
                <div className="absolute top-7 left-1/2 transform -translate-x-1/2 z-20">
                  {isNext ? (
                    // Pulsing dot for next upcoming event
                    <motion.div
                      className={`w-3 h-3 ${eventConfig.color} rounded-full catalyst-dot`}
                      animate={{
                        scale: [1, 1.3, 1],
                        opacity: [1, 0.7, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  ) : (
                    // Regular dot with event type color
                    <div 
                      className={`w-2.5 h-2.5 rounded-full catalyst-dot ${eventConfig.color}`}
                    />
                  )}
                </div>

                {/* Event Card */}
                <div className={`mt-12 ${isPast ? 'opacity-75' : ''}`}>
                  <div 
                    className="border-2 dark:border-2 rounded-lg p-3 bg-background shadow-sm h-[220px] flex flex-col cursor-pointer hover:bg-accent/50 transition-colors active:scale-[0.98]"
                    onClick={() => onEventClick?.(event)}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-8 h-8 ${eventConfig.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <EventIcon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {eventConfig.label}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mb-1">
                          {event.isUpcoming 
                            ? (event.timeUntil || event.time)
                            : formatEventDateTime(event.actualDateTime)
                          }
                        </div>
                        <h4 className="font-medium text-sm mb-2 line-clamp-2">{event.title}</h4>
                        <div className={`${event.isUpcoming ? 'bg-ai-accent/5' : 'bg-muted/50'} rounded-lg p-2 mb-2 flex-1 overflow-hidden`}>
                          <p className={`text-xs leading-relaxed line-clamp-3 ${
                            event.isUpcoming ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {event.aiInsight}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-auto">
                          <span className="text-xs text-muted-foreground">
                            {event.isUpcoming ? 'Expected Impact:' : 'Actual Impact:'} 
                            <span className={`font-medium ml-1 ${
                              event.isUpcoming 
                                ? 'text-warning' 
                                : event.impactRating >= 0 ? 'text-positive' : 'text-negative'
                            }`}>
                              {event.isUpcoming ? `±${Math.abs(event.impactRating)}` : `${event.impactRating >= 0 ? '+' : ''}${event.impactRating}`}
                            </span>
                          </span>
                          {event.isUpcoming && event.confidence && (
                            <span className="text-xs text-muted-foreground">
                              AI: <span className="text-ai-accent font-medium">{event.confidence}%</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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