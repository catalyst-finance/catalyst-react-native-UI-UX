/**
 * NewsArticleCard.tsx
 * 
 * A card component for displaying news items in the feed
 * Styled to match Catalyst Copilot DataCardComponent exactly
 */

import React, { memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NewsItem, getCollectionDisplayName, getCollectionIcon, getCollectionColor } from '../services/NewsService';
import { useTheme } from '../contexts/ThemeContext';
import { colors } from '../constants/design-tokens';

interface NewsArticleCardProps {
  item: NewsItem;
  onPress?: (item: NewsItem) => void;
}

const CARD_MARGIN = 16;

// Country to ISO 3166-1 alpha-2 code mapping for flags
const countryToCode: Record<string, string> = {
  'United States': 'us', 'USA': 'us', 'US': 'us',
  'United Kingdom': 'gb', 'UK': 'gb',
  'China': 'cn', 'Germany': 'de', 'France': 'fr', 'Japan': 'jp',
  'Canada': 'ca', 'Australia': 'au', 'India': 'in', 'Brazil': 'br',
  'Russia': 'ru', 'South Korea': 'kr', 'Mexico': 'mx', 'Spain': 'es',
  'Italy': 'it', 'Netherlands': 'nl', 'Switzerland': 'ch', 'Sweden': 'se',
  'Poland': 'pl', 'Belgium': 'be', 'Norway': 'no', 'Austria': 'at',
  'Ireland': 'ie', 'Denmark': 'dk', 'Finland': 'fi', 'Portugal': 'pt',
  'Greece': 'gr', 'Czech Republic': 'cz', 'Romania': 'ro', 'Hungary': 'hu',
  'Turkey': 'tr', 'Israel': 'il', 'Singapore': 'sg', 'Thailand': 'th',
  'Malaysia': 'my', 'Philippines': 'ph', 'Vietnam': 'vn', 'Indonesia': 'id',
  'Saudi Arabia': 'sa', 'UAE': 'ae', 'South Africa': 'za', 'Nigeria': 'ng',
  'Argentina': 'ar', 'Chile': 'cl', 'Colombia': 'co', 'Peru': 'pe',
  'New Zealand': 'nz', 'Taiwan': 'tw', 'Hong Kong': 'hk', 'Egypt': 'eg',
  'Pakistan': 'pk', 'Bangladesh': 'bd', 'Kenya': 'ke', 'Morocco': 'ma',
  'Ukraine': 'ua', 'Czech': 'cz', 'Slovakia': 'sk', 'Slovenia': 'si',
  'Croatia': 'hr', 'Serbia': 'rs', 'Bulgaria': 'bg', 'Lithuania': 'lt',
  'Latvia': 'lv', 'Estonia': 'ee', 'Luxembourg': 'lu', 'Iceland': 'is',
  'Euro Area': 'eu', 'European Union': 'eu', 'EU': 'eu',
};

/**
 * Get country flag URL from flagcdn.com
 * Using PNG format since React Native Image doesn't support SVG natively
 */
function getCountryFlagUrl(country: string | undefined): string | null {
  if (!country || country.trim().length === 0) return null;
  const code = countryToCode[country] || country.toLowerCase().substring(0, 2);
  // Use w160 PNG for good quality on mobile displays
  return `https://flagcdn.com/w160/${code}.png`;
}

/**
 * Extract domain from URL for favicon
 */
function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

/**
 * Get favicon URL using Google's favicon service
 */
function getFaviconUrl(url: string | undefined, source: string | undefined): string | null {
  if (url) {
    const domain = extractDomain(url);
    if (domain) {
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    }
  }
  // Try to guess domain from source name
  if (source) {
    const sourceLower = source.toLowerCase().replace(/\s+/g, '');
    // Common mappings
    const domainMap: Record<string, string> = {
      'reuters': 'reuters.com',
      'bloomberg': 'bloomberg.com',
      'cnbc': 'cnbc.com',
      'wsj': 'wsj.com',
      'wallstreetjournal': 'wsj.com',
      'ft': 'ft.com',
      'financialtimes': 'ft.com',
      'nytimes': 'nytimes.com',
      'newyorktimes': 'nytimes.com',
      'sec': 'sec.gov',
      'yahoo': 'finance.yahoo.com',
      'yahoofinance': 'finance.yahoo.com',
      'marketwatch': 'marketwatch.com',
      'investorplace': 'investorplace.com',
      'seekingalpha': 'seekingalpha.com',
      'benzinga': 'benzinga.com',
      'barrons': 'barrons.com',
      'thestreet': 'thestreet.com',
      'fool': 'fool.com',
      'motleyfool': 'fool.com',
      'tradingeconomics.com': 'tradingeconomics.com',
    };
    const mappedDomain = domainMap[sourceLower];
    if (mappedDomain) {
      return `https://www.google.com/s2/favicons?domain=${mappedDomain}&sz=128`;
    }
  }
  return null;
}

