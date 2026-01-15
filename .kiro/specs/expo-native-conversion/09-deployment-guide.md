# Deployment Guide

## App Store Preparation

### iOS App Store

#### 1. App Icons
Create icons for all required sizes:
- 1024x1024 (App Store)
- 180x180 (iPhone)
- 167x167 (iPad Pro)
- 152x152 (iPad)
- 120x120 (iPhone)
- 87x87 (iPhone)
- 80x80 (iPad)
- 76x76 (iPad)
- 60x60 (iPhone)
- 58x58 (iPhone)
- 40x40 (iPad/iPhone)
- 29x29 (iPad/iPhone)
- 20x20 (iPad/iPhone)

#### 2. Screenshots
Required sizes:
- 6.7" (iPhone 15 Pro Max): 1290x2796
- 6.5" (iPhone 14 Plus): 1284x2778
- 5.5" (iPhone 8 Plus): 1242x2208
- 12.9" (iPad Pro): 2048x2732

#### 3. App Store Connect Setup
```bash
# Install fastlane
gem install fastlane

# Initialize fastlane
cd ios
fastlane init
```

```ruby
# fastlane/Fastfile
default_platform(:ios)

platform :ios do
  desc "Push a new beta build to TestFlight"
  lane :beta do
    increment_build_number(xcodeproj: "CatalystNative.xcodeproj")
    build_app(scheme: "CatalystNative")
    upload_to_testflight
  end

  desc "Push a new release build to the App Store"
  lane :release do
    increment_build_number(xcodeproj: "CatalystNative.xcodeproj")
    build_app(scheme: "CatalystNative")
    upload_to_app_store
  end
end
```

#### 4. App Metadata
```
App Name: Catalyst - Market Intelligence
Subtitle: Real-time stock tracking & AI insights
Category: Finance
Keywords: stocks, trading, market, finance, AI, catalyst, events
Description: [250 character summary]
Promotional Text: [170 characters]
```

### Android Google Play

#### 1. App Icons
Create icons for all densities:
- xxxhdpi: 192x192
- xxhdpi: 144x144
- xhdpi: 96x96
- hdpi: 72x72
- mdpi: 48x48

#### 2. Screenshots
Required sizes:
- Phone: 1080x1920 (minimum)
- 7" Tablet: 1200x1920
- 10" Tablet: 1600x2560

#### 3. Google Play Console Setup
```bash
# Generate signed APK
cd android
./gradlew bundleRelease

# Upload to Play Console
# Use fastlane or manual upload
```

```ruby
# fastlane/Fastfile
platform :android do
  desc "Deploy a new version to the Google Play"
  lane :deploy do
    gradle(task: "clean bundleRelease")
    upload_to_play_store
  end
end
```

#### 4. App Metadata
```
App Name: Catalyst - Market Intelligence
Short Description: Real-time stock tracking with AI-powered insights
Full Description: [4000 characters]
Category: Finance
Content Rating: Everyone
```

## Build Configuration

### Expo EAS Build

#### 1. Install EAS CLI
```bash
npm install -g eas-cli
eas login
```

#### 2. Configure EAS
```json
// eas.json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "ios": {
        "autoIncrement": true
      },
      "android": {
        "autoIncrement": true
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCD123456"
      },
      "android": {
        "serviceAccountKeyPath": "./service-account.json",
        "track": "production"
      }
    }
  }
}
```

#### 3. Build Commands
```bash
# Development build
eas build --profile development --platform ios
eas build --profile development --platform android

# Preview build
eas build --profile preview --platform all

# Production build
eas build --profile production --platform all

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

### App Configuration

#### app.json
```json
{
  "expo": {
    "name": "Catalyst",
    "slug": "catalyst-native",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.catalyst.app",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "Allow Catalyst to access your camera for document scanning",
        "NSPhotoLibraryUsageDescription": "Allow Catalyst to access your photos",
        "NSFaceIDUsageDescription": "Allow Catalyst to use Face ID for authentication"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.catalyst.app",
      "versionCode": 1,
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "USE_BIOMETRIC",
        "USE_FINGERPRINT"
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-font",
      "expo-secure-store",
      [
        "expo-local-authentication",
        {
          "faceIDPermission": "Allow Catalyst to use Face ID for authentication"
        }
      ]
    ]
  }
}
```

## Environment Configuration

### Development
```bash
# .env.development
API_URL=https://dev-api.catalyst.app
SUPABASE_URL=https://dev.supabase.co
SUPABASE_ANON_KEY=your-dev-key
PLAID_ENV=sandbox
```

### Production
```bash
# .env.production
API_URL=https://api.catalyst.app
SUPABASE_URL=https://prod.supabase.co
SUPABASE_ANON_KEY=your-prod-key
PLAID_ENV=production
```

## Release Checklist

### Pre-Release
- [ ] All tests passing
- [ ] No console warnings
- [ ] Performance profiling complete
- [ ] Memory leaks fixed
- [ ] Accessibility audit passed
- [ ] Security audit passed
- [ ] Privacy policy updated
- [ ] Terms of service updated

### iOS Release
- [ ] App icons generated
- [ ] Screenshots captured
- [ ] App Store metadata written
- [ ] TestFlight beta tested
- [ ] App Store review guidelines checked
- [ ] Privacy manifest created
- [ ] Build uploaded to App Store Connect
- [ ] Submitted for review

### Android Release
- [ ] App icons generated
- [ ] Screenshots captured
- [ ] Play Store metadata written
- [ ] Internal testing complete
- [ ] Closed beta tested
- [ ] Open beta tested (optional)
- [ ] Build uploaded to Play Console
- [ ] Submitted for review

## Post-Release

### Monitoring
- Set up crash reporting (Sentry)
- Configure analytics (Firebase, Amplitude)
- Monitor app store reviews
- Track key metrics (DAU, retention, crashes)

### Updates
- Plan regular update cycle (bi-weekly/monthly)
- Respond to user feedback
- Fix critical bugs immediately
- Add new features incrementally
