/**
 * AnimatedTextBlock.tsx
 * 
 * A wrapper component that animates text content character-by-character
 * during streaming for a smoother, more natural feel.
 */

import React, { useState, useEffect, useRef, memo } from 'react';

const DEBUG_ANIMATION = false;

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
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const targetLengthRef = useRef(text.length);

  // Update target length when text changes
  useEffect(() => {
    targetLengthRef.current = text.length;
  }, [text]);

  // Animation loop
  useEffect(() => {
    // When streaming stops, immediately show all text
    if (!isStreaming) {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
      setDisplayedLength(text.length);
      return;
    }

    // If we need to animate more text
    if (displayedLength < text.length) {
      animationRef.current = setInterval(() => {
        setDisplayedLength(prev => {
          const target = targetLengthRef.current;
          const next = Math.min(prev + charsPerTick, target);
          
          if (next >= target && animationRef.current) {
            clearInterval(animationRef.current);
            animationRef.current = null;
          }
          
          return next;
        });
      }, speed);
    }

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [text, displayedLength, isStreaming, speed, charsPerTick]);

  // Use smart cutoff to avoid splitting markdown
  const smartCutoff = getSmartCutoff(text, displayedLength);
  const displayedText = text.substring(0, smartCutoff);
  const isAnimating = isStreaming && displayedLength < text.length;

  return <>{children(displayedText, isAnimating)}</>;
}

// Memoize to prevent unnecessary re-renders
export const AnimatedTextBlock = memo(AnimatedTextBlockInner);

export default AnimatedTextBlock;
