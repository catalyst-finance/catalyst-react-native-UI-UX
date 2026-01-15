# SSE Event Flow - Sequential Processing

## Overview

The Catalyst Copilot frontend processes Server-Sent Events (SSE) **sequentially** to ensure proper rendering order. Each event triggers specific UI updates, and containers are created only when their corresponding event arrives.

## Event Timeline

```
Time    SSE Event        Frontend Action                     UI Display
──────────────────────────────────────────────────────────────────────────
0ms     [User sends]     - Disable input                     User message
                         - Show AI avatar                    AI avatar ✨
                         - Set isStreaming = true            

50ms    metadata         - Render data cards                 📊 Stock Card
                         - Show loading dots (if no          🖼️ Image Card
                           thinking yet)                     ● ● ● (dots)

200ms   thinking         - CREATE thinking container         ┌─────────────┐
                         - Add first thinking step           │ ✨ Thinking │
                         - Hide loading dots                 │ • Step 1    │
                                                              └─────────────┘

800ms   thinking         - Add second thinking step          ┌─────────────┐
                         - Animate step in                   │ ✨ Thinking │
                                                              │ • Step 1    │
                                                              │ • Step 2    │
                                                              └─────────────┘

1400ms  thinking         - Add third thinking step           ┌─────────────┐
                                                              │ ✨ Thinking │
                                                              │ • Step 1    │
                                                              │ • Step 2    │
                                                              │ • Step 3    │
                                                              └─────────────┘

2000ms  content          - CREATE answer container           TSLA is up ▊
                         - Collapse thinking box
                         - Append "TSLA "
                         - Show blinking cursor

2050ms  content          - Append "is "                      TSLA is ▊

2100ms  content          - Append "up "                      TSLA is up ▊

2150ms  content          - Append "5% "                      TSLA is up 5% ▊

... (content continues streaming word-by-word)

4000ms  done             - Remove cursor                     TSLA is up 5%
                         - Set isStreaming = false           today...
                         - Enable input
                         - Make thinking expandable          ✅ Complete
```

## State Management Flow

```javascript
// Initial State (before streaming)
{
  isStreaming: false,
  thinkingSteps: [],
  streamedContent: '',
  streamingDataCards: [],
  thinkingCollapsed: false
}

// After metadata event
{
  isStreaming: true,
  thinkingSteps: [],                    // Still empty
  streamedContent: '',                  // Still empty
  streamingDataCards: [...],            // ✅ Cards added
  thinkingCollapsed: false
}

// After first thinking event
{
  isStreaming: true,
  thinkingSteps: [{ phase, content }],  // ✅ First step
  streamedContent: '',                  // Still empty
  streamingDataCards: [...],
  thinkingCollapsed: false
}

// After first content event
{
  isStreaming: true,
  thinkingSteps: [...],
  streamedContent: 'TSLA ',             // ✅ First chunk
  streamingDataCards: [...],
  thinkingCollapsed: true               // ✅ Auto-collapse
}

// After done event
{
  isStreaming: false,                   // ✅ Streaming complete
  thinkingSteps: [],                    // Cleared
  streamedContent: '',                  // Cleared
  streamingDataCards: [],               // Cleared
  thinkingCollapsed: false
}
// Final message saved to messages array with all data
```

## UI Rendering Logic

### Conditional Rendering

```typescript
{isStreaming && (
  <div className="streaming-container">
    {/* 1. AI Avatar - Always shown first */}
    <Avatar>✨ Catalyst AI</Avatar>
    
    {/* 2. Data Cards - Show when metadata arrives */}
    {streamingDataCards.length > 0 && (
      <DataCards cards={streamingDataCards} />
    )}
    
    {/* 3. Loading Dots - Show if nothing else yet */}
    {thinkingSteps.length === 0 && 
     !streamedContent && 
     streamingDataCards.length === 0 && (
      <LoadingDots />
    )}
    
    {/* 4. Thinking Box - Create on first thinking event */}
    {thinkingSteps.length > 0 && (
      <ThinkingBox steps={thinkingSteps} />
    )}
    
    {/* 5. Answer - Create on first content event */}
    {streamedContent && (
      <>
        <Answer text={streamedContent} />
        <BlinkingCursor />
      </>
    )}
  </div>
)}
```

