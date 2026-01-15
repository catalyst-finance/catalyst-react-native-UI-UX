import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { StockService } from "./stock-service.tsx";
import * as kv from "./kv_store.tsx";
import mongoDbService from "./mongodb-service.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    exposeHeaders: ["Content-Length"],
    maxAge: 86400,
    credentials: false,
  }),
);

// Health check endpoint
app.get("/make-server-fe0a490e/health", (c) => {
  return c.json({ status: "ok" });
});

// Market status endpoint using Finnhub API
app.get("/make-server-fe0a490e/market-status", async (c) => {
  try {
    const exchange = c.req.query('exchange') || 'US';
    const apiKey = Deno.env.get('FINNHUB_API_KEY');
    
    if (!apiKey) {
      console.error('FINNHUB_API_KEY not found in environment variables');
      return c.json({ error: 'API key not configured' }, 500);
    }
    
    const url = `https://finnhub.io/api/v1/stock/market-status?exchange=${exchange}&token=${apiKey}`;
    console.log('[Market Status] Fetching from Finnhub:', url.replace(apiKey, 'REDACTED'));
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Market Status] Finnhub API error:', response.status, errorText);
      return c.json({ error: 'Failed to fetch market status' }, response.status);
    }
    
    const data = await response.json();
    console.log('[Market Status] Finnhub response:', data);
    
    return c.json(data);
  } catch (error) {
    console.error('[Market Status] Error fetching market status:', error);
    return c.json({ error: 'Failed to fetch market status' }, 500);
  }
});

// Stock management endpoints - DEPRECATED: Now using direct database access via StockAPI

// Get all stocks
app.get("/make-server-fe0a490e/stocks", async (c) => {
  try {
    const stocks = await StockService.getAllStocks();
    return c.json({ stocks });
  } catch (error) {
    console.error("Error fetching all stocks:", error);
    return c.json({ error: "Failed to fetch stocks" }, 500);
  }
});

// Get specific stock
app.get("/make-server-fe0a490e/stocks/:symbol", async (c) => {
  try {
    const symbol = c.req.param("symbol");
    const stock = await StockService.getStock(symbol);
    
    if (!stock) {
      return c.json({ error: "Stock not found" }, 404);
    }
    
    return c.json({ stock });
  } catch (error) {
    console.error(`Error fetching stock:`, error);
    return c.json({ error: "Failed to fetch stock" }, 500);
  }
});

// Get multiple stocks by symbols
app.post("/make-server-fe0a490e/stocks/batch", async (c) => {
  try {
    const { symbols } = await c.req.json();
    
    if (!Array.isArray(symbols)) {
      return c.json({ error: "Symbols must be an array" }, 400);
    }
    
    const stocks = await StockService.getStocks(symbols);
    return c.json({ stocks });
  } catch (error) {
    console.error("Error fetching batch stocks:", error);
    return c.json({ error: "Failed to fetch stocks" }, 500);
  }
});

// Get stocks by sector
app.get("/make-server-fe0a490e/stocks/sector/:sector", async (c) => {
  try {
    const sector = c.req.param("sector");
    const stocks = await StockService.getStocksBySector(sector);
    return c.json({ stocks });
  } catch (error) {
    console.error(`Error fetching stocks for sector:`, error);
    return c.json({ error: "Failed to fetch stocks by sector" }, 500);
  }
});

// Search stocks
app.get("/make-server-fe0a490e/stocks/search/:query", async (c) => {
  try {
    const query = c.req.param("query");
    const limit = parseInt(c.req.query("limit") || "20");
    const stocks = await StockService.searchStocks(query, limit);
    return c.json({ stocks });
  } catch (error) {
    console.error("Error searching stocks:", error);
    return c.json({ error: "Failed to search stocks" }, 500);
  }
});

// Get all sectors
app.get("/make-server-fe0a490e/sectors", async (c) => {
  try {
    const sectors = await StockService.getSectors();
    return c.json({ sectors });
  } catch (error) {
    console.error("Error fetching sectors:", error);
    return c.json({ error: "Failed to fetch sectors" }, 500);
  }
});

// Get intraday prices for a symbol
app.get("/make-server-fe0a490e/intraday/:symbol", async (c) => {
  try {
    const symbol = c.req.param("symbol").toUpperCase();
    const dayOffsetParam = c.req.query("dayOffset");
    const dayOffset = dayOffsetParam ? parseInt(dayOffsetParam) : 0;
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials for intraday prices fetch");
      return c.json({ error: "Server configuration error" }, 500);
    }
    
    // Fetch intraday prices for the specified day
    // dayOffset: 0 = today, -1 = yesterday, etc.
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + dayOffset);
    targetDate.setHours(0, 0, 0, 0);
    const startISO = targetDate.toISOString();
    
    // End of the target day
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);
    const endISO = endDate.toISOString();
    
    // Add explicit limit to prevent overwhelming queries (default: 5000 rows)
    const limit = 5000;
    
    const response = await fetch(
      `${supabaseUrl}/rest/v1/intraday_prices?symbol=eq.${symbol}&timestamp=gte.${startISO}&timestamp=lte.${endISO}&order=timestamp.asc&limit=${limit}`,
      {
        headers: {
          "apikey": supabaseServiceKey,
          "Authorization": `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json"
        }
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error fetching intraday prices for ${symbol}: ${response.status} ${response.statusText} - ${errorText}`);
      
      // Return empty array if table doesn't exist or no permissions (graceful degradation)
      if (response.status === 404 || response.status === 401 || response.status === 406) {
        console.log(`Intraday prices table not accessible for ${symbol}, returning empty array`);
        return c.json({ 
          symbol,
          prices: [],
          count: 0
        });
      }
      
      return c.json({ error: "Failed to fetch intraday prices" }, 500);
    }
    
    const prices = await response.json();
    
    return c.json({ 
      symbol,
      prices: prices || [],
      count: prices?.length || 0
    });
  } catch (error) {
    console.error("Error fetching intraday prices:", error);
    // Return empty array on error to prevent chart from breaking
    return c.json({ 
      symbol: c.req.param("symbol").toUpperCase(),
      prices: [],
      count: 0
    });
  }
});

