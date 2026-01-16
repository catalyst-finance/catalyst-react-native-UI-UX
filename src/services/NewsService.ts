/**
 * NewsService.ts
 * 
 * Fetches news and event data from MongoDB collections via the backend API
 * Aggregates content from multiple sources for the home feed
 */

const BACKEND_URL = 'https://catalyst-copilot-2nndy.ondigitalocean.app';

// Collection types that map to MongoDB collections
export type NewsCollectionType = 
  | 'news'
  | 'press_releases'
  | 'sec_filings'
  | 'earnings_transcripts'
  | 'government_policy'
  | 'macro_economics'
  | 'price_targets'
  | 'ownership'
  | 'hype';

// Unified news item interface
export interface NewsItem {
  id: string;
  collection: NewsCollectionType;
  title: string;
  content?: string;
  summary?: string;
  url?: string;
  imageUrl?: string;
  source?: string;
  ticker?: string;
  tickers?: string[];
  publishedAt: string;
  category?: string;
  
  // Collection-specific fields
  analystFirm?: string;       // price_targets
  priceTarget?: number;       // price_targets
  filingType?: string;        // sec_filings
  speaker?: string;           // government_policy
  participants?: string[];    // government_policy
  sentiment?: number;         // hype
  reportDate?: string;        // earnings_transcripts
  country?: string;           // macro_economics
  description?: string;       // macro_economics
  author?: string;            // macro_economics
}

// Raw document types from MongoDB
interface MongoNewsDoc {
  _id: string;
  ticker?: string;
  tickers?: string[];
  title?: string;
  headline?: string;
  content?: string;
  text?: string;
  summary?: string;
  url?: string;
  link?: string;
  image_url?: string;
  imageUrl?: string;
  source?: string;
  domain?: string;
  published_at?: string;
  date?: string;
  publication_date?: string;
  report_date?: string;
  timestamp?: string;
  inserted_at?: string;
  category?: string;
  filing_type?: string;
  analyst_firm?: string;
  price_target?: number;
  speaker?: string;
  participants?: string[];
  sentiment?: number;
  turns?: Array<{ speaker: string; text: string }>;
  country?: string;
  description?: string;
  author?: string;
}

// API response type
interface MongoAPIResponse {
  success: boolean;
  collection: string;
  results: MongoNewsDoc[];
  count: number;
  cached?: boolean;
  error?: string;
}

/**
 * Normalize a MongoDB document to our unified NewsItem format
 */
function normalizeDocument(doc: MongoNewsDoc, collection: NewsCollectionType): NewsItem {
  // Determine the published date based on collection-specific fields
  let rawDate = 
    doc.published_at || 
    doc.date || 
    doc.publication_date || 
    doc.report_date ||
    doc.timestamp ||
    doc.inserted_at ||
    new Date().toISOString();
  
  // Fix timezone issue: if date is just "YYYY-MM-DD" (no time component),
  // append noon UTC to prevent timezone shifting to previous day
  if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    rawDate = `${rawDate}T12:00:00Z`;
  }
  
  const publishedAt = rawDate;

  // Get title based on collection
  const title = doc.title || doc.headline || 'Untitled';

  // Get content/summary
  const content = doc.content || doc.text || doc.summary;
  
  // Get summary for government_policy from turns
  let summary = doc.summary;
  if (collection === 'government_policy' && doc.turns && doc.turns.length > 0) {
    const firstTurn = doc.turns[0];
    summary = firstTurn.text.substring(0, 200) + (firstTurn.text.length > 200 ? '...' : '');
  }

  // Handle macro_economics URL - prepend base URL if it's a relative path
  let url = doc.url || doc.link;
  if (collection === 'macro_economics' && url && !url.startsWith('http')) {
    url = `https://tradingeconomics.com${url}`;
  }

  // Handle macro_economics source - always show tradingeconomics.com
  let source = doc.source || doc.domain || getCollectionDisplayName(collection);
  if (collection === 'macro_economics') {
    source = 'tradingeconomics.com';
  }

  return {
    id: doc._id,
    collection,
    title,
    content,
    summary,
    url,
    imageUrl: doc.image_url || doc.imageUrl,
    source,
    ticker: doc.ticker,
    tickers: doc.tickers,
    publishedAt,
    category: doc.category || doc.filing_type,
    analystFirm: doc.analyst_firm,
    priceTarget: doc.price_target,
    filingType: doc.filing_type,
    speaker: doc.speaker,
    participants: doc.participants,
    sentiment: doc.sentiment,
    reportDate: doc.report_date,
    country: doc.country,
    description: doc.description,
    author: doc.author,
  };
}

