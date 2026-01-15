// Helper to calculate unified time labels that span both past and future sections
export interface UnifiedLabel {
  label: string;
  position: number; // 0-100% across the full chart width
  section: 'past' | 'future'; // which section (0-50% or 50-100%)
}

export function calculateUnifiedTimeLabels(
  selectedTimeRange: '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y' | '5Y',
  isIntradayMode: boolean,
  dataStartTimestamp: number,
  dataPoints?: Array<{ timestamp: number }>, // Optional: actual data points for index-based views
  futureWindowMs?: number // Optional: custom future window in milliseconds
): UnifiedLabel[] {
  if (isIntradayMode) {
    // Intraday: show past labels for trading hours, plus future labels for 3 months
    const labels: UnifiedLabel[] = [
      { label: '9:30 AM', position: 6.25, section: 'past' }, // 12.5% of past section = 6.25% of full
      { label: '4 PM', position: 33.33, section: 'past' }, // 66.67% of past section = 33.33% of full
      { label: '8 PM', position: 50, section: 'past' } // 100% of past section = 50% of full
    ];
    
    // Add future labels for months ahead (50-100% of chart)
    const now = Date.now();
    const windowMs = futureWindowMs || (90 * 24 * 60 * 60 * 1000); // Use custom or default to 3 months
    const numFutureLabels = Math.max(1, Math.round(windowMs / (30 * 24 * 60 * 60 * 1000))); // Number of months
    
    for (let i = 1; i <= numFutureLabels; i++) {
      const futureTimestamp = now + (windowMs * i / numFutureLabels);
      const date = new Date(futureTimestamp);
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
      
      // Position in the future section (50-100%)
      const position = 50 + ((i / (numFutureLabels + 1)) * 50);
      labels.push({ label: monthLabel, position, section: 'future' });
    }
    
    return labels;
  }

  const now = Date.now();
  let pastDuration: number;
  let futureDuration: number;

  // Determine the time ranges
  if (selectedTimeRange === '1Y') {
    pastDuration = 365 * 24 * 60 * 60 * 1000; // 1 year
    futureDuration = 365 * 24 * 60 * 60 * 1000; // 1 year
  } else if (selectedTimeRange === '5Y') {
    // ALWAYS show exactly 5 years past and 5 years future, regardless of data availability
    pastDuration = 5 * 365 * 24 * 60 * 60 * 1000; // 5 years
    futureDuration = 5 * 365 * 24 * 60 * 60 * 1000; // 5 years
  } else {
    // For other ranges, match future to past duration
    pastDuration = now - dataStartTimestamp;
    futureDuration = pastDuration;
  }

  const totalDuration = pastDuration + futureDuration;
  const startTime = now - pastDuration;
  const endTime = now + futureDuration;

  const labels: UnifiedLabel[] = [];

  // Generate labels centered in their time periods
  if (selectedTimeRange === '5Y') {
    // For 5Y view, show year labels centered in each year (around July 1st)
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();

    console.log('[5Y Labels] Now:', new Date(now).toISOString());
    console.log('[5Y Labels] Start time:', new Date(startTime).toISOString(), 'Year:', startYear);
    console.log('[5Y Labels] End time:', new Date(endTime).toISOString(), 'Year:', endYear);
    console.log('[5Y Labels] Total duration (years):', totalDuration / (365 * 24 * 60 * 60 * 1000));

    for (let year = startYear; year <= endYear; year++) {
      // Calculate the center of this year (midpoint between Jan 1 and Jan 1 of next year)
      const yearStart = Date.UTC(year, 0, 1, 0, 0, 0); // Jan 1 at midnight UTC
      const yearEnd = Date.UTC(year + 1, 0, 1, 0, 0, 0); // Jan 1 of next year at midnight UTC
      const yearCenter = (yearStart + yearEnd) / 2; // True midpoint (around July 1st)

      console.log(`[5Y Labels] Year ${year}: center = ${new Date(yearCenter).toISOString()}`);

      // Only include if the year center is within our range
      if (yearCenter >= startTime && yearCenter <= endTime) {
        const position = ((yearCenter - startTime) / totalDuration) * 100;
        const section: 'past' | 'future' = yearCenter <= now ? 'past' : 'future';
        console.log(`[5Y Labels] Year ${year}: position = ${position.toFixed(2)}%, section = ${section}`);
        labels.push({ label: year.toString(), position, section });
      }
    }
  } else if (selectedTimeRange === '1W' || selectedTimeRange === '1M') {
    // For 1W and 1M with index-based chart positioning, we need special handling
    // The chart removes weekend gaps, so labels must match the compressed timeline
    
    if (dataPoints && dataPoints.length > 0 && selectedTimeRange === '1W') {
      // For 1W with actual data points: Find unique days and position labels evenly
      // This ensures perfect alignment with the index-based chart and no duplicates
      const pastData = dataPoints.filter(d => d.timestamp <= now);
      
      // Group data by day to find unique days
      const dayMap = new Map<string, number[]>(); // day label -> array of data indices
      pastData.forEach((point, index) => {
        const date = new Date(point.timestamp);
        const month = (date.getMonth() + 1).toString();
        const day = date.getDate().toString();
        const label = `${month}/${day}`;
        
        if (!dayMap.has(label)) {
          dayMap.set(label, []);
        }
        dayMap.get(label)!.push(index);
      });
      
      // Get unique days and select ~5 evenly spaced ones
      const uniqueDays = Array.from(dayMap.entries());
      const numLabels = Math.min(5, uniqueDays.length);
      
      for (let i = 0; i < numLabels; i++) {
        const dayIndex = Math.floor((uniqueDays.length - 1) * i / Math.max(1, numLabels - 1));
        const [label, dataIndices] = uniqueDays[dayIndex];
        
        // Use the middle data point of this day for positioning
        const middleIndex = dataIndices[Math.floor(dataIndices.length / 2)];
        const position = (middleIndex / Math.max(1, pastData.length - 1)) * 50;
        
        labels.push({ label, position, section: 'past' });
      }
    } else if (selectedTimeRange === '1M') {
      // For 1M: Find unique days and position labels evenly
      // This ensures perfect alignment with the index-based chart and no duplicates
      const pastData = dataPoints?.filter(d => d.timestamp <= now) || [];
      
      if (pastData.length > 0) {
        // Group data by day to find unique days
        const dayMap = new Map<string, number[]>(); // day label -> array of data indices
        pastData.forEach((point, index) => {
          const date = new Date(point.timestamp);
          const month = (date.getMonth() + 1).toString();
          const day = date.getDate().toString();
          const label = `${month}/${day}`;
          
          if (!dayMap.has(label)) {
            dayMap.set(label, []);
          }
          dayMap.get(label)!.push(index);
        });
        
        // Get unique days and select ~6 evenly spaced ones
        const uniqueDays = Array.from(dayMap.entries());
        const numLabels = Math.min(6, uniqueDays.length);
        
        for (let i = 0; i < numLabels; i++) {
          const dayIndex = Math.floor((uniqueDays.length - 1) * i / Math.max(1, numLabels - 1));
          const [label, dataIndices] = uniqueDays[dayIndex];
          
          // Use the middle data point of this day for positioning
          const middleIndex = dataIndices[Math.floor(dataIndices.length / 2)];
          const position = (middleIndex / Math.max(1, pastData.length - 1)) * 50;
          
          labels.push({ label, position, section: 'past' });
        }
      } else {
        // Fallback: time-based positioning for past
        const numPastLabels = 6;
        for (let i = 0; i <= numPastLabels; i++) {
          const timestamp = startTime + (pastDuration * i) / numPastLabels;
          const date = new Date(timestamp);
          const month = (date.getMonth() + 1).toString();
          const day = date.getDate().toString();
          const position = (i / numPastLabels) * 50;
          labels.push({ label: `${month}/${day}`, position, section: 'past' });
        }
      }
    } else {
      // Fallback for 1W without data points - only show past labels
      const numPastLabels = 5;
      for (let i = 0; i <= numPastLabels; i++) {
        const timestamp = startTime + (pastDuration * i) / numPastLabels;
        const date = new Date(timestamp);
        const month = (date.getMonth() + 1).toString();
        const day = date.getDate().toString();
        const position = (i / numPastLabels) * 50;
        labels.push({ label: `${month}/${day}`, position, section: 'past' });
      }
    }
    
    // ALWAYS add future labels for months ahead (50-100% of chart) for both 1W and 1M
    const windowMs = futureWindowMs || (90 * 24 * 60 * 60 * 1000); // Use custom or default to 3 months
    const numFutureLabels = Math.max(1, Math.round(windowMs / (30 * 24 * 60 * 60 * 1000))); // Number of months
    
    for (let i = 1; i <= numFutureLabels; i++) {
      const futureTimestamp = now + (windowMs * i / numFutureLabels);
      const date = new Date(futureTimestamp);
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
      
      // Position in the future section (50-100%)
      const position = 50 + ((i / (numFutureLabels + 1)) * 50);
      labels.push({ label: monthLabel, position, section: 'future' });
    }
  } else {
    // For 1Y, 3M, YTD - show month labels centered in each month
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    let monthCounter = 0; // Track which month we're on

    while (currentDate <= endDate) {
      // Calculate the center of this month (15th day at noon UTC)
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const monthCenter = Date.UTC(year, month, 15, 12, 0, 0); // 15th day of month

      // Only include if the month center is within our range
      if (monthCenter >= startTime && monthCenter <= endTime) {
        // For YTD and 1Y: only show every other month to reduce label density
        // For 3M: show all months
        const shouldShowLabel = selectedTimeRange === '3M' || (monthCounter % 2 === 0);
        
        if (shouldShowLabel) {
          const position = ((monthCenter - startTime) / totalDuration) * 100;
          const section: 'past' | 'future' = monthCenter <= now ? 'past' : 'future';
          const label = new Date(monthCenter).toLocaleDateString('en-US', { month: 'short' });
          labels.push({ label, position, section });
        }
        
        monthCounter++;
      }

      // Move to next month
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }

  return labels;
}