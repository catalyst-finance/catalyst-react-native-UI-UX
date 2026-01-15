/**
 * AnimatedPrice Component - React Native Port
 * 
 * Displays a price with animated digit flipping when the value changes.
 * Digits slide up (green) for increases and down (red) for decreases.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../constants/design-tokens';

interface AnimatedPriceProps {
  price: number;
  style?: any;
  showCurrency?: boolean;
  animated?: boolean;
  fontSize?: number;
  fontWeight?: '400' | '500' | '600' | '700';
  color?: string; // Allow override color
}

interface DigitProps {
  char: string;
  isChanged: boolean;
  direction: 'up' | 'down' | null;
  index: number;
  fontSize: number;
  fontWeight: '400' | '500' | '600' | '700';
  baseColor: string; // Add base color for non-animated digits
}

function AnimatedDigit({ char, isChanged, direction, index, fontSize, fontWeight, baseColor }: DigitProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const echoOpacityAnim = useRef(new Animated.Value(0)).current;
  const echoSlideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isChanged && direction) {
      const slideDistance = 8;
      const slideY = direction === 'up' ? slideDistance : -slideDistance;

      // Reset animations
      slideAnim.setValue(slideY);
      opacityAnim.setValue(0);
      echoOpacityAnim.setValue(0.6);
      echoSlideAnim.setValue(-slideY);

      // Animate main digit
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Animate echo
      Animated.parallel([
        Animated.timing(echoOpacityAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(echoSlideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isChanged, direction, slideAnim, opacityAnim, echoOpacityAnim, echoSlideAnim]);

  if (!isChanged || !direction) {
    return (
      <Text style={{ fontSize, fontWeight, color: baseColor }}>
        {char}
      </Text>
    );
  }

  const positiveColor = '#00C851';
  const negativeColor = '#FF4444';
  const color = direction === 'up' ? positiveColor : negativeColor;

  return (
    <View style={{ position: 'relative' }}>
      {/* Echo effect - fading duplicate */}
      <Animated.Text
        style={{
          position: 'absolute',
          fontSize,
          fontWeight,
          color,
          opacity: echoOpacityAnim,
          transform: [{ translateY: echoSlideAnim }],
        }}
      >
        {char}
      </Animated.Text>

      {/* Main animated digit */}
      <Animated.Text
        style={{
          fontSize,
          fontWeight,
          color,
          opacity: opacityAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        {char}
      </Animated.Text>
    </View>
  );
}

export function AnimatedPrice({
  price,
  style,
  showCurrency = true,
  animated = true,
  fontSize = 16,
  fontWeight = '600',
  color,
}: AnimatedPriceProps) {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  const baseColor = color || themeColors.foreground;
  
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

      // Format both prices to compare digit by digit (with commas)
      const oldFormatted = previousPriceRef.current.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const newFormatted = price.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

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
  }, [price, animated]);

  // Format with commas
  const formattedPrice = displayPrice.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (!animated) {
    return (
      <Text style={[{ fontSize, fontWeight, color: baseColor }, style]}>
        {showCurrency ? `$${formattedPrice}` : formattedPrice}
      </Text>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {showCurrency && (
        <Text style={{ fontSize, fontWeight, color: baseColor }}>$</Text>
      )}
      {formattedPrice.split('').map((char, index) => (
        <AnimatedDigit
          key={`${index}-${char}-${displayPrice}`}
          char={char}
          isChanged={changedIndices.has(showCurrency ? index + 1 : index)}
          direction={priceDirection}
          index={index}
          fontSize={fontSize}
          fontWeight={fontWeight}
          baseColor={baseColor}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
