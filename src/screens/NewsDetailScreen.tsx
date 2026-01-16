/**
 * NewsDetailScreen.tsx
 * 
 * Full screen view for reading news articles and events
 * Supports different content types from various MongoDB collections
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { colors } from '../constants/design-tokens';
import { 
  NewsItem, 
  getCollectionDisplayName, 
  getCollectionIcon, 
  getCollectionColor,
  fetchDocument,
  NewsCollectionType
} from '../services/NewsService';

interface NewsDetailScreenProps {
  item?: NewsItem;
  collection?: NewsCollectionType;
  id?: string;
  onClose?: () => void;
  onTickerPress?: (ticker: string) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Format a date string to a readable format
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Strip HTML tags from content
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

const NewsDetailScreen: React.FC<NewsDetailScreenProps> = ({ 
  item: initialItem, 
  collection, 
  id, 
  onClose,
  onTickerPress 
}) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;
  
  const [item, setItem] = useState<NewsItem | null>(initialItem || null);
  const [loading, setLoading] = useState(!initialItem && Boolean(collection && id));
  const [error, setError] = useState<string | null>(null);

  // Update item if prop changes
  useEffect(() => {
    if (initialItem) {
      setItem(initialItem);
      setLoading(false);
      setError(null);
    }
  }, [initialItem]);

  // Fetch document if not passed directly
  useEffect(() => {
    if (!initialItem && collection && id) {
      setLoading(true);
      fetchDocument(collection, id)
        .then(doc => {
          if (doc) {
            setItem(doc);
          } else {
            setError('Article not found');
          }
        })
        .catch(err => {
          setError('Failed to load article');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [initialItem, collection, id]);

  const handleBack = useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  const handleTickerPress = useCallback((ticker: string) => {
    if (onTickerPress) {
      onTickerPress(ticker);
    }
  }, [onTickerPress]);

  const handleOpenUrl = useCallback(async () => {
    if (item?.url) {
      try {
        const canOpen = await Linking.canOpenURL(item.url);
        if (canOpen) {
          await Linking.openURL(item.url);
        }
      } catch (err) {
        console.error('Failed to open URL:', err);
      }
    }
  }, [item?.url]);

  if (loading) {
    return (
      <SafeAreaView 
        style={[styles.container, { backgroundColor: themeColors.background }]}
        edges={['left', 'right', 'bottom']}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.mutedForeground }]}>
            Loading article...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !item) {
    return (
      <SafeAreaView 
        style={[styles.container, { backgroundColor: themeColors.background }]}
        edges={['left', 'right', 'bottom']}
      >
        <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themeColors.foreground} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={themeColors.mutedForeground} />
          <Text style={[styles.errorText, { color: themeColors.mutedForeground }]}>
            {error || 'Article not found'}
          </Text>
          <TouchableOpacity onPress={handleBack} style={styles.errorButton}>
            <Text style={[styles.errorButtonText, { color: themeColors.primary }]}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const collectionColor = getCollectionColor(item.collection);
  const collectionIcon = getCollectionIcon(item.collection);
  const collectionName = getCollectionDisplayName(item.collection);
  const tickers = item.tickers || (item.ticker ? [item.ticker] : []);
  
  // For macro_economics, use description as main content, otherwise use content/summary
  const content = item.collection === 'macro_economics' && item.description
    ? item.description
    : item.content ? stripHtml(item.content) : item.summary || '';

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={['left', 'right', 'bottom']}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColors.foreground} />
        </TouchableOpacity>
        
        <View style={[styles.categoryBadge, { backgroundColor: collectionColor + '20' }]}>
          <Ionicons name={collectionIcon as any} size={14} color={collectionColor} />
          <Text style={[styles.categoryText, { color: collectionColor }]}>
            {collectionName}
          </Text>
        </View>

        {item.url && (
          <TouchableOpacity onPress={handleOpenUrl} style={styles.externalButton}>
            <Ionicons name="open-outline" size={22} color={themeColors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        {item.imageUrl && (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        )}

        {/* Title */}
        <Text style={[styles.title, { color: themeColors.foreground }]}>
          {item.title}
        </Text>

        {/* Meta info */}
        <View style={styles.metaContainer}>
          <Text style={[styles.dateText, { color: themeColors.mutedForeground }]}>
            {formatDate(item.publishedAt)}
          </Text>
          {item.source && (
            <Text style={[styles.sourceText, { color: themeColors.mutedForeground }]}>
              • {item.source}
            </Text>
          )}
        </View>

        {/* Tickers */}
        {tickers.length > 0 && (
          <View style={styles.tickersContainer}>
            {tickers.map((ticker) => (
              <TouchableOpacity
                key={ticker}
                onPress={() => handleTickerPress(ticker)}
                style={[
                  styles.tickerBadge,
                  { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' },
                ]}
              >
                <Text style={[styles.tickerText, { color: themeColors.primary }]}>
                  {ticker}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={themeColors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Price Target specific content */}
        {item.collection === 'price_targets' && item.priceTarget && (
          <View style={[styles.priceTargetCard, { backgroundColor: isDark ? '#1C1C1E' : '#F8F8F8' }]}>
            <View style={styles.priceTargetRow}>
              <Text style={[styles.priceTargetLabel, { color: themeColors.mutedForeground }]}>
                Price Target
              </Text>
              <Text style={[styles.priceTargetValue, { color: collectionColor }]}>
                ${item.priceTarget.toFixed(2)}
              </Text>
            </View>
            {item.analystFirm && (
              <View style={styles.priceTargetRow}>
                <Text style={[styles.priceTargetLabel, { color: themeColors.mutedForeground }]}>
                  Analyst Firm
                </Text>
                <Text style={[styles.priceTargetFirm, { color: themeColors.foreground }]}>
                  {item.analystFirm}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* SEC Filing specific content */}
        {item.collection === 'sec_filings' && item.filingType && (
          <View style={[styles.filingCard, { backgroundColor: isDark ? '#1C1C1E' : '#F8F8F8' }]}>
            <Text style={[styles.filingType, { color: collectionColor }]}>
              {item.filingType}
            </Text>
            {item.category && (
              <Text style={[styles.filingCategory, { color: themeColors.mutedForeground }]}>
                {item.category}
              </Text>
            )}
          </View>
        )}

        {/* Government Policy specific content */}
        {item.collection === 'government_policy' && (
          <View style={[styles.policyCard, { backgroundColor: isDark ? '#1C1C1E' : '#F8F8F8' }]}>
            {item.speaker && (
              <View style={styles.policyRow}>
                <Ionicons name="person-outline" size={16} color={themeColors.mutedForeground} />
                <Text style={[styles.policyText, { color: themeColors.foreground }]}>
                  {item.speaker}
                </Text>
              </View>
            )}
            {item.participants && item.participants.length > 0 && (
              <View style={styles.policyRow}>
                <Ionicons name="people-outline" size={16} color={themeColors.mutedForeground} />
                <Text style={[styles.policyText, { color: themeColors.foreground }]}>
                  {item.participants.join(', ')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Macro Economics specific content */}
        {item.collection === 'macro_economics' && (item.country || item.category) && (
          <View style={styles.macroTagsContainer}>
            {item.country && (
              <View style={[styles.macroTag, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
                <Ionicons name="flag-outline" size={14} color={themeColors.mutedForeground} />
                <Text style={[styles.macroTagText, { color: themeColors.foreground }]}>
                  {item.country}
                </Text>
              </View>
            )}
            {item.category && (
              <View style={[styles.macroTag, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
                <Ionicons name="pricetag-outline" size={14} color={themeColors.mutedForeground} />
                <Text style={[styles.macroTagText, { color: themeColors.foreground }]}>
                  {item.category}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Main content */}
        {content && (
          <View style={styles.contentContainer}>
            <Text style={[styles.content, { color: themeColors.foreground }]}>
              {content}
            </Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionsContainer}>
          {item.url && (
            <TouchableOpacity
              onPress={handleOpenUrl}
              style={[styles.actionButton, { backgroundColor: themeColors.primary }]}
            >
              <Ionicons name="open-outline" size={18} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Read Full Article</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  errorButton: {
    marginTop: 8,
    padding: 12,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  backButton: {
    padding: 8,
  },
  categoryBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  externalButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  heroImage: {
    width: SCREEN_WIDTH - 32,
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#E5E5EA',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    marginBottom: 12,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  dateText: {
    fontSize: 13,
  },
  sourceText: {
    fontSize: 13,
    marginLeft: 6,
  },
  tickersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tickerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  tickerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  priceTargetCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  priceTargetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceTargetLabel: {
    fontSize: 14,
  },
  priceTargetValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  priceTargetFirm: {
    fontSize: 16,
    fontWeight: '600',
  },
  filingCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  filingType: {
    fontSize: 18,
    fontWeight: '700',
  },
  filingCategory: {
    fontSize: 14,
    marginTop: 4,
  },
  policyCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  policyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  policyText: {
    fontSize: 14,
    flex: 1,
  },
  macroTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  macroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  macroTagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  contentContainer: {
    marginTop: 8,
  },
  content: {
    fontSize: 16,
    lineHeight: 26,
  },
  actionsContainer: {
    marginTop: 24,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});

export default NewsDetailScreen;
