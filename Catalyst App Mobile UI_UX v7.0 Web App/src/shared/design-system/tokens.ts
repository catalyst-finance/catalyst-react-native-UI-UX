/**
 * Design Tokens - Platform Agnostic
 * 
 * These tokens can be used in both web (Tailwind) and native (NativeWind/StyleSheet)
 * Extract values from /styles/globals.css for consistency
 */

export const designTokens = {
  colors: {
    // Light mode
    light: {
      background: '#ffffff',
      foreground: 'oklch(0.145 0 0)',
      primary: '#030213',
      primaryForeground: 'oklch(1 0 0)',
      secondary: 'oklch(0.95 0.0058 264.53)',
      secondaryForeground: '#030213',
      muted: '#ececf0',
      mutedForeground: '#717182',
      accent: '#e9ebef',
      accentForeground: '#030213',
      border: 'rgba(0, 0, 0, 0.1)',
      positive: '#00C851',
      negative: '#FF4444',
      warning: '#FF8800',
      neutral: '#9E9E9E',
      aiAccent: '#000000',
    },
    // Dark mode
    dark: {
      background: 'oklch(0.145 0 0)',
      foreground: 'oklch(0.985 0 0)',
      primary: 'oklch(0.985 0 0)',
      primaryForeground: 'oklch(0.145 0 0)',
      secondary: 'oklch(0.269 0 0)',
      secondaryForeground: 'oklch(0.985 0 0)',
      muted: 'oklch(0.269 0 0)',
      mutedForeground: 'oklch(0.78 0 0)',
      accent: 'oklch(0.269 0 0)',
      accentForeground: 'oklch(0.985 0 0)',
      border: 'oklch(0.4 0 0)',
      positive: '#00C851',
      negative: '#FF4444',
      warning: '#FF8800',
      neutral: '#9E9E9E',
      aiAccent: '#ffffff',
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 40,
    '3xl': 48,
    '4xl': 64,
  },

  typography: {
    fontFamily: {
      primary: 'Gotham',
      fallback: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif',
    },
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
      '4xl': 36,
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  borderRadius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 24,
    full: 9999,
  },

  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 2px 4px rgba(0, 0, 0, 0.1)',
    lg: '0 4px 8px rgba(0, 0, 0, 0.15)',
    xl: '0 8px 16px rgba(0, 0, 0, 0.2)',
  },

  // Animation durations (in ms for React Native, same values can be used)
  animation: {
    fast: 150,
    normal: 300,
    slow: 500,
  },

  // Breakpoints for responsive design
  breakpoints: {
    mobile: 0,
    tablet: 768,
    desktop: 1024,
    wide: 1280,
  },

  // Chart-specific tokens
  chart: {
    lineWidth: 2,
    dotSize: {
      small: 6.912,    // 90% of base (7.68)
      base: 7.68,
      large: 20.7,     // 90% of 23
    },
    eventDotSize: {
      line: 7.68,
      candlestick: 23,
    },
    pastFutureSplit: {
      past: 60,        // 60% past data
      future: 40,      // 40% future catalysts
    },
  },
} as const;

export type DesignTokens = typeof designTokens;
export type ColorScheme = 'light' | 'dark';

/**
 * Helper to get colors for current theme
 */
export function getThemeColors(isDark: boolean) {
  return isDark ? designTokens.colors.dark : designTokens.colors.light;
}
