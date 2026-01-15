# Custom Fonts

## Adding Gotham Font

Gotham is a commercial font. If you have purchased Gotham, follow these steps:

1. **Place font files here:**
   - `Gotham-Book.otf` (or .ttf)
   - `Gotham-Medium.otf`
   - `Gotham-Bold.otf`
   - `Gotham-Light.otf` (optional)

2. **Update `src/utils/fonts.ts`:**
   ```typescript
   export const fonts = {
     'Gotham-Book': require('../../assets/fonts/Gotham-Book.otf'),
     'Gotham-Medium': require('../../assets/fonts/Gotham-Medium.otf'),
     'Gotham-Bold': require('../../assets/fonts/Gotham-Bold.otf'),
   };

   export const fontFamily = {
     regular: 'Gotham-Book',
     medium: 'Gotham-Medium',
     bold: 'Gotham-Bold',
     semibold: 'Gotham-Medium',
   };
   ```

3. **Install expo-font:**
   ```bash
   npm install expo-font
   ```

4. **Update App.tsx to load fonts:**
   Uncomment the Font.loadAsync line in App.tsx

5. **Use in components:**
   ```typescript
   import { fontFamily } from '../utils/fonts';
   
   const styles = StyleSheet.create({
     text: {
       fontFamily: fontFamily.regular,
     },
   });
   ```

## Alternative: Using Inter Font

Inter is a free, open-source alternative that's similar to Gotham:

1. Download Inter from https://rsms.me/inter/
2. Place font files here
3. Update `src/utils/fonts.ts` accordingly

## Current Setup

Currently using system fonts:
- iOS: San Francisco (-apple-system)
- Android: Roboto

This provides a clean, native look without additional font files.
