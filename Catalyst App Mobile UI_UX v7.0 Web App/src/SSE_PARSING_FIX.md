# SSE Parsing Fix

## Issue

The original SSE (Server-Sent Events) parsing code had a critical bug:

```javascript
// ❌ WRONG - Uses literal backslash characters
const lines = buffer.split('\\n\\n');

// This was trying to split on the string "\n\n" (4 characters: backslash, n, backslash, n)
// instead of actual newline characters
```

**Error Message:**
```
Error sending message: SyntaxError: Unexpected token 'd', "data: {"ty"... is not valid JSON
```

**Root Cause:**
- The `split('\\n\\n')` was looking for literal backslash-n characters
- SSE messages are separated by actual newline characters (`\n\n`)
- The buffer never split properly, causing `line.substring(6)` to return incomplete JSON
- `JSON.parse()` failed on malformed strings like `"data: {"ty..."`

## Fix

### 1. Correct Split Pattern

```javascript
// ✅ CORRECT - Uses actual newlines or regex
const lines = buffer.split(/\n\n/);

// Alternative (also works):
const lines = buffer.split('\n\n');  // In JavaScript string, \n is interpreted as newline
```

### 2. Improved Parsing

```javascript
for (const line of lines) {
  const trimmedLine = line.trim();  // Remove whitespace
  if (trimmedLine && trimmedLine.startsWith('data: ')) {
    try {
      const jsonStr = trimmedLine.substring(6).trim();  // Extract and trim JSON
      const data = JSON.parse(jsonStr);
      // ... process data
    } catch (e) {
      console.error('Failed to parse SSE data:', e);
      console.error('Problematic line:', trimmedLine);  // Better debugging
    }
  }
}
```

### 3. Added Safety Checks

- `trimmedLine` - Remove leading/trailing whitespace
- Check `trimmedLine` is not empty before processing
- `trim()` the JSON string after extracting it
- Log the problematic line for easier debugging

## SSE Message Format

### Correct Format
```
data: {"type":"metadata","dataCards":[...]}\n
\n
data: {"type":"thinking","phase":"analyzing","content":"..."}\n
\n
data: {"type":"content","content":"TSLA "}\n
\n
data: {"type":"done"}\n
\n
```

### How It's Split

```javascript
buffer = 'data: {"type":"metadata"}\n\ndata: {"type":"thinking"}\n\n';
const lines = buffer.split(/\n\n/);
// Result: ['data: {"type":"metadata"}', 'data: {"type":"thinking"}']
```

Each `line` is then processed:
1. Trim whitespace
2. Check for `data: ` prefix
3. Extract JSON (substring from position 6)
4. Parse JSON
5. Handle the event based on type

## Testing

### Valid SSE Stream
```javascript
// Backend sends:
res.write('data: {"type":"metadata","dataCards":[]}\n\n');
res.write('data: {"type":"thinking","content":"Analyzing..."}\n\n');
res.write('data: {"type":"content","content":"TSLA is up"}\n\n');
res.write('data: {"type":"done"}\n\n');

// Frontend receives and parses correctly ✅
```

### Edge Cases Handled

1. **Extra Whitespace**
   ```
   data:   {"type":"metadata"}  \n\n
   ```
   Fixed by: `trimmedLine` and `jsonStr.trim()`

2. **Empty Lines**
   ```
   data: {"type":"metadata"}\n\n\n\ndata: {"type":"thinking"}\n\n
   ```
   Fixed by: `if (trimmedLine && ...)` check

3. **Malformed JSON**
   ```
   data: {"type":"metadata
   ```
   Fixed by: `try/catch` with detailed error logging

4. **Incomplete Buffer**
   ```
   data: {"type":"met
   ```
   Handled by: `buffer = lines.pop()` keeps incomplete message

## Common Mistakes

### ❌ Wrong: Single Backslash in String Literal
```javascript
const lines = buffer.split('\n\n');  // This might work in some contexts
```
**Issue:** In some file editors or when copy-pasting, `\n` might be interpreted as literal backslash-n

### ❌ Wrong: Double Backslash
```javascript
const lines = buffer.split('\\n\\n');  // Looks for literal "\n\n" string
```
**Issue:** Searches for 4 characters: `\`, `n`, `\`, `n`

### ✅ Correct: Regex Pattern
```javascript
const lines = buffer.split(/\n\n/);  // Unambiguous, always correct
```
**Advantage:** Regex patterns can't be misinterpreted

## Verification

### Check Your Implementation

```javascript
// Test 1: Verify split works
const testBuffer = 'data: {"type":"test"}\n\ndata: {"type":"test2"}\n\n';
const testLines = testBuffer.split(/\n\n/);
console.log(testLines.length);  // Should be 3 (including empty string at end)
console.log(testLines[0]);      // Should be 'data: {"type":"test"}'

// Test 2: Verify parsing works
const testLine = 'data: {"type":"metadata","dataCards":[]}';
const jsonStr = testLine.substring(6).trim();
const parsed = JSON.parse(jsonStr);
console.log(parsed.type);  // Should be 'metadata'
```

### Debug Logging

Add temporary logs to verify:
```javascript
console.log('Buffer:', buffer.substring(0, 100));
console.log('Lines count:', lines.length);
console.log('First line:', lines[0]);
console.log('JSON string:', jsonStr);
```

## Summary

**Before Fix:**
```javascript
buffer.split('\\n\\n')  // ❌ Literal backslash-n
  → Never splits properly
  → line.substring(6) returns "{"ty..."
  → JSON.parse() fails with SyntaxError
```

**After Fix:**
```javascript
buffer.split(/\n\n/)  // ✅ Actual newlines
  → Splits on double newline
  → line.substring(6) returns full JSON
  → JSON.parse() succeeds
  → Events process correctly
```

**Result:** SSE streaming now works correctly with proper event parsing!
