/**
 * ThinkingIndicator.tsx
 * 
 * Displays AI thinking progress with animated steps.
 * Shows what the AI is currently processing.
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors as designColors } from '../../constants/design-tokens';
import { ThinkingStep } from './lib/StreamBlockTypes';

interface ThinkingIndicatorProps {
  steps: ThinkingStep[];
  isComplete?: boolean;
}

export function ThinkingIndicator({ steps, isComplete = false }: ThinkingIndicatorProps) {
  const { isDark } = useTheme();
  const themeColors = isDark ? designColors.dark : designColors.light;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  const colors = {
    background: isDark ? '#1a1a1a' : '#f5f5f5',
    border: isDark ? '#333333' : '#e5e5e5',
    text: isDark ? '#ffffff' : '#000000',
    secondaryText: isDark ? '#888888' : '#666666',
    accent: themeColors.primary,
  };

  // Pulse animation for the thinking indicator
  useEffect(() => {
    if (!isComplete) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isComplete, pulseAnim]);

  // Spin animation for the loading icon
  useEffect(() => {
    if (!isComplete) {
      const spin = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spin.start();
      return () => spin.stop();
    }
  }, [isComplete, spinAnim]);

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  const spinRotation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (steps.length === 0) {
    return null;
  }

  // Get the latest step
  const latestStep = steps[steps.length - 1];

  // Map phase to icon
  const getPhaseIcon = (phase: string): keyof typeof Ionicons.glyphMap => {
    const phaseIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
      analyzing: 'search',
      searching: 'search',
      fetching: 'cloud-download',
      processing: 'cog',
      formatting: 'document-text',
      thinking: 'bulb',
      querying: 'server',
    };
    return phaseIcons[phase.toLowerCase()] || 'sparkles';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Animated.View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.accent, opacity: pulseOpacity },
          ]}
        >
          {isComplete ? (
            <Ionicons name="checkmark" size={14} color="#ffffff" />
          ) : (
            <Animated.View style={{ transform: [{ rotate: spinRotation }] }}>
              <Ionicons name="sync" size={14} color="#ffffff" />
            </Animated.View>
          )}
        </Animated.View>
        <Text style={[styles.headerText, { color: colors.text }]}>
          {isComplete ? 'Analysis Complete' : 'Thinking...'}
        </Text>
      </View>

      <View style={styles.stepsContainer}>
        {steps.slice(-3).map((step, index) => {
          const isLatest = index === steps.slice(-3).length - 1;
          return (
            <Animated.View
              key={`${step.timestamp}-${index}`}
              style={[
                styles.stepRow,
                isLatest && !isComplete && { opacity: pulseOpacity },
              ]}
            >
              <Ionicons
                name={getPhaseIcon(step.phase)}
                size={12}
                color={isLatest && !isComplete ? colors.accent : colors.secondaryText}
              />
              <Text
                style={[
                  styles.stepText,
                  { color: isLatest && !isComplete ? colors.text : colors.secondaryText },
                ]}
                numberOfLines={1}
              >
                {step.content}
              </Text>
              {isLatest && !isComplete && (
                <View style={styles.dotsContainer}>
                  <AnimatedDots color={colors.accent} />
                </View>
              )}
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

// Animated dots component
function AnimatedDots({ color }: { color: string }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = animateDot(dot1, 0);
    const anim2 = animateDot(dot2, 150);
    const anim3 = animateDot(dot3, 300);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.dots}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: color },
            {
              opacity: dot.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 1],
              }),
              transform: [
                {
                  scale: dot.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1.2],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  stepsContainer: {
    gap: 6,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepText: {
    fontSize: 12,
    flex: 1,
  },
  dotsContainer: {
    marginLeft: 4,
  },
  dots: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});

export default ThinkingIndicator;
