import { Card, CardContent } from '../ui/card';

interface StockListSkeletonProps {
  count: number;
}

export function StockListSkeleton({ count }: StockListSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-4">
            <div className="space-y-2">
              {/* First row: Symbol and Price */}
              <div className="flex items-center justify-between">
                <div className="h-6 w-12 bg-muted rounded"></div>
                <div className="h-6 w-16 bg-muted rounded"></div>
              </div>
              
              {/* Second row: Company/Sector and Change */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-2">
                  <div className="h-4 w-32 bg-muted rounded mb-2"></div>
                  <div className="h-3 w-20 bg-muted rounded"></div>
                </div>
                
                <div className="text-right m-[0px]">
                  <div className="h-4 w-12 bg-muted rounded mb-1"></div>
                  <div className="h-4 w-16 bg-muted rounded"></div>
                </div>
              </div>
              
              {/* Chart skeleton */}
              <div className="w-full mt-3">
                <div className="h-12 mb-1 bg-muted rounded relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                </div>
                {/* Month label skeleton */}
                <div className="flex justify-between px-1">
                  <div className="h-3 w-6 bg-muted rounded"></div>
                  <div className="h-3 w-6 bg-muted rounded"></div>
                  <div className="h-3 w-6 bg-muted rounded"></div>
                  <div className="h-3 w-6 bg-muted rounded"></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
