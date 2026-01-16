/**
 * DataCardComponent.tsx
 * 
 * Renders different types of data cards (article, event, image, stock)
 * in the Catalyst Copilot chat interface.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors as designColors } from '../../constants/design-tokens';
import {
  DataCard,
  ArticleCardData,
  EventCardData,
  ImageCardData,
  StockCardData,
} from './lib/StreamBlockTypes';

// Event type configurations
const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  earnings: { label: 'Earnings', color: '#3B82F6', icon: 'bar-chart' },
  fda: { label: 'FDA', color: '#EF4444', icon: 'alert-circle' },
  merger: { label: 'M&A', color: '#8B5CF6', icon: 'git-merge' },
  split: { label: 'Stock Split', color: '#10B981', icon: 'trending-up' },
  dividend: { label: 'Dividend', color: '#F59E0B', icon: 'cash' },
  launch: { label: 'Launch', color: '#EC4899', icon: 'sparkles' },
  product: { label: 'Product', color: '#6366F1', icon: 'cube' },
  capital_markets: { label: 'Capital Markets', color: '#14B8A6', icon: 'cash' },
  legal: { label: 'Legal', color: '#64748B', icon: 'scale' },
  commerce_event: { label: 'Commerce', color: '#F97316', icon: 'cart' },
  investor_day: { label: 'Investor Day', color: '#0EA5E9', icon: 'people' },
  conference: { label: 'Conference', color: '#A855F7', icon: 'people' },
  regulatory: { label: 'Regulatory', color: '#DC2626', icon: 'business' },
  guidance_update: { label: 'Guidance', color: '#22C55E', icon: 'trending-up' },
  partnership: { label: 'Partnership', color: '#06B6D4', icon: 'people' },
  corporate: { label: 'Corporate', color: '#78716C', icon: 'business' },
  pricing: { label: 'Pricing', color: '#FBBF24', icon: 'pricetag' },
  defense_contract: { label: 'Defense', color: '#1E3A8A', icon: 'shield' },
  clinical: { label: 'Clinical', color: '#059669', icon: 'pulse' },
};

function getEventConfig(type: string) {
  return EVENT_TYPE_CONFIG[type] || EVENT_TYPE_CONFIG.launch;
}

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
 * Get country flag URL from flagcdn.com (PNG for React Native compatibility)
 */
function getCountryFlagUrl(country: string | undefined): string | null {
  if (!country || country.trim().length === 0) return null;
  const code = countryToCode[country] || country.toLowerCase().substring(0, 2);
  return `https://flagcdn.com/w160/${code}.png`;
}

interface DataCardComponentProps {
  card: DataCard;
  onEventClick?: (event: any) => void;
  onImageClick?: (imageUrl: string) => void;
  onTickerClick?: (ticker: string) => void;
}

