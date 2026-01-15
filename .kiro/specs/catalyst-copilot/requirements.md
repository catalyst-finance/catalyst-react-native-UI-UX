# Requirements Document: Catalyst Copilot Chat Feature

## Introduction

The Catalyst Copilot is an AI-powered chat assistant that provides market insights, stock analysis, and real-time data visualization. This feature enables users to interact with an intelligent assistant through natural language, receiving streaming responses with rich content including stock cards, charts, event cards, and formatted text.

## Glossary

- **Copilot**: The AI chat assistant that provides market insights and analysis
- **SSE (Server-Sent Events)**: A server push technology enabling real-time streaming of data from server to client
- **Content Block**: A renderable unit of content (text, chart, card, etc.) within a chat message
- **Data Card**: A visual card component displaying stock, article, event, or image information
- **Streaming Response**: AI response that arrives incrementally in real-time rather than all at once
- **Chat State**: The current UI state of the chat interface (collapsed, expanded, full-window, minimized)
- **Message History**: The conversation context maintained across chat sessions
- **Thinking Steps**: Progress indicators showing the AI's reasoning process during response generation

## Requirements

### Requirement 1: Chat Interface Display

**User Story:** As a user, I want to see a clean chat interface, so that I can easily read and interact with the AI assistant.

#### Acceptance Criteria

1. THE System SHALL display a chat interface with message history in a scrollable view
2. THE System SHALL display user messages aligned to the right with distinct styling
3. THE System SHALL display AI messages aligned to the left with distinct styling
4. THE System SHALL display timestamps for each message
5. THE System SHALL display user avatars or initials for user messages
6. THE System SHALL display the Catalyst logo or icon for AI messages
7. THE System SHALL support light and dark theme modes
8. THE System SHALL display a text input field at the bottom of the screen
9. THE System SHALL display a send button next to the input field
10. THE System SHALL auto-scroll to the latest message when new messages arrive

### Requirement 2: Text Input and Message Sending

**User Story:** As a user, I want to type and send messages to the AI, so that I can ask questions and get insights.

#### Acceptance Criteria

1. THE System SHALL provide a text input field that expands as the user types
2. THE System SHALL support multi-line text input
3. THE System SHALL display a send button that is enabled only when text is entered
4. WHEN a user taps the send button, THE System SHALL send the message to the AI backend
5. WHEN a user sends a message, THE System SHALL add it to the message history immediately
6. WHEN a user sends a message, THE System SHALL clear the input field
7. THE System SHALL disable the input field while waiting for AI response
8. THE System SHALL support keyboard shortcuts (e.g., Enter to send on tablets with keyboards)
9. THE System SHALL handle long messages gracefully with text wrapping
10. THE System SHALL prevent sending empty messages

### Requirement 3: SSE Streaming Response Handling

**User Story:** As a user, I want to see AI responses appear in real-time, so that I get immediate feedback and don't have to wait for the complete response.

#### Acceptance Criteria

1. THE System SHALL establish an SSE connection to the AI backend when sending a message
2. THE System SHALL process incoming SSE events in real-time
3. THE System SHALL handle `thinking` events by displaying progress indicators
4. THE System SHALL handle `metadata` events by storing data cards and conversation context
5. THE System SHALL handle `text_delta` events by appending text to the current message
6. THE System SHALL handle `chart_block` events by rendering inline charts
7. THE System SHALL handle `article_block` events by rendering article cards
8. THE System SHALL handle `image_block` events by rendering image cards
9. THE System SHALL handle `event_block` events by rendering event cards
10. THE System SHALL handle `done` events by finalizing the message
11. THE System SHALL handle `error` events by displaying error messages
12. THE System SHALL support aborting an in-progress stream if the user navigates away

### Requirement 4: Animated Text Rendering

**User Story:** As a user, I want to see text appear character-by-character during streaming, so that I can follow along as the AI generates its response.

#### Acceptance Criteria

