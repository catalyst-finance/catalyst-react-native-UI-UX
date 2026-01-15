import { useState } from 'react';
import { X } from 'lucide-react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { Button } from '../ui/button';
import { DraggableListItem } from './draggable-list-item';
import { StockData } from '../../utils/data-service';
import { getCurrentTime } from '../../utils/current-time';

export type SortMethod = 'alphabetical' | 'events' | 'change';
export type SortDirection = 'asc' | 'desc';

export interface SortState {
  method: SortMethod | null;
  direction: SortDirection;
}

interface SortModalProps {
  tickers: string[];
  stocksData: Record<string, StockData>;
  onClose: () => void;
  onSave: (newOrder: string[], sortState: SortState) => void;
  preloadedEventsData: Record<string, any[]>;
  initialSortState: SortState;
  onTickerOrderChange?: (newOrder: string[]) => void;
}

// Detect if device supports touch
const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// Use appropriate backend based on device
const DragDropBackend = isTouchDevice() ? TouchBackend : HTML5Backend;

export function SortModal({ 
  tickers, 
  stocksData, 
  onClose, 
  onSave, 
  preloadedEventsData, 
  initialSortState, 
  onTickerOrderChange 
}: SortModalProps) {
  const [orderedTickers, setOrderedTickers] = useState(tickers);
  const [sortState, setSortState] = useState<SortState>(initialSortState);

  const moveItem = (dragIndex: number, hoverIndex: number) => {
    const newOrder = [...orderedTickers];
    const [removed] = newOrder.splice(dragIndex, 1);
    newOrder.splice(hoverIndex, 0, removed);
    setOrderedTickers(newOrder);
    setSortState({ method: null, direction: 'desc' }); // Clear sort when user drags
  };

  const handleSave = () => {
    onSave(orderedTickers, sortState);
    onClose();
    if (onTickerOrderChange) {
      onTickerOrderChange(orderedTickers);
    }
  };

  // Toggle sort method - cycles through: off -> first direction -> second direction -> off
  const toggleSortMethod = (method: SortMethod) => {
    let newState: SortState;
    
    // Determine the initial direction for each method
    const getInitialDirection = (m: SortMethod): SortDirection => {
      if (m === 'alphabetical') return 'asc'; // A-Z first
      return 'desc'; // Most/Highest first for events and change
    };
    
    if (sortState.method === method) {
      // Same method clicked - cycle through states
      const initialDirection = getInitialDirection(method);
      const oppositeDirection = initialDirection === 'asc' ? 'desc' : 'asc';
      
      if (sortState.direction === initialDirection) {
        // First state -> Second state
        newState = { method, direction: oppositeDirection };
      } else {
        // Second state -> Off
        newState = { method: null, direction: 'desc' };
      }
    } else {
      // Different method clicked - start with initial direction for this method
      newState = { method, direction: getInitialDirection(method) };
    }
    
    setSortState(newState);
    
    // Apply the sort if method is active
    if (newState.method) {
      applySortMethod(newState.method, newState.direction);
    }
  };

  // Apply sort method with direction
  const applySortMethod = (method: SortMethod, direction: SortDirection) => {
    let sorted = [...orderedTickers];
    
    switch (method) {
      case 'alphabetical':
        sorted.sort((a, b) => {
          const comparison = a.localeCompare(b);
          return direction === 'asc' ? comparison : -comparison;
        });
        break;
      
      case 'events':
        sorted.sort((a, b) => {
          // Filter to only count upcoming events in the next 3 months (matching mini chart view)
          const now = getCurrentTime().getTime();
          const threeMonthsFromNow = now + (90 * 24 * 60 * 60 * 1000); // 90 days in milliseconds
          
          const upcomingEventsA = (preloadedEventsData[a] || []).filter(event => {
            if (!event.actualDateTime) return false;
            const eventTime = new Date(event.actualDateTime).getTime();
            return eventTime > now && eventTime <= threeMonthsFromNow;
          }).length;
          
          const upcomingEventsB = (preloadedEventsData[b] || []).filter(event => {
            if (!event.actualDateTime) return false;
            const eventTime = new Date(event.actualDateTime).getTime();
            return eventTime > now && eventTime <= threeMonthsFromNow;
          }).length;
          
          // Standard comparison: A - B for ascending
          const comparison = upcomingEventsA - upcomingEventsB;
          // Negate for descending (most to least)
          return direction === 'desc' ? -comparison : comparison;
        });
        break;
      
      case 'change':
        sorted.sort((a, b) => {
          const changeA = stocksData[a]?.priceChangePercent || 0;
          const changeB = stocksData[b]?.priceChangePercent || 0;
          // Standard comparison: A - B for ascending
          const comparison = changeA - changeB;
          // Negate for descending (highest to lowest)
          return direction === 'desc' ? -comparison : comparison;
        });
        break;
    }
    
    setOrderedTickers(sorted);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-sm w-full max-w-md max-h-[85vh] sm:max-h-[80vh] flex flex-col shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <h2 className="text-[20px] font-medium">Reorder Focus Stocks</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Sort Method Buttons */}
        <div className="p-4 border-b border-border space-y-2 flex-shrink-0">
          <p className="text-xs text-muted-foreground mb-2">Sort by:</p>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={sortState.method === 'alphabetical' ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleSortMethod('alphabetical')}
              className={sortState.method === 'alphabetical' ? 'bg-ai-accent text-primary-foreground' : ''}
            >
              A-Z {sortState.method === 'alphabetical' && (sortState.direction === 'asc' ? '↑' : '↓')}
            </Button>
            <Button
              variant={sortState.method === 'events' ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleSortMethod('events')}
              className={sortState.method === 'events' ? 'bg-ai-accent text-primary-foreground' : ''}
            >
              # Events {sortState.method === 'events' && (sortState.direction === 'asc' ? '↑' : '↓')}
            </Button>
            <Button
              variant={sortState.method === 'change' ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleSortMethod('change')}
              className={sortState.method === 'change' ? 'bg-ai-accent text-primary-foreground' : ''}
            >
              % Change {sortState.method === 'change' && (sortState.direction === 'asc' ? '↑' : '↓')}
            </Button>
          </div>
          {!sortState.method && (
            <p className="text-xs text-muted-foreground mt-2">
              Drag to reorder manually
            </p>
          )}
          {sortState.method && (
            <p className="text-xs text-muted-foreground mt-2">
              Sorted by {sortState.method} ({sortState.direction === 'asc' ? 'ascending' : 'descending'}) • Click again to reverse or disable
            </p>
          )}
        </div>

        {/* Draggable List */}
        <div className="flex-1 overflow-y-auto p-4">
          <DndProvider backend={DragDropBackend} options={isTouchDevice() ? {
            enableMouseEvents: true,
            delayTouchStart: 0,
            touchSlop: 5,
          } : undefined}>
            <div className="space-y-2">
              {orderedTickers.map((ticker, index) => {
                const stock = stocksData[ticker];
                return (
                  <DraggableListItem
                    key={ticker}
                    ticker={ticker}
                    company={stock?.company || ticker}
                    index={index}
                    moveItem={moveItem}
                    onRemove={() => {
                      const newOrder = orderedTickers.filter(t => t !== ticker);
                      setOrderedTickers(newOrder);
                      if (onTickerOrderChange) {
                        onTickerOrderChange(newOrder);
                      }
                    }}
                  />
                );
              })}
            </div>
          </DndProvider>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 p-4 border-t border-border">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 bg-ai-accent text-primary-foreground hover:bg-ai-accent/90"
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
