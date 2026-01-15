import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { RefreshCw } from 'lucide-react';
import { getCurrentTime } from '../utils/current-time';

export function ScrollChartDebug() {
  const [scrollData, setScrollData] = useState({
    currentScroll: 0,
    savedEventId: '',
    savedPosition: '',
    documentHeight: 0,
    viewportHeight: 0,
    maxScroll: 0,
    timestamp: ''
  });

  const [chartData, setChartData] = useState({
    currentTime: '',
    lastDataPoint: null as any,
    timeGap: 0,
    storageData: {} as any
  });

  const refreshData = () => {
    // Scroll data
    const currentScroll = window.scrollY;
    const documentHeight = document.documentElement.scrollHeight;
    const viewportHeight = window.innerHeight;
    const maxScroll = documentHeight - viewportHeight;
    
    setScrollData({
      currentScroll,
      savedEventId: localStorage.getItem('catalyst_scroll_event_id') || 'None',
      savedPosition: localStorage.getItem('catalyst_scroll_position') || 'None',
      documentHeight,
      viewportHeight,
      maxScroll,
      timestamp: new Date().toLocaleTimeString()
    });

    // Chart data - try to find the last data point from any chart
    const currentTime = getCurrentTime();
    
    setChartData({
      currentTime: currentTime.toISOString(),
      lastDataPoint: null, // Would need to pass this in as a prop
      timeGap: 0,
      storageData: {
        scrollEventId: localStorage.getItem('catalyst_scroll_event_id'),
        scrollPosition: localStorage.getItem('catalyst_scroll_position'),
        onboardingCompleted: localStorage.getItem('catalyst_onboarding_completed'),
        selectedTickers: localStorage.getItem('catalyst_selected_tickers')
      }
    });
  };

  useEffect(() => {
    refreshData();
    
    // Auto-refresh every 2 seconds
    const interval = setInterval(refreshData, 2000);
    
    // Listen for scroll events
    const handleScroll = () => {
      setScrollData(prev => ({
        ...prev,
        currentScroll: window.scrollY,
        timestamp: new Date().toLocaleTimeString()
      }));
    };
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const clearScrollData = () => {
    localStorage.removeItem('catalyst_scroll_event_id');
    localStorage.removeItem('catalyst_scroll_position');
    window.scrollTo({ top: 0, behavior: 'instant' });
    refreshData();
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: scrollData.maxScroll, behavior: 'smooth' });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollPercentage = scrollData.maxScroll > 0 
    ? ((scrollData.currentScroll / scrollData.maxScroll) * 100).toFixed(1)
    : '0';

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-medium">Scroll & Chart Debug</h1>
        <Button onClick={refreshData} size="sm" variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Scroll Data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🔴 Scroll Position Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="font-medium">Current Scroll:</div>
            <div className="font-mono">{scrollData.currentScroll}px</div>
            
            <div className="font-medium">Scroll %:</div>
            <div className="font-mono">{scrollPercentage}%</div>
            
            <div className="font-medium">Max Scroll:</div>
            <div className="font-mono">{scrollData.maxScroll}px</div>
            
            <div className="font-medium">Document Height:</div>
            <div className="font-mono">{scrollData.documentHeight}px</div>
            
            <div className="font-medium">Viewport Height:</div>
            <div className="font-mono">{scrollData.viewportHeight}px</div>
            
            <div className="font-medium">Last Update:</div>
            <div className="font-mono">{scrollData.timestamp}</div>
          </div>
          
          <div className="pt-3 border-t space-y-2">
            <div className="font-medium text-sm">Saved State:</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Event ID:</div>
              <div className="font-mono text-xs break-all">{scrollData.savedEventId}</div>
              
              <div className="text-muted-foreground">Position:</div>
              <div className="font-mono">{scrollData.savedPosition}</div>
            </div>
          </div>

          <div className="pt-3 border-t flex gap-2">
            <Button onClick={scrollToTop} size="sm" variant="outline" className="flex-1">
              Scroll to Top
            </Button>
            <Button onClick={scrollToBottom} size="sm" variant="outline" className="flex-1">
              Scroll to Bottom
            </Button>
            <Button onClick={clearScrollData} size="sm" variant="destructive" className="flex-1">
              Clear & Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Chart Data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🔵 Chart Alignment Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="font-medium">Current Time:</div>
            <div className="font-mono text-xs">{chartData.currentTime}</div>
          </div>

          <div className="pt-3 border-t">
            <div className="text-sm text-muted-foreground mb-2">
              Check browser console for detailed chart alignment logs with 🔵 prefix
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LocalStorage Data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">💾 LocalStorage Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {Object.entries(chartData.storageData).map(([key, value]) => (
              <div key={key} className="grid grid-cols-[140px_1fr] gap-2">
                <div className="font-medium text-muted-foreground">{key}:</div>
                <div className="font-mono text-xs break-all">{value || 'null'}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Visual Indicator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📊 Visual Scroll Position</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full h-8 bg-muted rounded">
            <div 
              className="absolute h-full bg-ai-accent rounded transition-all"
              style={{ width: `${scrollPercentage}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
              {scrollPercentage}% scrolled
            </div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground text-center">
            {scrollData.currentScroll === 0 && 'At top of page'}
            {scrollData.currentScroll > 0 && scrollData.currentScroll < scrollData.maxScroll && 'Scrolled down'}
            {scrollData.currentScroll >= scrollData.maxScroll && scrollData.maxScroll > 0 && 'At bottom of page'}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📖 How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Timeline Scroll Issue:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
            <li>Navigate to home/timeline page</li>
            <li>Check if "Current Scroll" is 0 (should be at top)</li>
            <li>If not 0, check "Saved State" - should be empty on first load</li>
            <li>Open browser console and filter by 🔴 to see detailed logs</li>
          </ul>
          
          <p className="pt-3"><strong>Chart Alignment Issue:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
            <li>Go to a stock detail page (e.g., TSLA)</li>
            <li>Open browser console and filter by 🔵 or 🟢</li>
            <li>Look for "Time gap" in the logs</li>
            <li>If time gap is large (hours), that's the problem</li>
            <li>Check if timestamp is being set to current time or midnight</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}