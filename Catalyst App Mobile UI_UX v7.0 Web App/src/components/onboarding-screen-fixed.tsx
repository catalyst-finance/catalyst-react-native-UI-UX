import { useState, useMemo, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { ChevronRight, TrendingUp, Zap, Target, Search, Check, Link, Wallet, Settings } from 'lucide-react';
import { PlaidLinkModal } from './plaid-link-modal';
import { useDarkMode } from '../utils/dark-mode-context';

interface OnboardingScreenProps {
  onComplete: (selectedTickers: string[], portfolioIntegration?: {
    enabled: boolean;
    method: 'auto' | 'manual';
    portfolioTickers?: string[];
    connectedAccounts?: any[];
  }) => void;
}

interface Stock {
  symbol: string;
  name: string;
  sector: string;
  marketCap?: string;
}

interface OnboardingCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  extendedDescription?: string;
  features: string[];
}

const onboardingCards: OnboardingCard[] = [
  {
    icon: <TrendingUp className="w-8 h-8 text-ai-accent" />,
    title: "See the events that move markets — and why",
    description: "Get insights on potential market-moving events before they happen. Track upcoming earnings, product launches, regulatory approvals, and more.",
    extendedDescription: "Proprietary AI interpretation engine analyzes publicly available sources—including SEC filings, press releases, earnings calendars, and legal proceedings—to extract what matters most to investors: what comes next.",
    features: ["Real-time event tracking", "Sentiment and impact analysis", "Personalized timeline", "Custom alerts"]
  },
  {
    icon: <Target className="w-8 h-8 text-ai-accent" />,
    title: "Pick your focus stocks to get started",
    description: "Select the stocks you want to track. You can always add more later.",
    features: ["Unlimited watchlist", "Smart recommendations", "Event notifications"]
  }
];

