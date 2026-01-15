/**
 * AuthContext - Authentication state management
 * 
 * Provides authentication state and methods throughout the app.
 * Integrates with Supabase for authentication and supports biometric auth.
 * 
 * Features:
 * - Supabase authentication integration
 * - Biometric authentication (Face ID / Touch ID)
 * - Session persistence
 * - Auth state management
 * - Sign in / Sign out / Sign up
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { supabase } from '../services/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  biometricEnabled: boolean;
  biometricAvailable: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  authenticateWithBiometric: () => Promise<boolean>;
  enableBiometric: () => Promise<void>;
  disableBiometric: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    // Check for existing session
    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        // Check biometric availability
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricAvailable(hasHardware && isEnrolled);
        
        console.log('✅ [Auth] Initialized', {
          authenticated: !!currentSession,
          biometricAvailable: hasHardware && isEnrolled,
        });
      } catch (error) {
        console.error('❌ [Auth] Initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('🔄 [Auth] State changed:', event);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        // Handle sign out
        if (event === 'SIGNED_OUT') {
          setBiometricEnabled(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 [Auth] Signing in...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ [Auth] Sign in error:', error.message);
        return { error };
      }

      console.log('✅ [Auth] Signed in successfully');
      return { error: null };
    } catch (error) {
      console.error('❌ [Auth] Sign in exception:', error);
      return { error };
    }
  };

  /**
   * Sign up with email and password
   */
  const signUp = async (email: string, password: string) => {
    try {
      console.log('📝 [Auth] Signing up...');
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('❌ [Auth] Sign up error:', error.message);
        return { error };
      }

      console.log('✅ [Auth] Signed up successfully');
      return { error: null };
    } catch (error) {
      console.error('❌ [Auth] Sign up exception:', error);
      return { error };
    }
  };

  /**
   * Sign out
   */
  const signOut = async () => {
    try {
      console.log('👋 [Auth] Signing out...');
      
      await supabase.auth.signOut();
      setBiometricEnabled(false);
      
      console.log('✅ [Auth] Signed out successfully');
    } catch (error) {
      console.error('❌ [Auth] Sign out error:', error);
    }
  };

  /**
   * Authenticate with biometric (Face ID / Touch ID)
   */
  const authenticateWithBiometric = async (): Promise<boolean> => {
    try {
      if (!biometricAvailable) {
        console.warn('⚠️ [Auth] Biometric authentication not available');
        return false;
      }

      console.log('🔐 [Auth] Authenticating with biometric...');

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access Catalyst',
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: false,
      });

      if (result.success) {
        console.log('✅ [Auth] Biometric authentication successful');
        return true;
      } else {
        console.log('❌ [Auth] Biometric authentication failed');
        return false;
      }
    } catch (error) {
      console.error('❌ [Auth] Biometric authentication error:', error);
      return false;
    }
  };

  /**
   * Enable biometric authentication
   */
  const enableBiometric = async () => {
    try {
      if (!biometricAvailable) {
        console.warn('⚠️ [Auth] Biometric authentication not available');
        return;
      }

      // Test biometric authentication
      const success = await authenticateWithBiometric();
      
      if (success) {
        setBiometricEnabled(true);
        console.log('✅ [Auth] Biometric authentication enabled');
      }
    } catch (error) {
      console.error('❌ [Auth] Enable biometric error:', error);
    }
  };

  /**
   * Disable biometric authentication
   */
  const disableBiometric = async () => {
    try {
      setBiometricEnabled(false);
      console.log('✅ [Auth] Biometric authentication disabled');
    } catch (error) {
      console.error('❌ [Auth] Disable biometric error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    biometricEnabled,
    biometricAvailable,
    signIn,
    signUp,
    signOut,
    authenticateWithBiometric,
    enableBiometric,
    disableBiometric,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook to use auth context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthContext;
