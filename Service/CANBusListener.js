// Service/CANBusListener.js - Updated with state change detection and reduced frequency
import { EventEmitter } from 'events';

/**
 * CAN Bus Listener for capturing real-time RV system state changes
 * Works with your existing WebSocket CAN monitoring system
 * Only emits messages when actual state changes occur
 */
class CANBusListener extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.connected = false;
    this.reconnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.baseUrl = 'http://10.129.134.57:3000'; // Match your server.js configuration
    
    // State tracking for change detection
    this.lastKnownStates = {
      lights: {}, // lightId: { isOn, brightness, lastUpdate }
      water: {},  // device: { isOn, lastUpdate }
      climate: {} // various climate states
    };
    
    // Message throttling
    this.messageBuffer = new Map(); // Store recent messages to detect duplicates
    this.bufferTimeout = 2000; // Clear buffer every 2 seconds
    this.lastHeartbeat = Date.now();
    this.heartbeatInterval = 30000; // Send heartbeat every 30 seconds if no changes
    
    // Start buffer cleanup
    this.startBufferCleanup();
  }
  
  /**
   * Start the CAN bus listener
   */
  start() {
    this.setupWebSocket();
  }
  
  /**
   * Start buffer cleanup and heartbeat
   */
  startBufferCleanup() {
    // Clean message buffer periodically
    setInterval(() => {
      const now = Date.now();
      for (const [key, timestamp] of this.messageBuffer.entries()) {
        if (now - timestamp > this.bufferTimeout) {
          this.messageBuffer.delete(key);
        }
      }
      
      // Send heartbeat if no changes for a while
      if (now - this.lastHeartbeat > this.heartbeatInterval) {
        this.emit('heartbeat', { 
          timestamp: now, 
          connected: this.connected,
          bufferSize: this.messageBuffer.size 
        });
        this.lastHeartbeat = now;
      }
    }, this.bufferTimeout);
  }
  
  /**
   * Set up WebSocket connection to your existing CAN monitoring system
   */
  setupWebSocket() {
    try {
      // Connect to your existing WebSocket server from server.js
      const wsUrl = this.baseUrl.replace(/^http/, 'ws');
      
      console.log(`CANBusListener: Connecting to ${wsUrl}`);
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('CANBusListener: Connected to RV CAN bus');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
        
        // Subscribe to CAN messages - your server.js already sends these
        this.sendMessage({
          type: 'subscribe',
          topics: ['canMessage', 'commandExecuted']
        });
      };
      
      this.ws.onmessage = (event) => {
        try {
          // Handle different types of incoming data
          const messageData = event.data;
          
          // Check if the message is empty or just whitespace
          if (!messageData || messageData.trim() === '') {
            return; // Silently ignore empty messages
          }
          
          // Check if the message starts with non-JSON characters
          const trimmedData = messageData.trim();
          if (!trimmedData.startsWith('{') && !trimmedData.startsWith('[')) {
            // Try to handle raw CAN data format if it looks like CAN data
            if (this.isCANDataFormat(trimmedData)) {
              this.handleRawCANData(trimmedData);
            }
            return;
          }
          
          // Try to parse as JSON
          let message;
          try {
            message = JSON.parse(trimmedData);
          } catch (jsonError) {
            return; // Silently ignore unparseable JSON
          }
          
          this.handleCANMessage(message);
        } catch (error) {
          console.error('CANBusListener: Error processing message:', error);
        }
      };
      
      this.ws.onclose = (event) => {
        console.log(`CANBusListener: WebSocket closed (code: ${event.code})`);
        this.connected = false;
        this.emit('disconnected');
        
        // Attempt to reconnect if not closing intentionally
        if (event.code !== 1000) {
          this.scheduleReconnect();
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('CANBusListener: WebSocket error:', error);
        this.connected = false;
        this.emit('error', error);
      };
      
    } catch (error) {
      console.error('CANBusListener: Failed to create WebSocket:', error);
      this.scheduleReconnect();
    }
  }
  
  /**
   * Check if the message looks like raw CAN data
   */
  isCANDataFormat(message) {
    // Look for patterns like "can0  19FEDB9F   [8]  1A FF FA 05 FF 00 FF FF"
    const canPattern = /can\d+\s+[0-9A-F]+\s+\[\d+\]/i;
    return canPattern.test(message);
  }
  
  /**
   * Handle raw CAN data messages
   */
  handleRawCANData(rawData) {
    try {
      // Parse raw CAN data format
      // Example: "can0  19FEDB9F   [8]  1A FF FA 05 FF 00 FF FF"
      const parts = rawData.trim().split(/\s+/);
      
      if (parts.length < 4) {
        return; // Not enough parts to be valid CAN data
      }
      
      const canInterface = parts[0]; // 'can0'
      const id = parts[1]; // '19FEDB9F'
      const dataLength = parts[2].replace('[', '').replace(']', ''); // '8'
      const data = parts.slice(3); // ['1A', 'FF', 'FA', '05', 'FF', '00', 'FF', 'FF']
      
      const canMessage = {
        interface: canInterface,
        id,
        dataLength: parseInt(dataLength),
        data,
        timestamp: Date.now()
      };
      
      // Process this as a CAN message
      this.parseCANMessage(canMessage);
      
    } catch (error) {
      console.error('CANBusListener: Error parsing raw CAN data:', error);
    }
  }
  
  /**
   * Handle incoming CAN messages from your server.js WebSocket
   */
  handleCANMessage(message) {
    try {
      // Handle different message types from your server.js
      if (message.type === 'canMessage' && message.data) {
        // Process CAN bus messages from candump
        const canData = message.data;
        this.parseCANMessage(canData);
      } else if (message.type === 'commandExecuted') {
        // Handle command execution confirmations - always emit these
        console.log('CANBusListener: Command executed:', message.command);
        this.emit('commandExecuted', {
          command: message.command,
          timestamp: message.timestamp
        });
        this.lastHeartbeat = Date.now();
      } else if (message.type === 'initialState') {
        // Handle initial state from server - always emit these
        console.log('CANBusListener: Initial state received');
        this.emit('initialState', message);
        this.lastHeartbeat = Date.now();
      }
    } catch (error) {
      console.error('CANBusListener: Error handling message:', error);
    }
  }
  
  /**
   * Check if a state change has occurred and should be emitted
   */
  shouldEmitStateChange(category, key, newState) {
    const stateKey = `${category}_${key}`;
    const bufferKey = `${stateKey}_${JSON.stringify(newState)}`;
    
    // Check if we've seen this exact state recently
    if (this.messageBuffer.has(bufferKey)) {
      return false; // Duplicate message, don't emit
    }
    
    // Check if the state actually changed
    const lastState = this.lastKnownStates[category][key];
    if (lastState) {
      // For lights, check both on/off and brightness
      if (category === 'lights') {
        const isOnChanged = lastState.isOn !== newState.isOn;
        const brightnessChanged = Math.abs((lastState.brightness || 0) - (newState.brightness || 0)) > 2; // Allow 2% tolerance
        
        if (!isOnChanged && !brightnessChanged) {
          return false; // No significant change
        }
      }
      // For water systems, check on/off state
      else if (category === 'water') {
        if (lastState.isOn === newState.isOn) {
          return false; // No change
        }
      }
    }
    
    // Record the message in buffer and update last known state
    this.messageBuffer.set(bufferKey, Date.now());
    this.lastKnownStates[category][key] = { ...newState, lastUpdate: Date.now() };
    
    return true; // State changed, should emit
  }
  
  /**
   * Parse CAN messages based on your existing server.js logic
   */
  parseCANMessage(canData) {
    try {
      // Handle different formats of CAN data
      if (!canData) {
        return;
      }
      
      // Your server.js parseCANMessage function creates this format:
      // { interface, id, dataLength, data, timestamp }
      const { id, data, interface: canInterface } = canData;
      
      if (!id || !data) {
        return;
      }
      
      // Check for light status messages (DC_DIMMER_STATUS_3)
      if (id === '19FEDA98' && Array.isArray(data) && data.length >= 4) {
        // Parse dimming status updates
        const instanceHex = data[0];
        const brightnessHex = data[2];
        const statusHex = data[3];
        
        const instance = this.hexToDecimal(instanceHex);
        const brightness = this.hexToDecimal(brightnessHex);
        const isDimmerUpdate = statusHex && statusHex.toString().toUpperCase() === 'FC';
        
        if (isDimmerUpdate) {
          const lightId = this.mapInstanceToLightId(instance);
          if (lightId) {
            // Convert brightness to percentage (0-200 hex -> 0-100%)
            const percentage = Math.round((brightness / 200) * 100);
            const isOn = percentage > 0;
            
            const newState = {
              isOn: isOn,
              brightness: percentage,
              instance: instance
            };
            
            // Only emit if state actually changed
            if (this.shouldEmitStateChange('lights', lightId, newState)) {
              console.log(`CANBusListener: Light state changed - ${lightId}: ${percentage}% (${isOn ? 'ON' : 'OFF'})`);
              
              this.emit('message', {
                dgn: '1FEDA',
                instance: instance,
                operating_status: percentage,
                load_status: isOn ? '01' : '00',
                lightId: lightId,
                brightness: percentage,
                isOn: isOn,
                stateChange: true
              });
              
              this.lastHeartbeat = Date.now();
            }
          }
        }
      }
      
      // Check for climate control messages - only emit on significant changes
      else if (id && (id.startsWith('19FEF9') || id.startsWith('19FED9') || id.startsWith('19FFE2'))) {
        // For climate, we'll be less aggressive about filtering since these are less frequent
        const climateKey = `climate_${id}`;
        const newState = {
          rawData: data,
          canId: id
        };
        
        if (this.shouldEmitStateChange('climate', climateKey, newState)) {
          console.log('CANBusListener: Climate control state changed:', id);
          this.emit('message', {
            dgn: '19FEF9',
            type: 'climate',
            rawData: data,
            canId: id,
            timestamp: Date.now(),
            stateChange: true
          });
          
          this.lastHeartbeat = Date.now();
        }
      }
      
      // Check for water system messages (looking for DC_DIMMER_COMMAND_2)
      else if (id === '19FEDB9F' && Array.isArray(data) && data.length > 0) {
        // Check if this is a water pump or heater status
        const instanceHex = data[0];
        const instance = this.hexToDecimal(instanceHex);
        
        // Water pump is typically instance 44 (0x2C)
        // Water heater is typically instance 43 (0x2B)
        if (instance === 44 || instance === 43) {
          const deviceType = instance === 44 ? 'water_pump' : 'water_heater';
          const isOn = data[2] && this.hexToDecimal(data[2]) > 0;
          
          const newState = {
            isOn: isOn,
            instance: instance
          };
          
          // Only emit if state actually changed
          if (this.shouldEmitStateChange('water', deviceType, newState)) {
            console.log(`CANBusListener: Water system state changed - ${deviceType}: ${isOn ? 'ON' : 'OFF'}`);
            
            this.emit('message', {
              dgn: '1FEDB',
              type: 'water',
              device: deviceType,
              isOn: isOn,
              instance: instance,
              stateChange: true
            });
            
            this.lastHeartbeat = Date.now();
          }
        }
      }
      
    } catch (error) {
      console.error('CANBusListener: Error parsing CAN message:', error);
    }
  }
  
  /**
   * Map CAN instance numbers to light IDs (from your existing mapping)
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
   * Convert hex string to decimal
   */
  hexToDecimal(hexString) {
    if (typeof hexString === 'string') {
      // Remove any whitespace and convert to uppercase
      const cleanHex = hexString.trim().toUpperCase();
      // Handle both '0x' prefixed and plain hex strings
      const hexValue = cleanHex.startsWith('0X') ? cleanHex.slice(2) : cleanHex;
      const decimal = parseInt(hexValue, 16);
      return isNaN(decimal) ? 0 : decimal;
    } else if (typeof hexString === 'number') {
      return hexString;
    }
    return 0;
  }
  
  /**
   * Send message to WebSocket server
   */
  sendMessage(message) {
    if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('CANBusListener: Error sending message:', error);
      }
    }
  }
  
  /**
   * Schedule reconnection with exponential backoff
   */
  scheduleReconnect() {
    if (this.reconnecting) return;
    
    this.reconnecting = true;
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      const delay = Math.min(30000, this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1));
      
      console.log(`CANBusListener: Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.reconnecting = false;
        this.setupWebSocket();
      }, delay);
    } else {
      console.log('CANBusListener: Maximum reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
    }
  }
  
  /**
   * Get current state summary for debugging
   */
  getStateSummary() {
    const summary = {
      connected: this.connected,
      lastHeartbeat: new Date(this.lastHeartbeat).toISOString(),
      bufferSize: this.messageBuffer.size,
      knownStates: {
        lights: Object.keys(this.lastKnownStates.lights).length,
        water: Object.keys(this.lastKnownStates.water).length,
        climate: Object.keys(this.lastKnownStates.climate).length
      }
    };
    
    return summary;
  }
  
  /**
   * Clear all known states (useful for testing)
   */
  clearStates() {
    this.lastKnownStates = {
      lights: {},
      water: {},
      climate: {}
    };
    this.messageBuffer.clear();
    console.log('CANBusListener: All states cleared');
  }
  
  /**
   * Stop the listener
   */
  stop() {
    if (this.ws) {
      this.ws.close(1000, 'Client stopping');
      this.ws = null;
    }
    
    this.connected = false;
    this.removeAllListeners();
  }
  
  /**
   * Check if connected
   */
  isConnected() {
    return this.connected;
  }
}

/**
 * Factory function to create CAN bus listener instance
 */
export function createCANBusListener() {
  return new CANBusListener();
}

export default CANBusListener;