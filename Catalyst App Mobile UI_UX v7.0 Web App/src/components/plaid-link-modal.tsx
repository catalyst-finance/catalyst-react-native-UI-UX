import { useState, useEffect, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Shield, Check, X, AlertCircle, Loader2 } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface PlaidLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (portfolioData: { holdings: string[]; accountInfo: any }) => void;
}

export function PlaidLinkModal({ isOpen, onClose, onSuccess }: PlaidLinkModalProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Generate a user ID (in production, use actual authenticated user ID)
  const userId = 'catalyst_user_' + Math.random().toString(36).substring(7);

  // Fetch link token from backend when modal opens
  useEffect(() => {
    if (isOpen && !linkToken) {
      fetchLinkToken();
    }
  }, [isOpen]);

  const fetchLinkToken = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-fe0a490e/plaid/create-link-token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ userId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create link token');
      }

      const data = await response.json();
      setLinkToken(data.link_token);
    } catch (err: any) {
      console.error('Error fetching link token:', err);
      setError(err.message || 'Failed to initialize Plaid. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnSuccess = useCallback(
    async (publicToken: string, metadata: any) => {
      setIsProcessing(true);

      try {
        // Exchange public token for access token
        const exchangeResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-fe0a490e/plaid/exchange-public-token`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              publicToken,
              userId,
              institutionName: metadata.institution?.name || 'Unknown',
            }),
          }
        );

        if (!exchangeResponse.ok) {
          const errorData = await exchangeResponse.json();
          throw new Error(errorData.error || 'Failed to connect account');
        }

        const exchangeData = await exchangeResponse.json();

        // Fetch holdings
        const holdingsResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-fe0a490e/plaid/get-holdings`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              connectionId: exchangeData.connectionId,
            }),
          }
        );

        if (!holdingsResponse.ok) {
          const errorData = await holdingsResponse.json();
          throw new Error(errorData.error || 'Failed to fetch holdings');
        }

        const holdingsData = await holdingsResponse.json();

        // Pass data to parent component
        onSuccess({
          holdings: holdingsData.holdings,
          accountInfo: {
            institution: metadata.institution?.name || 'Unknown',
            accounts: holdingsData.accountInfo?.accounts || [],
            accountType: holdingsData.accountInfo?.accountType || 'Investment Account',
            lastUpdated: new Date().toISOString(),
            connectionId: exchangeData.connectionId,
          },
        });

        // Close modal
        onClose();
      } catch (err: any) {
        console.error('❌ Error processing Plaid connection:', err);
        setError(err.message || 'Failed to process connection. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    },
    [userId, onSuccess, onClose]
  );

  const handleOnExit = useCallback(() => {
    // Don't close the modal automatically - let user try again
  }, []);

  const config: any = {
    token: linkToken,
    onSuccess: handleOnSuccess,
    onExit: handleOnExit,
  };

  const { open, ready } = usePlaidLink(config);

  // Auto-open Plaid Link when ready
  useEffect(() => {
    if (ready && linkToken && isOpen) {
      open();
    }
  }, [ready, linkToken, isOpen, open]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setLinkToken(null);
      setError(null);
      setIsLoading(false);
      setIsProcessing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-ai-accent/10 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-ai-accent" />
              </div>
              <div>
                <CardTitle className="text-lg">Connect your account</CardTitle>
                <p className="text-xs text-muted-foreground">Powered by Plaid</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
              disabled={isProcessing}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-ai-accent" />
              <div className="text-center">
                <p className="text-sm font-medium">Initializing Plaid...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This will only take a moment
                </p>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-ai-accent" />
              <div className="text-center">
                <p className="text-sm font-medium">Connecting your account...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Fetching your portfolio holdings
                </p>
              </div>
            </div>
          )}

          {error && !isLoading && !isProcessing && (
            <div className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Connection Failed</p>
                    <p className="text-xs text-muted-foreground mt-1">{error}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={fetchLinkToken}
                  className="flex-1 bg-ai-accent hover:bg-ai-accent/90 text-primary-foreground"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {!isLoading && !isProcessing && !error && linkToken && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-positive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-positive" />
                </div>
                <p className="text-sm font-medium mb-2">Ready to connect</p>
                <p className="text-xs text-muted-foreground">
                  Click the button below to select your brokerage account
                </p>
              </div>

              <Button
                onClick={() => open()}
                disabled={!ready}
                className="w-full bg-ai-accent hover:bg-ai-accent/90 text-primary-foreground"
                size="lg"
              >
                Open Plaid
              </Button>

              <div className="bg-muted/30 border border-border rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-ai-accent flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-muted-foreground space-y-2">
                    <p className="font-medium text-foreground">Testing in Sandbox Mode:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-1">
                      <li>Click "Open Plaid" above</li>
                      <li>Search for <code className="bg-muted px-1 rounded text-ai-accent">"Tartan Bank"</code> or <code className="bg-muted px-1 rounded text-ai-accent">"First Platypus Bank"</code></li>
                      <li>Use username: <code className="bg-muted px-1 rounded text-ai-accent">user_good</code> and password: <code className="bg-muted px-1 rounded text-ai-accent">pass_good</code></li>
                      <li>Complete the authentication flow (phone/SMS verification if prompted)</li>
                      <li>You'll get a test portfolio with popular stocks (AAPL, TSLA, NVDA, etc.)</li>
                    </ol>
                    <p className="text-[11px] text-muted-foreground/80 mt-2 italic">
                      Note: Sandbox data is automatically converted to recognizable tickers for testing. Only investment accounts (IRA, 401k) are shown.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-muted/30 border border-border rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium mb-1">Bank-level security</p>
                    <p>
                      Your data is encrypted and secure. Catalyst never sees your login
                      credentials - they go directly to Plaid.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isLoading && !isProcessing && !error && !linkToken && (
            <div className="space-y-4">
              <div className="bg-muted/30 border border-border rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium mb-1">Setup Required</p>
                    <p>
                      Plaid API credentials need to be configured. Please add PLAID_CLIENT_ID
                      and PLAID_SECRET to your environment variables.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  onClick={fetchLinkToken}
                  className="flex-1 bg-ai-accent hover:bg-ai-accent/90 text-primary-foreground"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}