# Testing Guide - Phase 3 Services

Complete guide for testing all Phase 3 Data Layer services.

**Last Updated**: January 12, 2026

---

## Quick Start

### 1. Start the App
```bash
cd catalyst-native
npm start
```

### 2. Navigate to Service Test Screen
- Open the app on your device/simulator
- Tap the "Service Test" tab at the bottom
- You'll see all service statuses and can run integration tests

---

## Automated Integration Tests

### Running Tests

**Option 1: Via Service Test Screen (Recommended)**
1. Open app
2. Navigate to "Service Test" tab
3. Tap "Run Integration Tests" button
4. View results on screen

**Option 2: Via Console**
```typescript
import { runIntegrationTests } from './src/tests/integration/services.test';

// Run tests
const results = await runIntegrationTests();
console.log('Results:', results);
```

### Test Coverage

The integration tests cover:

1. **DataService - Cache Operations**
   - Set and retrieve cached data
   - Verify data integrity

2. **DataService - Cache Expiration**
   - Set cache with short TTL
   - Verify automatic expiration

3. **DataService - Cache Invalidation**
   - Invalidate specific cache entries
   - Verify removal

4. **DataService - Pattern Invalidation**
   - Invalidate multiple entries by pattern
   - Verify selective removal

5. **DataService - Cache Statistics**
   - Retrieve cache stats
   - Verify data structure

6. **NetworkService - Connection Status**
   - Check connection state
   - Verify connection type

7. **NetworkService - Connection Listener**
   - Register connection change listener
   - Verify callback execution

8. **BackgroundFetchService - Status**
   - Check registration status
   - Verify status data structure

9. **Integration - Cache + Network**
   - Test services working together
   - Verify data flow

10. **Cleanup**
    - Remove test data
    - Verify cleanup

### Expected Results

All 10 tests should pass:
```
✅ Passed: 10
❌ Failed: 0
📈 Success Rate: 100.0%
```

---

## Manual Testing

### DataService Testing

#### Test Cache Operations
```typescript
import { DataService } from './src/services/DataService';

// Set cache
await DataService.setCachedData('test_key', { value: 123 }, 5 * 60 * 1000);

// Get cache
const data = await DataService.getCachedData('test_key');
console.log('Cached data:', data); // Should be { value: 123 }

// Invalidate
await DataService.invalidateCache('test_key');

// Verify removal
const removed = await DataService.getCachedData('test_key');
console.log('After invalidation:', removed); // Should be null
```

#### Test Cache Statistics
```typescript
const stats = await DataService.getCacheStats();
console.log('Cache stats:', stats);
// Expected: { totalKeys, memoryKeys, storageKeys, totalSize }
```

#### Test Pattern Invalidation
```typescript
// Set multiple caches
await DataService.setCachedData('stock_AAPL', { price: 150 }, 5 * 60 * 1000);
await DataService.setCachedData('stock_GOOGL', { price: 2800 }, 5 * 60 * 1000);

// Invalidate by pattern
const count = await DataService.invalidateCachePattern('stock_');
console.log('Invalidated:', count); // Should be 2
```

### NetworkService Testing

#### Test Connection Status
```typescript
import { NetworkService } from './src/services/NetworkService';

// Check connection
const isOnline = NetworkService.isConnected();
console.log('Connected:', isOnline);

// Get connection type
const type = NetworkService.getConnectionType();
console.log('Type:', type); // 'wifi', 'cellular', 'none', etc.
```

#### Test Connection Listener
```typescript
const unsubscribe = NetworkService.onConnectionChange((isOnline, type) => {
  console.log('Connection changed:', isOnline, type);
});

// Later: unsubscribe
unsubscribe();
```

#### Test Offline Queue
```typescript
// Queue a request
const result = await NetworkService.queueRequest(async () => {
  return await fetch('https://api.example.com/data');
});

// If online: executes immediately
// If offline: queues for later
```

### BackgroundFetchService Testing

#### Test Status
```typescript
import { BackgroundFetchService } from './src/services/BackgroundFetchService';

const status = await BackgroundFetchService.getStatus();
console.log('Status:', status);
// Expected: { isRegistered, lastFetchTime, nextFetchTime }
```

#### Test Manual Trigger
```typescript
// Trigger manual fetch (for testing)
await BackgroundFetchService.triggerManualFetch();
console.log('Manual fetch triggered');
```

### AuthContext Testing

#### Test Authentication State
```typescript
import { useAuth } from './src/contexts/AuthContext';

const { user, loading, biometricAvailable } = useAuth();

console.log('User:', user);
console.log('Loading:', loading);
console.log('Biometric available:', biometricAvailable);
```

#### Test Sign In
```typescript
const { signIn } = useAuth();

const { error } = await signIn('user@example.com', 'password');

if (error) {
  console.error('Sign in error:', error);
} else {
  console.log('Signed in successfully');
}
```

#### Test Biometric Authentication
```typescript
const { biometricAvailable, authenticateWithBiometric } = useAuth();

if (biometricAvailable) {
  const success = await authenticateWithBiometric();
  console.log('Biometric auth:', success ? 'Success' : 'Failed');
}
```

### ThemeContext Testing

#### Test Theme State
```typescript
import { useTheme } from './src/contexts/ThemeContext';

const { theme, isDark } = useTheme();

console.log('Theme:', theme); // 'light', 'dark', or 'system'
console.log('Is dark:', isDark);
```

#### Test Theme Toggle
```typescript
const { toggleTheme } = useTheme();

// Toggle between light and dark
await toggleTheme();
```

#### Test Theme Setting
```typescript
const { setTheme } = useTheme();

// Set specific theme
await setTheme('dark');
await setTheme('light');
await setTheme('system');
```

---

## Device Testing