/**
 * Format a date string for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const NewsArticleCard: React.FC<NewsArticleCardProps> = ({ item, onPress }) => {
  const { isDark } = useTheme();
  const themeColors = isDark ? colors.dark : colors.light;

  const handlePress = () => {
    if (onPress) {
      onPress(item);
    }
  };

  const collectionColor = getCollectionColor(item.collection);
  const tickers = item.tickers || (item.ticker ? [item.ticker] : []);
  
  // Get favicon URL
  const faviconUrl = useMemo(() => getFaviconUrl(item.url, item.source), [item.url, item.source]);
  
  // Check if this is a macro_economics article with country - use flag
  const isMacroWithCountry = item.collection === 'macro_economics' && item.country && item.country.trim().length > 0;
  const flagUrl = useMemo(() => getCountryFlagUrl(item.country), [item.country]);

  // Special rendering for price targets - keep the original style
  if (item.collection === 'price_targets' && item.priceTarget) {
    const collectionIcon = getCollectionIcon(item.collection);
    const collectionName = getCollectionDisplayName(item.collection);
    
    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            borderColor: isDark ? '#2C2C2E' : '#E5E5EA',
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.priceTargetHeader}>
          <View style={[styles.categoryBadge, { backgroundColor: collectionColor + '20' }]}>
            <Ionicons name={collectionIcon as any} size={12} color={collectionColor} />
            <Text style={[styles.categoryText, { color: collectionColor }]}>
              {collectionName}
            </Text>
          </View>
          <Text style={[styles.dateText, { color: themeColors.mutedForeground }]}>
            {formatDate(item.publishedAt)}
          </Text>
        </View>

        <View style={styles.priceTargetContent}>
          <View style={styles.priceTargetLeft}>
            {tickers.length > 0 && (
              <Text style={[styles.tickerLarge, { color: themeColors.foreground }]}>
                {tickers[0]}
              </Text>
            )}
            {item.analystFirm && (
              <Text style={[styles.analystFirm, { color: themeColors.mutedForeground }]}>
                {item.analystFirm}
              </Text>
            )}
          </View>
          <View style={styles.priceTargetRight}>
            <Text style={[styles.priceTargetValue, { color: collectionColor }]}>
              ${item.priceTarget.toFixed(2)}
            </Text>
            <Text style={[styles.priceTargetLabel, { color: themeColors.mutedForeground }]}>
              Price Target
            </Text>
          </View>
        </View>

        {item.title && (
          <Text
            style={[styles.articleTitle, { color: themeColors.foreground }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  // Standard article card - styled like Catalyst Copilot DataCardComponent
  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
          borderColor: isDark ? '#2C2C2E' : '#E5E5EA',
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.articleContent}>
        {/* Left side - Image/Flag/Favicon with ticker badges below */}
        <View style={styles.leftColumn}>
          {/* Image - country flag for macro, article image, favicon, or placeholder */}
          {isMacroWithCountry && flagUrl ? (
            <View style={[
              styles.flagImageContainer,
              { 
                backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                borderColor: isDark ? '#3C3C3E' : '#E5E5EA',
              }
            ]}>
              <Image
                source={{ uri: flagUrl }}
                style={styles.flagImage}
                resizeMode="cover"
              />
            </View>
          ) : (
            <View style={[
              styles.articleImage,
              { 
                backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                borderColor: isDark ? '#3C3C3E' : '#E5E5EA',
              }
            ]}>
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.imageContent}
                  resizeMode="cover"
                />
              ) : faviconUrl ? (
                <Image
                  source={{ uri: faviconUrl }}
                  style={styles.imageContent}
                  resizeMode="contain"
                />
              ) : (
                <Ionicons name="document-text-outline" size={24} color={themeColors.mutedForeground} />
              )}
            </View>
          )}

          {/* Tickers - below image, same width */}
          {tickers.length > 0 && (
            <View style={styles.tickerColumn}>
              {tickers.slice(0, 2).map((ticker) => (
                <View
                  key={ticker}
                  style={[
                    styles.tickerBadge,
                    { backgroundColor: themeColors.primary },
                  ]}>
                  <Text style={styles.tickerText}>
                    {ticker}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.articleTextContent}>
          {/* Title */}
          <Text
            style={[styles.articleTitle, { color: themeColors.foreground }]}
          >
            {item.title}
          </Text>

          {/* Date */}
          <Text style={[styles.articleMeta, { color: themeColors.mutedForeground }]}>
            {formatDate(item.publishedAt)}
          </Text>

          {/* Content preview - first sentence (for stocks and macro, not policy) */}
          {(item.summary || item.content || item.description) && item.collection !== 'government_policy' && (
            <Text 
              style={[styles.contentPreview, { color: themeColors.mutedForeground }]}
              numberOfLines={2}
            >
              {(item.summary || item.content || item.description || '').split(/[.!?]\s/)[0] + '.'}
            </Text>
          )}

          {/* Read Article link */}
          <View style={styles.readMoreRow}>
            <Text style={[styles.readMoreText, { color: themeColors.primary }]}>
              Read Article
            </Text>
            <Ionicons name="open-outline" size={12} color={themeColors.primary} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: CARD_MARGIN,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  // Article card styles - matching Catalyst Copilot DataCardComponent
  articleContent: {
    flexDirection: 'row',
    gap: 12,
  },
  leftColumn: {
    flexDirection: 'column',
    gap: 6,
  },
  articleImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  flagImageContainer: {
    width: 80,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  flagImage: {
    width: '100%',
    height: '100%',
  },
  imageContent: {
    width: '100%',
    height: '100%',
  },
  articleTextContent: {
    flex: 1,
    minWidth: 0,
  },
  articleTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 4,
  },
  articleMeta: {
    fontSize: 12,
    marginBottom: 6,
  },
  articleSource: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  contentPreview: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },
  tickerColumn: {
    flexDirection: 'column',
    gap: 4,
  },
  tickerRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  tickerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignItems: 'center',
  },
  tickerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  readMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readMoreText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Price target specific styles
  priceTargetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dateText: {
    fontSize: 12,
  },
  priceTargetContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceTargetLeft: {
    flex: 1,
  },
  tickerLarge: {
    fontSize: 20,
    fontWeight: '700',
  },
  analystFirm: {
    fontSize: 13,
    marginTop: 2,
  },
  priceTargetRight: {
    alignItems: 'flex-end',
  },
  priceTargetValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  priceTargetLabel: {
    fontSize: 11,
    marginTop: 2,
  },
});

export default memo(NewsArticleCard);
