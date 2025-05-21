// CANBusMonitor.js - Enhanced with real-time CAN bus listening capabilities
import { RVControlService } from '../API/rvAPI';
import { EventEmitter } from 'events';

/**
 * Utility class to monitor and parse CAN bus data
 * Specifically for handling the Firefly Integrations dimming system
 */
export class CANBusMonitor {
  // Singleton instance of the real-time listener
  static _listener = null;
  
  // Get or create the CAN bus listener instance
  static getListener() {
    if (!this._listener) {
      this._listener = new CANBusListener();
      this._listener.start();
    }
    return this._listener;
  }
  
  /**
   * Subscribe to CAN bus events
   * @param {Function} callback - Function to call with parsed updates
   * @returns {Object} Subscription object
   */
  static subscribeToDimmingUpdates(callback) {
    // First try to use real-time listener
    const listener = this.getListener();
    
    if (listener.isConnected()) {
      // Use real-time event-based subscription
      console.log('Using real-time CAN bus subscription');
      const onUpdate = (updates) => {
        if (updates && Object.keys(updates).length > 0) {
          callback(updates);
        }
      };
      
      // Subscribe to dimming updates
      listener.on('dimmingUpdates', onUpdate);
      
      // Return unsubscribe function
      return {
        unsubscribe: () => {
          listener.off('dimmingUpdates', onUpdate);
        }
      };
    } else {
      // Fall back to polling if real-time connection isn't available
      console.log('Using polling fallback for CAN bus data');
      
      const intervalId = setInterval(async () => {
        try {
          const canDataSamples = await this.fetchLatestCANData();
          
          if (canDataSamples && canDataSamples.length > 0) {
            // Parse the data for dimming updates
            const updates = this.parseDimmingUpdates(canDataSamples);
            
            // Call the callback with the updates
            if (updates && Object.keys(updates).length > 0) {
              callback(updates);
            }
          }
        } catch (error) {
          console.error('Error fetching CAN bus data:', error);
        }
      }, 5000); // Poll every 5 seconds
      
      // Return an object that can be used to unsubscribe
      return {
        unsubscribe: () => {
          clearInterval(intervalId);
        }
      };
    }
  }
  
  /**
   * Fetch the latest CAN bus data
   * @returns {Promise<Array>} Promise that resolves with CAN data
   */
  static async fetchLatestCANData() {
    try {
      // Check if system is available
      const status = await RVControlService.getStatus();
      
      if (!status || !status.status === 'success') {
        throw new Error('CAN bus not available');
      }
      
      // In a real implementation, fetch from the API
      try {
        const response = await fetch(`${RVControlService.baseURL}/can-data?limit=20`);
        if (!response.ok) {
          throw new Error('Failed to fetch CAN data');
        }
        
        const data = await response.json();
        return data.canData || [];
      } catch (fetchError) {
        console.error('Error fetching CAN data from API:', fetchError);
        return [];
      }
    } catch (error) {
      console.error('Error in fetchLatestCANData:', error);
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
        console.error('Error parsing dimming update:', error);
      }
    });
    
    return updates;
  }
}

/**
 * Real-time CAN bus listener using WebSocket connection
 * Extends EventEmitter to provide event-based notifications
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
  }
  
  /**
   * Start the CAN bus listener
   */
  start() {
    this.setupWebsocket();
    
    // Set up message queue processing
    this.processingInterval = setInterval(() => {
      this.processMessageQueue();
    }, 500); // Process every 500ms
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
      const wsUrl = RVControlService.baseURL.replace(/^http/, 'ws') + '/can-ws';
      
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
    
    // Subscribe to specific CAN IDs (optional)
    this.sendMessage({
      type: 'subscribe',
      canIds: ['19FEDA98'] // Focus on dimming updates
    });
  }
  
  /**
   * Handle WebSocket message event
   * @param {MessageEvent} event - WebSocket message event
   */
  handleMessage(event) {
    try {
      const message = JSON.parse(event.data);
      this.lastMessageTimestamp = Date.now();
      
      // Add to message queue for processing
      this.messageQueue.push(message);
    } catch (error) {
      console.error('CANBusListener: Error parsing message:', error);
    }
  }
  
  /**
   * Process the queue of received messages
   */
  processMessageQueue() {
    if (this.messageQueue.length === 0) return;
    
    // Create a copy of the queue and clear it
    const messages = [...this.messageQueue];
    this.messageQueue = [];
    
    // Collect dimming updates
    const canData = [];
    
    // Process each message
    messages.forEach(message => {
      // Handle different message types
      if (message.type === 'canMessage') {
        // Add to list for processing
        canData.push(message.data);
        
        // Emit raw message event
        this.emit('canMessage', message.data);
      } else if (message.type === 'statusUpdate') {
        // Handle system status updates
        this.emit('statusUpdate', message.status);
      }
    });
    
    // Process dimming updates if we have CAN data
    if (canData.length > 0) {
      const updates = CANBusMonitor.parseDimmingUpdates(canData);
      if (Object.keys(updates).length > 0) {
        this.emit('dimmingUpdates', updates);
      }
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