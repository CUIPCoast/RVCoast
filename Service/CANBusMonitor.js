// CANBusMonitor.js - Enhanced with state change detection and reduced message frequency
import { RVControlService } from '../API/rvAPI';
import { EventEmitter } from 'events';

/**
 * Utility class to monitor and parse CAN bus data
 * Specifically for handling the Firefly Integrations dimming system
 * Only processes and emits changes when actual state changes occur
 */
export class CANBusMonitor {
  // Singleton instance of the real-time listener
  static _listener = null;
  
  // State tracking to detect changes
  static _lastKnownStates = {
    lights: {},
    water: {},
    climate: {}
  };
  
  // Polling configuration
  static _pollingConfig = {
    interval: 10000, // Poll every 10 seconds instead of 5
    maxRetries: 3,
    retryDelay: 5000
  };
  
  // Get or create the CAN bus listener instance
  static getListener() {
    if (!this._listener) {
      this._listener = new CANBusListener();
      this._listener.start();
    }
    return this._listener;
  }
  
  /**
   * Subscribe to CAN bus events with state change detection
   * @param {Function} callback - Function to call with parsed updates
   * @returns {Object} Subscription object
   */
  static subscribeToDimmingUpdates(callback) {
    // First try to use real-time listener
    const listener = this.getListener();
    
    if (listener.isConnected()) {
      // Use real-time event-based subscription
      console.log('CANBusMonitor: Using real-time CAN bus subscription');
      
      const onUpdate = (updates) => {
        // Only call callback if there are actual updates
        if (updates && Object.keys(updates).length > 0) {
          console.log('CANBusMonitor: Emitting dimming updates:', Object.keys(updates));
          callback(updates);
        }
      };
      
      // Subscribe to dimming updates
      listener.on('dimmingUpdates', onUpdate);
      
      // Also listen for individual light messages
      listener.on('message', (message) => {
        if (message.stateChange && message.lightId) {
          // Convert single message to updates format
          const updates = {
            [message.lightId]: {
              brightness: message.brightness,
              isOn: message.isOn,
              instance: message.instance,
              timestamp: Date.now()
            }
          };
          onUpdate(updates);
        }
      });
      
      // Return unsubscribe function
      return {
        unsubscribe: () => {
          listener.off('dimmingUpdates', onUpdate);
          listener.off('message', onUpdate);
        }
      };
    } else {
      // Fall back to polling with state change detection
      console.log('CANBusMonitor: Using polling fallback with state change detection');
      
      let retryCount = 0;
      
      const poll = async () => {
        try {
          const canDataSamples = await this.fetchLatestCANData();
          
          if (canDataSamples && canDataSamples.length > 0) {
            // Parse the data for dimming updates
            const updates = this.parseDimmingUpdatesWithStateDetection(canDataSamples);
            
            // Only call callback if there are actual state changes
            if (updates && Object.keys(updates).length > 0) {
              console.log('CANBusMonitor: Detected state changes:', Object.keys(updates));
              callback(updates);
            }
          }
          
          // Reset retry count on successful poll
          retryCount = 0;
        } catch (error) {
          console.error('CANBusMonitor: Error fetching CAN bus data:', error);
          retryCount++;
          
          // If we've failed too many times, increase the polling interval
          if (retryCount >= this._pollingConfig.maxRetries) {
            console.log('CANBusMonitor: Multiple failures, increasing poll interval');
            // Temporarily increase interval after failures
            setTimeout(poll, this._pollingConfig.retryDelay);
            return;
          }
        }
        
        // Schedule next poll
        setTimeout(poll, this._pollingConfig.interval);
      };
      
      // Start polling
      poll();
      
      // Return an object that can be used to unsubscribe
      return {
        unsubscribe: () => {
          // In a real implementation, you'd stop the polling here
          console.log('CANBusMonitor: Polling subscription cancelled');
        }
      };
    }
  }
  
