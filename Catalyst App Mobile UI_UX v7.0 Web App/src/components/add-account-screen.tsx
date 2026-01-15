import { useState } from 'react';
import { ArrowLeft, Shield, CheckCircle, AlertCircle, Building, CreditCard, Lock, ExternalLink } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';

interface AddAccountScreenProps {
  onBack: () => void;
}

const supportedBrokers = [
  {
    id: 'robinhood',
    name: 'Robinhood',
    logo: '🏹',
    type: 'Brokerage',
    features: ['Stocks', 'Options', 'Crypto'],
    popular: true
  },
  {
    id: 'fidelity',
    name: 'Fidelity',
    logo: '🏛️',
    type: 'Full Service',
    features: ['Stocks', 'Options', 'Mutual Funds', '401k'],
    popular: true
  },
  {
    id: 'schwab',
    name: 'Charles Schwab',
    logo: '🏦',
    type: 'Full Service',
    features: ['Stocks', 'Options', 'ETFs', 'Banking'],
    popular: true
  },
  {
    id: 'etrade',
    name: 'E*TRADE',
    logo: '📈',
    type: 'Brokerage',
    features: ['Stocks', 'Options', 'Futures'],
    popular: false
  },
  {
    id: 'td',
    name: 'TD Ameritrade',
    logo: '📊',
    type: 'Brokerage',
    features: ['Stocks', 'Options', 'Futures', 'Forex'],
    popular: false
  },
  {
    id: 'webull',
    name: 'Webull',
    logo: '🐂',
    type: 'Commission-Free',
    features: ['Stocks', 'Options', 'Crypto'],
    popular: false
  },
  {
    id: 'ib',
    name: 'Interactive Brokers',
    logo: '🌐',
    type: 'Professional',
    features: ['Global Markets', 'Low Fees', 'Advanced Tools'],
    popular: false
  },
  {
    id: 'other',
    name: 'Other Broker',
    logo: '🏢',
    type: 'Manual Entry',
    features: ['Custom Import'],
    popular: false
  }
];

type ConnectionStep = 'select' | 'connect' | 'verify' | 'success';

export function AddAccountScreen({ onBack }: AddAccountScreenProps) {
  // Scroll to top when screen opens
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const [currentStep, setCurrentStep] = useState<ConnectionStep>('select');
  const [selectedBroker, setSelectedBroker] = useState<typeof supportedBrokers[0] | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const handleBrokerSelect = (broker: typeof supportedBrokers[0]) => {
    setSelectedBroker(broker);
    setCurrentStep('connect');
    setConnectionError(null);
  };

  const handleConnect = async () => {
    // Handle broker connection simulation (this is a demo flow for unsupported brokers)
    setIsConnecting(true);
    setConnectionError(null);

    // Simulate connection process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate random success/failure for demo
    const success = Math.random() > 0.3;
    
    if (success) {
      setCurrentStep('verify');
      setTimeout(() => setCurrentStep('success'), 1500);
    } else {
      setConnectionError('Failed to connect. Please check your credentials and try again.');
    }
    
    setIsConnecting(false);
  };

  const renderSelectBroker = () => (
    <div className="space-y-4">
      <div className="text-center py-6">
        <Building className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <h2 className="text-xl font-semibold mb-2">Connect Your Brokerage</h2>
        <p className="text-muted-foreground">
          Securely connect your investment accounts to track all your positions in one place.
        </p>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Your data is encrypted and we use bank-level security. We never store your login credentials.
        </AlertDescription>
      </Alert>



      <div className="space-y-3">
        <h3 className="font-medium">Popular Brokers</h3>
        {supportedBrokers.filter(b => b.popular).map((broker) => (
          <Card
            key={broker.id}
            className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => handleBrokerSelect(broker)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{broker.logo}</div>
                <div>
                  <div className="font-medium">{broker.name}</div>
                  <div className="text-sm text-muted-foreground">{broker.type}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {broker.features.slice(0, 2).map((feature) => (
                  <Badge key={feature} variant="outline" className="text-xs">
                    {feature}
                  </Badge>
                ))}
                {broker.features.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{broker.features.length - 2}
                  </Badge>
                )}
              </div>
            </div>
          </Card>
        ))}

        <Separator />

        <h3 className="font-medium">Other Brokers</h3>
        {supportedBrokers.filter(b => !b.popular).map((broker) => (
          <Card
            key={broker.id}
            className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => handleBrokerSelect(broker)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-xl">{broker.logo}</div>
                <div>
                  <div className="font-medium text-sm">{broker.name}</div>
                  <div className="text-xs text-muted-foreground">{broker.type}</div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderConnect = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-3xl mb-3">{selectedBroker?.logo}</div>
        <h2 className="text-xl font-semibold mb-2">Connect to {selectedBroker?.name}</h2>
        <p className="text-muted-foreground">
          You'll be redirected to {selectedBroker?.name} to authorize the connection securely.
        </p>
      </div>

      <Alert>
        <Lock className="h-4 w-4" />
        <AlertDescription>
          This connection is secured by Plaid, trusted by thousands of financial apps. 
          We cannot see your login credentials.
        </AlertDescription>
      </Alert>

      <Card className="p-4">
        <h3 className="font-medium mb-3">What we'll access:</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-positive" />
            <span>Account holdings and positions</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-positive" />
            <span>Transaction history</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-positive" />
            <span>Account balances</span>
          </div>
        </div>
        
        <Separator className="my-3" />
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>❌ Trading permissions</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>❌ Ability to move money</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>❌ Personal information</span>
          </div>
        </div>
      </Card>

      {connectionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{connectionError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <Button 
          onClick={handleConnect} 
          disabled={isConnecting}
          className="w-full"
        >
          {isConnecting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Connecting...
            </>
          ) : (
            <>
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect with {selectedBroker?.name}
            </>
          )}
        </Button>
        
        <Button variant="outline" onClick={() => setCurrentStep('select')} className="w-full">
          Choose Different Broker
        </Button>
      </div>
    </div>
  );

  const renderVerify = () => (
    <div className="space-y-6 text-center py-8">
      <div className="w-16 h-16 border-4 border-ai-accent border-t-transparent rounded-full animate-spin mx-auto" />
      <div>
        <h2 className="text-xl font-semibold mb-2">Verifying Connection</h2>
        <p className="text-muted-foreground">
          We're securely importing your account data. This may take a moment...
        </p>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="space-y-6 text-center py-8">
      <CheckCircle className="h-16 w-16 text-positive mx-auto" />
      <div>
        <h2 className="text-xl font-semibold mb-2">Successfully Connected!</h2>
        <p className="text-muted-foreground mb-6">
          Your {selectedBroker?.name} account has been connected. We found 3 positions and $45,672 in assets.
        </p>
      </div>

      <Card className="p-4 text-left">
        <h3 className="font-medium mb-3">What's Next?</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-positive" />
            <span>Your positions will appear in your portfolio</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-positive" />
            <span>We'll track catalysts for your holdings</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-positive" />
            <span>You'll receive relevant alerts and insights</span>
          </div>
        </div>
      </Card>

      <Button onClick={onBack} className="w-full">
        View My Portfolio
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-40">
        <div className="px-4 py-4">
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
              <h1>Add Account</h1>
              {selectedBroker && currentStep !== 'select' && (
                <p className="text-sm text-muted-foreground">{selectedBroker.name}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        {currentStep === 'select' && renderSelectBroker()}
        {currentStep === 'connect' && renderConnect()}
        {currentStep === 'verify' && renderVerify()}
        {currentStep === 'success' && renderSuccess()}
      </div>
    </div>
  );
}