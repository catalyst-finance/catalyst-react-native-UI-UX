# Backend Price Targets API Setup

## Overview

This document provides instructions for setting up the backend API endpoint to fetch analyst price targets from MongoDB. The frontend calls this endpoint since Supabase Edge Functions cannot directly access MongoDB due to IP whitelist restrictions.

## Backend Endpoint Specification

### Route: `/api/price-targets/:symbol`

**Method:** `GET`

**URL Parameters:**
- `symbol` (required): Stock ticker symbol (e.g., "TSLA", "AAPL")

**Query Parameters:**
- `limit` (optional): Maximum number of price targets to return (default: 10)

**Response Format:**
```json
{
  "symbol": "TSLA",
  "priceTargets": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "symbol": "TSLA",
      "analyst_firm": "Truist",
      "analyst_name": "John Doe",
      "price_target": 439.00,
      "rating": "Hold",
      "published_date": "2026-01-08T14:13:05.000Z",
      "action": "Lowers",
      "previous_target": 444.00,
      "updated_at": "2026-01-08T14:13:05.000Z"
    }
  ]
}
```

**Error Responses:**
- `404 Not Found`: No price targets found for the symbol
- `500 Internal Server Error`: Database connection or query error

## Implementation Example (Node.js/Express)

```javascript
import express from 'express';
import { MongoClient } from 'mongodb';

const router = express.Router();

// MongoDB connection (adjust credentials and URL for your setup)
const mongoClient = new MongoClient(process.env.MONGODB_URL);
const db = mongoClient.db('raw_data');
const priceTargetsCollection = db.collection('price_targets');

/**
 * GET /api/price-targets/:symbol
 * Fetch analyst price targets for a given stock symbol
 */
router.get('/price-targets/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    // Validate symbol
    if (!symbol || !/^[A-Z]{1,5}$/.test(symbol.toUpperCase())) {
      return res.status(400).json({
        error: 'Invalid symbol format'
      });
    }
    
    // Query MongoDB for price targets
    const priceTargets = await priceTargetsCollection
      .find({ 
        symbol: symbol.toUpperCase() 
      })
      .sort({ published_date: -1 }) // Most recent first
      .limit(limit)
      .toArray();
    
    // Return results
    if (priceTargets.length === 0) {
      return res.status(404).json({
        symbol: symbol.toUpperCase(),
        priceTargets: [],
        message: 'No price targets found for this symbol'
      });
    }
    
    return res.status(200).json({
      symbol: symbol.toUpperCase(),
      priceTargets: priceTargets
    });
    
  } catch (error) {
    console.error('Error fetching price targets:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;
```

## MongoDB Collection Schema

The `price_targets` collection in the `raw_data` database should have documents with the following structure:

```javascript
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "symbol": "TSLA",           // Stock ticker (uppercase)
  "analyst_firm": "Truist",   // Name of the analyst firm
  "analyst_name": "John Doe", // Optional: Individual analyst name
  "price_target": 439.00,     // Target price (number)
  "rating": "Hold",           // Optional: Buy/Hold/Sell rating
  "published_date": ISODate("2026-01-08T14:13:05.000Z"), // Publication date
  "action": "Lowers",         // Optional: Maintains/Raises/Lowers/Initiates
  "previous_target": 444.00,  // Optional: Previous target price
  "updated_at": ISODate("2026-01-08T14:13:05.000Z") // Optional: Last update
}
```

## Recommended Indexes

For optimal performance, create the following indexes on the `price_targets` collection:

```javascript
// Compound index for symbol + published_date (most common query)
db.price_targets.createIndex(
  { symbol: 1, published_date: -1 }
);

// Single index on symbol for simple lookups
db.price_targets.createIndex({ symbol: 1 });
```

## Integration with Existing Backend

Add this route to your existing backend server that handles the `/api/catalyst-copilot` SSE endpoint. Since that server already has MongoDB access and a whitelisted IP, it's the perfect place to add this endpoint.

### Example Integration:

```javascript
// In your main server file (e.g., server.js or index.js)
import priceTargetsRouter from './routes/price-targets.js';

// ... existing code ...

// Add the price targets router
app.use('/api', priceTargetsRouter);

// ... existing SSE and other routes ...
```

## CORS Configuration

Make sure your backend allows CORS requests from your frontend domain:

```javascript
import cors from 'cors';

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
```

## Environment Variables

Add these environment variables to your backend `.env` file:

```bash
# MongoDB connection (DigitalOcean)
MONGODB_URL=mongodb://user:password@your-mongodb-host:27017/raw_data?authSource=admin

# Frontend URL for CORS
FRONTEND_URL=https://your-frontend-domain.com

# Optional: Backend URL for the frontend to call
BACKEND_URL=https://your-backend-domain.com
```

## Frontend Configuration

The frontend service (`/utils/price-targets-service.ts`) uses the `NEXT_PUBLIC_BACKEND_URL` environment variable. Add this to your frontend `.env.local`:

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001  # Development
# or
NEXT_PUBLIC_BACKEND_URL=https://your-backend-domain.com  # Production
```

## Testing

Test the endpoint with curl:

```bash
# Fetch price targets for TSLA (limit 5)
curl "http://localhost:3001/api/price-targets/TSLA?limit=5"

# Fetch price targets for AAPL (default limit 10)
curl "http://localhost:3001/api/price-targets/AAPL"
```

## Caching (Optional)

For better performance, consider adding caching:

```javascript
import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 300 }); // 5 minute cache

router.get('/price-targets/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const cacheKey = `price-targets:${symbol}`;
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.status(200).json(cached);
  }
  
  // ... query MongoDB ...
  
  // Cache the result
  cache.set(cacheKey, result);
  return res.status(200).json(result);
});
```

## Security Considerations

1. **Rate Limiting**: Add rate limiting to prevent abuse:
   ```javascript
   import rateLimit from 'express-rate-limit';
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   });
   
   app.use('/api/price-targets', limiter);
   ```

2. **Input Validation**: Always validate the symbol parameter to prevent injection attacks

3. **Error Handling**: Never expose internal error details to clients in production

## Deployment

Once implemented, deploy your backend with the price targets endpoint to the same server that handles your SSE streaming. This ensures:
- The server has MongoDB access (whitelisted IP)
- Consistent infrastructure
- Shared authentication/authorization if needed

## Chart Display

Once the backend endpoint is set up and deployed, the frontend will automatically:
1. Fetch price targets when a chart is loaded (not in mini mode)
2. Display them as horizontal dashed lines on the chart:
   - **Green** lines for targets above current price
   - **Red** lines for targets below current price
3. Show the price value on the right side
4. Show the analyst firm name on the left side (first target only)

The lines are styled with:
- 60% opacity
- 4px dash, 4px gap pattern
- 1.5px stroke width
- Auto-hide if outside visible y-axis range