export function DataCardComponent({
  card,
  onEventClick,
  onImageClick,
  onTickerClick,
}: DataCardComponentProps) {
  const { isDark } = useTheme();
  const themeColors = isDark ? designColors.dark : designColors.light;

  const cardColors = {
    background: isDark ? '#1a1a1a' : '#ffffff',
    border: isDark ? '#333333' : '#e5e5e5',
    text: isDark ? '#ffffff' : '#000000',
    secondaryText: isDark ? '#888888' : '#666666',
    mutedText: isDark ? '#666666' : '#999999',
    badge: themeColors.primary,
    badgeText: '#ffffff',
  };

  // Render Article Card
  if (card.type === 'article') {
    const data = card.data as ArticleCardData;
    const publishedDate = data.publishedAt || data.published_at;
    
    // Check if this is a macro article with a country - use flag instead of article image
    const isMacroArticle = data.country && data.country.trim().length > 0;
    const flagUrl = isMacroArticle ? getCountryFlagUrl(data.country) : null;
    
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: cardColors.background, borderColor: cardColors.border }]}
        onPress={() => data.url && Linking.openURL(data.url)}
        activeOpacity={0.8}
      >
        <View style={styles.articleContent}>
          {/* Article image, country flag (for macro), or logo */}
          {isMacroArticle && flagUrl ? (
            <ExpoImage
              source={{ uri: flagUrl }}
              style={styles.flagImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : data.imageUrl ? (
            <ExpoImage
              source={{ uri: data.imageUrl }}
              style={styles.articleImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : data.logoUrl ? (
            <ExpoImage
              source={{ uri: data.logoUrl }}
              style={styles.articleImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={[styles.articleImagePlaceholder, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}>
              <Ionicons name="document-text" size={24} color={cardColors.mutedText} />
            </View>
          )}

          <View style={styles.articleTextContent}>
            {/* Title */}
            <Text style={[styles.articleTitle, { color: cardColors.text }]} numberOfLines={2}>
              {data.title}
            </Text>

            {/* Date */}
            {publishedDate && (
              <Text style={[styles.articleMeta, { color: cardColors.secondaryText }]}>
                {new Date(publishedDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            )}

            {/* Source */}
            <Text style={[styles.articleSource, { color: cardColors.secondaryText }]}>
              {data.source || data.domain}
            </Text>

            {/* Country/Category badges */}
            {(data.country || data.category) && (
              <View style={styles.badgeRow}>
                {data.country && (
                  <View style={[styles.smallBadge, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}>
                    <Text style={[styles.smallBadgeText, { color: cardColors.secondaryText }]}>
                      {data.country}
                    </Text>
                  </View>
                )}
                {data.category && (
                  <View style={[styles.smallBadge, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}>
                    <Text style={[styles.smallBadgeText, { color: cardColors.secondaryText }]}>
                      {data.category}
                    </Text>
                  </View>
                )}
              </View>
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
  }

  // Render Event Card
  if (card.type === 'event') {
    const data = card.data as EventCardData;
    const eventConfig = getEventConfig(data.type);
    const eventDate = data.datetime ? new Date(data.datetime) : null;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: cardColors.background, borderColor: cardColors.border }]}
        onPress={() => onEventClick?.(data)}
        activeOpacity={0.8}
      >
        <View style={styles.eventContent}>
          {/* Event icon */}
          <View style={[styles.eventIcon, { backgroundColor: eventConfig.color }]}>
            <Ionicons name={eventConfig.icon} size={20} color="#ffffff" />
          </View>

          <View style={styles.eventTextContent}>
            {/* Ticker badge and type */}
            <View style={styles.eventHeader}>
              <TouchableOpacity
                style={[styles.tickerBadge, { backgroundColor: themeColors.primary }]}
                onPress={() => onTickerClick?.(data.ticker)}
              >
                <Text style={styles.tickerBadgeText}>{data.ticker}</Text>
              </TouchableOpacity>
              <Text style={[styles.eventType, { color: cardColors.secondaryText }]}>
                {eventConfig.label}
              </Text>
            </View>

            {/* Title */}
            <Text style={[styles.eventTitle, { color: cardColors.text }]} numberOfLines={2}>
              {data.title}
            </Text>

            {/* Date */}
            {eventDate && (
              <View style={styles.eventDateRow}>
                <Ionicons name="calendar-outline" size={12} color={cardColors.secondaryText} />
                <Text style={[styles.eventDate, { color: cardColors.secondaryText }]}>
                  {eventDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            )}

            {/* AI Insight */}
            {data.aiInsight && (
              <Text style={[styles.eventInsight, { color: cardColors.mutedText }]} numberOfLines={2}>
                {data.aiInsight}
              </Text>
            )}
          </View>
        </View>

        {/* Data source */}
        <Text style={[styles.dataSource, { color: cardColors.mutedText }]}>
          Data from Catalyst
        </Text>
      </TouchableOpacity>
    );
  }

  // Render Image Card (SEC Filing)
  if (card.type === 'image') {
    const data = card.data as ImageCardData;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: cardColors.background, borderColor: cardColors.border }]}
        onPress={() => onImageClick?.(data.imageUrl)}
        activeOpacity={0.8}
      >
        {/* Header */}
        <Text style={[styles.imageCardHeader, { color: cardColors.text }]}>
          SEC Filing Image
        </Text>

        {/* Ticker and filing info */}
        <View style={styles.imageCardMeta}>
          <View style={[styles.tickerBadge, { backgroundColor: themeColors.primary }]}>
            <Text style={styles.tickerBadgeText}>{data.ticker}</Text>
          </View>
          {data.filingType && (
            <View style={[styles.filingBadge, { borderColor: '#22c55e' }]}>
              <Text style={[styles.filingBadgeText, { color: '#22c55e' }]}>
                {data.filingType}
              </Text>
            </View>
          )}
          {data.filingDate && (
            <View style={styles.filingDateRow}>
              <Ionicons name="calendar-outline" size={12} color={cardColors.secondaryText} />
              <Text style={[styles.filingDate, { color: cardColors.secondaryText }]}>
                {data.filingDate}
              </Text>
            </View>
          )}
        </View>

        {/* Image */}
        <View style={styles.imageContainer}>
          <ExpoImage
            source={{ uri: data.imageUrl }}
            style={styles.secImage}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        </View>

        {/* Context */}
        {data.context && (
          <Text style={[styles.imageContext, { color: cardColors.secondaryText }]} numberOfLines={3}>
            {data.context}
          </Text>
        )}

        {/* View Full Filing link */}
        {data.filingUrl && (
          <TouchableOpacity
            style={styles.viewFilingRow}
            onPress={() => Linking.openURL(data.filingUrl!)}
          >
            <Text style={[styles.viewFilingText, { color: themeColors.primary }]}>
              View Full Filing
            </Text>
            <Ionicons name="open-outline" size={12} color={themeColors.primary} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  // Render Stock Card
  if (card.type === 'stock') {
    const data = card.data as StockCardData;
    const isPositive = (data.change || 0) >= 0;
    const changeColor = isPositive ? '#22c55e' : '#ef4444';

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: cardColors.background, borderColor: cardColors.border }]}
        onPress={() => onTickerClick?.(data.ticker)}
        activeOpacity={0.8}
      >
        <View style={styles.stockHeader}>
          <View>
            <View style={styles.stockTickerRow}>
              <View style={[styles.tickerBadge, { backgroundColor: themeColors.primary }]}>
                <Text style={styles.tickerBadgeText}>{data.ticker}</Text>
              </View>
              {data.company && data.company !== data.ticker && (
                <Text style={[styles.stockCompany, { color: cardColors.secondaryText }]}>
                  {data.company}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.stockPriceContainer}>
            <Text style={[styles.stockPrice, { color: cardColors.text }]}>
              ${data.price?.toFixed(2)}
            </Text>
            {data.changePercent != null && (
              <View style={[styles.changeRow, { backgroundColor: isPositive ? '#22c55e20' : '#ef444420' }]}>
                <Ionicons
                  name={isPositive ? 'trending-up' : 'trending-down'}
                  size={12}
                  color={changeColor}
                />
                <Text style={[styles.changeText, { color: changeColor }]}>
                  {isPositive ? '+' : ''}{data.changePercent.toFixed(2)}%
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Chart placeholder - will be replaced with actual chart */}
        <View style={[styles.chartPlaceholder, { backgroundColor: isDark ? '#222' : '#f5f5f5' }]}>
          <Text style={[styles.chartPlaceholderText, { color: cardColors.mutedText }]}>
            Chart
          </Text>
        </View>

        <Text style={[styles.dataSource, { color: cardColors.mutedText }]}>
          Data from Catalyst
        </Text>
      </TouchableOpacity>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginVertical: 6,
  },
  // Article styles
  articleContent: {
    flexDirection: 'row',
    gap: 12,
  },
  articleImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  articleImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  articleTextContent: {
    flex: 1,
  },
  articleTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 18,
  },
  articleMeta: {
    fontSize: 12,
    marginBottom: 2,
  },
  articleSource: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  smallBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  smallBadgeText: {
    fontSize: 10,
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
  // Event styles
  eventContent: {
    flexDirection: 'row',
    gap: 12,
  },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventTextContent: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  tickerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tickerBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  eventType: {
    fontSize: 11,
    fontWeight: '500',
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    lineHeight: 18,
  },
  eventDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 12,
  },
  eventInsight: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  dataSource: {
    fontSize: 9,
    marginTop: 8,
    textAlign: 'right',
  },
  // Image card styles
  imageCardHeader: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  imageCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  filingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  filingBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  filingDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filingDate: {
    fontSize: 11,
  },
  imageContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  secImage: {
    width: '100%',
    height: 200,
  },
  imageContext: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  viewFilingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewFilingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Stock card styles
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stockTickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stockCompany: {
    fontSize: 12,
    fontWeight: '500',
  },
  stockPriceContainer: {
    alignItems: 'flex-end',
  },
  stockPrice: {
    fontSize: 16,
    fontWeight: '600',
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  chartPlaceholder: {
    height: 100,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartPlaceholderText: {
    fontSize: 12,
  },
  // Flag image styles for macro economics
  flagImage: {
    width: 80,
    height: 56,
    borderRadius: 8,
  },
});

export default DataCardComponent;
