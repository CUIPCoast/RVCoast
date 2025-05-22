// API/RVStateManager/CANBusListener.js - CAN Bus listener for RV State Manager
import { EventEmitter } from 'events';

/**
 * CAN Bus Listener for capturing real-time RV system state changes
 * Works with your existing WebSocket CAN monitoring system
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
    this.baseUrl = 'http://192.168.8.200:3000'; // Match your server.js configuration
  }
  
  /**
   * Start the CAN bus listener
   */
  start() {
    this.setupWebSocket();
  }
  
  /**
   * Set up WebSocket connection to your existing CAN monitoring system
   */
  setupWebSocket() {
    try {
      // Connect to your existing WebSocket server from server.js
      const wsUrl = this.baseUrl.replace(/^http/, 'ws');
      
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
          // Handle both JSON and plain text messages
          let message;
          
          // Try to parse as JSON first
          try {
            message = JSON.parse(event.data);
          } catch (jsonError) {
            // If JSON parsing fails, treat as plain text
            console.log('CANBusListener: Received non-JSON message:', event.data);
            return; // Skip non-JSON messages for now
          }
          
          this.handleCANMessage(message);
        } catch (error) {
          console.error('CANBusListener: Error handling message:', error);
        }
      };
      
      this.ws.onclose = (event) => {
        console.log('CANBusListener: WebSocket closed');
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
        // Handle command execution confirmations
        this.emit('commandExecuted', {
          command: message.command,
          timestamp: message.timestamp
        });
      } else if (message.type === 'initialState') {
        // Handle initial state from server
        this.emit('initialState', message);
      } else {
        // Log unhandled message types for debugging
        console.log('CANBusListener: Unhandled message type:', message.type || 'unknown');
      }
    } catch (error) {
      console.error('CANBusListener: Error handling message:', error);
    }
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
        console.log('CANBusListener: Invalid CAN data format:', canData);
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
            
            console.log(`CANBusListener: Light update - ${lightId}: ${percentage}% (${isOn ? 'ON' : 'OFF'})`);
            
            this.emit('message', {
              dgn: '1FEDA',
              instance: instance,
              operating_status: percentage,
              load_status: isOn ? '01' : '00',
              lightId: lightId,
              brightness: percentage,
              isOn: isOn
            });
          }
        }
      }
      
      // Check for climate control messages
      else if (id && (id.startsWith('19FEF9') || id.startsWith('19FED9') || id.startsWith('19FFE2'))) {
        // Parse climate control status
        this.emit('message', {
          dgn: '19FEF9',
          type: 'climate',
          rawData: data,
          canId: id,
          timestamp: Date.now()
        });
      }
      
      // Check for water system messages
      else if (id === '19FEDB9F' && Array.isArray(data) && data.length > 0) {
        // Check if this is a water pump or heater status
        const instanceHex = data[0];
        const instance = this.hexToDecimal(instanceHex);
        
        // Water pump is typically instance 44 (0x2C)
        // Water heater is typically instance 43 (0x2B)
        if (instance === 44 || instance === 43) {
          const deviceType = instance === 44 ? 'water_pump' : 'water_heater';
          const isOn = data[2] && this.hexToDecimal(data[2]) > 0;
          
          console.log(`CANBusListener: Water system update - ${deviceType}: ${isOn ? 'ON' : 'OFF'}`);
          
          this.emit('message', {
            dgn: '1FEDB',
            type: 'water',
            device: deviceType,
            isOn: isOn,
            instance: instance
          });
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
    if (this.connected && this.ws) {
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