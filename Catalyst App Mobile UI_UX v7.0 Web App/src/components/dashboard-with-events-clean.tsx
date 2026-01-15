import { useState, useEffect } from 'react';
import { MarketEvent } from '../utils/supabase/events-api';
import { SortState, HomeStocksList } from './focus-stocks-list';
import { useDarkMode } from '../utils/dark-mode-context';
import { CalendarMonthGrid } from './calendar-month-grid';
import { NewTodaySection } from './new-today-section';
import { PortfolioChart } from './portfolio-chart';
import { ExternalAccountsSection } from './external-accounts-section';
import { WatchlistSection } from './watchlist-section';
import DataService, { StockData } from '../utils/data-service';
import { getCurrentTime } from '../utils/current-time';
import { Filter, X, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from './ui/dropdown-menu';
import { TestingMenu } from './testing-menu';

interface HomePageProps {
  selectedTickers: string[];
  onTickerClick: (ticker: string) => void;
  onEventClick: (event: MarketEvent) => void;
  onEventClickFromTimeline?: (event: MarketEvent) => void;
  portfolioIntegration?: {
    enabled: boolean;
    method: 'auto' | 'manual';
    portfolioTickers?: string[];
    connectedAccounts?: any[];
  } | null;
  onSaveScrollPosition?: (position: number) => void;
  hasRestoredScrollPosition?: boolean;
  onSaveStockScrollAndTab?: (stockScroll: number, dashboardTab: string) => void;
  savedDashboardTab?: string | null;
  isRestoringStockPosition?: boolean;
  preloadedEventsData?: Record<string, MarketEvent[]>;
  onTickerOrderChange?: (tickers: string[]) => void;
  sortState?: SortState;
  onSortStateChange?: (sortState: SortState) => void;
  onAddTicker?: (ticker: string) => void;
  testingBadgeComponent?: React.ReactNode;
  onPortfolioUpdate?: (portfolioData: any) => void;
}

export function HomePage({
  selectedTickers,
  onTickerClick,
  onEventClick,
  onEventClickFromTimeline,
  portfolioIntegration,
  onSaveScrollPosition,
  hasRestoredScrollPosition,
  onSaveStockScrollAndTab,
  savedDashboardTab,
  isRestoringStockPosition,
  preloadedEventsData = {},
  onTickerOrderChange,
  sortState,
  onSortStateChange,
  onAddTicker,
  testingBadgeComponent,
  onPortfolioUpdate
}: HomePageProps) {
  const { darkMode } = useDarkMode();
  const [selectedTimeRange, setSelectedTimeRange] = useState('1M');
  const [activeTab, setActiveTab] = useState('focus');
  const [eventsLoading, setEventsLoading] = useState(true);
  const [localSortState, setLocalSortState] = useState<SortState>(sortState || { method: null, direction: 'desc' });
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  
  // Stock data for calculating global y-scale
  const [stocksData, setStocksData] = useState<Record<string, StockData>>({});
  const [globalMaxPercentChange, setGlobalMaxPercentChange] = useState<number | undefined>(undefined);

  // Calendar state
  const [homeTab, setHomeTab] = useState<'focus' | 'calendar' | 'news'>('focus');
  const [calendarEvents, setCalendarEvents] = useState<MarketEvent[]>([]);
  const currentYear = getCurrentTime().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Combine selected tickers with portfolio tickers for calendar
  const allTickers = portfolioIntegration?.enabled && portfolioIntegration.portfolioTickers
    ? [...new Set([...selectedTickers, ...portfolioIntegration.portfolioTickers])]
    : selectedTickers;

  const timeRanges = [
    { label: '1M', value: '1M' },
    { label: '3M', value: '3M' },
    { label: '6M', value: '6M' },
  ];

  // Sync local sort state with parent
  useEffect(() => {
    if (sortState) {
      setLocalSortState(sortState);
    }
  }, [sortState]);

  // Restore saved dashboard tab
  useEffect(() => {
    if (savedDashboardTab) {
      setActiveTab(savedDashboardTab);
    }
  }, [savedDashboardTab]);

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (onSaveStockScrollAndTab) {
      onSaveStockScrollAndTab(0, tab);
    }
  };

  // Callback from sort modal
  const handleSortStateChange = (newSortState: SortState) => {
    setLocalSortState(newSortState);
    if (onSortStateChange) {
      onSortStateChange(newSortState);
    }
  };

  // Fetch calendar events
  useEffect(() => {
    const fetchEvents = async () => {
      const fetchedEvents = await DataService.getEventsByTickers(allTickers);
      setCalendarEvents(fetchedEvents || []);
    };

    if (homeTab === 'calendar') {
      fetchEvents();
    }
  }, [allTickers, homeTab]);

  // Fetch stock data for calculating global y-scale
  useEffect(() => {
    const fetchStockData = async () => {
      if (selectedTickers.length === 0) return;
      
      try {
        const data = await DataService.getStocks(selectedTickers);
        if (data) {
          setStocksData(data);
          
          // Calculate global max percent change across all tickers
          const percentageChanges: number[] = [];
          Object.values(data).forEach(stock => {
            if (stock && stock.previousClose && stock.previousClose !== 0) {
              const changePercent = ((stock.currentPrice - stock.previousClose) / stock.previousClose) * 100;
              percentageChanges.push(Math.abs(changePercent));
            }
          });
          
          const maxChange = percentageChanges.length > 0 ? Math.max(...percentageChanges) : undefined;
          setGlobalMaxPercentChange(maxChange);
          console.log('[Dashboard] Global max percent change:', maxChange);
        }
      } catch (error) {
        console.error('Error fetching stock data for global y-scale:', error);
      }
    };

    if (homeTab === 'focus' && selectedTickers.length > 0) {
      fetchStockData();
    }
  }, [selectedTickers.join(','), homeTab]); // Use join to compare array contents

  // Calendar filter functions
  const availableCompanies = [...new Set(calendarEvents.map(e => e.ticker))].sort();
  const availableEventTypes = [...new Set(calendarEvents.map(e => e.type))].sort();

  const filteredCalendarEvents = calendarEvents.filter(event => {
    const companyMatch = selectedCompanies.length === 0 || selectedCompanies.includes(event.ticker);
    const eventTypeMatch = selectedEventTypes.length === 0 || selectedEventTypes.includes(event.type);
    return companyMatch && eventTypeMatch;
  });

  const toggleCompanyFilter = (ticker: string) => {
    setSelectedCompanies(prev => 
      prev.includes(ticker) 
        ? prev.filter(t => t !== ticker)
        : [...prev, ticker]
    );
  };

  const toggleEventTypeFilter = (type: string) => {
    setSelectedEventTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const clearAllFilters = () => {
    setSelectedCompanies([]);
    setSelectedEventTypes([]);
  };

  const activeFilterCount = selectedCompanies.length + selectedEventTypes.length;

  // Testing menu handlers (these are placeholders - they should be passed from App.tsx)
  const handleDatabaseSetup = () => {
    console.log('Database setup clicked');
  };

  const handleForceRefresh = () => {
    window.location.reload();
  };

  const handleRestartOnboarding = () => {
    console.log('Restart onboarding clicked');
  };

  const handleTestMode = () => {
    console.log('Test mode clicked');
  };

  const handleCatalystDebug = () => {
    console.log('Catalyst debug clicked');
  };

  const handleCatalystDotDebug = () => {
    console.log('Catalyst dot debug clicked');
  };

  const handleDebugRunner = () => {
    console.log('Debug runner clicked');
  };

  const handleEventDataDebug = () => {
    console.log('Event data debug clicked');
  };

  const handleScrollChartDebug = () => {
    console.log('Scroll chart debug clicked');
  };

  return (
    <div className="relative max-w-5xl mx-auto pb-[100px] pt-[12px] px-[20px] lg:px-[44px]">
      {/* Testing badge in top right */}
      {testingBadgeComponent}
      
      {/* Header with Settings Button */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-40 px-[16px] pb-[0px] pt-[12px] pr-[16px] pl-[16px] py-[0px] m-[0px]">
        <div className="flex justify-end">
          {/* Settings Button */}
          <div>
            <DropdownMenu open={showSettingsMenu} onOpenChange={setShowSettingsMenu}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0 px-[10px] py-[0px]"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <TestingMenu
                  dataServiceReady={true}
                  onDatabaseSetup={handleDatabaseSetup}
                  onForceRefresh={handleForceRefresh}
                  onRestartOnboarding={handleRestartOnboarding}
                  onTestMode={handleTestMode}
                  onCatalystDebug={handleCatalystDebug}
                  onCatalystDotDebug={handleCatalystDotDebug}
                  onDebugRunner={handleDebugRunner}
                  onEventDataDebug={handleEventDataDebug}
                  onScrollChartDebug={handleScrollChartDebug}
                  onClose={() => setShowSettingsMenu(false)}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Portfolio Chart - Above tabs */}
      {portfolioIntegration?.enabled && (
        <div className="mb-4 overflow-visible">
          <PortfolioChart 
            portfolioIntegration={portfolioIntegration}
            selectedTickers={selectedTickers}
            isFilterEnabled={false}
            onPortfolioUpdate={onPortfolioUpdate}
          />
        </div>
      )}

      {/* Tab Toggle Header */}
      <div className="flex items-center mb-3">
        <button
          onClick={() => setHomeTab('news')}
          className={`flex-1 text-[16px] transition-colors pb-2 ${
            homeTab === 'news' 
              ? 'text-foreground font-semibold border-b-2 border-foreground' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          News
        </button>
        <button
          onClick={() => setHomeTab('focus')}
          className={`flex-1 text-[16px] transition-colors pb-2 ${
            homeTab === 'focus' 
              ? 'text-foreground font-semibold border-b-2 border-foreground' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Focus Stocks
        </button>
        <button
          onClick={() => setHomeTab('calendar')}
          className={`flex-1 text-[16px] transition-colors pb-2 ${
            homeTab === 'calendar' 
              ? 'text-foreground font-semibold border-b-2 border-foreground' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Calendar
        </button>
      </div>

      {/* Focus Stocks Tab Content */}
      {homeTab === 'focus' && (
        <>
          <HomeStocksList
            selectedTickers={selectedTickers}
            onTickerClick={onTickerClick}
            onEventClick={onEventClick}
            preloadedEventsData={preloadedEventsData}
            onTickerOrderChange={onTickerOrderChange}
            sortState={localSortState}
            onSortStateChange={handleSortStateChange}
            onAddTicker={onAddTicker}
            portfolioIntegration={portfolioIntegration}
            stocksData={stocksData}
            globalMaxPercentChange={globalMaxPercentChange}
          />

          {/* External Accounts Section */}
          <div className="mt-6 px-4">
            <ExternalAccountsSection
              portfolioIntegration={portfolioIntegration}
              onPortfolioUpdate={onPortfolioUpdate}
            />
          </div>

          {/* Watchlist Section - Below External Accounts */}
          <div className="mt-6">
            <WatchlistSection
              selectedTickers={selectedTickers}
              portfolioIntegration={portfolioIntegration}
              preloadedEventsData={preloadedEventsData}
              onTickerClick={onTickerClick}
              onEventClick={onEventClick}
              globalMaxPercentChange={globalMaxPercentChange}
            />
          </div>
        </>
      )}

      {/* News Tab Content */}
      {homeTab === 'news' && (
        <NewTodaySection 
          preloadedEventsData={preloadedEventsData}
          onEventClick={onEventClick}
        />
      )}

      {/* Calendar Tab Content */}
      {homeTab === 'calendar' && (
        <div>
          {/* Filter Button */}
          <div className="mb-3 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-[12px] relative py-[0px]"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              <span className="text-sm">Filter</span>
              {activeFilterCount > 0 && (
                <span className="ml-2 bg-foreground text-background text-[10px] rounded-full h-4 px-1.5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="border border-border rounded-lg p-4 mb-4 bg-background">
              <div className="space-y-3">
                {/* Companies Filter */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Companies</span>
                    {selectedCompanies.length > 0 && (
                      <button
                        onClick={() => setSelectedCompanies([])}
                        className="text-xs text-foreground/60 hover:text-foreground"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableCompanies.map(ticker => (
                      <button
                        key={ticker}
                        onClick={() => toggleCompanyFilter(ticker)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          selectedCompanies.includes(ticker)
                            ? 'bg-foreground text-background'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {ticker}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Event Types Filter */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Event Types</span>
                    {selectedEventTypes.length > 0 && (
                      <button
                        onClick={() => setSelectedEventTypes([])}
                        className="text-xs text-foreground/60 hover:text-foreground"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableEventTypes.map(type => (
                      <button
                        key={type}
                        onClick={() => toggleEventTypeFilter(type)}
                        className={`px-2 py-1 rounded text-xs transition-colors capitalize ${
                          selectedEventTypes.includes(type)
                            ? 'bg-foreground text-background'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {type.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clear All Button */}
                {activeFilterCount > 0 && (
                  <div className="pt-1">
                    <button
                      onClick={clearAllFilters}
                      className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
                    >
                      <X className="h-3 w-3" />
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Calendar Month Grid */}
          <div className="pb-[40vh]">
            <CalendarMonthGrid
              events={filteredCalendarEvents}
              onMonthClick={() => {}}
              year={selectedYear}
              onYearChange={setSelectedYear}
              selectedTickers={allTickers}
              onTickerClick={onTickerClick}
              onEventClick={onEventClick}
            />
          </div>
        </div>
      )}
    </div>
  );
}