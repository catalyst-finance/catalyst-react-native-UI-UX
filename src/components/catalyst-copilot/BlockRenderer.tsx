/**
 * BlockRenderer.tsx
 * 
 * Renders a single ContentBlock in its final form.
 * Dispatches to appropriate component based on block type.
 */

import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { ContentBlock, DataCard } from './lib/StreamBlockTypes';
import { MarkdownText } from './MarkdownText';
import { DataCardComponent } from './DataCardComponent';
import { InlineChartCard } from './InlineChartCard';
import { AnimatedTextBlock } from './AnimatedTextBlock';

interface BlockRendererProps {
  block: ContentBlock;
  dataCards?: DataCard[];
  eventData?: Record<string, any>;
  onEventClick?: (event: any) => void;
  onImageClick?: (imageUrl: string) => void;
  onTickerClick?: (ticker: string) => void;
  isStreaming?: boolean;
  isLastBlock?: boolean;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({
  block,
  dataCards = [],
  eventData = {},
  onEventClick,
  onImageClick,
  onTickerClick,
  isStreaming = false,
  isLastBlock = false,
}) => {
  const { isDark } = useTheme();

  const colors = {
    text: isDark ? '#ffffff' : '#000000',
    secondaryText: isDark ? '#888888' : '#666666',
    cardBackground: isDark ? '#2a2a2a' : '#f5f5f5',
    border: isDark ? '#333333' : '#e0e0e0',
  };

  switch (block.type) {
    case 'text':
      // Use AnimatedTextBlock for the last text block when streaming
      if (isStreaming && isLastBlock) {
        return (
          <AnimatedTextBlock
            text={block.content || ''}
            isStreaming={isStreaming}
            speed={12}
            charsPerTick={2}
          >
            {(animatedText) => (
              <MarkdownText
                text={animatedText}
                dataCards={dataCards}
                onEventClick={onEventClick}
                onTickerClick={onTickerClick}
              />
            )}
          </AnimatedTextBlock>
        );
      }
      
      // Regular markdown rendering for completed blocks
      return (
        <MarkdownText
          text={block.content || ''}
          dataCards={dataCards}
          onEventClick={onEventClick}
          onTickerClick={onTickerClick}
        />
      );

    case 'chart':
      return (
        <Animated.View style={styles.cardContainer}>
          <InlineChartCard
            symbol={block.data?.symbol || ''}
            timeRange={block.data?.timeRange || '1D'}
            onTickerClick={onTickerClick}
          />
        </Animated.View>
      );

    case 'article':
      // Find the article card from dataCards
      const articleCard = dataCards.find(
        c => c.type === 'article' && c.data.id === block.data?.id
      );
      if (articleCard || block.data) {
        return (
          <Animated.View style={styles.cardContainer}>
            <DataCardComponent
              card={{
                type: 'article',
                data: articleCard?.data || block.data,
              }}
              onTickerClick={onTickerClick}
            />
          </Animated.View>
        );
      }
      return null;

    case 'image':
      // Find the image card from dataCards
      const imageCard = dataCards.find(
        c => c.type === 'image' && c.data.id === block.data?.id
      );
      if (imageCard || block.data) {
        return (
          <Animated.View style={styles.cardContainer}>
            <DataCardComponent
              card={{
                type: 'image',
                data: imageCard?.data || block.data,
              }}
              onImageClick={onImageClick}
              onTickerClick={onTickerClick}
            />
          </Animated.View>
        );
      }
      return null;

    case 'event':
      // Find the event card from dataCards
      const eventCard = dataCards.find(
        c => c.type === 'event' && (c.data.id === block.data?.id || c.data.id?.toString() === block.data?.id)
      );
      if (eventCard || block.data) {
        return (
          <Animated.View style={styles.cardContainer}>
            <DataCardComponent
              card={{
                type: 'event',
                data: eventCard?.data || block.data,
              }}
              onEventClick={onEventClick}
              onTickerClick={onTickerClick}
            />
          </Animated.View>
        );
      }
      return null;

    case 'horizontal_rule':
      return (
        <View style={[styles.horizontalRule, { backgroundColor: colors.border }]} />
      );

    default:
      console.warn('[BlockRenderer] Unknown block type:', block.type);
      return null;
  }
};

/**
 * Renders a list of ContentBlocks
 */
interface BlockListRendererProps {
  blocks: ContentBlock[];
  dataCards?: DataCard[];
  eventData?: Record<string, any>;
  onEventClick?: (event: any) => void;
  onImageClick?: (imageUrl: string) => void;
  onTickerClick?: (ticker: string) => void;
  isStreaming?: boolean;
}

export const BlockListRenderer: React.FC<BlockListRendererProps> = ({
  blocks,
  dataCards,
  eventData,
  onEventClick,
  onImageClick,
  onTickerClick,
  isStreaming = false,
}) => {
  // Merge adjacent text blocks to ensure markdown patterns aren't split
  const mergedBlocks: ContentBlock[] = [];
  let currentTextContent = '';
  let currentTextId = '';
  
  blocks.forEach((block, index) => {
    if (block.type === 'text') {
      if (!currentTextId) {
        currentTextId = block.id;
      }
      currentTextContent += (currentTextContent ? '\n' : '') + (block.content || '');
    } else {
      // Flush accumulated text
      if (currentTextContent) {
        mergedBlocks.push({
          id: currentTextId,
          type: 'text',
          content: currentTextContent,
        });
        currentTextContent = '';
        currentTextId = '';
      }
      mergedBlocks.push(block);
    }
  });
  
  // Flush any remaining text
  if (currentTextContent) {
    mergedBlocks.push({
      id: currentTextId || 'text-final',
      type: 'text',
      content: currentTextContent,
    });
  }

  return (
    <View style={styles.blockList}>
      {mergedBlocks.map((block, index) => {
        const isLastBlock = index === mergedBlocks.length - 1;
        const isLastTextBlock = isLastBlock && block.type === 'text';
        
        return (
          <BlockRenderer
            key={block.id}
            block={block}
            dataCards={dataCards}
            eventData={eventData}
            onEventClick={onEventClick}
            onImageClick={onImageClick}
            onTickerClick={onTickerClick}
            isStreaming={isStreaming && isLastTextBlock}
            isLastBlock={isLastTextBlock}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  blockList: {
    gap: 8,
  },
  cardContainer: {
    marginVertical: 4,
  },
  horizontalRule: {
    height: 1,
    marginVertical: 16,
  },
});

export default BlockRenderer;
