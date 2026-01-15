/**
 * Catalyst Copilot - AI-powered chat assistant
 * Public exports for the catalyst-copilot module
 */

// Main component
export { CatalystCopilot } from './CatalystCopilot';

// Sub-components
export { ChatInput } from './ChatInput';
export { MessageBubble } from './MessageBubble';
export { ThinkingIndicator } from './ThinkingIndicator';
export { BlockRenderer, BlockListRenderer } from './BlockRenderer';
export { MarkdownText } from './MarkdownText';

// Hooks
export { useStreamingChat, extractStreamBlocks } from './hooks/useStreamingChat';
export { useConversationHistory } from './hooks/useConversationHistory';
export type { ConversationSummary, Conversation } from './hooks/useConversationHistory';

// Types
export type {
  Message,
  StoredMessage,
  ContentBlock,
  BlockType,
  DataCard,
  ThinkingStep,
  StreamingState,
  StockCardData,
  ArticleCardData,
  EventCardData,
  ImageCardData,
  ChartCardData,
  SSEEvent,
  SSEEventType,
} from './lib/StreamBlockTypes';

// Utilities
export {
  generateBlockId,
  generateMessageId,
  hasMarkers,
  MARKER_PATTERNS,
} from './lib/StreamBlockTypes';
