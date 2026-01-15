import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  ChevronRight, 
  Loader2, 
  Calendar,
  ArrowUpDown 
} from 'lucide-react';
import StockAPI from '../utils/supabase/stock-api';
import { CompanyOwnership as OwnershipData } from '../utils/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { formatCompanyName } from '../utils/formatting';

interface CompanyOwnershipProps {
  ticker: string;
  companyName?: string; // Company name for modal header
  shareOutstanding?: number; // Total shares outstanding for percentage calculation
  currentPrice?: number; // Current stock price for market value calculation
}

export function CompanyOwnership({ ticker, companyName, shareOutstanding, currentPrice }: CompanyOwnershipProps) {
  const [ownership, setOwnership] = useState<OwnershipData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sortByDate, setSortByDate] = useState(false);

  useEffect(() => {
    const loadOwnership = async () => {
      try {
        setIsLoading(true);
        const data = await StockAPI.getCompanyOwnership(ticker, 50); // Get top 50
        setOwnership(data);
      } catch (err) {
        console.error(`Error loading ownership for ${ticker}:`, err);
        setOwnership([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadOwnership();
  }, [ticker]);

  // Calculate percentage of ownership
  const calculatePercentage = (shares: number | null): number | null => {
    if (!shares || !shareOutstanding) return null;
    // shareOutstanding is in millions, so multiply by 1,000,000 to get actual shares
    const actualSharesOutstanding = shareOutstanding * 1_000_000;
    return (shares / actualSharesOutstanding) * 100;
  };

  // Format large numbers
  const formatNumber = (num: number | null): string => {
    if (!num) return 'N/A';
    if (num >= 1000000000) {
      return `${(num / 1000000000).toFixed(0)}B`;
    } else if (num >= 1000000) {
      return `${(num / 1000000).toFixed(0)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`;
    }
    return num.toLocaleString();
  };

  // Format market value in dollars
  const formatMarketValue = (num: number | null): string => {
    if (!num) return 'N/A';
    if (num >= 1000000000) {
      return `$${(num / 1000000000).toFixed(0)}B`;
    } else if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(0)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(0)}K`;
    }
    return `$${num.toLocaleString()}`;
  };

  // Calculate market value of shares
  const calculateMarketValue = (shares: number | null): number | null => {
    if (!shares || !currentPrice) return null;
    return shares * currentPrice;
  };

  // Format date
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  // Format name to convert "Last Name (First Name)" to "Last Name, First Name"
  const formatName = (name: string): string => {
    const match = name.match(/^(.+?)\s*\((.+?)\)$/);
    if (match) {
      return `${match[1]}, ${match[2]}`;
    }
    return name;
  };

  // Format percentage ownership - show 1 decimal place if less than 1%
  const formatOwnershipPercentage = (percentage: number): string => {
    if (percentage < 1) {
      return `${percentage.toFixed(1)}%`;
    }
    return `${Math.round(percentage)}%`;
  };

  // Render ownership row
  const OwnershipRow = ({ owner, rank, showPercentage = true, isExpanded = false }: { owner: OwnershipData; rank: number; showPercentage?: boolean; isExpanded?: boolean }) => {
    const percentage = calculatePercentage(owner.share);
    const marketValue = calculateMarketValue(owner.share);
    const hasChange = owner.change && owner.change !== 0;
    const isPositiveChange = owner.change && owner.change > 0;
    
    // Calculate percentage change correctly
    const calculatePercentChange = (): number | null => {
      if (!owner.change || owner.change === 0) return null;
      const previousShares = owner.share - owner.change;
      if (previousShares === 0) return null; // New position, can't calculate percentage
      return (owner.change / previousShares) * 100;
    };
    
    const percentChange = calculatePercentChange();

    // Compact view (top 5) - only rank, name, and percentage
    if (!isExpanded) {
      return (
        <div className="flex items-center justify-between py-3 px-1 hover:bg-muted/50 transition-colors rounded gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-6 text-center">
              <span className="text-sm font-medium text-muted-foreground">#{rank}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium break-words">{formatName(owner.name)}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0 ml-2 flex items-center gap-2">
            {showPercentage && percentage !== null && (
              <p className="text-sm font-medium">{formatOwnershipPercentage(percentage)}</p>
            )}
            {marketValue !== null && (
              <p className="text-sm text-muted-foreground">{formatMarketValue(marketValue)}</p>
            )}
          </div>
        </div>
      );
    }

    // Expanded view (top 100) - show all details with market value and shares underneath name
    return (
      <div className="flex items-start gap-3 py-[12px] px-4 hover:bg-muted/50 transition-colors rounded">
        <div className="flex-shrink-0 w-6 text-center">
          <span className="text-sm font-medium text-muted-foreground">#{rank}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium break-words">{formatName(owner.name)}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-[13px]">
            {showPercentage && percentage !== null && (
              <>
                <span className="font-medium text-muted-foreground">{formatOwnershipPercentage(percentage)}</span>
                <span className="text-muted-foreground">•</span>
              </>
            )}
            {marketValue !== null && (
              <>
                <span className="font-medium">{formatMarketValue(marketValue)}</span>
                <span className="text-muted-foreground">•</span>
              </>
            )}
            <span className="font-medium text-muted-foreground">{formatNumber(owner.share)}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            {owner.filing_date && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(owner.filing_date)}</span>
              </div>
            )}
            {percentChange !== null && (
              <span className={isPositiveChange ? 'text-positive' : 'text-negative'}>
                {isPositiveChange ? '+' : ''}{Math.round(percentChange)}%
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="border-0">
        <CardHeader className="pt-[24px] pr-[10px] pb-[0px] pl-[10px]">
          <CardTitle>
            Company Ownership
          </CardTitle>
        </CardHeader>
        <CardContent className="pr-[24px] pt-[0px] pr-[10px] pb-[24px] pl-[10px]">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (ownership.length === 0) {
    return null; // Don't show card if no ownership data
  }

  // Top 5 for default view
  const top5 = ownership.slice(0, 5);

  // Sort ownership list
  const getSortedOwnership = () => {
    if (!sortByDate) {
      return ownership;
    }
    
    // Sort by most recent filing date
    return [...ownership].sort((a, b) => {
      if (!a.filing_date) return 1;
      if (!b.filing_date) return -1;
      return new Date(b.filing_date).getTime() - new Date(a.filing_date).getTime();
    });
  };

  const sortedOwnership = getSortedOwnership();

  return (
    <Card className="border-0">
      <CardHeader className="pl-[10px]">
        <CardTitle>
          Company Ownership
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-[0px] pr-[10px] pb-[24px] pl-[10px]">
        <div className="space-y-1">
          {top5.map((owner, index) => (
            <OwnershipRow 
              key={owner.id} 
              owner={owner} 
              rank={index + 1}
              showPercentage={!!shareOutstanding}
            />
          ))}
        </div>

        {ownership.length > 5 && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" className="w-full mt-4 text-ai-accent hover:text-ai-accent/80">
                View Top {ownership.length} Owners
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100%-2rem)] max-w-2xl max-h-[80vh] p-0 overflow-hidden gap-0 flex flex-col">
              <DialogHeader className="w-full flex-shrink-0">
                <div className="flex items-center justify-between gap-2 px-4 sm:px-6 pt-[50px] pb-[0px] pr-[30px] pl-[30px]">
                  <DialogTitle className="flex flex-col gap-1 flex-1 min-w-0">
                    <Badge className="bg-ai-accent text-primary-foreground rounded flex-shrink-0 text-[14px] w-fit">
                      {ticker}
                    </Badge>
                    <span className="truncate text-[18px] text-left">{companyName || ticker}</span>
                    <span className="text-sm font-normal text-muted-foreground text-left">Top {ownership.length} Owners</span>
                  </DialogTitle>
                </div>
              </DialogHeader>
              <div className="flex items-center justify-end px-4 sm:px-6 pb-3 border-b">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSortByDate(!sortByDate)}
                  className="flex items-center gap-1 flex-shrink-0"
                >
                  <ArrowUpDown className="w-4 h-4" />
                  {sortByDate ? 'Date' : 'Rank'}
                </Button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="w-full pb-6 space-y-1 px-4 sm:px-6">
                  {sortedOwnership.map((owner) => {
                    // Always use original rank from ownership array
                    const originalRank = ownership.findIndex(o => o.id === owner.id) + 1;
                    return (
                      <OwnershipRow 
                        key={owner.id} 
                        owner={owner} 
                        rank={originalRank}
                        showPercentage={!!shareOutstanding}
                        isExpanded={true}
                      />
                    );
                  })}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}