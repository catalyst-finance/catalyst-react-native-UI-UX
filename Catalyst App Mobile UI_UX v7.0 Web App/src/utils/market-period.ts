// This file is deprecated and kept only for backwards compatibility
// Use ../utils/market-status instead for all new code

import { getCurrentMarketPeriod as getMarketPeriodFromDB } from './market-status';

// Legacy synchronous function that uses cached data
// For new code, use the async getCurrentMarketPeriod from ./market-status
export const getCurrentMarketPeriod = (): 'premarket' | 'regular' | 'afterhours' | 'closed' => {
  // This is a synchronous wrapper that returns a default value
  // The actual market status will be fetched asynchronously by components
  // that use useEffect with the proper async function
  
  // Return a sensible default - components should fetch the real status on mount
  const now = new Date();
  const todayET = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const hour = todayET.getHours();
  const minutes = todayET.getMinutes();
  const totalMinutes = hour * 60 + minutes;
  
  // Quick time-based estimate (doesn't account for holidays)
  if (totalMinutes >= 4 * 60 && totalMinutes < 9 * 60 + 30) {
    return 'premarket';
  } else if (totalMinutes >= 9 * 60 + 30 && totalMinutes < 16 * 60) {
    return 'regular';
  } else if (totalMinutes >= 16 * 60 && totalMinutes < 20 * 60) {
    return 'afterhours';
  }
  
  return 'closed';
};
