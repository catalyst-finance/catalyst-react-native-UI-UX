# Catalyst Copilot - Live Streaming Implementation

## Overview
The Catalyst Copilot chat now supports live streaming responses with a ChatGPT-style thinking process display. The AI can stream its thoughts in real-time before delivering the final answer.

## Card Types Supported

The chat supports multiple data card types:
- **Stock Cards** - Real-time stock prices with mini charts
- **Event Cards** - Upcoming earnings, FDA events, launches
- **Image Cards** - SEC filing images (charts, tables, diagrams)
- **Event List Cards** - Summary of multiple upcoming events

## Features Implemented

### 1. **Live Thinking Stream**
- Real-time display of AI reasoning steps as they arrive
- Collapsible thinking box with smooth animations
- Rotating sparkle icon to indicate active thinking
- Individual thinking steps fade in as they're received

### 2. **Streamed Content Display**
- Word-by-word streaming of the AI response
- Animated typing cursor that blinks during streaming
- Smooth glassmorphism message bubbles matching existing design
- Auto-scrolling as content arrives

### 3. **Data Cards During Streaming**
- Stock cards, event cards, and image cards appear as metadata arrives
- SEC filing images displayed with context and filing details
- Same hover animations and styling as regular messages
- Automatically filtered by ticker relevance

### 4. **Historical Thinking Steps**
- Past messages retain their thinking steps
- Collapsible `<details>` element to view past reasoning
- "View thinking process" label with chevron indicator
- Same styling as live thinking for consistency

### 5. **PDF Export Enhancement**
- Thinking steps are included in PDF downloads
- Formatted as "💭 Thinking Process:" section
- Bulleted list of reasoning steps
- Maintains chronological order with messages

## Technical Implementation

### Data Flow

```
Backend SSE Stream → Frontend Reader → State Updates → UI Render
```

### SSE Message Types

The backend sends Server-Sent Events in this **sequential order**:

```
Event Order:  metadata → thinking → content → done
             ─────────────────────────────────────►
Display:     Cards      Thinking   Answer    Complete
             First      Box        Streams
```

**Frontend Processing Rules:**
- ✅ Data cards render immediately when `metadata` arrives (first event)
- ✅ Thinking box created only on **first** `thinking` event
- ✅ Answer container created only on **first** `content` event
- ✅ Loading dots visible until first thinking/content event
- ✅ Each UI element appears sequentially, never out of order

---

#### 1. **`metadata`** (First Event)
Contains dataCards, eventData, conversationId
   ```json
   {
     "type": "metadata",
     "dataCards": [
       {
         "type": "stock",
         "data": { "ticker": "TSLA", "price": 250.00, ... }
       },
       {
         "type": "image",
         "data": {
           "id": "sec-image-TSLA-001",
           "ticker": "TSLA",
           "source": "sec_filing",
           "title": "Product Pipeline",
           "imageUrl": "https://www.sec.gov/Archives/...",
           "context": "The following table...",
           "filingType": "10-K",
           "filingDate": "12/31/2024",
           "filingUrl": "https://www.sec.gov/..."
         }
       }
     ],
     "eventData": {...}
   }
   ```

#### 2. **`thinking`** (Second Event)
AI reasoning steps
   ```json
   {
     "type": "thinking",
     "phase": "analyzing",
     "content": "Analyzing stock price movements..."
   }
   ```

#### 3. **`content`** (Third Event, Repeating)
Streamed response text (sent word-by-word or chunk-by-chunk)
   ```json
   {
     "type": "content",
     "content": "TSLA "
   }
   ```

#### 4. **`done`** (Final Event)
Signals completion
   ```json
   {
     "type": "done"
   }
   ```

### State Management

New streaming states added:
- `isStreaming` - Controls streaming UI visibility
- `thinkingSteps` - Array of ThinkingStep objects
- `streamedContent` - Accumulated response text
- `streamingDataCards` - Data cards for active stream
- `thinkingCollapsed` - Toggle for thinking box

### Backward Compatibility

The implementation includes automatic fallback:
- If backend doesn't send SSE (no `text/event-stream` header), falls back to regular JSON response
- Existing functionality remains unchanged
- Old messages without thinking steps display normally

## User Experience

### During Streaming (Sequential Event Processing)
1. **User sends message**
2. **Input field disabled** with "AI is thinking..." placeholder
3. **AI avatar appears** with "Catalyst AI" label
4. **Metadata event** (first SSE event):
   - Data cards rendered immediately (stock, event, image cards)
   - Cards slide in with stagger animation
5. **Loading dots appear** (if no thinking event yet):
   - Three pulsing dots while waiting
   - Hidden once thinking or content arrives
6. **Thinking event** (second SSE event):
   - Thinking box appears with animated sparkle icon (max-width 85%)
   - Thinking steps stream in one by one with fade-in animation
   - Loading dots replaced by thinking box
7. **Content event** (third SSE event):
   - Answer container created (only on first content chunk)
   - Thinking box auto-collapses
   - Response content streams full-width (no background bubble)
   - Typing cursor blinks at end of streamed text
8. **Done event** (final SSE event):
   - Cursor removed
   - Thinking box becomes expandable
   - Input re-enables for next message

### Visual States
- **Loading**: Three dots pulsing (before thinking starts)
- **Thinking**: Collapsible box with rotating sparkle icon (max-width 85%)
- **Streaming**: Text flows full-width without background, typing cursor blinks every 0.8s
- **Complete**: Thinking collapsed by default, expandable on click
- **Disabled**: Input grayed out, send button disabled

### Layout Differences
- **User Messages**: Max-width 85%, right-aligned, gradient background bubble
- **AI Messages**: Full-width, left-aligned, no background (like ChatGPT)
- **Thinking Box**: Max-width 85%, subtle background with border
- **Data Cards**: Standard width, positioned after message content

## Integration with Existing Features

### Auto-Scroll
- Updated useEffect dependency: `[messages, streamedContent, thinkingSteps]`
- Smooth scrolling as new thinking steps or content arrives

### Edit Message
- Works seamlessly with messages containing thinking steps
- Editing triggers new stream with new thinking process

### Message History
- Thinking steps saved to localStorage
- Restored on page refresh
- Visible in message history as collapsible sections

### Dark Mode
- All streaming UI elements support dark mode
- Glassmorphism effects adapt to theme
- Gradient backgrounds maintain contrast

## Backend Requirements

To enable streaming, your backend must:

1. **Return SSE format**
   ```javascript
   res.setHeader('Content-Type', 'text/event-stream');
   res.setHeader('Cache-Control', 'no-cache');
   res.setHeader('Connection', 'keep-alive');
   ```

2. **Send formatted events**
   ```javascript
   res.write(`data: ${JSON.stringify({ type: 'thinking', content: '...' })}\n\n`);
   ```

3. **Close with done event**
   ```javascript
   res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
   res.end();
   ```

If these headers are not present, the frontend automatically falls back to JSON mode.

## Testing

### With Streaming Backend
- Send a message and verify thinking steps appear
- Check that content streams word-by-word
- Confirm thinking box is collapsible
- Test PDF export includes thinking steps

### Without Streaming Backend (Fallback)
- Verify regular JSON responses still work
- No thinking box should appear
- Standard message flow unchanged

## Future Enhancements

Potential additions:
- Thinking phases with icons (analyzing, researching, synthesizing)
- Confidence scores for AI reasoning
- Ability to interrupt/cancel streaming
- Streaming charts and visualizations
- Voice narration of streaming content
