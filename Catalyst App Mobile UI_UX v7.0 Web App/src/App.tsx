import { useState, useEffect, useRef } from 'react';
import { DarkModeProvider } from './utils/dark-mode-context';
import { AuthProvider, useAuth } from './utils/auth-context';
import { MainApp } from './components/main-app';
import { OnboardingScreen } from './components/onboarding-screen-fixed';
import { Button } from './components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import DataService from './utils/data-service';
import { SortState } from './components/focus-stocks-list';

// App version for cache busting
const APP_VERSION = '1.0.0';

// Feature flags
const ENABLE_ONBOARDING = false;
const REQUIRE_AUTH = false; // Set to true to require login

// Default account for skipping onboarding
const DEFAULT_ROBINHOOD_ACCOUNT = {
  enabled: true,
  method: 'auto' as const,
  portfolioTickers: ['TSLA', 'MNMD', 'TMC'], // Holdings only
  connectedAccounts: [{
    provider: 'Robinhood',
    accountName: 'Default Account',
    balance: 0
  }]
};

// Default watchlist tickers (in addition to portfolio holdings)
const DEFAULT_WATCHLIST_TICKERS = ['AAPL'];

// Storage keys for localStorage
const STORAGE_KEYS = {
  ONBOARDING_COMPLETED: 'catalyst_onboarding_completed',
  SELECTED_TICKERS: 'catalyst_selected_tickers',
  PORTFOLIO_INTEGRATION: 'catalyst_portfolio_integration',
  SORT_STATE: 'catalyst_sort_state',
  APP_VERSION: 'catalyst_app_version'
};

// Helper functions for localStorage
const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    return defaultValue;
  }
};

const saveToStorage = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

const clearAppStorage = (): void => {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
};