// Get previous day's close from daily_prices table
app.get("/make-server-fe0a490e/previous-close/:symbol", async (c) => {
  try {
    const symbol = c.req.param("symbol").toUpperCase();
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials for daily prices fetch");
      return c.json({ error: "Server configuration error" }, 500);
    }
    
    // Calculate yesterday's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get the most recent trading day (could be up to 3 days ago for weekends)
    const dates = [];
    for (let i = 1; i <= 5; i++) {
      const pastDate = new Date(today);
      pastDate.setDate(today.getDate() - i);
      dates.push(pastDate.toISOString().split('T')[0]);
    }
    
    // Query for the most recent close price
    const datesQuery = dates.map(d => `"${d}"`).join(',');
    const response = await fetch(
      `${supabaseUrl}/rest/v1/daily_prices?symbol=eq.${symbol}&date=in.(${datesQuery})&order=date.desc&limit=1`,
      {
        headers: {
          "apikey": supabaseServiceKey,
          "Authorization": `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json"
        }
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error fetching previous close for ${symbol}: ${response.status} ${response.statusText} - ${errorText}`);
      
      // Return null if table doesn't exist or no data found
      if (response.status === 404 || response.status === 406) {
        console.log(`Daily prices table not accessible for ${symbol}, returning null`);
        return c.json({ 
          symbol,
          previousClose: null,
          date: null
        });
      }
      
      return c.json({ error: "Failed to fetch previous close" }, 500);
    }
    
    const dailyPrices = await response.json();
    
    if (!dailyPrices || dailyPrices.length === 0) {
      console.log(`No previous close found for ${symbol}`);
      return c.json({ 
        symbol,
        previousClose: null,
        date: null
      });
    }
    
    const previousDayData = dailyPrices[0];
    
    return c.json({ 
      symbol,
      previousClose: previousDayData.close,
      date: previousDayData.date,
      open: previousDayData.open,
      high: previousDayData.high,
      low: previousDayData.low
    });
  } catch (error) {
    console.error("Error fetching previous close:", error);
    return c.json({ 
      symbol: c.req.param("symbol").toUpperCase(),
      previousClose: null,
      date: null
    });
  }
});

// Add or update stock (admin endpoint)
app.post("/make-server-fe0a490e/admin/stocks", async (c) => {
  try {
    const stockData: StockService.StockData = await c.req.json();
    
    // Basic validation
    if (!stockData.symbol || !stockData.company || !stockData.sector) {
      return c.json({ error: "Missing required fields: symbol, company, sector" }, 400);
    }
    
    const success = await StockService.upsertStock(stockData);
    
    if (success) {
      return c.json({ message: "Stock updated successfully" });
    } else {
      return c.json({ error: "Failed to update stock" }, 500);
    }
  } catch (error) {
    console.error("Error upserting stock:", error);
    return c.json({ error: "Failed to process stock data" }, 500);
  }
});

// Bulk update stocks (admin endpoint)
app.post("/make-server-fe0a490e/admin/stocks/bulk", async (c) => {
  try {
    const { stocks }: { stocks: StockService.StockData[] } = await c.req.json();
    
    if (!Array.isArray(stocks)) {
      return c.json({ error: "Stocks must be an array" }, 400);
    }
    
    const success = await StockService.bulkUpsertStocks(stocks);
    
    if (success) {
      return c.json({ message: `Successfully updated ${stocks.length} stocks` });
    } else {
      return c.json({ error: "Failed to bulk update stocks" }, 500);
    }
  } catch (error) {
    console.error("Error bulk updating stocks:", error);
    return c.json({ error: "Failed to process bulk stock data" }, 500);
  }
});

// Update stock prices (for real-time updates)
app.post("/make-server-fe0a490e/stocks/prices", async (c) => {
  try {
    const { updates } = await c.req.json();
    
    if (!Array.isArray(updates)) {
      return c.json({ error: "Updates must be an array" }, 400);
    }
    
    const success = await StockService.updateStockPrices(updates);
    
    if (success) {
      return c.json({ message: "Prices updated successfully" });
    } else {
      return c.json({ error: "Failed to update prices" }, 500);
    }
  } catch (error) {
    console.error("Error updating stock prices:", error);
    return c.json({ error: "Failed to update stock prices" }, 500);
  }
});

// Delete stock (admin endpoint)
app.delete("/make-server-fe0a490e/admin/stocks/:symbol", async (c) => {
  try {
    const symbol = c.req.param("symbol");
    const success = await StockService.deleteStock(symbol);
    
    if (success) {
      return c.json({ message: "Stock deleted successfully" });
    } else {
      return c.json({ error: "Failed to delete stock" }, 500);
    }
  } catch (error) {
    console.error("Error deleting stock:", error);
    return c.json({ error: "Failed to delete stock" }, 500);
  }
});

