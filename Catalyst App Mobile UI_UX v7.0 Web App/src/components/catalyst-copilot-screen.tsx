import { CatalystCopilot } from './catalyst-copilot';
import { MarketEvent } from '../utils/supabase/events-api';

interface CatalystCopilotScreenProps {
  selectedTickers: string[];
  onTickerClick: (ticker: string) => void;
  onEventClick: (event: MarketEvent) => void;
}

export function CatalystCopilotScreen({ 
  selectedTickers, 
  onTickerClick, 
  onEventClick 
}: CatalystCopilotScreenProps) {
  return (
    <div className="h-screen pb-20">
      <CatalystCopilot 
        mode="embedded"
        selectedTickers={selectedTickers}
        onEventClick={onEventClick}
        onTickerClick={onTickerClick}
      />
    </div>
  );
}