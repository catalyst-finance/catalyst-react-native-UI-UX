import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency } from '../utils/formatting';

interface AnimatedPriceProps {
  price: number;
  className?: string;
  showCurrency?: boolean;
  animated?: boolean;
}

interface DigitProps {
  char: string;
  isChanged: boolean;
  direction: 'up' | 'down' | null;
  index: number;
}

function AnimatedDigit({ char, isChanged, direction, index }: DigitProps) {
  if (!isChanged || !direction) {
    return <span>{char}</span>;
  }

  const slideDistance = 8; // pixels to slide
  const slideY = direction === 'up' ? slideDistance : -slideDistance;
  
  // Use the positive/negative colors from CSS variables
  const positiveColor = '#00C851';
  const negativeColor = '#FF4444';

  return (
    <span className="relative inline-block">
      {/* Echo effect - fading duplicate */}
      <motion.span
        key={`echo-${index}`}
        className="absolute inset-0"
        initial={{ opacity: 0.6, y: -slideY }}
        animate={{ opacity: 0, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{
          color: direction === 'up' ? positiveColor : negativeColor
        }}
      >
        {char}
      </motion.span>
      
      {/* Main animated digit - inherit color from parent after animation */}
      <motion.span
        key={`digit-${index}`}
        className="relative inline-block"
        initial={{ y: slideY, opacity: 0, color: direction === 'up' ? positiveColor : negativeColor }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ 
          duration: 0.3, 
          ease: [0.34, 1.56, 0.64, 1] // Slightly bouncy easing
        }}
      >
        {char}
      </motion.span>
    </span>
  );
}

export function AnimatedPrice({ 
  price, 
  className = '', 
  showCurrency = true,
  animated = true
}: AnimatedPriceProps) {
  const [displayPrice, setDisplayPrice] = useState(price);
  const [changedIndices, setChangedIndices] = useState<Set<number>>(new Set());
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | null>(null);
  const previousPriceRef = useRef(price);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Validate that price is a valid number
    if (typeof price !== 'number' || isNaN(price)) {
      console.warn('⚠️ AnimatedPrice received invalid price:', price);
      return;
    }

    if (price !== previousPriceRef.current && animated) {
      // Determine direction
      const direction = price > previousPriceRef.current ? 'up' : 'down';
      setPriceDirection(direction);
      
      // Format both prices to compare digit by digit
      const oldFormatted = showCurrency 
        ? formatCurrency(previousPriceRef.current) 
        : previousPriceRef.current.toFixed(2);
      const newFormatted = showCurrency 
        ? formatCurrency(price) 
        : price.toFixed(2);
      
      // Find which digits changed
      const changed = new Set<number>();
      const maxLen = Math.max(oldFormatted.length, newFormatted.length);
      
      for (let i = 0; i < maxLen; i++) {
        if (oldFormatted[i] !== newFormatted[i]) {
          changed.add(i);
        }
      }
      
      setChangedIndices(changed);
      setDisplayPrice(price);
      
      // Clear the animation state after animation completes
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      
      animationTimeoutRef.current = setTimeout(() => {
        setChangedIndices(new Set());
        setPriceDirection(null);
      }, 500);
      
      previousPriceRef.current = price;
    } else if (!animated) {
      setDisplayPrice(price);
      previousPriceRef.current = price;
    }

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [price, animated, showCurrency]);

  const formattedPrice = showCurrency ? formatCurrency(displayPrice) : displayPrice.toFixed(2);

  if (!animated) {
    return <span className={className}>{formattedPrice}</span>;
  }

  return (
    <span className={className}>
      {formattedPrice.split('').map((char, index) => (
        <AnimatedDigit
          key={`${index}-${char}-${displayPrice}`}
          char={char}
          isChanged={changedIndices.has(index)}
          direction={priceDirection}
          index={index}
        />
      ))}
    </span>
  );
}