### Key Rules

1. **Data Cards First**
   ```javascript
   // Metadata is ALWAYS the first SSE event
   if (data.type === 'metadata') {
     setStreamingDataCards(data.dataCards); // Immediate render
   }
   ```

2. **Thinking Container Created Once**
   ```javascript
   // Only create thinking box on FIRST thinking event
   if (data.type === 'thinking') {
     setThinkingSteps(prev => [...prev, newStep]);
     // React will create <ThinkingBox> when length goes 0 → 1
   }
   ```

3. **Answer Container Created Once**
   ```javascript
   // Only create answer div on FIRST content event
   if (data.type === 'content') {
     setStreamedContent(prev => prev + data.content);
     // React will create <Answer> when streamedContent goes '' → 'first chunk'
   }
   ```

4. **Loading Dots Logic**
   ```javascript
   // Show dots ONLY when:
   // - No thinking steps yet
   // - No content yet
   // - No data cards yet (optional, can show dots even with cards)
   const showDots = thinkingSteps.length === 0 && 
                    !streamedContent && 
                    streamingDataCards.length === 0;
   ```

## Backend SSE Implementation

### Correct Event Order

```javascript
app.post('/chat', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // 1. Send metadata FIRST
  res.write(`data: ${JSON.stringify({
    type: 'metadata',
    dataCards: await fetchDataCards(tickers)
  })}\n\n`);

  // 2. Send thinking steps
  const thinkingSteps = [
    { phase: 'analyzing', content: 'Analyzing stock movements...' },
    { phase: 'retrieving', content: 'Checking recent events...' },
    { phase: 'synthesizing', content: 'Preparing response...' }
  ];

  for (const step of thinkingSteps) {
    res.write(`data: ${JSON.stringify({
      type: 'thinking',
      phase: step.phase,
      content: step.content
    })}\n\n`);
    await sleep(500); // Simulate thinking delay
  }

  // 3. Stream content word-by-word
  const response = "TSLA is up 5% today due to strong earnings...";
  const words = response.split(' ');

  for (const word of words) {
    res.write(`data: ${JSON.stringify({
      type: 'content',
      content: word + ' '
    })}\n\n`);
    await sleep(50); // Word-by-word streaming
  }

  // 4. Send done signal
  res.write(`data: ${JSON.stringify({
    type: 'done'
  })}\n\n`);

  res.end();
});
```

### ❌ Wrong Order (Don't Do This)

```javascript
// WRONG: Sending content before metadata
res.write(`data: ${JSON.stringify({ type: 'content', content: 'TSLA' })}\n\n`);
res.write(`data: ${JSON.stringify({ type: 'metadata', dataCards: [...] })}\n\n`);
// Result: Answer appears before data cards ❌

// WRONG: Sending thinking after content starts
res.write(`data: ${JSON.stringify({ type: 'content', content: 'TSLA' })}\n\n`);
res.write(`data: ${JSON.stringify({ type: 'thinking', content: 'Analyzing...' })}\n\n`);
// Result: Thinking box appears while answer is streaming ❌

// WRONG: Sending metadata after content
res.write(`data: ${JSON.stringify({ type: 'content', content: 'TSLA is up' })}\n\n`);
res.write(`data: ${JSON.stringify({ type: 'metadata', dataCards: [...] })}\n\n`);
// Result: Cards appear in middle of streaming text ❌
```

## Visual Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     SSE Event Flow                           │
└──────────────────────────────────────────────────────────────┘

Backend                          Network                Frontend
────────                         ────────              ─────────

POST /chat
  ↓
Fetch stock data
  ↓
res.write(metadata) ────────────────────────→ Render cards
                                              Show loading dots
  ↓
Generate thinking
  ↓
res.write(thinking) ────────────────────────→ Create thinking box
                                              Add step 1
  ↓
res.write(thinking) ────────────────────────→ Add step 2
  ↓
