/**
 * StreamBlockTypes.ts
 * Shared type definitions for the streaming architecture
 * Used by both the useStreamingChat hook and UI components
 */

// ============================================
// CONTENT BLOCK TYPES
// ============================================

export type BlockType = 
  | 'text'           // Markdown text content
  | 'chart'          // Inline stock chart
  | 'article'        // Article card (news, SEC filings)
  | 'image'          // Image card (SEC filing images)
  | 'event'          // Event card (earnings, FDA, etc.)
  | 'horizontal_rule' // Horizontal divider line
  | 'source_label';  // Source label before article cards

export interface ContentBlock {
  id: string;
  type: BlockType;
  content?: string;              // For text blocks
  data?: ChartBlockData | CardBlockData | any;  // For chart/card blocks
}

export interface ChartBlockData {
  symbol: string;
  timeRange: string;
}

export interface CardBlockData {
  cardId: string;
  // Card data is looked up from metadata by cardId
}

// ============================================
// SSE EVENT TYPES (Backend → Frontend)
// ============================================

export type SSEEventType = 
  | 'thinking'       // Progress updates during processing
  | 'metadata'       // Initial data cards, conversation info
  | 'text_delta'     // Text chunk to append
  | 'chart_block'    // Inline chart to render
  | 'article_block'  // Article card to render
  | 'image_block'    // Image card to render
  | 'event_block'    // Event card to render
  | 'horizontal_rule' // Horizontal divider line
  | 'done'           // Stream complete
  | 'error';         // Error occurred

// Base SSE event
interface BaseSSEEvent {
  type: SSEEventType;
}

// Thinking event - progress updates
export interface ThinkingEvent extends BaseSSEEvent {
  type: 'thinking';
  phase: string;
  content: string;
}

// Metadata event - sent before streaming starts
export interface MetadataEvent extends BaseSSEEvent {
  type: 'metadata';
  dataCards: DataCard[];
  eventData: Record<string, any>;
  conversationId: string;
  newConversation: boolean;
  timestamp: string;
  intelligence: IntelligenceMetadata;
}

// Text delta event - append text content
export interface TextDeltaEvent extends BaseSSEEvent {
  type: 'text_delta';
  content: string;
}

// Chart block event - render inline chart
export interface ChartBlockEvent extends BaseSSEEvent {
  type: 'chart_block';
  symbol: string;
  timeRange: string;
}

// Article block event - render article card
export interface ArticleBlockEvent extends BaseSSEEvent {
  type: 'article_block';
  cardId: string;
}

// Image block event - render image card
export interface ImageBlockEvent extends BaseSSEEvent {
  type: 'image_block';
  cardId: string;
}

// Event block event - render event card
export interface EventBlockEvent extends BaseSSEEvent {
  type: 'event_block';
  cardId: string;
}

// Done event - stream complete
export interface DoneEvent extends BaseSSEEvent {
  type: 'done';
  conversationId: string;
  messageId?: string;
}

// Error event
export interface ErrorEvent extends BaseSSEEvent {
  type: 'error';
  error: string;
}

export type SSEEvent = 
  | ThinkingEvent 
  | MetadataEvent 
  | TextDeltaEvent 
  | ChartBlockEvent 
  | ArticleBlockEvent 
  | ImageBlockEvent 
  | EventBlockEvent 
  | DoneEvent 
  | ErrorEvent;

// ============================================
// DATA STRUCTURES
// ============================================

export interface DataCard {
  id?: string; // Made optional to match existing usage in some places, or enforce strictness
  type: 'article' | 'image' | 'event' | 'stock' | 'chart' | 'event-list';
  title?: string;
  ticker?: string;
  url?: string;
  imageUrl?: string;
  date?: string;
  source?: string;
  content?: string;
  aiInsight?: string;
  // Additional fields for different card types
  data?: any; // Add generic data field
  [key: string]: any;
}

export interface ImageCardData {
  id: string;
  ticker: string;
  source: string;
  title: string;
  imageUrl: string;
  context?: string;
  filingType?: string;
  filingDate?: string;
  filingUrl?: string;
}

export interface ArticleCardData {
  id: string;
  title: string;
  url: string;
  source: string;
  domain: string;
  ticker?: string;
  publishedAt?: string;
  logoUrl?: string;
  imageUrl?: string;
  content?: string;
  country?: string;
  category?: string;
}

export interface ChartCardData {
  id: string;
  symbol: string;
  timeRange: '1D' | '5D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y';
  chartData?: any[]; // Pre-loaded chart data from backend
  previousClose?: number; // Pre-loaded previous close from backend
}

export interface StockCardData {
  ticker: string;
  company: string;
  price: number;
  change: number;
  changePercent: number;
  chartData?: any[]; // Legacy support
  chartMetadata?: {
    available: boolean;
    count: number;
    date: string;
    endpoint: string;
  } | null;
  chartReference?: {
    table: string;
    symbol: string;
    dateRange: {
      start: string;
      end: string;
    };
    columns: string[];
    orderBy: string;
  };
  previousClose?: number;
  open?: number;
  high?: number;
  low?: number;
}

export interface ThinkingStep {
  phase: string;
  content: string;
  timestamp: number;
}

export interface IntelligenceMetadata {
  totalSources: number;
  sourceFreshness?: Array<{ source: string; age: string }>;
  dataCompleteness?: { hasExpectedData: boolean; hasPartialData: boolean };
  tickers?: string[];
  hasInstitutionalData?: boolean;
  hasPolicyData?: boolean;
  hasEvents?: boolean;
  upcomingEvents?: number;
  [key: string]: any;
}

// ============================================
// STREAMING STATE
// ============================================

export interface StreamingState {
  isStreaming: boolean;
  blocks: ContentBlock[];
  thinking: ThinkingStep[];
  metadata: MetadataEvent | null;
  error: string | null;
}

// ============================================
// LEGACY MARKER PATTERNS (for backward compatibility)
// These will be parsed backend-side in the transition period
// ============================================

export const MARKER_PATTERNS = {
  CHART: /\[VIEW_CHART:([A-Z]+):(\w+)\]/g,
  ARTICLE: /\[VIEW_ARTICLE:([^\]]+)\]/g,
  IMAGE: /\[IMAGE_CARD:([^\]]+)\]/g,
  EVENT: /\[EVENT_CARD:([^\]]+)\]/g,
} as const;

// Helper to detect if text has any markers
export function hasMarkers(text: string): boolean {
  return (
    MARKER_PATTERNS.CHART.test(text) ||
    MARKER_PATTERNS.ARTICLE.test(text) ||
    MARKER_PATTERNS.IMAGE.test(text) ||
    MARKER_PATTERNS.EVENT.test(text)
  );
}

// Helper to generate unique block IDs
export function generateBlockId(type: BlockType, index: number): string {
  return `${type}-${Date.now()}-${index}`;
}