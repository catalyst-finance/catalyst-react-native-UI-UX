// Edge Function Entry Point
// This function serves as the deployment entry point for the Catalyst app's backend server.
// The actual server logic is in the /server directory to keep code organized.

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";

// Import Supabase client
import { createClient } from "jsr:@supabase/supabase-js@2";

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
app.get("/health", (c) => {
  return c.json({ 
    status: "ok",
    timestamp: new Date().toISOString(),
    message: "Catalyst Make Server is running"
  });
});

// Simple test endpoint
app.get("/test", (c) => {
  return c.json({ 
    message: "Server deployed successfully",
    environment: Deno.env.get("DENO_DEPLOYMENT_ID") || "local",
    timestamp: new Date().toISOString()
  });
});

// Chat endpoint for Catalyst Copilot
app.post("/chat", async (c) => {
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

    // Build context about user's stocks
    let stockContext = "";
    if (selectedTickers && selectedTickers.length > 0) {
      stockContext = `\n\nThe user is currently watching these stocks: ${selectedTickers.join(", ")}.`;
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

When answering questions:
1. Be concise and data-driven
2. Use bullish/bearish terminology
3. Reference specific price movements and percentages
4. Mention relevant upcoming events
5. Use a professional but approachable tone
6. If you need to show stock data, indicate it clearly so data cards can be generated
7. Do NOT include "Source:" labels or lists of sources at the end of your response.
8. Do NOT use inline citations like [1], [Source], or (Source).

${stockContext}`
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
        max_tokens: 500
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
    
    // If asking about a specific stock (TSLA, AAPL, etc), generate a stock card
    const stockMention = message.match(/\b([A-Z]{2,5})\b/);
    if (stockMention) {
      const ticker = stockMention[1];
      
      // Fetch real stock data from Supabase
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      
      if (supabaseUrl && supabaseServiceKey) {
        try {
          // Fetch current price
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
              
              // Fetch intraday data for mini chart
              // Get today's date in ET timezone (market timezone)
              const nowET = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
              const todayET = new Date(nowET);
              todayET.setHours(0, 0, 0, 0);
              const todayISOET = todayET.toISOString();
              
              const intradayResponse = await fetch(
                `${supabaseUrl}/rest/v1/intraday_prices?symbol=eq.${ticker}&timestamp_et=gte.${todayISOET}&order=timestamp_et.asc&limit=5000`,
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
                  timestamp_et: d.timestamp_et,
                  price: d.price,
                  volume: d.volume
                }));
              }
              
              dataCards.push({
                type: "stock",
                data: {
                  ticker: quote.symbol,
                  company: quote.company_name || ticker,
                  price: quote.price,
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

    return c.json({
      response: aiResponse,
      dataCards
    });
  } catch (error) {
    console.error("Error in chat endpoint:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Fallback for undefined routes
app.all("*", (c) => {
  return c.json({ 
    error: "Route not found",
    path: c.req.path,
    method: c.req.method,
    availableRoutes: [
      "/health",
      "/test",
      "/chat"
    ]
  }, 404);
});

Deno.serve(app.fetch);