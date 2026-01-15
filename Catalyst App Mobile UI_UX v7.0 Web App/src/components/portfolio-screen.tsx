import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, TrendingUp, TrendingDown, Settings, ExternalLink, Filter, Search, MoreVertical, BarChart3, Eye, EyeOff, Wallet, Link, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { MarketStatusBadge } from './market-status-badge';
import { PositionDetailsScreen } from './position-details-screen';
import { PortfolioSettingsScreen } from './portfolio-settings-screen';
import { AddAccountScreen } from './add-account-screen';
import { ManualPortfolioSetup } from './manual-portfolio-setup';
import { PlaidLinkModal } from './plaid-link-modal';
import { PortfolioChart } from './portfolio-chart';
import DataService, { StockData } from '../utils/data-service';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Position {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  value: number;
  dayChange: number;
  dayChangePercent: number;
  totalReturn: number;
  totalReturnPercent: number;
  lastCatalyst?: string;
  catalystImpact?: 'positive' | 'negative' | 'neutral';
  accountName: string;
}

// Generate realistic positions from portfolio integration data
const generatePositionsFromPortfolio = async (portfolioIntegration: any, manualPositions: any[]): Promise<Position[]> => {
  if (!portfolioIntegration?.enabled) {
    return [];
  }

  const positions: Position[] = [];
  const catalysts = {
    'AAPL': { catalyst: 'Vision Pro Launch', impact: 'positive' as const },
    'NVDA': { catalyst: 'Q4 Earnings Beat', impact: 'positive' as const },
    'TSLA': { catalyst: 'Cybertruck Update', impact: 'neutral' as const },
    'META': { catalyst: 'AI Investment', impact: 'positive' as const },
    'MRNA': { catalyst: 'FDA Approval', impact: 'positive' as const },
    'AMZN': { catalyst: 'AWS Growth', impact: 'positive' as const }
  };

  // Get all required stock symbols
  const allSymbols = new Set<string>();
  manualPositions.forEach(pos => allSymbols.add(pos.symbol));
  if (portfolioIntegration.portfolioTickers) {
    portfolioIntegration.portfolioTickers.forEach((ticker: string) => allSymbols.add(ticker));
  }

  // Fetch stock data for all symbols
  let stocksData: Record<string, StockData> = {};
  if (allSymbols.size > 0) {
    try {
      stocksData = await DataService.getStocks(Array.from(allSymbols));
    } catch (error) {
      console.error('Error fetching stock data:', error);
      // Return manual positions with placeholder data if API fails
      return manualPositions.map(manualPos => ({
        id: manualPos.id,
        symbol: manualPos.symbol,
        name: manualPos.name,
        shares: manualPos.shares,
        avgCost: manualPos.avgCost,
        currentPrice: manualPos.avgCost, // Use avg cost as placeholder
        value: manualPos.shares * manualPos.avgCost,
        dayChange: 0,
        dayChangePercent: 0,
        totalReturn: 0,
        totalReturnPercent: 0,
        accountName: 'Manual Entry'
      }));
    }
  }

  // Always add manual positions if they exist
  if (manualPositions.length > 0) {
    manualPositions.forEach((manualPos) => {
      const stockData = stocksData[manualPos.symbol];
      if (!stockData) {
        // Add position with placeholder data if stock data not available
        positions.push({
          id: manualPos.id,
          symbol: manualPos.symbol,
          name: manualPos.name,
          shares: manualPos.shares,
          avgCost: manualPos.avgCost,
          currentPrice: manualPos.avgCost, // Use avg cost as placeholder
          value: manualPos.shares * manualPos.avgCost,
          dayChange: 0,
          dayChangePercent: 0,
          totalReturn: 0,
          totalReturnPercent: 0,
          accountName: 'Manual Entry'
        });
        return;
      }

      const value = manualPos.shares * stockData.currentPrice;
      const totalReturn = (stockData.currentPrice - manualPos.avgCost) * manualPos.shares;
      const totalReturnPercent = (totalReturn / (manualPos.avgCost * manualPos.shares)) * 100;
      const dayChange = manualPos.shares * stockData.priceChange;

      positions.push({
        id: manualPos.id,
        symbol: manualPos.symbol,
        name: manualPos.name,
        shares: manualPos.shares,
        avgCost: manualPos.avgCost,
        currentPrice: stockData.currentPrice,
        value,
        dayChange,
        dayChangePercent: stockData.priceChangePercent,
        totalReturn,
        totalReturnPercent,
        lastCatalyst: catalysts[manualPos.symbol as keyof typeof catalysts]?.catalyst,
        catalystImpact: catalysts[manualPos.symbol as keyof typeof catalysts]?.impact,
        accountName: 'Manual Entry'
      });
    });
  }

  // Add Plaid/auto positions if they exist
  if (portfolioIntegration.portfolioTickers && portfolioIntegration.connectedAccounts) {
    const { portfolioTickers, connectedAccounts } = portfolioIntegration;
    const manualSymbols = new Set(manualPositions.map(pos => pos.symbol));

    // Specific holdings for test portfolio
    const specificHoldings: Record<string, { shares: number; avgCost: number }> = {
      'TSLA': { shares: 10, avgCost: 453.14 },
      'MNMD': { shares: 200, avgCost: 13.45 },
      'TMC': { shares: 500, avgCost: 6.42 }
    };

    // Create realistic positions for each ticker that's not already manually added
    portfolioTickers.forEach((ticker: string, index: number) => {
      // Skip if we already have this symbol from manual entry
      if (manualSymbols.has(ticker)) return;
      
      const stockData = stocksData[ticker];
      if (!stockData) return;

      // Use specific holdings if available, otherwise generate realistic position data
      const positionData = specificHoldings[ticker] || {
        shares: Math.floor(Math.random() * 200) + 10, // 10-210 shares
        avgCost: stockData.currentPrice * (0.7 + Math.random() * 0.6) // 70% to 130% of current price
      };
      
      const shares = positionData.shares;
      const avgCost = positionData.avgCost;
      const value = shares * stockData.currentPrice;
      const totalReturn = (stockData.currentPrice - avgCost) * shares;
      const totalReturnPercent = (totalReturn / (avgCost * shares)) * 100;
      const dayChange = shares * stockData.priceChange;
      
      // Assign to connected account (cycle through accounts if multiple)
      const accountName = connectedAccounts && connectedAccounts.length > 0 
        ? connectedAccounts[index % connectedAccounts.length].institution || `Account ${index + 1}`
        : `Account ${Math.floor(index / 3) + 1}`;

      positions.push({
        id: `plaid-${ticker}-${index}`,
        symbol: ticker,
        name: stockData.company,
        shares,
        avgCost,
        currentPrice: stockData.currentPrice,
        value,
        dayChange,
        dayChangePercent: stockData.priceChangePercent,
        totalReturn,
        totalReturnPercent,
        lastCatalyst: catalysts[ticker as keyof typeof catalysts]?.catalyst,
        catalystImpact: catalysts[ticker as keyof typeof catalysts]?.impact,
        accountName
      });
    });
  }

  return positions.sort((a, b) => b.value - a.value); // Sort by value
};

