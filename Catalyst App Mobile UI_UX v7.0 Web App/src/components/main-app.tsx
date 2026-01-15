import { useState, useEffect, useRef } from 'react';
import { HomePage } from './dashboard-with-events-clean';
import { DiscoveryScreen } from './discovery-screen';
import { PortfolioScreen } from './portfolio-screen';
import { ProfileScreen } from './profile-screen';
import { StockInfoScreen } from './stock-info-screen';
import { EventAnalysis } from './event-analysis';
import { AIRecommendationsScreen } from './ai-recommendations-screen';
import { CatalystCopilotScreen } from './catalyst-copilot-screen';
import { BottomNavigation } from './bottom-navigation';
import { MarketEvent } from '../utils/supabase/events-api';
import { SortState } from './focus-stocks-list';

interface MainAppProps {
  selectedTickers: string[];
  portfolioIntegration?: {
    enabled: boolean;
    method: 'auto' | 'manual';
    portfolioTickers?: string[];
    connectedAccounts?: any[];
  } | null;
  onPortfolioUpdate?: (portfolioData: any) => void;
  testingBadgeComponent?: React.ReactNode;
  preloadedEventsData?: Record<string, any[]>;
  onTickerOrderChange?: (newOrder: string[]) => void;
  sortState?: SortState;
  onSortStateChange?: (sortState: SortState) => void;
  onAddTicker?: (ticker: string) => void;
}

