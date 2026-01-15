import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { motion } from 'motion/react';
import { 
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Target,
  Clock,
  DollarSign,
  BarChart3,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { 
  formatCurrency,
  formatMarketCap,
  formatEventDateTime
} from '../utils/formatting';
import { MarketEvent } from '../utils/supabase/events-api';

interface EventAnalysisProps {
  event: MarketEvent;
  onBack: () => void;
  onTickerClick?: (ticker: string) => void;
}

export function EventAnalysis({ event, onBack, onTickerClick }: EventAnalysisProps) {
  // Scroll to top when event analysis opens or event changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [event.id]);

  // Create placeholder data for analysis metrics since we removed mock data
  const analysisMetrics = [
    { label: 'Expected Price Impact', value: '±5-8%', trend: 'up' as const, confidence: event.confidence },
    { label: 'Market Interest', value: 'High', trend: 'up' as const },
    { label: 'Volatility Risk', value: 'Moderate', trend: 'neutral' as const }
  ];

  // Create placeholder key factors based on event type
  const keyFactors = [
    { factor: 'Event Execution', impact: 'High' as const, status: 'positive' as const },
    { factor: 'Market Conditions', impact: 'Medium' as const, status: 'neutral' as const },
    { factor: 'Sector Performance', impact: 'Medium' as const, status: 'positive' as const }
  ];

  // Create placeholder historical data - in real app this would come from database
  const historicalData = [
    { event: 'Similar Event (Historical)', date: '3 months ago', priceMove: 4.2, accuracy: 85 },
    { event: 'Previous Quarter Event', date: '6 months ago', priceMove: -1.8, accuracy: 78 }
  ];
  
  const formatImpactRating = (rating: number) => {
    if (rating > 0) {
      return `Positive +${rating}`;
    } else if (rating < 0) {
      return `Negative ${rating}`;
    } else {
      return 'Neutral';
    }
  };

  const getImpactColor = (rating: number) => {
    if (rating > 0) return 'text-positive';
    if (rating < 0) return 'text-negative';
    return 'text-neutral';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="h-full bg-background flex flex-col"
    >
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1, ease: "easeOut" }}
        className="bg-background border-b border-border p-4 flex-shrink-0"
      >
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="font-semibold">{event.title}</h1>
            <p className="text-sm text-muted-foreground">{event.company}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge 
              className="bg-ai-accent text-white cursor-pointer hover:bg-ai-accent/80"
              onClick={() => onTickerClick?.(event.ticker)}
            >
              {event.ticker}
            </Badge>
            {event.currentPrice && (
              <div className="text-sm">
                <span className="text-muted-foreground">Current: </span>
                <span className="font-medium">{formatCurrency(event.currentPrice)}</span>
              </div>
            )}
            <div className="text-sm">
              <span className="text-muted-foreground">Market Cap: </span>
              <span className="font-medium">{formatMarketCap(event.marketCap)}</span>
            </div>
          </div>
          {(event.priceChange !== undefined && event.priceChangePercent !== undefined) && (
            <div className={`text-right ${event.priceChange >= 0 ? 'text-positive' : 'text-negative'}`}>
              <div className="flex items-center gap-1">
                {event.priceChange >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="font-medium">
                  {event.priceChange >= 0 ? '+' : ''}{event.priceChangePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Scrollable Content */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
        className="flex-1 overflow-y-auto"
      >
        <div className="p-4 space-y-6 pb-20">
        {/* Event Timing Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3, ease: "easeOut" }}
        >
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Event Timing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {event.actualDateTime && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Scheduled Time</span>
                  <span className="font-medium text-sm">{formatEventDateTime(event.actualDateTime)}</span>
                </div>
              )}
              {event.timeUntil && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Time Remaining</span>
                  <span className="font-medium text-sm text-ai-accent">{event.timeUntil}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Expected Impact</span>
                <span className={`font-medium text-sm ${getImpactColor(event.impactRating)}`}>
                  {formatImpactRating(event.impactRating)}
                </span>
              </div>

            </div>
          </CardContent>
        </Card>
        </motion.div>

        {/* AI Analysis Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4, ease: "easeOut" }}
        >
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-ai-accent" />
              AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-ai-accent/5 rounded-lg p-4">
              <p className="leading-relaxed">{event.aiInsight}</p>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Confidence Level</span>
              <div className="flex items-center gap-2">
                <Progress value={event.confidence} className="w-16 h-2" />
                <span className="text-sm font-medium text-ai-accent">{event.confidence}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>

        {/* Key Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5, ease: "easeOut" }}
        >
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Key Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analysisMetrics.map((metric, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm">{metric.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm ${
                      metric.trend === 'up' ? 'text-positive' : 
                      metric.trend === 'down' ? 'text-negative' : 
                      'text-foreground'
                    }`}>
                      {metric.value}
                    </span>
                    {metric.confidence && (
                      <Badge variant="outline" className="text-xs">
                        {metric.confidence}%
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </motion.div>

        {/* Key Factors */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.6, ease: "easeOut" }}
        >
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Key Factors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {keyFactors.map((factor, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {factor.status === 'positive' ? (
                      <CheckCircle className="w-4 h-4 text-positive" />
                    ) : factor.status === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-warning" />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-muted" />
                    )}
                    <span className="text-sm">{factor.factor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        factor.impact === 'High' ? 'border-negative' : 
                        factor.impact === 'Medium' ? 'border-warning' : 
                        'border-muted-foreground'
                      }`}
                    >
                      {factor.impact}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </motion.div>

        {/* Historical Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.7, ease: "easeOut" }}
        >
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Historical Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {historicalData.map((data, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{data.event}</p>
                      <p className="text-xs text-muted-foreground">{data.date}</p>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium text-sm ${
                        data.priceMove >= 0 ? 'text-positive' : 'text-negative'
                      }`}>
                        {data.priceMove >= 0 ? '+' : ''}{data.priceMove.toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {data.accuracy}% accurate
                      </div>
                    </div>
                  </div>
                  {index < historicalData.length - 1 && <Separator className="mt-3" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </motion.div>

          {/* Action Button */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.8, ease: "easeOut" }}
            className="pb-6"
          >
            <Button variant="outline" className="w-full">
              <DollarSign className="w-4 h-4 mr-2" />
              Add to Watchlist
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}