const stockDatabase: Stock[] = [
  // Technology
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', marketCap: '$3.0T' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', marketCap: '$2.8T' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', marketCap: '$1.7T' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Technology', marketCap: '$1.5T' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology', marketCap: '$1.8T' },
  { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Technology', marketCap: '$800B' },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Technology', marketCap: '$800B' },
  { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Technology', marketCap: '$180B' },
  { symbol: 'CRM', name: 'Salesforce Inc.', sector: 'Technology', marketCap: '$220B' },
  { symbol: 'ORCL', name: 'Oracle Corp.', sector: 'Technology', marketCap: '$320B' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology', marketCap: '$240B' },
  { symbol: 'INTC', name: 'Intel Corp.', sector: 'Technology', marketCap: '$200B' },
  { symbol: 'ADBE', name: 'Adobe Inc.', sector: 'Technology', marketCap: '$280B' },
  { symbol: 'NOW', name: 'ServiceNow Inc.', sector: 'Technology', marketCap: '$140B' },
  { symbol: 'PLTR', name: 'Palantir Technologies', sector: 'Technology', marketCap: '$40B' },
  
  // Healthcare & Biotech
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', marketCap: '$450B' },
  { symbol: 'PFE', name: 'Pfizer Inc.', sector: 'Healthcare', marketCap: '$200B' },
  { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare', marketCap: '$500B' },
  { symbol: 'MRNA', name: 'Moderna Inc.', sector: 'Healthcare', marketCap: '$35B' },
  { symbol: 'GILD', name: 'Gilead Sciences', sector: 'Healthcare', marketCap: '$85B' },
  { symbol: 'BIIB', name: 'Biogen Inc.', sector: 'Healthcare', marketCap: '$35B' },
  { symbol: 'REGN', name: 'Regeneron Pharmaceuticals', sector: 'Healthcare', marketCap: '$90B' },
  { symbol: 'VRTX', name: 'Vertex Pharmaceuticals', sector: 'Healthcare', marketCap: '$110B' },
  { symbol: 'AMGN', name: 'Amgen Inc.', sector: 'Healthcare', marketCap: '$140B' },
  { symbol: 'BMY', name: 'Bristol-Myers Squibb', sector: 'Healthcare', marketCap: '$110B' },
  
  // Financial Services
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financial', marketCap: '$480B' },
  { symbol: 'BAC', name: 'Bank of America Corp.', sector: 'Financial', marketCap: '$300B' },
  { symbol: 'WFC', name: 'Wells Fargo & Co.', sector: 'Financial', marketCap: '$180B' },
  { symbol: 'GS', name: 'Goldman Sachs Group', sector: 'Financial', marketCap: '$130B' },
  { symbol: 'MS', name: 'Morgan Stanley', sector: 'Financial', marketCap: '$150B' },
  { symbol: 'V', name: 'Visa Inc.', sector: 'Financial', marketCap: '$520B' },
  { symbol: 'MA', name: 'Mastercard Inc.', sector: 'Financial', marketCap: '$400B' },
  { symbol: 'AXP', name: 'American Express Co.', sector: 'Financial', marketCap: '$150B' },
  { symbol: 'BRK.A', name: 'Berkshire Hathaway', sector: 'Financial', marketCap: '$890B' },
  { symbol: 'COIN', name: 'Coinbase Global Inc.', sector: 'Financial', marketCap: '$45B' },
  
  // Consumer & Retail
  { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Consumer', marketCap: '$600B' },
  { symbol: 'HD', name: 'Home Depot Inc.', sector: 'Consumer', marketCap: '$400B' },
  { symbol: 'MCD', name: 'McDonald\'s Corp.', sector: 'Consumer', marketCap: '$220B' },
  { symbol: 'NKE', name: 'Nike Inc.', sector: 'Consumer', marketCap: '$160B' },
  { symbol: 'SBUX', name: 'Starbucks Corp.', sector: 'Consumer', marketCap: '$110B' },
  { symbol: 'TGT', name: 'Target Corp.', sector: 'Consumer', marketCap: '$70B' },
  { symbol: 'LOW', name: 'Lowe\'s Companies', sector: 'Consumer', marketCap: '$150B' },
  { symbol: 'COST', name: 'Costco Wholesale Corp.', sector: 'Consumer', marketCap: '$350B' },
  { symbol: 'DIS', name: 'Walt Disney Co.', sector: 'Consumer', marketCap: '$200B' },
  { symbol: 'BABA', name: 'Alibaba Group', sector: 'Consumer', marketCap: '$200B' },
  
  // Energy & Utilities
  { symbol: 'XOM', name: 'Exxon Mobil Corp.', sector: 'Energy', marketCap: '$430B' },
  { symbol: 'CVX', name: 'Chevron Corp.', sector: 'Energy', marketCap: '$300B' },
  { symbol: 'COP', name: 'ConocoPhillips', sector: 'Energy', marketCap: '$130B' },
  { symbol: 'SLB', name: 'Schlumberger Ltd.', sector: 'Energy', marketCap: '$65B' },
  { symbol: 'EOG', name: 'EOG Resources Inc.', sector: 'Energy', marketCap: '$70B' },
  { symbol: 'NEE', name: 'NextEra Energy Inc.', sector: 'Energy', marketCap: '$160B' },
  
  // Industrial & Materials
  { symbol: 'BA', name: 'Boeing Co.', sector: 'Industrial', marketCap: '$130B' },
  { symbol: 'CAT', name: 'Caterpillar Inc.', sector: 'Industrial', marketCap: '$160B' },
  { symbol: 'GE', name: 'General Electric Co.', sector: 'Industrial', marketCap: '$180B' },
  { symbol: 'UPS', name: 'United Parcel Service', sector: 'Industrial', marketCap: '$120B' },
  { symbol: 'FDX', name: 'FedEx Corp.', sector: 'Industrial', marketCap: '$70B' },
  { symbol: 'MMM', name: '3M Co.', sector: 'Industrial', marketCap: '$65B' }
];

const sectors = [
  'All',
  'Technology', 
  'Healthcare', 
  'Financial', 
  'Consumer', 
  'Energy', 
  'Industrial'
];

const popularTickers = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'NFLX'
];

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentCard, setCurrentCard] = useState(0);
  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('All');
  const [portfolioIntegrationMethod, setPortfolioIntegrationMethod] = useState<'auto' | 'manual' | null>('manual');
  const [plaidConnected, setPlaidConnected] = useState(false);
  const [portfolioTickers, setPortfolioTickers] = useState<string[]>([]);
  const [showPlaidModal, setShowPlaidModal] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState<any[]>([]);
  const { darkMode } = useDarkMode();

  // Scroll to top when card changes and ensure zoom stays at 100%
  useEffect(() => {
    window.scrollTo(0, 0);
    
    // Ensure zoom stays at 100% during onboarding
    document.documentElement.style.zoom = '1';
    document.body.style.zoom = '1';
  }, [currentCard]);

  const handleNext = () => {
    if (currentCard < onboardingCards.length - 1) {
      setCurrentCard(currentCard + 1);
    } else {
      // Ensure zoom is reset before completing onboarding
      document.documentElement.style.zoom = '1';
      document.body.style.zoom = '1';
      
      const portfolioIntegration = portfolioIntegrationMethod ? {
        enabled: plaidConnected,
        method: portfolioIntegrationMethod,
        portfolioTickers: portfolioTickers,
        connectedAccounts: connectedAccounts
      } : undefined;
      
      // Combine portfolio tickers + manually selected tickers
      const allTickers = portfolioIntegrationMethod === 'auto' && portfolioTickers.length > 0
        ? [...new Set([...portfolioTickers, ...selectedTickers])] // Combine portfolio + manual selections
        : selectedTickers; // Manual-only mode uses just selected tickers
      

      
      onComplete(allTickers, portfolioIntegration);
    }
  };

  const handlePlaidConnect = () => {
    setShowPlaidModal(true);
  };

  const handlePlaidSuccess = (portfolioData: { holdings: string[]; accountInfo: any }) => {
    // Add new account to the list
    setConnectedAccounts(prev => [...prev, portfolioData.accountInfo]);
    
    // Combine all holdings from all accounts
    const allHoldings = [...portfolioTickers, ...portfolioData.holdings];
    const uniqueHoldings = [...new Set(allHoldings)];
    setPortfolioTickers(uniqueHoldings);
    
    setPlaidConnected(true);
    setShowPlaidModal(false);
    
    // If auto mode, automatically add portfolio holdings to selected tickers
    if (portfolioIntegrationMethod === 'auto') {
      setSelectedTickers(prev => {
        const combined = [...prev, ...portfolioData.holdings];
        return [...new Set(combined)]; // Remove duplicates
      });
    }
  };

  const handlePrevious = () => {
    if (currentCard > 0) {
      setCurrentCard(currentCard - 1);
    }
  };

  const toggleTicker = (symbol: string) => {
    setSelectedTickers(prev => 
      prev.includes(symbol) 
        ? prev.filter(t => t !== symbol)
        : [...prev, symbol]
    );
  };

  const filteredStocks = useMemo(() => {
    let filtered = stockDatabase;
    
    if (selectedSector !== 'All') {
      filtered = filtered.filter(stock => stock.sector === selectedSector);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(stock => 
        stock.symbol.toLowerCase().includes(query) ||
        stock.name.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [searchQuery, selectedSector]);

  const popularStocks = stockDatabase.filter(stock => 
    popularTickers.includes(stock.symbol)
  );

  const isLastCard = currentCard === onboardingCards.length - 1;
  const isStockSelectionCard = currentCard === 1;

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col">
      {/* Progress dots at top */}
      <div className="flex justify-center mt-4 mb-4">
        <div className="flex space-x-1">
          {onboardingCards.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full ${
                index === currentCard ? 'bg-ai-accent' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Logo below progress */}
      <div className="flex justify-center mb-6">
        <img 
          src={darkMode 
            ? "https://lrlvxxyokajquyieshww.supabase.co/storage/v1/object/sign/application_assets/catalyst_logo_full_dark_11-11-25.svg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85YTAyZDhmMC1iY2FjLTQ3ZTAtOTExNy05MjRkMjRkODlkNGQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhcHBsaWNhdGlvbl9hc3NldHMvY2F0YWx5c3RfbG9nb19mdWxsX2RhcmtfMTEtMTEtMjUuc3ZnIiwiaWF0IjoxNzYyODg1NzM2LCJleHAiOjMzMjY3MzQ5NzM2fQ.Omp8dxCPyxhu3sKfz_K2eb_PrPTSzPfm4lPbYyBw-Tc"
            : "https://lrlvxxyokajquyieshww.supabase.co/storage/v1/object/sign/application_assets/catalyst_logo_full_light_11-11-25.svg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85YTAyZDhmMC1iY2FjLTQ3ZTAtOTExNy05MjRkMjRkODlkNGQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhcHBsaWNhdGlvbl9hc3NldHMvY2F0YWx5c3RfbG9nb19mdWxsX2xpZ2h0XzExLTExLTI1LnN2ZyIsImlhdCI6MTc2Mjg4NTY3OSwiZXhwIjozMzI2NzM0OTY3OX0.IEBRT7n6ODFS3gvBx2iJ5nY_XuqVsaK3mN7FrFeC6Co"
          }
          alt="Catalyst"
          className="h-24 w-auto"
        />
      </div>

      {/* Card Content */}
      <div className="flex-1 flex flex-col">
        <Card className="border-0 dark:border-0 shadow-none bg-transparent">
          <CardContent className="p-0 space-y-8">
            <div className="text-center space-y-5">
              <div className="space-y-4">
                <h2 className="text-xl text-foreground px-4 text-center mt-[-20px] mr-[0px] mb-[15px] ml-[0px]">
                  {onboardingCards[currentCard].title}
                </h2>
                <p className="text-muted-foreground px-4 leading-relaxed text-left">
                  {onboardingCards[currentCard].description}
                </p>
              </div>
              
              <div className="space-y-4">
                {onboardingCards[currentCard].features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3 px-4">
                    <div className="w-2 h-2 bg-positive rounded-full" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </div>
                ))}
              </div>
              
              {onboardingCards[currentCard].extendedDescription && (
                <div className="px-4 pt-2">
                  <p className="text-muted-foreground leading-relaxed text-sm text-left">
                    {onboardingCards[currentCard].extendedDescription}
                  </p>
                </div>
              )}
            </div>

            {/* Portfolio Connection for Stock Selection Card */}
            {isStockSelectionCard && (
              <div className="space-y-6 px-4">
                <div className="text-center space-y-4">
                  <h3 className="text-foreground font-medium">Optional: Connect Your Portfolio</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    You can manually select stocks below, or connect your brokerage account to auto-sync holdings
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setPortfolioIntegrationMethod(
                      portfolioIntegrationMethod === 'auto' ? 'manual' : 'auto'
                    )}
                    className={`w-full p-4 rounded-lg border text-left transition-colors ${
                      portfolioIntegrationMethod === 'auto'
                        ? 'border-ai-accent bg-ai-accent/5'
                        : 'border-border hover:border-ai-accent/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-ai-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Wallet className="w-5 h-5 text-ai-accent" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm mb-1">Connect portfolio</h4>
                        <p className="text-xs text-muted-foreground">
                          Auto-sync your holdings via secure Plaid integration
                        </p>
                      </div>
                      {portfolioIntegrationMethod === 'auto' && (
                        <Check className="w-5 h-5 text-ai-accent flex-shrink-0" />
                      )}
                    </div>
                  </button>
                </div>

                {/* Plaid Connection */}
                {portfolioIntegrationMethod && portfolioIntegrationMethod !== 'manual' && (
                  <div className="pt-4 border-t border-border space-y-3">
                    {connectedAccounts.length === 0 ? (
                      <Button
                        onClick={handlePlaidConnect}
                        className="w-full bg-ai-accent hover:bg-ai-accent/90 text-primary-foreground"
                        size="lg"
                      >
                        <Link className="w-4 h-4 mr-2" />
                        Connect with Plaid
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        {/* Connected Accounts */}
                        <div className="space-y-2">
                          {connectedAccounts.map((account, index) => (
                            <div key={index} className="bg-positive/10 border border-positive/20 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Check className="w-4 h-4 text-positive" />
                                <span className="text-sm text-positive">Connected</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                <p><strong>{account.institution}</strong> • {account.accountType}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        

                        
                        {/* Add Another Account */}
                        <Button
                          onClick={handlePlaidConnect}
                          variant="outline"
                          className="w-full"
                          size="sm"
                        >
                          <Link className="w-4 h-4 mr-2" />
                          Add Another Account
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Stock Selection for Last Card */}
            {isStockSelectionCard && (
              <div className="space-y-6 px-4">
                {/* Portfolio Holdings if Connected */}
                {connectedAccounts.length > 0 && portfolioTickers.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-foreground">
                      Your Portfolio Holdings ({connectedAccounts.length} account{connectedAccounts.length > 1 ? 's' : ''})
                    </h3>
                    <div className="bg-ai-accent/5 border border-ai-accent/20 rounded-lg p-3">
                      <div className="flex flex-wrap gap-1 mb-2">
                        {portfolioTickers.map((ticker) => (
                          <Badge key={ticker} className="bg-ai-accent text-primary-foreground text-xs">
                            {ticker}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {portfolioIntegrationMethod === 'auto' 
                          ? 'These stocks are automatically being tracked for catalysts.'
                          : 'These stocks have been added to your watchlist. You can add more below.'
                        }
                      </p>
                      <div className="mt-2 pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                          From: {connectedAccounts.map(acc => acc.institution).join(', ')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Popular Stocks */}
                <div className="space-y-4">
                  <h3 className="text-foreground">
                    {portfolioIntegrationMethod === 'auto' ? 'Additional Popular Stocks' : 'Popular Stocks'}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {popularStocks.map((stock) => (
                      <button
                        key={stock.symbol}
                        onClick={() => toggleTicker(stock.symbol)}
                        className={`p-3 rounded-lg border text-left transition-colors relative ${
                          selectedTickers.includes(stock.symbol)
                            ? 'border-ai-accent bg-ai-accent/5'
                            : 'border-border hover:border-ai-accent/50'
                        }`}
                      >
                        {selectedTickers.includes(stock.symbol) && (
                          <div className="absolute top-2 right-2">
                            <Check className="w-4 h-4 text-ai-accent" />
                          </div>
                        )}
                        <div className="text-sm">{stock.symbol}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {stock.name}
                        </div>
                        <div className="text-xs text-ai-accent mt-1">
                          {stock.sector}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search and Browse */}
                <div className="space-y-4 pt-6 border-t border-border">
                  <h3 className="text-foreground">
                    {portfolioIntegrationMethod === 'auto' ? 'Add More Stocks' : 'Browse All Stocks'}
                  </h3>
                  
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search stocks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Sector Filter */}
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {sectors.map((sector) => (
                      <Button
                        key={sector}
                        variant={selectedSector === sector ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedSector(sector)}
                        className={`whitespace-nowrap ${
                          selectedSector === sector 
                            ? 'bg-ai-accent hover:bg-ai-accent/90 text-primary-foreground' 
                            : ''
                        }`}
                      >
                        {sector}
                      </Button>
                    ))}
                  </div>

                  {/* Stock List */}
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {filteredStocks.map((stock) => (
                        <button
                          key={stock.symbol}
                          onClick={() => toggleTicker(stock.symbol)}
                          className={`w-full p-3 rounded-lg border text-left transition-colors relative ${
                            selectedTickers.includes(stock.symbol)
                              ? 'border-ai-accent bg-ai-accent/5'
                              : 'border-border hover:border-ai-accent/50'
                          }`}
                        >
                          {selectedTickers.includes(stock.symbol) && (
                            <div className="absolute top-3 right-3">
                              <Check className="w-4 h-4 text-ai-accent" />
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="text-sm">{stock.symbol}</div>
                                <Badge variant="outline" className="text-xs">
                                  {stock.sector}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {stock.name}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {stock.marketCap}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Selected Summary */}
                {selectedTickers.length > 0 && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-2">
                      Selected ({selectedTickers.length}):
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selectedTickers.map((symbol) => (
                        <Badge 
                          key={symbol} 
                          variant="secondary" 
                          className="text-xs cursor-pointer hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTicker(symbol);
                          }}
                        >
                          {symbol} ×
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <Button
          variant="ghost"
          onClick={handlePrevious}
          disabled={currentCard === 0}
          className="text-muted-foreground"
        >
          Back
        </Button>
        <Button
          onClick={handleNext}
          className="bg-ai-accent hover:bg-ai-accent/90 text-primary-foreground px-6"
          disabled={
            (isStockSelectionCard && portfolioIntegrationMethod === 'auto' && connectedAccounts.length === 0) ||
            (isLastCard && selectedTickers.length === 0 && portfolioIntegrationMethod !== 'auto')
          }
        >
          {isLastCard ? 'Complete Setup' : 'Continue'}
        </Button>
      </div>

      {/* Plaid Modal */}
      <PlaidLinkModal
        isOpen={showPlaidModal}
        onClose={() => setShowPlaidModal(false)}
        onSuccess={handlePlaidSuccess}
      />
    </div>
  );
}