# Catalyst Copilot - Local Backend Setup (Optional)

## Quick Start - Use Production Backend (Recommended)

**You don't need to run the backend locally!** The app is already configured to use the production backend.

Just run:
```bash
npm start
```

The app will connect to `wss://catalyst-copilot-2nndy.ondigitalocean.app/ws/chat` automatically.

---

## Local Backend Setup (For Development Only)

If you want to run the backend locally for development/testing, follow these steps:

### 1. Get Your Credentials

You'll need:
- **OpenAI API Key**: From https://platform.openai.com/api-keys
- **Supabase URL & Key**: From your Supabase project dashboard
- **MongoDB URI**: From your MongoDB cluster (if using MongoDB features)

### 2. Configure Environment Variables

Edit `Catalyst Copilot/.env` and replace the placeholder values:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx  # Your actual OpenAI key

# Supabase Configuration  
SUPABASE_URL=https://xxxxx.supabase.co  # Your Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Your service role key

# MongoDB Configuration (optional - only if using MongoDB features)
MONGODB_URI=mongodb://user:pass@cluster.mongo.ondigitalocean.com:27017/db?authSource=admin

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Authentication
JWT_SECRET=change-this-to-a-random-32-character-string-for-security
```

### 3. Start Local Backend

```bash
cd "Catalyst Copilot"
npm start
```

You should see:
```
🚀 Catalyst AI Agent running on port 3000
🔌 WebSocket endpoint: ws://localhost:3000/ws/chat
📊 Connected to Supabase: true
🗄️  Connected to MongoDB: true
🤖 OpenAI API configured: true
```

### 4. Update Frontend to Use Local Backend

Edit `src/components/catalyst-copilot/hooks/useStreamingChat.ts`:

```typescript
// Change this line:
const WS_ENDPOINT = 'wss://catalyst-copilot-2nndy.ondigitalocean.app/ws/chat';

// To this:
const WS_ENDPOINT = 'ws://localhost:3000/ws/chat';
```

### 5. Test Local Backend

```bash
# In Catalyst Copilot directory
node test-websocket.js
```

You should see:
```
🔌 Connecting to WebSocket server...
✅ Connected to WebSocket server
📤 Sending test message: Hello, this is a test message
💭 Analyzing market data...
📥 Received: content
Tesla stock moved...
✅ Response complete
```

### 6. Start Frontend

```bash
# In main project directory
npm start
```

---

## Troubleshooting Local Setup

### "supabaseUrl is required" Error

**Problem**: Missing or invalid Supabase credentials in `.env`

**Solution**: 
1. Check that `Catalyst Copilot/.env` exists
2. Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
3. Make sure there are no extra spaces or quotes around values

### "OpenAI API key not found" Error

**Problem**: Missing OpenAI API key

**Solution**:
1. Get API key from https://platform.openai.com/api-keys
2. Add to `.env`: `OPENAI_API_KEY=sk-proj-xxxxx`
3. Restart backend

### "Port 3000 already in use" Error

**Problem**: Another process is using port 3000

**Solution**:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

Or change port in `.env`:
```bash
PORT=3001
```

### MongoDB Connection Failed

**Problem**: Invalid MongoDB URI or MongoDB not accessible

**Solution**:
- If you don't need MongoDB features, comment out MongoDB code
- Or get MongoDB URI from your cluster dashboard
- Verify network access is allowed from your IP

---

## Switching Between Local and Production

### Use Production Backend (Default)
```typescript
// src/components/catalyst-copilot/hooks/useStreamingChat.ts
const WS_ENDPOINT = 'wss://catalyst-copilot-2nndy.ondigitalocean.app/ws/chat';
```

### Use Local Backend
```typescript
// src/components/catalyst-copilot/hooks/useStreamingChat.ts
const WS_ENDPOINT = 'ws://localhost:3000/ws/chat';
```

---

## Why Use Production Backend?

**Advantages:**
- ✅ No setup required
- ✅ No API keys needed locally
- ✅ Always up-to-date
- ✅ No local resource usage
- ✅ Same environment as production

**When to use local backend:**
- Testing backend changes
- Debugging backend issues
- Developing new backend features
- Working offline

---

## Security Note

**Never commit `.env` file to git!**

The `.env` file is already in `.gitignore`. If you accidentally commit it:

```bash
# Remove from git history
git rm --cached "Catalyst Copilot/.env"
git commit -m "Remove .env file"

# Rotate all API keys immediately!
```

---

## Summary

**For normal development**: Use production backend (no setup needed)

**For backend development**: Set up local backend with your credentials

The app works great with the production backend - local setup is completely optional!
