import { useState } from 'react';
import { Link, X, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { PlaidLinkModal } from './plaid-link-modal';
import { ManualPortfolioSetup } from './manual-portfolio-setup';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ExternalAccountsSectionProps {
  portfolioIntegration?: {
    enabled: boolean;
    method: 'auto' | 'manual';
    portfolioTickers?: string[];
    connectedAccounts?: any[];
  } | null;
  onPortfolioUpdate?: (portfolioData: any) => void;
  manualPositions?: any[];
  onManualPositionsUpdate?: (positions: any[]) => void;
}

export function ExternalAccountsSection({ 
  portfolioIntegration, 
  onPortfolioUpdate,
  manualPositions = [],
  onManualPositionsUpdate
}: ExternalAccountsSectionProps) {
  const [isAccountsExpanded, setIsAccountsExpanded] = useState(false);
  const [showPlaidModal, setShowPlaidModal] = useState(false);
  const [showManualSetup, setShowManualSetup] = useState(false);
  const [portfolioData, setPortfolioData] = useState(portfolioIntegration);

  const hasConnectedPortfolio = portfolioData?.enabled && 
    ((portfolioData.connectedAccounts && portfolioData.connectedAccounts.length > 0) || 
     manualPositions.length > 0);

  const handlePlaidSuccess = async (publicToken: string, metadata: any) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-b622279b/portfolio/plaid/exchange`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ 
            public_token: publicToken,
            metadata 
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to link account');
      }

      const result = await response.json();

      const newAccount = {
        provider: metadata.institution?.name || 'Unknown',
        institution: metadata.institution?.name || 'Unknown',
        accounts: metadata.accounts || [],
        accountType: metadata.accounts?.[0]?.subtype || 'investment',
        itemId: result.itemId
      };

      const updatedPortfolioData = {
        ...portfolioData,
        enabled: true,
        method: 'auto' as const,
        connectedAccounts: [...(portfolioData?.connectedAccounts || []), newAccount],
        portfolioTickers: [...(portfolioData?.portfolioTickers || [])]
      };

      setPortfolioData(updatedPortfolioData);
      if (onPortfolioUpdate) {
        onPortfolioUpdate(updatedPortfolioData);
      }

      setShowPlaidModal(false);
    } catch (error) {
      console.error('Error linking account:', error);
    }
  };

  const handleRemoveAccount = async (accountIndex: number) => {
    if (!portfolioData?.connectedAccounts) return;

    const accountToRemove = portfolioData.connectedAccounts[accountIndex];

    if (accountToRemove.itemId) {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-b622279b/portfolio/plaid/disconnect`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({ itemId: accountToRemove.itemId }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to disconnect account');
        }
      } catch (error) {
        console.error('Error disconnecting account:', error);
      }
    }

    const updatedAccounts = portfolioData.connectedAccounts.filter((_, index) => index !== accountIndex);
    
    const updatedPortfolioData = updatedAccounts.length === 0 
      ? { 
          enabled: true, 
          method: 'manual' as const, 
          portfolioTickers: [],
          connectedAccounts: []
        }
      : {
          ...portfolioData,
          connectedAccounts: updatedAccounts
        };

    setPortfolioData(updatedPortfolioData);
    if (onPortfolioUpdate) {
      onPortfolioUpdate(updatedPortfolioData);
    }
  };

  const handleManualPositionsComplete = (positions: any[]) => {
    if (onManualPositionsUpdate) {
      onManualPositionsUpdate(positions);
    }
    setShowManualSetup(false);
  };

  if (showManualSetup) {
    return (
      <ManualPortfolioSetup 
        onBack={() => setShowManualSetup(false)}
        onComplete={handleManualPositionsComplete}
        isAddingToExisting={hasConnectedPortfolio}
      />
    );
  }

  if (!hasConnectedPortfolio) {
    return null; // Don't show anything if no portfolio is connected
  }

  return (
    <>
      <Card 
        className="mb-4 bg-gradient-to-r from-ai-accent/5 to-ai-accent/10 border-ai-accent/20 cursor-pointer"
        onClick={() => setIsAccountsExpanded(!isAccountsExpanded)}
      >
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link className="w-4 h-4 text-ai-accent" />
              <span className="text-sm font-medium">External Accounts</span>
              <Badge variant="secondary" className="text-xs">
                {(portfolioData?.connectedAccounts?.length || 0) + (manualPositions.length > 0 ? 1 : 0)}
              </Badge>
            </div>
            {isAccountsExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          
          {/* Expanded Content */}
          {isAccountsExpanded && (
            <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
              {/* Connected Plaid Accounts */}
              {portfolioData?.connectedAccounts && portfolioData.connectedAccounts.length > 0 && (
                <>
                  {portfolioData.connectedAccounts.map((account, index) => {
                    let accountName = account.accounts?.[0]?.officialName || 
                                     account.accounts?.[0]?.name || 
                                     '';
                    
                    accountName = accountName.replace(/^Plaid\\s+/i, '');
                    
                    const accountSubtype = account.accounts?.[0]?.subtype || 
                                          account.accountType || 
                                          '';
                    
                    const formattedSubtype = accountSubtype
                      .replace(/_/g, ' ')
                      .split(' ')
                      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ');
                    
                    const displayName = accountName || formattedSubtype || 'Investment Account';
                    
                    return (
                      <div 
                        key={index} 
                        className="flex items-center justify-between bg-background/50 rounded-lg px-3 py-2 border border-border/50"
                      >
                        <div className="text-xs">
                          <div className="font-medium text-foreground">{account.institution}</div>
                          <div className="text-muted-foreground">{displayName}</div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveAccount(index);
                          }}
                          className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                          title="Disconnect account"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </>
              )}
              
              {/* Manual Entry Account */}
              {manualPositions.length > 0 && (
                <div className="flex items-center justify-between bg-background/50 rounded-lg px-3 py-2 border border-border/50">
                  <div className="text-xs">
                    <div className="font-medium text-foreground">Manual Entry</div>
                    <div className="text-muted-foreground">{manualPositions.length} position{manualPositions.length !== 1 ? 's' : ''}</div>
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPlaidModal(true);
                  }}
                >
                  <Link className="h-3.5 w-3.5 mr-2" />
                  Connect Broker Account
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowManualSetup(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-2" />
                  Add Manual Position
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Plaid Link Modal */}
      {showPlaidModal && (
        <PlaidLinkModal
          onSuccess={handlePlaidSuccess}
          onExit={() => setShowPlaidModal(false)}
        />
      )}
    </>
  );
}
