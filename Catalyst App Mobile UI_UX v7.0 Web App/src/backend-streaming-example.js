/**
 * Example Backend Implementation for Catalyst Copilot Streaming
 * 
 * This is a reference implementation showing how to send streaming responses
 * to the Catalyst Copilot frontend.
 */

// Express.js example
app.post('/chat', async (req, res) => {
  const { message, conversationHistory, selectedTickers } = req.body;

  // Set up Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust for your domain

  try {
    // 1. Send metadata first (data cards, event data)
    const dataCards = await fetchStockData(selectedTickers);
    const eventData = await fetchEventData(selectedTickers);
    
    res.write(`data: ${JSON.stringify({
      type: 'metadata',
      dataCards: dataCards,
      eventData: eventData,
      conversationId: generateConversationId()
    })}\n\n`);

    // 2. Send thinking steps (simulate AI reasoning)
    const thinkingSteps = [
      { phase: 'analyzing', content: 'Analyzing stock price movements and market trends...' },
      { phase: 'researching', content: 'Checking recent news and events for selected tickers...' },
      { phase: 'evaluating', content: 'Evaluating market sentiment and technical indicators...' },
      { phase: 'synthesizing', content: 'Synthesizing insights into a coherent response...' }
    ];

    for (const step of thinkingSteps) {
      res.write(`data: ${JSON.stringify({
        type: 'thinking',
        phase: step.phase,
        content: step.content
      })}\n\n`);
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    // 3. Stream the actual response content
    // This example uses OpenAI streaming, but you can adapt for any LLM
    const aiResponse = await getAIResponseStream(message, conversationHistory, selectedTickers);
    
    // Option A: If using OpenAI streaming
    for await (const chunk of aiResponse) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({
          type: 'content',
          content: content
        })}\n\n`);
      }
    }

    // Option B: If you have the full response and want to simulate streaming
    const fullResponse = "TSLA is up 5% today due to strong earnings...";
    const words = fullResponse.split(' ');
    
    for (const word of words) {
      res.write(`data: ${JSON.stringify({
        type: 'content',
        content: word + ' '
      })}\n\n`);
      
      // Simulate typing speed (50-100ms per word)
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // 4. Send completion signal
    res.write(`data: ${JSON.stringify({
      type: 'done'
    })}\n\n`);

    res.end();

  } catch (error) {
    console.error('Streaming error:', error);
    
    // Send error as final message
    res.write(`data: ${JSON.stringify({
      type: 'content',
      content: "I'm sorry, I encountered an error processing your request."
    })}\n\n`);
    
    res.write(`data: ${JSON.stringify({
      type: 'done'
    })}\n\n`);
    
    res.end();
  }
});

/**
 * Helper function: Get AI response stream from OpenAI
 */
async function getAIResponseStream(message, history, tickers) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  const systemPrompt = `You are Catalyst AI, a financial assistant specializing in stock analysis.
Current selected tickers: ${tickers.join(', ')}
Provide concise, actionable insights about stocks, market events, and trading.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: message }
  ];

  return await openai.chat.completions.create({
    model: 'gpt-4',
    messages: messages,
    stream: true,
    temperature: 0.7,
  });
}

/**
 * Helper function: Fetch stock data cards
 */
async function fetchStockData(tickers) {
  const dataCards = [];
  
  for (const ticker of tickers) {
    const stockInfo = await getStockPrice(ticker); // Your stock API
    
    dataCards.push({
      type: 'stock',
      data: {
        ticker: ticker,
        company: stockInfo.company,
        price: stockInfo.price,
        change: stockInfo.change,
        changePercent: stockInfo.changePercent,
        previousClose: stockInfo.previousClose,
        open: stockInfo.open,
        high: stockInfo.high,
        low: stockInfo.low
      }
    });

    // Check for SEC filing images
    const secImages = await getSECFilingImages(ticker); // Your SEC image extraction
    
    if (secImages && secImages.length > 0) {
      secImages.forEach(image => {
        dataCards.push({
          type: 'image',
          data: {
            id: image.id,
            ticker: ticker,
            source: 'sec_filing',
            title: image.title,
            imageUrl: image.imageUrl,
            context: image.context,
            filingType: image.filingType,
            filingDate: image.filingDate,
            filingUrl: image.filingUrl
          }
        });
      });
    }
  }
  
  return dataCards;
}

/**
 * Helper function: Extract images from SEC filings
 */
async function getSECFilingImages(ticker) {
  // Example: Query your database or SEC API for recent filings with images
  // This would extract images from 10-K, 10-Q, 8-K filings, etc.
  
  const images = await db.query(`
    SELECT 
      id,
      title,
      image_url,
      context,
      filing_type,
      filing_date,
      filing_url
    FROM sec_filing_images
    WHERE ticker = $1
    ORDER BY filing_date DESC
    LIMIT 3
  `, [ticker]);
  
  return images.rows;
}

/**
 * Helper function: Fetch event data
 */
async function fetchEventData(tickers) {
  const events = await getUpcomingEvents(tickers); // Your events API
  
  return {
    upcomingEvents: events.length,
    nextEvent: events[0] || null
  };
}

/**
 * Alternative: Non-streaming fallback (for testing or compatibility)
 * 
 * If you don't set SSE headers, the frontend will automatically
 * handle this as a regular JSON response.
 */
app.post('/chat-fallback', async (req, res) => {
  const { message, conversationHistory, selectedTickers } = req.body;

  try {
    const response = await getAIResponse(message, conversationHistory, selectedTickers);
    const dataCards = await fetchStockData(selectedTickers);
    const eventData = await fetchEventData(selectedTickers);

    res.json({
      response: response,
      dataCards: dataCards,
      eventData: eventData
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      response: "I'm sorry, I encountered an error processing your request.",
      dataCards: [],
      eventData: {}
    });
  }
});

/**
 * IMPORTANT NOTES:
 * 
 * 1. SSE Format: Each message must be prefixed with "data: " and end with "\n\n"
 * 2. Order matters: Send metadata first, then thinking, then content, then done
 * 3. Error handling: Always send a 'done' event, even on errors
 * 4. CORS: Make sure to allow your frontend domain
 * 5. Timeout: Consider implementing connection timeout (e.g., 60 seconds)
 * 6. Buffering: Disable response buffering in your server/proxy
 */