// Inner component that uses auth context
function AppContent() {
  const authContext = REQUIRE_AUTH ? useAuth() : null;
  
  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);
  const [portfolioIntegration, setPortfolioIntegration] = useState<{
    enabled: boolean;
    method: 'auto' | 'manual';
    portfolioTickers?: string[];
    connectedAccounts?: any[];
  } | null>(null);
  const [preloadedEventsData, setPreloadedEventsData] = useState<Record<string, any[]>>({});
  const [isInitializing, setIsInitializing] = useState(true);
  const [dataServiceReady, setDataServiceReady] = useState(false);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [sortState, setSortState] = useState<SortState>({ method: null, direction: 'desc' });
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  
  // Use ref to prevent duplicate preload calls
  const isLoadingEvents = useRef(false);

  // Load saved state from localStorage on app start
  useEffect(() => {
    // Check for app version updates
    const savedVersion = loadFromStorage(STORAGE_KEYS.APP_VERSION, null);
    if (savedVersion && savedVersion !== APP_VERSION) {
      setShowUpdatePrompt(true);
      saveToStorage(STORAGE_KEYS.APP_VERSION, APP_VERSION);
      
      // Clear any browser caches for major updates
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
    } else if (!savedVersion) {
      // First time user
      saveToStorage(STORAGE_KEYS.APP_VERSION, APP_VERSION);
    }

    const savedOnboardingState = loadFromStorage(STORAGE_KEYS.ONBOARDING_COMPLETED, false);
    const savedTickers = loadFromStorage(STORAGE_KEYS.SELECTED_TICKERS, []);
    const savedPortfolioIntegration = loadFromStorage(STORAGE_KEYS.PORTFOLIO_INTEGRATION, null);
    const savedSortState = loadFromStorage(STORAGE_KEYS.SORT_STATE, { method: null, direction: 'desc' });

    // If onboarding is disabled, automatically mark as completed and use default Robinhood account
    if (!ENABLE_ONBOARDING) {
      setHasCompletedOnboarding(true);
      // Always use default Robinhood portfolio (don't cache)
      setSelectedTickers([...DEFAULT_ROBINHOOD_ACCOUNT.portfolioTickers, ...DEFAULT_WATCHLIST_TICKERS]);
      // Always use default Robinhood account (don't cache)
      setPortfolioIntegration(DEFAULT_ROBINHOOD_ACCOUNT);
    } else {
      setHasCompletedOnboarding(savedOnboardingState);
      setSelectedTickers(savedTickers);
      setPortfolioIntegration(savedPortfolioIntegration);
    }
    
    setSortState(savedSortState);
    
    // Clear scroll positions on app mount to ensure fresh start
    if (savedOnboardingState) {
      try {
        localStorage.removeItem('catalyst_scroll_position');
        localStorage.removeItem('catalyst_scroll_event_id');
      } catch (error) {
        // Ignore errors
      }
      // Scroll to top on initial load
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, []);

  // Force scroll to top repeatedly on mount
  useEffect(() => {
    // Aggressively force scroll to top for first 3 seconds
    const intervals = [100, 200, 300, 500, 800, 1000, 1500, 2000, 3000];
    const timers = intervals.map(delay => 
      setTimeout(() => {
        const scrollPos = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
        if (scrollPos !== 0) {
          window.scrollTo({ top: 0, behavior: 'instant' });
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
        }
      }, delay)
    );
    
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, []);
  
  // Configure viewport for mobile optimization
  useEffect(() => {
    // Set viewport meta tag to prevent zoom and optimize for mobile
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.setAttribute('name', 'viewport');
      document.head.appendChild(viewport);
    }
    // Prevent zoom for consistent mobile experience since we now use zoom slider
    viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    
    // Add cache-busting meta tags
    const addCacheBustingMeta = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };
    
    addCacheBustingMeta('cache-control', 'no-cache, no-store, must-revalidate');
    addCacheBustingMeta('pragma', 'no-cache');
    addCacheBustingMeta('expires', '0');
    addCacheBustingMeta('app-version', APP_VERSION);
    
    // Prevent zoom via CSS
    document.documentElement.style.zoom = '1';
    document.body.style.zoom = '1';
  }, []);

  // Initialize app immediately with optimized background data loading
  useEffect(() => {
    // Set app as ready immediately for better user experience
    setIsInitializing(false);
    setDataServiceReady(false);
    
    // Initialize DataService in background with proper error handling
    const initializeDataService = async () => {
      try {
        // Use shorter timeout to prevent blocking
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Initialization timeout')), 2000)
        );
        
        const result = await Promise.race([
          DataService.initialize(),
          timeoutPromise
        ]);
        
        setDataServiceReady(!!result);
      } catch (error) {
        setDataServiceReady(false);
      }
    };
    
    // Run initialization in background without blocking UI
    initializeDataService();
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ONBOARDING_COMPLETED, hasCompletedOnboarding);
  }, [hasCompletedOnboarding]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SELECTED_TICKERS, selectedTickers);
  }, [selectedTickers]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PORTFOLIO_INTEGRATION, portfolioIntegration);
  }, [portfolioIntegration]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SORT_STATE, sortState);
  }, [sortState]);

  // Preload events data for selected tickers to enable instant catalyst dots
  useEffect(() => {
    // Prevent duplicate calls
    if (isLoadingEvents.current) {
      return;
    }
    
    const preloadEventsData = async () => {
      if (selectedTickers.length === 0) {
        // Only clear if we actually had data before
        setPreloadedEventsData(prev => Object.keys(prev).length > 0 ? {} : prev);
        return;
      }

      // Don't wait for dataServiceReady - try to load events regardless
      // The EventsService will handle errors gracefully
      isLoadingEvents.current = true;

      try {
        // Load events for all selected tickers in parallel
        const eventsPromises = selectedTickers.map(async (ticker) => {
          try {
            const events = await DataService.getEventsByTicker(ticker);
            return { ticker, events };
          } catch (error) {
            console.warn(`Failed to load events for ${ticker}:`, error);
            return { ticker, events: [] };
          }
        });

        const eventsResults = await Promise.all(eventsPromises);
        
        // Convert to lookup object
        const eventsLookup: Record<string, any[]> = {};
        eventsResults.forEach(({ ticker, events }) => {
          eventsLookup[ticker] = events;
        });

        // Only update if data actually changed
        setPreloadedEventsData(prev => {
          // Check if the data is actually different
          const prevKeys = Object.keys(prev).sort();
          const newKeys = Object.keys(eventsLookup).sort();
          
          if (JSON.stringify(prevKeys) !== JSON.stringify(newKeys)) {
            return eventsLookup;
          }
          
          // Check if any ticker's events changed
          for (const ticker of newKeys) {
            if (JSON.stringify(prev[ticker]) !== JSON.stringify(eventsLookup[ticker])) {
              return eventsLookup;
            }
          }
          
          // No changes, return previous to prevent re-render
          return prev;
        });
      } catch (error) {
        setPreloadedEventsData(prev => Object.keys(prev).length > 0 ? {} : prev);
      } finally {
        isLoadingEvents.current = false;
      }
    };

    // Run preloading immediately for faster catalyst dots
    const timer = setTimeout(preloadEventsData, 10);
    return () => {
      clearTimeout(timer);
      isLoadingEvents.current = false;
    };
  }, [selectedTickers]); // Removed dataServiceReady dependency

  // Scroll to top and clear any saved scroll positions when onboarding completes
  useEffect(() => {
    if (hasCompletedOnboarding) {
      // Clear any saved scroll positions from previous sessions
      try {
        localStorage.removeItem('catalyst_scroll_position');
        localStorage.removeItem('catalyst_scroll_event_id');
      } catch (error) {
        // Ignore localStorage errors
      }
      
      // Force scroll to top immediately
      window.scrollTo({ top: 0, behavior: 'instant' });
      
      // Also ensure scroll to top after a short delay to handle any async content loading
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }, 100);
    }
  }, [hasCompletedOnboarding]);

  // Function to restart onboarding
  const restartOnboarding = () => {
    clearAppStorage();
    setHasCompletedOnboarding(false);
    setSelectedTickers([]);
    setPortfolioIntegration(null);
  };

  // Function to add a ticker to the watchlist
  const handleAddTicker = (ticker: string) => {
    if (!selectedTickers.includes(ticker)) {
      const newTickers = [...selectedTickers, ticker];
      setSelectedTickers(newTickers);
      saveToStorage(STORAGE_KEYS.SELECTED_TICKERS, newTickers);
      
      // Preload events for the new ticker
      DataService.getEventsByTicker(ticker).then((events) => {
        setPreloadedEventsData(prev => ({
          ...prev,
          [ticker]: events
        }));
      }).catch(() => {
        // Silently fail if events can't be loaded
      });
    }
  };

  // Function to force refresh app with timeout protection
  const forceRefresh = async () => {
    try {
      // Clear caches with timeout protection
      if ('caches' in window) {
        const cachePromise = caches.keys().then(names => 
          Promise.all(names.map(name => caches.delete(name)))
        );
        
        // Don't wait more than 1 second for cache clearing
        await Promise.race([
          cachePromise,
          new Promise(resolve => setTimeout(resolve, 1000))
        ]);
      }
      
      // Clear localStorage
      clearAppStorage();
      
      // Force reload with cache bypass
      window.location.href = window.location.href.split('?')[0] + '?v=' + Date.now();
    } catch (error) {
      window.location.reload();
    }
  };

  // Show loading screen while initializing
  if (isInitializing) {
    return (
      <DarkModeProvider>
        <div className="min-h-screen bg-background flex items-center justify-center" style={{background: 'linear-gradient(135deg, var(--background) 0%, var(--card) 100%)'}}>
          <div className="text-center space-y-6 max-w-md p-8 rounded-lg" style={{background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', backdropFilter: 'blur(8px)'}}>
            <div className="relative">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{background: 'var(--muted)', boxShadow: '0 0 0 1px var(--border), 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'}}>
                <Loader2 className="h-8 w-8 animate-spin text-ai-accent" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl text-foreground font-semibold">CATALYST</h2>
              <p className="text-xs text-muted-foreground" style={{fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em'}}>MARKET INTELLIGENCE SYSTEM</p>
              <div className="mt-4 space-y-1">
                <div className="text-sm text-muted-foreground">Initializing market data streams...</div>
                <div className="w-full bg-muted rounded-full h-1">
                  <div className="bg-ai-accent h-1 rounded-full w-3/4 animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DarkModeProvider>
    );
  }

  // Add database setup button to onboarding if not completed
  // Only show onboarding if the feature flag is enabled
  if (!hasCompletedOnboarding && ENABLE_ONBOARDING) {
    return (
      <DarkModeProvider>
        <OnboardingScreen 
          onComplete={(tickers, portfolioData) => {
            setSelectedTickers(tickers);
            setPortfolioIntegration(portfolioData || null);
            setHasCompletedOnboarding(true);
          }} 
        />
      </DarkModeProvider>
    );
  }

  return (
    <DarkModeProvider>
      <div className="relative overflow-x-hidden w-full max-w-full">
        {/* Update notification */}
        {showUpdatePrompt && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-sm">
            <div className="bg-ai-accent text-white p-3 rounded-lg shadow-lg flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4" />
                <span className="text-sm font-medium">App Updated!</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUpdatePrompt(false)}
                className="text-white hover:bg-white/20 h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
          </div>
        )}

        <MainApp 
          selectedTickers={selectedTickers} 
          portfolioIntegration={portfolioIntegration}
          onPortfolioUpdate={setPortfolioIntegration}
          preloadedEventsData={preloadedEventsData}
          onTickerOrderChange={setSelectedTickers}
          sortState={sortState}
          onSortStateChange={setSortState}
          onAddTicker={handleAddTicker}
        />
      </div>
    </DarkModeProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}