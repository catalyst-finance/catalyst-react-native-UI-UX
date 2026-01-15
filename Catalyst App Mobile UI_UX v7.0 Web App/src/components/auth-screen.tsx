import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, AlertCircle, Check, TrendingUp } from 'lucide-react';
import { useAuth } from '../utils/auth-context';

interface AuthScreenProps {
  onComplete?: () => void;
}

export function AuthScreen({ onComplete }: AuthScreenProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        
        if (error) {
          setError(error.message);
        } else {
          setSuccess('Successfully signed in!');
          setTimeout(() => {
            onComplete?.();
          }, 500);
        }
      } else {
        if (!email || !password || password.length < 8) {
          setError('Please provide a valid email and password (min 8 characters)');
          setIsLoading(false);
          return;
        }

        const { error } = await signUp(email, password, fullName);
        
        if (error) {
          setError(error.message);
        } else {
          setSuccess('Account created! Please check your email to verify your account.');
          setMode('signin');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-10 h-10 bg-ai-accent/10 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-ai-accent" />
            </div>
            <CardTitle className="text-2xl">Catalyst</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            {mode === 'signin' 
              ? 'Sign in to your account' 
              : 'Create your account'}
          </p>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 border-positive bg-positive/10">
              <Check className="h-4 w-4 text-positive" />
              <AlertDescription className="text-positive">{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label htmlFor="fullName" className="text-sm font-medium mb-1.5 block">
                  Full Name (Optional)
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full p-3 bg-input-background rounded-xl border border-border text-sm"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="text-sm font-medium mb-1.5 block">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full p-3 bg-input-background rounded-xl border border-border text-sm"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-medium mb-1.5 block">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="w-full p-3 bg-input-background rounded-xl border border-border text-sm"
              />
              {mode === 'signup' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Must be at least 8 characters
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-ai-accent hover:bg-ai-accent/90 text-primary-foreground"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                mode === 'signin' ? 'Sign In' : 'Create Account'
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
                setSuccess(null);
              }}
              className="text-sm text-ai-accent hover:underline"
            >
              {mode === 'signin' 
                ? "Don't have an account? Sign up" 
                : 'Already have an account? Sign in'}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              By continuing, you agree to Catalyst's Terms of Service and Privacy Policy
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
