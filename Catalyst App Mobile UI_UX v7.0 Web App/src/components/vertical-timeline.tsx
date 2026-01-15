import { motion } from 'motion/react';

interface TimelineItemProps {
  isUpcoming?: boolean;
  isNext?: boolean;
  children: React.ReactNode;
}

interface VerticalTimelineProps {
  children: React.ReactNode;
}

export function TimelineItem({ isUpcoming = false, isNext = false, children }: TimelineItemProps) {
  return (
    <div className="relative flex gap-2">
      {/* Timeline dot */}
      <div className="relative flex-shrink-0 w-6 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center justify-center">
          {isNext ? (
            // Pulsing dot for next upcoming event
            <motion.div
              className="w-3 h-3 bg-ai-accent rounded-full catalyst-dot"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.8, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          ) : (
            // Regular dot
            <div 
              className={`w-2.5 h-2.5 rounded-full catalyst-dot ${
                isUpcoming 
                  ? 'bg-ai-accent' 
                  : 'bg-muted-foreground/60'
              }`}
            />
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 pb-[24px] pr-[0px] pt-[0px] pl-[0px]">
        {children}
      </div>
    </div>
  );
}

export function VerticalTimeline({ children }: VerticalTimelineProps) {
  return (
    <div className="relative -ml-2">
      {/* Vertical line */}
      <div className="absolute left-3 top-2 bottom-6 w-px bg-border transform -translate-x-1/2" />
      
      {/* Timeline items */}
      <div className="space-y-0">
        {children}
      </div>
    </div>
  );
}