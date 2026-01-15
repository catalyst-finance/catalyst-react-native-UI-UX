# Quick Start Guide

## Prerequisites

Before you begin, ensure you have:

1. **Node.js 20.19.4+** installed
2. **npm** or **yarn** package manager
3. **Expo CLI** (will be installed automatically)
4. **Development environment**:
   - For iOS: Mac with Xcode installed
   - For Android: Android Studio with emulator
   - For both: Expo Go app on your physical device

## Installation

1. Navigate to the project directory:
```bash
cd catalyst-native
```

2. Install dependencies (already done):
```bash
npm install
```

## Running the App

### Option 1: Expo Go (Recommended for Quick Testing)

1. Start the development server:
```bash
npm start
```

2. Scan the QR code with:
   - **iOS**: Camera app
   - **Android**: Expo Go app

### Option 2: iOS Simulator (Mac only)

```bash
npm run ios
```

### Option 3: Android Emulator

```bash
npm run android
```

### Option 4: Web Browser

```bash
npm run web
```

## What's Working Now

✅ **Navigation**: Bottom tab navigation with 4 screens
✅ **Theme**: Light/dark mode toggle in Profile screen
✅ **UI Components**: Button, Card, Input components
✅ **Screens**: Basic scaffolds for all main screens

## Testing the App

1. **Theme Toggle**: 
   - Go to Profile tab
   - Toggle the Dark Mode switch
   - See the theme change across all screens

2. **Navigation**:
   - Tap each tab icon to navigate
   - Verify smooth transitions

3. **UI Components**:
   - Check Card components on Home screen
   - Verify text is readable in both themes

## Next Steps

After verifying the basic setup works:

1. **Add More UI Components** (Week 2)
   - Text component
   - Badge component
   - Switch component
   - Custom fonts

2. **Build Chart Components** (Week 3-4)
   - Victory Native charts
   - Dual-section stock chart
   - Interactive crosshair

3. **Integrate Data Services** (Week 5-6)
   - Supabase connection
   - Real-time price updates
   - Offline caching

## Troubleshooting

### Metro bundler issues
```bash
# Clear cache and restart
npm start -- --clear
```

### iOS build issues
```bash
# Clean iOS build
cd ios && pod install && cd ..
npm run ios
```

### Android build issues
```bash
# Clean Android build
cd android && ./gradlew clean && cd ..
npm run android
```

### NativeWind not working
```bash
# Ensure metro.config.js is correct
# Restart with cache clear
npm start -- --clear
```

## Development Tips

1. **Hot Reload**: Changes to code will automatically reload
2. **Debug Menu**: Shake device or press Cmd+D (iOS) / Cmd+M (Android)
3. **Console Logs**: Use `console.log()` - visible in terminal
4. **React DevTools**: Available in debug menu

## File Structure

```
catalyst-native/
├── src/
│   ├── components/ui/     # Button, Card, Input
│   ├── screens/           # HomeScreen, CopilotScreen, etc.
│   ├── navigation/        # RootNavigator
│   ├── contexts/          # ThemeContext
│   ├── constants/         # design-tokens.ts
│   ├── styles/            # global.css
│   └── types/             # TypeScript types
├── App.tsx                # Main app entry
├── app.json              # Expo config
├── metro.config.js       # Metro bundler config
├── tailwind.config.js    # Tailwind config
└── babel.config.js       # Babel config
```

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [NativeWind](https://www.nativewind.dev/)
- [Victory Native](https://formidable.com/open-source/victory/docs/native/)

## Support

For issues or questions, refer to:
- PROGRESS.md - Current implementation status
- README.md - Full project documentation
- .kiro/specs/expo-native-conversion/ - Detailed conversion specs
