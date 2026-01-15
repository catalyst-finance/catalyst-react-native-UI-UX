/**
 * Integration Tests for Services
 * 
 * Tests all services working together to ensure proper integration.
 * Run these tests before deploying to production.
 */

import { DataService } from '../../services/DataService';
import { NetworkService } from '../../services/NetworkService';
import { BackgroundFetchService } from '../../services/BackgroundFetchService';

/**
 * Test Suite: Service Integration
 */
export const runIntegrationTests = async () => {
  console.log('🧪 Starting Integration Tests...\n');

  let passedTests = 0;
  let failedTests = 0;

  // Test 1: DataService - Cache Operations
  try {
    console.log('Test 1: DataService - Cache Operations');
    
    // Set cache
    await DataService.setCachedData('test_key', { value: 123 }, 5 * 60 * 1000);
    
    // Get cache
    const cached = await DataService.getCachedData<{ value: number }>('test_key');
    
    if (cached && cached.value === 123) {
      console.log('✅ Test 1 PASSED: Cache set and retrieved successfully\n');
      passedTests++;
    } else {
      console.log('❌ Test 1 FAILED: Cache value mismatch\n');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ Test 1 FAILED:', error, '\n');
    failedTests++;
  }

  // Test 2: DataService - Cache Expiration
  try {
    console.log('Test 2: DataService - Cache Expiration');
    
    // Set cache with 1ms TTL
    await DataService.setCachedData('expire_test', { value: 456 }, 1);
    
    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Try to get expired cache
    const expired = await DataService.getCachedData('expire_test');
    
    if (expired === null) {
      console.log('✅ Test 2 PASSED: Cache expired correctly\n');
      passedTests++;
    } else {
      console.log('❌ Test 2 FAILED: Cache should have expired\n');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ Test 2 FAILED:', error, '\n');
    failedTests++;
  }

  // Test 3: DataService - Cache Invalidation
  try {
    console.log('Test 3: DataService - Cache Invalidation');
    
    // Set cache
    await DataService.setCachedData('invalidate_test', { value: 789 }, 5 * 60 * 1000);
    
    // Invalidate
    await DataService.invalidateCache('invalidate_test');
    
    // Try to get invalidated cache
    const invalidated = await DataService.getCachedData('invalidate_test');
    
    if (invalidated === null) {
      console.log('✅ Test 3 PASSED: Cache invalidated correctly\n');
      passedTests++;
    } else {
      console.log('❌ Test 3 FAILED: Cache should have been invalidated\n');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ Test 3 FAILED:', error, '\n');
    failedTests++;
  }

  // Test 4: DataService - Pattern Invalidation
  try {
    console.log('Test 4: DataService - Pattern Invalidation');
    
    // Set multiple caches with pattern
    await DataService.setCachedData('stock_AAPL', { price: 150 }, 5 * 60 * 1000);
    await DataService.setCachedData('stock_GOOGL', { price: 2800 }, 5 * 60 * 1000);
    await DataService.setCachedData('other_data', { value: 123 }, 5 * 60 * 1000);
    
    // Invalidate by pattern
    const count = await DataService.invalidateCachePattern('stock_');
    
    // Check if stock caches are gone
    const aapl = await DataService.getCachedData('stock_AAPL');
    const googl = await DataService.getCachedData('stock_GOOGL');
    const other = await DataService.getCachedData('other_data');
    
    if (aapl === null && googl === null && other !== null && count >= 2) {
      console.log('✅ Test 4 PASSED: Pattern invalidation worked correctly\n');
      passedTests++;
    } else {
      console.log('❌ Test 4 FAILED: Pattern invalidation did not work as expected\n');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ Test 4 FAILED:', error, '\n');
    failedTests++;
  }

  // Test 5: DataService - Cache Statistics
  try {
    console.log('Test 5: DataService - Cache Statistics');
    
    const stats = await DataService.getCacheStats();
    
    if (stats && typeof stats.totalKeys === 'number' && typeof stats.totalSize === 'number') {
      console.log('✅ Test 5 PASSED: Cache statistics retrieved\n');
      console.log('   Stats:', stats, '\n');
      passedTests++;
    } else {
      console.log('❌ Test 5 FAILED: Invalid cache statistics\n');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ Test 5 FAILED:', error, '\n');
    failedTests++;
  }

  // Test 6: NetworkService - Connection Status
  try {
    console.log('Test 6: NetworkService - Connection Status');
    
    const isConnected = NetworkService.isConnected();
    const connectionType = NetworkService.getConnectionType();
    
    if (typeof isConnected === 'boolean' && connectionType) {
      console.log('✅ Test 6 PASSED: Network status retrieved\n');
      console.log('   Connected:', isConnected, 'Type:', connectionType, '\n');
      passedTests++;
    } else {
      console.log('❌ Test 6 FAILED: Invalid network status\n');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ Test 6 FAILED:', error, '\n');
    failedTests++;
  }

  // Test 7: NetworkService - Connection Listener
  try {
    console.log('Test 7: NetworkService - Connection Listener');
    
    let listenerCalled = false;
    
    const unsubscribe = NetworkService.onConnectionChange((isOnline, type) => {
      listenerCalled = true;
      console.log('   Listener called:', isOnline, type);
    });
    
    // Wait a bit for listener to be called with initial state
    await new Promise(resolve => setTimeout(resolve, 100));
    
    unsubscribe();
    
    if (listenerCalled) {
      console.log('✅ Test 7 PASSED: Connection listener works\n');
      passedTests++;
    } else {
      console.log('❌ Test 7 FAILED: Connection listener not called\n');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ Test 7 FAILED:', error, '\n');
    failedTests++;
  }

  // Test 8: BackgroundFetchService - Status
  try {
    console.log('Test 8: BackgroundFetchService - Status');
    
    const status = await BackgroundFetchService.getStatus();
    
    if (status && typeof status.isRegistered === 'boolean') {
      console.log('✅ Test 8 PASSED: Background fetch status retrieved\n');
      console.log('   Status:', status, '\n');
      passedTests++;
    } else {
      console.log('❌ Test 8 FAILED: Invalid background fetch status\n');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ Test 8 FAILED:', error, '\n');
    failedTests++;
  }

  // Test 9: Integration - Cache + Network
  try {
    console.log('Test 9: Integration - Cache + Network');
    
    // Set cache
    await DataService.setCachedData('integration_test', { value: 999 }, 5 * 60 * 1000);
    
    // Check network
    const isOnline = NetworkService.isConnected();
    
    // Get cache
    const cached = await DataService.getCachedData<{ value: number }>('integration_test');
    
    if (cached && cached.value === 999 && typeof isOnline === 'boolean') {
      console.log('✅ Test 9 PASSED: Cache and Network integration works\n');
      passedTests++;
    } else {
      console.log('❌ Test 9 FAILED: Integration test failed\n');
      failedTests++;
    }
  } catch (error) {
    console.log('❌ Test 9 FAILED:', error, '\n');
    failedTests++;
  }

  // Test 10: Cleanup
  try {
    console.log('Test 10: Cleanup - Clear Test Data');
    
    await DataService.invalidateCache('test_key');
    await DataService.invalidateCache('other_data');
    await DataService.invalidateCache('integration_test');
    
    console.log('✅ Test 10 PASSED: Cleanup successful\n');
    passedTests++;
  } catch (error) {
    console.log('❌ Test 10 FAILED:', error, '\n');
    failedTests++;
  }

  // Summary
  console.log('═══════════════════════════════════════');
  console.log('📊 Test Results Summary');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
  console.log('═══════════════════════════════════════\n');

  return {
    passed: passedTests,
    failed: failedTests,
    total: passedTests + failedTests,
    successRate: (passedTests / (passedTests + failedTests)) * 100,
  };
};

/**
 * Run tests automatically (for development)
 */
export const autoRunTests = async () => {
  console.log('⏳ Waiting 2 seconds for services to initialize...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const results = await runIntegrationTests();
  
  if (results.failed === 0) {
    console.log('🎉 All tests passed! Services are working correctly.\n');
  } else {
    console.log('⚠️ Some tests failed. Please review the errors above.\n');
  }
  
  return results;
};
