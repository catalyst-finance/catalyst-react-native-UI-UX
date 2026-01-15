/**
 * Design Tokens - Platform Agnostic
 * Extracted from web app for consistent styling across platforms
 * All colors and values match the web app's globals.css
 */

export const colors = {
  light: {
    // Base colors
    background: '#ffffff',
    foreground: '#030213',
    
    // Card colors
    card: '#ffffff',
    cardForeground: '#030213',
    
    // Popover colors
    popover: '#ffffff',
    popoverForeground: '#030213',
    
    // Primary colors
    primary: '#030213',
    primaryForeground: '#ffffff',
    
    // Secondary colors
    secondary: '#f1f5f9',
    secondaryForeground: '#030213',
    
    // Muted colors
    muted: '#ececf0',
    mutedForeground: '#717182',
    
    // Accent colors
    accent: '#e9ebef',
    accentForeground: '#030213',
    
    // Destructive colors
    destructive: '#d4183d',
    destructiveForeground: '#ffffff',
    
    // Border and input
    border: 'rgba(0, 0, 0, 0.1)',
    input: 'transparent',
    inputBackground: '#f3f3f5',
    switchBackground: '#cbced4',
    ring: '#b4b4b4',
    
    // Chart colors
    chart1: '#000000',
    chart2: '#4db8a8',
    chart3: '#5a7ba8',
    chart4: '#e8c547',
    chart5: '#e89547',
    
    // Status colors
    positive: '#00C851',
    negative: '#FF4444',
    warning: '#FF8800',
    neutral: '#9E9E9E',
    aiAccent: '#000000',
    
    // Sidebar colors
    sidebar: '#fafafa',
    sidebarForeground: '#030213',
    sidebarPrimary: '#030213',
    sidebarPrimaryForeground: '#fafafa',
    sidebarAccent: '#f5f5f5',
    sidebarAccentForeground: '#1a1a1a',
    sidebarBorder: '#ebebeb',
    sidebarRing: '#b4b4b4',
  },
  dark: {
    // Base colors
    background: '#030213',
    foreground: '#fafafa',
    
    // Card colors
    card: '#030213',
    cardForeground: '#fafafa',
    
    // Popover colors
    popover: '#030213',
    popoverForeground: '#fafafa',
    
    // Primary colors
    primary: '#fafafa',
    primaryForeground: '#030213',
    
    // Secondary colors (pure grey, no blue)
    secondary: '#2a2a2a',
    secondaryForeground: '#fafafa',
    
    // Muted colors (pure grey, no blue)
    muted: '#2a2a2a',
    mutedForeground: '#c7c7c7',
    
    // Accent colors (pure grey, no blue)
    accent: '#2a2a2a',
    accentForeground: '#fafafa',
    
    // Destructive colors
    destructive: '#7f1d1d',
    destructiveForeground: '#ef4444',
    
    // Border and input (pure grey, no blue)
    border: '#666666',
    input: '#2a2a2a',
    inputBackground: '#2a2a2a',
    switchBackground: '#4a4a4a',
    ring: '#707070',
    
    // Chart colors
    chart1: '#ffffff',
    chart2: '#5dd4c1',
    chart3: '#e89547',
    chart4: '#c77dff',
    chart5: '#ff6b6b',
    
    // Status colors
    positive: '#00C851',
    negative: '#FF4444',
    warning: '#FF8800',
    neutral: '#9E9E9E',
    aiAccent: '#ffffff',
    
    // Sidebar colors (pure grey, no blue)
    sidebar: '#1a1a1a',
    sidebarForeground: '#fafafa',
    sidebarPrimary: '#ffffff',
    sidebarPrimaryForeground: '#fafafa',
    sidebarAccent: '#2a2a2a',
    sidebarAccentForeground: '#fafafa',
    sidebarBorder: '#2a2a2a',
    sidebarRing: '#707070',
  },
};

export const spacing = {
  0: 0,
  px: 1,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
  36: 144,
  40: 160,
  44: 176,
  48: 192,
  52: 208,
  56: 224,
  60: 240,
  64: 256,
  72: 288,
  80: 320,
  96: 384,
};

export const borderRadius = {
  none: 0,
  sm: 2,
  DEFAULT: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
  full: 9999,
};

export const typography = {
  fontFamily: {
    sans: 'Gotham-Book',
    medium: 'Gotham-Medium',
    bold: 'Gotham-Bold',
    light: 'Gotham-Light',
    mono: 'Courier',
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
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const animations = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  easing: {
    linear: 'linear',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
};
