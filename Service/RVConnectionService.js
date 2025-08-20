// Service/RVConnectionService.js - Complete RV discovery and connection management
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventEmitter } from 'events';
import NetInfo from '@react-native-community/netinfo';

class RVConnectionService extends EventEmitter {
  constructor() {
    super();
    this.currentRV = null;
    this.connectionState = 'disconnected'; // 'disconnected', 'discovering', 'connecting', 'connected', 'error'
    this.permissionLevel = null;
    this.sessionToken = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.heartbeatInterval = null;
    this.discoveryTimeout = null;
    
    // Network monitoring
    this.networkUnsubscribe = null;
    this.isNetworkConnected = true;
    
    // Cached RV info for offline mode
    this.cachedRVInfo = null;
    
    this.setupNetworkMonitoring();
  }

  /**
   * Setup network connectivity monitoring
   */
  setupNetworkMonitoring() {
    this.networkUnsubscribe = NetInfo.addEventListener(state => {
      const wasConnected = this.isNetworkConnected;
      this.isNetworkConnected = state.isConnected && state.isInternetReachable;
      
      if (!wasConnected && this.isNetworkConnected) {
        // Network came back online
        console.log('Network reconnected, attempting to reconnect to RV');
        this.attemptReconnection();
      } else if (wasConnected && !this.isNetworkConnected) {
        // Network lost
        console.log('Network lost, entering offline mode');
        this.handleNetworkLoss();
      }
    });
  }