  /**
   * Parse dimming updates with state change detection
   * @param {Array} canData - Array of CAN bus messages
   * @returns {Object} Object with only changed light states
   */
  static parseDimmingUpdatesWithStateDetection(canData) {
    const updates = this.parseDimmingUpdates(canData);
    const changedStates = {};
    
    // Check each update against last known state
    Object.entries(updates).forEach(([lightId, brightness]) => {
      const lastState = this._lastKnownStates.lights[lightId];
      const isOn = brightness > 0;
      
      // Check if state actually changed
      let hasChanged = false;
      
      if (!lastState) {
        // First time seeing this light
        hasChanged = true;
      } else {
        // Check for on/off change
        const wasOn = lastState.brightness > 0;
        if (isOn !== wasOn) {
          hasChanged = true;
        }
        // Check for brightness change (allow 2% tolerance)
        else if (Math.abs(lastState.brightness - brightness) > 2) {
          hasChanged = true;
        }
      }
      
      if (hasChanged) {
        changedStates[lightId] = {
          brightness: brightness,
          isOn: isOn,
          previousState: lastState,
          timestamp: Date.now()
        };
        
        // Update last known state
        this._lastKnownStates.lights[lightId] = {
          brightness: brightness,
          isOn: isOn,
          lastUpdate: Date.now()
        };
      }
    });
    
    return changedStates;
  }
  
  /**
   * Fetch the latest CAN bus data with reduced frequency
   * @returns {Promise<Array>} Promise that resolves with CAN data
   */
  static async fetchLatestCANData() {
    try {
      // Check if system is available
      const status = await RVControlService.getStatus();
      
      if (!status || status.status !== 'success') {
        throw new Error('CAN bus not available');
      }
      
      // In a real implementation, fetch from the API
      try {
        const response = await fetch(`${RVControlService.baseURL}/can-data?limit=10&recent=true`);
        if (!response.ok) {
          throw new Error('Failed to fetch CAN data');
        }
        
        const data = await response.json();
        return data.canData || [];
      } catch (fetchError) {
        console.error('CANBusMonitor: Error fetching CAN data from API:', fetchError);
        return [];
      }
    } catch (error) {
      console.error('CANBusMonitor: Error in fetchLatestCANData:', error);
      return [];
    }
  }
  
  /**
   * Parse CAN bus data for dimming updates
   * @param {Array} canData - Array of CAN bus messages
   * @returns {Object} Object with light IDs and their brightness values
   */
  static parseDimmingUpdates(canData) {
    // From the PDF, we know that dimming updates are broadcast on 19FEDA98
    // with a specific format:
    // can0  19FEDA98 [8] 18 FF C8 FC FF 05 04 00
    //                    ^^ ^^ ^^ ^^ ^^ ^^ ^^ ^^
    //                    |  |  |  |  |  |  |  |
    //                    |  |  |  |  |  |  |  +-- Unknown
    //                    |  |  |  |  |  |  +----- Command type (04 = status)
    //                    |  |  |  |  |  +-------- Brightness level (05 = 5%)
    //                    |  |  |  |  +----------- Unknown
    //                    |  |  |  +-------------- Type (FC = dimming update)
    //                    |  |  +----------------- Brightness value (C8 = 200 = 100%)
    //                    |  +-------------------- Unknown
    //                    +----------------------- Light ID (18 = dinette)
    
    const updates = {};
    
    // Filter for dimming updates (19FEDA98)
    const dimmingUpdates = canData.filter(message => 
      (message.id === '19FEDA98' || message.id === '19FEDA') && 
      (Array.isArray(message.data) && message.data.length === 8)
    );
    
    // Map from light IDs in CAN messages to our application light IDs
    const lightIdMap = {
      '15': 'bath_light',
      '16': 'vibe_light',
      '17': 'vanity_light',
      '18': 'dinette_lights',
      '19': 'awning_lights',
      '1A': 'kitchen_lights',
      '1B': 'bed_ovhd_light',
      '1C': 'shower_lights',
      '1D': 'under_cab_lights',
      '20': 'strip_lights',
      '22': 'left_reading_lights',
      '23': 'right_reading_lights',
      '1E': 'hitch_lights',
      '1F': 'porch_lights'
    };
    
    // Parse each dimming update
    dimmingUpdates.forEach(message => {
      try {
        const data = message.data;
        
        // Make sure data is in the right format
        if (!Array.isArray(data)) return;
        
        // Check if this is a dimming update (byte 3 = FC or byte 3 = 'FC')
        const byte3 = data[3].toString().toUpperCase();
        if (byte3 === 'FC' || byte3 === 'fc') {
          // Get light ID from the first byte
          const lightIdHex = data[0].toString().toUpperCase();
          const lightId = lightIdMap[lightIdHex];
          
          if (lightId) {
            // Parse brightness value from byte 2
            const brightnessHex = data[2].toString();
            const brightness = parseInt(brightnessHex, 16);
            
            // Convert to percentage (0-100%)
            // Note: CAN bus uses 0-200 (0x00-0xC8) for 0-100%
            const percentage = Math.round((brightness / 200) * 100);
            
            // Add to updates
            updates[lightId] = percentage;
          }
        }
      } catch (error) {
        console.error('CANBusMonitor: Error parsing dimming update:', error);
      }
    });
    
    return updates;
  }
  
