/**
 * Event Type Configuration and Formatting Utilities
 * Converted from web app's formatting.ts
 */

export const eventTypeConfig = {
  product: { color: '#f43f5e', label: 'Product' },
  earnings: { color: '#3b82f6', label: 'Earnings' },
  investor_day: { color: '#64748b', label: 'Investor Day' },
  regulatory: { color: '#f59e0b', label: 'Regulatory' },
  guidance_update: { color: '#06b6d4', label: 'Guidance Update' },
  conference: { color: '#f97316', label: 'Conference' },
  commerce_event: { color: '#14b8a6', label: 'Commerce Event' },
  partnership: { color: '#8b5cf6', label: 'Partnership' },
  merger: { color: '#a855f7', label: 'M&A' },
  legal: { color: '#ef4444', label: 'Legal' },
  corporate: { color: '#6b7280', label: 'Corporate Action' },
  pricing: { color: '#84cc16', label: 'Pricing' },
  capital_markets: { color: '#6366f1', label: 'Capital Markets' },
  defense_contract: { color: '#78716c', label: 'Defense Contract' },
  guidance: { color: '#0ea5e9', label: 'Guidance' },
  launch: { color: '#ec4899', label: 'Product Launch' },
  fda: { color: '#22c55e', label: 'FDA Approval' },
  split: { color: '#10b981', label: 'Stock Split' },
  dividend: { color: '#059669', label: 'Dividend' },
};

export const getEventTypeHexColor = (eventType: string): string => {
  const config = eventTypeConfig[eventType as keyof typeof eventTypeConfig];
  return config?.color || '#6b7280';
};

export const getEventTypeLabel = (eventType: string): string => {
  const config = eventTypeConfig[eventType as keyof typeof eventTypeConfig];
  return config?.label || eventType;
};
