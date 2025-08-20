// RVStateManager.js - Central state management system for RV controls (Fixed Version)

import { createCANBusListener } from '../../Service/CANBusListener';
import { RVControlService } from '../rvAPI';

// For React Native environments
let AsyncStorage, NetInfo;

// Check if we're in React Native environment
const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

if (isReactNative) {
  try {
    AsyncStorage = require('@react-native-async-storage/async-storage').default;
    NetInfo = require('@react-native-community/netinfo').default;
    console.log('Using React Native AsyncStorage and NetInfo');
  } catch (error) {
    console.warn('React Native storage modules not available, using memory fallback');
    // Use in-memory storage as fallback
    const memoryStorage = {};
    AsyncStorage = {
      getItem: (key) => Promise.resolve(memoryStorage[key] || null),
      setItem: (key, value) => Promise.resolve(memoryStorage[key] = value),
      removeItem: (key) => Promise.resolve(delete memoryStorage[key])
    };
    
    NetInfo = {
      addEventListener: () => () => {}, // Return unsubscribe function
      fetch: () => Promise.resolve({ isConnected: true, isInternetReachable: true })
    };
  }
} else {
  // Web environment fallback
  console.log('Using web environment storage fallback');
  
  // Check if localStorage is available
  const hasLocalStorage = typeof Storage !== 'undefined' && typeof localStorage !== 'undefined';
  
  if (hasLocalStorage) {
    AsyncStorage = {
      getItem: (key) => Promise.resolve(localStorage.getItem(key)),
      setItem: (key, value) => Promise.resolve(localStorage.setItem(key, value)),
      removeItem: (key) => Promise.resolve(localStorage.removeItem(key))
    };
  } else {
    // Use in-memory storage as final fallback
    const memoryStorage = {};
    AsyncStorage = {
      getItem: (key) => Promise.resolve(memoryStorage[key] || null),
      setItem: (key, value) => Promise.resolve(memoryStorage[key] = value),
      removeItem: (key) => Promise.resolve(delete memoryStorage[key])
    };
  }
  
  // Mock NetInfo for web
  NetInfo = {
    addEventListener: () => () => {}, // Return unsubscribe function
    fetch: () => Promise.resolve({ isConnected: true, isInternetReachable: true })
  };
}

// Simple EventEmitter implementation for environments that don't have it
class EventEmitter {
  constructor() {
    this.events = {};
  }
  
  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }
  
  off(event, listener) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(l => l !== listener);
  }
  
  emit(event, ...args) {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => listener(...args));
  }
  
  removeAllListeners() {
    this.events = {};
  }
}

class RVStateManager {
  constructor() {
    // Core state storage
    this.state = {
      lights: {},        // All light states
      climate: {},       // Climate control states 
      water: {},         // Water system states
      power: {},         // Power management states
      fans: {},          // Fan control states
      awning: {},        // Awning position and state
      lastUpdate: null,  // Timestamp of last update
      deviceId: null,    // Unique ID for this device
      isOnline: false,   // Network connectivity status
    };
    
    // Event emitter for state change notifications
    this.events = new EventEmitter();
    
    // CAN bus listener instance
    this.canBusListener = null;
    
    // WebSocket for multi-device synchronization
    this.syncSocket = null;
    
    // Queue for changes made while offline
    this.offlineQueue = [];
    
    // Flag to prevent duplicate state updates
    this.updatingState = false;
    
    // Initialize with stored state
    this.init();
  }
  