1. THE System SHALL animate text character-by-character as it streams in
2. THE System SHALL use a configurable animation speed (default: 12ms per character)
3. THE System SHALL avoid splitting markdown formatting markers during animation
4. THE System SHALL immediately display all remaining text when streaming completes
5. THE System SHALL support pausing animation if the user scrolls up
6. THE System SHALL resume animation when the user scrolls back to the bottom
7. THE System SHALL handle rapid text updates efficiently without lag

### Requirement 5: Markdown Formatting

**User Story:** As a user, I want to see formatted text in AI responses, so that information is presented clearly and professionally.

#### Acceptance Criteria

1. THE System SHALL render bold text using `**text**` or `__text__` syntax
2. THE System SHALL render italic text using `*text*` or `_text_` syntax
3. THE System SHALL render inline code using `` `code` `` syntax
4. THE System SHALL render code blocks using ``` ``` syntax with syntax highlighting
5. THE System SHALL render links as tappable elements
6. THE System SHALL render bullet lists with proper indentation
7. THE System SHALL render numbered lists with proper numbering
8. THE System SHALL render headings with appropriate font sizes
9. THE System SHALL render blockquotes with distinct styling
10. THE System SHALL handle nested markdown elements correctly

### Requirement 6: Inline Content Blocks

**User Story:** As a user, I want to see charts, cards, and other rich content inline with text, so that I can visualize data alongside explanations.

#### Acceptance Criteria

1. THE System SHALL parse inline markers like `[VIEW_CHART:TSLA:1D]` from text content
2. THE System SHALL render inline stock charts at the marker position
3. THE System SHALL render article cards at `[VIEW_ARTICLE:id]` markers
4. THE System SHALL render image cards at `[IMAGE_CARD:id]` markers
5. THE System SHALL render event cards at `[VIEW_EVENT:id]` markers
6. THE System SHALL maintain proper spacing between text and inline content
7. THE System SHALL support multiple inline content blocks in a single message
8. THE System SHALL render content blocks with smooth animations
9. THE System SHALL handle missing or invalid content references gracefully
10. THE System SHALL support tapping on content blocks to view details

### Requirement 7: Stock Cards

**User Story:** As a user, I want to see stock information cards in chat responses, so that I can quickly view price and chart data.

#### Acceptance Criteria

1. THE System SHALL display stock cards with ticker symbol and company name
2. THE System SHALL display current price and price change percentage
3. THE System SHALL display a mini chart showing recent price movement
4. THE System SHALL color-code price changes (green for positive, red for negative)
5. THE System SHALL fetch chart data from Supabase based on time range
6. THE System SHALL support different time ranges (1D, 5D, 1W, 1M, 3M, 6M, 1Y, 5Y)
7. THE System SHALL display loading indicators while fetching chart data
8. WHEN a user taps a stock card, THE System SHALL navigate to the stock detail screen
9. THE System SHALL handle missing or unavailable stock data gracefully
10. THE System SHALL update stock prices in real-time if available

### Requirement 8: Article Cards

**User Story:** As a user, I want to see news article cards in chat responses, so that I can read relevant market news.

#### Acceptance Criteria

1. THE System SHALL display article cards with title and source
2. THE System SHALL display article thumbnail images when available
3. THE System SHALL display publication date and time
4. THE System SHALL display article domain or source logo
5. WHEN a user taps an article card, THE System SHALL open the article URL in a browser
6. THE System SHALL display a "Read more" button or link
7. THE System SHALL handle missing images gracefully with placeholder
8. THE System SHALL truncate long titles appropriately
9. THE System SHALL support different article types (news, SEC filings, etc.)
10. THE System SHALL display AI-generated insights when available

### Requirement 9: Event Cards

**User Story:** As a user, I want to see event cards in chat responses, so that I can learn about upcoming or past market events.

#### Acceptance Criteria

