/**
 * Event Type Icon Mapping
 * Maps event types to Ionicons icon names
 */

import { Ionicons } from '@expo/vector-icons';

export const getEventIcon = (type: string): keyof typeof Ionicons.glyphMap => {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    earnings: 'bar-chart',
    product: 'rocket',
    launch: 'rocket',
    fda: 'medkit',
    regulatory: 'shield-checkmark',
    conference: 'people',
    partnership: 'hand-left',
    merger: 'git-merge',
    legal: 'document-text',
    corporate: 'business',
    guidance: 'trending-up',
    guidance_update: 'trending-up',
    pricing: 'pricetag',
    dividend: 'cash',
    split: 'git-branch',
    defense_contract: 'shield',
    commerce_event: 'cart',
    capital_markets: 'stats-chart',
    investor_day: 'calendar',
  };
  return iconMap[type] || 'calendar';
};
