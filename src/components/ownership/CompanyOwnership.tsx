/**
 * CompanyOwnership Component
 * Displays company ownership data with top 5 owners and modal for full list
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors } from '../../constants/design-tokens';
import StockAPI, { CompanyOwnership as OwnershipData } from '../../services/supabase/StockAPI';

interface CompanyOwnershipProps {
  ticker: string;
  companyName?: string;
  shareOutstanding?: number; // Total shares outstanding in millions
  currentPrice?: number;
}

export const CompanyOwnership: React.FC<CompanyOwnershipProps> = ({
  ticker,
  companyName,
  shareOutstanding,
  currentPrice,
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  const [ownership, setOwnership] = useState<OwnershipData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortByDate, setSortByDate] = useState(false);

  useEffect(() => {
    loadOwnership();
  }, [ticker]);

  const loadOwnership = async () => {
    try {
      setIsLoading(true);
      const data = await StockAPI.getCompanyOwnership(ticker, 50);
      setOwnership(data);
    } catch (err) {
      console.error(`Error loading ownership for ${ticker}:`, err);
      setOwnership([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate percentage of ownership
  const calculatePercentage = (shares: number | null): number | null => {
    if (!shares || !shareOutstanding) return null;
    const actualSharesOutstanding = shareOutstanding * 1_000_000;
    return (shares / actualSharesOutstanding) * 100;
  };

  // Format large numbers
  const formatNumber = (num: number | null): string => {
    if (!num) return 'N/A';
    if (num >= 1000000000) {
      return `${(num / 1000000000).toFixed(0)}B`;
    } else if (num >= 1000000) {
      return `${(num / 1000000).toFixed(0)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K`;
    }
    return num.toLocaleString();
  };

  // Format market value
  const formatMarketValue = (num: number | null): string => {
    if (!num) return 'N/A';
    if (num >= 1000000000) {
      return `$${(num / 1000000000).toFixed(0)}B`;
    } else if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(0)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(0)}K`;
    }
    return `$${num.toLocaleString()}`;
  };

  // Calculate market value
  const calculateMarketValue = (shares: number | null): number | null => {
    if (!shares || !currentPrice) return null;
    return shares * currentPrice;
  };

  // Format date
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  // Format name
  const formatName = (name: string): string => {
    const match = name.match(/^(.+?)\s*\((.+?)\)$/);
    if (match) {
      return `${match[1]}, ${match[2]}`;
    }
    return name;
  };

  // Format ownership percentage
  const formatOwnershipPercentage = (percentage: number): string => {
    if (percentage < 1) {
      return `${percentage.toFixed(1)}%`;
    }
    return `${Math.round(percentage)}%`;
  };

  // Sort ownership list
  const getSortedOwnership = () => {
    if (!sortByDate) {
      return ownership;
    }
    return [...ownership].sort((a, b) => {
      if (!a.filing_date) return 1;
      if (!b.filing_date) return -1;
      return new Date(b.filing_date).getTime() - new Date(a.filing_date).getTime();
    });
  };

  // Render ownership row
  const OwnershipRow = ({ owner, rank, isExpanded = false }: { owner: OwnershipData; rank: number; isExpanded?: boolean }) => {
    const percentage = calculatePercentage(owner.share);
    const marketValue = calculateMarketValue(owner.share);
    const hasChange = owner.change && owner.change !== 0;
    const isPositiveChange = owner.change && owner.change > 0;

    const calculatePercentChange = (): number | null => {
      if (!owner.change || owner.change === 0) return null;
      const previousShares = owner.share! - owner.change;
      if (previousShares === 0) return null;
      return (owner.change / previousShares) * 100;
    };

    const percentChange = calculatePercentChange();

    if (!isExpanded) {
      return (
        <View style={[styles.ownerRow, { backgroundColor: 'transparent' }]}>
          <View style={styles.ownerRowContent}>
            <View style={styles.rankContainer}>
              <Text style={[styles.rankText, { color: themeColors.mutedForeground }]}>
                #{rank}
              </Text>
            </View>
            <View style={styles.ownerInfo}>
              <Text style={[styles.ownerName, { color: themeColors.foreground }]} numberOfLines={1}>
                {formatName(owner.name)}
              </Text>
            </View>
          </View>
          <View style={styles.ownerStats}>
            {percentage !== null && (
              <Text style={[styles.ownerPercentage, { color: themeColors.foreground }]}>
                {formatOwnershipPercentage(percentage)}
              </Text>
            )}
            {marketValue !== null && (
              <Text style={[styles.ownerMarketValue, { color: themeColors.mutedForeground }]}>
                {formatMarketValue(marketValue)}
              </Text>
            )}
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.ownerRowExpanded, { backgroundColor: 'transparent' }]}>
        <View style={styles.rankContainer}>
          <Text style={[styles.rankText, { color: themeColors.mutedForeground }]}>
            #{rank}
          </Text>
        </View>
        <View style={styles.ownerInfoExpanded}>
          <Text style={[styles.ownerName, { color: themeColors.foreground }]}>
            {formatName(owner.name)}
          </Text>
          <View style={styles.ownerDetails}>
            {percentage !== null && (
              <>
                <Text style={[styles.ownerDetailText, { color: themeColors.mutedForeground }]}>
                  {formatOwnershipPercentage(percentage)}
                </Text>
                <Text style={[styles.ownerDetailSeparator, { color: themeColors.mutedForeground }]}>
                  •
                </Text>
              </>
            )}
            {marketValue !== null && (
              <>
                <Text style={[styles.ownerDetailText, { color: themeColors.foreground }]}>
                  {formatMarketValue(marketValue)}
                </Text>
                <Text style={[styles.ownerDetailSeparator, { color: themeColors.mutedForeground }]}>
                  •
                </Text>
              </>
            )}
            <Text style={[styles.ownerDetailText, { color: themeColors.mutedForeground }]}>
              {formatNumber(owner.share)}
            </Text>
          </View>
          {(owner.filing_date || percentChange !== null) && (
            <View style={styles.ownerMeta}>
              {owner.filing_date && (
                <View style={styles.ownerMetaItem}>
                  <Ionicons name="calendar-outline" size={12} color={themeColors.mutedForeground} />
                  <Text style={[styles.ownerMetaText, { color: themeColors.mutedForeground }]}>
                    {formatDate(owner.filing_date)}
                  </Text>
                </View>
              )}
              {percentChange !== null && (
                <Text style={[
                  styles.ownerMetaText,
                  { color: isPositiveChange ? colors.light.positive : colors.light.negative }
                ]}>
                  {isPositiveChange ? '+' : ''}{Math.round(percentChange)}%
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.card }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeColors.foreground }]}>
            Company Ownership
          </Text>
        </View>
        <View style={styles.content}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={themeColors.primary} />
          </View>
        </View>
      </View>
    );
  }

  if (ownership.length === 0) {
    return null;
  }

  const top5 = ownership.slice(0, 5);
  const sortedOwnership = getSortedOwnership();

  return (
    <>
      <View style={[styles.container, { backgroundColor: themeColors.card }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeColors.foreground }]}>
            Company Ownership
          </Text>
        </View>
        <View style={styles.content}>
          {top5.map((owner, index) => (
            <OwnershipRow key={owner.id} owner={owner} rank={index + 1} />
          ))}

          {ownership.length > 5 && (
            <TouchableOpacity
              style={styles.showMoreButton}
              onPress={() => setIsModalOpen(true)}
            >
              <Text style={[styles.showMoreText, { color: themeColors.primary }]}>
                View Top {ownership.length} Owners
              </Text>
              <Ionicons name="chevron-forward" size={16} color={themeColors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Modal
        visible={isModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: themeColors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
            <View style={styles.modalHeaderContent}>
              <View style={[styles.tickerBadge, { backgroundColor: themeColors.primary }]}>
                <Text style={[styles.tickerBadgeText, { color: '#FFFFFF' }]}>
                  {ticker}
                </Text>
              </View>
              <Text style={[styles.modalCompanyName, { color: themeColors.foreground }]} numberOfLines={1}>
                {companyName || ticker}
              </Text>
              <Text style={[styles.modalSubtitle, { color: themeColors.mutedForeground }]}>
                Top {ownership.length} Owners
              </Text>
            </View>
            <View style={styles.modalHeaderActions}>
              <TouchableOpacity
                style={styles.sortButton}
                onPress={() => setSortByDate(!sortByDate)}
              >
                <Ionicons name="swap-vertical" size={20} color={themeColors.foreground} />
                <Text style={[styles.sortButtonText, { color: themeColors.foreground }]}>
                  {sortByDate ? 'Date' : 'Rank'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Ionicons name="close" size={24} color={themeColors.foreground} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {sortedOwnership.map((owner) => {
              const originalRank = ownership.findIndex(o => o.id === owner.id) + 1;
              return (
                <OwnershipRow
                  key={owner.id}
                  owner={owner}
                  rank={originalRank}
                  isExpanded={true}
                />
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  header: {
    paddingTop: 24,
    paddingHorizontal: 0,
    paddingBottom: 16,
    paddingRight: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 0,
    paddingBottom: 24,
    paddingRight: 24,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 12,
  },
  ownerRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: 12,
  },
  rankContainer: {
    width: 24,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 14,
    fontWeight: '500',
  },
  ownerInfo: {
    flex: 1,
    minWidth: 0,
  },
  ownerName: {
    fontSize: 14,
    fontWeight: '500',
  },
  ownerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ownerPercentage: {
    fontSize: 14,
    fontWeight: '500',
  },
  ownerMarketValue: {
    fontSize: 14,
  },
  ownerRowExpanded: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  ownerInfoExpanded: {
    flex: 1,
    minWidth: 0,
  },
  ownerDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
    flexWrap: 'wrap',
  },
  ownerDetailText: {
    fontSize: 13,
    fontWeight: '500',
  },
  ownerDetailSeparator: {
    fontSize: 13,
    marginHorizontal: 4,
  },
  ownerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  ownerMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ownerMetaText: {
    fontSize: 12,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    gap: 4,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
  },
  modalHeaderContent: {
    marginBottom: 12,
  },
  tickerBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  tickerBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalCompanyName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
});