  /**
   * Get current known states for debugging
   * @returns {Object} Current state snapshot
   */
  static getKnownStates() {
    return {
      lights: { ...this._lastKnownStates.lights },
      water: { ...this._lastKnownStates.water },
      climate: { ...this._lastKnownStates.climate },
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Clear all known states (useful for testing or reset)
   */
  static clearKnownStates() {
    this._lastKnownStates = {
      lights: {},
      water: {},
      climate: {}
    };
    console.log('CANBusMonitor: All known states cleared');
  }
  
  /**
   * Update polling configuration
   * @param {Object} config - New polling configuration
   */
  static updatePollingConfig(config) {
    this._pollingConfig = {
      ...this._pollingConfig,
      ...config
    };
    console.log('CANBusMonitor: Polling configuration updated:', this._pollingConfig);
  }
  
  /**
   * Get current polling configuration
   * @returns {Object} Current polling configuration
   */
  static getPollingConfig() {
    return { ...this._pollingConfig };
  }
}

/**
 * Real-time CAN bus listener using WebSocket connection
 * Extends EventEmitter to provide event-based notifications
 * Enhanced with state change detection and reduced message frequency
 */
class CANBusListener extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.connected = false;
    this.reconnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000; // Start with 2 second delay
    this.lastMessageTimestamp = Date.now();
    this.messageQueue = [];
    this.processingInterval = null;
    
    // State tracking for change detection
    this.lastKnownStates = {
      lights: {},
      water: {},
      climate: {}
    };
    
    // Message deduplication
    this.messageBuffer = new Map();
    this.bufferTimeout = 5000; // 5 seconds
    
    // Heartbeat for debugging
    this.lastHeartbeat = Date.now();
    this.heartbeatInterval = 60000; // 1 minute
  }
  
  /**
   * Start the CAN bus listener
   */
  start() {
    this.setupWebsocket();
    
    // Set up message queue processing with longer interval
    this.processingInterval = setInterval(() => {
      this.processMessageQueue();
      this.cleanupMessageBuffer();
      this.sendHeartbeatIfNeeded();
    }, 2000); // Process every 2 seconds instead of 500ms
  }
  
  /**
   * Check if the listener is connected
   * @returns {boolean} Connected status
   */
  isConnected() {
    return this.connected;
  }
  
  /**
   * Set up WebSocket connection to the server
   */
  setupWebsocket() {
    try {
      // Derive WebSocket URL from the REST API base URL
      const wsUrl = RVControlService.baseURL.replace(/^http/, 'ws').replace('/api', '');
      
      // Create WebSocket connection
      this.ws = new WebSocket(wsUrl);
      
      // Set up event handlers
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      
      console.log('CANBusListener: Setting up WebSocket connection to', wsUrl);
    } catch (error) {
      console.error('CANBusListener: Failed to create WebSocket:', error);
      this.handleConnectionFailure();
    }
  }
  
  /**
   * Handle WebSocket open event
   */
  handleOpen() {
    console.log('CANBusListener: WebSocket connected');
    this.connected = true;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 2000; // Reset delay
    this.emit('connected');
    
    // Subscribe to specific CAN IDs with reduced frequency
    this.sendMessage({
      type: 'subscribe',
      canIds: ['19FEDA98', '19FEDB9F'], // Focus on dimming and water system updates
      options: {
        stateChangeOnly: true, // Request only state changes if server supports it
        throttle: 2000 // Request throttling if server supports it
      }
    });
  }
  