### iOS Testing

#### Prerequisites
- Physical iOS device or iOS Simulator
- Xcode installed
- iOS 13.0 or later

#### Steps
1. Connect iOS device or start simulator
2. Run: `npm run ios`
3. Wait for app to build and launch
4. Navigate to "Service Test" screen
5. Run integration tests
6. Verify all tests pass

#### iOS-Specific Tests
- **Background Fetch**: Test background updates (requires physical device)
- **Face ID**: Test biometric authentication
- **System Theme**: Change iOS theme and verify app follows

### Android Testing

#### Prerequisites
- Physical Android device or Android Emulator
- Android Studio installed
- Android 5.0 (API 21) or later

#### Steps
1. Connect Android device or start emulator
2. Run: `npm run android`
3. Wait for app to build and launch
4. Navigate to "Service Test" screen
5. Run integration tests
6. Verify all tests pass

#### Android-Specific Tests
- **Background Fetch**: Test background updates
- **Fingerprint**: Test biometric authentication
- **System Theme**: Change Android theme and verify app follows

---

## Network Testing

### Test Offline Mode

1. **Enable Airplane Mode**
   - iOS: Settings > Airplane Mode
   - Android: Settings > Network > Airplane Mode

2. **Verify Offline Behavior**
   - App should show cached data
   - Network requests should be queued
   - No crashes or errors

3. **Disable Airplane Mode**
   - Verify queued requests execute
   - Verify data syncs

### Test Network Transitions

1. **Switch Between WiFi and Cellular**
   - Verify connection type updates
   - Verify listeners are notified
   - Verify no data loss

2. **Test Poor Connection**
   - Use network throttling
   - Verify retry logic works
   - Verify graceful degradation

---

## Performance Testing

### Cache Performance

```typescript
// Test cache read performance
const start = Date.now();
for (let i = 0; i < 100; i++) {
  await DataService.getCachedData('test_key');
}
const duration = Date.now() - start;
console.log('100 cache reads:', duration, 'ms');
// Expected: < 100ms (< 1ms per read)
```

### Memory Usage

1. Open app
2. Navigate to "Service Test" screen
3. Check cache statistics
4. Verify memory usage is reasonable
5. Clear cache and verify memory is freed

### Battery Usage

1. Enable background fetch
2. Use app normally for 1 hour
3. Check battery usage in device settings
4. Verify background fetch is not draining battery excessively

---

## Troubleshooting

### Tests Failing

**Issue**: Integration tests fail

**Solutions**:
1. Check console for error messages
2. Verify services are initialized (check App.tsx logs)
3. Clear cache and restart app
4. Check network connection
5. Verify AsyncStorage permissions

### Background Fetch Not Working

**Issue**: Background fetch not triggering

**Solutions**:
1. Verify registration: `BackgroundFetchService.getStatus()`
2. Check iOS/Android background refresh settings
3. Test on physical device (simulators may not support background fetch)
4. Verify app is not force-closed
5. Wait at least 15 minutes (minimum interval)

### Biometric Auth Not Available

**Issue**: Biometric authentication not available

**Solutions**:
1. Verify device has biometric hardware
2. Check if biometrics are enrolled in device settings
3. Verify app has biometric permissions
4. Test on physical device (simulators may not support biometrics)

### Cache Not Persisting

**Issue**: Cache data lost on app restart

**Solutions**:
1. Verify AsyncStorage permissions
2. Check for storage quota errors in console
3. Clear app data and reinstall
4. Verify cache TTL is not too short

### Network Listener Not Firing

**Issue**: Connection change listener not called

**Solutions**:
1. Verify NetworkService.init() was called
2. Check listener registration
3. Test network changes (airplane mode on/off)
4. Verify listener is not unsubscribed prematurely

---

## Test Checklist

### Pre-Deployment Checklist

- [ ] All integration tests pass (10/10)
- [ ] App starts without errors
- [ ] Services initialize correctly
- [ ] Cache operations work
- [ ] Network detection works
- [ ] Background fetch registered
- [ ] Authentication works
- [ ] Theme switching works
- [ ] Offline mode works
- [ ] Network transitions work
- [ ] No memory leaks
- [ ] Battery usage acceptable
- [ ] iOS device testing complete
- [ ] Android device testing complete
- [ ] Performance benchmarks met

### Performance Benchmarks

- [ ] App startup < 3 seconds
- [ ] Cache read < 10ms
- [ ] Cache write < 50ms
- [ ] Service initialization < 2 seconds
- [ ] Network status check < 100ms
- [ ] Theme switch < 100ms
- [ ] No UI blocking operations

---

## Continuous Testing

### During Development

1. Run integration tests after each service change
2. Test on both iOS and Android regularly
3. Test offline mode frequently
4. Monitor console for errors
5. Check cache statistics periodically

### Before Commits

1. Run all integration tests
2. Verify no TypeScript errors
3. Test on at least one device
4. Check for console warnings
5. Verify documentation is updated

### Before Releases

1. Full device testing (iOS + Android)
2. Performance benchmarking
3. Battery usage testing
4. Network scenario testing
5. Stress testing (large cache, many requests)
6. Security audit (auth, storage)

---

## Support

### Getting Help

If tests fail or you encounter issues:

1. Check console logs for error messages
2. Review this testing guide
3. Check service documentation in `QUICK_REFERENCE_SERVICES.md`
4. Review implementation details in `PHASE_3_IMPLEMENTATION_COMPLETE.md`
5. Check known issues in `PHASE_3_SPEC_UPDATE.md`

### Reporting Issues

When reporting issues, include:
- Device type and OS version
- Test results (passed/failed counts)
- Console logs
- Steps to reproduce
- Expected vs actual behavior

---

**Happy Testing! 🧪**
