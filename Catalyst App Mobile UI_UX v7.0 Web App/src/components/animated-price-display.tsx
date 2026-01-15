import { useState, useEffect } from 'react';
import { AnimatedPrice } from './animated-price';
import realtimePriceService from '../utils/realtime-price-service';

interface AnimatedPriceDisplayProps {
  ticker: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  isPositive: boolean;
  previousClose?: number; // Add previous close for accurate color calculation
}

export function AnimatedPriceDisplay({
  ticker,
  currentPrice: initialPrice,
  priceChange: initialChange,
  priceChangePercent: initialChangePercent,
  isPositive: initialIsPositive,
  previousClose
}: AnimatedPriceDisplayProps) {
  const [currentPrice, setCurrentPrice] = useState(initialPrice);
  const [priceChange, setPriceChange] = useState(initialChange);
  const [priceChangePercent, setPriceChangePercent] = useState(initialChangePercent);
  const [isPositive, setIsPositive] = useState(initialIsPositive);

  useEffect(() => {
    // Subscribe to realtime price updates for this ticker
    const unsubscribe = realtimePriceService.subscribe((update) => {
      if (update.symbol === ticker.toUpperCase()) {
        // Validate incoming data before updating state
        if (typeof update.price === 'number' && !isNaN(update.price)) {
          setCurrentPrice(update.price);
          setPriceChange(update.change || 0);
          setPriceChangePercent(update.changePercent || 0);
          // Calculate isPositive based on previousClose if available
          const newIsPositive = previousClose 
            ? update.price >= previousClose 
            : update.change >= 0;
          setIsPositive(newIsPositive);
        } else {
          console.warn(`⚠️ Ignoring invalid price update for ${ticker}:`, update);
        }
      }
    });

    return unsubscribe;
  }, [ticker, previousClose]);

  // Update when props change (initial load or parent refresh)
  useEffect(() => {
    setCurrentPrice(initialPrice);
    setPriceChange(initialChange);
    setPriceChangePercent(initialChangePercent);
    setIsPositive(initialIsPositive);
  }, [initialPrice, initialChange, initialChangePercent, initialIsPositive]);

  return (
    <p className="font-semibold whitespace-nowrap text-foreground">
      <AnimatedPrice price={currentPrice} />
    </p>
  );
}