  /**
   * Handle WebSocket message event
   * @param {MessageEvent} event - WebSocket message event
   */
  handleMessage(event) {
    try {
      const messageData = event.data;
      
      // Skip empty messages
      if (!messageData || messageData.trim() === '') {
        return;
      }
      
      // Try to parse as JSON
      let message;
      try {
        message = JSON.parse(messageData);
      } catch (jsonError) {
        // Handle raw CAN data if it's not JSON
        if (this.isCANDataFormat(messageData)) {
          this.handleRawCANMessage(messageData);
        }
        return;
      }
      
      this.lastMessageTimestamp = Date.now();
      
      // Add to message queue for processing with deduplication
      const messageKey = this.generateMessageKey(message);
      if (!this.messageBuffer.has(messageKey)) {
        this.messageQueue.push(message);
        this.messageBuffer.set(messageKey, Date.now());
      }
    } catch (error) {
      console.error('CANBusListener: Error parsing message:', error);
    }
  }
  
  /**
   * Generate a key for message deduplication
   */
  generateMessageKey(message) {
    if (message.type === 'canMessage' && message.data) {
      return `${message.data.id}_${JSON.stringify(message.data.data)}`;
    }
    return `${message.type}_${Date.now()}`;
  }
  
  /**
   * Check if message looks like raw CAN data
   */
  isCANDataFormat(messageData) {
    const canPattern = /can\d+\s+[0-9A-F]+\s+\[\d+\]/i;
    return canPattern.test(messageData);
  }
  
  /**
   * Handle raw CAN messages
   */
  handleRawCANMessage(rawData) {
    try {
      // Parse raw CAN format: "can0  19FEDA98   [8]  1A FF C8 FC FF 05 04 00"
      const parts = rawData.trim().split(/\s+/);
      
      if (parts.length < 4) return;
      
      const message = {
        type: 'canMessage',
        data: {
          interface: parts[0],
          id: parts[1],
          dataLength: parseInt(parts[2].replace(/[\[\]]/g, '')),
          data: parts.slice(3),
          timestamp: Date.now()
        }
      };
      
      const messageKey = this.generateMessageKey(message);
      if (!this.messageBuffer.has(messageKey)) {
        this.messageQueue.push(message);
        this.messageBuffer.set(messageKey, Date.now());
      }
    } catch (error) {
      console.error('CANBusListener: Error parsing raw CAN message:', error);
    }
  }
  
  /**
   * Process the queue of received messages with state change detection
   */
  processMessageQueue() {
    if (this.messageQueue.length === 0) return;
    
    // Create a copy of the queue and clear it
    const messages = [...this.messageQueue];
    this.messageQueue = [];
    
    // Group messages by type
    const canMessages = [];
    const otherMessages = [];
    
    messages.forEach(message => {
      if (message.type === 'canMessage') {
        canMessages.push(message.data);
      } else {
        otherMessages.push(message);
      }
    });
    
    // Process CAN messages for state changes
    if (canMessages.length > 0) {
      this.processCANMessagesForStateChanges(canMessages);
    }
    
    // Process other message types
    otherMessages.forEach(message => {
      if (message.type === 'statusUpdate') {
        this.emit('statusUpdate', message.status);
      } else if (message.type === 'commandExecuted') {
        console.log('CANBusListener: Command executed:', message.command);
        this.emit('commandExecuted', message);
        this.lastHeartbeat = Date.now();
      }
    });
  }
  
  /**
   * Process CAN messages and detect state changes
   */
  processCANMessagesForStateChanges(canMessages) {
    const stateChanges = {
      lights: {},
      water: {},
      climate: {}
    };
    
    canMessages.forEach(canMessage => {
      const { id, data } = canMessage;
      
      // Process light status messages
      if (id === '19FEDA98' && Array.isArray(data) && data.length >= 4) {
        const lightChange = this.processLightStatusMessage(data);
        if (lightChange) {
          stateChanges.lights[lightChange.lightId] = lightChange;
        }
      }
      
      // Process water system messages
      else if (id === '19FEDB9F' && Array.isArray(data) && data.length > 0) {
        const waterChange = this.processWaterStatusMessage(data);
        if (waterChange) {
          stateChanges.water[waterChange.device] = waterChange;
        }
      }
      
      // Process climate messages
      else if (id && (id.startsWith('19FEF9') || id.startsWith('19FED9') || id.startsWith('19FFE2'))) {
        const climateChange = this.processClimateStatusMessage(id, data);
        if (climateChange) {
          stateChanges.climate[climateChange.key] = climateChange;
        }
      }
    });
    
    // Emit state changes if any occurred
    this.emitStateChanges(stateChanges);
  }
  
