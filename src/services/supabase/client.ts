/**
 * Supabase Client for React Native
 * 
 * Uses AsyncStorage for general session data and SecureStore for sensitive auth tokens.
 * Configured for React Native environment (no URL detection, proper storage adapters).
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { projectId, publicAnonKey } from './info';

/**
 * Custom storage adapter for Supabase
 * Uses SecureStore for auth tokens (more secure) and AsyncStorage for other data
 */
const customStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      // Use SecureStore for auth tokens (more secure)
      if (key.includes('auth')) {
        return await SecureStore.getItemAsync(key);
      }
      // Use AsyncStorage for other data
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`Error getting item ${key}:`, error);
      return null;
    }
  },
  
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (key.includes('auth')) {
        await SecureStore.setItemAsync(key, value);
      } else {
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error(`Error setting item ${key}:`, error);
    }
  },
  
  removeItem: async (key: string): Promise<void> => {
    try {
      if (key.includes('auth')) {
        await SecureStore.deleteItemAsync(key);
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error removing item ${key}:`, error);
    }
  },
};

/**
 * Supabase client instance
 * Singleton pattern to ensure only one client exists
 */
export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  {
    auth: {
      storage: customStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Not needed in React Native
      storageKey: 'supabase.auth.token',
    },
  }
);

export default supabase;
