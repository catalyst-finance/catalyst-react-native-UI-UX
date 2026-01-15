# Design Document: Catalyst Copilot Chat Feature

## Overview

The Catalyst Copilot is an AI-powered chat assistant for the Catalyst mobile app that provides market insights, stock analysis, and real-time data visualization. This design document outlines the architecture, components, and implementation strategy for building the React Native version based on the existing web app implementation.

The feature enables users to interact with an intelligent assistant through natural language, receiving streaming responses with rich content including stock cards, charts, event cards, and formatted markdown text.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CopilotScreen                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   CatalystCopilot                         │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │              Message List (FlatList)                │  │  │
│  │  │  ┌─────────────────────────────────────────────┐    │  │  │
│  │  │  │           MessageBubble                     │    │  │  │
│  │  │  │  ┌───────────────────────────────────────┐  │    │  │  │
│  │  │  │  │         BlockRenderer                 │  │    │  │  │
│  │  │  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐  │  │    │  │  │
│  │  │  │  │  │Markdown │ │StockCard│ │ChartCard│  │  │    │  │  │
│  │  │  │  │  │  Text   │ │         │ │         │  │  │    │  │  │
│  │  │  │  │  └─────────┘ └─────────┘ └─────────┘  │  │    │  │  │
│  │  │  │  └───────────────────────────────────────┘  │    │  │  │
│  │  │  └─────────────────────────────────────────────┘    │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │              ChatInput                              │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Input → ChatInput → useStreamingChat Hook → SSE Connection → Backend
                                    ↓
                            Parse SSE Events
                                    ↓
                    ┌───────────────┼───────────────┐
                    ↓               ↓               ↓
              thinking         metadata        text_delta
                    ↓               ↓               ↓
            ThinkingSteps     DataCards      ContentBuffer
                    ↓               ↓               ↓
                    └───────────────┼───────────────┘
                                    ↓
                          extractStreamBlocks()
                                    ↓
                            ContentBlock[]
                                    ↓
                            BlockRenderer
                                    ↓
                    ┌───────────────┼───────────────┐
                    ↓               ↓               ↓
              MarkdownText    StockCard      InlineChart
```

## Components and Interfaces

### Directory Structure

```
src/components/catalyst-copilot/
├── index.ts                    # Public exports
├── CatalystCopilot.tsx         # Main chat component
├── ChatInput.tsx               # Text input with send button
├── MessageBubble.tsx           # Individual message container
├── ThinkingIndicator.tsx       # AI thinking progress display
├── BlockRenderer.tsx           # Content block dispatcher
├── MarkdownText.tsx            # Markdown rendering component
├── AnimatedTextBlock.tsx       # Character animation wrapper
├── DataCardComponent.tsx       # Card type dispatcher
├── StockCard.tsx               # Stock price card
├── ArticleCard.tsx             # News article card
├── EventCard.tsx               # Market event card
├── ImageCard.tsx               # SEC filing image card
├── InlineChartCard.tsx         # Inline price chart
├── hooks/
│   ├── useStreamingChat.ts     # SSE streaming hook
│   └── useTextAnimation.ts     # Text animation hook
└── lib/
    └── StreamBlockTypes.ts     # Type definitions
```

### Core Interfaces

```typescript
// Message structure
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  contentBlocks?: ContentBlock[];
  dataCards?: DataCard[];
  timestamp: Date;
  thinkingSteps?: ThinkingStep[];
  error?: string;
}

// Content block types
type BlockType = 
  | 'text'
  | 'chart'
  | 'article'
  | 'image'
  | 'event'
  | 'horizontal_rule';

interface ContentBlock {
  id: string;
  type: BlockType;
  content?: string;
  data?: any;
}

// SSE event types
type SSEEventType = 
  | 'thinking'
  | 'metadata'
  | 'text_delta'
  | 'chart_block'
  | 'article_block'
  | 'image_block'
  | 'event_block'
  | 'done'
  | 'error';

// Data card types
interface DataCard {
  type: 'article' | 'image' | 'event' | 'stock';
  data: ArticleCardData | ImageCardData | EventCardData | StockCardData;
}

// Streaming state
interface StreamingState {
  isStreaming: boolean;
  blocks: ContentBlock[];
  thinking: ThinkingStep[];
  dataCards: DataCard[];
  error: string | null;
}
```

### Component Props

```typescript
// Main component
interface CatalystCopilotProps {
  selectedTickers?: string[];
  onEventClick?: (event: MarketEvent) => void;
  onTickerClick?: (ticker: string) => void;
}

// Chat input
interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

// Message bubble
interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  streamedBlocks?: ContentBlock[];
  dataCards?: DataCard[];
  onEventClick?: (event: MarketEvent) => void;
  onTickerClick?: (ticker: string) => void;
}