1. THE System SHALL display event cards with event type icon and color
2. THE System SHALL display ticker symbol and company name
3. THE System SHALL display event title and date/time
4. THE System SHALL display event type label (Earnings, FDA, etc.)
5. THE System SHALL display AI impact assessment when available
6. THE System SHALL color-code events by type (earnings, FDA, product launch, etc.)
7. WHEN a user taps an event card, THE System SHALL navigate to event analysis screen
8. THE System SHALL display event status (upcoming, in-progress, completed)
9. THE System SHALL format event dates relative to current time (e.g., "in 2 days")
10. THE System SHALL handle missing event data gracefully

### Requirement 10: Image Cards

**User Story:** As a user, I want to see image cards for SEC filing images, so that I can view charts and diagrams from filings.

#### Acceptance Criteria

1. THE System SHALL display image cards with thumbnail preview
2. THE System SHALL display image title or caption
3. THE System SHALL display image source (e.g., "SEC Filing")
4. WHEN a user taps an image card, THE System SHALL open full-screen image viewer
5. THE System SHALL support pinch-to-zoom in full-screen viewer
6. THE System SHALL display loading indicators while images load
7. THE System SHALL handle image loading errors gracefully
8. THE System SHALL support different image formats (PNG, JPG, etc.)
9. THE System SHALL cache images for offline viewing
10. THE System SHALL display image dimensions or file size when available

### Requirement 11: Thinking Steps Display

**User Story:** As a user, I want to see what the AI is thinking about, so that I understand its reasoning process and know it's working.

#### Acceptance Criteria

1. THE System SHALL display thinking steps during AI response generation
2. THE System SHALL show progress indicators for each thinking phase
3. THE System SHALL display thinking step descriptions (e.g., "Loading TSLA data...")
4. THE System SHALL update thinking steps in real-time as they arrive
5. THE System SHALL display thinking duration when available
6. THE System SHALL collapse or hide thinking steps once response is complete
7. THE System SHALL support expanding collapsed thinking steps to view details
8. THE System SHALL animate thinking step transitions smoothly
9. THE System SHALL handle multiple concurrent thinking phases
10. THE System SHALL display error states if thinking fails

### Requirement 12: Message History Persistence

**User Story:** As a user, I want my chat history to be saved, so that I can continue conversations across app sessions.

#### Acceptance Criteria

1. THE System SHALL save message history to local storage after each message
2. THE System SHALL restore message history when the app launches
3. THE System SHALL maintain conversation context for AI responses
4. THE System SHALL support clearing chat history
5. THE System SHALL limit stored message history to prevent storage overflow
6. THE System SHALL save scroll position and restore it on app launch
7. THE System SHALL handle storage errors gracefully
8. THE System SHALL support exporting chat history
9. THE System SHALL sync chat history across devices when user is logged in
10. THE System SHALL display timestamps for historical messages

### Requirement 13: Error Handling and Retry

**User Story:** As a user, I want clear error messages and retry options, so that I can recover from network or API failures.

#### Acceptance Criteria

1. WHEN a network error occurs, THE System SHALL display an error message
2. THE System SHALL provide a retry button for failed messages
3. THE System SHALL handle SSE connection failures gracefully
4. THE System SHALL display timeout errors after 30 seconds
5. THE System SHALL handle API rate limiting with appropriate messages
6. THE System SHALL handle invalid responses from the backend
7. THE System SHALL log errors for debugging purposes
8. THE System SHALL allow users to edit and resend failed messages
9. THE System SHALL display connection status indicators
10. THE System SHALL automatically retry on transient network errors

### Requirement 14: Chat State Management

**User Story:** As a user, I want the chat interface to adapt to different contexts, so that I can use it in various ways throughout the app.

#### Acceptance Criteria

1. THE System SHALL support a "full-window" state for dedicated chat screen
2. THE System SHALL support a "collapsed" state for minimized chat card
3. THE System SHALL support an "inline-expanded" state for quick chat
4. THE System SHALL support a "minimized" state for floating button
5. THE System SHALL persist chat state across app sessions
6. THE System SHALL animate transitions between chat states smoothly
7. THE System SHALL adjust layout based on keyboard visibility
8. THE System SHALL support dismissing the keyboard by tapping outside
9. THE System SHALL maintain scroll position when changing states
10. THE System SHALL handle orientation changes gracefully

