import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Search, Trash2, DollarSign, Hash, Calculator, Save } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import DataService, { StockData } from '../utils/data-service';

interface ManualPosition {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
}

interface ManualPortfolioSetupProps {
  onBack: () => void;
  onComplete: (positions: ManualPosition[]) => void;
  isAddingToExisting?: boolean;
}

export function ManualPortfolioSetup({ onBack, onComplete, isAddingToExisting = false }: ManualPortfolioSetupProps) {
  // Scroll to top when screen opens
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const [positions, setPositions] = useState<ManualPosition[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStock, setSelectedStock] = useState<{ symbol: string; name: string } | null>(null);
  const [shares, setShares] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<StockData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualSymbol, setManualSymbol] = useState('');
  const [manualName, setManualName] = useState('');

  // Search for stocks using DataService
  useEffect(() => {
    if (!searchQuery.trim() || manualEntry) {
      setSearchResults([]);
      return;
    }

    const searchStocks = async () => {
      setIsSearching(true);
      try {
        const results = await DataService.searchStocks(searchQuery, 10);
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching stocks:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(searchStocks, 300); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [searchQuery, manualEntry]);

  const handleAddPosition = () => {
    if (!selectedStock || !shares || !avgCost) return;

    const sharesNum = parseFloat(shares);
    const avgCostNum = parseFloat(avgCost);

    if (isNaN(sharesNum) || isNaN(avgCostNum) || sharesNum <= 0 || avgCostNum <= 0) {
      return;
    }

    // Check if position already exists
    const existingIndex = positions.findIndex(p => p.symbol === selectedStock.symbol);
    
    if (existingIndex >= 0) {
      // Update existing position (average the cost basis)
      const existing = positions[existingIndex];
      const totalShares = existing.shares + sharesNum;
      const totalValue = (existing.shares * existing.avgCost) + (sharesNum * avgCostNum);
      const newAvgCost = totalValue / totalShares;

      const updatedPositions = [...positions];
      updatedPositions[existingIndex] = {
        ...existing,
        shares: totalShares,
        avgCost: newAvgCost
      };
      setPositions(updatedPositions);
    } else {
      // Add new position
      const newPosition: ManualPosition = {
        id: `manual-${Date.now()}`,
        symbol: selectedStock.symbol,
        name: selectedStock.name,
        shares: sharesNum,
        avgCost: avgCostNum
      };
      setPositions([...positions, newPosition]);
    }

    // Reset form
    setSelectedStock(null);
    setShares('');
    setAvgCost('');
    setShowSearch(false);
  };

  const handleRemovePosition = (id: string) => {
    setPositions(positions.filter(p => p.id !== id));
  };

  const calculateTotalValue = () => {
    // Since we removed mock data, we'll use avgCost as current price
    // In a real app, this would fetch current prices from the API
    return positions.reduce((total, pos) => {
      return total + (pos.shares * pos.avgCost); // Using avg cost as placeholder
    }, 0);
  };

  const calculateTotalCost = () => {
    return positions.reduce((total, pos) => total + (pos.shares * pos.avgCost), 0);
  };

  const handleComplete = () => {
    if (positions.length > 0) {
      onComplete(positions);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-40">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1>{isAddingToExisting ? 'Add Manual Positions' : 'Manual Portfolio Setup'}</h1>
              <p className="text-sm text-muted-foreground">
                {isAddingToExisting ? 'Add more positions to your portfolio' : 'Add your positions manually'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Instructions */}
        <Alert>
          <Calculator className="h-4 w-4" />
          <AlertDescription>
            Manually enter your stock positions. You can add multiple lots of the same stock and we'll calculate the average cost basis.
          </AlertDescription>
        </Alert>

        {/* Add Position Form */}
        <Card className="p-4">
          <h3 className="font-medium mb-4">Add Position</h3>
          
          <div className="space-y-4">
            {/* Stock Selection */}
            <div>
              <Label>Stock</Label>
              {selectedStock ? (
                <div className="mt-2 p-3 border rounded-lg bg-accent/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge className="bg-ai-accent text-white">{selectedStock.symbol}</Badge>
                      <p className="text-sm text-muted-foreground mt-1">{selectedStock.name}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedStock(null);
                        setShowSearch(true);
                      }}
                    >
                      Change
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-2">
                  {!showSearch ? (
                    <Button
                      variant="outline"
                      onClick={() => setShowSearch(true)}
                      className="w-full justify-start"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Search for a stock...
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by symbol or company name..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                          autoFocus
                        />
                      </div>
                      
                      {(searchQuery || manualEntry) && (
                        <div className="border rounded-lg max-h-60 overflow-y-auto">
                          {manualEntry ? (
                            <div className="p-3 space-y-3">
                              <div>
                                <Label>Stock Symbol</Label>
                                <Input
                                  placeholder="e.g., AAPL"
                                  value={manualSymbol}
                                  onChange={(e) => setManualSymbol(e.target.value.toUpperCase())}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label>Company Name</Label>
                                <Input
                                  placeholder="e.g., Apple Inc."
                                  value={manualName}
                                  onChange={(e) => setManualName(e.target.value)}
                                  className="mt-1"
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    if (manualSymbol && manualName) {
                                      setSelectedStock({ symbol: manualSymbol, name: manualName });
                                      setManualSymbol('');
                                      setManualName('');
                                      setManualEntry(false);
                                      setShowSearch(false);
                                    }
                                  }}
                                  disabled={!manualSymbol || !manualName}
                                >
                                  Add Stock
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setManualEntry(false);
                                    setManualSymbol('');
                                    setManualName('');
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {isSearching ? (
                                <div className="p-3 text-sm text-muted-foreground text-center">
                                  Searching...
                                </div>
                              ) : searchResults.length > 0 ? (
                                searchResults.map((stock) => (
                                  <button
                                    key={stock.symbol}
                                    onClick={() => {
                                      setSelectedStock({ symbol: stock.symbol, name: stock.company });
                                      setSearchQuery('');
                                      setShowSearch(false);
                                    }}
                                    className="w-full p-3 text-left hover:bg-accent/50 transition-colors border-b last:border-b-0"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline">{stock.symbol}</Badge>
                                      <span className="text-sm">{stock.company}</span>
                                    </div>
                                  </button>
                                ))
                              ) : searchQuery ? (
                                <div className="p-3 space-y-2">
                                  <div className="text-sm text-muted-foreground text-center">
                                    No stocks found for "{searchQuery}"
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setManualEntry(true)}
                                    className="w-full"
                                  >
                                    Add "{searchQuery}" manually
                                  </Button>
                                </div>
                              ) : null}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Shares and Cost */}
            {selectedStock && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Number of Shares</Label>
                    <div className="relative mt-2">
                      <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="0"
                        value={shares}
                        onChange={(e) => setShares(e.target.value)}
                        className="pl-9"
                        type="number"
                        step="0.001"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Average Cost per Share</Label>
                    <div className="relative mt-2">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="0.00"
                        value={avgCost}
                        onChange={(e) => setAvgCost(e.target.value)}
                        className="pl-9"
                        type="number"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>

                {/* Calculation Preview */}
                {shares && avgCost && !isNaN(parseFloat(shares)) && !isNaN(parseFloat(avgCost)) && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-sm text-muted-foreground">Total Investment</div>
                    <div className="font-medium">
                      ${(parseFloat(shares) * parseFloat(avgCost)).toLocaleString()}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleAddPosition}
                  disabled={!selectedStock || !shares || !avgCost}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Position
                </Button>
              </>
            )}
          </div>
        </Card>

        {/* Current Positions */}
        {positions.length > 0 && (
          <Card className="p-4">
            <h3 className="font-medium mb-4">Your Positions ({positions.length})</h3>
            
            <div className="space-y-3">
              {positions.map((position) => {
                // Using avgCost as current price since we removed mock data
                // In a real app, this would fetch current prices from API
                const currentPrice = position.avgCost; // Placeholder - no price changes shown
                const currentValue = position.shares * currentPrice;
                const totalCost = position.shares * position.avgCost;
                const gainLoss = currentValue - totalCost; // Will be 0 since currentPrice = avgCost
                const gainLossPercent = (gainLoss / totalCost) * 100;

                return (
                  <div key={position.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-ai-accent text-white">{position.symbol}</Badge>
                        <span className="text-sm text-muted-foreground">{position.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePosition(position.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Shares</div>
                        <div>{position.shares}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Avg Cost</div>
                        <div>${position.avgCost.toFixed(2)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-muted-foreground">Current Value</div>
                        <div>${currentValue.toLocaleString()}</div>
                        <div className={`text-xs ${gainLoss >= 0 ? 'text-positive' : 'text-negative'}`}>
                          {gainLoss >= 0 ? '+' : ''}${gainLoss.toFixed(2)} ({gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(1)}%)
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Separator className="my-4" />

            {/* Portfolio Summary */}
            <div className="bg-gradient-to-r from-ai-accent/5 to-ai-accent/10 p-3 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Total Cost</div>
                  <div className="font-medium">${calculateTotalCost().toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground">Current Value</div>
                  <div className="font-medium">${calculateTotalValue().toLocaleString()}</div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Complete Button */}
        {positions.length > 0 && (
          <Button onClick={handleComplete} className="w-full" size="lg">
            <Save className="h-4 w-4 mr-2" />
            {isAddingToExisting ? `Add ${positions.length} Position${positions.length > 1 ? 's' : ''}` : `Save Portfolio (${positions.length} positions)`}
          </Button>
        )}
      </div>
    </div>
  );
}