  /**
   * Process light status message and detect changes
   */
  processLightStatusMessage(data) {
    try {
      const instanceHex = data[0];
      const brightnessHex = data[2];
      const statusHex = data[3];
      
      const instance = parseInt(instanceHex, 16);
      const brightness = parseInt(brightnessHex, 16);
      const isDimmerUpdate = statusHex && statusHex.toString().toUpperCase() === 'FC';
      
      if (!isDimmerUpdate) return null;
      
      const lightId = this.mapInstanceToLightId(instance);
      if (!lightId) return null;
      
      const percentage = Math.round((brightness / 200) * 100);
      const isOn = percentage > 0;
      
      // Check for state change
      const lastState = this.lastKnownStates.lights[lightId];
      let hasChanged = false;
      
      if (!lastState) {
        hasChanged = true;
      } else {
        const wasOn = lastState.isOn;
        const brightnessDiff = Math.abs(lastState.brightness - percentage);
        
        if (isOn !== wasOn || brightnessDiff > 2) {
          hasChanged = true;
        }
      }
      
      if (hasChanged) {
        const newState = {
          lightId,
          isOn,
          brightness: percentage,
          instance,
          previousState: lastState,
          timestamp: Date.now()
        };
        
        this.lastKnownStates.lights[lightId] = {
          isOn,
          brightness: percentage,
          lastUpdate: Date.now()
        };
        
        return newState;
      }
      
      return null;
    } catch (error) {
      console.error('CANBusListener: Error processing light status:', error);
      return null;
    }
  }
  
  /**
   * Process water system status message and detect changes
   */
  processWaterStatusMessage(data) {
    try {
      const instanceHex = data[0];
      const instance = parseInt(instanceHex, 16);
      
      if (instance !== 44 && instance !== 43) return null; // Only water pump (44) and heater (43)
      
      const deviceType = instance === 44 ? 'water_pump' : 'water_heater';
      const isOn = data[2] && parseInt(data[2], 16) > 0;
      
      // Check for state change
      const lastState = this.lastKnownStates.water[deviceType];
      const hasChanged = !lastState || lastState.isOn !== isOn;
      
      if (hasChanged) {
        const newState = {
          device: deviceType,
          isOn,
          instance,
          previousState: lastState,
          timestamp: Date.now()
        };
        
        this.lastKnownStates.water[deviceType] = {
          isOn,
          lastUpdate: Date.now()
        };
        
        return newState;
      }
      
      return null;
    } catch (error) {
      console.error('CANBusListener: Error processing water status:', error);
      return null;
    }
  }
  
  /**
   * Process climate status message and detect changes
   */
  processClimateStatusMessage(id, data) {
    try {
      const key = `climate_${id}`;
      const dataHash = JSON.stringify(data);
      
      // Check for change in climate data
      const lastState = this.lastKnownStates.climate[key];
      const hasChanged = !lastState || lastState.dataHash !== dataHash;
      
      if (hasChanged) {
        const newState = {
          key,
          canId: id,
          rawData: data,
          dataHash,
          previousState: lastState,
          timestamp: Date.now()
        };
        
        this.lastKnownStates.climate[key] = {
          dataHash,
          lastUpdate: Date.now()
        };
        
        return newState;
      }
      
      return null;
    } catch (error) {
      console.error('CANBusListener: Error processing climate status:', error);
      return null;
    }
  }
  
