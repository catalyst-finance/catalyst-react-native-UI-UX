import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './supabase/info';

// Use global to persist singleton across hot module reloads
declare global {
  var __supabaseClient: ReturnType<typeof createClient> | undefined;
}

// Singleton instance to prevent multiple GoTrueClient instances
// Using globalThis ensures the same instance is reused even during HMR
if (!globalThis.__supabaseClient) {
  globalThis.__supabaseClient = createClient(
    `https://${projectId}.supabase.co`,
    publicAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'supabase.auth.token',
      }
    }
  );
}

// Frontend Supabase client using anon key (respects RLS)
export const supabase = globalThis.__supabaseClient;

export default supabase;