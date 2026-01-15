import { useMarketStatus, MarketStatus, getHolidayName } from '../utils/market-status';
import { Badge } from './ui/badge';
import { Clock, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';

interface MarketStatusBadgeProps {
  className?: string;
  showTime?: boolean;
}

export function MarketStatusBadge({ className = '', showTime = true }: MarketStatusBadgeProps) {
  const marketStatus = useMarketStatus();
  const [holidayName, setHolidayName] = useState<string | null>(null);
  
  // Fetch holiday name if market is closed
  useEffect(() => {
    const fetchHolidayName = async () => {
      const name = await getHolidayName();
      setHolidayName(name);
    };
    
    if (marketStatus.status === 'closed') {
      fetchHolidayName();
    }
  }, [marketStatus.status]);
  
  const getStatusConfig = (status: MarketStatus) => {
    switch (status) {
      case 'open':
        return {
          label: 'Market Open',
          variant: 'default' as const,
          bgColor: 'bg-positive/10',
          textColor: 'text-positive',
          borderColor: 'border-positive/20',
          icon: TrendingUp
        };
      case 'after-hours':
        return {
          label: 'After Hours',
          variant: 'outline' as const,
          bgColor: 'bg-muted/10',
          textColor: 'text-muted-foreground',
          borderColor: 'border-muted-foreground/20',
          icon: Clock
        };
      case 'pre-market':
        return {
          label: 'Pre-Market',
          variant: 'secondary' as const,
          bgColor: 'bg-ai-accent/10',
          textColor: 'text-ai-accent',
          borderColor: 'border-ai-accent/20',
          icon: Clock
        };
      case 'closed':
      default:
        return {
          label: 'Market Closed',
          variant: 'outline' as const,
          bgColor: 'bg-muted/10',
          textColor: 'text-muted-foreground',
          borderColor: 'border-muted-foreground/20',
          icon: Clock
        };
    }
  };
  
  const config = getStatusConfig(marketStatus.status);
  const Icon = config.icon;
  
  // Use holiday name if available, otherwise use status label
  const displayLabel = holidayName || config.label;
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge 
        variant="outline"
        className={`
          bg-muted text-muted-foreground border-muted-foreground/20
          border px-2 py-1 font-medium text-xs
          flex items-center gap-1.5
        `}
      >
        <Icon className="h-3 w-3" />
        <span>{displayLabel}</span>
      </Badge>
    </div>
  );
}