/**
 * Get display name for a collection
 */
export function getCollectionDisplayName(collection: NewsCollectionType): string {
  const names: Record<NewsCollectionType, string> = {
    news: 'News',
    press_releases: 'Press Release',
    sec_filings: 'SEC Filing',
    earnings_transcripts: 'Earnings',
    government_policy: 'Policy',
    macro_economics: 'Economy',
    price_targets: 'Price Target',
    ownership: 'Ownership',
    hype: 'Social',
  };
  return names[collection] || collection;
}

/**
 * Get icon name for a collection
 */
export function getCollectionIcon(collection: NewsCollectionType): string {
  const icons: Record<NewsCollectionType, string> = {
    news: 'newspaper-outline',
    press_releases: 'megaphone-outline',
    sec_filings: 'document-text-outline',
    earnings_transcripts: 'bar-chart-outline',
    government_policy: 'business-outline',
    macro_economics: 'globe-outline',
    price_targets: 'trending-up-outline',
    ownership: 'people-outline',
    hype: 'flame-outline',
  };
  return icons[collection] || 'document-outline';
}

/**
 * Get color for a collection
 */
export function getCollectionColor(collection: NewsCollectionType): string {
  const colors: Record<NewsCollectionType, string> = {
    news: '#3B82F6',           // Blue
    press_releases: '#8B5CF6', // Purple
    sec_filings: '#EF4444',    // Red
    earnings_transcripts: '#10B981', // Green
    government_policy: '#F59E0B', // Amber
    macro_economics: '#06B6D4', // Cyan
    price_targets: '#EC4899',  // Pink
    ownership: '#6366F1',      // Indigo
    hype: '#F97316',           // Orange
  };
  return colors[collection] || '#64748B';
}

/**
 * Fetch news from a specific collection
 */
export async function fetchCollection(
  collection: NewsCollectionType,
  options: {
    ticker?: string;
    limit?: number;
    dateGte?: string;
    dateLte?: string;
    search?: string;
  } = {}
): Promise<NewsItem[]> {
  try {
    const params = new URLSearchParams();
    
    if (options.ticker) params.append('ticker', options.ticker);
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.dateGte) params.append('date_gte', options.dateGte);
    if (options.dateLte) params.append('date_lte', options.dateLte);
    if (options.search) params.append('search', options.search);

    const url = `${BACKEND_URL}/api/mongodb/${collection}?${params.toString()}`;
    
    const response = await fetch(url);
    const data: MongoAPIResponse = await response.json();

    if (!data.success) {
      console.error(`[NewsService] Error fetching ${collection}:`, data.error);
      return [];
    }

    return data.results.map(doc => normalizeDocument(doc, collection));
  } catch (error) {
    console.error(`[NewsService] Failed to fetch ${collection}:`, error);
    return [];
  }
}

/**
 * Fetch a single document by ID
 */