type PortfolioView = 'overview' | 'position-details' | 'settings' | 'add-account' | 'manual-setup';

interface PortfolioScreenProps {
  onTickerClick?: (ticker: string) => void;
  portfolioIntegration?: {
    enabled: boolean;
    method: 'auto' | 'manual';
    portfolioTickers?: string[];
    connectedAccounts?: any[];
  } | null;
  onPortfolioUpdate?: (portfolioData: any) => void;
  selectedTickers?: string[];
}

export function PortfolioScreen({ onTickerClick, portfolioIntegration, onPortfolioUpdate, selectedTickers = [] }: PortfolioScreenProps) {
  const [currentView, setCurrentView] = useState<PortfolioView>('overview');
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBalances, setShowBalances] = useState(true);
  const [sortBy, setSortBy] = useState<'value' | 'return' | 'dayChange'>('value');
  const [showPlaidModal, setShowPlaidModal] = useState(false);
  const [portfolioData, setPortfolioData] = useState(portfolioIntegration);
  const [manualPositions, setManualPositions] = useState<any[]>([]);
  const [allPositions, setAllPositions] = useState<Position[]>([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);
  const [isAccountsExpanded, setIsAccountsExpanded] = useState(false);

  // Scroll to top when view changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentView]);

  // Load positions when portfolio data or manual positions change
  useEffect(() => {
    const loadPositions = async () => {
      if (!portfolioData?.enabled) {
        setAllPositions([]);
        return;
      }

      setIsLoadingPositions(true);
      try {
        const positions = await generatePositionsFromPortfolio(portfolioData, manualPositions);
        setAllPositions(positions);
      } catch (error) {
        console.error('Error loading positions:', error);
        setAllPositions([]);
      } finally {
        setIsLoadingPositions(false);
      }
    };

    loadPositions();
  }, [portfolioData, manualPositions]);

  const hasConnectedPortfolio = portfolioData?.enabled && allPositions.length > 0;

  const totalValue = allPositions.reduce((sum, pos) => sum + pos.value, 0);
  const totalDayChange = allPositions.reduce((sum, pos) => sum + pos.dayChange, 0);
  const totalDayChangePercent = totalValue > 0 ? (totalDayChange / (totalValue - totalDayChange)) * 100 : 0;
  const totalReturn = allPositions.reduce((sum, pos) => sum + pos.totalReturn, 0);
  const totalReturnPercent = totalValue > 0 ? (totalReturn / (totalValue - totalReturn)) * 100 : 0;

  const filteredPositions = allPositions
    .filter(pos => 
      pos.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pos.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'value': return b.value - a.value;
        case 'return': return b.totalReturnPercent - a.totalReturnPercent;
        case 'dayChange': return b.dayChangePercent - a.dayChangePercent;
        default: return 0;
      }
    });

  const handlePlaidSuccess = (plaidData: { holdings: string[]; accountInfo: any }) => {
    // Update portfolio data with new connection
    const existingAccounts = portfolioData?.connectedAccounts || [];
    const existingTickers = portfolioData?.portfolioTickers || [];
    
    const updatedPortfolioData = {
      enabled: true,
      method: 'auto' as const,
      portfolioTickers: [...new Set([...existingTickers, ...plaidData.holdings])], // Remove duplicates
      connectedAccounts: [...existingAccounts, plaidData.accountInfo]
    };
    setPortfolioData(updatedPortfolioData);
    onPortfolioUpdate?.(updatedPortfolioData);
    setShowPlaidModal(false);
  };

  const handleRemoveAccount = async (accountIndex: number) => {
    if (!portfolioData?.connectedAccounts) return;

    const accountToRemove = portfolioData.connectedAccounts[accountIndex];
    const connectionId = accountToRemove?.connectionId;

    if (connectionId) {
      // Call backend to delete the Plaid connection
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-fe0a490e/plaid/connections/${connectionId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to disconnect account');
        }
      } catch (error) {
        console.error('Error disconnecting account:', error);
        // Continue with local removal even if backend call fails
      }
    }

    // Remove account from connected accounts list
    const updatedAccounts = portfolioData.connectedAccounts.filter((_, index) => index !== accountIndex);
    
    // If no more accounts, clear portfolio or keep manual positions
    const updatedPortfolioData = updatedAccounts.length === 0 
      ? { 
          enabled: true, 
          method: 'manual' as const, 
          portfolioTickers: [],
          connectedAccounts: []
        }
      : {
          ...portfolioData,
          connectedAccounts: updatedAccounts
        };

    setPortfolioData(updatedPortfolioData);
    onPortfolioUpdate?.(updatedPortfolioData);
  };

  const handleManualPositionsComplete = (positions: any[]) => {
    // Add new positions to existing manual positions
    const updatedManualPositions = [...manualPositions, ...positions];
    setManualPositions(updatedManualPositions);
    setCurrentView('overview');
    
    // Update portfolio data - if we already have manual positions, maintain existing method
    // If we have auto positions, create a mixed portfolio setup
    const updatedPortfolioData = {
      enabled: true,
      method: portfolioData?.method === 'auto' ? 'auto' as const : 'manual' as const,
      portfolioTickers: [
        ...(portfolioData?.portfolioTickers || []),
        ...positions.map(p => p.symbol)
      ],
      connectedAccounts: portfolioData?.connectedAccounts || []
    };
    setPortfolioData(updatedPortfolioData);
    onPortfolioUpdate?.(updatedPortfolioData);
  };

  if (currentView === 'position-details' && selectedPosition) {
    return (
      <PositionDetailsScreen 
        position={selectedPosition}
        onBack={() => setCurrentView('overview')}
      />
    );
  }

  if (currentView === 'settings') {
    return <PortfolioSettingsScreen onBack={() => setCurrentView('overview')} />;
  }

  if (currentView === 'add-account') {
    return <AddAccountScreen onBack={() => setCurrentView('overview')} />;
  }

  if (currentView === 'manual-setup') {
    return (
      <ManualPortfolioSetup 
        onBack={() => setCurrentView('overview')}
        onComplete={handleManualPositionsComplete}
        isAddingToExisting={hasConnectedPortfolio}
      />
    );
  }

  // Handle case where no portfolio is connected
  if (!hasConnectedPortfolio) {
    return (
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-40">
          <div className="px-4 py-4">
            <div className="grid grid-cols-3 items-center mb-4">
              {/* Left spacer */}
              <div className="flex justify-start">
              </div>
              
              {/* Centered Title */}
              <h1 className="text-[20px] font-medium text-center">Portfolio</h1>
              
              {/* Right Actions */}
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentView('settings')}
                  className="h-8 w-8 p-0"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State - No Portfolio Connected */}
        <div className="px-4 py-8">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-ai-accent/10 rounded-full flex items-center justify-center mx-auto">
              <Wallet className="w-10 h-10 text-ai-accent" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Connect Your Portfolio</h2>
              <p className="text-muted-foreground leading-relaxed">
                Link your brokerage account to automatically track catalysts for your holdings and get personalized insights.
              </p>
            </div>

            <div className="space-y-3 max-w-sm mx-auto">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-positive rounded-full" />
                <span>Secure read-only access via Plaid</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-positive rounded-full" />
                <span>Auto-sync your holdings</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-positive rounded-full" />
                <span>Portfolio-based catalyst insights</span>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <Button
                onClick={() => setShowPlaidModal(true)}
                className="bg-ai-accent hover:bg-ai-accent/90 text-primary-foreground w-full max-w-sm"
                size="lg"
              >
                <Link className="w-4 h-4 mr-2" />
                Connect with Plaid
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setCurrentView('manual-setup')}
                className="w-full max-w-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Manual Setup
              </Button>
            </div>
          </div>
        </div>

        {/* Plaid Modal */}
        <PlaidLinkModal
          isOpen={showPlaidModal}
          onSuccess={handlePlaidSuccess}
          onClose={() => setShowPlaidModal(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-40">
        <div className="px-4 py-4 pt-[16px] pr-[16px] pb-[0px] pl-[16px] border-b-0 m-[0px]">
          <div className="grid grid-cols-3 items-center mb-4">
            {/* Left spacer */}
            <div className="flex justify-start">
            </div>
            
            {/* Centered Title */}
            <h1 className="text-[20px] font-medium text-center">Portfolio</h1>
            
            {/* Right Actions */}
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBalances(!showBalances)}
                className="h-8 w-8 p-0"
              >
                {showBalances ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentView('settings')}
                className="h-8 w-8 p-0"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>


        </div>
      </div>

      {/* Portfolio Content */}
      <div className="px-4">
        {/* Portfolio Chart */}
        <div className="mt-2 mb-4">
          <PortfolioChart 
            portfolioIntegration={portfolioData}
            selectedTickers={selectedTickers}
            isFilterEnabled={false}
          />
        </div>

        {/* Collapsible Connected Accounts Section */}
        <Card 
          className="mb-4 bg-gradient-to-r from-ai-accent/5 to-ai-accent/10 border-ai-accent/20 cursor-pointer"
          onClick={() => setIsAccountsExpanded(!isAccountsExpanded)}
        >
          <div className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link className="w-4 h-4 text-ai-accent" />
                <span className="text-sm font-medium">Connected Accounts</span>
                <Badge variant="secondary" className="text-xs">
                  {(portfolioData?.connectedAccounts?.length || 0) + (manualPositions.length > 0 ? 1 : 0)}
                </Badge>
              </div>
              {isAccountsExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            
            {/* Expanded Content */}
            {isAccountsExpanded && (
              <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                {/* Connected Plaid Accounts */}
                {portfolioData?.connectedAccounts && portfolioData.connectedAccounts.length > 0 && (
                  <>
                    {portfolioData.connectedAccounts.map((account, index) => {
                      // Get account name - prefer official name, then regular name
                      let accountName = account.accounts?.[0]?.officialName || 
                                       account.accounts?.[0]?.name || 
                                       '';
                      
                      // Clean up Plaid sandbox naming (remove "Plaid" prefix)
                      accountName = accountName.replace(/^Plaid\s+/i, '');
                      
                      // Get account subtype for fallback
                      const accountSubtype = account.accounts?.[0]?.subtype || 
                                            account.accountType || 
                                            '';
                      
                      // Format subtype nicely as fallback
                      const formattedSubtype = accountSubtype
                        .replace(/_/g, ' ')
                        .split(' ')
                        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                      
                      // Use formatted subtype as fallback if no clean name available
                      const displayName = accountName || formattedSubtype || 'Investment Account';
                      
                      return (
                        <div 
                          key={index} 
                          className="flex items-center justify-between bg-background/50 rounded-lg px-3 py-2 border border-border/50"
                        >
                          <div className="text-xs">
                            <div className="font-medium text-foreground">{account.institution}</div>
                            <div className="text-muted-foreground">{displayName}</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveAccount(index);
                            }}
                            className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                            title="Disconnect account"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </>
                )}
                
                {/* Manual Entry Account */}
                {manualPositions.length > 0 && (
                  <div className="flex items-center justify-between bg-background/50 rounded-lg px-3 py-2 border border-border/50">
                    <div className="text-xs">
                      <div className="font-medium text-foreground">Manual Entry</div>
                      <div className="text-muted-foreground">{manualPositions.length} position{manualPositions.length !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="pt-2 space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPlaidModal(true);
                    }}
                  >
                    <Link className="h-3.5 w-3.5 mr-2" />
                    Connect Broker Account
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentView('manual-setup');
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-2" />
                    Add Manual Position
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>



          {/* Search and Filter */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search positions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSortBy('value')}>
                  Sort by Value
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('return')}>
                  Sort by Return
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('dayChange')}>
                  Sort by Day Change
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

        {/* Positions List */}
        <div className="space-y-3">
        {filteredPositions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No positions found</p>
            <Button onClick={() => setCurrentView('add-account')}>
              <Plus className="h-4 w-4 mr-2" />
              Connect Account
            </Button>
          </div>
        ) : (
          filteredPositions.map((position) => (
            <Card
              key={position.id}
              className="p-3 cursor-pointer hover:bg-accent/50 transition-colors mt-[0px] mr-[0px] mb-[12px] ml-[0px] px-[16px] py-[12px] rounded-[12px]"
              onClick={() => {
                setSelectedPosition(position);
                setCurrentView('position-details');
              }}
            >
              {/* Top Row: Ticker & Company Name (left) | Market Value & Day Change (right) */}
              <div className="flex items-start justify-between mb-3 m-[0px]">
                {/* Left: Ticker & Company Name */}
                <div className="flex flex-col gap-1">
                  <Badge 
                    className="bg-ai-accent text-primary-foreground text-xs cursor-pointer hover:bg-ai-accent/80 w-fit rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTickerClick?.(position.symbol);
                    }}
                  >
                    {position.symbol}
                  </Badge>
                  <div className="text-sm text-foreground">
                    {position.name.replace(/,?\s+(Inc\.?|Corp\.?|Corporation|Co\.?|Company|Ltd\.?|Limited|LLC|PLC|SA|AG|NV|SE|Group)$/i, '').trim()}
                  </div>
                </div>
                
                {/* Right: Market Value & Day Change */}
                <div className="text-right">
                  <div className="font-medium">
                    {showBalances ? `$${position.value.toLocaleString()}` : '$••••••'}
                  </div>
                  <div className={`text-sm ${position.dayChangePercent >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {showBalances ? (
                      <>
                        {position.dayChangePercent >= 0 ? '+' : '-'}${Math.abs(position.dayChange).toFixed(2)} ({position.dayChangePercent >= 0 ? '+' : ''}{position.dayChangePercent.toFixed(2)}%)
                      </>
                    ) : (
                      '••••••'
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Grid: Shares, Avg Cost, Total Gain/Loss */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs">Shares</div>
                  <div>{showBalances ? position.shares.toLocaleString() : '•••'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Avg Cost</div>
                  <div>{showBalances ? `$${position.avgCost.toFixed(2)}` : '$••••'}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Total Gain/Loss</div>
                  <div className={position.totalReturnPercent >= 0 ? 'text-positive' : 'text-negative'}>
                    {showBalances ? (
                      <>
                        {position.totalReturnPercent >= 0 ? '+' : '-'}${Math.abs(position.totalReturn).toLocaleString()}
                      </>
                    ) : (
                      '••••••'
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Total Return %</div>
                  <div className={position.totalReturnPercent >= 0 ? 'text-positive' : 'text-negative'}>
                    {showBalances ? `${position.totalReturnPercent >= 0 ? '+' : ''}${position.totalReturnPercent.toFixed(2)}%` : '••••%'}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
        </div>
      </div>

      {/* Plaid Modal */}
      <PlaidLinkModal
        isOpen={showPlaidModal}
        onSuccess={handlePlaidSuccess}
        onClose={() => setShowPlaidModal(false)}
      />
    </div>
  );
}