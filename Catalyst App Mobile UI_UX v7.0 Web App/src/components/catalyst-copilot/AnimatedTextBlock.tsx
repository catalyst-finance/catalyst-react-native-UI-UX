/**
 * AnimatedTextBlock.tsx
 * 
 * A wrapper component that animates text content character-by-character
 * during streaming for a smoother, more natural feel.
 */

import { useState, useEffect, useRef, memo } from 'react';

const DEBUG_ANIMATION = false; // Set to true for detailed animation debugging

/**
 * Adjust the cutoff position to avoid splitting markdown markers
 */
function getSmartCutoff(text: string, targetLength: number): number {
  if (targetLength >= text.length) return text.length;
  
  let cutoff = targetLength;
  
  // Check if we're cutting in the middle of asterisks (*, **, ***)
  let asteriskStart = cutoff;
  while (asteriskStart > 0 && text[asteriskStart - 1] === '*') {
    asteriskStart--;
  }
  
  let asteriskEnd = cutoff;
  while (asteriskEnd < text.length && text[asteriskEnd] === '*') {
    asteriskEnd++;
  }
  
  const asterisksBeforeCutoff = cutoff - asteriskStart;
  const asterisksAfterCutoff = asteriskEnd - cutoff;
  const totalAsterisks = asterisksBeforeCutoff + asterisksAfterCutoff;
  
  // If there are asterisks around the cutoff point
  if (totalAsterisks > 0) {
    // Check if this looks like an opening marker (asterisks followed by non-whitespace)
    const isOpeningMarker = asteriskEnd < text.length && /\S/.test(text[asteriskEnd]);
    
    // If including these asterisks, check if we have a matching closing marker in the visible text
    const visibleTextWithAsterisks = text.substring(0, asteriskEnd);
    
    let hasMatchingClosing = false;
    if (isOpeningMarker && totalAsterisks >= 1 && totalAsterisks <= 3) {
      // Look for matching closing markers (same count of asterisks)
      const markerPattern = new RegExp('\\*{' + totalAsterisks + '}(.+?)\\*{' + totalAsterisks + '}');
      hasMatchingClosing = markerPattern.test(visibleTextWithAsterisks);
    }
    
    if (DEBUG_ANIMATION) {
      console.log('🎨 [AnimatedTextBlock] Asterisk detection:', {
        targetLength,
        cutoff,
        asteriskStart,
        asteriskEnd,
        asterisksBeforeCutoff,
        asterisksAfterCutoff,
        totalAsterisks,
        isOpeningMarker,
        hasMatchingClosing,
        textAroundCutoff: text.substring(Math.max(0, asteriskStart - 5), Math.min(text.length, asteriskEnd + 15)),
        decision: hasMatchingClosing ? 'INCLUDE_ALL' : 'EXCLUDE_ALL'
      });
    }
    
    // Only include asterisks if they form a complete markdown pattern
    if (hasMatchingClosing) {
      cutoff = asteriskEnd;
    } else {
      // Exclude the asterisks to avoid showing incomplete markers
      cutoff = asteriskStart;
    }
  }
  
  return cutoff;
}

interface AnimatedTextBlockProps {
  /** The full text content to display/animate */
  text: string;
  /** Whether streaming is currently in progress */
  isStreaming: boolean;
  /** Milliseconds per character (lower = faster). Default: 12ms (~83 chars/sec) */
  speed?: number;
  /** Characters to reveal per tick. Default: 2 */
  charsPerTick?: number;
  /** Render function that receives the animated text */
  children: (animatedText: string, isAnimating: boolean) => React.ReactNode;
}

/**
 * Animates text content character-by-character for smooth streaming feel.
 * When streaming ends, immediately shows remaining text.
 */
function AnimatedTextBlockInner({
  text,
  isStreaming,
  speed = 12,
  charsPerTick = 2,
  children,
}: AnimatedTextBlockProps) {
  const [displayedLength, setDisplayedLength] = useState(0);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const targetLengthRef = useRef(text.length);
  const animationCountRef = useRef(0);

  // Update target length when text changes
  useEffect(() => {
    if (targetLengthRef.current !== text.length && DEBUG_ANIMATION) {
      console.log('📝 [AnimatedTextBlock] Text length changed:', {
        oldLength: targetLengthRef.current,
        newLength: text.length,
        displayedLength,
        newChars: text.substring(targetLengthRef.current, text.length)
      });
    }
    targetLengthRef.current = text.length;
  }, [text, displayedLength]);

  // Animation loop
  useEffect(() => {
    // When streaming stops, immediately show all text
    if (!isStreaming) {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      if (DEBUG_ANIMATION && displayedLength < text.length) {
        console.log('⏹️ [AnimatedTextBlock] Streaming stopped, showing remaining text:', {
          displayedLength,
          totalLength: text.length,
          remaining: text.length - displayedLength
        });
      }
      setDisplayedLength(text.length);
      return;
    }

    // If we need to animate more text
    if (displayedLength < text.length) {
      const animate = (timestamp: number) => {
        if (timestamp - lastTimeRef.current >= speed) {
          lastTimeRef.current = timestamp;
          
          setDisplayedLength(prev => {
            const target = targetLengthRef.current;
            const next = Math.min(prev + charsPerTick, target);
            
            if (DEBUG_ANIMATION && animationCountRef.current % 10 === 0) {
              console.log('🎬 [AnimatedTextBlock] Animation tick:', {
                prev,
                next,
                target,
                charsAdded: next - prev,
                newChars: text.substring(prev, next),
                percentComplete: ((next / target) * 100).toFixed(1) + '%'
              });
            }
            animationCountRef.current++;
            
            return next;
          });
        }
        
        // Continue if we haven't caught up
        if (displayedLength < targetLengthRef.current) {
          frameRef.current = requestAnimationFrame(animate);
        }
      };
      
      frameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [text, displayedLength, isStreaming, speed, charsPerTick]);

  // Use smart cutoff to avoid splitting markdown
  const smartCutoff = getSmartCutoff(text, displayedLength);
  const displayedText = text.substring(0, smartCutoff);
  const isAnimating = isStreaming && displayedLength < text.length;

  if (DEBUG_ANIMATION && smartCutoff !== displayedLength) {
    console.log('✂️ [AnimatedTextBlock] Smart cutoff adjusted:', {
      requestedLength: displayedLength,
      adjustedLength: smartCutoff,
      diff: smartCutoff - displayedLength,
      textAtCutoff: text.substring(Math.max(0, displayedLength - 5), Math.min(text.length, displayedLength + 5))
    });
  }

  return <>{children(displayedText, isAnimating)}</>;
}

// Memoize to prevent unnecessary re-renders
export const AnimatedTextBlock = memo(AnimatedTextBlockInner);

export default AnimatedTextBlock;