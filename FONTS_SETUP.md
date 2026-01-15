# Font Setup Guide

## Current Status

The app is currently using **system fonts**:
- **iOS**: San Francisco (via `-apple-system`)
- **Android**: Roboto

This provides a clean, native look without requiring custom font files.

## Why No Gotham Yet?

Gotham is a **commercial font** that requires a license. We haven't included it because:
1. Font files aren't in the repository
2. Licensing restrictions prevent redistribution
3. System fonts work great as a fallback

## Adding Gotham Font (If You Have a License)

### Step 1: Get Font Files
Purchase or obtain Gotham font files from a licensed source. You'll need:
- `Gotham-Book.otf` (regular weight)
- `Gotham-Medium.otf` (medium weight)
- `Gotham-Bold.otf` (bold weight)

### Step 2: Add Files to Project
Place the font files in:
```
catalyst-native/assets/fonts/
```

### Step 3: Install expo-font
```bash
cd catalyst-native
npm install expo-font
```

### Step 4: Update Font Configuration
Edit `src/utils/fonts.ts`:
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

### Step 5: Enable Font Loading in App.tsx
Uncomment this line in `App.tsx`:
```typescript
// await Font.loadAsync(fonts);
```

And add the import:
```typescript
import * as Font from 'expo-font';
```

### Step 6: Update Design Tokens
Edit `src/constants/design-tokens.ts`:
```typescript
fontFamily: {
  sans: 'Gotham-Book',
  medium: 'Gotham-Medium',
  bold: 'Gotham-Bold',
}
```

### Step 7: Use in Components
```typescript
import { typography } from '../constants/design-tokens';

const styles = StyleSheet.create({
  text: {
    fontFamily: typography.fontFamily.sans,
    fontWeight: typography.fontWeight.normal,
  },
  heading: {
    fontFamily: typography.fontFamily.bold,
    fontWeight: typography.fontWeight.bold,
  },
});
```

## Alternative: Using Inter Font

Inter is a free, open-source alternative that's similar to Gotham:

1. Download from: https://rsms.me/inter/
2. Follow the same steps as above
3. Use `Inter-Regular.ttf`, `Inter-Medium.ttf`, `Inter-Bold.ttf`

## Styling Philosophy

For now, we're using system fonts which:
- ✅ Load instantly (no download)
- ✅ Look native on each platform
- ✅ Are optimized for readability
- ✅ Require no licensing
- ✅ Reduce app bundle size

When you add custom fonts, the app will automatically use them throughout all components since they reference `design-tokens.ts`.

## Testing Fonts

After adding fonts, test on both platforms:
```bash
npx expo start
# Press 'i' for iOS simulator
# Press 'a' for Android emulator
```

Check that fonts load correctly in:
- Navigation headers
- Button text
- Card titles
- Input fields
- All UI components