  /**
   * Emit state changes if any occurred
   */
  emitStateChanges(stateChanges) {
    let hasChanges = false;
    
    // Emit light changes
    if (Object.keys(stateChanges.lights).length > 0) {
      hasChanges = true;
      console.log('CANBusListener: Light state changes detected:', Object.keys(stateChanges.lights));
      this.emit('dimmingUpdates', stateChanges.lights);
      
      // Also emit individual light messages for compatibility
      Object.values(stateChanges.lights).forEach(change => {
        this.emit('message', {
          dgn: '1FEDA',
          lightId: change.lightId,
          brightness: change.brightness,
          isOn: change.isOn,
          instance: change.instance,
          stateChange: true,
          timestamp: change.timestamp
        });
      });
    }
    
    // Emit water system changes
    if (Object.keys(stateChanges.water).length > 0) {
      hasChanges = true;
      console.log('CANBusListener: Water system changes detected:', Object.keys(stateChanges.water));
      
      Object.values(stateChanges.water).forEach(change => {
        this.emit('message', {
          dgn: '1FEDB',
          type: 'water',
          device: change.device,
          isOn: change.isOn,
          instance: change.instance,
          stateChange: true,
          timestamp: change.timestamp
        });
      });
    }
    
    // Emit climate changes
    if (Object.keys(stateChanges.climate).length > 0) {
      hasChanges = true;
      console.log('CANBusListener: Climate changes detected:', Object.keys(stateChanges.climate));
      
      Object.values(stateChanges.climate).forEach(change => {
        this.emit('message', {
          dgn: '19FEF9',
          type: 'climate',
          canId: change.canId,
          rawData: change.rawData,
          stateChange: true,
          timestamp: change.timestamp
        });
      });
    }
    
    if (hasChanges) {
      this.lastHeartbeat = Date.now();
    }
  }
  
  /**
   * Map instance to light ID
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
   * Clean up old messages from buffer
   */
  cleanupMessageBuffer() {
    const now = Date.now();
    for (const [key, timestamp] of this.messageBuffer.entries()) {
      if (now - timestamp > this.bufferTimeout) {
        this.messageBuffer.delete(key);
      }
    }
  }
  
  /**
   * Send heartbeat if needed
   */
  sendHeartbeatIfNeeded() {
    const now = Date.now();
    if (now - this.lastHeartbeat > this.heartbeatInterval) {
      this.emit('heartbeat', {
        timestamp: now,
        connected: this.connected,
        bufferSize: this.messageBuffer.size,
        knownStates: {
          lights: Object.keys(this.lastKnownStates.lights).length,
          water: Object.keys(this.lastKnownStates.water).length,
          climate: Object.keys(this.lastKnownStates.climate).length
        }
      });
      this.lastHeartbeat = now;
    }
  }
  
  /**
   * Handle WebSocket close event
   * @param {CloseEvent} event - WebSocket close event
   */
  handleClose(event) {
    console.log(`CANBusListener: WebSocket closed (${event.code}: ${event.reason})`);
    this.connected = false;
    this.ws = null;
    this.emit('disconnected');
    
    // Attempt to reconnect if not closing intentionally
    if (event.code !== 1000) {
      this.handleConnectionFailure();
    }
  }
  
  /**
   * Handle WebSocket error event
   * @param {Event} error - WebSocket error event
   */
  handleError(error) {
    console.error('CANBusListener: WebSocket error:', error);
    this.connected = false;
    this.emit('error', error);
  }
  
  /**
   * Handle connection failure with exponential backoff
   */
  handleConnectionFailure() {
    if (this.reconnecting) return;
    
    this.reconnecting = true;
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      // Exponential backoff with jitter
      const jitter = Math.random() * 1000;
      const delay = Math.min(30000, this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1)) + jitter;
      
      console.log(`CANBusListener: Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts} of ${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.reconnecting = false;
        this.setupWebsocket();
      }, delay);
    } else {
      console.log('CANBusListener: Maximum reconnection attempts reached. Giving up.');
      this.emit('maxReconnectAttemptsReached');
    }
  }
  
  /**
   * Send a message over the WebSocket
   * @param {Object} message - Message to send
   */
  sendMessage(message) {
    if (!this.connected || !this.ws) return;
    
    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('CANBusListener: Error sending message:', error);
    }
  }
  
  /**
   * Stop the CAN bus listener
   */
  stop() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    if (this.ws) {
      try {
        this.ws.close(1000, 'Client closing connection');
      } catch (error) {
        console.error('CANBusListener: Error closing WebSocket:', error);
      }
      
      this.ws = null;
      this.connected = false;
    }
    
    this.removeAllListeners();
    console.log('CANBusListener: Stopped');
  }
}

export default CANBusMonitor;