### Requirement 15: Conversation Context

**User Story:** As a user, I want the AI to remember our conversation, so that I can have natural, contextual discussions.

#### Acceptance Criteria

1. THE System SHALL send conversation history with each new message
2. THE System SHALL limit conversation history to last 10 messages to manage payload size
3. THE System SHALL include selected tickers in conversation context
4. THE System SHALL include user timezone in conversation context
5. THE System SHALL support starting new conversations
6. THE System SHALL display conversation metadata (ID, timestamp)
7. THE System SHALL handle conversation context errors gracefully
8. THE System SHALL support editing previous messages and regenerating responses
9. THE System SHALL maintain conversation context when app is backgrounded
10. THE System SHALL clear conversation context when user explicitly requests it

### Requirement 16: Performance and Optimization

**User Story:** As a user, I want the chat interface to be fast and responsive, so that I can have smooth interactions.

#### Acceptance Criteria

1. THE System SHALL render messages efficiently using virtualized lists
2. THE System SHALL lazy-load images and charts as they come into view
3. THE System SHALL debounce text input to prevent excessive re-renders
4. THE System SHALL use memoization for expensive computations
5. THE System SHALL limit animation frame rate to 60fps
6. THE System SHALL handle large message histories without performance degradation
7. THE System SHALL cancel in-flight requests when navigating away
8. THE System SHALL use efficient data structures for message storage
9. THE System SHALL minimize re-renders during streaming
10. THE System SHALL profile and optimize critical rendering paths

### Requirement 17: Accessibility

**User Story:** As a user with accessibility needs, I want the chat interface to be accessible, so that I can use it effectively.

#### Acceptance Criteria

1. THE System SHALL support screen readers for all text content
2. THE System SHALL provide accessible labels for all interactive elements
3. THE System SHALL support dynamic font sizing
4. THE System SHALL provide sufficient color contrast for text
5. THE System SHALL support keyboard navigation on tablets
6. THE System SHALL provide haptic feedback for important actions
7. THE System SHALL support voice input for text entry
8. THE System SHALL provide alternative text for images
9. THE System SHALL announce new messages to screen readers
10. THE System SHALL follow platform accessibility guidelines

## Special Requirements Guidance

### SSE Streaming in React Native

React Native doesn't have native `ReadableStream` support like web browsers. The implementation must:

1. Use a polyfill or alternative approach for SSE streaming
2. Consider using `fetch` with manual chunk parsing
3. Consider using WebSocket as a fallback
4. Handle connection lifecycle carefully (connect, disconnect, reconnect)
5. Implement proper error handling and retry logic

### Markdown Rendering

React Native requires a different approach than web:

1. Use `react-native-markdown-display` or similar library
2. Custom components for inline content blocks
3. Handle text selection and copying
4. Support custom styling for markdown elements
5. Optimize rendering for long messages

### Animation Performance

Character-by-character animation must be efficient:

1. Use `react-native-reanimated` for smooth animations
2. Batch character updates to reduce re-renders
3. Use `requestAnimationFrame` equivalent
4. Implement smart cutoff to avoid splitting markdown
5. Provide option to disable animations for performance

### Storage Strategy

Message persistence requires careful planning:

1. Use `AsyncStorage` for message history
2. Implement size limits to prevent storage overflow
3. Use compression for large message histories
4. Implement cleanup strategy for old messages
5. Handle storage errors gracefully

## Success Criteria

- ✅ Users can send and receive messages smoothly
- ✅ Streaming responses appear in real-time with animations
- ✅ Markdown formatting renders correctly
- ✅ Inline content blocks (charts, cards) display properly
- ✅ Message history persists across app sessions
- ✅ Error handling provides clear feedback and retry options
- ✅ Performance remains smooth with large message histories
- ✅ Interface adapts to different screen sizes and orientations
- ✅ Accessibility features work correctly
- ✅ Chat state transitions are smooth and intuitive
