import { useState, useEffect } from 'react';
import { ArrowLeft, User, Mail, Smartphone, Shield, Key, Eye, EyeOff, Camera, Trash2, Loader2, Check, AlertCircle } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAuth } from '../utils/auth-context';
import { supabase } from '../utils/supabase-client';

interface ProfileSettingsScreenProps {
  onBack: () => void;
}

export function ProfileSettingsScreen({ onBack }: ProfileSettingsScreenProps) {
  const { user, profile, updateProfile, refreshProfile } = useAuth();
  
  // Scroll to top when screen opens
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Initialize from auth context
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    riskTolerance: '',
    investmentGoals: [] as string[],
    preferredSectors: [] as string[]
  });

  const [notificationPrefs, setNotificationPrefs] = useState({
    push_enabled: true,
    email_enabled: true,
    event_alerts: true,
    price_alerts: true,
    news_alerts: false
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    biometricAuth: false,
    dataEncryption: true,
    shareAnalytics: false
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load data from auth context
  useEffect(() => {
    if (user && profile) {
      setProfileData({
        fullName: user.user_metadata?.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        riskTolerance: profile.risk_tolerance || '',
        investmentGoals: profile.investment_goals || [],
        preferredSectors: profile.preferred_sectors || []
      });

      setNotificationPrefs({
        push_enabled: profile.notification_preferences?.push_enabled ?? true,
        email_enabled: profile.notification_preferences?.email_enabled ?? true,
        event_alerts: profile.notification_preferences?.event_alerts ?? true,
        price_alerts: profile.notification_preferences?.price_alerts ?? true,
        news_alerts: profile.notification_preferences?.news_alerts ?? false
      });
    }
  }, [user, profile]);

  const updateProfileData = (key: keyof typeof profileData, value: any) => {
    setProfileData(prev => ({ ...prev, [key]: value }));
  };

  const updateNotificationPref = (key: keyof typeof notificationPrefs, value: boolean) => {
    setNotificationPrefs(prev => ({ ...prev, [key]: value }));
  };

  const updateSecuritySetting = (key: keyof typeof securitySettings, value: boolean) => {
    setSecuritySettings(prev => ({ ...prev, [key]: value }));
  };

  const updatePasswordData = (key: keyof typeof passwordData, value: string) => {
    setPasswordData(prev => ({ ...prev, [key]: value }));
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // Update user metadata (full_name)
      if (profileData.fullName !== user?.user_metadata?.full_name) {
        const { error: authError } = await supabase.auth.updateUser({
          data: {
            full_name: profileData.fullName
          }
        });

        if (authError) throw authError;
      }

      // Update phone if changed
      if (profileData.phone !== user?.phone) {
        const { error: phoneError } = await supabase.auth.updateUser({
          phone: profileData.phone
        });

        if (phoneError) throw phoneError;
      }

      // Update profile in database
      const { error: profileError } = await updateProfile({
        risk_tolerance: profileData.riskTolerance,
        investment_goals: profileData.investmentGoals,
        preferred_sectors: profileData.preferredSectors,
        notification_preferences: notificationPrefs
      });

      if (profileError) throw profileError;

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setSaveError(error.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    setSaveError(null);
    setSaveSuccess(false);

    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setSaveError('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setSaveError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setSaveError('Password must be at least 8 characters');
      return;
    }

    setIsSaving(true);

    try {
      // First verify current password by signing in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: passwordData.currentPassword
      });

      if (verifyError) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (updateError) throw updateError;

      // Clear password fields
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error changing password:', error);
      setSaveError(error.message || 'Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  // Get user initials
  const initials = profileData.fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

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
            <h1 className="text-[20px] font-medium">Account Settings</h1>
          </div>
        </div>
      </div>

      <div className="px-4">
        {/* Success/Error Messages */}
        {saveSuccess && (
          <Alert className="mt-4 bg-green-500/10 border-green-500/20 text-green-500">
            <Check className="h-4 w-4" />
            <AlertDescription>Changes saved successfully!</AlertDescription>
          </Alert>
        )}
        {saveError && (
          <Alert className="mt-4 bg-destructive/10 border-destructive/20 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mt-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6 mt-6">
            {/* Profile Photo */}
            <Card className="p-4">
              <h3 className="font-medium mb-4">Profile Photo</h3>
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="text-lg bg-primary/10">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" disabled>
                    <Camera className="h-4 w-4 mr-2" />
                    Change Photo
                  </Button>
                  <p className="text-xs text-muted-foreground">Coming soon</p>
                </div>
              </div>
            </Card>

            {/* Personal Information */}
            <Card className="p-4">
              <h3 className="font-medium mb-4">Personal Information</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={profileData.fullName}
                    onChange={(e) => updateProfileData('fullName', e.target.value)}
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Email cannot be changed
                  </p>
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number (Optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => updateProfileData('phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
            </Card>

            {/* Investment Preferences */}
            <Card className="p-4">
              <h3 className="font-medium mb-4">Investment Preferences</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="riskTolerance">Risk Tolerance</Label>
                  <Select
                    value={profileData.riskTolerance}
                    onValueChange={(value) => updateProfileData('riskTolerance', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select risk tolerance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conservative">Conservative</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="aggressive">Aggressive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Investment Goals</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {['Growth', 'Income', 'Preservation', 'Speculation'].map((goal) => {
                      const isSelected = profileData.investmentGoals.includes(goal.toLowerCase());
                      return (
                        <Button
                          key={goal}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            if (isSelected) {
                              updateProfileData('investmentGoals', 
                                profileData.investmentGoals.filter(g => g !== goal.toLowerCase())
                              );
                            } else {
                              updateProfileData('investmentGoals', 
                                [...profileData.investmentGoals, goal.toLowerCase()]
                              );
                            }
                          }}
                        >
                          {goal}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label>Preferred Sectors</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {['Technology', 'Healthcare', 'Finance', 'Energy', 'Consumer', 'Industrial'].map((sector) => {
                      const isSelected = profileData.preferredSectors.includes(sector.toLowerCase());
                      return (
                        <Button
                          key={sector}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            if (isSelected) {
                              updateProfileData('preferredSectors', 
                                profileData.preferredSectors.filter(s => s !== sector.toLowerCase())
                              );
                            } else {
                              updateProfileData('preferredSectors', 
                                [...profileData.preferredSectors, sector.toLowerCase()]
                              );
                            }
                          }}
                        >
                          {sector}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>

            {/* Notifications */}
            <Card className="p-4">
              <h3 className="font-medium mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Email Notifications</div>
                    <div className="text-sm text-muted-foreground">Receive updates via email</div>
                  </div>
                  <Switch
                    checked={notificationPrefs.email_enabled}
                    onCheckedChange={(checked) => updateNotificationPref('email_enabled', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Event Alerts</div>
                    <div className="text-sm text-muted-foreground">Earnings, FDA approvals, etc.</div>
                  </div>
                  <Switch
                    checked={notificationPrefs.event_alerts}
                    onCheckedChange={(checked) => updateNotificationPref('event_alerts', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Price Alerts</div>
                    <div className="text-sm text-muted-foreground">Stock price movements</div>
                  </div>
                  <Switch
                    checked={notificationPrefs.price_alerts}
                    onCheckedChange={(checked) => updateNotificationPref('price_alerts', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">News Alerts</div>
                    <div className="text-sm text-muted-foreground">Breaking market news</div>
                  </div>
                  <Switch
                    checked={notificationPrefs.news_alerts}
                    onCheckedChange={(checked) => updateNotificationPref('news_alerts', checked)}
                  />
                </div>
              </div>
            </Card>

            <Button 
              className="w-full" 
              onClick={handleSaveProfile}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </TabsContent>

          <TabsContent value="security" className="space-y-6 mt-6">
            {/* Password */}
            <Card className="p-4">
              <h3 className="font-medium mb-4">Change Password</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => updatePasswordData('currentPassword', e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => togglePasswordVisibility('current')}
                    >
                      {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => updatePasswordData('newPassword', e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => togglePasswordVisibility('new')}
                    >
                      {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Must be at least 8 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => updatePasswordData('confirmPassword', e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => togglePasswordVisibility('confirm')}
                    >
                      {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Button 
                  className="w-full"
                  onClick={handleChangePassword}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </div>
            </Card>

            {/* Two-Factor Authentication */}
            <Card className="p-4">
              <h3 className="font-medium mb-4">Two-Factor Authentication</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Enable 2FA</div>
                    <div className="text-sm text-muted-foreground">Add an extra layer of security</div>
                  </div>
                  <Switch
                    checked={securitySettings.twoFactorAuth}
                    onCheckedChange={(checked) => updateSecuritySetting('twoFactorAuth', checked)}
                    disabled
                  />
                </div>
                <p className="text-xs text-muted-foreground">Coming soon</p>
              </div>
            </Card>

            {/* Additional Security */}
            <Card className="p-4">
              <h3 className="font-medium mb-4">Additional Security</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Biometric Authentication</div>
                    <div className="text-sm text-muted-foreground">Use Face ID or fingerprint</div>
                  </div>
                  <Switch
                    checked={securitySettings.biometricAuth}
                    onCheckedChange={(checked) => updateSecuritySetting('biometricAuth', checked)}
                    disabled
                  />
                </div>
                <p className="text-xs text-muted-foreground">Coming soon</p>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-6 mt-6">
            {/* Data & Privacy */}
            <Card className="p-4">
              <h3 className="font-medium mb-4">Data & Privacy</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Data Encryption</div>
                    <div className="text-sm text-muted-foreground">Encrypt sensitive data locally</div>
                  </div>
                  <Switch
                    checked={securitySettings.dataEncryption}
                    onCheckedChange={(checked) => updateSecuritySetting('dataEncryption', checked)}
                    disabled
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Share Analytics</div>
                    <div className="text-sm text-muted-foreground">Help improve the app with usage data</div>
                  </div>
                  <Switch
                    checked={securitySettings.shareAnalytics}
                    onCheckedChange={(checked) => updateSecuritySetting('shareAnalytics', checked)}
                  />
                </div>
              </div>
            </Card>

            {/* Data Management */}
            <Card className="p-4">
              <h3 className="font-medium mb-4">Data Management</h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  Download My Data
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-destructive"
                  onClick={async () => {
                    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                      // Implement account deletion
                    }
                  }}
                >
                  Delete Account
                </Button>
              </div>
            </Card>

            {/* Privacy Notice */}
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                We take your privacy seriously. Your financial data is encrypted and never shared with third parties 
                without your explicit consent. Learn more in our Privacy Policy.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