  /**
   * Initialize the service and attempt auto-reconnection
   */
  async initialize() {
  try {
    // Load cached RV info and credentials
    await this.loadCachedConnection();
    
    // FOR TESTING: Always show connection screen
    const FORCE_CONNECTION_SCREEN = true; // Set to false for production
    
    if (this.currentRV && !FORCE_CONNECTION_SCREEN) {
      console.log('Found cached RV connection, attempting to reconnect...');
      await this.attemptReconnection();
    } else {
      console.log('Showing connection screen (forced or no cached connection)');
      // Don't auto-connect, let user choose
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing connection service:', error);
    return false;
  }
}

  /**
   * Discover RVs on the network using mDNS/Bonjour
   */
  async discoverRVs(timeout = 10000) {
    this.setConnectionState('discovering');
    
    try {
      // Clear any existing discovery timeout
      if (this.discoveryTimeout) {
        clearTimeout(this.discoveryTimeout);
      }

      console.log('Starting RV discovery...');
      
      const discoveredRVs = await Promise.race([
        this.performNetworkDiscovery(),
        new Promise((_, reject) => {
          this.discoveryTimeout = setTimeout(() => {
            reject(new Error('Discovery timeout'));
          }, timeout);
        })
      ]);

      console.log(`Discovered ${discoveredRVs.length} RVs`);
      this.emit('rvsDiscovered', discoveredRVs);
      
      return discoveredRVs;
    } catch (error) {
      console.error('RV discovery failed:', error);
      this.setConnectionState('error');
      this.emit('discoveryError', error);
      return [];
    } finally {
      if (this.discoveryTimeout) {
        clearTimeout(this.discoveryTimeout);
        this.discoveryTimeout = null;
      }
    }
  }

  async clearConnectionCache() {
  await AsyncStorage.removeItem('cached_rv_connection');
  await AsyncStorage.removeItem('device_id');
  // Clear any stored credentials
  const keys = await AsyncStorage.getAllKeys();
  const credentialKeys = keys.filter(key => key.startsWith('rv_credentials_'));
  await AsyncStorage.multiRemove(credentialKeys);
  
  console.log('Connection cache cleared');
}

  /**
   * Perform actual network discovery
   */
  async performNetworkDiscovery() {
    const discoveredRVs = [];
    
    try {
      // Method 1: Try mDNS discovery (if available)
      try {
        const mdnsRVs = await this.discoverViaMDNS();
        discoveredRVs.push(...mdnsRVs);
      } catch (mdnsError) {
        console.warn('mDNS discovery failed:', mdnsError.message);
      }

      // Method 2: Network scanning fallback
      if (discoveredRVs.length === 0) {
        console.log('No RVs found via mDNS, trying network scan...');
        const scannedRVs = await this.discoverViaNetworkScan();
        discoveredRVs.push(...scannedRVs);
      }

      // Remove duplicates based on RV ID
      const uniqueRVs = discoveredRVs.filter((rv, index, self) => 
        index === self.findIndex(r => r.id === rv.id)
      );

      return uniqueRVs;
    } catch (error) {
      console.error('Network discovery error:', error);
      return [];
    }
  }

  /**
   * Discover RVs using mDNS/Bonjour
   */
  async discoverViaMDNS() {
    // This would use a React Native mDNS library like react-native-zeroconf
    // For now, we'll simulate the discovery
    
    return new Promise((resolve) => {
      // Simulated mDNS discovery
      setTimeout(() => {
        // In real implementation, this would scan for _rv-control._tcp services
        resolve([]);
      }, 2000);
    });
  }

  /**
   * Discover RVs by scanning common IP ranges
   */
  async discoverViaNetworkScan() {
    const rvs = [];
    
    try {
      // Get current network info to determine scan range
      const networkState = await NetInfo.fetch();
      
      if (!networkState.details || !networkState.details.ipAddress) {
        throw new Error('Cannot determine network range');
      }

      const baseIP = this.getNetworkBase(networkState.details.ipAddress);
      const scanPromises = [];
      
      // Scan common RV control ports on the network
      for (let i = 1; i < 255; i++) {
        const ip = `${baseIP}.${i}`;
        scanPromises.push(this.testRVEndpoint(ip));
      }

      const results = await Promise.allSettled(scanPromises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          rvs.push(result.value);
        }
      });

      return rvs;
    } catch (error) {
      console.error('Network scan error:', error);
      return [];
    }
  }

  /**
   * Test if an IP address has an RV control service
   */
  async testRVEndpoint(ip, port = 3000) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`http://${ip}:${port}/api/discovery/info`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const rvInfo = await response.json();
        return {
          id: rvInfo.id,
          name: rvInfo.name || `RV at ${ip}`,
          ip: ip,
          port: port,
          model: rvInfo.model,
          version: rvInfo.version,
          features: rvInfo.features || [],
          signalStrength: 'excellent', // Since it's on local network
          lastSeen: new Date().toISOString()
        };
      }
    } catch (error) {
      // Ignore individual failures during scanning
    }
    
    return null;
  }

  /**
   * Get network base (first three octets) from IP address
   */
  getNetworkBase(ipAddress) {
    const parts = ipAddress.split('.');
    return `${parts[0]}.${parts[1]}.${parts[2]}`;
  }

  /**
   * Connect to a specific RV
   */
  async connectToRV(rvInfo, credentials = null) {
    this.setConnectionState('connecting');
    
    try {
      console.log(`Connecting to RV: ${rvInfo.name} (${rvInfo.ip})`);
      
      // Store RV info
      this.currentRV = rvInfo;
      
      // Attempt authentication
      const authResult = await this.authenticateWithRV(rvInfo, credentials);
      
      if (authResult.success) {
        this.sessionToken = authResult.token;
        this.permissionLevel = authResult.permissions;
        
        // Cache the connection info
        await this.cacheConnectionInfo();
        
        // Start heartbeat monitoring
        this.startHeartbeat();
        
        this.setConnectionState('connected');
        this.reconnectAttempts = 0;
        
        console.log(`Successfully connected to ${rvInfo.name}`);
        this.emit('connected', {
          rv: this.currentRV,
          permissions: this.permissionLevel,
          token: this.sessionToken
        });
        
        return { success: true };
      } else {
        throw new Error(authResult.error || 'Authentication failed');
      }
    } catch (error) {
      console.error('Connection failed:', error);
      this.setConnectionState('error');
      this.emit('connectionError', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Authenticate with the RV
   */
  async authenticateWithRV(rvInfo, credentials) {
    try {
      const authPayload = {
        deviceInfo: await this.getDeviceInfo(),
        credentials: credentials || await this.getStoredCredentials(rvInfo.id),
        requestedPermissions: ['lights', 'climate', 'water', 'fans'] // Request basic permissions
      };

      const response = await fetch(`http://${rvInfo.ip}:${rvInfo.port}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(authPayload)
      });

      if (response.ok) {
        const result = await response.json();
        
        // Store credentials for future use
        if (result.success && result.token) {
          await this.storeCredentials(rvInfo.id, {
            token: result.token,
            deviceId: result.deviceId,
            permissions: result.permissions
          });
        }
        
        return result;
      } else {
        const errorData = await response.json().catch(() => ({}));
        return { 
          success: false, 
          error: errorData.message || `HTTP ${response.status}` 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Get device information for authentication
   */
  async getDeviceInfo() {
    // This would collect device-specific info for fingerprinting
    return {
      type: 'mobile', // or 'tablet'
      platform: 'react-native',
      appVersion: '1.0.0',
      deviceId: await this.getDeviceId(),
      name: await this.getDeviceName()
    };
  }

  /**
   * Get or generate a unique device ID
   */
  async getDeviceId() {
    try {
      let deviceId = await AsyncStorage.getItem('device_id');
      
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('device_id', deviceId);
      }
      
      return deviceId;
    } catch (error) {
      console.error('Error getting device ID:', error);
      return `temp_${Date.now()}`;
    }
  }

  /**
   * Get device name (can be customized by user)
   */
  async getDeviceName() {
    try {
      const customName = await AsyncStorage.getItem('device_name');
      if (customName) return customName;
      
      // Generate default name
      const deviceId = await this.getDeviceId();
      return `Mobile Device ${deviceId.substr(-4)}`;
    } catch (error) {
      return 'Mobile Device';
    }
  }

  /**
   * Start heartbeat monitoring to maintain connection
   */
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(async () => {
      try {
        const isHealthy = await this.checkConnectionHealth();
        
        if (!isHealthy) {
          console.log('Heartbeat failed, attempting reconnection...');
          await this.attemptReconnection();
        }
      } catch (error) {
        console.error('Heartbeat error:', error);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check if connection to RV is healthy
   */
  async checkConnectionHealth() {
    if (!this.currentRV || !this.sessionToken) {
      return false;
    }

    try {
      const response = await fetch(
        `http://${this.currentRV.ip}:${this.currentRV.port}/api/connection/status`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.sessionToken}`,
            'Accept': 'application/json'
          },
          timeout: 5000
        }
      );

      return response.ok;
    } catch (error) {
      console.warn('Connection health check failed:', error.message);
      return false;
    }
  }

  /**
   * Attempt to reconnect to the last known RV
   */
  async attemptReconnection() {
    if (!this.currentRV || this.connectionState === 'connecting') {
      return false;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Maximum reconnection attempts reached');
      this.setConnectionState('error');
      this.emit('maxReconnectAttemptsReached');
      return false;
    }

    this.reconnectAttempts++;
    console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    try {
      const result = await this.connectToRV(this.currentRV);
      
      if (result.success) {
        console.log('Reconnection successful');
        return true;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error(`Reconnection attempt ${this.reconnectAttempts} failed:`, error);
      
      // Exponential backoff
      const delay = Math.min(30000, 2000 * Math.pow(2, this.reconnectAttempts - 1));
      setTimeout(() => {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnection();
        }
      }, delay);
      
      return false;
    }
  }

  /**
   * Handle network loss
   */
  handleNetworkLoss() {
    if (this.connectionState === 'connected') {
      this.setConnectionState('disconnected');
      this.emit('networkLost');
    }
  }

  /**
   * Disconnect from the current RV
   */
  async disconnect() {
    console.log('Disconnecting from RV...');
    
    // Clear heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Clear discovery timeout
    if (this.discoveryTimeout) {
      clearTimeout(this.discoveryTimeout);
      this.discoveryTimeout = null;
    }

    // Notify server about disconnection
    if (this.currentRV && this.sessionToken) {
      try {
        await fetch(
          `http://${this.currentRV.ip}:${this.currentRV.port}/api/auth/logout`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
      } catch (error) {
        console.warn('Error notifying server about logout:', error.message);
      }
    }

    // Reset state
    this.currentRV = null;
    this.sessionToken = null;
    this.permissionLevel = null;
    this.reconnectAttempts = 0;
    
    this.setConnectionState('disconnected');
    this.emit('disconnected');
  }

  /**
   * Set connection state and emit event
   */
  setConnectionState(newState) {
    if (this.connectionState !== newState) {
      const previousState = this.connectionState;
      this.connectionState = newState;
      
      console.log(`Connection state changed: ${previousState} -> ${newState}`);
      this.emit('stateChanged', { 
        previous: previousState, 
        current: newState 
      });
    }
  }

  /**
   * Cache connection information for auto-reconnect
   */
  async cacheConnectionInfo() {
    try {
      const connectionInfo = {
        rv: this.currentRV,
        lastConnected: new Date().toISOString()
      };
      
      await AsyncStorage.setItem(
        'cached_rv_connection', 
        JSON.stringify(connectionInfo)
      );
      
      this.cachedRVInfo = connectionInfo;
    } catch (error) {
      console.error('Error caching connection info:', error);
    }
  }

  /**
   * Load cached connection information
   */
  async loadCachedConnection() {
    try {
      const cached = await AsyncStorage.getItem('cached_rv_connection');
      
      if (cached) {
        this.cachedRVInfo = JSON.parse(cached);
        this.currentRV = this.cachedRVInfo.rv;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error loading cached connection:', error);
      return false;
    }
  }

  /**
   * Store authentication credentials
   */
  async storeCredentials(rvId, credentials) {
    try {
      await AsyncStorage.setItem(
        `rv_credentials_${rvId}`, 
        JSON.stringify({
          ...credentials,
          storedAt: new Date().toISOString()
        })
      );
    } catch (error) {
      console.error('Error storing credentials:', error);
    }
  }

  /**
   * Get stored authentication credentials
   */
  async getStoredCredentials(rvId) {
    try {
      const stored = await AsyncStorage.getItem(`rv_credentials_${rvId}`);
      
      if (stored) {
        const credentials = JSON.parse(stored);
        
        // Check if credentials are not too old (30 days)
        const storedAt = new Date(credentials.storedAt);
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        if (storedAt > thirtyDaysAgo) {
          return credentials;
        } else {
          // Remove old credentials
          await AsyncStorage.removeItem(`rv_credentials_${rvId}`);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting stored credentials:', error);
      return null;
    }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus() {
    return {
      state: this.connectionState,
      rv: this.currentRV,
      permissions: this.permissionLevel,
      isConnected: this.connectionState === 'connected',
      hasToken: !!this.sessionToken,
      networkConnected: this.isNetworkConnected,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * Check if user has permission for a specific action
   */
  hasPermission(action) {
    if (!this.permissionLevel) return false;
    
    if (this.permissionLevel === 'owner') return true;
    if (this.permissionLevel === 'family') {
      return ['lights', 'climate', 'water', 'fans'].includes(action);
    }
    if (this.permissionLevel === 'guest') {
      return ['lights'].includes(action);
    }
    
    return false;
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.discoveryTimeout) {
      clearTimeout(this.discoveryTimeout);
      this.discoveryTimeout = null;
    }

    this.removeAllListeners();
  }
}

// Create and export singleton instance
const rvConnectionService = new RVConnectionService();
export default rvConnectionService;