import { MongoClient, ObjectId } from "npm:mongodb@6.3.0";

/**
 * MongoDB Service for Catalyst AI Chat
 * Connects to MongoDB and provides query functions for AI context
 */

let cachedClient: MongoClient | null = null;
let lastConnectionAttempt = 0;
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

/**
 * Convert MongoDB SRV connection string to standard format
 * Deno has issues with SRV DNS lookups, so we need to use direct connection
 */
function convertSrvToStandard(uri: string): string {
  // If not using SRV, return as-is
  if (!uri.startsWith('mongodb+srv://')) {
    return uri;
  }
  
  console.log("⚠️ Detected mongodb+srv:// connection string");
  console.log("⚠️ Supabase Edge Functions have issues with SRV DNS lookups");
  console.log("⚠️ Please update MONGODB_URI to use standard mongodb:// format");
  console.log("Example: mongodb://username:password@host1:27017,host2:27017,host3:27017/database?replicaSet=myReplicaSet&authSource=admin&tls=true");
  
  // Throw error with instructions
  throw new Error(
    "MongoDB SRV connection strings (mongodb+srv://) are not supported in Supabase Edge Functions. " +
    "Please update your MONGODB_URI environment variable to use a standard connection string format: " +
    "mongodb://username:password@host:port/database?options"
  );
}

/**
 * Enhance MongoDB URI with optimal connection parameters
 */
function enhanceMongoUri(uri: string): string {
  const url = new URL(uri);
  
  // Add or update connection parameters for better reliability
  const params = url.searchParams;
  
  // Set timeouts if not already specified
  if (!params.has('serverSelectionTimeoutMS')) {
    params.set('serverSelectionTimeoutMS', '30000');
  }
  if (!params.has('connectTimeoutMS')) {
    params.set('connectTimeoutMS', '30000');
  }
  if (!params.has('socketTimeoutMS')) {
    params.set('socketTimeoutMS', '30000');
  }
  
  // Set replica set parameters
  if (!params.has('directConnection')) {
    params.set('directConnection', 'false');
  }
  if (!params.has('retryWrites')) {
    params.set('retryWrites', 'true');
  }
  if (!params.has('w')) {
    params.set('w', 'majority');
  }
  
  // Ensure TLS is enabled for DigitalOcean
  if (!params.has('tls') && !params.has('ssl')) {
    params.set('tls', 'true');
  }
  
  return url.toString();
}

/**
 * Sleep helper for retry logic
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get or create MongoDB client connection with retry logic
 */