// Block renderer
interface BlockRendererProps {
  block: ContentBlock;
  dataCards?: DataCard[];
  onEventClick?: (event: any) => void;
  onTickerClick?: (ticker: string) => void;
}
```

## Data Models

### Message Storage Schema

```typescript
interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  contentBlocks?: ContentBlock[];
  dataCards?: DataCard[];
  timestamp: string; // ISO string for serialization
  thinkingSteps?: ThinkingStep[];
}

interface ChatStorage {
  messages: StoredMessage[];
  lastUpdated: string;
  conversationId?: string;
}
```

### SSE Event Schemas

```typescript
// Thinking event
interface ThinkingEvent {
  type: 'thinking';
  phase: string;
  content: string;
}

// Metadata event
interface MetadataEvent {
  type: 'metadata';
  dataCards: DataCard[];
  eventData: Record<string, any>;
  conversationId: string;
}

// Text delta event
interface TextDeltaEvent {
  type: 'text_delta' | 'content';
  content: string;
}

// Done event
interface DoneEvent {
  type: 'done';
  conversationId: string;
}

// Error event
interface ErrorEvent {
  type: 'error';
  error: string;
}
```

### Card Data Schemas

```typescript
interface StockCardData {
  ticker: string;
  company: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose?: number;
  chartReference?: {
    table: string;
    symbol: string;
    dateRange: { start: string; end: string };
  };
}

interface ArticleCardData {
  id: string;
  title: string;
  url: string;
  source: string;
  domain: string;
  publishedAt?: string;
  imageUrl?: string;
  country?: string;
  category?: string;
}

interface EventCardData {
  id: string;
  ticker: string;
  title: string;
  type: string;
  datetime: string;
  aiInsight?: string;
  impact?: string;
}

