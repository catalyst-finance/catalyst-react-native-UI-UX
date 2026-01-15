# Supabase Authentication Integration Guide

## Overview

This guide explains how to migrate from custom JWT authentication to Supabase's managed authentication system. After running the RLS migration SQL, your backend will use Supabase Auth while maintaining all custom features.

---

## Architecture Changes

### Before (Custom Auth)
```
Frontend → Backend API → Custom JWT validation → public.users table
```

### After (Supabase Auth)
```
Frontend → Supabase Auth API → auth.users table
Frontend → Backend API → Supabase JWT validation → auth.users + public.user_profiles
```

---

## Installation

```bash
npm install @supabase/supabase-js
```

---

## Configuration

### Environment Variables

Add to your `.env`:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Keep existing variables
OPENAI_API_KEY=...
MONGODB_URI=...
```

**Where to find these:**
1. Go to your Supabase project dashboard
2. Click "Settings" → "API"
3. Copy `URL`, `anon/public key`, and `service_role key`

---

## Backend Setup

### 1. Initialize Supabase Client

Create `supabase-client.js`:

```javascript
import { createClient } from '@supabase/supabase-js';

// Anon key for general operations (respects RLS)
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Service role key for admin operations (bypasses RLS)
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default supabase;
```

### 2. Authentication Middleware

Create `auth-middleware.js`:

```javascript
import { supabase } from './supabase-client.js';

/**
 * Middleware to verify Supabase JWT token
 * Attaches user object to req.user
 */
export async function authenticateUser(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'No token provided' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Invalid or expired token' 
      });
    }

    // Check if user is active (not banned)
    if (user.banned_until && new Date(user.banned_until) > new Date()) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Account is temporarily suspended' 
      });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      email_verified: !!user.email_confirmed_at,
      full_name: user.user_metadata?.full_name,
      avatar_url: user.user_metadata?.avatar_url,
      is_premium: user.app_metadata?.is_premium || false,
      created_at: user.created_at,
      last_sign_in: user.last_sign_in_at
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      message: 'Authentication failed' 
    });
  }
}

/**
 * Optional middleware for premium users only
 */
export async function requirePremium(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!req.user.is_premium) {
    return res.status(403).json({ 
      error: 'Premium Required', 
      message: 'This feature requires a premium subscription' 
    });
  }

  next();
}
```

### 3. Update API Routes

Replace your old auth endpoints with these:

```javascript
import express from 'express';
import { supabase, supabaseAdmin } from './supabase-client.js';
import { authenticateUser } from './auth-middleware.js';

const router = express.Router();

// ============================================
// AUTHENTICATION ROUTES (Frontend uses these)
// ============================================

/**
 * Sign Up
 * POST /api/auth/signup
 */
router.post('/auth/signup', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // Create user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: full_name || ''
        },
        emailRedirectTo: `${process.env.APP_URL}/verify-email`
      }
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // user_profiles is auto-created by trigger
    
    res.status(201).json({
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata.full_name,
        email_verified: false
      },
      session: data.session,
      message: 'Please check your email to verify your account'
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Sign In
 * POST /api/auth/login
 */
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    // Update last_login_at timestamp
    await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
      user_metadata: {
        ...data.user.user_metadata,
        last_login_at: new Date().toISOString()
      }
    });

    res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name,
        avatar_url: data.user.user_metadata?.avatar_url,
        email_verified: !!data.user.email_confirmed_at,
        is_premium: data.user.app_metadata?.is_premium || false
      },
      session: data.session
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Sign Out
 * POST /api/auth/logout
 */
