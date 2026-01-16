/**
 * ExternalAccountsSection Component
 * 
 * Collapsible section showing connected brokerage accounts and manual positions.
 * Provides buttons to connect new accounts via Plaid or add manual positions.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../constants/design-tokens';
import { PlaidLinkModal } from './PlaidLinkModal';
import { ManualPositionEntry, ManualPosition } from './ManualPositionEntry';

interface ConnectedAccount {
  institution: string;
  accountType: string;
  accounts?: any[];
  connectionId?: string;
  lastUpdated?: string;
}

interface ExternalAccountsSectionProps {
  connectedAccounts?: ConnectedAccount[];
  manualPositions?: ManualPosition[];
  onAccountConnected?: (accountData: { holdings: any[]; accountInfo: ConnectedAccount }) => void;
  onAccountDisconnected?: (connectionId: string) => void;
  onManualPositionsAdded?: (positions: ManualPosition[]) => void;
}

export const ExternalAccountsSection: React.FC<ExternalAccountsSectionProps> = ({
  connectedAccounts = [],
  manualPositions = [],
  onAccountConnected,
  onAccountDisconnected,
  onManualPositionsAdded,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  const [isExpanded, setIsExpanded] = useState(false);
  const [showPlaidModal, setShowPlaidModal] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);

  const hasConnections = connectedAccounts.length > 0 || manualPositions.length > 0;
  const totalConnections = connectedAccounts.length + (manualPositions.length > 0 ? 1 : 0);

  const handlePlaidSuccess = (data: { holdings: any[]; accountInfo: any }) => {
    onAccountConnected?.(data);
    setShowPlaidModal(false);
  };

  const handleManualPositionsComplete = (positions: ManualPosition[]) => {
    onManualPositionsAdded?.(positions);
    setShowManualEntry(false);
  };

  const handleDisconnectAccount = (connectionId: string) => {
    onAccountDisconnected?.(connectionId);
  };

  // Don't render if no connections and not expanded
  if (!hasConnections && !isExpanded) {
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <View style={[styles.iconCircle, { backgroundColor: themeColors.primary + '20' }]}>
            <Ionicons name="link" size={24} color={themeColors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: themeColors.foreground }]}>
            Connect Your Portfolio
          </Text>
          <Text style={[styles.emptyText, { color: themeColors.mutedForeground }]}>
            Link your brokerage account or add positions manually to track your holdings.
          </Text>
          
          <View style={styles.emptyButtons}>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: themeColors.primary }]}
              onPress={() => setShowPlaidModal(true)}
            >
              <Ionicons name="link" size={18} color={themeColors.primaryForeground} />
              <Text style={[styles.emptyButtonText, { color: themeColors.primaryForeground }]}>
                Connect Broker
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.emptyButton, styles.outlineButton, { borderColor: themeColors.border }]}
              onPress={() => setShowManualEntry(true)}
            >
              <Ionicons name="add" size={18} color={themeColors.foreground} />
              <Text style={[styles.emptyButtonText, { color: themeColors.foreground }]}>
                Add Manually
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Modals */}
        <PlaidLinkModal
          visible={showPlaidModal}
          onClose={() => setShowPlaidModal(false)}
          onSuccess={handlePlaidSuccess}
        />
        <ManualPositionEntry
          visible={showManualEntry}
          onClose={() => setShowManualEntry(false)}
          onComplete={handleManualPositionsComplete}
          existingPositions={manualPositions}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Collapsible Header */}
      <TouchableOpacity
        style={[
          styles.headerCard,
          { 
            backgroundColor: themeColors.primary + '10',
            borderColor: themeColors.primary + '30',
          }
        ]}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="link" size={18} color={themeColors.primary} />
          <Text style={[styles.headerTitle, { color: themeColors.foreground }]}>
            External Accounts
          </Text>
          <View style={[styles.badge, { backgroundColor: themeColors.muted }]}>
            <Text style={[styles.badgeText, { color: themeColors.foreground }]}>
              {totalConnections}
            </Text>
          </View>
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-down' : 'chevron-forward'}
          size={18}
          color={themeColors.mutedForeground}
        />
      </TouchableOpacity>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={[styles.expandedContent, { borderColor: themeColors.border }]}>
          {/* Connected Plaid Accounts */}
          {connectedAccounts.map((account, index) => (
            <View
              key={account.connectionId || index}
              style={[styles.accountItem, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
            >
              <View style={styles.accountInfo}>
                <Text style={[styles.accountInstitution, { color: themeColors.foreground }]}>
                  {account.institution}
                </Text>
                <Text style={[styles.accountType, { color: themeColors.mutedForeground }]}>
                  {account.accountType}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => account.connectionId && handleDisconnectAccount(account.connectionId)}
                style={styles.disconnectButton}
              >
                <Ionicons name="close" size={16} color={themeColors.mutedForeground} />
              </TouchableOpacity>
            </View>
          ))}

          {/* Manual Positions */}
          {manualPositions.length > 0 && (
            <View style={[styles.accountItem, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <View style={styles.accountInfo}>
                <Text style={[styles.accountInstitution, { color: themeColors.foreground }]}>
                  Manual Entry
                </Text>
                <Text style={[styles.accountType, { color: themeColors.mutedForeground }]}>
                  {manualPositions.length} position{manualPositions.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { borderColor: themeColors.border }]}
              onPress={() => setShowPlaidModal(true)}
            >
              <Ionicons name="link" size={16} color={themeColors.foreground} />
              <Text style={[styles.actionButtonText, { color: themeColors.foreground }]}>
                Connect Broker Account
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { borderColor: themeColors.border }]}
              onPress={() => setShowManualEntry(true)}
            >
              <Ionicons name="add" size={16} color={themeColors.foreground} />
              <Text style={[styles.actionButtonText, { color: themeColors.foreground }]}>
                Add Manual Position
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modals */}
      <PlaidLinkModal
        visible={showPlaidModal}
        onClose={() => setShowPlaidModal(false)}
        onSuccess={handlePlaidSuccess}
      />
      <ManualPositionEntry
        visible={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        onComplete={handleManualPositionsComplete}
        existingPositions={manualPositions}
        isAddingToExisting={hasConnections}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  emptyContainer: {
    marginBottom: 16,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  outlineButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  expandedContent: {
    marginTop: 12,
    gap: 8,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  accountInfo: {
    flex: 1,
  },
  accountInstitution: {
    fontSize: 14,
    fontWeight: '500',
  },
  accountType: {
    fontSize: 12,
    marginTop: 2,
  },
  disconnectButton: {
    padding: 4,
  },
  actionButtons: {
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ExternalAccountsSection;
