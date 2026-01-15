import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { ArrowUpDown, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface DraggableListItemProps {
  ticker: string;
  company: string;
  index: number;
  moveItem: (dragIndex: number, hoverIndex: number) => void;
  onRemove: (ticker: string) => void;
}

export function DraggableListItem({ ticker, company, index, moveItem, onRemove }: DraggableListItemProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: 'SORT_ITEM',
    item: { ticker, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: 'SORT_ITEM',
    hover: (item: { ticker: string; index: number }) => {
      if (!ref.current) return;
      
      const dragIndex = item.index;
      const hoverIndex = index;
      
      if (dragIndex === hoverIndex) return;
      
      moveItem(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={`flex items-center gap-3 p-3 bg-card border-2 dark:border-2 border-border rounded-sm transition-all ${
        isDragging ? 'opacity-50' : 'opacity-100'
      } ${isOver ? 'border-ai-accent' : ''}`}
    >
      <ArrowUpDown className="h-5 w-5 text-muted-foreground flex-shrink-0 cursor-grab active:cursor-grabbing" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge className="bg-ai-accent text-primary-foreground text-xs">
            {ticker}
          </Badge>
          <span className="text-sm truncate">{company}</span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(ticker)}
        className="h-8 w-8 p-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