router.post('/auth/logout', authenticateUser, async (req, res) => {
  try {
    const token = req.headers.authorization.substring(7);
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut(token);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Logged out successfully' });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Request Password Reset
 * POST /api/auth/reset-password
 */
router.post('/auth/reset-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.APP_URL}/update-password`
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      message: 'Password reset email sent. Please check your inbox.' 
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update Password (after reset)
 * POST /api/auth/update-password
 */
router.post('/auth/update-password', authenticateUser, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters' 
      });
    }

    // Update password
    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Password updated successfully' });

  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get Current User
 * GET /api/auth/me
 */
router.get('/auth/me', authenticateUser, async (req, res) => {
  try {
    // Get user profile data
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found is ok
      console.error('Profile fetch error:', error);
    }

    res.json({
      user: {
        ...req.user,
        profile: profile || {}
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// USER PROFILE ROUTES
// ============================================

/**
 * Update User Profile
 * PATCH /api/users/profile
 */
router.patch('/users/profile', authenticateUser, async (req, res) => {
  try {
    const {
      full_name,
      avatar_url,
      risk_tolerance,
      investment_goals,
      preferred_sectors,
      notification_preferences,
      onboarding_completed
    } = req.body;

    // Update auth.users metadata
    if (full_name !== undefined || avatar_url !== undefined) {
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name,
          avatar_url
        }
      });

      if (authError) {
        return res.status(400).json({ error: authError.message });
      }
    }

    // Update user_profiles
    const profileUpdates = {};
    if (risk_tolerance !== undefined) profileUpdates.risk_tolerance = risk_tolerance;
    if (investment_goals !== undefined) profileUpdates.investment_goals = investment_goals;
    if (preferred_sectors !== undefined) profileUpdates.preferred_sectors = preferred_sectors;
    if (notification_preferences !== undefined) profileUpdates.notification_preferences = notification_preferences;
    if (onboarding_completed !== undefined) profileUpdates.onboarding_completed = onboarding_completed;

    if (Object.keys(profileUpdates).length > 0) {
      profileUpdates.updated_at = new Date().toISOString();

      const { error: profileError } = await supabase
        .from('user_profiles')
        .update(profileUpdates)
        .eq('user_id', req.user.id);

      if (profileError) {
        return res.status(400).json({ error: profileError.message });
      }
    }

    res.json({ message: 'Profile updated successfully' });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get User Watchlists
 * GET /api/users/watchlists
 */
router.get('/users/watchlists', authenticateUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_watchlists')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ watchlists: data });

  } catch (error) {
    console.error('Get watchlists error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create Watchlist
 * POST /api/users/watchlists
 */
router.post('/users/watchlists', authenticateUser, async (req, res) => {
  try {
    const { name, description, tickers, is_default, is_public } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Watchlist name is required' });
    }

    const { data, error } = await supabase
      .from('user_watchlists')
      .insert({
        user_id: req.user.id,
        name,
        description: description || null,
        tickers: tickers || [],
        is_default: is_default || false,
        is_public: is_public || false
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ watchlist: data });

  } catch (error) {
    console.error('Create watchlist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// CONVERSATION ROUTES
// ============================================

/**
 * Get User Conversations
 * GET /api/conversations
 */
router.get('/conversations', authenticateUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', req.user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ conversations: data });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create Conversation
 * POST /api/conversations
 */
router.post('/conversations', authenticateUser, async (req, res) => {
  try {
    const { title, metadata } = req.body;

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: req.user.id,
        title: title || 'New Conversation',
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ conversation: data });

  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get Messages in Conversation
 * GET /api/conversations/:id/messages
 */
router.get('/conversations/:id/messages', authenticateUser, async (req, res) => {
  try {
    const conversationId = req.params.id;

    // Verify ownership
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('user_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get messages
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ messages: data });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Add Message to Conversation
 * POST /api/conversations/:id/messages
 */
router.post('/conversations/:id/messages', authenticateUser, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const { 
      role, 
      content, 
      topic,
      extension,
      data_cards, 
      payload,
      event,
      feedback,
      feedback_reason,
      metadata,
      private: isPrivate 
    } = req.body;

    if (!role || !content) {
      return res.status(400).json({ error: 'Role and content are required' });
    }

    // Verify ownership (RLS will also check this)
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('user_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Insert message with all fields
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        topic: topic || '',
        extension: extension || '',
        data_cards: data_cards || null,
        payload: payload || null,
        event: event || null,
        feedback: feedback || null,
        feedback_reason: feedback_reason || null,
        metadata: metadata || {},
        private: isPrivate || false
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    // Increment query count
    await supabase.rpc('increment_user_queries', { user_uuid: req.user.id });

    res.status(201).json({ message: data });

  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// ADMIN ROUTES (Service Role Only)
// ============================================

/**
 * Get All Users (Admin)
 * GET /api/admin/users
 */
router.get('/admin/users', async (req, res) => {
  try {
    // Verify admin access (you should add proper admin auth here)
    const adminKey = req.headers['x-admin-key'];
    
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { data, error } = await supabaseAdmin
      .from('user_details')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ users: data });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

### 5. Data Ingestion with Service Role

For backend processes that populate market data (prices, events, company info), use the service role client which bypasses RLS:

```javascript
import { supabaseAdmin } from './supabase-client.js';

/**
 * Data Ingestion Endpoints (Internal/Cron Jobs)
 * These should NOT be exposed to frontend
 * Protect with API keys or internal network access only
 */

/**
 * Ingest Stock Quotes
 * POST /internal/ingest/stock-quotes
 */
router.post('/internal/ingest/stock-quotes', async (req, res) => {
  try {
    // Verify internal API key
    const apiKey = req.headers['x-internal-api-key'];
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { quotes } = req.body; // Array of quote objects

    // Use supabaseAdmin to bypass RLS
    const { data, error } = await supabaseAdmin
      .from('stock_quote_now')
      .upsert(quotes, { 
        onConflict: 'symbol',
        ignoreDuplicates: false 
      });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      message: 'Stock quotes ingested successfully',
      count: quotes.length 
    });

  } catch (error) {
    console.error('Ingest stock quotes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Ingest Daily Prices
 * POST /internal/ingest/daily-prices
 */
router.post('/internal/ingest/daily-prices', async (req, res) => {
  try {
    const apiKey = req.headers['x-internal-api-key'];
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { prices } = req.body;

    const { data, error } = await supabaseAdmin
      .from('daily_prices')
      .upsert(prices, { 
        onConflict: 'symbol,date',
        ignoreDuplicates: false 
      });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      message: 'Daily prices ingested successfully',
      count: prices.length 
    });

  } catch (error) {
    console.error('Ingest daily prices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Ingest Events
 * POST /internal/ingest/events
 */
router.post('/internal/ingest/events', async (req, res) => {
  try {
    const apiKey = req.headers['x-internal-api-key'];
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { events } = req.body;

    const { data, error } = await supabaseAdmin
      .from('event_data')
      .upsert(events, { 
        onConflict: 'PrimaryID',
        ignoreDuplicates: false 
      });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      message: 'Events ingested successfully',
      count: events.length 
    });

  } catch (error) {
    console.error('Ingest events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Ingest Company Information
 * POST /internal/ingest/companies
 */
router.post('/internal/ingest/companies', async (req, res) => {
  try {
    const apiKey = req.headers['x-internal-api-key'];
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { companies } = req.body;

    const { data, error } = await supabaseAdmin
      .from('company_information')
      .upsert(companies, { 
        onConflict: 'symbol',
        ignoreDuplicates: false 
      });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ 
      message: 'Company information ingested successfully',
      count: companies.length 
    });

  } catch (error) {
    console.error('Ingest companies error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

### 4. Update Main Server File

```javascript
import express from 'express';
import cors from 'cors';
import authRoutes from './routes.js'; // Your new routes file

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Mount auth routes
app.use('/api', authRoutes);

// Your existing agent endpoint
app.post('/api/agent', authenticateUser, async (req, res) => {
  // req.user is now available
  const userId = req.user.id;
  const userEmail = req.user.email;
  
  // Your existing agent logic...
  // You can now associate conversations with users
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

## Frontend Integration

### 1. Install Supabase Client

```bash
npm install @supabase/supabase-js
```

### 2. Initialize Supabase

```javascript
// supabase.js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
```

### 3. Authentication Examples

```javascript
// Sign Up
async function signUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }
    }
  });
  
  if (error) console.error('Error:', error.message);
  else console.log('Check your email for verification link!');
}

// Sign In
async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) console.error('Error:', error.message);
  else {
    // Store session
    localStorage.setItem('access_token', data.session.access_token);
    localStorage.setItem('refresh_token', data.session.refresh_token);
  }
}

// Sign Out
async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) console.error('Error:', error.message);
  else {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
}

// Get Current User
async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  return user;
}

// Call Backend API with Token
async function callBackendAPI(endpoint, method = 'GET', body = null) {
  const { data: { session } } = await supabase.auth.getSession();
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    }
  };
  
  if (body) options.body = JSON.stringify(body);
  
  const response = await fetch(`https://your-backend.com/api${endpoint}`, options);
  return response.json();
}
```

---

## Database Functions

Add these helper functions to Supabase SQL:

```sql
-- Function to increment user query count
CREATE OR REPLACE FUNCTION increment_user_queries(user_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.user_profiles
  SET 
    total_queries = COALESCE(total_queries, 0) + 1,
    updated_at = now()
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment conversation count
CREATE OR REPLACE FUNCTION increment_user_conversations(user_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.user_profiles
  SET 
    total_conversations = COALESCE(total_conversations, 0) + 1,
    updated_at = now()
  WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_user_queries(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_user_conversations(UUID) TO authenticated;
```

---

## Querying Market Data with RLS

When authenticated users query market data tables, RLS automatically enforces read-only access:

### From Frontend (Direct Supabase Client)

```javascript
import { supabase } from './supabase';

// User must be authenticated (has valid session)
async function getStockQuote(symbol) {
  const { data, error } = await supabase
    .from('stock_quote_now')
    .select('*')
    .eq('symbol', symbol)
    .single();
    
  return data;
}

async function getDailyPrices(symbol, startDate, endDate) {
  const { data, error } = await supabase
    .from('daily_prices')
    .select('*')
    .eq('symbol', symbol)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });
    
  return data;
}

async function getEvents(ticker, limit = 10) {
  const { data, error } = await supabase
    .from('event_data')
    .select('*')
    .eq('ticker', ticker)
    .order('actualDateTime', { ascending: false })
    .limit(limit);
    
  return data;
}

async function getCompanyInfo(symbol) {
  const { data, error } = await supabase
    .from('company_information')
    .select('*')
    .eq('symbol', symbol)
    .single();
    
  return data;
}

async function getIntradayPrices(symbol, startTime, endTime) {
  const { data, error } = await supabase
    .from('intraday_prices')
    .select('*')
    .eq('symbol', symbol)
    .gte('timestamp', startTime)
    .lte('timestamp', endTime)
    .order('timestamp', { ascending: true });
    
  return data;
}

async function getUserWatchlistSymbols() {
  // Get user's default watchlist from profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('default_watchlist')
    .eq('user_id', (await supabase.auth.getUser()).data.user.id)
    .single();
    
  return profile?.default_watchlist || [];
}

async function getWatchlistWithQuotes() {
  const symbols = await getUserWatchlistSymbols();
  
  if (symbols.length === 0) return [];
  
  const { data, error } = await supabase
    .from('stock_quote_now')
    .select('*')
    .in('symbol', symbols);
    
  return data;
}
```

### From Backend (Via API)

```javascript
/**
 * Get Stock Data
 * GET /api/stocks/:symbol
 */
router.get('/stocks/:symbol', authenticateUser, async (req, res) => {
  try {
    const { symbol } = req.params;
    
    // Use authenticated supabase client (respects RLS)
    const { data: quote, error: quoteError } = await supabase
      .from('stock_quote_now')
      .select('*')
      .eq('symbol', symbol.toUpperCase())
      .single();
      
    if (quoteError) {
      return res.status(404).json({ error: 'Stock not found' });
    }
    
    const { data: company, error: companyError } = await supabase
      .from('company_information')
      .select('*')
      .eq('symbol', symbol.toUpperCase())
      .single();
    
    res.json({
      quote,
      company: company || null
    });
    
  } catch (error) {
    console.error('Get stock error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get Chart Data
 * GET /api/stocks/:symbol/chart?range=1d|5d|1m|3m|1y|5y
 */
router.get('/stocks/:symbol/chart', authenticateUser, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { range = '1d' } = req.query;
    
    let table, startTime;
    const now = new Date();
    
    // Determine which table to query based on range
    switch(range) {
      case '1d':
        table = 'five_minute_prices';
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '5d':
        table = 'hourly_prices';
        startTime = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
        break;
      case '1m':
        table = 'daily_prices';
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3m':
        table = 'daily_prices';
        startTime = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        table = 'daily_prices';
        startTime = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case '5y':
        table = 'daily_prices';
        startTime = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        return res.status(400).json({ error: 'Invalid range' });
    }
    
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('symbol', symbol.toUpperCase())
      .gte('timestamp', startTime.toISOString())
      .order('timestamp', { ascending: true });
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json({ data, range, table });
    
  } catch (error) {
    console.error('Get chart data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get Upcoming Events for Watchlist
 * GET /api/events/watchlist
 */
router.get('/events/watchlist', authenticateUser, async (req, res) => {
  try {
    // Get user's watchlist
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('default_watchlist')
      .eq('user_id', req.user.id)
      .single();
    
    const symbols = profile?.default_watchlist || [];
    
    if (symbols.length === 0) {
      return res.json({ events: [] });
    }
    
    // Get events for watchlist symbols
    const { data, error } = await supabase
      .from('event_data')
      .select('*')
      .in('ticker', symbols)
      .gte('actualDateTime', new Date().toISOString())
      .order('actualDateTime', { ascending: true })
      .limit(50);
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    res.json({ events: data });
    
  } catch (error) {
    console.error('Get watchlist events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

## Database Schema Reference

### User Tables (with RLS)

#### `user_profiles`
- `user_id` (uuid, FK to auth.users)
- `default_watchlist` (jsonb array of symbols)
- `notification_preferences` (jsonb)
- `risk_tolerance` (text)
- `investment_goals` (text[])
- `preferred_sectors` (text[])
- `onboarding_completed` (boolean)
- `onboarding_step` (integer)
- `total_queries` (integer)
- `total_conversations` (integer)
- `created_at`, `updated_at`

#### `user_watchlists`
- `id` (uuid, PK)
- `user_id` (uuid, FK to auth.users)
- `name` (text)
- `description` (text)
- `tickers` (jsonb array)
- `is_default` (boolean)
- `is_public` (boolean)
- `created_at`, `updated_at`

#### `conversations`
- `id` (uuid, PK)
- `user_id` (uuid, FK to auth.users)
- `title` (text)
- `metadata` (jsonb)
- `created_at`, `updated_at`

#### `messages`
- `id` (uuid, PK)
- `conversation_id` (uuid, FK to conversations)
- `role` (text: 'user' | 'assistant' | 'system')
- `content` (text)
- `topic` (text)
- `extension` (text)
- `data_cards` (jsonb)
- `payload` (jsonb)
- `event` (text)
- `feedback` (text: 'positive' | 'negative')
- `feedback_reason` (text)
- `private` (boolean)
- `token_count` (integer)
- `metadata` (jsonb)
- `created_at`, `updated_at`, `inserted_at`

#### `audit_logs`
- `id` (uuid, PK)
- `user_id` (uuid, FK to auth.users)
- `action` (text)
- `resource_type` (text)
- `resource_id` (text)
- `ip_address` (text)
- `user_agent` (text)
- `metadata` (jsonb)
- `created_at`

### Market Data Tables (Read-Only for Authenticated Users)

#### `stock_quote_now`
- `symbol` (text, PK)
- `close` (double precision)
- `timestamp` (timestamptz)
- `volume` (bigint)
- `source` (text)
- `ingested_at` (timestamptz)
- `timestamp_et` (timestamptz)

#### `daily_prices`
- `symbol` (text)
- `date` (date)
- `open`, `high`, `low`, `close` (double precision)
- `volume` (bigint)
- `source` (text)
- `created_at`, `updated_at`
- `date_et` (date)
- PK: (symbol, date)

#### `intraday_prices`
- `symbol` (text)
- `timestamp` (timestamptz)
- `price` (double precision)
- `volume` (bigint)
- `source` (text)
- `ingested_at` (timestamptz)
- `timestamp_et` (timestamptz)
- PK: (symbol, timestamp)

#### `hourly_prices`, `five_minute_prices`, `one_minute_prices`
- Similar structure to daily_prices with OHLCV
- `timestamp` instead of `date`
- PK: (symbol, timestamp)

#### `finnhub_quote_snapshots`
- `symbol` (text)
- `timestamp` (timestamptz)
- `close`, `change`, `change_percent` (double precision)
- `high`, `low`, `open`, `previous_close` (double precision)
- `volume` (bigint)
- `market_date` (date)
- `source`, `ingested_at`, `timestamp_et`
- PK: (symbol, timestamp)

#### `event_data`
- `PrimaryID` (text, PK)
- `type`, `title`, `company`, `ticker`, `sector` (text)
- `time` (text)
- `impactRating`, `confidence` (bigint)
- `aiInsight` (text)
- `actualDateTime` (timestamptz)
- `created_on`, `updated_on` (timestamptz)
- `actualDateTime_et`, `created_on_et`, `updated_on_et`

#### `company_information`
- `symbol` (text, PK)
- `name`, `description`, `city`, `state`, `country` (text)
- `currency`, `exchange`, `weburl`, `logo` (text)
- `gsector`, `gind`, `gsubind`, `finnhubIndustry` (text)
- `employeeTotal` (smallint)
- `shareOutstanding` (double precision)
- `marketCapitalization` (numeric)
- `ipo`, `ipo_et` (date)
- `source`, `json` (text)
- `ingested_at`, `ingested_at_et` (timestamptz)

#### `watchlist`
- `symbol` (text, PK)
- `is_active` (boolean)

---

## Migration Checklist

- [ ] Run `rls-policies-migration.sql` in Supabase SQL Editor
- [ ] Install `@supabase/supabase-js` in backend
- [ ] Add Supabase credentials to `.env`
- [ ] Create `supabase-client.js` and `auth-middleware.js`
- [ ] Update API routes to use Supabase Auth
- [ ] Remove old JWT signing/verification code
- [ ] Remove old bcrypt password hashing code
- [ ] Test signup flow
- [ ] Test login flow
- [ ] Test password reset
- [ ] Test protected endpoints
- [ ] Update frontend to use Supabase Auth
- [ ] Test RLS policies work correctly
- [ ] Deploy and monitor

---

## Testing

### Test User Creation

```bash
curl -X POST https://your-backend.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "securepassword123",
    "full_name": "Test User"
  }'
```

### Test Login

```bash
curl -X POST https://your-backend.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "securepassword123"
  }'
```

### Test Protected Endpoint

```bash
curl -X GET https://your-backend.com/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Benefits Summary

✅ **Security**: Battle-tested auth system with automatic token rotation
✅ **Email Verification**: Built-in email templates and verification flow
✅ **Password Reset**: Automatic secure password reset emails
✅ **OAuth Ready**: Easy to add Google, GitHub, etc. later
✅ **MFA Ready**: Can enable multi-factor authentication
✅ **RLS Protection**: Database-level security ensures data isolation
✅ **Session Management**: Automatic refresh token handling
✅ **No JWT Signing**: Supabase handles all token generation
✅ **Audit Trail**: auth.audit_log_entries tracks all auth events

---

## Troubleshooting

### Issue: "JWT expired" error
**Solution**: Frontend should use refresh tokens to get new access tokens

```javascript
const { data, error } = await supabase.auth.refreshSession();
```

### Issue: RLS blocks my queries
**Solution**: Ensure you're using the user's access token, not the service role key

### Issue: User profile not created automatically
**Solution**: Check that the trigger `on_auth_user_created` exists and `handle_new_user()` function runs without errors

### Issue: Can't read data from frontend
**Solution**: Verify RLS policies allow `authenticated` role to SELECT

---

## Support

For Supabase-specific issues:
- Docs: https://supabase.com/docs/guides/auth
- Support: https://supabase.com/support

For implementation questions, refer to this guide or the Supabase JS client documentation.
