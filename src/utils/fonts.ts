/**
 * Font Loading Utility
 * 
 * Gotham fonts are now configured and ready to use.
 */

export const fonts = {
  'Gotham-Book': require('../../assets/fonts/Gotham-Book.otf'),
  'Gotham-Medium': require('../../assets/fonts/Gotham-Medium.otf'),
  'Gotham-Bold': require('../../assets/fonts/Gotham-Bold.ttf'),
  'Gotham-Light': require('../../assets/fonts/Gotham-Light.otf'),
};

// Font family to use in StyleSheet
export const fontFamily = {
  regular: 'Gotham-Book',
  medium: 'Gotham-Medium',
  bold: 'Gotham-Bold',
  semibold: 'Gotham-Medium',
  light: 'Gotham-Light',
};