export function MainApp({ selectedTickers, portfolioIntegration, onPortfolioUpdate, testingBadgeComponent, preloadedEventsData = {}, onTickerOrderChange, sortState, onSortStateChange, onAddTicker }: MainAppProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'copilot' | 'search' | 'profile'>('home');
  const [stockInfoTicker, setStockInfoTicker] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<MarketEvent | null>(null);
  const [showAIRecommendations, setShowAIRecommendations] = useState(false);
  const [justRestored, setJustRestored] = useState(false);
  const [isRestoringPosition, setIsRestoringPosition] = useState(false); // Always start false on mount
  const [savedStockScrollPosition, setSavedStockScrollPosition] = useState(0);
  const [savedDashboardTab, setSavedDashboardTab] = useState<string | null>(null);
  const [isRestoringStockPosition, setIsRestoringStockPosition] = useState(false);
  const [hasInitiallyMounted, setHasInitiallyMounted] = useState(false);
  const [hasSeenFirstTab, setHasSeenFirstTab] = useState(false);
  const [shouldScrollToEvents, setShouldScrollToEvents] = useState(false);

  // Track previous dependency values to prevent unnecessary scroll effect runs
  const prevScrollDepsRef = useRef({
    activeTab,
    stockInfoTicker,
    selectedEvent,
    showAIRecommendations,
    hasInitiallyMounted
  });

  // Debug MainApp renders
  // console.log('[MainApp] Component render - activeTab:', activeTab, 'stockInfoTicker:', stockInfoTicker, 'selectedEvent:', selectedEvent ? 'present' : 'null');

  // Rest of your existing code...
  
  // Handle scroll position saving (called from Dashboard before state change)
  const handleSaveScrollPosition = (eventId: string, scrollPosition: number) => {
    setSavedEventId(eventId);
    setSavedScrollPosition(scrollPosition);
  };

  const handleTickerClick = (ticker: string, scrollToEvents: boolean = false) => {
    // Navigate to stock info (scroll position and tab state saved by dashboard)
    setShouldScrollToEvents(scrollToEvents);
    setStockInfoTicker(ticker);
  };

  const handleSaveStockScrollAndTab = (scrollPosition: number, tabState: string) => {
    setSavedStockScrollPosition(scrollPosition);
    setSavedDashboardTab(tabState);
  };

  const handleEventClickFromTimeline = (event: MarketEvent) => {
    // Navigate to the stock info page for this event and scroll to events section
    if (event.ticker && event.ticker !== 'N/A') {
      handleTickerClick(event.ticker, true);
    }
  };

  // Persistent scroll position storage using localStorage
  const getSavedScrollPosition = (): number => {
    try {
      const saved = localStorage.getItem('catalyst_scroll_position');
      return saved ? parseFloat(saved) : 0;
    } catch {
      return 0;
    }
  };

  const setSavedScrollPosition = (position: number): void => {
    try {
      localStorage.setItem('catalyst_scroll_position', position.toString());
    } catch {
      // Ignore localStorage errors
    }
  };

  const getSavedEventId = (): string | null => {
    try {
      return localStorage.getItem('catalyst_scroll_event_id');
    } catch {
      return null;
    }
  };

  const setSavedEventId = (eventId: string | null): void => {
    try {
      if (eventId) {
        localStorage.setItem('catalyst_scroll_event_id', eventId);
      } else {
        localStorage.removeItem('catalyst_scroll_event_id');
      }
    } catch {
      // Ignore localStorage errors
    }
  };

  // Handle scroll position when navigating
  useEffect(() => {
    // Check if dependencies ACTUALLY changed
    const prev = prevScrollDepsRef.current;
    const actuallyChanged = 
      prev.activeTab !== activeTab ||
      prev.stockInfoTicker !== stockInfoTicker ||
      prev.selectedEvent !== selectedEvent ||
      prev.showAIRecommendations !== showAIRecommendations ||
      prev.hasInitiallyMounted !== hasInitiallyMounted;
    
    if (!actuallyChanged) {
      return;
    }
    
    // Update ref with current values
    prevScrollDepsRef.current = {
      activeTab,
      stockInfoTicker,
      selectedEvent,
      showAIRecommendations,
      hasInitiallyMounted
    };
    
    // Note: Scroll position is now saved immediately when event is selected (see separate useEffect above)
    
    // On initial load, ALWAYS scroll to top and don't restore anything
    if (!hasInitiallyMounted) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }
    
    if (getSavedEventId() && activeTab === 'home' && !selectedEvent && !stockInfoTicker && !showAIRecommendations) {
      // Start loading state immediately to prevent any flash
      setIsRestoringPosition(true);
      
      // Restore scroll position by finding the saved event (only on home tab when returning)
      const savedEventId = getSavedEventId();
      
      const restoreToEvent = () => {
        const targetElement = document.querySelector(`[data-event-id="${savedEventId}"]`);
        
        if (targetElement) {
          // Scroll to the event centered in viewport
          targetElement.scrollIntoView({ 
            behavior: 'instant',
            block: 'center'
          });
          
          // Add small delay to ensure proper centering 
          requestAnimationFrame(() => {
            targetElement.scrollIntoView({ 
              behavior: 'instant',
              block: 'center'
            });
          });
          
          setSavedEventId(null);
          setSavedScrollPosition(0);
          setJustRestored(true);
          
          // Clear loading state immediately after positioning
          setIsRestoringPosition(false);
          
          // Reset the flag after a short delay to allow future saves
          setTimeout(() => setJustRestored(false), 1000);
        } else {
          // Fallback to pixel position if event not found
          const savedScrollPosition = getSavedScrollPosition();
          if (savedScrollPosition > 0) {
            window.scrollTo(0, savedScrollPosition);
            setSavedScrollPosition(0);
            setSavedEventId(null);
            setJustRestored(true);
            
            // Clear loading state immediately after positioning
            setIsRestoringPosition(false);
            
            // Reset the flag after a short delay to allow future saves
            setTimeout(() => setJustRestored(false), 1000);
          }
        }
      };
      
      // Try multiple times to handle async content loading
      let attempts = 0;
      const maxAttempts = 6; // Reduced to prevent timeouts
      
      // Set a hard timeout to prevent infinite waiting (max 400ms total)
      let hardTimeout: NodeJS.Timeout | null = setTimeout(() => {
        setIsRestoringPosition(false);
        setSavedEventId(null);
        window.scrollTo({ top: 0, behavior: 'instant' });
      }, 400);
      
      const tryRestore = () => {
        attempts++;

        

        
        const targetElement = document.querySelector(`[data-event-id="${savedEventId}"]`);
        
        if (targetElement) {
          // Clear the hard timeout since we found the element
          if (hardTimeout) {
            clearTimeout(hardTimeout);
            hardTimeout = null;
          }
          restoreToEvent();
        } else if (attempts < maxAttempts) {
          setTimeout(tryRestore, 50); // Quick retry - 50ms
        } else {
          // Clear the hard timeout 
          if (hardTimeout) {
            clearTimeout(hardTimeout);
            hardTimeout = null;
          }
          const savedScrollPosition = getSavedScrollPosition();
          if (savedScrollPosition > 0) {
            window.scrollTo(0, savedScrollPosition);
            setSavedScrollPosition(0);
            setJustRestored(true);
            
            // Clear loading state immediately after positioning
            setIsRestoringPosition(false);
            
            // Reset the flag after a short delay to allow future saves
            setTimeout(() => setJustRestored(false), 1000);
          } else {
            // Clear loading state even if no scroll position to restore
            setIsRestoringPosition(false);
          }
          setSavedEventId(null);
        }
      };
      
      // Start restoration immediately - no delays
      requestAnimationFrame(() => {
        tryRestore();
      });
      
      // Cleanup function
      return () => {
        if (hardTimeout) clearTimeout(hardTimeout);
      };
    } else {
      // ALWAYS scroll to top for ANY navigation change (tabs, screens, etc)
      // This ensures every page loads at the top
      window.scrollTo({ top: 0, behavior: 'instant' });
      
      // Ensure loading state is cleared when no restoration is needed
      if (isRestoringPosition) {
        setIsRestoringPosition(false);
      }
    }
  }, [activeTab, stockInfoTicker, selectedEvent, showAIRecommendations, hasInitiallyMounted]);

  // Debug: Track what's triggering the scroll effect
  // useEffect(() => {
  //   console.log('[MainApp ScrollDebug] Dependency changed:');
  //   console.log('  - activeTab:', activeTab);
  //   console.log('  - stockInfoTicker:', stockInfoTicker);
  //   console.log('  - selectedEvent:', selectedEvent);
  //   console.log('  - showAIRecommendations:', showAIRecommendations);
  //   console.log('  - hasInitiallyMounted:', hasInitiallyMounted);
  // }, [activeTab, stockInfoTicker, selectedEvent, showAIRecommendations, hasInitiallyMounted]);

  // Handle stock navigation scroll behavior separately
  useEffect(() => {
    if (stockInfoTicker) {
      // Navigating TO stock info - scroll to top aggressively
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      
      // Also force scroll to top after a brief delay to handle any content shifts
      const scrollTimer = setTimeout(() => {
        const currentScroll = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
        if (currentScroll !== 0) {
          window.scrollTo({ top: 0, behavior: 'instant' });
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
        }
      }, 100);
      
      return () => clearTimeout(scrollTimer);
    } else if (savedStockScrollPosition > 0 && activeTab === 'home' && !selectedEvent && !showAIRecommendations) {
      // Returning from stock info - start restoration process
      setIsRestoringStockPosition(true);
      
      // Use requestAnimationFrame for smooth restoration
      const restoreStockPosition = () => {
        window.scrollTo(0, savedStockScrollPosition);
        
        // Clear states after restoration
        setSavedStockScrollPosition(0);
        setSavedDashboardTab(null);
        setIsRestoringStockPosition(false);
      };

      // Start restoration immediately - no delays
      requestAnimationFrame(() => {
        restoreStockPosition();
      });
    }
  }, [stockInfoTicker, savedStockScrollPosition, activeTab, selectedEvent, showAIRecommendations]);

  const renderContent = () => {
    if (selectedEvent) {
      return (
        <EventAnalysis
          event={selectedEvent}
          onBack={() => setSelectedEvent(null)}
          onTickerClick={handleTickerClick}
        />
      );
    }

    if (showAIRecommendations) {
      return (
        <AIRecommendationsScreen
          onBack={() => setShowAIRecommendations(false)}
          onEventClick={setSelectedEvent}
          portfolioTickers={selectedTickers}
        />
      );
    }

    if (stockInfoTicker) {
      return (
        <StockInfoScreen 
          ticker={stockInfoTicker} 
          onBack={() => {
            setStockInfoTicker(null);
            setShouldScrollToEvents(false);
          }} 
          onTickerClick={handleTickerClick}
          onEventClick={setSelectedEvent}
          scrollToEvents={shouldScrollToEvents}
          onScrollToEventsComplete={() => setShouldScrollToEvents(false)}
        />
      );
    }

    switch (activeTab) {
      case 'home':
        return <HomePage selectedTickers={selectedTickers} onTickerClick={handleTickerClick} onEventClick={setSelectedEvent} onEventClickFromTimeline={handleEventClickFromTimeline} portfolioIntegration={portfolioIntegration} onSaveScrollPosition={handleSaveScrollPosition} hasRestoredScrollPosition={justRestored} onSaveStockScrollAndTab={handleSaveStockScrollAndTab} savedDashboardTab={savedDashboardTab} isRestoringStockPosition={isRestoringStockPosition} preloadedEventsData={preloadedEventsData} onTickerOrderChange={onTickerOrderChange} sortState={sortState} onSortStateChange={onSortStateChange} onAddTicker={onAddTicker} testingBadgeComponent={testingBadgeComponent} onPortfolioUpdate={onPortfolioUpdate} />;
      case 'copilot':
        return <CatalystCopilotScreen selectedTickers={selectedTickers} onTickerClick={handleTickerClick} onEventClick={setSelectedEvent} />;
      case 'search':
        return <DiscoveryScreen onTickerClick={handleTickerClick} onEventClick={setSelectedEvent} onAIRecommendationsClick={() => setShowAIRecommendations(true)} selectedTickers={selectedTickers} onAddTicker={onAddTicker} />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <HomePage selectedTickers={selectedTickers} onTickerClick={handleTickerClick} onEventClick={setSelectedEvent} onEventClickFromTimeline={handleEventClickFromTimeline} portfolioIntegration={portfolioIntegration} onSaveScrollPosition={handleSaveScrollPosition} hasRestoredScrollPosition={justRestored} onSaveStockScrollAndTab={handleSaveStockScrollAndTab} savedDashboardTab={savedDashboardTab} isRestoringStockPosition={isRestoringStockPosition} preloadedEventsData={preloadedEventsData} onTickerOrderChange={onTickerOrderChange} sortState={sortState} onSortStateChange={onSortStateChange} onAddTicker={onAddTicker} testingBadgeComponent={testingBadgeComponent} />;
    }
  };

  return (
    <div className="overflow-x-hidden w-full max-w-full">
      {/* Content with smooth transition - hide during position restoration to prevent flash */}
      <div 
        className={`transition-opacity duration-75 overflow-x-hidden w-full max-w-full mx-auto lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl lg:px-6 ${
          isRestoringPosition && activeTab === 'home' && !selectedEvent ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {renderContent()}
      </div>
      
      {!stockInfoTicker && !selectedEvent && !showAIRecommendations && <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />}
    </div>
  );
}