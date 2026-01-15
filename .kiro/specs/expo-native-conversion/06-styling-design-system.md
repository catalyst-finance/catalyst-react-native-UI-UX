# Styling & Design System Conversion

## Tailwind CSS → NativeWind

### Setup
```bash
npm install nativewind
npm install --save-dev tailwindcss
```

### Configuration
```javascript
// tailwind.config.js
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        'card-foreground': 'var(--card-foreground)',
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        secondary: 'var(--secondary)',
        'secondary-foreground': 'var(--secondary-foreground)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        accent: 'var(--accent)',
        'accent-foreground': 'var(--accent-foreground)',
        destructive: 'var(--destructive)',
        'destructive-foreground': 'var(--destructive-foreground)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        positive: 'var(--positive)',
        negative: 'var(--negative)',
        'ai-accent': 'var(--ai-accent)',
      },
    },
  },
  plugins: [],
};
```

### Design Tokens
**Web**: CSS variables in `src/styles/globals.css`
**Native**: Theme context with StyleSheet

```typescript
// src/theme/tokens.ts
export const lightTheme = {
  background: '#ffffff',
  foreground: '#030213',
  card: '#ffffff',
  cardForeground: '#030213',
  primary: '#030213',
  primaryForeground: '#ffffff',
  secondary: '#f3f3f5',
  secondaryForeground: '#030213',
  muted: '#ececf0',
  mutedForeground: '#717182',
  accent: '#e9ebef',
  accentForeground: '#030213',
  destructive: '#d4183d',
  destructiveForeground: '#ffffff',
  border: 'rgba(0, 0, 0, 0.1)',
  input: 'transparent',
  ring: '#b4b4b4',
  positive: '#00C851',
  negative: '#FF4444',
  aiAccent: '#000000',
  warning: '#FF8800',
  neutral: '#9E9E9E',
};

export const darkTheme = {
  background: '#030213',
  foreground: '#f8f8f8',
  card: '#030213',
  cardForeground: '#f8f8f8',
  primary: '#f8f8f8',
  primaryForeground: '#030213',
  secondary: '#444444',
  secondaryForeground: '#f8f8f8',
  muted: '#444444',
  mutedForeground: '#c7c7c7',
  accent: '#444444',
  accentForeground: '#f8f8f8',
  destructive: '#651a2e',
  destructiveForeground: '#f28ba0',
  border: '#666666',
  input: '#444444',
  ring: '#707070',
  positive: '#00C851',
  negative: '#FF4444',
  aiAccent: '#ffffff',
  warning: '#FF8800',
  neutral: '#9E9E9E',
};

// Theme context
export const ThemeContext = createContext({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const colorScheme = useColorScheme();
  const [isDark, setIsDark] = useState(colorScheme === 'dark');
  const theme = isDark ? darkTheme : lightTheme;
  
  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme: () => setIsDark(!isDark) }}>
      {children}
    </ThemeContext.Provider>
  );
};
```

## Typography

### Font Setup
```typescript
// app.json
{
  "expo": {
    "plugins": [
      [
        "expo-font",
        {
          "fonts": [
            "./assets/fonts/Gotham-Book.otf",
            "./assets/fonts/Gotham-Medium.otf",
            "./assets/fonts/Gotham-Bold.otf"
          ]
        }
      ]
    ]
  }
}

// Load fonts
import { useFonts } from 'expo-font';

export default function App() {
  const [fontsLoaded] = useFonts({
    'Gotham-Book': require('./assets/fonts/Gotham-Book.otf'),
    'Gotham-Medium': require('./assets/fonts/Gotham-Medium.otf'),
    'Gotham-Bold': require('./assets/fonts/Gotham-Bold.otf'),
  });
  
  if (!fontsLoaded) {
    return <AppLoading />;
  }
  
  return <MainApp />;
}
```

### Text Components
```typescript
// src/components/ui/text.tsx
import { Text as RNText, StyleSheet } from 'react-native';

export const Text = ({ variant = 'body', className, style, ...props }) => {
  return (
    <RNText
      style={[styles[variant], style]}
      className={className}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  h1: {
    fontFamily: 'Gotham-Medium',
    fontSize: 24,
    lineHeight: 36,
  },
  h2: {
    fontFamily: 'Gotham-Medium',
    fontSize: 20,
    lineHeight: 30,
  },
  h3: {
    fontFamily: 'Gotham-Medium',
    fontSize: 18,
    lineHeight: 27,
  },
  body: {
    fontFamily: 'Gotham-Book',
    fontSize: 16,
    lineHeight: 24,
  },
  caption: {
    fontFamily: 'Gotham-Book',
    fontSize: 14,
    lineHeight: 21,
  },
});
```

## Animations

### Web Animations → React Native Reanimated
```typescript
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

// Fade in animation
export const FadeIn = ({ children, delay = 0 }) => {
  const opacity = useSharedValue(0);
  
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
  }, []);
  
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));
  
  return (
    <Animated.View style={animatedStyle}>
      {children}
    </Animated.View>
  );
};

// Slide in animation
export const SlideIn = ({ children, direction = 'left' }) => {
  const translateX = useSharedValue(direction === 'left' ? -100 : 100);
  
  useEffect(() => {
    translateX.value = withSpring(0);
  }, []);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  
  return (
    <Animated.View style={animatedStyle}>
      {children}
    </Animated.View>
  );
};
```

## Responsive Design

### Screen Dimensions
```typescript
import { Dimensions, Platform } from 'react-native';

export const useResponsive = () => {
  const { width, height } = Dimensions.get('window');
  
  return {
    isSmall: width < 375,
    isMedium: width >= 375 && width < 768,
    isLarge: width >= 768,
    width,
    height,
    isIOS: Platform.OS === 'ios',
    isAndroid: Platform.OS === 'android',
  };
};

// Usage
const { isSmall, isLarge } = useResponsive();
const padding = isSmall ? 12 : isLarge ? 24 : 16;
```

## Safe Area Handling
```typescript
import { SafeAreaView } from 'react-native-safe-area-context';

export const Screen = ({ children }) => {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
      {children}
    </SafeAreaView>
  );
};
```
