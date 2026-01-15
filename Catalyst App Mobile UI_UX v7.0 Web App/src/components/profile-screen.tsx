import { useState, useEffect } from 'react';
import { Settings, User, Bell, Shield, HelpCircle, Star, Download, LogOut, ChevronRight, Moon, Sun, Smartphone, CreditCard } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';

import { ProfileSettingsScreen } from './profile-settings-screen';
import { HelpSupportScreen } from './help-support-screen';
import { useDarkMode } from '../utils/dark-mode-context';
import { useAuth } from '../utils/auth-context';
import { supabase } from '../utils/supabase-client';

interface ProfileScreenProps {
  // No props needed for this component
}

type ProfileView = 'main' | 'settings' | 'help';

export function ProfileScreen() {
  const [currentView, setCurrentView] = useState<ProfileView>('main');
  const { darkMode, toggleDarkMode } = useDarkMode();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [userStats, setUserStats] = useState({
    totalConversations: 0,
    totalQueries: 0,
    watchlistCount: 0,
    connectedAccounts: 0
  });

  // Load user stats from profile and database
  useEffect(() => {
    if (profile) {
      setUserStats({
        totalConversations: profile.total_conversations || 0,
        totalQueries: profile.total_queries || 0,
        watchlistCount: profile.default_watchlist?.length || 0,
        connectedAccounts: 0 // Will be updated from Plaid connections
      });

      // Load notification preferences
      if (profile.notification_preferences?.push_enabled !== undefined) {
        setNotifications(profile.notification_preferences.push_enabled);
      }
    }

    // Fetch connected Plaid accounts count
    fetchConnectedAccounts();
  }, [profile]);

  const fetchConnectedAccounts = async () => {
    if (!user) return;

    try {
      const response = await fetch(
        `https://${import.meta.env.VITE_SUPABASE_PROJECT_REF}.supabase.co/functions/v1/make-server-fe0a490e/plaid/connections/${user.id}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUserStats(prev => ({
          ...prev,
          connectedAccounts: data.connections?.length || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching connected accounts:', error);
    }
  };

  // Update notification preferences in database
  const handleNotificationToggle = async (enabled: boolean) => {
    setNotifications(enabled);

    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          notification_preferences: {
            ...(profile?.notification_preferences || {}),
            push_enabled: enabled
          },
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating notification preferences:', error);
        // Revert on error
        setNotifications(!enabled);
      } else {
        // Refresh profile
        await refreshProfile();
      }
    } catch (error) {
      console.error('Error in handleNotificationToggle:', error);
      setNotifications(!enabled);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      // User will be redirected to auth screen automatically by App.tsx
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Scroll to top when view changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentView]);

  if (currentView === 'settings') {
    return <ProfileSettingsScreen onBack={() => setCurrentView('main')} />;
  }

  if (currentView === 'help') {
    return <HelpSupportScreen onBack={() => setCurrentView('main')} />;
  }

  // Get user display data
  const fullName = user?.user_metadata?.full_name || 'User';
  const email = user?.email || '';
  const initials = fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';
  
  // Check if email is confirmed
  const isEmailVerified = !!user?.email_confirmed_at;
  
  // Calculate account age
  const accountAge = user?.created_at 
    ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const menuItems = [
    {
      id: 'account',
      title: 'Account Settings',
      description: 'Personal info, security, preferences',
      icon: User,
      action: () => setCurrentView('settings')
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Alerts, emails, push notifications',
      icon: Bell,
      action: () => setCurrentView('settings')
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      description: 'Data protection, two-factor auth',
      icon: Shield,
      action: () => setCurrentView('settings')
    },
    {
      id: 'help',
      title: 'Help & Support',
      description: 'FAQs, contact support, tutorials',
      icon: HelpCircle,
      action: () => setCurrentView('help')
    },
    {
      id: 'rate',
      title: 'Rate Catalyst',
      description: 'Help us improve the app',
      icon: Star,
      action: () => {
        // Open app store rating page
        window.open('https://catalyst.finance/rate', '_blank');
      }
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-background">
        <div className="px-4 py-4">
          <div className="flex items-center justify-center">
            <h1 className="text-[20px] font-medium">Profile</h1>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {/* Profile Header */}
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="text-lg bg-primary/10">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{fullName}</h2>
              <p className="text-muted-foreground text-sm">{email}</p>
              <div className="flex gap-2 mt-2">
                {isEmailVerified && (
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                    ✓ Verified
                  </Badge>
                )}
                {profile?.onboarding_completed && (
                  <Badge variant="outline">
                    Pro Member
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-semibold">{userStats.watchlistCount}</div>
              <div className="text-sm text-muted-foreground">Watchlist Stocks</div>
            </div>
            <div>
              <div className="text-2xl font-semibold">{userStats.totalConversations}</div>
              <div className="text-sm text-muted-foreground">AI Conversations</div>
            </div>
          </div>
        </Card>

        {/* Account Stats */}
        <Card className="p-4">
          <h3 className="font-medium mb-4">Account Activity</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Queries</span>
              <span className="font-medium">{userStats.totalQueries.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Connected Accounts</span>
              <span className="font-medium">{userStats.connectedAccounts}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Member Since</span>
              <span className="font-medium">
                {accountAge === 0 ? 'Today' : accountAge === 1 ? 'Yesterday' : `${accountAge} days ago`}
              </span>
            </div>
            {profile?.risk_tolerance && (
              <>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Risk Tolerance</span>
                  <span className="font-medium capitalize">{profile.risk_tolerance}</span>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Quick Settings */}
        <Card className="p-4">
          <h3 className="font-medium mb-4">Quick Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                <div>
                  <div className="font-medium">Dark Mode</div>
                  <div className="text-sm text-muted-foreground">Switch app theme</div>
                </div>
              </div>
              <Switch
                checked={darkMode}
                onCheckedChange={toggleDarkMode}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4" />
                <div>
                  <div className="font-medium">Push Notifications</div>
                  <div className="text-sm text-muted-foreground">Alert notifications</div>
                </div>
              </div>
              <Switch
                checked={notifications}
                onCheckedChange={handleNotificationToggle}
              />
            </div>
          </div>
        </Card>

        {/* Menu Items */}
        <Card className="overflow-hidden">
          <div className="divide-y divide-border">
            {menuItems.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  className="w-full p-4 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left"
                >
                  <div className="p-2 bg-muted rounded-full">
                    <IconComponent className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{item.title}</div>
                    <div className="text-sm text-muted-foreground">{item.description}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </Card>

        {/* App Info */}
        <Card className="p-4">
          <h3 className="font-medium mb-4">About</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span>1.2.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Updated</span>
              <span>Nov 21, 2025</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data Provider</span>
              <span>Finnhub + Supabase</span>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => {
                // Export user data
                const data = {
                  user: {
                    email: user?.email,
                    created_at: user?.created_at,
                    full_name: user?.user_metadata?.full_name
                  },
                  profile: profile
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `catalyst-data-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Export My Data
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => window.open('https://catalyst.finance/terms', '_blank')}
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              Terms & Privacy
            </Button>
          </div>
        </Card>

        {/* Sign Out */}
        <Card className="p-4">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground py-4">
          <p>Made with ❤️ for active investors</p>
          <p className="mt-1">© 2025 Catalyst. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