interface ImageCardData {
  id: string;
  ticker: string;
  title: string;
  imageUrl: string;
  source: string;
  filingType?: string;
  filingDate?: string;
  filingUrl?: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Message Display Completeness
*For any* message in the message history, the rendered output SHALL contain a timestamp and appropriate role indicator (user avatar/initials or AI icon).
**Validates: Requirements 1.4, 1.5, 1.6**

### Property 2: Send Button State Consistency
*For any* input state, the send button SHALL be disabled when the input is empty or contains only whitespace, and enabled otherwise.
**Validates: Requirements 2.3, 2.10**

### Property 3: Message Sending Side Effects
*For any* valid non-empty message sent, the message SHALL be added to the message history immediately and the input field SHALL be cleared.
**Validates: Requirements 2.5, 2.6**

### Property 4: Long Message Text Wrapping
*For any* message content exceeding the container width, the text SHALL wrap to multiple lines without horizontal overflow.
**Validates: Requirements 2.9**

### Property 5: SSE Event Processing
*For any* valid SSE event received (thinking, metadata, text_delta, chart_block, article_block, image_block, event_block, done, error), the system SHALL process it and update the appropriate state (thinking steps, data cards, content blocks, streaming status, or error state).
**Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11**

### Property 6: Markdown Smart Cutoff
*For any* text containing markdown formatting markers (**, *, `, etc.), the animation cutoff position SHALL NOT split a marker in the middle, ensuring complete markers are always displayed.
**Validates: Requirements 4.3**

### Property 7: Streaming Completion Text Display
*For any* streaming session that completes (done event received), all remaining text content SHALL be immediately displayed without animation delay.
**Validates: Requirements 4.4**

### Property 8: Markdown Rendering Correctness
*For any* text containing markdown syntax (bold, italic, code, links, lists, headings, blockquotes), the rendered output SHALL apply the correct styling for each markdown element.
**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10**

### Property 9: Inline Marker Extraction
*For any* text containing inline markers ([VIEW_CHART:...], [VIEW_ARTICLE:...], [IMAGE_CARD:...], [EVENT_CARD:...]), the markers SHALL be extracted and corresponding content blocks SHALL be rendered at the marker positions.
**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.7**

### Property 10: Invalid Marker Handling
*For any* inline marker referencing a non-existent data card ID, the system SHALL handle it gracefully without crashing and either skip the marker or display a placeholder.
**Validates: Requirements 6.9**

### Property 11: Stock Card Data Display
*For any* stock card with valid data, the card SHALL display the ticker symbol, company name (if different from ticker), current price, and price change with correct color coding (green for positive, red for negative).
**Validates: Requirements 7.1, 7.2, 7.4**

### Property 12: Stock Card Time Range Support
*For any* valid time range (1D, 5D, 1W, 1M, 3M, 6M, 1Y, 5Y), the stock card SHALL fetch and display chart data for that range.
**Validates: Requirements 7.6**

### Property 13: Missing Stock Data Handling
*For any* stock card with missing or unavailable data, the system SHALL display appropriate fallback UI (loading indicator, error message, or placeholder).
**Validates: Requirements 7.9**

### Property 14: Message Persistence Round-Trip
*For any* message added to the history, saving to AsyncStorage and then restoring SHALL produce an equivalent message object.
**Validates: Requirements 12.1, 12.2**

### Property 15: Conversation Context Inclusion
*For any* message sent to the backend, the request payload SHALL include the conversation history (up to the configured limit).
**Validates: Requirements 12.3**

### Property 16: Message History Size Limit
*For any* message history, the stored size SHALL NOT exceed the configured maximum (e.g., 50 messages or 1MB).
**Validates: Requirements 12.5**

### Property 17: Error State Display
*For any* error condition (network error, SSE failure, timeout, API error), the system SHALL display an appropriate error message and provide a retry option.
**Validates: Requirements 13.1, 13.2, 13.3, 13.4**

### Property 18: Auto-Scroll on New Messages
*For any* new message added to the history (user or assistant), the message list SHALL auto-scroll to show the latest message unless the user has manually scrolled up.
**Validates: Requirements 1.10**

## Error Handling

### Network Errors
- Display user-friendly error message
- Provide retry button
- Preserve user's message for retry
- Log error details for debugging

### SSE Connection Failures
- Detect connection drops
- Attempt automatic reconnection (up to 3 times)
- Display connection status indicator
- Allow manual retry after max attempts

### Timeout Handling
- Set 30-second timeout for initial response
- Display timeout error message
- Provide retry option
- Cancel pending request on timeout

### Invalid Data Handling
- Validate SSE event structure
- Skip malformed events with warning log
- Handle missing data card references gracefully
- Display placeholder for failed content blocks

### Storage Errors
- Catch AsyncStorage exceptions
- Continue operation without persistence
- Log storage errors
- Attempt recovery on next save

## Testing Strategy

### Unit Tests
Unit tests verify specific examples and edge cases:

1. **Component Rendering**
   - ChatInput renders with placeholder
   - MessageBubble displays user/assistant styling
   - StockCard shows price with correct color
   - MarkdownText renders bold/italic/links

2. **Edge Cases**
   - Empty message prevention
   - Very long messages
   - Missing data card references
   - Network timeout scenarios

3. **State Management**
   - Message list updates
   - Streaming state transitions
   - Error state handling

### Property-Based Tests
Property tests verify universal properties across all inputs using fast-check:

1. **Property 2: Send Button State** - Generate random strings, verify button state matches emptiness
2. **Property 3: Message Sending** - Generate valid messages, verify history update and input clear
3. **Property 5: SSE Event Processing** - Generate valid SSE events, verify state updates
4. **Property 6: Markdown Smart Cutoff** - Generate markdown text, verify no split markers
5. **Property 8: Markdown Rendering** - Generate markdown text, verify correct styling
6. **Property 9: Inline Marker Extraction** - Generate text with markers, verify extraction
7. **Property 14: Message Persistence** - Generate messages, verify round-trip equality

### Integration Tests
1. Full chat flow: send message → receive streaming response → display content
2. Navigation: tap stock card → navigate to stock detail
3. Persistence: send messages → restart app → verify history restored

### Testing Configuration
- Property tests: minimum 100 iterations per property
- Use fast-check for property-based testing
- Tag format: **Feature: catalyst-copilot, Property {number}: {property_text}**

## React Native Specific Considerations

### SSE Streaming Strategy
React Native doesn't have native `ReadableStream` support. Implementation options:

1. **Recommended: Manual Fetch with Text Parsing**
   ```typescript
   const response = await fetch(url, { method: 'POST', ... });
   const reader = response.body.getReader();
   const decoder = new TextDecoder();
   
   while (true) {
     const { done, value } = await reader.read();
     if (done) break;
     const chunk = decoder.decode(value);
     // Parse SSE events from chunk
   }
   ```

2. **Alternative: react-native-sse library**
   - Provides EventSource-like API
   - Handles reconnection automatically
   - May have compatibility issues with some backends

### Markdown Rendering
Use `react-native-markdown-display` with custom rules:
- Custom renderers for inline content blocks
- Theme-aware styling
- Link handling with Linking API

### Animation Performance
Use `react-native-reanimated` for smooth animations:
- Character-by-character text animation
- Content block entrance animations
- Thinking indicator animations

### Storage
Use `@react-native-async-storage/async-storage`:
- JSON serialization for messages
- Size limit enforcement
- Error handling for quota exceeded

### Keyboard Handling
- Use `KeyboardAvoidingView` for input positioning
- Handle keyboard show/hide events
- Adjust scroll position when keyboard appears

## Dependencies

### Required Packages
```json
{
  "react-native-markdown-display": "^7.0.0",
  "react-native-reanimated": "^3.x",
  "@react-native-async-storage/async-storage": "^1.x",
  "react-native-safe-area-context": "^4.x"
}
```

### Existing Project Dependencies (Already Available)
- React Native
- React Navigation
- Supabase client
- Design tokens and theme context

## API Endpoint

```
POST https://catalyst-copilot-2nndy.ondigitalocean.app/chat

Headers:
  Content-Type: application/json
  Accept: text/event-stream

Body:
{
  "message": string,
  "conversationHistory": Array<{ role: string, content: string }>,
  "selectedTickers": string[],
  "timezone": string
}

Response: Server-Sent Events stream
```
