import { useState } from 'react';
import { ArrowLeft, ExternalLink, Bell, Plus, TrendingUp, TrendingDown, Calendar, BarChart3, Target, AlertTriangle } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';

interface Position {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  value: number;
  dayChange: number;
  dayChangePercent: number;
  totalReturn: number;
  totalReturnPercent: number;
  lastCatalyst?: string;
  catalystImpact?: 'positive' | 'negative' | 'neutral';
  accountName: string;
}

interface Catalyst {
  id: string;
  title: string;
  date: string;
  impact: 'high' | 'medium' | 'low';
  type: 'earnings' | 'product' | 'regulatory' | 'merger' | 'other';
  priceTarget?: number;
  confidence: number;
  description: string;
}

interface PositionDetailsScreenProps {
  position: Position;
  onBack: () => void;
}

const mockCatalysts: Catalyst[] = [
  {
    id: '1',
    title: 'Q1 2025 Earnings Report',
    date: '2025-01-15',
    impact: 'high',
    type: 'earnings',
    priceTarget: 920,
    confidence: 85,
    description: 'Expected strong revenue growth from data center segment'
  },
  {
    id: '2',
    title: 'CES 2025 Product Announcement',
    date: '2025-01-08',
    impact: 'medium',
    type: 'product',
    priceTarget: 890,
    confidence: 72,
    description: 'New AI chip architecture reveal expected'
  },
  {
    id: '3',
    title: 'EU AI Regulation Update',
    date: '2025-02-01',
    impact: 'medium',
    type: 'regulatory',
    confidence: 65,
    description: 'New compliance requirements may impact operations'
  }
];

const riskMetrics = [
  { label: 'Beta', value: '1.35', description: '35% more volatile than market' },
  { label: 'Volatility', value: '45.2%', description: 'Annualized price volatility' },
  { label: 'Sharpe Ratio', value: '1.85', description: 'Risk-adjusted return measure' },
  { label: 'Max Drawdown', value: '-23.4%', description: 'Largest peak-to-trough decline' }
];

export function PositionDetailsScreen({ position, onBack }: PositionDetailsScreenProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Scroll to top when screen opens or position changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [position.id]);

  const profitLoss = position.currentPrice - position.avgCost;
  const profitLossPercent = (profitLoss / position.avgCost) * 100;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-40">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
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
                <h1>{position.symbol}</h1>
                <p className="text-sm text-muted-foreground">{position.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Alerts
              </Button>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Price and Change */}
          <div className="space-y-2">
            <div className="text-3xl font-semibold">${position.currentPrice.toFixed(2)}</div>
            <div className="flex items-center gap-2">
              {position.dayChangePercent >= 0 ? (
                <TrendingUp className="h-4 w-4 text-positive" />
              ) : (
                <TrendingDown className="h-4 w-4 text-negative" />
              )}
              <span className={position.dayChangePercent >= 0 ? 'text-positive' : 'text-negative'}>
                ${Math.abs(position.dayChange).toFixed(2)} ({position.dayChangePercent >= 0 ? '+' : ''}{position.dayChangePercent.toFixed(2)}%)
              </span>
              <span className="text-muted-foreground">today</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="catalysts">Catalysts</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="risk">Risk</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Position Summary */}
            <Card className="p-4">
              <h3 className="font-medium mb-3">Your Position</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Shares Owned</div>
                  <div className="text-lg font-medium">{position.shares}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Value</div>
                  <div className="text-lg font-medium">${position.value.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Avg Cost</div>
                  <div className="text-lg font-medium">${position.avgCost.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Account</div>
                  <div className="text-lg font-medium">{position.accountName}</div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Total Return</span>
                  <span className={`font-medium ${profitLossPercent >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {profitLossPercent >= 0 ? '+' : ''}${Math.abs(position.totalReturn).toLocaleString()} ({profitLossPercent >= 0 ? '+' : ''}{position.totalReturnPercent.toFixed(1)}%)
                  </span>
                </div>
                <Progress 
                  value={Math.min(Math.abs(position.totalReturnPercent), 100)} 
                  className="h-2"
                />
              </div>
            </Card>

            {/* Recent Catalyst */}
            {position.lastCatalyst && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Recent Catalyst</h3>
                  <Badge 
                    variant="secondary"
                    className={
                      position.catalystImpact === 'positive' ? 'bg-positive/20 text-positive border-positive/30' :
                      position.catalystImpact === 'negative' ? 'bg-negative/20 text-negative border-negative/30' :
                      'bg-neutral/20 text-neutral border-neutral/30'
                    }
                  >
                    {position.catalystImpact}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{position.lastCatalyst}</p>
                <Button variant="outline" size="sm" className="mt-3">
                  View Analysis
                </Button>
              </Card>
            )}

            {/* Quick Actions */}
            <Card className="p-4">
              <h3 className="font-medium mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-12">
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Watchlist
                </Button>
                <Button variant="outline" className="h-12">
                  <Bell className="h-4 w-4 mr-2" />
                  Set Price Alert
                </Button>
                <Button variant="outline" className="h-12">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Charts
                </Button>
                <Button variant="outline" className="h-12">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Trade in App
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="catalysts" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Upcoming Catalysts</h3>
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Calendar View
              </Button>
            </div>

            {mockCatalysts.map((catalyst) => (
              <Card key={catalyst.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium">{catalyst.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{catalyst.description}</p>
                  </div>
                  <Badge 
                    variant={catalyst.impact === 'high' ? 'destructive' : catalyst.impact === 'medium' ? 'default' : 'secondary'}
                    className="ml-2"
                  >
                    {catalyst.impact}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{new Date(catalyst.date).toLocaleDateString()}</span>
                    <Badge variant="outline" className="text-xs">
                      {catalyst.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {catalyst.priceTarget && (
                      <div className="text-sm">
                        <Target className="h-3 w-3 inline mr-1" />
                        ${catalyst.priceTarget}
                      </div>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {catalyst.confidence}% confidence
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4 mt-4">
            <Card className="p-4">
              <h3 className="font-medium mb-3">Performance Metrics</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">52-Week High</span>
                  <span>$950.15</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">52-Week Low</span>
                  <span>$589.23</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">P/E Ratio</span>
                  <span>35.2</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Market Cap</span>
                  <span>$2.1T</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Volume (Avg)</span>
                  <span>45.2M</span>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium mb-3">AI Insights</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-ai-accent mt-2"></div>
                  <div>
                    <p className="text-sm">Strong institutional buying pressure detected over the last 5 days</p>
                    <Badge variant="outline" className="text-xs mt-1">85% confidence</Badge>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-warning mt-2"></div>
                  <div>
                    <p className="text-sm">Unusual options activity in next month's calls</p>
                    <Badge variant="outline" className="text-xs mt-1">72% confidence</Badge>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="risk" className="space-y-4 mt-4">
            <Card className="p-4">
              <h3 className="font-medium mb-3">Risk Metrics</h3>
              <div className="space-y-4">
                {riskMetrics.map((metric, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{metric.label}</div>
                      <div className="text-xs text-muted-foreground">{metric.description}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{metric.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <h3 className="font-medium">Risk Alerts</h3>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-warning/10 border border-warning/20 rounded">
                  <p className="text-sm">High concentration risk: This position represents 63% of your portfolio value</p>
                </div>
                <div className="p-3 bg-neutral/10 border border-neutral/20 rounded">
                  <p className="text-sm">Sector exposure: 45% of portfolio in Technology sector</p>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}