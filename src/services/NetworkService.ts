/**
 * NetworkService - Network state management and offline queue
 * 
 * Monitors network connectivity and manages request queuing for offline scenarios.
 * 
 * Features:
 * - Real-time network state monitoring
 * - Offline request queuing
 * - Automatic retry when back online
 * - Connection change notifications
 * - Network type detection (WiFi, Cellular, etc.)
 */

import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ConnectionChangeListener = (isOnline: boolean, connectionType: NetInfoStateType) => void;
type QueuedRequest = () => Promise<any>;

interface QueuedRequestEntry {
  id: string;
  request: QueuedRequest;
  timestamp: number;
  retryCount: number;
}

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: NetInfoStateType;
  details: any;
}

class NetworkServiceClass {
  private isOnline: boolean = true;
  private connectionType: NetInfoStateType = NetInfoStateType.unknown;
  private listeners: Set<ConnectionChangeListener> = new Set();
  private queue: QueuedRequestEntry[] = [];
  private isProcessingQueue: boolean = false;
  private readonly QUEUE_STORAGE_KEY = 'network_queue';
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 2000;
  private unsubscribe: (() => void) | null = null;

  /**
   * Initialize network monitoring
   * Call this once when the app starts
   */
  async init(): Promise<void> {
    try {
      // Get initial network state
      const state = await NetInfo.fetch();
      this.updateNetworkState(state);

      // Subscribe to network state changes
      this.unsubscribe = NetInfo.addEventListener(state => {
        this.updateNetworkState(state);
      });

      // Load queued requests from storage
      await this.loadQueue();

      console.log('✅ [NetworkService] Initialized', {
        isOnline: this.isOnline,
        type: this.connectionType,
      });
    } catch (error) {
      console.error('❌ [NetworkService] Initialization error:', error);
    }
  }

  /**
   * Clean up network monitoring
   * Call this when the app is closing
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners.clear();
  }

  /**
   * Check if device is currently online
   */
  isConnected(): boolean {
    return this.isOnline;
  }

  /**
   * Get current connection type
   */
  getConnectionType(): NetInfoStateType {
    return this.connectionType;
  }

  /**
   * Get detailed network state
   */
  async getNetworkState(): Promise<NetworkState> {
    const state = await NetInfo.fetch();
    return {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? false,
      type: state.type,
      details: state.details,
    };
  }