async function getMongoClient(): Promise<MongoClient> {
  // Return cached client if available and healthy
  if (cachedClient) {
    try {
      // Test connection health with a quick ping
      await cachedClient.db('admin').command({ ping: 1 });
      console.log("✅ Using cached MongoDB connection");
      return cachedClient;
    } catch (error) {
      console.log("⚠️  Cached connection unhealthy, reconnecting...");
      cachedClient = null;
    }
  }

  const mongoUri = Deno.env.get("MONGODB_URI");
  if (!mongoUri) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  // Convert SRV to standard format (will throw error if SRV is used)
  const standardUri = convertSrvToStandard(mongoUri);
  
  // Enhance URI with optimal connection parameters
  const enhancedUri = enhanceMongoUri(standardUri);
  
  // Mask password in logs
  const maskedUri = enhancedUri.replace(/:[^:@]+@/, ':****@');
  console.log("MongoDB URI format:", maskedUri);
  
  // Extract hostname for debugging
  try {
    const url = new URL(standardUri);
    console.log(`MongoDB URI host: ${url.hostname}`);
  } catch (e) {
    console.log("Could not parse MongoDB URI for hostname");
  }

  // Retry connection attempts
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    lastConnectionAttempt = Date.now();
    connectionAttempts++;
    
    console.log(`Connecting to MongoDB... (attempt ${attempt}/${MAX_RETRY_ATTEMPTS})`);
    
    // Create client with extended timeouts
    const client = new MongoClient(enhancedUri, {
      serverSelectionTimeoutMS: 30000, // 30 second timeout
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 60000, // Close idle connections after 60s
      retryWrites: true,
      retryReads: true,
    });
    
    try {
      await client.connect();
      
      // Verify connection with a ping
      await client.db('admin').command({ ping: 1 });
      
      console.log(`✅ MongoDB connected successfully on attempt ${attempt}`);
      cachedClient = client;
      connectionAttempts = 0; // Reset on success
      return client;
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ MongoDB connection attempt ${attempt} failed:`, error.message);
      
      // Close failed client
      try {
        await client.close();
      } catch (closeError) {
        // Ignore close errors
      }
      
      // Wait before retry (except on last attempt)
      if (attempt < MAX_RETRY_ATTEMPTS) {
        console.log(`⏳ Waiting ${RETRY_DELAY_MS}ms before retry...`);
        await sleep(RETRY_DELAY_MS);
      }
    }
  }
  
  // All attempts failed
  console.error(`❌ MongoDB connection failed after ${MAX_RETRY_ATTEMPTS} attempts`);
  throw new Error(`MongoDB connection failed: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Query MongoDB collection based on AI chat message
 */
export async function queryMongoForContext(
  message: string,
  selectedTickers: string[] = []
): Promise<string> {
  try {
    const client = await getMongoClient();
    const dbName = Deno.env.get("MONGODB_DATABASE") || "raw_data"; // Default to raw_data where institutional data is stored
    const db = client.db(dbName);
    
    console.log(`MongoDB: Database name: ${dbName}`);
    
    let contextData = "";

    // Detect query types
    const isInstitutionalQuery = /institutional|ownership|holders?|fund|hedge fund|manager|position/i.test(message);
    const isOwnershipChangeQuery = /increase|decrease|bought|sold|change|flow/i.test(message);
    const isPolicyQuery = /policy|government|trump|biden|white house|congress|legislation|tariff|regulation|fed|federal reserve/i.test(message);
    const isMarketNewsQuery = /market|news|economy|economic|sentiment|global|country|gdp|inflation|trade/i.test(message);
    
    console.log(`MongoDB: Query types detected - ${JSON.stringify({
      isInstitutionalQuery,
      isOwnershipChangeQuery,
      isPolicyQuery,
      isMarketNewsQuery
    })}`);
    
    // Extract tickers from message
    const tickerMatches = message.match(/\b([A-Z]{2,5})\b/g) || [];
    const mentionedTickers = [...new Set([...tickerMatches, ...selectedTickers])];
    
    console.log(`MongoDB: Extracted tickers from message: ${JSON.stringify(tickerMatches)}`);
    console.log(`MongoDB: Combined with selected tickers: ${JSON.stringify(mentionedTickers)}`);
    
    // Extract institution names from message
    const institutionMatches = message.match(/\b(Vanguard|BlackRock|State Street|Berkshire|Fidelity|Morgan Stanley|JP[- ]?Morgan|Goldman|Citadel|Renaissance|Two Sigma)\b/gi);
    const mentionedInstitutions = institutionMatches ? [...new Set(institutionMatches.map(i => i.toLowerCase()))] : [];

    // Query institutional ownership data
    if (isInstitutionalQuery || (mentionedTickers.length > 0 && !isPolicyQuery && !isMarketNewsQuery)) {
      console.log(`MongoDB: Searching for institutional ownership data for tickers: ${JSON.stringify(mentionedTickers)}`);
      
      // First, list all collections to help debug
      const collections = await db.listCollections().toArray();
      console.log(`MongoDB: Available collections: ${collections.map(c => c.name).join(", ")}`);
      
      const possibleCollections = ["institutional_ownership", "institutional_data", "ownership_data", "institutional", "stock_ownership", "holdings"];
      
      for (const collectionName of possibleCollections) {
        try {
          const collection = db.collection(collectionName);
          
          // Check if collection exists
          const collectionExists = collections.some(c => c.name === collectionName);
          if (!collectionExists) {
            console.log(`MongoDB: Skipping ${collectionName} - collection does not exist`);
            continue;
          }
          
          console.log(`MongoDB: Checking collection: ${collectionName}`);
          
          // Get sample document to understand structure
          const sampleDoc = await collection.findOne({});
          if (sampleDoc) {
            console.log(`MongoDB: Sample document keys in ${collectionName}:`, JSON.stringify(Object.keys(sampleDoc)));
          }
          
          let query: any = {};
          if (mentionedTickers.length > 0) {
            query.ticker = { $in: mentionedTickers };
          }
          
          console.log(`MongoDB: Querying ${collectionName} with: ${JSON.stringify(query)}`);
          console.log(`MongoDB: Query details - tickers to find: ${JSON.stringify(mentionedTickers)}`);
          
          const ownershipData = await collection
            .find(query)
            .sort({ date: -1 })
            .limit(mentionedTickers.length || 10)
            .toArray();
          
          console.log(`MongoDB: Found ${ownershipData.length} ownership records in ${collectionName}`);
          
          if (ownershipData.length > 0) {
            contextData += `\n\nInstitutional Ownership Data from MongoDB (${ownershipData.length} ticker(s)):\n`;
            
            for (const data of ownershipData) {
              contextData += `\n${data.ticker} (as of ${data.date}):\n`;
              
              if (data.institutional_ownership) {
                const io = data.institutional_ownership;
                contextData += `  Institutional Ownership: ${io.value}\n`;
                
                if (io.increased_positions) {
                  contextData += `  Increased Positions: ${io.increased_positions.holders} holders, ${io.increased_positions.shares} shares\n`;
                }
                if (io.decreased_positions) {
                  contextData += `  Decreased Positions: ${io.decreased_positions.holders} holders, ${io.decreased_positions.shares} shares\n`;
                }
                if (io.total_institutional_shares) {
                  contextData += `  Total Institutional: ${io.total_institutional_shares.holders} holders, ${io.total_institutional_shares.shares} shares\n`;
                }
              }
              
              if (data.institutional_holdings?.holders?.length > 0) {
                const topHolders = data.institutional_holdings.holders.slice(0, 10);
                contextData += `\n  Top 10 Institutional Holders:\n`;
                topHolders.forEach((holder: any, idx: number) => {
                  contextData += `    ${idx + 1}. ${holder.owner}: ${holder.shares} shares (${holder.percent} change)\n`;
                });
              }
              
              if (mentionedInstitutions.length > 0 && data.institutional_holdings?.holders) {
                const matchedHolders = data.institutional_holdings.holders.filter((holder: any) => {
                  const holderName = holder.owner.toLowerCase();
                  return mentionedInstitutions.some(inst => holderName.includes(inst));
                });
                
                if (matchedHolders.length > 0) {
                  contextData += `\n  Mentioned Institutions:\n`;
                  matchedHolders.forEach((holder: any) => {
                    contextData += `    - ${holder.owner}: ${holder.shares} shares, $${holder.marketValue} value (${holder.percent} change)\n`;
                  });
                }
              }
              
              if (isOwnershipChangeQuery && data.institutional_holdings?.holders) {
                const significantChanges = data.institutional_holdings.holders
                  .filter((holder: any) => {
                    const percentStr = holder.percent;
                    if (percentStr === "New" || percentStr === "Sold Out") return true;
                    const percentMatch = percentStr.match(/(-?\d+\.?\d*)/);
                    if (percentMatch) {
                      const percentNum = Math.abs(parseFloat(percentMatch[1]));
                      return percentNum > 20;
                    }
                    return false;
                  })
                  .slice(0, 15);
                
                if (significantChanges.length > 0) {
                  contextData += `\n  Significant Position Changes (>20% or New/Sold Out):\n`;
                  significantChanges.forEach((holder: any) => {
                    contextData += `    - ${holder.owner}: ${holder.shares} shares (${holder.percent})\n`;
                  });
                }
              }
            }
            
            break;
          }
        } catch (err) {
          console.log(`MongoDB: Error querying collection ${collectionName}:`, err);
        }
      }
      
      if (!contextData) {
        console.log("MongoDB: No institutional ownership data found for the queried tickers");
      }
    }

    // Query government policy transcripts
    if (isPolicyQuery) {
      const possibleCollections = ["transcripts", "government_transcripts", "policy_transcripts", "press_briefings"];
      
      for (const collectionName of possibleCollections) {
        try {
          const collection = db.collection(collectionName);
          
          // Build text search query
          let query: any = {};
          
          // Search in title, description, or turns text
          const searchTerms = message.toLowerCase().split(/\s+/)
            .filter(word => word.length > 3 && !['what', 'when', 'where', 'how', 'the', 'about', 'this', 'that'].includes(word));
          
          if (searchTerms.length > 0) {
            query.$or = [
              { title: { $regex: searchTerms.join('|'), $options: 'i' } },
              { description: { $regex: searchTerms.join('|'), $options: 'i' } },
              { 'turns.text': { $regex: searchTerms.join('|'), $options: 'i' } }
            ];
          }
          
          const transcripts = await collection
            .find(query)
            .sort({ date: -1 })
            .limit(3)
            .toArray();
          
          if (transcripts.length > 0) {
            contextData += `\n\nRelevant Government Policy Context from MongoDB:\n`;
            
            for (const transcript of transcripts) {
              contextData += `\n"${transcript.title}" (${transcript.date}):\n`;
              
              // Extract key quotes related to search terms
              if (transcript.turns && Array.isArray(transcript.turns)) {
                const relevantTurns = transcript.turns
                  .filter((turn: any) => {
                    const turnText = turn.text.toLowerCase();
                    return searchTerms.some(term => turnText.includes(term));
                  })
                  .slice(0, 5);
                
                if (relevantTurns.length > 0) {
                  contextData += `  Key Excerpts:\n`;
                  relevantTurns.forEach((turn: any) => {
                    const snippet = turn.text.length > 200 ? turn.text.substring(0, 200) + '...' : turn.text;
                    contextData += `    - ${turn.speaker}: "${snippet}"\n`;
                  });
                }
              }
            }
            
            break;
          }
        } catch (err) {
          console.log(`Collection ${collectionName} not found or error:`, err);
        }
      }
    }

    // Query market news and economic data
    if (isMarketNewsQuery) {
      const possibleCollections = ["market_news", "news", "economic_data", "global_news"];
      
      for (const collectionName of possibleCollections) {
        try {
          const collection = db.collection(collectionName);
          
          let query: any = {};
          
          // Search by category, country, or text
          const searchTerms = message.toLowerCase().split(/\s+/)
            .filter(word => word.length > 3 && !['what', 'when', 'where', 'how', 'the', 'about', 'this', 'that'].includes(word));
          
          if (searchTerms.length > 0) {
            query.$or = [
              { title: { $regex: searchTerms.join('|'), $options: 'i' } },
              { description: { $regex: searchTerms.join('|'), $options: 'i' } },
              { category: { $regex: searchTerms.join('|'), $options: 'i' } },
              { country: { $regex: searchTerms.join('|'), $options: 'i' } }
            ];
          }
          
          // Prioritize high importance items
          const news = await collection
            .find(query)
            .sort({ importance: -1, date: -1 })
            .limit(5)
            .toArray();
          
          if (news.length > 0) {
            contextData += `\n\nRelevant Market News from MongoDB:\n`;
            
            for (const item of news) {
              const importanceLabel = item.importance >= 3 ? "HIGH" : item.importance >= 2 ? "MEDIUM" : "LOW";
              contextData += `\n[${importanceLabel}] ${item.title} (${item.date}):\n`;
              contextData += `  ${item.description}\n`;
              if (item.country) contextData += `  Country: ${item.country}\n`;
              if (item.category) contextData += `  Category: ${item.category}\n`;
            }
            
            break;
          }
        } catch (err) {
          console.log(`Collection ${collectionName} not found or error:`, err);
        }
      }
    }

    return contextData;
  } catch (error) {
    console.error("MongoDB query error:", error);
    return "";
  }
}

/**
 * Get specific document by ID from MongoDB
 */
export async function getDocumentById(
  collectionName: string,
  documentId: string
): Promise<any | null> {
  try {
    const client = await getMongoClient();
    const dbName = Deno.env.get("MONGODB_DATABASE") || "catalyst";
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    const doc = await collection.findOne({ _id: new ObjectId(documentId) });
    return doc;
  } catch (error) {
    console.error(`Error fetching document ${documentId} from ${collectionName}:`, error);
    return null;
  }
}

/**
 * Search MongoDB collections with custom query
 */
export async function customMongoQuery(
  collectionName: string,
  query: any = {},
  options: any = {}
): Promise<any[]> {
  try {
    const client = await getMongoClient();
    const dbName = Deno.env.get("MONGODB_DATABASE") || "catalyst";
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    
    const limit = options.limit || 20;
    const sort = options.sort || { _id: -1 };
    
    const docs = await collection
      .find(query)
      .sort(sort)
      .limit(limit)
      .toArray();
    
    return docs;
  } catch (error) {
    console.error(`Error in custom MongoDB query on ${collectionName}:`, error);
    return [];
  }
}

/**
 * Close MongoDB connection (call on server shutdown)
 */
export async function closeMongoConnection(): Promise<void> {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    console.log("MongoDB connection closed");
  }
}