// Historical price data endpoints
app.post("/make-server-fe0a490e/historical-prices", async (c) => {
  try {
    const { symbol, resolution, from, to } = await c.req.json();
    
    if (!symbol || !resolution || !from || !to) {
      return c.json({ error: "Missing required parameters: symbol, resolution, from, to" }, 400);
    }

    const finnhubApiKey = Deno.env.get("FINNHUB_API_KEY");
    if (!finnhubApiKey) {
      console.log("No Finnhub API key found, using mock data");
      const mockPrices = generateMockHistoricalData(symbol, from, to);
      return c.json({ prices: mockPrices });
    }

    // Fetch from Finnhub
    const finnhubUrl = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${finnhubApiKey}`;
    
    const response = await fetch(finnhubUrl);
    const data = await response.json();
    
    if (data.s === 'ok' && data.c && data.c.length > 0) {
      // Convert Finnhub format to our format
      const prices = data.c.map((close: number, index: number) => ({
        date: new Date(data.t[index] * 1000).toISOString().split('T')[0],
        open: data.o[index],
        high: data.h[index],
        low: data.l[index],
        close: close,
        volume: data.v[index]
      }));
      
      return c.json({ prices });
    } else {
      // Fallback to mock data if API fails
      console.log(`Finnhub API returned no data for ${symbol}, using mock data`);
      const mockPrices = generateMockHistoricalData(symbol, from, to);
      return c.json({ prices: mockPrices });
    }
    
  } catch (error) {
    console.error("Error fetching historical prices:", error);
    // Return mock data on error
    try {
      const body = await c.req.json();
      const { symbol, from, to } = body;
      const mockPrices = generateMockHistoricalData(symbol, from, to);
      return c.json({ prices: mockPrices });
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return c.json({ error: "Invalid request body" }, 400);
    }
  }
});

// Cache historical prices in database
app.post("/make-server-fe0a490e/cache-historical-prices", async (c) => {
  try {
    const { symbol, prices } = await c.req.json();
    
    if (!symbol || !Array.isArray(prices)) {
      return c.json({ error: "Invalid parameters" }, 400);
    }

    // Store in KV store with expiration (cache for 1 hour)
    const cacheKey = `historical_${symbol}_${new Date().toISOString().split('T')[0]}`;
    await kv.set(cacheKey, { symbol, prices, cachedAt: new Date().toISOString() });
    
    return c.json({ message: "Prices cached successfully" });
  } catch (error) {
    console.error("Error caching historical prices:", error);
    return c.json({ error: "Failed to cache prices" }, 500);
  }
});

// Get cached historical prices from database
app.post("/make-server-fe0a490e/get-cached-prices", async (c) => {
  try {
    const { symbol, fromDate, toDate } = await c.req.json();
    
    if (!symbol || !fromDate || !toDate) {
      return c.json({ error: "Missing required parameters" }, 400);
    }

    // Try to get from cache
    const cacheKey = `historical_${symbol}_${fromDate}`;
    const cached = await kv.get(cacheKey);
    
    if (cached && cached.prices) {
      // Check if cache is still fresh (less than 1 hour old)
      const cacheAge = new Date().getTime() - new Date(cached.cachedAt).getTime();
      const oneHour = 60 * 60 * 1000;
      
      if (cacheAge < oneHour) {
        return c.json({ prices: cached.prices });
      }
    }
    
    return c.json({ prices: [] });
  } catch (error) {
    console.error("Error getting cached prices:", error);
    return c.json({ prices: [] });
  }
});

// Helper function to generate mock historical data
function generateMockHistoricalData(symbol: string, fromTimestamp: number, toTimestamp: number) {
  const prices = [];
  let basePrice = 100 + Math.random() * 200; // Random base price between 100-300
  
  const fromDate = new Date(fromTimestamp * 1000);
  const toDate = new Date(toTimestamp * 1000);
  const daysDiff = Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
  
  for (let i = 0; i <= daysDiff; i++) {
    const currentDate = new Date(fromDate);
    currentDate.setDate(fromDate.getDate() + i);
    
    // Generate realistic price movement
    const change = (Math.random() - 0.5) * 0.08; // ±4% max daily change
    basePrice = Math.max(basePrice * (1 + change), 1); // Don't go below $1
    
    const high = basePrice * (1 + Math.random() * 0.03);
    const low = basePrice * (1 - Math.random() * 0.03);
    const open = low + Math.random() * (high - low);
    const close = low + Math.random() * (high - low);
    
    prices.push({
      date: currentDate.toISOString().split('T')[0],
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Math.floor(Math.random() * 10000000) + 1000000
    });
    
    basePrice = close; // Use close as next day's base
  }
  
  return prices;
}

// Initialize database with sample data
app.post("/make-server-fe0a490e/admin/init", async (c) => {
  try {
    // Sample stock data to populate the database
    const sampleStocks: StockService.StockData[] = [
      {
        symbol: 'AAPL',
        company: 'Apple Inc.',
        currentPrice: 175.43,
        priceChange: 2.17,
        priceChangePercent: 1.25,
        sector: 'Technology',
        marketCap: '$2.7T',
        volume: 45234567,
        avgVolume: 52000000,
        peRatio: 28.7,
        week52High: 199.62,
        week52Low: 124.17,
        marketCapValue: 2700000000000,
        dividendYield: 0.52,
        beta: 1.24,
        eps: 6.11,
        lastUpdated: new Date().toISOString()
      },
      {
        symbol: 'MSFT',
        company: 'Microsoft Corporation',
        currentPrice: 378.85,
        priceChange: -1.23,
        priceChangePercent: -0.32,
        sector: 'Technology',
        marketCap: '$2.8T',
        volume: 23456789,
        avgVolume: 25000000,
        peRatio: 32.4,
        week52High: 384.30,
        week52Low: 309.45,
        marketCapValue: 2800000000000,
        dividendYield: 0.68,
        beta: 0.89,
        eps: 11.68,
        lastUpdated: new Date().toISOString()
      },
      {
        symbol: 'GOOGL',
        company: 'Alphabet Inc.',
        currentPrice: 138.21,
        priceChange: 0.87,
        priceChangePercent: 0.63,
        sector: 'Technology',
        marketCap: '$1.7T',
        volume: 34567890,
        avgVolume: 30000000,
        peRatio: 25.8,
        week52High: 151.55,
        week52Low: 123.47,
        marketCapValue: 1700000000000,
        dividendYield: 0.0,
        beta: 1.06,
        eps: 5.35,
        lastUpdated: new Date().toISOString()
      },
      {
        symbol: 'AMZN',
        company: 'Amazon.com Inc.',
        currentPrice: 155.89,
        priceChange: 3.45,
        priceChangePercent: 2.26,
        sector: 'Technology',
        marketCap: '$1.6T',
        volume: 41234567,
        avgVolume: 35000000,
        peRatio: 47.2,
        week52High: 170.00,
        week52Low: 118.35,
        marketCapValue: 1600000000000,
        dividendYield: 0.0,
        beta: 1.33,
        eps: 3.30,
        lastUpdated: new Date().toISOString()
      },
      {
        symbol: 'NVDA',
        company: 'NVIDIA Corporation',
        currentPrice: 875.28,
        priceChange: 15.67,
        priceChangePercent: 1.82,
        sector: 'Technology',
        marketCap: '$2.2T',
        volume: 67890123,
        avgVolume: 45000000,
        peRatio: 65.4,
        week52High: 974.00,
        week52Low: 200.26,
        marketCapValue: 2200000000000,
        dividendYield: 0.03,
        beta: 1.68,
        eps: 13.38,
        lastUpdated: new Date().toISOString()
      }
    ];
    
    const success = await StockService.bulkUpsertStocks(sampleStocks);
    
    if (success) {
      return c.json({ message: `Database initialized with ${sampleStocks.length} sample stocks` });
    } else {
      return c.json({ error: "Failed to initialize database" }, 500);
    }
  } catch (error) {
    console.error("Error initializing database:", error);
    return c.json({ error: "Failed to initialize database" }, 500);
  }
});

// Chat endpoint for Catalyst Copilot
app.post("/make-server-fe0a490e/chat", async (c) => {
  try {
    const { message, conversationHistory, selectedTickers } = await c.req.json();
    
    if (!message) {
      return c.json({ error: "Message is required" }, 400);
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      console.error("OPENAI_API_KEY not found in environment");
      return c.json({ error: "OpenAI API key not configured. Please add your API key in the settings." }, 500);
    }

    console.log("Processing chat message:", message);
    console.log("Selected tickers:", selectedTickers);

    // Fetch relevant data from database based on the question
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    let dataContext = "";
    
    if (supabaseUrl && supabaseServiceKey) {
      // Detect stock ticker mentions in the question
      const tickerMatches = message.match(/\b([A-Z]{2,5})\b/g) || [];
      const mentionedTickers = [...new Set(tickerMatches)]; // Remove duplicates
      
      // Detect query type
      const isHistoricalQuery = /yesterday|last\s+(day|week|month)|previous|past|historic/i.test(message);
      const isEventQuery = /event|earnings|FDA|approval|launch|announcement|coming up|upcoming/i.test(message);
      const isPriceQuery = /price|trade|trading|open|close|high|low|volume/i.test(message);
      
      // Fetch data for mentioned tickers
      for (const ticker of mentionedTickers) {
        try {
          // Always fetch current quote
          const quoteResponse = await fetch(
            `${supabaseUrl}/rest/v1/stock_quote_now?symbol=eq.${ticker}`,
            {
              headers: {
                "apikey": supabaseServiceKey,
                "Authorization": `Bearer ${supabaseServiceKey}`
              }
            }
          );
          
          if (quoteResponse.ok) {
            const quoteData = await quoteResponse.json();
            if (quoteData && quoteData.length > 0) {
              const quote = quoteData[0];
              dataContext += `\n\n${ticker} Current Data:
- Current Price: $${quote.close?.toFixed(2) || 'N/A'}
- Volume: ${quote.volume?.toLocaleString() || 'N/A'}
- Last Updated: ${quote.timestamp_et || quote.timestamp}`;
            }
          }
          
          // Fetch daily prices if historical query
          if (isHistoricalQuery || isPriceQuery) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayDate = yesterday.toISOString().split('T')[0];
            
            // Get last 5 trading days
            const fiveDaysAgo = new Date();
            fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 7);
            const fiveDaysAgoDate = fiveDaysAgo.toISOString().split('T')[0];
            
            const dailyResponse = await fetch(
              `${supabaseUrl}/rest/v1/daily_prices?symbol=eq.${ticker}&date=gte.${fiveDaysAgoDate}&order=date.desc&limit=5`,
              {
                headers: {
                  "apikey": supabaseServiceKey,
                  "Authorization": `Bearer ${supabaseServiceKey}`
                }
              }
            );
            
            if (dailyResponse.ok) {
              const dailyData = await dailyResponse.json();
              if (dailyData && dailyData.length > 0) {
                const yesterdayData = dailyData[0]; // Most recent day
                dataContext += `\n\n${ticker} Daily Price Data (${yesterdayData.date || yesterdayData.date_et}):
- Open: $${yesterdayData.open?.toFixed(2)}
- Close: $${yesterdayData.close?.toFixed(2)}
- High: $${yesterdayData.high?.toFixed(2)}
- Low: $${yesterdayData.low?.toFixed(2)}
- Volume: ${yesterdayData.volume?.toLocaleString()}
- Price Change: $${(yesterdayData.close - yesterdayData.open).toFixed(2)} (${(((yesterdayData.close - yesterdayData.open) / yesterdayData.open) * 100).toFixed(2)}%)`;
                
                if (dailyData.length > 1) {
                  dataContext += `\n\nRecent 5-day trend:`;
                  dailyData.forEach((day, idx) => {
                    if (idx < 5) {
                      const change = ((day.close - day.open) / day.open) * 100;
                      dataContext += `\n- ${day.date || day.date_et}: $${day.close.toFixed(2)} (${change >= 0 ? '+' : ''}${change.toFixed(2)}%)`;
                    }
                  });
                }
              }
            }
          }
          
          // Fetch events for mentioned ticker
          if (isEventQuery || mentionedTickers.length > 0) {
            // Determine if user is asking about upcoming or past events
            const isUpcomingQuery = /coming up|upcoming|next|future|will|2026|2027/i.test(message);
            const today = new Date().toISOString();
            
            let eventsUrl = `${supabaseUrl}/rest/v1/event_data?ticker=eq.${ticker}`;
            if (isUpcomingQuery) {
              // Get upcoming events
              eventsUrl += `&actualDateTime_et=gte.${today}&order=actualDateTime_et.asc&limit=10`;
            } else {
              // Get recent/past events
              eventsUrl += `&order=actualDateTime_et.desc&limit=5`;
            }
            
            const eventsResponse = await fetch(eventsUrl, {
              headers: {
                "apikey": supabaseServiceKey,
                "Authorization": `Bearer ${supabaseServiceKey}`
              }
            });
            
            if (eventsResponse.ok) {
              const eventsData = await eventsResponse.json();
              if (eventsData && eventsData.length > 0) {
                dataContext += `\n\n${ticker} ${isUpcomingQuery ? 'Upcoming' : 'Recent'} Events:`;
                eventsData.forEach(event => {
                  const eventDate = event.actualDateTime_et || event.actualDateTime;
                  dataContext += `\n- ${event.type}: ${event.title} (${eventDate ? new Date(eventDate).toLocaleDateString() : 'Date TBD'})`;
                  if (event.aiInsight) {
                    dataContext += `\n  Impact: ${event.aiInsight}`;
                  }
                });
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching data for ${ticker}:`, error);
        }
      }
      
      // Also fetch events for user's selected/focus stocks if asking about events
      if (isEventQuery && selectedTickers && selectedTickers.length > 0) {
        const isUpcomingQuery = /coming up|upcoming|next|future|will|2026|2027/i.test(message);
        const today = new Date().toISOString();
        
        for (const ticker of selectedTickers) {
          // Skip if already processed above
          if (mentionedTickers.includes(ticker)) continue;
          
          try {
            let eventsUrl = `${supabaseUrl}/rest/v1/event_data?ticker=eq.${ticker}`;
            if (isUpcomingQuery) {
              eventsUrl += `&actualDateTime_et=gte.${today}&order=actualDateTime_et.asc&limit=10`;
            } else {
              eventsUrl += `&order=actualDateTime_et.desc&limit=5`;
            }
            
            const eventsResponse = await fetch(eventsUrl, {
              headers: {
                "apikey": supabaseServiceKey,
                "Authorization": `Bearer ${supabaseServiceKey}`
              }
            });
            
            if (eventsResponse.ok) {
              const eventsData = await eventsResponse.json();
              if (eventsData && eventsData.length > 0) {
                dataContext += `\n\n${ticker} ${isUpcomingQuery ? 'Upcoming' : 'Recent'} Events:`;
                eventsData.forEach(event => {
                  const eventDate = event.actualDateTime_et || event.actualDateTime;
                  dataContext += `\n- ${event.type}: ${event.title} (${eventDate ? new Date(eventDate).toLocaleDateString() : 'Date TBD'})`;
                  if (event.aiInsight) {
                    dataContext += `\n  Impact: ${event.aiInsight}`;
                  }
                });
              }
            }
          } catch (error) {
            console.error(`Error fetching events for watchlist ticker ${ticker}:`, error);
          }
        }
      }
    }

    // Build context about user's stocks
    let stockContext = "";
    if (selectedTickers && selectedTickers.length > 0) {
      stockContext = `\n\nThe user is currently watching these stocks: ${selectedTickers.join(", ")}.`;
    }

    // Fetch additional context from MongoDB (user's portfolio, alerts, research notes, etc.)
    const ENABLE_MONGODB = Deno.env.get("ENABLE_MONGODB") !== "false"; // Default to enabled
    
    let mongoDataAvailable = false;
    if (ENABLE_MONGODB && Deno.env.get("MONGODB_URI")) {
      try {
        console.log("Querying MongoDB for context...");
        const mongoData = await queryMongoForContext(message, selectedTickers || []);
        
        if (mongoData) {
          mongoContext = mongoData;
          mongoDataAvailable = true;
          console.log("✅ MongoDB context fetched successfully");
          console.log(`MongoDB returned ${mongoData.length} characters of context`);
        } else {
          console.log("MongoDB query returned no data");
        }
      } catch (error) {
        console.error("❌ MongoDB query error:", error);
        mongoDataAvailable = false;
        // Add explicit note that MongoDB is unavailable
        mongoContext = "\n\nIMPORTANT: MongoDB connection failed. You DO NOT have access to:\n- Portfolio holdings and positions\n- Trading history\n- Custom alerts and notifications\n- Research notes and analysis\n- Institutional holdings data\n- Any user personal data\n\nIf the user asks about any of these topics, politely inform them that this data is temporarily unavailable due to a connection issue. DO NOT make up or estimate any data.";
      }
    } else {
      console.log("MongoDB disabled or not configured - skipping");
    }

    // Build conversation messages for OpenAI
    const messages = [
      {
        role: "system",
        content: `You are Catalyst Copilot, an AI assistant for a mobile investor app called Catalyst. You help users understand their stocks, market events, and make informed investment decisions.

You have access to real-time stock data from Supabase including:
- Current prices and price changes (stock_quote_now table)
- Intraday price data (intraday_prices table)
- Historical daily prices (daily_prices table)
- Market events like earnings, FDA approvals, product launches (event_data table)
- Company information (company_information table)

${mongoDataAvailable ? `You also have access to user's personal data from MongoDB including:
- Portfolio holdings and positions
- Trading history
- Custom alerts and notifications
- Research notes and analysis
- Performance analytics
- Institutional holdings data` : ''}

When answering questions:
1. Be concise and data-driven - USE THE ACTUAL DATA PROVIDED
2. Use bullish/bearish terminology
3. Reference specific price movements and percentages FROM THE DATA
4. Mention relevant upcoming events FROM THE DATA
5. Use a professional but approachable tone
6. NEVER use placeholder text like $XYZ or % XYZ - always use the real numbers provided
7. When discussing user's portfolio or personal data, reference it from MongoDB data provided
8. If you don't have access to specific data, EXPLICITLY STATE that the data is unavailable - NEVER make up numbers or facts
9. Do NOT include "Source:" labels or lists of sources at the end of your response.
10. Do NOT use inline citations like [1], [Source], or (Source).

${stockContext}${dataContext}${mongoContext}`
      },
      ...(conversationHistory || []),
      {
        role: "user",
        content: message
      }
    ];

    console.log("Calling OpenAI API with", messages.length, "messages");

    // Call OpenAI API
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 1000  // Increased to allow for longer, more detailed responses
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error(`OpenAI API error: ${openaiResponse.status} ${openaiResponse.statusText} - ${errorText}`);
      return c.json({ 
        error: `Failed to get AI response: ${openaiResponse.status} ${openaiResponse.statusText}`,
        details: errorText 
      }, 500);
    }

    const openaiData = await openaiResponse.json();
    console.log("OpenAI response received");
    const aiResponse = openaiData.choices[0]?.message?.content || "I'm not sure how to respond to that.";

    // Check if we should generate data cards based on the question
    const dataCards = [];
    const eventData = {}; // Store event data by ID for inline rendering
    
    // Detect if user is asking about events
    const isEventQuery = /event|earnings|FDA|approval|launch|announcement|coming up|upcoming/i.test(message);
    
    // Detect if user is asking about biggest movers / watchlist movers
    const isBiggestMoversQuery = /biggest\s+mover|top\s+mover|movers\s+in.*watchlist|watchlist.*mover/i.test(message);
    
    if (isBiggestMoversQuery && selectedTickers && selectedTickers.length > 0) {
      // Fetch stock data for all tickers in watchlist
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      
      if (supabaseUrl && supabaseServiceKey) {
        try {
          const stockDataPromises = selectedTickers.map(async (ticker) => {
            try {
              // Fetch from finnhub_quote_snapshots for latest snapshot with change data
              const quoteResponse = await fetch(
                `${supabaseUrl}/rest/v1/finnhub_quote_snapshots?symbol=eq.${ticker}&order=timestamp.desc&limit=1`,
                {
                  headers: {
                    "apikey": supabaseServiceKey,
                    "Authorization": `Bearer ${supabaseServiceKey}`
                  }
                }
              );
              
              if (quoteResponse.ok) {
                const quoteData = await quoteResponse.json();
                if (quoteData && quoteData.length > 0) {
                  return quoteData[0];
                }
              }
            } catch (error) {
              console.error(`Error fetching data for ${ticker}:`, error);
            }
            return null;
          });
          
          const stocksData = (await Promise.all(stockDataPromises)).filter(s => s !== null);
          
          // Sort by absolute change percent to get biggest movers
          stocksData.sort((a, b) => Math.abs(b.change_percent || 0) - Math.abs(a.change_percent || 0));
          
          // Take top 3-5 movers
          const topMovers = stocksData.slice(0, Math.min(5, stocksData.length));
          
          // Fetch company names from company_information table
          const companyDataPromises = topMovers.map(async (quote) => {
            try {
              const companyResponse = await fetch(
                `${supabaseUrl}/rest/v1/company_information?symbol=eq.${quote.symbol}&limit=1`,
                {
                  headers: {
                    "apikey": supabaseServiceKey,
                    "Authorization": `Bearer ${supabaseServiceKey}`
                  }
                }
              );
              
              if (companyResponse.ok) {
                const companyData = await companyResponse.json();
                if (companyData && companyData.length > 0) {
                  return { symbol: quote.symbol, name: companyData[0].name };
                }
              }
            } catch (error) {
              console.error(`Error fetching company name for ${quote.symbol}:`, error);
            }
            return { symbol: quote.symbol, name: quote.symbol };
          });
          
          const companyNames = await Promise.all(companyDataPromises);
          const companyNameMap = Object.fromEntries(companyNames.map(c => [c.symbol, c.name]));
          
          // Generate data cards for top movers
          for (const quote of topMovers) {
            dataCards.push({
              type: "stock",
              data: {
                ticker: quote.symbol,
                company: companyNameMap[quote.symbol] || quote.symbol,
                price: quote.close,
                change: quote.change,
                changePercent: quote.change_percent,
                chartData: [] // No chart for watchlist cards to keep it fast
              }
            });
          }
        } catch (error) {
          console.error("Error fetching watchlist movers:", error);
        }
      }
    } else {
      // If asking about a specific stock (TSLA, AAPL, etc), generate a stock card
      const stockMention = message.match(/\b([A-Z]{2,5})\b/);
      if (stockMention) {
        const ticker = stockMention[1];
        
        // Fetch real stock data from Supabase
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        
        if (supabaseUrl && supabaseServiceKey) {
          try {
            // Fetch current price from finnhub_quote_snapshots
            const quoteResponse = await fetch(
              `${supabaseUrl}/rest/v1/finnhub_quote_snapshots?symbol=eq.${ticker}&order=timestamp.desc&limit=1`,
              {
                headers: {
                  "apikey": supabaseServiceKey,
                  "Authorization": `Bearer ${supabaseServiceKey}`
                }
              }
            );
            
            if (quoteResponse.ok) {
              const quoteData = await quoteResponse.json();
              if (quoteData && quoteData.length > 0) {
                const quote = quoteData[0];
                
                // Fetch company name
                let companyName = ticker;
                try {
                  const companyResponse = await fetch(
                    `${supabaseUrl}/rest/v1/company_information?symbol=eq.${ticker}&limit=1`,
                    {
                      headers: {
                        "apikey": supabaseServiceKey,
                        "Authorization": `Bearer ${supabaseServiceKey}`
                      }
                    }
                  );
                  
                  if (companyResponse.ok) {
                    const companyData = await companyResponse.json();
                    if (companyData && companyData.length > 0) {
                      companyName = companyData[0].name;
                    }
                  }
                } catch (error) {
                  console.error(`Error fetching company name for ${ticker}:`, error);
                }
                
                // Fetch intraday data for mini chart
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayISO = today.toISOString();
                
                const intradayResponse = await fetch(
                  `${supabaseUrl}/rest/v1/intraday_prices?symbol=eq.${ticker}&timestamp=gte.${todayISO}&order=timestamp.asc&limit=100`,
                  {
                    headers: {
                      "apikey": supabaseServiceKey,
                      "Authorization": `Bearer ${supabaseServiceKey}`
                    }
                  }
                );
                
                let chartData = [];
                if (intradayResponse.ok) {
                  const intradayData = await intradayResponse.json();
                  chartData = intradayData.map((d: any) => ({
                    timestamp: d.timestamp,
                    price: d.price
                  }));
                }
                
                dataCards.push({
                  type: "stock",
                  data: {
                    ticker: quote.symbol,
                    company: companyName,
                    price: quote.close,
                    change: quote.change,
                    changePercent: quote.change_percent,
                    chartData
                  }
                });
              }
            }
          } catch (error) {
            console.error("Error fetching stock data:", error);
          }
        }
      }
    }
    
    // Generate event cards if user is asking about upcoming events
    if (isEventQuery && supabaseUrl && supabaseServiceKey) {
      const isUpcomingQuery = /coming up|upcoming|next|future|will|2026|2027/i.test(message);
      const today = new Date().toISOString();
      
      // Detect specific event types from the user's query
      const eventTypeKeywords: Record<string, string[]> = {
        'product': ['product', 'launch'],
        'earnings': ['earnings', 'earning'],
        'fda': ['fda', 'approval', 'drug'],
        'merger': ['merger', 'acquisition', 'M&A'],
        'conference': ['conference', 'summit'],
        'investor_day': ['investor day', 'analyst day'],
        'partnership': ['partnership', 'partner', 'collaboration'],
        'regulatory': ['regulatory', 'regulation'],
        'guidance_update': ['guidance'],
        'capital_markets': ['capital', 'offering', 'IPO'],
        'legal': ['legal', 'lawsuit'],
        'commerce_event': ['commerce', 'retail'],
        'corporate': ['corporate'],
        'pricing': ['pricing', 'price change'],
        'defense_contract': ['defense', 'contract']
      };
      
      // Find which event types the user is asking about
      const requestedEventTypes: string[] = [];
      const lowerMessage = message.toLowerCase();
      
      for (const [eventType, keywords] of Object.entries(eventTypeKeywords)) {
        for (const keyword of keywords) {
          if (lowerMessage.includes(keyword)) {
            requestedEventTypes.push(eventType);
            break; // Only add each event type once
          }
        }
      }
      
      console.log('Detected event types from query:', requestedEventTypes);
      
      // Get tickers to fetch events for (mentioned tickers or selected tickers)
      const tickersForEvents = message.match(/\b([A-Z]{2,5})\b/g) || selectedTickers || [];
      const uniqueTickers = [...new Set(tickersForEvents)];
      
      try {
        const eventPromises = uniqueTickers.map(async (ticker) => {
          try {
            let eventsUrl = `${supabaseUrl}/rest/v1/event_data?ticker=eq.${ticker}`;
            
            // Add event type filtering if specific types were requested
            if (requestedEventTypes.length > 0) {
              // Use Supabase's 'in' operator to filter by multiple event types
              const typesFilter = requestedEventTypes.join(',');
              eventsUrl += `&type=in.(${typesFilter})`;
            }
            
            if (isUpcomingQuery) {
              eventsUrl += `&actualDateTime_et=gte.${today}&order=actualDateTime_et.asc&limit=5`;
            } else {
              eventsUrl += `&order=actualDateTime_et.desc&limit=5`;
            }
            
            const eventsResponse = await fetch(eventsUrl, {
              headers: {
                "apikey": supabaseServiceKey,
                "Authorization": `Bearer ${supabaseServiceKey}`
              }
            });
            
            if (eventsResponse.ok) {
              const eventsData = await eventsResponse.json();
              return eventsData || [];
            }
          } catch (error) {
            console.error(`Error fetching events for ${ticker}:`, error);
          }
          return [];
        });
        
        const allEventsArrays = await Promise.all(eventPromises);
        const allEvents = allEventsArrays.flat();
        
        // Sort events by date and take first 5
        allEvents.sort((a, b) => {
          const dateA = new Date(a.actualDateTime_et || a.actualDateTime || 0);
          const dateB = new Date(b.actualDateTime_et || b.actualDateTime || 0);
          return isUpcomingQuery ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
        });
        
        const topEvents = allEvents.slice(0, 5);
        
        // Generate event cards
        for (const event of topEvents) {
          const eventId = event.id || `${event.ticker}_${event.type}_${event.actualDateTime_et || event.actualDateTime}`;
          eventData[eventId] = {
            id: event.id || eventId,  // Use actual database ID if available
            ticker: event.ticker,
            title: event.title,
            type: event.type,
            datetime: event.actualDateTime_et || event.actualDateTime,
            aiInsight: event.aiInsight,
            impact: event.impact
          };
          
          dataCards.push({
            type: "event",
            data: eventData[eventId]
          });
        }
      } catch (error) {
        console.error("Error generating event cards:", error);
      }
    }

    return c.json({
      response: aiResponse,
      dataCards,
      eventData  // Send event data for inline rendering
    });
  } catch (error) {
    console.error("Error in chat endpoint:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// ============================================================================
// PLAID INTEGRATION ENDPOINTS
// ============================================================================

// Create a link token for Plaid Link initialization
app.post("/make-server-fe0a490e/plaid/create-link-token", async (c) => {
  try {
    const { userId } = await c.req.json();
    
    const plaidClientId = Deno.env.get("PLAID_CLIENT_ID");
    const plaidSecret = Deno.env.get("PLAID_SANDBOX_KEY") || Deno.env.get("PLAID_SECRET");
    const plaidEnv = Deno.env.get("PLAID_ENV") || "sandbox"; // sandbox, development, or production
    
    if (!plaidClientId || !plaidSecret) {
      console.error("Missing Plaid credentials. Please set PLAID_CLIENT_ID and PLAID_SANDBOX_KEY environment variables.");
      return c.json({ 
        error: "Plaid integration not configured. Please contact support." 
      }, 500);
    }

    // Call Plaid API to create a link token
    const plaidUrl = plaidEnv === "production" 
      ? "https://production.plaid.com"
      : plaidEnv === "development"
      ? "https://development.plaid.com"
      : "https://sandbox.plaid.com";

    const response = await fetch(`${plaidUrl}/link/token/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PLAID-CLIENT-ID": plaidClientId,
        "PLAID-SECRET": plaidSecret,
      },
      body: JSON.stringify({
        user: {
          client_user_id: userId || `user_${Date.now()}`,
        },
        client_name: "Catalyst",
        products: ["investments"],
        country_codes: ["US"],
        language: "en",
        account_filters: {
          investment: {
            account_subtypes: ["401k", "403B", "457b", "529", "brokerage", "cash isa", "education savings account", "fixed annuity", "gic", "health reimbursement arrangement", "hsa", "ira", "isa", "keogh", "lif", "life insurance", "lira", "lrif", "lrsp", "mutual fund", "non-taxable brokerage account", "other", "other annuity", "other insurance", "pension", "prif", "profit sharing plan", "rdsp", "resp", "retirement", "rlif", "roth", "roth 401k", "rrif", "rrsp", "sarsep", "sep ira", "simple ira", "sipp", "stock plan", "tfsa", "trust", "ugma", "utma", "variable annuity"],
          },
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Plaid link token creation failed:", response.status, errorData);
      return c.json({ 
        error: "Failed to create link token",
        details: errorData 
      }, response.status);
    }

    const data = await response.json();
    console.log("✅ Plaid link token created successfully");
    
    return c.json({ 
      link_token: data.link_token,
      expiration: data.expiration 
    });
  } catch (error) {
    console.error("Error creating Plaid link token:", error);
    return c.json({ 
      error: "Failed to create link token",
      message: error.message 
    }, 500);
  }
});

// Exchange public token for access token
app.post("/make-server-fe0a490e/plaid/exchange-public-token", async (c) => {
  try {
    const { publicToken, userId, institutionName } = await c.req.json();
    
    if (!publicToken) {
      return c.json({ error: "Public token is required" }, 400);
    }
    
    const plaidClientId = Deno.env.get("PLAID_CLIENT_ID");
    const plaidSecret = Deno.env.get("PLAID_SANDBOX_KEY") || Deno.env.get("PLAID_SECRET");
    const plaidEnv = Deno.env.get("PLAID_ENV") || "sandbox";
    
    if (!plaidClientId || !plaidSecret) {
      return c.json({ 
        error: "Plaid integration not configured" 
      }, 500);
    }

    const plaidUrl = plaidEnv === "production" 
      ? "https://production.plaid.com"
      : plaidEnv === "development"
      ? "https://development.plaid.com"
      : "https://sandbox.plaid.com";

    // Exchange public token for access token
    const response = await fetch(`${plaidUrl}/item/public_token/exchange`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PLAID-CLIENT-ID": plaidClientId,
        "PLAID-SECRET": plaidSecret,
      },
      body: JSON.stringify({
        public_token: publicToken,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Plaid public token exchange failed:", response.status, errorData);
      return c.json({ 
        error: "Failed to exchange public token",
        details: errorData 
      }, response.status);
    }

    const data = await response.json();
    const { access_token, item_id } = data;
    
    console.log("✅ Plaid access token obtained:", item_id);

    // Store access token securely in KV store
    const connectionId = `plaid_${userId}_${item_id}_${Date.now()}`;
    await kv.set(connectionId, {
      accessToken: access_token,
      itemId: item_id,
      userId: userId || "default",
      institutionName: institutionName || "Unknown",
      connectedAt: new Date().toISOString(),
    });

    console.log("✅ Plaid connection stored in KV:", connectionId);
    
    return c.json({ 
      connectionId,
      itemId: item_id,
      success: true 
    });
  } catch (error) {
    console.error("Error exchanging Plaid public token:", error);
    return c.json({ 
      error: "Failed to exchange public token",
      message: error.message 
    }, 500);
  }
});

// Get investment holdings for a connection
app.post("/make-server-fe0a490e/plaid/get-holdings", async (c) => {
  try {
    const { connectionId } = await c.req.json();
    
    if (!connectionId) {
      return c.json({ error: "Connection ID is required" }, 400);
    }
    
    const plaidClientId = Deno.env.get("PLAID_CLIENT_ID");
    const plaidSecret = Deno.env.get("PLAID_SANDBOX_KEY") || Deno.env.get("PLAID_SECRET");
    const plaidEnv = Deno.env.get("PLAID_ENV") || "sandbox";
    
    if (!plaidClientId || !plaidSecret) {
      return c.json({ 
        error: "Plaid integration not configured" 
      }, 500);
    }

    // Retrieve access token from KV store
    const connectionData = await kv.get(connectionId);
    
    if (!connectionData) {
      return c.json({ error: "Connection not found" }, 404);
    }

    const { accessToken, institutionName } = connectionData;

    const plaidUrl = plaidEnv === "production" 
      ? "https://production.plaid.com"
      : plaidEnv === "development"
      ? "https://development.plaid.com"
      : "https://sandbox.plaid.com";

    // Fetch investment holdings
    const response = await fetch(`${plaidUrl}/investments/holdings/get`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PLAID-CLIENT-ID": plaidClientId,
        "PLAID-SECRET": plaidSecret,
      },
      body: JSON.stringify({
        access_token: accessToken,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Plaid holdings fetch failed:", response.status, errorData);
      return c.json({ 
        error: "Failed to fetch holdings",
        details: errorData 
      }, response.status);
    }

    const data = await response.json();
    console.log("✅ Plaid holdings fetched successfully");

    // Extract unique tickers from holdings
    const holdings = data.holdings || [];
    const securities = data.securities || [];
    
    // Create a map of security_id to ticker symbol
    const securityMap = new Map();
    securities.forEach((security: any) => {
      if (security.ticker_symbol) {
        securityMap.set(security.security_id, security.ticker_symbol);
      }
    });

    // Extract unique tickers
    const tickers = new Set<string>();
    holdings.forEach((holding: any) => {
      const ticker = securityMap.get(holding.security_id);
      if (ticker) {
        tickers.add(ticker);
      }
    });

    // Map sandbox test tickers to recognizable alternatives for better UX
    const tickerMapping: { [key: string]: string } = {
      'ACHN': 'AAPL',
      'DBLTX': 'TSLA',
      'NFLX180201C00355000': 'NVDA',
      'BTC': 'MSFT',
      'EWZ': 'AMZN',
      'MIPTX': 'GOOGL',
      'NHX105509': 'META',
      'CAMYX': 'AMD',
      'SBSI': 'NFLX'
    };

    // Replace test tickers with recognizable ones in sandbox mode
    const finalTickers = Array.from(tickers).map(ticker => {
      if (plaidEnv === 'sandbox' && tickerMapping[ticker]) {
        return tickerMapping[ticker];
      }
      return ticker;
    });

    // Get account information
    const accounts = data.accounts || [];
    const accountInfo = accounts.map((account: any) => ({
      accountId: account.account_id,
      name: account.name,
      officialName: account.official_name,
      type: account.type,
      subtype: account.subtype,
      mask: account.mask,
    }));

    return c.json({ 
      holdings: finalTickers,
      accountInfo: {
        institution: institutionName,
        accounts: accountInfo,
        accountType: accountInfo[0]?.subtype || "Investment Account",
        lastUpdated: new Date().toISOString(),
      },
      rawHoldings: holdings,
      securities: securities,
    });
  } catch (error) {
    console.error("Error fetching Plaid holdings:", error);
    return c.json({ 
      error: "Failed to fetch holdings",
      message: error.message 
    }, 500);
  }
});

// Create a custom sandbox account with pre-configured holdings
// This uses Plaid's /sandbox/public_token/create endpoint to bypass Link
app.post("/make-server-fe0a490e/plaid/create-sandbox-account", async (c) => {
  try {
    const { userId, institutionId, holdings } = await c.req.json();
    
    const plaidClientId = Deno.env.get("PLAID_CLIENT_ID");
    const plaidSecret = Deno.env.get("PLAID_SANDBOX_KEY") || Deno.env.get("PLAID_SECRET");
    
    if (!plaidClientId || !plaidSecret) {
      return c.json({ 
        error: "Plaid integration not configured" 
      }, 500);
    }

    // Default to Robinhood (ins_115616) if not specified
    const institution = institutionId || "ins_115616"; // Robinhood
    
    // Default holdings if not specified - a diverse portfolio
    const defaultHoldings = holdings || [
      { ticker: "AAPL", quantity: 50, price: 175.43 },
      { ticker: "TSLA", quantity: 25, price: 242.84 },
      { ticker: "NVDA", quantity: 30, price: 875.28 },
      { ticker: "MSFT", quantity: 40, price: 378.85 },
      { ticker: "AMZN", quantity: 35, price: 155.89 },
      { ticker: "GOOGL", quantity: 45, price: 138.21 },
      { ticker: "META", quantity: 20, price: 484.03 },
      { ticker: "AMD", quantity: 60, price: 142.56 },
      { ticker: "PLTR", quantity: 100, price: 28.45 },
      { ticker: "COIN", quantity: 15, price: 245.67 }
    ];

    console.log(`Creating custom sandbox account for institution: ${institution}`);
    console.log(`Holdings:`, defaultHoldings);

    // Create override options for custom holdings
    const override_accounts = [{
      type: "investment",
      subtype: "brokerage",
      balances: {
        available: null,
        current: defaultHoldings.reduce((sum, h) => sum + (h.quantity * h.price), 0),
        limit: null,
        iso_currency_code: "USD",
        unofficial_currency_code: null
      },
      holdings: defaultHoldings.map(h => ({
        security: {
          ticker_symbol: h.ticker,
          name: h.ticker, // Plaid will fill in the real name
          type: "equity",
          close_price: h.price,
          iso_currency_code: "USD"
        },
        quantity: h.quantity,
        institution_price: h.price,
        institution_value: h.quantity * h.price,
        cost_basis: null
      }))
    }];

    // Call Plaid's sandbox public_token/create endpoint
    const response = await fetch("https://sandbox.plaid.com/sandbox/public_token/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PLAID-CLIENT-ID": plaidClientId,
        "PLAID-SECRET": plaidSecret,
      },
      body: JSON.stringify({
        institution_id: institution,
        initial_products: ["investments"],
        options: {
          override_username: `catalyst_${userId || Date.now()}`,
          override_password: "pass_good",
        },
        user_token: null,
        override_accounts
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Plaid sandbox account creation failed:", response.status, errorData);
      return c.json({ 
        error: "Failed to create sandbox account",
        details: errorData 
      }, response.status);
    }

    const data = await response.json();
    console.log("✅ Plaid sandbox public token created");

    // Now exchange this public token for an access token (same as normal flow)
    const exchangeResponse = await fetch("https://sandbox.plaid.com/item/public_token/exchange", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PLAID-CLIENT-ID": plaidClientId,
        "PLAID-SECRET": plaidSecret,
      },
      body: JSON.stringify({
        public_token: data.public_token,
      }),
    });

    if (!exchangeResponse.ok) {
      const errorData = await exchangeResponse.text();
      console.error("Plaid token exchange failed:", exchangeResponse.status, errorData);
      return c.json({ 
        error: "Failed to exchange token",
        details: errorData 
      }, exchangeResponse.status);
    }

    const exchangeData = await exchangeResponse.json();
    const { access_token, item_id } = exchangeData;
    
    console.log("✅ Plaid access token obtained for sandbox account:", item_id);

    // Store access token in KV store
    const institutionName = institution === "ins_115616" ? "Robinhood" : "Custom Institution";
    const connectionId = `plaid_${userId || "demo"}_${item_id}_${Date.now()}`;
    
    await kv.set(connectionId, {
      accessToken: access_token,
      itemId: item_id,
      userId: userId || "demo",
      institutionName,
      connectedAt: new Date().toISOString(),
      isSandbox: true
    });

    console.log("✅ Sandbox connection stored in KV:", connectionId);

    // Fetch the holdings to return them
    const holdingsResponse = await fetch("https://sandbox.plaid.com/investments/holdings/get", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PLAID-CLIENT-ID": plaidClientId,
        "PLAID-SECRET": plaidSecret,
      },
      body: JSON.stringify({
        access_token: access_token,
      }),
    });

    let tickers = defaultHoldings.map(h => h.ticker);
    
    if (holdingsResponse.ok) {
      const holdingsData = await holdingsResponse.json();
      const securities = holdingsData.securities || [];
      const holdings = holdingsData.holdings || [];
      
      // Create a map of security_id to ticker symbol
      const securityMap = new Map();
      securities.forEach((security: any) => {
        if (security.ticker_symbol) {
          securityMap.set(security.security_id, security.ticker_symbol);
        }
      });

      // Extract unique tickers
      const tickerSet = new Set<string>();
      holdings.forEach((holding: any) => {
        const ticker = securityMap.get(holding.security_id);
        if (ticker) {
          tickerSet.add(ticker);
        }
      });
      
      tickers = Array.from(tickerSet);
    }
    
    return c.json({ 
      connectionId,
      itemId: item_id,
      institutionName,
      holdings: tickers,
      success: true,
      message: `Sandbox account created with ${tickers.length} holdings`
    });
  } catch (error) {
    console.error("Error creating Plaid sandbox account:", error);
    return c.json({ 
      error: "Failed to create sandbox account",
      message: error.message,
      details: error.toString()
    }, 500);
  }
});

// Get all Plaid connections for a user
app.get("/make-server-fe0a490e/plaid/connections/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    
    // Get all connections for this user from KV store
    const allConnections = await kv.getByPrefix(`plaid_${userId}_`);
    
    const connections = allConnections.map((conn: any) => ({
      connectionId: conn.key,
      institutionName: conn.value.institutionName,
      connectedAt: conn.value.connectedAt,
      itemId: conn.value.itemId,
    }));

    return c.json({ connections });
  } catch (error) {
    console.error("Error fetching Plaid connections:", error);
    return c.json({ 
      error: "Failed to fetch connections",
      message: error.message 
    }, 500);
  }
});

// Delete a Plaid connection
app.delete("/make-server-fe0a490e/plaid/connections/:connectionId", async (c) => {
  try {
    const connectionId = c.req.param("connectionId");
    
    // Remove from KV store
    await kv.del(connectionId);
    
    console.log("✅ Plaid connection deleted:", connectionId);
    
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting Plaid connection:", error);
    return c.json({ 
      error: "Failed to delete connection",
      message: error.message 
    }, 500);
  }
});

Deno.serve(app.fetch);

export default app;