import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Database, Upload, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import StockAPI from '../utils/supabase/stock-api';
import { migrateStockData, initializeStockDatabase, verifyMigration } from '../utils/supabase/migrate-data';
import DataService from '../utils/data-service';

interface DatabaseSetupProps {
  onClose: () => void;
}

export function DatabaseSetup({ onClose }: DatabaseSetupProps) {
  const [status, setStatus] = useState<'checking' | 'empty' | 'ready' | 'error'>('checking');
  const [stockCount, setStockCount] = useState(0);
  const [sectors, setSectors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const checkDatabaseStatus = async () => {
    try {
      setStatus('checking');
      addLog('Checking database status...');
      
      const stocks = await StockAPI.getAllStocks();
      const stockSymbols = Object.keys(stocks);
      
      if (stockSymbols.length === 0) {
        setStatus('empty');
        addLog('Database is empty - ready for initialization');
      } else {
        setStockCount(stockSymbols.length);
        const availableSectors = await StockAPI.getSectors();
        setSectors(availableSectors);
        setStatus('ready');
        addLog(`Database ready with ${stockSymbols.length} stocks across ${availableSectors.length} sectors`);
      }
    } catch (error) {
      console.error('Error checking database status:', error);
      setStatus('error');
      setError(error instanceof Error ? error.message : 'Unknown error');
      addLog(`Error checking database: ${error}`);
    }
  };

  const initializeDatabase = async () => {
    try {
      setIsLoading(true);
      setError(null);
      addLog('Starting database initialization...');
      
      await initializeStockDatabase();
      addLog('Database initialization completed');
      
      addLog('Verifying migration...');
      await verifyMigration();
      
      addLog('Initializing DataService...');
      await DataService.initialize();
      
      await checkDatabaseStatus();
      addLog('Database setup completed successfully!');
    } catch (error) {

      setError(error instanceof Error ? error.message : 'Unknown error');
      addLog(`Error during initialization: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const migrateData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      addLog('Starting data migration...');
      
      await migrateStockData();
      addLog('Data migration completed');
      
      addLog('Verifying migration...');
      await verifyMigration();
      
      await checkDatabaseStatus();
      addLog('Data migration completed successfully!');
    } catch (error) {

      setError(error instanceof Error ? error.message : 'Unknown error');
      addLog(`Error during migration: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      addLog('Refreshing data...');
      
      DataService.clearCache();
      await DataService.initialize();
      await checkDatabaseStatus();
      
      addLog('Data refreshed successfully!');
    } catch (error) {

      setError(error instanceof Error ? error.message : 'Unknown error');
      addLog(`Error refreshing data: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkDatabaseStatus();
  }, []);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-ai-accent" />
              <CardTitle>Stock Database Setup</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {status === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {status === 'empty' && <AlertCircle className="h-4 w-4 text-warning" />}
              {status === 'ready' && <CheckCircle className="h-4 w-4 text-positive" />}
              {status === 'error' && <AlertCircle className="h-4 w-4 text-negative" />}
              
              <span className="font-medium">
                {status === 'checking' && 'Checking database...'}
                {status === 'empty' && 'Database Empty'}
                {status === 'ready' && 'Database Ready'}
                {status === 'error' && 'Database Error'}
              </span>
            </div>
            
            {status === 'ready' && (
              <div className="flex gap-2">
                <Badge variant="secondary">{stockCount} stocks</Badge>
                <Badge variant="secondary">{sectors.length} sectors</Badge>
              </div>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="border-negative/20 bg-negative/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-negative">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {status === 'empty' && (
              <Button
                onClick={initializeDatabase}
                disabled={isLoading}
                className="w-full bg-ai-accent hover:bg-ai-accent/90 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Initializing Database...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Initialize Database
                  </>
                )}
              </Button>
            )}

            {status === 'ready' && (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={migrateData}
                  disabled={isLoading}
                  variant="outline"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Update Data
                </Button>
                
                <Button
                  onClick={refreshData}
                  disabled={isLoading}
                  variant="outline"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh
                </Button>
              </div>
            )}

            {status === 'error' && (
              <Button
                onClick={checkDatabaseStatus}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Retry
              </Button>
            )}
          </div>

          {/* Available Sectors */}
          {sectors.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Available Sectors</h4>
              <div className="flex flex-wrap gap-1">
                {sectors.map(sector => (
                  <Badge key={sector} variant="outline" className="text-xs">
                    {sector}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Logs */}
          {logs.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Activity Log</h4>
              <div className="bg-muted/50 rounded-lg p-3 max-h-32 overflow-y-auto">
                <div className="space-y-1">
                  {logs.slice(-10).map((log, index) => (
                    <div key={index} className="text-xs text-muted-foreground font-mono">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• This connects to your "Catalyst Stock Data" Supabase table</p>
            <p>• Stock data includes prices, sectors, financial metrics, and more</p>
            <p>• Data can be updated in real-time vs hardcoded JSON files</p>
            <p>• Falls back to mock data if database is unavailable</p>
            <p>• Direct database access - no server layer needed</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}