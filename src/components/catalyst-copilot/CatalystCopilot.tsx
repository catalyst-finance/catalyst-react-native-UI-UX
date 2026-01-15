/**
 * CatalystCopilot.tsx
 * 
 * Main chat component for the Catalyst Copilot AI assistant.
 * Integrates message list, input, streaming, and content rendering.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
  TouchableOpacity,
  ListRenderItem,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors as designColors } from '../../constants/design-tokens';
import { useStreamingChat } from './hooks/useStreamingChat';
import { ChatInput } from './ChatInput';
import { MessageBubble } from './MessageBubble';
import { Message } from './lib/StreamBlockTypes';

interface CatalystCopilotProps {
  selectedTickers?: string[];
  onEventClick?: (event: any) => void;
  onTickerClick?: (ticker: string) => void;
}

// Animated pulsing dots component (matches web app UX - static position with subtle pulse)
function AnimatedThinkingDots({ isDark }: { isDark: boolean }) {
  const dot1 = useRef(new Animated.Value(1)).current;
  const dot2 = useRef(new Animated.Value(1)).current;
  const dot3 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const createDotAnimation = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 0.4,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
    };

    const anim1 = createDotAnimation(dot1, 0);
    const anim2 = createDotAnimation(dot2, 200);
    const anim3 = createDotAnimation(dot3, 400);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3]);

  const dots = [dot1, dot2, dot3];
  const dotColor = isDark ? '#888888' : '#666666';

  return (
    <View style={thinkingDotsStyles.container}>
      {dots.map((dot, index) => (
        <Animated.View
          key={index}
          style={[
            thinkingDotsStyles.dot,
            { backgroundColor: dotColor },
            {
              opacity: dot,
              transform: [
                {
                  scale: dot.interpolate({
                    inputRange: [0.4, 1],
                    outputRange: [0.8, 1],
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

const thinkingDotsStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export const CatalystCopilot: React.FC<CatalystCopilotProps> = ({
  selectedTickers = [],
  onEventClick,
  onTickerClick,
}) => {
  const { isDark } = useTheme();
  const [inputValue, setInputValue] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const userHasScrolledUp = useRef(false);

  const themeColors = isDark ? designColors.dark : designColors.light;

  const {
    messages,
    isStreaming,
    streamingState,
    sendMessage,
    isConnected,
  } = useStreamingChat({
    selectedTickers,
    onError: (error) => {
      console.error('[CatalystCopilot] Error:', error);
    },
  });

  const colors = {
    background: isDark ? '#121212' : '#ffffff',
    text: isDark ? '#ffffff' : '#000000',
    secondaryText: isDark ? '#888888' : '#666666',
    border: isDark ? '#333333' : '#e0e0e0',
    chipBackground: isDark ? '#2a2a2a' : '#f0f0f0',
    chipText: isDark ? '#ffffff' : '#333333',
  };

  const quickStartChips = [
    "What moved TSLA today?",
    "Biggest movers in my watchlist?",
    "Explain today's market",
  ];

  useEffect(() => {
    if (!userHasScrolledUp.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  useEffect(() => {
    if (isStreaming && !userHasScrolledUp.current) {
      flatListRef.current?.scrollToEnd({ animated: false });
    }
  }, [isStreaming, streamingState.blocks.length]);

  const handleSend = useCallback(() => {
    if (inputValue.trim()) {
      sendMessage(inputValue.trim());
      setInputValue('');
      userHasScrolledUp.current = false;
    }
  }, [inputValue, sendMessage]);

  const handleQuickStart = useCallback((text: string) => {
    sendMessage(text);
    userHasScrolledUp.current = false;
  }, [sendMessage]);

  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    userHasScrolledUp.current = distanceFromBottom > 100;
  }, []);

  const renderMessage: ListRenderItem<Message> = useCallback(({ item, index }) => {
    const isLastMessage = index === messages.length - 1;
    const isStreamingMessage = isLastMessage && isStreaming && item.role === 'assistant';

    return (
      <MessageBubble
        message={item}
        isStreaming={isStreamingMessage}
        streamedBlocks={isStreamingMessage ? streamingState.blocks : undefined}
        dataCards={isStreamingMessage ? streamingState.dataCards : undefined}
        onEventClick={onEventClick}
        onTickerClick={onTickerClick}
      />
    );
  }, [messages.length, isStreaming, streamingState, onEventClick, onTickerClick]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.aiIconLarge, { backgroundColor: themeColors.primary }]}>
        <Ionicons name="sparkles" size={32} color="#ffffff" />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        Catalyst Copilot
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.secondaryText }]}>
        Your AI-powered market assistant
      </Text>
      <View style={styles.quickStartContainer}>
        {quickStartChips.map((chip, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.quickStartChip, { backgroundColor: colors.chipBackground }]}
            onPress={() => handleQuickStart(chip)}
            activeOpacity={0.7}
          >
            <Text style={[styles.quickStartText, { color: colors.chipText }]}>
              {chip}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStreamingFooter = () => {
    if (!isStreaming) return null;

    // Phase 1: Show animated dots when no thinking steps yet
    if (streamingState.thinking.length === 0 && streamingState.blocks.length === 0) {
      return (
        <View style={styles.thinkingDotsContainer}>
          <AnimatedThinkingDots isDark={isDark} />
        </View>
      );
    }

    // Phase 2: Show thinking stream text (like "Reading TSLA news")
    if (streamingState.thinking.length > 0 && streamingState.blocks.length === 0) {
      const latestThinking = streamingState.thinking[streamingState.thinking.length - 1];
      return (
        <View style={styles.thinkingTextContainer}>
          <Text style={[styles.thinkingText, { color: colors.secondaryText }]}>
            {latestThinking.content}
          </Text>
        </View>
      );
    }

    return null;
  };

  const renderFooter = () => (
    <View>
      {renderStreamingFooter()}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {!isConnected && (
        <View style={[styles.connectionBanner, { backgroundColor: isDark ? '#3a2020' : '#ffebee' }]}>
          <Ionicons name="cloud-offline" size={16} color={isDark ? '#ff8a80' : '#c62828'} />
          <Text style={[styles.connectionText, { color: isDark ? '#ff8a80' : '#c62828' }]}>
            Reconnecting...
          </Text>
        </View>
      )}

      {messages.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ChatInput
        value={inputValue}
        onChangeText={setInputValue}
        onSend={handleSend}
        disabled={isStreaming || !isConnected}
        placeholder={isStreaming ? "AI is thinking..." : "Ask anything"}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messageList: {
    paddingVertical: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  aiIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  quickStartContainer: {
    width: '100%',
    gap: 12,
  },
  quickStartChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  quickStartText: {
    fontSize: 14,
    fontWeight: '500',
  },
  thinkingDotsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  thinkingTextContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  thinkingText: {
    fontSize: 14,
  },
  connectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  connectionText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default CatalystCopilot;
