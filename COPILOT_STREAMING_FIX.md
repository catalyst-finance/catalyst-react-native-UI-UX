# Catalyst Copilot - Critical Streaming Fixes

**Date:** January 15, 2026  
**Status:** ✅ FIXED

## Issues Identified

### Issue 1: No Live Typewriter Streaming
**Problem:** Response appeared all at once after thinking, with no character-by-character animation.

**Root Cause:** 
- No placeholder assistant message was created during streaming
- Blocks were only shown after the `done` event
- AnimatedTextBlock wasn't being used for streaming text blocks

**Fix:**
1. Create placeholder assistant message immediately when streaming starts
2. Replace placeholder with final message on `done` event
3. Update BlockRenderer to use AnimatedTextBlock for last text block during streaming

### Issue 2: Raw Text Not Formatted
**Problem:** Markdown wasn't being rendered during streaming.

**Root Cause:**
- BlockRenderer was rendering text blocks directly without checking if streaming
- No typewriter animation on text blocks

**Fix:**
- BlockRenderer now uses AnimatedTextBlock for the last text block when streaming
- Markdown is rendered progressively as text animates

## Changes Made

### 1. useStreamingChat.ts
```typescript
// Create placeholder assistant message when streaming starts
const placeholderAssistantMessage: Message = {
  id: `assistant-${generateMessageId()}`,
  role: 'assistant',
  content: '',
  timestamp: new Date(),
};

setMessages(prev => [...prev, userMessage, placeholderAssistantMessage]);

// Replace placeholder on 'done' event
setMessages(prev => {
  const newMessages = [...prev];
  for (let i = newMessages.length - 1; i >= 0; i--) {
    if (newMessages[i].role === 'assistant') {
      newMessages[i] = assistantMessage;
      break;
    }
  }
  return newMessages;
});
```

### 2. BlockRenderer.tsx
```typescript
// Use AnimatedTextBlock for last text block when streaming
case 'text':
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
  
  return (
    <MarkdownText
      text={block.content || ''}
      dataCards={dataCards}
      onEventClick={onEventClick}
      onTickerClick={onTickerClick}
    />
  );
```

## Expected Behavior Now

### Streaming Flow
1. **User sends message** → User message appears immediately
2. **Streaming starts** → Placeholder assistant message created
3. **Thinking phase** → Animated dots appear
4. **Thinking text** → "Reading TSLA news" with pulsing animation
5. **Content arrives** → Blocks appear in real-time:
   - Text blocks: Typewriter animation with markdown formatting
   - Chart blocks: Appear immediately
   - Card blocks: Appear immediately
6. **Done event** → Placeholder replaced with final message

### Visual Experience
- ✅ Animated dots (left-to-right wave)
- ✅ Thinking text (pulsing)
- ✅ Typewriter text animation (12ms per character, 2 chars per tick)
- ✅ Markdown formatting during animation (bold, italic, links, etc.)
- ✅ Smart cutoff (doesn't split markdown markers)
- ✅ Blocks appear as they arrive
- ✅ Smooth transitions

## Files Modified
1. `src/components/catalyst-copilot/hooks/useStreamingChat.ts`
   - Added placeholder assistant message creation
   - Updated `done` and `error` handlers to replace placeholder
   
2. `src/components/catalyst-copilot/BlockRenderer.tsx`
   - Added AnimatedTextBlock for streaming text blocks
   - Updated props to include `isStreaming` and `isLastBlock`
   - BlockListRenderer passes correct flags to BlockRenderer

## Testing Checklist
- [x] Send a message and verify placeholder appears
- [x] Verify animated dots show during thinking
- [x] Verify thinking text shows with animation
- [x] Verify text appears character-by-character
- [x] Verify markdown formatting works during animation
- [x] Verify blocks appear as they arrive
- [x] Verify final message replaces placeholder
- [x] Verify error messages work correctly

## Performance Notes
- Animation speed: 12ms per character (83 chars/second)
- Characters per tick: 2 (smooth but not too fast)
- Smart cutoff prevents markdown splitting
- Immediate display on streaming complete

Date: January 15, 2026
