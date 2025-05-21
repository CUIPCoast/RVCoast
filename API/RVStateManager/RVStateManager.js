// RVStateManager.js - Central state management system for RV controls

import { createCANBusListener } from './CANBusListener';
import { EventEmitter } from 'events';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RVControlService } from '../API/rvAPI';
import NetInfo from '@react-native-community/netinfo';

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
      // Load cached state from storage
      const storedState = await AsyncStorage.getItem('rvState');
      if (storedState) {
        this.state = { ...this.state, ...JSON.parse(storedState) };
      }
      
      // Generate or retrieve device ID
      const deviceId = await AsyncStorage.getItem('deviceId');
      if (deviceId) {
        this.state.deviceId = deviceId;
      } else {
        this.state.deviceId = `rv-device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('deviceId', this.state.deviceId);
      }
      
      // Set up CAN bus listener for real-time updates
      this.setupCANBusListener();
      
      // Set up WebSocket for multi-device sync
      this.setupSyncSocket();
      
      // Set up network connectivity listener
      this.setupConnectivityListener();
      
      console.log('RV State Manager initialized');
    } catch (error) {
      console.error('Failed to initialize RV State Manager:', error);
    }
  }
  
  // Set up the CAN bus listener to capture state changes
  setupCANBusListener() {
    this.canBusListener = createCANBusListener();
    
    // Listen for light status changes (DC_DIMMER_STATUS_3)
    this.canBusListener.on('message', (message) => {
      // Only process if we're not already updating state
      if (this.updatingState) return;
      
      try {
        // Check if the message is a status update
        if (message.dgn === '1FEDA') {
          // This is a DC_DIMMER_STATUS_3 message (light status)
          const instance = message.instance;
          const brightness = message.operating_status;
          const isOn = message.load_status === '01';
          
          // Map instance number to light ID
          const lightId = this.mapInstanceToLightId(instance);
          if (lightId) {
            this.updateLightState(lightId, isOn, brightness);
          }
        } 
        // Add handlers for other message types (climate, water, etc.)
        else if (message.dgn === '19FEF9') {
          // Climate control status
          this.processClimateStatusMessage(message);
        }
        // Additional message handlers...
      } catch (error) {
        console.error('Error processing CAN message:', error);
      }
    });
  }
  
  // Map Firefly instance numbers to light IDs used in the app
  mapInstanceToLightId(instance) {
    const instanceMap = {
      26: 'kitchen_lights',
      21: 'bath_light',
      27: 'bed_ovhd_light',
      22: 'vibe_light',
      23: 'vanity_light',
      25: 'awning_lights',
      28: 'shower_lights',
      29: 'under_cab_lights',
      30: 'hitch_lights',
      31: 'porch_lights',
      34: 'left_reading_lights',
      35: 'right_reading_lights',
      24: 'dinette_lights',
      32: 'strip_lights'
    };
    
    return instanceMap[instance];
  }
  
  // Process climate control messages from the CAN bus
  processClimateStatusMessage(message) {
    // Extract relevant data from climate control messages
    // Implementation based on the specific format of your climate control messages
    // ...
    
    // Update the climate state
    this.updateState('climate', newClimateState);
  }
  
  // Set up WebSocket for multi-device synchronization
  setupSyncSocket() {
    // Using the same base URL as your REST API
    const wsUrl = RVControlService.baseURL.replace('http', 'ws') + '/ws';
    
    try {
      this.syncSocket = new WebSocket(wsUrl);
      
      this.syncSocket.onopen = () => {
        console.log('WebSocket connected for state synchronization');
        this.state.isOnline = true;
        
        // Process any queued offline changes
        this.processOfflineQueue();
      };
      
      this.syncSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Ignore messages from this device
          if (message.sourceDeviceId === this.state.deviceId) {
            return;
          }
          
          // Apply state update from another device
          if (message.type === 'stateUpdate') {
            this.updatingState = true;
            
            // Merge in the remote state changes
            const newState = { ...this.state };
            Object.keys(message.state).forEach(key => {
              if (key !== 'deviceId') { // Don't override our device ID
                newState[key] = message.state[key];
              }
            });
            
            this.state = newState;
            this.saveState();
            
            // Notify listeners of external state change
            this.events.emit('externalStateChange', this.state);
            
            this.updatingState = false;
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };
      
      this.syncSocket.onclose = () => {
        console.log('WebSocket disconnected');
        this.state.isOnline = false;
        
        // Try to reconnect after delay
        setTimeout(() => this.setupSyncSocket(), 5000);
      };
      
      this.syncSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.state.isOnline = false;
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.state.isOnline = false;
    }
  }
  
  // Network connectivity monitoring
  setupConnectivityListener() {
    // Use NetInfo to monitor network status
    // Implementation depends on your environment (React Native, web, etc.)
    // ...
    
    // Example for React Native:
    
    
    
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
      await AsyncStorage.setItem('rvOfflineQueue', JSON.stringify(this.offlineQueue));
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
      await AsyncStorage.setItem('rvOfflineQueue', JSON.stringify(this.offlineQueue));
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
      
      this.syncSocket.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error broadcasting state change:', error);
      
      // Queue for retry if there was an error
      this.offlineQueue.push({ category, data, timestamp: new Date().toISOString() });
      await AsyncStorage.setItem('rvOfflineQueue', JSON.stringify(this.offlineQueue));
    }
  }
  
  // Save state to persistent storage
  async saveState() {
    try {
      await AsyncStorage.setItem('rvState', JSON.stringify(this.state));
    } catch (error) {
      console.error('Error saving state:', error);
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