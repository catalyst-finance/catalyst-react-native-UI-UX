# Testing Strategy

## Testing Framework Setup

### Unit Testing
```bash
npm install --save-dev jest @testing-library/react-native @testing-library/jest-native
```

### E2E Testing
```bash
npm install --save-dev detox detox-cli
```

### Configuration
```javascript
// jest.config.js
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)'
  ],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
};
```

## Unit Tests

### Component Tests
```typescript
// src/components/ui/__tests__/button.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../button';

describe('Button', () => {
  it('renders correctly', () => {
    const { getByText } = render(<Button>Click me</Button>);
    expect(getByText('Click me')).toBeTruthy();
  });
  
  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button onPress={onPress}>Click me</Button>);
    fireEvent.press(getByText('Click me'));
    expect(onPress).toHaveBeenCalled();
  });
  
  it('applies variant styles', () => {
    const { getByText } = render(<Button variant="outline">Click me</Button>);
    const button = getByText('Click me').parent;
    expect(button).toHaveStyle({ borderWidth: 1 });
  });
});
```

### Service Tests
```typescript
// src/utils/__tests__/data-service.test.ts
import DataService from '../data-service';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage');

describe('DataService', () => {
  beforeEach(() => {
    AsyncStorage.clear();
  });
  
  it('caches stock data', async () => {
    const mockData = { AAPL: { currentPrice: 150 } };
    jest.spyOn(DataService, 'getAllStocks').mockResolvedValue(mockData);
    
    const data = await DataService.getAllStocks();
    expect(data).toEqual(mockData);
    
    // Check cache
    const cached = await AsyncStorage.getItem('all-stocks');
    expect(JSON.parse(cached).data).toEqual(mockData);
  });
});
```

## Integration Tests

### Screen Tests
```typescript
// src/screens/__tests__/home-screen.test.tsx
import { render, waitFor } from '@testing-library/react-native';
import { HomeScreen } from '../home-screen';
import DataService from '../../utils/data-service';

jest.mock('../../utils/data-service');

describe('HomeScreen', () => {
  it('loads and displays stocks', async () => {
    const mockStocks = {
      AAPL: { symbol: 'AAPL', currentPrice: 150 },
      TSLA: { symbol: 'TSLA', currentPrice: 200 },
    };
    
    DataService.getStocks.mockResolvedValue(mockStocks);
    
    const { getByText } = render(<HomeScreen selectedTickers={['AAPL', 'TSLA']} />);
    
    await waitFor(() => {
      expect(getByText('AAPL')).toBeTruthy();
      expect(getByText('TSLA')).toBeTruthy();
    });
  });
});
```

## E2E Tests

### Detox Configuration
```javascript
// .detoxrc.js
module.exports = {
  testRunner: {
    args: {
      '$0': 'jest',
      config: 'e2e/jest.config.js'
    },
    jest: {
      setupTimeout: 120000
    }
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/CatalystNative.app',
      build: 'xcodebuild -workspace ios/CatalystNative.xcworkspace -scheme CatalystNative -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build'
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug'
    }
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15'
      }
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_5_API_31'
      }
    }
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug'
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug'
    }
  }
};
```

### E2E Test Examples
```typescript
// e2e/home-screen.e2e.ts
describe('Home Screen', () => {
  beforeAll(async () => {
    await device.launchApp();
  });
  
  it('should display stock list', async () => {
    await expect(element(by.id('stock-list'))).toBeVisible();
  });
  
  it('should navigate to stock details on tap', async () => {
    await element(by.id('stock-AAPL')).tap();
    await expect(element(by.id('stock-info-screen'))).toBeVisible();
  });
  
  it('should refresh stock prices on pull-to-refresh', async () => {
    await element(by.id('stock-list')).swipe('down', 'fast', 0.8);
    await waitFor(element(by.id('refresh-indicator')))
      .not.toBeVisible()
      .withTimeout(5000);
  });
});

// e2e/copilot-screen.e2e.ts
describe('Copilot Screen', () => {
  it('should send and receive messages', async () => {
    await element(by.id('tab-copilot')).tap();
    await element(by.id('chat-input')).typeText('What is AAPL?');
    await element(by.id('send-button')).tap();
    
    await waitFor(element(by.text('Apple Inc.')))
      .toBeVisible()
      .withTimeout(10000);
  });
});
```

## Performance Testing

### React Native Performance Monitor
```typescript
// src/utils/performance-monitor.ts
import { InteractionManager } from 'react-native';

export const measurePerformance = (name: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const end = performance.now();
  console.log(`[Performance] ${name}: ${end - start}ms`);
};

export const waitForInteractions = () => {
  return new Promise(resolve => {
    InteractionManager.runAfterInteractions(resolve);
  });
};
```

### Memory Leak Detection
```typescript
// Use React DevTools Profiler
import { Profiler } from 'react';

const onRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) => {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
};

<Profiler id="HomeScreen" onRender={onRenderCallback}>
  <HomeScreen />
</Profiler>
```

## Test Coverage Goals

### Minimum Coverage
- Unit Tests: 80%
- Integration Tests: 60%
- E2E Tests: Critical paths only

### Critical Paths to Test
1. User authentication flow
2. Stock search and selection
3. Real-time price updates
4. Chart interactions
5. Portfolio management
6. AI copilot chat
7. Event timeline navigation
8. Settings and preferences

## Continuous Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run test:e2e
```
