# Catalyst Copilot WebSocket Deployment Guide

## Quick Start

### 1. Deploy Backend (Digital Ocean)

The backend is already deployed at Digital Ocean. To update it with WebSocket support:

```bash
cd "Catalyst Copilot"

# Install dependencies (ws package)
npm install

# Test locally first
npm start

# In another terminal, test WebSocket
node test-websocket.js
```

If local test works, deploy to Digital Ocean:

```bash
# Commit changes
git add .
git commit -m "Add WebSocket support for real-time chat"
git push origin main

# Digital Ocean will auto-deploy if connected to GitHub
# Or manually deploy via Digital Ocean dashboard
```

### 2. Test Frontend

```bash
# In the main app directory
npm start

# Navigate to Copilot screen
# Send a test message
# Should see instant streaming with connection indicator
```

## Backend Configuration

### Environment Variables
No new environment variables needed. WebSocket uses the same config as HTTP endpoint:
- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `MONGODB_URI`
- `PORT` (default: 3000)

### WebSocket Endpoint
- **Local**: `ws://localhost:3000/ws/chat`
- **Production**: `wss://catalyst-copilot-2nndy.ondigitalocean.app/ws/chat`

Note: Production uses `wss://` (secure WebSocket) automatically when behind HTTPS.

## Frontend Configuration

### Update Endpoint (if needed)

In `src/components/catalyst-copilot/hooks/useStreamingChat.ts`:

```typescript
// For local development
const WS_ENDPOINT = 'ws://localhost:3000/ws/chat';

// For production
const WS_ENDPOINT = 'wss://catalyst-copilot-2nndy.ondigitalocean.app/ws/chat';
```

Currently set to production endpoint.

## Testing Checklist

### Backend Tests
- [ ] Server starts without errors
- [ ] WebSocket endpoint accessible at `/ws/chat`
- [ ] Test script connects successfully: `node test-websocket.js`
- [ ] Receives `connected` message
- [ ] Streams AI response
- [ ] Handles errors gracefully

### Frontend Tests
- [ ] App connects to WebSocket on mount
- [ ] Connection indicator shows "connected" state
- [ ] Can send messages
- [ ] Receives thinking indicators
- [ ] Text streams in real-time
- [ ] Data cards appear correctly
- [ ] Handles disconnection gracefully
- [ ] Auto-reconnects after network interruption

### Integration Tests
- [ ] Send simple query: "Hello"
- [ ] Send stock query: "What moved TSLA today?"
- [ ] Send complex query: "Compare AAPL and MSFT performance"
- [ ] Test with poor network (airplane mode on/off)
- [ ] Test with multiple messages in conversation
- [ ] Test conversation history persistence

## Troubleshooting

### Backend Issues

**WebSocket not connecting:**
```bash
# Check if server is running
curl http://localhost:3000/health

# Check WebSocket endpoint
node test-websocket.js
```

**Port already in use:**
```bash
# Kill process on port 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:3000 | xargs kill -9
```

### Frontend Issues

**"Not connected" error:**
- Check if backend is running
- Verify WebSocket URL is correct
- Check network connectivity
- Look for CORS issues in browser console

**Messages not streaming:**
- Check browser/app console for errors
- Verify WebSocket connection is open
- Test with backend test script first

**Auto-reconnect not working:**
- Check if max attempts (5) exceeded
- Verify reconnection delay (3 seconds)
- Look for connection errors in console

## Performance Monitoring

### Backend Metrics
Monitor these in production:
- WebSocket connection count
- Message throughput (messages/second)
- Average response time
- Error rate
- Memory usage

### Frontend Metrics
Track these in app:
- Connection success rate
- Reconnection frequency
- Message latency (send to first response)
- Streaming speed (characters/second)

## Security Considerations

### Backend
- ✅ WebSocket uses same authentication as HTTP
- ✅ CORS configured for allowed origins
- ✅ Rate limiting (if implemented)
- ✅ Input validation on all messages

### Frontend
- ✅ Uses secure WebSocket (wss://) in production
- ✅ No sensitive data in WebSocket URL
- ✅ Proper error handling prevents data leaks

## Rollback Plan

If WebSocket has issues, the HTTP/SSE endpoint is still available:

1. In `useStreamingChat.ts`, switch back to XMLHttpRequest implementation
2. Change endpoint from `wss://...` to `https://.../chat`
3. No backend changes needed - both endpoints work simultaneously

## Next Steps

After successful deployment:

1. **Monitor Performance**: Track latency and connection stability
2. **Add Features**: Typing indicators, live notifications
3. **Optimize**: Implement message batching if needed
4. **Scale**: Add load balancing for multiple WebSocket servers
5. **Analytics**: Track usage patterns and popular queries

## Support

If issues arise:
1. Check backend logs: `pm2 logs` or Digital Ocean logs
2. Check frontend console: React Native debugger
3. Test with `test-websocket.js` script
4. Verify network connectivity
5. Check Digital Ocean status page