res.write(thinking) ────────────────────────→ Add step 3
  ↓
Call LLM API
  ↓
res.write(content)  ────────────────────────→ Create answer div
                                              Collapse thinking
                                              Append "TSLA "
  ↓
res.write(content)  ────────────────────────→ Append "is "
  ↓
res.write(content)  ────────────────────────→ Append "up "
  ↓
... (continue streaming)
  ↓
res.write(done)     ────────────────────────→ Remove cursor
                                              Enable input
                                              Save to messages
  ↓
res.end()
```

## Error Handling

### Network Interruption

```javascript
const reader = response.body.getReader();

try {
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    // Process SSE data
    processSSEChunk(value);
  }
} catch (error) {
  console.error('Stream interrupted:', error);
  
  // Cleanup partial state
  setIsStreaming(false);
  setStreamedContent('');
  setThinkingSteps([]);
  
  // Show error message
  setMessages(prev => [...prev, {
    role: 'assistant',
    content: 'Connection lost. Please try again.'
  }]);
}
```

### Malformed SSE Data

```javascript
for (const line of lines) {
  if (line.startsWith('data: ')) {
    try {
      const data = JSON.parse(line.substring(6));
      processEvent(data);
    } catch (e) {
      console.error('Failed to parse SSE:', e);
      // Continue processing other events
      continue;
    }
  }
}
```

### Missing Events

```javascript
// If content arrives before metadata (backend bug)
if (data.type === 'content' && streamingDataCards.length === 0) {
  console.warn('Content arrived before metadata - backend sent events out of order');
  // Still process the content, just note the issue
  setStreamedContent(prev => prev + data.content);
}
```

## Testing Checklist

### Verify Correct Order

- [ ] Data cards appear before thinking
- [ ] Thinking appears before answer
- [ ] Answer appears after thinking collapses
- [ ] Loading dots disappear when thinking starts
- [ ] Loading dots disappear when content starts (if no thinking)
- [ ] Cursor appears with first content chunk
- [ ] Cursor disappears on done event
- [ ] Input re-enables on done event

### Edge Cases

- [ ] No metadata sent (just thinking + content)
- [ ] No thinking sent (just metadata + content)
- [ ] Metadata after thinking started (out of order)
- [ ] Very fast streaming (< 10ms between events)
- [ ] Very slow streaming (> 5s between events)
- [ ] Connection lost mid-stream
- [ ] Malformed JSON in SSE data
- [ ] Empty content chunks
- [ ] Done event before any content

## Performance Optimization

### Debouncing Content Updates

```javascript
// Instead of updating on every single character
let contentBuffer = '';
let updateTimeout;

if (data.type === 'content') {
  contentBuffer += data.content;
  
  clearTimeout(updateTimeout);
  updateTimeout = setTimeout(() => {
    setStreamedContent(prev => prev + contentBuffer);
    contentBuffer = '';
  }, 16); // ~60fps
}
```

### Batching Thinking Steps

```javascript
// If backend sends thinking steps very fast, batch them
const thinkingBuffer = [];
let thinkingTimeout;

if (data.type === 'thinking') {
  thinkingBuffer.push({ phase: data.phase, content: data.content });
  
  clearTimeout(thinkingTimeout);
  thinkingTimeout = setTimeout(() => {
    setThinkingSteps(prev => [...prev, ...thinkingBuffer]);
    thinkingBuffer.length = 0;
  }, 100);
}
```

## Summary

**Critical Rules:**
1. ✅ Metadata ALWAYS sent first (data cards)
2. ✅ Thinking ALWAYS sent second (reasoning steps)
3. ✅ Content ALWAYS sent third (answer streaming)
4. ✅ Done ALWAYS sent last (completion signal)

**Frontend Processing:**
1. ✅ Create containers only on FIRST event of that type
2. ✅ Update existing containers on subsequent events
3. ✅ Maintain sequential display order
4. ✅ Show loading state until first meaningful content

**Result:**
- Smooth, predictable user experience
- No layout shifts or reordering
- Clear progression: Cards → Thinking → Answer
- Professional ChatGPT-like feel
