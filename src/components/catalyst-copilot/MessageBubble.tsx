/**
 * MessageBubble.tsx
 * 
 * Individual message container for the Catalyst Copilot chat interface.
 * Matches the web app design:
 * - User messages: black pill bubble on the right with "Edit" link
 * - Assistant messages: no bubble, just content with optional "Thought for Xs" header
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors as designColors } from '../../constants/design-tokens';
import { Message, ContentBlock, DataCard } from './lib/StreamBlockTypes';
import { BlockListRenderer } from './BlockRenderer';
import { MarkdownText } from './MarkdownText';
import { AnimatedTextBlock } from './AnimatedTextBlock';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  streamedBlocks?: ContentBlock[];
  dataCards?: DataCard[];
  onEventClick?: (event: any) => void;
  onTickerClick?: (ticker: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isStreaming = false,
  streamedBlocks,
  dataCards,
  onEventClick,
  onTickerClick,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? designColors.dark : designColors.light;
  const isUser = message.role === 'user';
  const hasError = !!message.error;
  const [thinkingExpanded, setThinkingExpanded] = useState(false);

  // Calculate thinking duration if we have thinking steps
  const thinkingDuration = message.thinkingSteps && message.thinkingSteps.length > 0
    ? Math.round((message.thinkingSteps[message.thinkingSteps.length - 1].timestamp - message.thinkingSteps[0].timestamp) / 1000)
    : 0;

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(isUser ? 20 : -20)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const colors = {
    userBubble: '#000000', // Black bubble for user messages (matching web app)
    userText: '#ffffff',
    assistantText: isDark ? '#ffffff' : '#000000',
    errorBubble: isDark ? '#3a2020' : '#ffebee',
    errorText: isDark ? '#ff8a80' : '#c62828',
    thinkingText: isDark ? '#888888' : '#666666',
    editLink: isDark ? '#888888' : '#666666',
  };

  // Determine which blocks to render
  const blocksToRender = isStreaming && streamedBlocks 
    ? streamedBlocks 
    : message.contentBlocks;
  
  const cardsToUse = isStreaming && dataCards 
    ? dataCards 
    : message.dataCards;

  // Render content for assistant messages
  const renderAssistantContent = () => {
    // Debug logging
    console.log('[MessageBubble] Rendering assistant content:', {
      hasError,
      blocksToRenderCount: blocksToRender?.length || 0,
      isStreaming,
      messageContentLength: message.content?.length || 0,
      messageContentPreview: message.content?.substring(0, 100),
    });
    
    if (hasError) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color={colors.errorText} />
          <Text style={[styles.errorText, { color: colors.errorText }]}>
            {message.error}
          </Text>
        </View>
      );
    }

    // If we have blocks, render them
    if (blocksToRender && blocksToRender.length > 0) {
      return (
        <BlockListRenderer
          blocks={blocksToRender}
          dataCards={cardsToUse}
          onEventClick={onEventClick}
          onTickerClick={onTickerClick}
          isStreaming={isStreaming}
        />
      );
    }

    // Otherwise render as animated markdown text during streaming
    if (isStreaming && message.content) {
      return (
        <AnimatedTextBlock
          text={message.content}
          isStreaming={isStreaming}
          speed={12}
          charsPerTick={2}
        >
          {(animatedText, isAnimating) => (
            <View>
              <MarkdownText
                text={animatedText}
                dataCards={cardsToUse}
                onEventClick={onEventClick}
                onTickerClick={onTickerClick}
              />
              {isAnimating && (
                <View style={styles.cursorContainer}>
                  <Animated.View style={[styles.cursor, { backgroundColor: themeColors.primary }]} />
                </View>
              )}
            </View>
          )}
        </AnimatedTextBlock>
      );
    }

    // Default markdown rendering
    return (
      <MarkdownText
        text={message.content}
        dataCards={cardsToUse}
        onEventClick={onEventClick}
        onTickerClick={onTickerClick}
      />
    );
  };

  // User message layout (black pill on right with Edit link)
  if (isUser) {
    return (
      <Animated.View
        style={[
          styles.userMessageContainer,
          {
            opacity: fadeAnim,
            transform: [
              { translateX: slideAnim },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        <View style={styles.userBubble}>
          <Text style={styles.userMessageText}>{message.content}</Text>
        </View>
        <TouchableOpacity style={styles.editLink}>
          <Ionicons name="pencil-outline" size={14} color={colors.editLink} />
          <Text style={[styles.editLinkText, { color: colors.editLink }]}>Edit</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Assistant message layout (no bubble, with optional "Thought for Xs" header)
  return (
    <Animated.View
      style={[
        styles.assistantMessageContainer,
        {
          opacity: fadeAnim,
          transform: [
            { translateX: slideAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      {/* Thinking duration header (like "Thought for 19s") */}
      {thinkingDuration > 0 && !isStreaming && (
        <TouchableOpacity 
          style={styles.thinkingHeader}
          onPress={() => setThinkingExpanded(!thinkingExpanded)}
        >
          <Text style={[styles.thinkingText, { color: colors.thinkingText }]}>
            Thought for {thinkingDuration}s
          </Text>
          <Ionicons 
            name={thinkingExpanded ? "chevron-up" : "chevron-down"} 
            size={14} 
            color={colors.thinkingText} 
          />
        </TouchableOpacity>
      )}

      {/* Expanded thinking steps */}
      {thinkingExpanded && message.thinkingSteps && (
        <View style={styles.thinkingSteps}>
          {message.thinkingSteps.map((step, index) => (
            <Text key={index} style={[styles.thinkingStepText, { color: colors.thinkingText }]}>
              {step.content}
            </Text>
          ))}
        </View>
      )}

      {/* Error state */}
      {hasError ? (
        <View style={[styles.errorContainer, { backgroundColor: colors.errorBubble }]}>
          <Ionicons name="alert-circle" size={16} color={colors.errorText} />
          <Text style={[styles.errorText, { color: colors.errorText }]}>
            {message.error}
          </Text>
        </View>
      ) : (
        /* Main content */
        <View style={styles.assistantContent}>
          {renderAssistantContent()}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // User message styles
  userMessageContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  userBubble: {
    backgroundColor: '#000000',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '85%',
  },
  userMessageText: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 22,
  },
  editLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  editLinkText: {
    fontSize: 12,
  },

  // Assistant message styles
  assistantMessageContainer: {
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  thinkingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  thinkingText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  thinkingSteps: {
    marginBottom: 12,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#e0e0e0',
  },
  thinkingStepText: {
    fontSize: 12,
    marginVertical: 2,
  },
  assistantContent: {
    // No bubble - content renders directly
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  cursorContainer: {
    marginTop: 4,
  },
  cursor: {
    width: 2,
    height: 16,
    borderRadius: 1,
  },
});

export default MessageBubble;
