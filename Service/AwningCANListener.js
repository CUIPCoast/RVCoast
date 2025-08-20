// Service/AwningCANListener.js - Enhanced CAN bus monitoring specifically for awning control
import { EventEmitter } from 'events';

/**
 * Enhanced CAN Bus Listener specifically for awning motor control and position feedback
 * Provides real-time status updates for extend/retract operations with position detection
 */
class AwningCANListener extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.connected = false;
    this.reconnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.baseUrl = 'http://10.129.134.57:3000'; // Match your server.js configuration
    
    // Awning-specific state tracking
    this.awningState = {
      extendMotor: {
        instance: 9,  // Typical extend motor instance
        isRunning: false,
        lastSeen: null,
        currentLevel: 0  // 0-100% speed/power level
      },
      retractMotor: {
        instance: 10, // Typical retract motor instance  
        isRunning: false,
        lastSeen: null,
        currentLevel: 0
      },
      position: {
        current: 0,  // 0 = fully retracted, 100 = fully extended
        isAtLimit: false,
        limitType: null, // 'extended' or 'retracted'
        lastPositionUpdate: null
      },
      lastCommand: null,
      commandTimestamp: null
    };
    
    // Message deduplication and throttling
    this.messageBuffer = new Map();
    this.bufferTimeout = 1000; // 1 second for awning messages
    this.lastHeartbeat = Date.now();
    
    // Start cleanup interval
    this.startBufferCleanup();
  }
  
  /**
   * Start the awning CAN bus listener
   */
  start() {
    console.log('AwningCANListener: Starting awning-specific CAN monitoring');
    this.setupWebSocket();
  }
  
  /**
   * Start buffer cleanup and heartbeat
   */
  startBufferCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, timestamp] of this.messageBuffer.entries()) {
        if (now - timestamp > this.bufferTimeout) {
          this.messageBuffer.delete(key);
        }
      }
      
      // Send heartbeat every 30 seconds
      if (now - this.lastHeartbeat > 30000) {
        this.emit('heartbeat', { 
          timestamp: now, 
          connected: this.connected,
          awningState: this.getAwningStatus()
        });
        this.lastHeartbeat = now;
      }
    }, this.bufferTimeout);
  }
  
  /**
   * Set up WebSocket connection
   */
  setupWebSocket() {
    try {
      const wsUrl = this.baseUrl.replace(/^http/, 'ws');
      
      console.log(`AwningCANListener: Connecting to ${wsUrl}`);
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('AwningCANListener: Connected to awning CAN monitoring');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
        
        // Subscribe specifically to awning-related CAN messages
        this.sendMessage({
          type: 'subscribe',
          topics: ['canMessage', 'commandExecuted'],
          filter: {
            // Focus on awning-related DGNs and instances
            dgns: ['19FEDB9F', '19FEDA98', '19FEF998'], // DC dimmer command, status, and position feedback
            instances: [9, 10], // Extend and retract motor instances
            keywords: ['awning', 'motor', 'limit']
          }
        });
      };
      
      this.ws.onmessage = (event) => {
        try {
          const messageData = event.data;
          
          if (!messageData || messageData.trim() === '') {
            return;
          }
          
          // Handle both JSON and raw CAN data
          const trimmedData = messageData.trim();
          if (trimmedData.startsWith('{') || trimmedData.startsWith('[')) {
            try {
              const message = JSON.parse(trimmedData);
              this.handleCANMessage(message);
            } catch (jsonError) {
              // Ignore unparseable JSON
            }
          } else if (this.isCANDataFormat(trimmedData)) {
            this.handleRawCANData(trimmedData);
          }
        } catch (error) {
          console.error('AwningCANListener: Error processing message:', error);
        }
      };
      
      this.ws.onclose = (event) => {
        console.log(`AwningCANListener: WebSocket closed (code: ${event.code})`);
        this.connected = false;
        this.emit('disconnected');
        
        if (event.code !== 1000) {
          this.scheduleReconnect();
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('AwningCANListener: WebSocket error:', error);
        this.connected = false;
        this.emit('error', error);
      };
      
    } catch (error) {
      console.error('AwningCANListener: Failed to create WebSocket:', error);
      this.scheduleReconnect();
    }
  }
  
  /**
   * Check if message looks like raw CAN data
   */
  isCANDataFormat(message) {
    const canPattern = /can\d+\s+[0-9A-F]+\s+\[\d+\]/i;
    return canPattern.test(message);
  }
  
  /**
   * Handle raw CAN data messages
   */
  handleRawCANData(rawData) {
    try {
      const parts = rawData.trim().split(/\s+/);
      
      if (parts.length < 4) {
        return;
      }
      
      const canInterface = parts[0];
      const id = parts[1];
      const dataLength = parts[2].replace('[', '').replace(']', '');
      const data = parts.slice(3);
      
      const canMessage = {
        interface: canInterface,
        id,
        dataLength: parseInt(dataLength),
        data,
        timestamp: Date.now()
      };
      
      this.parseAwningCANMessage(canMessage);
      
    } catch (error) {
      console.error('AwningCANListener: Error parsing raw CAN data:', error);
    }
  }
  
  /**
   * Handle incoming CAN messages from WebSocket
   */
  handleCANMessage(message) {
    try {
      if (message.type === 'canMessage' && message.data) {
        this.parseAwningCANMessage(message.data);
      } else if (message.type === 'commandExecuted') {
        this.handleCommandExecuted(message);
      }
    } catch (error) {
      console.error('AwningCANListener: Error handling message:', error);
    }
  }
  
  /**
   * Parse CAN messages specifically for awning motor control
   */
  parseAwningCANMessage(canData) {
    try {
      const { id, data } = canData;
      
      if (!id || !data) {
        return;
      }
      
      // Handle DC Dimmer Command messages (19FEDB9F) - Motor control
      if (id === '19FEDB9F' && Array.isArray(data) && data.length >= 3) {
        this.parseMotorControlMessage(data);
      }
      
      // Handle DC Dimmer Status messages (19FEDA98) - Motor feedback
      else if (id === '19FEDA98' && Array.isArray(data) && data.length >= 4) {
        this.parseMotorStatusMessage(data);
      }
      
      // Handle position feedback messages (custom or proprietary DGNs)
      else if (id.startsWith('19FEF9') || id.includes('awning')) {
        this.parsePositionFeedback(data, id);
      }
      
    } catch (error) {
      console.error('AwningCANListener: Error parsing awning CAN message:', error);
    }
  }
  
  /**
   * Parse motor control commands (DC_DIMMER_COMMAND_2)
   */
  parseMotorControlMessage(data) {
    try {
      const instanceHex = data[0];
      const instance = parseInt(instanceHex, 16);
      
      // Check if this is an awning motor instance
      if (instance === this.awningState.extendMotor.instance || 
          instance === this.awningState.retractMotor.instance) {
        
        const commandHex = data[2] || '00';
        const command = parseInt(commandHex, 16);
        const powerLevelHex = data[1] || '00';
        const powerLevel = parseInt(powerLevelHex, 16);
        
        const isMotorOn = command > 0 && powerLevel > 0;
        const motorType = instance === this.awningState.extendMotor.instance ? 'extend' : 'retract';
        
        // Check for state change
        const currentMotorState = this.awningState[`${motorType}Motor`];
        const hasStateChanged = currentMotorState.isRunning !== isMotorOn ||
                               Math.abs(currentMotorState.currentLevel - powerLevel) > 5;
        
        if (hasStateChanged) {
          console.log(`AwningCANListener: ${motorType} motor ${isMotorOn ? 'STARTED' : 'STOPPED'} (Power: ${powerLevel})`);
          
          // Update motor state
          this.awningState[`${motorType}Motor`] = {
            ...currentMotorState,
            isRunning: isMotorOn,
            currentLevel: powerLevel,
            lastSeen: Date.now()
          };
          
          // Emit motor state change
          this.emit('motorStateChange', {
            motorType,
            isRunning: isMotorOn,
            powerLevel,
            instance,
            timestamp: Date.now(),
            command: this.decodeMotorCommand(command)
          });
          
          // Also emit awning state change
          this.emitAwningStateChange();
        }
      }
    } catch (error) {
      console.error('AwningCANListener: Error parsing motor control message:', error);
    }
  }
  
  /**
   * Parse motor status feedback (DC_DIMMER_STATUS_3)
   */
  parseMotorStatusMessage(data) {
    try {
      const instanceHex = data[0];
      const instance = parseInt(instanceHex, 16);
      
      // Check if this is an awning motor instance
      if (instance === this.awningState.extendMotor.instance || 
          instance === this.awningState.retractMotor.instance) {
        
        const statusHex = data[3];
        const currentLevelHex = data[2];
        
        if (statusHex && statusHex.toString().toUpperCase() === 'FC') {
          // This is a status update
          const currentLevel = parseInt(currentLevelHex, 16);
          const motorType = instance === this.awningState.extendMotor.instance ? 'extend' : 'retract';
          const isRunning = currentLevel > 0;
          
          // Update motor state
          const currentMotorState = this.awningState[`${motorType}Motor`];
          const hasStateChanged = currentMotorState.isRunning !== isRunning ||
                                 Math.abs(currentMotorState.currentLevel - currentLevel) > 5;
          
          if (hasStateChanged) {
            console.log(`AwningCANListener: ${motorType} motor status update - Running: ${isRunning}, Level: ${currentLevel}`);
            
            this.awningState[`${motorType}Motor`] = {
              ...currentMotorState,
              isRunning,
              currentLevel,
              lastSeen: Date.now()
            };
            
            // Emit motor status update
            this.emit('motorStatus', {
              motorType,
              isRunning,
              currentLevel,
              instance,
              timestamp: Date.now()
            });
            
            this.emitAwningStateChange();
          }
        }
      }
    } catch (error) {
      console.error('AwningCANListener: Error parsing motor status message:', error);
    }
  }
  
  /**
   * Parse position feedback messages
   */
  parsePositionFeedback(data, canId) {
    try {
      // This would be customized based on your specific awning system
      // Some systems send position as percentage, others use encoder counts
      
      // Example implementation for position feedback
      if (Array.isArray(data) && data.length >= 2) {
        const positionHex = data[0];
        const position = parseInt(positionHex, 16);
        
        // Convert to percentage (assuming 0-255 range maps to 0-100%)
        const positionPercent = Math.round((position / 255) * 100);
        
        // Check for limit switches (example values)
        const limitHex = data[1];
        const limitStatus = parseInt(limitHex, 16);
        
        const isAtExtendedLimit = (limitStatus & 0x01) !== 0;
        const isAtRetractedLimit = (limitStatus & 0x02) !== 0;
        
        // Update position state if changed significantly
        const currentPosition = this.awningState.position;
        const positionChanged = Math.abs(currentPosition.current - positionPercent) > 2;
        const limitChanged = currentPosition.isAtLimit !== (isAtExtendedLimit || isAtRetractedLimit);
        
        if (positionChanged || limitChanged) {
          console.log(`AwningCANListener: Position update - ${positionPercent}% (Extended limit: ${isAtExtendedLimit}, Retracted limit: ${isAtRetractedLimit})`);
          
          this.awningState.position = {
            current: positionPercent,
            isAtLimit: isAtExtendedLimit || isAtRetractedLimit,
            limitType: isAtExtendedLimit ? 'extended' : (isAtRetractedLimit ? 'retracted' : null),
            lastPositionUpdate: Date.now()
          };
          
          // Emit position update
          this.emit('positionUpdate', {
            position: positionPercent,
            isAtLimit: isAtExtendedLimit || isAtRetractedLimit,
            limitType: isAtExtendedLimit ? 'extended' : (isAtRetractedLimit ? 'retracted' : null),
            timestamp: Date.now()
          });
          
          // If at limit, motors should automatically stop
          if (isAtExtendedLimit || isAtRetractedLimit) {
            this.handleLimitReached(isAtExtendedLimit ? 'extended' : 'retracted');
          }
          
          this.emitAwningStateChange();
        }
      }
    } catch (error) {
      console.error('AwningCANListener: Error parsing position feedback:', error);
    }
  }
  
  /**
   * Handle when awning reaches a limit
   */
  handleLimitReached(limitType) {
    console.log(`AwningCANListener: Awning reached ${limitType} limit`);
    
    // Stop the appropriate motor
    if (limitType === 'extended') {
      this.awningState.extendMotor.isRunning = false;
      this.awningState.extendMotor.currentLevel = 0;
    } else if (limitType === 'retracted') {
      this.awningState.retractMotor.isRunning = false;
      this.awningState.retractMotor.currentLevel = 0;
    }
    
    // Emit limit reached event
    this.emit('limitReached', {
      limitType,
      position: this.awningState.position.current,
      timestamp: Date.now()
    });
    
    this.emitAwningStateChange();
  }
  
  /**
   * Handle command execution confirmations
   */
  handleCommandExecuted(message) {
    try {
      if (message.command && message.command.includes('awning')) {
        console.log('AwningCANListener: Awning command executed:', message.command);
        
        // Track the last command for correlation
        this.awningState.lastCommand = message.command;
        this.awningState.commandTimestamp = Date.now();
        
        // Emit command confirmation
        this.emit('commandExecuted', {
          command: message.command,
          timestamp: message.timestamp || Date.now()
        });
      }
    } catch (error) {
      console.error('AwningCANListener: Error handling command executed:', error);
    }
  }
  
  /**
   * Emit comprehensive awning state change
   */
  emitAwningStateChange() {
    const state = {
      isExtending: this.awningState.extendMotor.isRunning,
      isRetracting: this.awningState.retractMotor.isRunning,
      isStopped: !this.awningState.extendMotor.isRunning && !this.awningState.retractMotor.isRunning,
      position: this.awningState.position.current,
      isAtLimit: this.awningState.position.isAtLimit,
      limitType: this.awningState.position.limitType,
      extendMotorLevel: this.awningState.extendMotor.currentLevel,
      retractMotorLevel: this.awningState.retractMotor.currentLevel,
      lastCommand: this.awningState.lastCommand,
      timestamp: Date.now()
    };
    
    // Only emit if this is a significant state change
    const messageKey = JSON.stringify(state);
    if (!this.messageBuffer.has(messageKey)) {
      this.messageBuffer.set(messageKey, Date.now());
      
      console.log('AwningCANListener: Awning state change:', state);
      this.emit('awningStateChange', state);
      this.lastHeartbeat = Date.now();
    }
  }
  
  /**
   * Decode motor command codes
   */
  decodeMotorCommand(commandCode) {
    const commands = {
      0x00: 'stop',
      0x01: 'on',
      0x02: 'off', 
      0x03: 'off',
      0x04: 'stop',
      0x05: 'toggle',
      0x0D: 'ramp_up',
      0x0E: 'ramp_down',
      0x15: 'ramp'
    };
    
    return commands[commandCode] || `unknown_${commandCode.toString(16)}`;
  }
  
  /**
   * Get current awning status
   */
  getAwningStatus() {
    return {
      connected: this.connected,
      motors: {
        extend: {
          isRunning: this.awningState.extendMotor.isRunning,
          currentLevel: this.awningState.extendMotor.currentLevel,
          lastSeen: this.awningState.extendMotor.lastSeen
        },
        retract: {
          isRunning: this.awningState.retractMotor.isRunning,
          currentLevel: this.awningState.retractMotor.currentLevel,
          lastSeen: this.awningState.retractMotor.lastSeen
        }
      },
      position: this.awningState.position,
      lastCommand: this.awningState.lastCommand,
      commandTimestamp: this.awningState.commandTimestamp
    };
  }
  
  /**
   * Send message through WebSocket
   */
  sendMessage(message) {
    if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('AwningCANListener: Error sending message:', error);
      }
    }
  }
  
  /**
   * Schedule reconnection
   */
  scheduleReconnect() {
    if (this.reconnecting) return;
    
    this.reconnecting = true;
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      const delay = Math.min(30000, this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1));
      
      console.log(`AwningCANListener: Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.reconnecting = false;
        this.setupWebSocket();
      }, delay);
    } else {
      console.log('AwningCANListener: Maximum reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
    }
  }
  
  /**
   * Check if connected
   */
  isConnected() {
    return this.connected;
  }
  
  /**
   * Stop the listener
   */
  stop() {
    if (this.ws) {
      this.ws.close(1000, 'Awning listener stopping');
      this.ws = null;
    }
    
    this.connected = false;
    this.removeAllListeners();
    console.log('AwningCANListener: Stopped');
  }
}

/**
 * Factory function to create awning-specific CAN bus listener
 */
export function createAwningCANListener() {
  return new AwningCANListener();
}

export default AwningCANListener;