export async function fetchDocument(
  collection: NewsCollectionType,
  id: string
): Promise<NewsItem | null> {
  try {
    const url = `${BACKEND_URL}/api/mongodb/${collection}/${id}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (!data.success || !data.document) {
      console.error(`[NewsService] Document not found:`, id);
      return null;
    }

    return normalizeDocument(data.document, collection);
  } catch (error) {
    console.error(`[NewsService] Failed to fetch document ${id}:`, error);
    return null;
  }
}

/**
 * Fetch aggregated news from multiple collections
 * Returns a chronologically sorted list of news items
 */
export async function fetchAggregatedFeed(
  options: {
    tickers?: string[];
    limit?: number;
    collections?: NewsCollectionType[];
    dateGte?: string;
    dateLte?: string;
  } = {}
): Promise<NewsItem[]> {
  const {
    tickers,
    limit = 50,
    collections = ['news', 'press_releases', 'earnings_transcripts', 'government_policy', 'macro_economics'],
    dateGte,
    dateLte,
  } = options;

  // Calculate per-collection limit to get roughly even distribution
  // Give more weight to less frequent collections
  const perCollectionLimit = Math.ceil(limit / collections.length) + 10;

  try {
    // Fetch from all collections in parallel
    const fetchPromises = collections.map(collection => {
      // For government_policy and macro_economics, don't filter by ticker
      const shouldFilterByTicker = 
        collection !== 'government_policy' && 
        collection !== 'macro_economics';
      
      // Skip date filtering for policy and macro - their date format is incompatible with ISO dates
      const shouldFilterByDate = 
        collection !== 'government_policy' && 
        collection !== 'macro_economics';
      
      // Give extra limit to policy and macro since they have fewer items
      const collectionLimit = (collection === 'government_policy' || collection === 'macro_economics')
        ? perCollectionLimit + 10
        : perCollectionLimit;
      
      // If we have tickers and this collection supports it, fetch for each ticker
      if (tickers && tickers.length > 0 && shouldFilterByTicker) {
        return Promise.all(
          tickers.map(ticker => 
            fetchCollection(collection, { 
              ticker, 
              limit: Math.ceil(collectionLimit / tickers.length),
              dateGte: shouldFilterByDate ? dateGte : undefined,
              dateLte: shouldFilterByDate ? dateLte : undefined,
            })
          )
        ).then(results => results.flat());
      }
      
      // Otherwise fetch without ticker filter
      return fetchCollection(collection, { 
        limit: collectionLimit,
        dateGte: shouldFilterByDate ? dateGte : undefined,
        dateLte: shouldFilterByDate ? dateLte : undefined,
      });
    });

    const results = await Promise.all(fetchPromises);
    
    // Flatten and sort by date (newest first)
    const allItems = results.flat();
    allItems.sort((a, b) => {
      const dateA = new Date(a.publishedAt).getTime();
      const dateB = new Date(b.publishedAt).getTime();
      return dateB - dateA;
    });

    // Return the requested limit
    return allItems.slice(0, limit);
  } catch (error) {
    console.error('[NewsService] Failed to fetch aggregated feed:', error);
    return [];
  }
}

/**
 * Fetch news specifically for a ticker
 */
export async function fetchTickerNews(
  ticker: string,
  options: {
    limit?: number;
    collections?: NewsCollectionType[];
  } = {}
): Promise<NewsItem[]> {
  return fetchAggregatedFeed({
    tickers: [ticker],
    limit: options.limit || 30,
    collections: options.collections || ['news', 'press_releases', 'sec_filings', 'price_targets'],
  });
}

/**
 * Search across all collections
 */
export async function searchNews(
  query: string,
  options: {
    limit?: number;
    collections?: NewsCollectionType[];
  } = {}
): Promise<NewsItem[]> {
  const collections = options.collections || ['news', 'press_releases', 'government_policy', 'macro_economics'];
  const perCollectionLimit = Math.ceil((options.limit || 20) / collections.length);

  try {
    const fetchPromises = collections.map(collection =>
      fetchCollection(collection, { 
        search: query, 
        limit: perCollectionLimit 
      })
    );

    const results = await Promise.all(fetchPromises);
    const allItems = results.flat();
    
    // Sort by date
    allItems.sort((a, b) => {
      const dateA = new Date(a.publishedAt).getTime();
      const dateB = new Date(b.publishedAt).getTime();
      return dateB - dateA;
    });

    return allItems.slice(0, options.limit || 20);
  } catch (error) {
    console.error('[NewsService] Search failed:', error);
    return [];
  }
}

export default {
  fetchCollection,
  fetchDocument,
  fetchAggregatedFeed,
  fetchTickerNews,
  searchNews,
  getCollectionDisplayName,
  getCollectionIcon,
  getCollectionColor,
};
