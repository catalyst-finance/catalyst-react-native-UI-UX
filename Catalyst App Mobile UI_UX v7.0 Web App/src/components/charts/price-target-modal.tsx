import { X } from 'lucide-react';
import { PriceTarget } from '../../utils/price-targets-service';

interface PriceTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  priceTargets: PriceTarget[];
  type: 'high' | 'low';
}

export function PriceTargetModal({ isOpen, onClose, title, priceTargets, type }: PriceTargetModalProps) {
  if (!isOpen) return null;

  // Filter and sort based on type
  const sortedTargets = [...priceTargets]
    .filter(t => t && typeof t.price_target === 'number')
    .sort((a, b) => {
      if (type === 'high') {
        return b.price_target - a.price_target; // Highest to lowest
      } else {
        return a.price_target - b.price_target; // Lowest to highest
      }
    })
    .slice(0, 10); // Take top/bottom 10

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">{title} Price Targets</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 flex-1">
          {sortedTargets.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No price targets available</p>
          ) : (
            <div className="space-y-2">
              {sortedTargets.map((target, index) => (
                <div
                  key={target._id}
                  className="flex items-start gap-3 py-2 border-b last:border-b-0"
                >
                  <span className="text-gray-400 font-medium min-w-[20px]">
                    {index + 1}.
                  </span>
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium">
                        {target.analyst_firm}
                      </span>
                      <span className="font-semibold text-black">
                        ${target.price_target}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      {formatDate(target.published_date)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}