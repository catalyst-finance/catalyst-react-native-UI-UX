import { AuthProvider, useAuth } from './utils/auth-context';
import { AuthScreen } from './components/auth-screen';
import App from './App';
import { Loader2 } from 'lucide-react';

// Feature flag
const REQUIRE_AUTH = true; // Set to false to disable authentication

function AuthGate() {
  const { user, loading } = useAuth();

  // Show loading screen while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-ai-accent mx-auto" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If auth is required and no user, show auth screen
  if (REQUIRE_AUTH && !user) {
    return <AuthScreen />;
  }

  // User is authenticated or auth not required, show main app
  return <App />;
}

export default function AppWithAuth() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
