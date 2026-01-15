# Catalyst Native App

React Native mobile application for Catalyst - Market Intelligence Platform

## Tech Stack

- **Framework**: Expo (managed workflow)
- **Language**: TypeScript
- **Navigation**: React Navigation
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Charts**: Victory Native + react-native-svg
- **State Management**: React Context
- **Backend**: Supabase
- **Storage**: AsyncStorage

## Getting Started

### Prerequisites

- Node.js 20.19.4+
- npm or yarn
- Expo CLI
- iOS Simulator (Mac only) or Android Emulator

### Installation

```bash
npm install
```

### Running the App

```bash
# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on web
npm run web
```

## Project Structure

```
catalyst-native/
├── src/
│   ├── components/       # Reusable UI components
│   │   └── ui/          # Base UI components (Button, Card, Input, etc.)
│   ├── screens/         # Screen components
│   ├── navigation/      # Navigation configuration
│   ├── contexts/        # React Context providers
│   ├── services/        # API and data services
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript type definitions
│   ├── constants/       # Design tokens and constants
│   └── styles/          # Global styles
├── assets/              # Images, fonts, etc.
└── app.json            # Expo configuration
```

## Development

### Phase 1: Foundation (Current)
- ✅ Expo project setup
- ✅ NativeWind configuration
- ✅ Design tokens
- ✅ Theme context
- ✅ Base UI components
- ✅ Navigation structure
- ✅ Main screens scaffolding

### Phase 2: Core Components (Next)
- [ ] Complete UI component library
- [ ] Chart components
- [ ] Data visualization

### Phase 3: Data Layer
- [ ] Supabase integration
- [ ] API services
- [ ] Real-time updates
- [ ] Offline support

### Phase 4: Screens
- [ ] Home/Timeline screen
- [ ] Copilot chat screen
- [ ] Discover screen
- [ ] Profile screen
- [ ] Stock detail screen
- [ ] Portfolio screen

### Phase 5: Features
- [ ] Drag-and-drop
- [ ] Push notifications
- [ ] Biometric auth
- [ ] Haptic feedback

### Phase 6: Testing & Deployment
- [ ] Unit tests
- [ ] E2E tests
- [ ] App store submission

## Design System

The app uses a design system extracted from the web app to ensure visual consistency:

- **Colors**: HSL-based color tokens for light/dark modes
- **Spacing**: 4px base unit (xs, sm, md, lg, xl, 2xl, 3xl)
- **Typography**: System fonts with defined sizes and weights
- **Border Radius**: Consistent rounding (sm, md, lg, xl, 2xl, full)
- **Shadows**: Platform-specific elevation

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

## Building

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

## Contributing

See the main project documentation for contribution guidelines.

## License

Proprietary - All rights reserved
