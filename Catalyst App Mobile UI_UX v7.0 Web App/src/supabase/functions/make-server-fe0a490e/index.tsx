// Edge Function Entry Point
// Catalyst Copilot AI Chat Backend

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";

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
    message: "Catalyst Copilot backend is running"
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
    const body = await c.req.json();
    
    console.log("📨 Proxying chat request to DigitalOcean...");
    
    // Forward the request to DigitalOcean app
    const response = await fetch("https://catalyst-copilot-2nndy.ondigitalocean.app/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ DigitalOcean app error:", response.status, errorText);
      return c.json({ 
        error: `DigitalOcean app returned ${response.status}: ${errorText}` 
      }, response.status);
    }
    
    const data = await response.json();
    console.log("✅ Successfully proxied response from DigitalOcean");
    
    return c.json(data);
  } catch (error) {
    console.error("❌ Proxy error:", error);
    return c.json({ 
      error: "Failed to proxy request to DigitalOcean app",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// MongoDB proxy endpoint - called by DigitalOcean app to query MongoDB
app.post("/mongodb-proxy", async (c) => {
  try {
    const { query, collection, database } = await c.req.json();
    
    console.log(`📊 MongoDB proxy request: ${database}.${collection}`);
    console.log(`Query:`, JSON.stringify(query).substring(0, 200));
    
    // For now, return empty result since MongoDB connection is timing out
    // The DigitalOcean app should handle this gracefully
    console.log("⚠️ MongoDB proxy returning empty result (connection unavailable)");
    
    return c.json({ 
      success: true,
      data: [],
      message: "MongoDB connection temporarily unavailable"
    });
    
  } catch (error) {
    console.error("❌ MongoDB proxy error:", error);
    return c.json({ 
      success: false,
      error: error instanceof Error ? error.message : String(error),
      data: []
    }, 200); // Return 200 so DigitalOcean app doesn't fail
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
      "/chat",
      "/mongodb-proxy"
    ]
  }, 404);
});

Deno.serve(app.fetch);