  /**
   * Register a listener for connection changes
   * Returns an unsubscribe function
   */
  onConnectionChange(callback: ConnectionChangeListener): () => void {
    this.listeners.add(callback);
    
    // Immediately call with current state
    callback(this.isOnline, this.connectionType);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Add a request to the queue
   * If online, executes immediately
   * If offline, queues for later execution
   */
  async queueRequest<T>(request: QueuedRequest, immediate: boolean = true): Promise<T | null> {
    if (this.isOnline && immediate) {
      // Online - execute immediately
      try {
        return await request();
      } catch (error) {
        // If it's a network error, queue it
        if (this.isNetworkError(error)) {
          console.log('⚠️ [NetworkService] Network error, queueing request');
          await this.addToQueue(request);
          return null;
        }
        // Other errors - rethrow
        throw error;
      }
    } else {
      // Offline - add to queue
      await this.addToQueue(request);
      return null;
    }
  }

  /**
   * Get number of queued requests
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Clear all queued requests
   */
  async clearQueue(): Promise<void> {
    this.queue = [];
    await AsyncStorage.removeItem(this.QUEUE_STORAGE_KEY);
    console.log('🗑️ [NetworkService] Queue cleared');
  }

  /**
   * Manually trigger queue processing
   * Useful for testing or forcing a sync
   */
  async processQueue(): Promise<void> {
    if (!this.isOnline) {
      console.log('⚠️ [NetworkService] Cannot process queue - offline');
      return;
    }

    if (this.isProcessingQueue) {
      console.log('⚠️ [NetworkService] Queue already being processed');
      return;
    }

    await this.processQueueInternal();
  }

  /**
   * Update network state and notify listeners
   */
  private updateNetworkState(state: NetInfoState): void {
    const wasOnline = this.isOnline;
    const previousType = this.connectionType;

    // Update state
    this.isOnline = (state.isConnected ?? false) && (state.isInternetReachable ?? false);
    this.connectionType = state.type;

    // Log state change
    if (wasOnline !== this.isOnline || previousType !== this.connectionType) {
      console.log(`📡 [NetworkService] Connection changed:`, {
        online: this.isOnline,
        type: this.connectionType,
        wasOnline,
        previousType,
      });

      // Notify listeners
      this.notifyListeners();

      // If we just came online, process the queue
      if (!wasOnline && this.isOnline) {
        console.log('✅ [NetworkService] Back online - processing queue');
        this.processQueueInternal();
      }
    }
  }

  /**
   * Notify all listeners of connection change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.isOnline, this.connectionType);
      } catch (error) {
        console.error('❌ [NetworkService] Error in listener:', error);
      }
    });
  }

  /**
   * Add request to queue
   */
  private async addToQueue(request: QueuedRequest): Promise<void> {
    const entry: QueuedRequestEntry = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      request,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(entry);
    await this.saveQueue();
    
    console.log(`📥 [NetworkService] Request queued (${this.queue.length} in queue)`);
  }

  /**
   * Process queued requests
   */
  private async processQueueInternal(): Promise<void> {
    if (!this.isOnline || this.isProcessingQueue || this.queue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    console.log(`🔄 [NetworkService] Processing queue (${this.queue.length} requests)`);

    let processed = 0;
    let failed = 0;

    while (this.queue.length > 0 && this.isOnline) {
      const entry = this.queue[0];

      try {
        // Execute the request
        await entry.request();
        
        // Success - remove from queue
        this.queue.shift();
        processed++;
        
        console.log(`✅ [NetworkService] Request processed (${this.queue.length} remaining)`);
      } catch (error) {
        console.error(`❌ [NetworkService] Request failed:`, error);
        
        // Check if it's a network error
        if (this.isNetworkError(error)) {
          // Network error - stop processing
          console.log('⚠️ [NetworkService] Network error - stopping queue processing');
          break;
        }

        // Other error - retry or remove
        entry.retryCount++;
        
        if (entry.retryCount >= this.MAX_RETRY_ATTEMPTS) {
          // Max retries reached - remove from queue
          this.queue.shift();
          failed++;
          console.log(`❌ [NetworkService] Request failed after ${this.MAX_RETRY_ATTEMPTS} attempts`);
        } else {
          // Retry later
          this.queue.shift();
          this.queue.push(entry);
          console.log(`⚠️ [NetworkService] Request will retry (attempt ${entry.retryCount}/${this.MAX_RETRY_ATTEMPTS})`);
          
          // Wait before next retry
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS));
        }
      }
    }

    this.isProcessingQueue = false;
    await this.saveQueue();

    console.log(`✅ [NetworkService] Queue processing complete:`, {
      processed,
      failed,
      remaining: this.queue.length,
    });
  }

  /**
   * Check if error is a network error
   */
  private isNetworkError(error: any): boolean {
    if (!error) return false;
    
    const message = error.message?.toLowerCase() || '';
    const name = error.name?.toLowerCase() || '';
    
    return (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      name.includes('network') ||
      name.includes('fetch')
    );
  }

  /**
   * Save queue to AsyncStorage
   */
  private async saveQueue(): Promise<void> {
    try {
      // We can't serialize functions, so we only save metadata
      const queueMetadata = this.queue.map(entry => ({
        id: entry.id,
        timestamp: entry.timestamp,
        retryCount: entry.retryCount,
      }));
      
      await AsyncStorage.setItem(this.QUEUE_STORAGE_KEY, JSON.stringify(queueMetadata));
    } catch (error) {
      console.error('❌ [NetworkService] Error saving queue:', error);
    }
  }

  /**
   * Load queue from AsyncStorage
   * Note: We can't restore the actual request functions, only metadata
   */
  private async loadQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.QUEUE_STORAGE_KEY);
      if (stored) {
        const queueMetadata = JSON.parse(stored);
        console.log(`📦 [NetworkService] Found ${queueMetadata.length} queued requests (metadata only)`);
        
        // Clear the stored queue since we can't restore the functions
        await AsyncStorage.removeItem(this.QUEUE_STORAGE_KEY);
      }
    } catch (error) {
      console.error('❌ [NetworkService] Error loading queue:', error);
    }
  }
}

// Export singleton instance
export const NetworkService = new NetworkServiceClass();
export default NetworkService;
