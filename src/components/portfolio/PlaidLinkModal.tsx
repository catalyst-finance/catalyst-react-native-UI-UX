/**
 * PlaidLinkModal Component
 * 
 * Modal for connecting brokerage accounts via Plaid.
 * Uses react-native-plaid-link-sdk v12+ with create() and open() API.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  NativeModules,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../constants/design-tokens';
import { supabase } from '../../services/supabase/client';

// Check if Plaid native module is available
const isPlaidAvailable = !!NativeModules.PlaidAndroid || !!NativeModules.RNLinksdk;

// Only import Plaid if native module is available
let create: any;
let open: any;

if (isPlaidAvailable) {
  try {
    const PlaidSDK = require('react-native-plaid-link-sdk');
    create = PlaidSDK.create;
    open = PlaidSDK.open;
  } catch (e) {
    console.warn('Plaid SDK not available:', e);
  }
}

interface PlaidLinkModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (portfolioData: { holdings: any[]; accountInfo: any }) => void;
}

export const PlaidLinkModal: React.FC<PlaidLinkModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLinkReady, setIsLinkReady] = useState(false);

  // Generate a user ID (in production, use actual authenticated user ID)
  const userId = 'catalyst_user_' + Math.random().toString(36).substring(7);

  // Fetch link token when modal opens
  useEffect(() => {
    if (visible && !linkToken) {
      fetchLinkToken();
    }
  }, [visible]);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setLinkToken(null);
      setError(null);
      setIsLoading(false);
      setIsProcessing(false);
      setIsLinkReady(false);
    }
  }, [visible]);

  // Create Plaid Link when we have a token
  useEffect(() => {
    if (linkToken) {
      createPlaidLink();
    }
  }, [linkToken]);

  const fetchLinkToken = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Fetching Plaid link token...');
      
      // Call Supabase Edge Function to create link token
      const { data, error: fnError } = await supabase.functions.invoke(
        'make-server-fe0a490e/plaid/create-link-token',
        {
          body: { userId },
        }
      );

      console.log('Link token response:', { data, error: fnError });

      if (fnError) throw fnError;
      if (!data?.link_token) throw new Error('No link token received');

      console.log('Link token received successfully');
      setLinkToken(data.link_token);
    } catch (err: any) {
      console.error('Error fetching link token:', err);
      setError(err.message || 'Failed to initialize Plaid. Please try again.');
      setIsLoading(false);
    }
  };

  const createPlaidLink = async () => {
    if (!linkToken || !create) return;

    try {
      console.log('Creating Plaid Link with token...');
      
      // Create Plaid Link with the token
      // Don't use LinkLogLevel enum since it may not be available
      const createResult = await create({
        token: linkToken,
      });
      
      console.log('Plaid Link created successfully:', createResult);
      setIsLinkReady(true);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Error creating Plaid Link:', err);
      setError(err.message || 'Failed to initialize Plaid Link. Make sure you are using a development build (not Expo Go).');
      setIsLoading(false);
    }
  };

  const handleOpenPlaid = async () => {
    if (!isLinkReady || !open) {
      console.log('Plaid Link not ready yet');
      return;
    }

    try {
      console.log('Opening Plaid Link...');
      // open() takes callbacks for success and exit
      await open({
        onSuccess: (success: any) => {
          console.log('Plaid success:', success);
          handlePlaidSuccess({
            publicToken: success.publicToken,
            metadata: success.metadata,
          });
        },
        onExit: (exit: any) => {
          console.log('Plaid exit:', exit);
          // Don't close modal - let user try again
        },
      });
    } catch (err: any) {
      console.error('Error opening Plaid Link:', err);
      setError(err.message || 'Failed to open Plaid Link.');
    }
  };

  const handlePlaidSuccess = useCallback(
    async (success: { publicToken: string; metadata: any }) => {
      setIsProcessing(true);

      try {
        const { publicToken, metadata } = success;

        // Exchange public token for access token
        const { data: exchangeData, error: exchangeError } = await supabase.functions.invoke(
          'make-server-fe0a490e/plaid/exchange-public-token',
          {
            body: {
              publicToken,
              userId,
              institutionName: metadata?.institution?.name || 'Unknown',
            },
          }
        );

        if (exchangeError) throw exchangeError;

        // Fetch holdings
        const { data: holdingsData, error: holdingsError } = await supabase.functions.invoke(
          'make-server-fe0a490e/plaid/get-holdings',
          {
            body: {
              connectionId: exchangeData.connectionId,
            },
          }
        );

        if (holdingsError) throw holdingsError;

        // Pass data to parent component
        onSuccess({
          holdings: holdingsData.holdings || [],
          accountInfo: {
            institution: metadata?.institution?.name || 'Unknown',
            accounts: holdingsData.accountInfo?.accounts || [],
            accountType: holdingsData.accountInfo?.accountType || 'Investment Account',
            lastUpdated: new Date().toISOString(),
            connectionId: exchangeData.connectionId,
          },
        });

        onClose();
      } catch (err: any) {
        console.error('Error processing Plaid connection:', err);
        setError(err.message || 'Failed to process connection. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    },
    [userId, onSuccess, onClose]
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, { backgroundColor: themeColors.primary + '20' }]}>
              <Ionicons name="shield-checkmark" size={20} color={themeColors.primary} />
            </View>
            <View>
              <Text style={[styles.title, { color: themeColors.foreground }]}>
                Connect your account
              </Text>
              <Text style={[styles.subtitle, { color: themeColors.mutedForeground }]}>
                Powered by Plaid
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            disabled={isProcessing}
          >
            <Ionicons name="close" size={24} color={themeColors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Show message if Plaid native module is not available */}
          {!isPlaidAvailable && (
            <View style={styles.centerContent}>
              <View style={[styles.warningIcon, { backgroundColor: '#FF950020' }]}>
                <Ionicons name="warning" size={40} color="#FF9500" />
              </View>
              <Text style={[styles.readyTitle, { color: themeColors.foreground }]}>
                Development Build Required
              </Text>
              <Text style={[styles.readySubtext, { color: themeColors.mutedForeground, marginBottom: 16 }]}>
                Plaid integration requires a native development build. It won't work in Expo Go.
              </Text>
              <Text style={[styles.codeText, { color: themeColors.mutedForeground, backgroundColor: themeColors.muted }]}>
                Run: eas build --profile development
              </Text>
              <TouchableOpacity
                style={[styles.button, styles.outlineButton, { borderColor: themeColors.border, marginTop: 24 }]}
                onPress={onClose}
              >
                <Text style={[styles.buttonText, { color: themeColors.foreground }]}>Close</Text>
              </TouchableOpacity>
            </View>
          )}

          {isPlaidAvailable && isLoading && (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color={themeColors.primary} />
              <Text style={[styles.loadingText, { color: themeColors.foreground }]}>
                Initializing Plaid...
              </Text>
              <Text style={[styles.loadingSubtext, { color: themeColors.mutedForeground }]}>
                This will only take a moment
              </Text>
            </View>
          )}

          {isPlaidAvailable && isProcessing && (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color={themeColors.primary} />
              <Text style={[styles.loadingText, { color: themeColors.foreground }]}>
                Connecting your account...
              </Text>
              <Text style={[styles.loadingSubtext, { color: themeColors.mutedForeground }]}>
                Fetching your portfolio holdings
              </Text>
            </View>
          )}

          {isPlaidAvailable && error && !isLoading && !isProcessing && (
            <View style={styles.errorContainer}>
              <View style={[styles.errorBox, { backgroundColor: '#FF500020', borderColor: '#FF500040' }]}>
                <Ionicons name="alert-circle" size={20} color="#FF5000" />
                <View style={styles.errorTextContainer}>
                  <Text style={[styles.errorTitle, { color: '#FF5000' }]}>
                    Connection Failed
                  </Text>
                  <Text style={[styles.errorMessage, { color: themeColors.mutedForeground }]}>
                    {error}
                  </Text>
                </View>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.outlineButton, { borderColor: themeColors.border }]}
                  onPress={onClose}
                >
                  <Text style={[styles.buttonText, { color: themeColors.foreground }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton, { backgroundColor: themeColors.primary }]}
                  onPress={fetchLinkToken}
                >
                  <Text style={[styles.buttonText, { color: themeColors.primaryForeground }]}>Try Again</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {isPlaidAvailable && !isLoading && !isProcessing && !error && isLinkReady && (
            <View style={styles.readyContainer}>
              <View style={[styles.successIcon, { backgroundColor: '#00C80520' }]}>
                <Ionicons name="checkmark-circle" size={40} color="#00C805" />
              </View>
              <Text style={[styles.readyTitle, { color: themeColors.foreground }]}>
                Ready to connect
              </Text>
              <Text style={[styles.readySubtext, { color: themeColors.mutedForeground }]}>
                Tap the button below to select your brokerage account
              </Text>

              <TouchableOpacity
                style={[styles.plaidButton, { backgroundColor: themeColors.primary }]}
                onPress={handleOpenPlaid}
              >
                <Text style={[styles.plaidButtonText, { color: themeColors.primaryForeground }]}>
                  Open Plaid
                </Text>
              </TouchableOpacity>

              {/* Security Note */}
              <View style={[styles.securityNote, { backgroundColor: themeColors.muted, borderColor: themeColors.border }]}>
                <Ionicons name="shield" size={16} color={themeColors.mutedForeground} />
                <View style={styles.securityTextContainer}>
                  <Text style={[styles.securityTitle, { color: themeColors.foreground }]}>
                    Bank-level security
                  </Text>
                  <Text style={[styles.securityText, { color: themeColors.mutedForeground }]}>
                    Your data is encrypted and secure. Catalyst never sees your login credentials.
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  errorContainer: {
    flex: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  errorTextContainer: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorMessage: {
    fontSize: 12,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  outlineButton: {
    borderWidth: 1,
  },
  primaryButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  readyContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  warningIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    padding: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  readyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  readySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  plaidButton: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    marginBottom: 32,
  },
  plaidButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    width: '100%',
  },
  securityTextContainer: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  securityText: {
    fontSize: 12,
    lineHeight: 18,
  },
});

export default PlaidLinkModal;
