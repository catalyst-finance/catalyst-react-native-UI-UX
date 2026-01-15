# Catalyst Copilot - Quick Reference

## Endpoints

### Production
- **WebSocket**: `wss://catalyst-copilot-2nndy.ondigitalocean.app/ws/chat`
- **HTTP (fallback)**: `https://catalyst-copilot-2nndy.ondigitalocean.app/chat`

### Local Development
- **WebSocket**: `ws://localhost:3000/ws/chat`
- **HTTP**: `http://localhost:3000/chat`

## Quick Commands

### Start Frontend (Recommended)
```bash
npm start
```
**Note**: The app uses the production backend by default. No local backend setup needed!

### Start Backend Locally (Optional - For Development)
```bash
cd "Catalyst Copilot"
# First, configure .env file with your credentials (see COPILOT_LOCAL_SETUP.md)
npm start
```

### Test WebSocket (Local Backend Only)
```bash
cd "Catalyst Copilot"
node test-websocket.js
```

## Message Protocol

### Send Message (Client → Server)
```json
{
  "type": "chat",
  "message": "Your question here",
  "conversationHistory": [],
  "selectedTickers": ["TSLA"],
  "timezone": "America/New_York"
}
```

### Receive Messages (Server → Client)

**Connected**
```json
{"type": "connected", "message": "Connected to Catalyst Copilot"}
```

**Thinking**
```json
{"type": "thinking", "phase": "analyzing", "content": "Analyzing market data..."}
```

**Metadata**
```json
{"type": "metadata", "dataCards": [...], "eventData": {...}}
```

**Content (streaming)**
```json
{"type": "content", "content": "Text chunk..."}
```

**Done**
```json
{"type": "done", "conversationId": "...", "data_cards": [...]}
```

**Error**
```json
{"type": "error", "error": "Error message"}
```

## Configuration

### Frontend Hook
File: `src/components/catalyst-copilot/hooks/useStreamingChat.ts`

```typescript
const WS_ENDPOINT = 'wss://catalyst-copilot-2nndy.ondigitalocean.app/ws/chat';
const RECONNECT_DELAY = 3000; // 3 seconds
const MAX_RECONNECT_ATTEMPTS = 5;
```

### Backend Server
File: `Catalyst Copilot/server.js`

```javascript
const wss = new WebSocket.Server({ 
  server,
  path: '/ws/chat'
});
```

## Features

### Auto-Reconnection
- Automatically reconnects if connection drops
- Max 5 attempts with 3-second delay
- Shows "Reconnecting..." banner in UI

### Connection State
- `isConnected` boolean tracks WebSocket state
- Input disabled when disconnected
- Visual indicator in UI

### Error Handling
- Graceful error messages
- Automatic retry on failure
- User-friendly error display

## Troubleshooting

### "Not connected" error
1. Check if backend is running
2. Verify WebSocket URL
3. Check network connectivity
4. Test with `node test-websocket.js`

### Messages not streaming
1. Check console for errors
2. Verify WebSocket connection is open
3. Test backend with test script
4. Check CORS configuration

### Auto-reconnect not working
1. Check if max attempts exceeded
2. Verify reconnection delay
3. Look for connection errors in console
4. Restart app to reset attempts

## Performance

### Expected Metrics
- **First message latency**: 50-100ms
- **Subsequent messages**: 10-50ms
- **Connection overhead**: Minimal
- **Network efficiency**: +70% vs HTTP

### Monitoring
Watch for:
- Connection success rate
- Reconnection frequency
- Message latency
- Streaming speed
- Error rate

## Testing Checklist

- [ ] Backend starts without errors
- [ ] WebSocket endpoint accessible
- [ ] Test script connects successfully
- [ ] App connects on mount
- [ ] Can send messages
- [ ] Receives thinking indicators
- [ ] Text streams in real-time
- [ ] Data cards appear
- [ ] Handles disconnection
- [ ] Auto-reconnects

## Common Issues

### Port already in use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### WebSocket connection refused
- Check if backend is running
- Verify port 3000 is open
- Check firewall settings
- Test with `curl http://localhost:3000/health`

### CORS errors
- Check `Catalyst Copilot/config/cors.js`
- Verify origin is allowed
- Check browser console for details

## Deployment

### Backend (Digital Ocean)
```bash
cd "Catalyst Copilot"
git add .
git commit -m "Update"
git push origin main
# Auto-deploys
```

### Frontend
No deployment needed - already configured for production.

## Support

1. Check backend logs
2. Check frontend console
3. Test with `test-websocket.js`
4. Verify network connectivity
5. Check Digital Ocean status

## Resources

- **Implementation**: `COPILOT_WEBSOCKET_IMPLEMENTATION.md`
- **Deployment**: `COPILOT_DEPLOYMENT_GUIDE.md`
- **Complete Guide**: `COPILOT_WEBSOCKET_COMPLETE.md`
