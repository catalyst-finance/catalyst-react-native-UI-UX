import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Bell, Shield, Smartphone, Trash2, Edit3, Download, RefreshCw } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';

interface PortfolioSettingsScreenProps {
  onBack: () => void;
}

export function PortfolioSettingsScreen({ onBack }: PortfolioSettingsScreenProps) {
  // Scroll to top when screen opens
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const [settings, setSettings] = useState({
    hideBalances: false,
    pushNotifications: true,
    priceAlerts: true,
    catalystAlerts: true,
    weeklyReports: true,
    autoSync: true,
    biometricLock: false,
    dataExport: true
  });

  const connectedAccounts = [
    {
      id: '1',
      name: 'Robinhood',
      type: 'Brokerage',
      status: 'connected',
      lastSync: '2 minutes ago',
      positions: 3
    },
    {
      id: '2', 
      name: 'Fidelity',
      type: 'Brokerage',
      status: 'connected',
      lastSync: '5 minutes ago',
      positions: 2
    },
    {
      id: '3',
      name: 'Schwab',
      type: 'Investment',
      status: 'error',
      lastSync: '2 hours ago',
      positions: 1
    }
  ];

  const updateSetting = (key: keyof typeof settings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

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
            <h1>Portfolio Settings</h1>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {/* Privacy Settings */}
        <Card className="p-4">
          <h3 className="font-medium mb-4">Privacy & Display</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Hide Balances</div>
                  <div className="text-sm text-muted-foreground">Show ••••• instead of amounts</div>
                </div>
              </div>
              <Switch
                checked={settings.hideBalances}
                onCheckedChange={(checked) => updateSetting('hideBalances', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Biometric Lock</div>
                  <div className="text-sm text-muted-foreground">Require Face ID to view portfolio</div>
                </div>
              </div>
              <Switch
                checked={settings.biometricLock}
                onCheckedChange={(checked) => updateSetting('biometricLock', checked)}
              />
            </div>
          </div>
        </Card>

        {/* Notification Settings */}
        <Card className="p-4">
          <h3 className="font-medium mb-4">Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Push Notifications</div>
                  <div className="text-sm text-muted-foreground">Enable mobile notifications</div>
                </div>
              </div>
              <Switch
                checked={settings.pushNotifications}
                onCheckedChange={(checked) => updateSetting('pushNotifications', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Price Alerts</div>
                  <div className="text-sm text-muted-foreground">Notify on significant price movements</div>
                </div>
              </div>
              <Switch
                checked={settings.priceAlerts}
                onCheckedChange={(checked) => updateSetting('priceAlerts', checked)}
                disabled={!settings.pushNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Catalyst Alerts</div>
                  <div className="text-sm text-muted-foreground">Notify on market catalysts</div>
                </div>
              </div>
              <Switch
                checked={settings.catalystAlerts}
                onCheckedChange={(checked) => updateSetting('catalystAlerts', checked)}
                disabled={!settings.pushNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Download className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Weekly Reports</div>
                  <div className="text-sm text-muted-foreground">Performance summary emails</div>
                </div>
              </div>
              <Switch
                checked={settings.weeklyReports}
                onCheckedChange={(checked) => updateSetting('weeklyReports', checked)}
              />
            </div>
          </div>
        </Card>

        {/* Connected Accounts */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Connected Accounts</h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync All
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {connectedAccounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    account.status === 'connected' ? 'bg-positive' : 
                    account.status === 'error' ? 'bg-negative' : 'bg-neutral'
                  }`} />
                  <div>
                    <div className="font-medium">{account.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {account.positions} positions • Last sync: {account.lastSync}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {connectedAccounts.some(acc => acc.status === 'error') && (
            <Alert className="mt-4">
              <AlertDescription>
                Some accounts failed to sync. Check your login credentials and try reconnecting.
              </AlertDescription>
            </Alert>
          )}
        </Card>

        {/* Data & Sync */}
        <Card className="p-4">
          <h3 className="font-medium mb-4">Data & Sync</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Auto Sync</div>
                  <div className="text-sm text-muted-foreground">Automatically update positions</div>
                </div>
              </div>
              <Switch
                checked={settings.autoSync}
                onCheckedChange={(checked) => updateSetting('autoSync', checked)}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                Export Portfolio Data
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <RefreshCw className="h-4 w-4 mr-2" />
                Force Sync All Accounts
              </Button>
              <Button variant="outline" className="w-full justify-start text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Local Data
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}