  // Initialize the state manager
  async init() {
    try {
      console.log('Initializing RV State Manager...');
      
      // Load cached state from storage
      try {
        const storedState = await AsyncStorage.getItem('rvState');
        if (storedState) {
          this.state = { ...this.state, ...JSON.parse(storedState) };
          console.log('Loaded cached RV state from storage');
        }
      } catch (storageError) {
        console.warn('Failed to load cached state, using defaults:', storageError.message);
      }
      
      // Generate or retrieve device ID
      try {
        const deviceId = await AsyncStorage.getItem('deviceId');
        if (deviceId) {
          this.state.deviceId = deviceId;
        } else {
          this.state.deviceId = `rv-device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          await AsyncStorage.setItem('deviceId', this.state.deviceId);
        }
      } catch (deviceIdError) {
        console.warn('Failed to handle device ID, generating temporary one:', deviceIdError.message);
        this.state.deviceId = `rv-device-temp-${Date.now()}`;
      }
      
      // Set up CAN bus listener for real-time updates
      this.setupCANBusListener();
      
      // Set up WebSocket for multi-device sync
      this.setupSyncSocket();
      
      // Set up network connectivity listener
      this.setupConnectivityListener();
      
      console.log('RV State Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize RV State Manager:', error);
      // Set a fallback device ID if everything fails
      this.state.deviceId = `rv-device-fallback-${Date.now()}`;
    }
  }
  
  // Set up the CAN bus listener to capture state changes
  setupCANBusListener() {
    try {
      this.canBusListener = createCANBusListener();
      
      // Listen for light status changes (DC_DIMMER_STATUS_3)
      this.canBusListener.on('message', (message) => {
        // Only process if we're not already updating state
        if (this.updatingState) return;
        
        try {
          // Check if the message is a status update
          if (message.dgn === '1FEDA' && message.lightId) {
            // This is a DC_DIMMER_STATUS_3 message (light status)
            const lightId = message.lightId;
            const brightness = message.brightness || 0;
            const isOn = message.isOn || false;
            
            this.updateLightState(lightId, isOn, brightness);
          } 
          // Handle climate control messages
          else if (message.dgn === '19FEF9' && message.type === 'climate') {
            this.processClimateStatusMessage(message);
          }
          // Handle water system messages
          else if (message.dgn === '1FEDB' && message.type === 'water') {
            this.processWaterStatusMessage(message);
          }
        } catch (error) {
          console.error('Error processing CAN message:', error);
        }
      });
      
      // Handle connection events
      this.canBusListener.on('connected', () => {
        console.log('CAN bus listener connected');
      });
      
      this.canBusListener.on('disconnected', () => {
        console.log('CAN bus listener disconnected');
      });
      
      this.canBusListener.on('error', (error) => {
        console.error('CAN bus listener error:', error);
      });
      
      // Start listening
      this.canBusListener.start();
    } catch (error) {
      console.error('Failed to setup CAN bus listener:', error);
    }
  }
  
  // Process climate control messages from the CAN bus
  processClimateStatusMessage(message) {
    try {
      // Extract relevant data from climate control messages
      // This would need to be customized based on your specific climate control message format
      const newClimateState = {
        lastUpdate: new Date().toISOString(),
        rawMessage: message.rawData
      };
      
      // Update the climate state
      this.updateState('climate', newClimateState);
    } catch (error) {
      console.error('Error processing climate status message:', error);
    }
  }

  /**
   * Handle command execution messages
   */
  handleCommandExecuted(message) {
    try {
      console.log('RVStateManager: Command executed remotely:', message.command);
      
      // You could update state based on known command effects here
      // For example, if a light toggle command was executed:
      // if (message.command.includes('lights_toggle')) {
      //   // Update light state accordingly
      // }
      
      // Emit event for listeners
      this.events.emit('commandExecuted', {
        command: message.command,
        timestamp: message.timestamp,
        remote: true
      });
    } catch (error) {
      console.error('RVStateManager: Error handling command executed message:', error);
    }
  }
  
  // Process water system messages from the CAN bus
  processWaterStatusMessage(message) {
    try {
      const waterUpdate = {};
      
      if (message.device === 'water_pump') {
        waterUpdate.pumpOn = message.isOn;
      } else if (message.device === 'water_heater') {
        waterUpdate.heaterOn = message.isOn;
      }
      
      waterUpdate.lastUpdate = new Date().toISOString();
      
      // Update the water state
      this.updateState('water', waterUpdate);
    } catch (error) {
      console.error('Error processing water status message:', error);
    }
  }

  /**
   * Process light status updates from CAN bus
   */
  processLightStatusFromCAN(data) {
    try {
      const instanceHex = data[0];
      const brightnessHex = data[2];
      const statusHex = data[3];
      
      // Convert hex to decimal
      const instance = parseInt(instanceHex, 16);
      const brightness = parseInt(brightnessHex, 16);
      const isDimmerUpdate = statusHex && statusHex.toString().toUpperCase() === 'FC';
      
      if (isDimmerUpdate) {
        const lightId = this.mapInstanceToLightId(instance);
        if (lightId) {
          // Convert brightness to percentage (0-200 hex -> 0-100%)
          const percentage = Math.round((brightness / 200) * 100);
          const isOn = percentage > 0;
          
          console.log(`RVStateManager: Light update from CAN - ${lightId}: ${percentage}% (${isOn ? 'ON' : 'OFF'})`);
          
          // Update state
          this.updateLightState(lightId, isOn, percentage);
        }
      }
    } catch (error) {
      console.error('RVStateManager: Error processing light status from CAN:', error);
    }
  }

  /**
   * Process command execution from CAN bus
   */
  processCommandFromCAN(data) {
    try {
      const instanceHex = data[0];
      const instance = parseInt(instanceHex, 16);
      
      // Check for water system commands
      if (instance === 44) { // Water pump (0x2C)
        const isOn = data[2] && parseInt(data[2], 16) > 0;
        console.log(`RVStateManager: Water pump ${isOn ? 'ON' : 'OFF'} from CAN`);
        this.updateWaterState({ pumpOn: isOn });
      } else if (instance === 43) { // Water heater (0x2B)
        const isOn = data[2] && parseInt(data[2], 16) > 0;
        console.log(`RVStateManager: Water heater ${isOn ? 'ON' : 'OFF'} from CAN`);
        this.updateWaterState({ heaterOn: isOn });
      } else {
        // Check for light commands
        const lightId = this.mapInstanceToLightId(instance);
        if (lightId) {
          // This might be a toggle command
          const command = data[3] ? parseInt(data[3], 16) : 0;
          if (command === 5) { // Toggle command
            console.log(`RVStateManager: Light toggle from CAN - ${lightId}`);
            // We don't know the new state from the command, so we'll wait for the status update
          }
        }
      }
    } catch (error) {
      console.error('RVStateManager: Error processing command from CAN:', error);
    }
  }

  /**
   * Process climate control messages from CAN bus
   */
  processClimateFromCAN(data, canId) {
    try {
      console.log(`RVStateManager: Climate control message from CAN - ID: ${canId}`);
      
      // Update climate state with raw data for now
      // More specific parsing could be added based on your climate control protocol
      this.updateClimateState({
        lastCANUpdate: new Date().toISOString(),
        lastCANId: canId,
        rawCANData: data
      });
    } catch (error) {
      console.error('RVStateManager: Error processing climate from CAN:', error);
    }
  }

  /**
   * Map CAN instance numbers to light IDs
   */
  mapInstanceToLightId(instance) {
    const instanceMap = {
      26: 'kitchen_lights',    // 0x1A
      21: 'bath_light',        // 0x15
      27: 'bed_ovhd_light',    // 0x1B
      22: 'vibe_light',        // 0x16
      23: 'vanity_light',      // 0x17
      25: 'awning_lights',     // 0x19
      28: 'shower_lights',     // 0x1C
      29: 'under_cab_lights',  // 0x1D
      30: 'hitch_lights',      // 0x1E
      31: 'porch_lights',      // 0x1F
      34: 'left_reading_lights', // 0x22
      35: 'right_reading_lights', // 0x23
      24: 'dinette_lights',    // 0x18
      32: 'strip_lights'       // 0x20
    };
    
    return instanceMap[instance];
  }

  /**
   * Handle CAN bus messages from WebSocket
   */
  handleCANMessage(message) {
    try {
      if (!message.data || !message.data.id) {
        return;
      }
      
      const canData = message.data;
      const { id, data } = canData;
      
      // Process different types of CAN messages
      if (id === '19FEDA98' && Array.isArray(data) && data.length >= 4) {
        // Light status update
        this.processLightStatusFromCAN(data);
      } else if (id === '19FEDB9F' && Array.isArray(data) && data.length > 0) {
        // Command execution - could be lights, water systems, etc.
        this.processCommandFromCAN(data);
      } else if (id && (id.startsWith('19FEF9') || id.startsWith('19FED9') || id.startsWith('19FFE2'))) {
        // Climate control messages
        this.processClimateFromCAN(data, id);
      }
    } catch (error) {
      console.error('RVStateManager: Error handling CAN message:', error);
    }
  }
  
  // Set up WebSocket for multi-device synchronization
  setupSyncSocket() {
    try {
      // Use your existing server's WebSocket endpoint
      const wsUrl = 'ws://10.129.134.57:3000'; // Match your server.js configuration
      
      console.log(`RVStateManager: Connecting to WebSocket at ${wsUrl}`);
      this.syncSocket = new WebSocket(wsUrl);
      
      this.syncSocket.onopen = () => {
        console.log('RVStateManager: WebSocket connected for state synchronization');
        this.state.isOnline = true;
        
        // Process any queued offline changes
        this.processOfflineQueue();
        
        // Send a state sync message to inform other devices
        this.sendMessage({
          type: 'stateSync',
          deviceId: this.state.deviceId,
          state: this.state,
          timestamp: new Date().toISOString()
        });
      };
      
      this.syncSocket.onmessage = (event) => {
        try {
          // Handle different types of incoming data
          const messageData = event.data;
          
          // Check if the message is empty or just whitespace
          if (!messageData || messageData.trim() === '') {
            console.log('RVStateManager: Received empty WebSocket message, ignoring');
            return;
          }
          
          // Check if the message starts with non-JSON characters
          const trimmedData = messageData.trim();
          if (!trimmedData.startsWith('{') && !trimmedData.startsWith('[')) {
            console.log('RVStateManager: Received non-JSON WebSocket message:', trimmedData);
            return;
          }
          
          // Try to parse as JSON
          let message;
          try {
            message = JSON.parse(trimmedData);
          } catch (jsonError) {
            console.warn('RVStateManager: Failed to parse WebSocket JSON:', jsonError.message);
            return;
          }
          
          // Ignore messages from this device
          if (message.sourceDeviceId === this.state.deviceId || message.deviceId === this.state.deviceId) {
            return;
          }
          
          // Handle different message types
          if (message.type === 'stateUpdate') {
            this.handleExternalStateUpdate(message);
          } else if (message.type === 'commandExecuted') {
            this.handleCommandExecuted(message);
          } else if (message.type === 'canMessage') {
            this.handleCANMessage(message);
          } else if (message.type === 'subscriptionAck') {
            console.log('RVStateManager: Subscription acknowledged');
          } else if (message.type === 'error') {
            console.error('RVStateManager: Server error:', message.message);
          }
        } catch (error) {
          console.error('RVStateManager: Error processing WebSocket message:', error);
        }
      };
      
      this.syncSocket.onclose = (event) => {
        console.log(`RVStateManager: WebSocket disconnected (code: ${event.code})`);
        this.state.isOnline = false;
        
        // Try to reconnect after delay if not closing intentionally
        if (event.code !== 1000) {
          setTimeout(() => this.setupSyncSocket(), 5000);
        }
      };
      
      this.syncSocket.onerror = (error) => {
        console.error('RVStateManager: WebSocket error:', error);
        this.state.isOnline = false;
      };
    } catch (error) {
      console.error('RVStateManager: Failed to create WebSocket:', error);
      this.state.isOnline = false;
    }
  }

   /**
   * Handle external state updates from other devices
   */
   handleExternalStateUpdate(message) {
    try {
      this.updatingState = true;
      
      // Merge in the remote state changes
      const newState = { ...this.state };
      Object.keys(message.state).forEach(key => {
        if (key !== 'deviceId' && key !== 'lastUpdate') { // Don't override our device ID or last update
          newState[key] = { ...newState[key], ...message.state[key] };
        }
      });
      
      // Update timestamp
      newState.lastUpdate = new Date().toISOString();
      
      this.state = newState;
      this.saveState();
      
      // Notify listeners of external state change
      this.events.emit('externalStateChange', this.state);
      
      console.log('RVStateManager: Applied external state update from device:', message.sourceDeviceId);
    } catch (error) {
      console.error('RVStateManager: Error handling external state update:', error);
    } finally {
      this.updatingState = false;
    }
  }
  
  /**
   * Send message through WebSocket with error handling
   */
  sendMessage(message) {
    if (this.syncSocket && this.syncSocket.readyState === WebSocket.OPEN) {
      try {
        this.syncSocket.send(JSON.stringify(message));
      } catch (error) {
        console.error('RVStateManager: Error sending WebSocket message:', error);
      }
    } else {
      console.log('RVStateManager: WebSocket not connected, queueing message');
      // Queue the message for when connection is restored
      this.offlineQueue.push({
        type: 'message',
        data: message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // Network connectivity monitoring
  setupConnectivityListener() {
    try {
      NetInfo.addEventListener(state => {
        const isConnected = state.isConnected && state.isInternetReachable;
        
        // Update online status
        if (this.state.isOnline !== isConnected) {
          this.state.isOnline = isConnected;
          
          // If coming back online, reconnect WebSocket and process queue
          if (isConnected) {
            if (!this.syncSocket || this.syncSocket.readyState !== WebSocket.OPEN) {
              this.setupSyncSocket();
            }
          }
        }
      });
    } catch (error) {
      console.error('Failed to setup connectivity listener:', error);
      // Assume we're online if we can't check
      this.state.isOnline = true;
    }
  }
  
  // Process changes made while offline
  async processOfflineQueue() {
    if (this.offlineQueue.length > 0 && this.state.isOnline) {
      console.log(`Processing ${this.offlineQueue.length} offline changes`);
      
      // Apply each queued change
      for (const change of this.offlineQueue) {
        await this.broadcastStateChange(change.category, change.data);
      }
      
      // Clear the queue
      this.offlineQueue = [];
      
      try {
        await AsyncStorage.setItem('rvOfflineQueue', JSON.stringify(this.offlineQueue));
      } catch (error) {
        console.warn('Failed to clear offline queue:', error.message);
      }
    }
  }
  
  // Update a specific category of state
  updateState(category, data) {
    if (this.updatingState) return;
    
    this.updatingState = true;
    
    // Update the state
    this.state[category] = {
      ...this.state[category],
      ...data
    };
    
    // Update timestamp
    this.state.lastUpdate = new Date().toISOString();
    
    // Persist state to storage
    this.saveState();
    
    // Broadcast change to other devices
    this.broadcastStateChange(category, data);
    
    // Notify local listeners
    this.events.emit('stateChange', { category, data, state: this.state });
    
    this.updatingState = false;
  }
  
  // Update light state specifically (common operation)
  updateLightState(lightId, isOn, brightness = null) {
    const lightData = {
      [lightId]: {
        isOn,
        brightness: brightness !== null ? brightness : (this.state.lights[lightId]?.brightness || 50),
        lastUpdated: new Date().toISOString()
      }
    };
    
    this.updateState('lights', lightData);
  }
  
  // Update climate control state
  updateClimateState(data) {
    this.updateState('climate', data);
  }
  
  // Update water system state
  updateWaterState(data) {
    this.updateState('water', data);
  }
  
  // Broadcast state change to other devices
  async broadcastStateChange(category, data) {
    if (!this.state.isOnline || !this.syncSocket || this.syncSocket.readyState !== WebSocket.OPEN) {
      // Queue the change for later if offline
      this.offlineQueue.push({ category, data, timestamp: new Date().toISOString() });
      
      try {
        await AsyncStorage.setItem('rvOfflineQueue', JSON.stringify(this.offlineQueue));
      } catch (error) {
        console.warn('Failed to save offline queue:', error.message);
      }
      return;
    }
    
    // Send update through WebSocket
    try {
      const message = {
        type: 'stateUpdate',
        sourceDeviceId: this.state.deviceId,
        state: { [category]: this.state[category] },
        timestamp: new Date().toISOString()
      };
      
      this.sendMessage(message);
    } catch (error) {
      console.error('Error broadcasting state change:', error);
      
      // Queue for retry if there was an error
      this.offlineQueue.push({ category, data, timestamp: new Date().toISOString() });
      
      try {
        await AsyncStorage.setItem('rvOfflineQueue', JSON.stringify(this.offlineQueue));
      } catch (storageError) {
        console.warn('Failed to save offline queue after error:', storageError.message);
      }
    }
  }
  
  // Save state to persistent storage
  async saveState() {
    try {
      await AsyncStorage.setItem('rvState', JSON.stringify(this.state));
    } catch (error) {
      console.warn('Error saving state to storage:', error.message);
      // Don't throw error, just log it - the app should continue to work
    }
  }
  
  // Get current state
  getState() {
    return { ...this.state };
  }
  
  // Get state for a specific category
  getCategoryState(category) {
    return { ...this.state[category] };
  }
  
  // Subscribe to state changes
  subscribe(callback) {
    this.events.on('stateChange', callback);
    
    // Return unsubscribe function
    return () => {
      this.events.off('stateChange', callback);
    };
  }
  
  // Subscribe to external state changes only (from other devices)
  subscribeToExternalChanges(callback) {
    this.events.on('externalStateChange', callback);
    
    // Return unsubscribe function
    return () => {
      this.events.off('externalStateChange', callback);
    };
  }
  
  // Clean up resources
  destroy() {
    if (this.canBusListener) {
      this.canBusListener.stop();
    }
    
    if (this.syncSocket) {
      this.syncSocket.close();
    }
    
    this.events.removeAllListeners();
  }
}

// Create singleton instance
const rvStateManager = new RVStateManager();

export default rvStateManager;