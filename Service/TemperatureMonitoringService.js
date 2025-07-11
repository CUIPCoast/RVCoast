// Service/TemperatureMonitoringService.js - Real-time temperature monitoring from CAN bus
import { createCANBusListener } from './CANBusListener';
import { EventEmitter } from 'events';

/**
 * Service to monitor real-time temperature data from RV climate control system
 * Processes THERMOSTAT_AMBIENT_STATUS messages from CAN bus
 */
class TemperatureMonitoringService extends EventEmitter {
  constructor() {
    super();
    this.canListener = null;
    this.connected = false;
    this.currentTemperature = {
      celsius: 22.22, // Current temperature: 72°F = 22.22°C
      fahrenheit: 72,
      lastUpdate: new Date(),
      instance: null
    };
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
  }

  /**
   * Start monitoring temperature data
   */
  start() {
    console.log('TemperatureMonitoringService: Starting temperature monitoring');
    this.setupCANListener();
  }

  /**
   * Stop monitoring temperature data
   */
  stop() {
    console.log('TemperatureMonitoringService: Stopping temperature monitoring');
    
    if (this.canListener) {
      this.canListener.stop();
      this.canListener = null;
    }
    
    this.connected = false;
    this.removeAllListeners();
  }

  /**
   * Set up CAN bus listener for temperature messages
   */
  setupCANListener() {
    try {
      this.canListener = createCANBusListener();

      // Listen for thermostat ambient status messages
      this.canListener.on('message', (message) => {
        this.handleCANMessage(message);
      });

      this.canListener.on('connected', () => {
        console.log('TemperatureMonitoringService: CAN listener connected');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
      });

      this.canListener.on('disconnected', () => {
        console.log('TemperatureMonitoringService: CAN listener disconnected');
        this.connected = false;
        this.emit('disconnected');
        this.scheduleReconnect();
      });

      this.canListener.on('error', (error) => {
        console.error('TemperatureMonitoringService: CAN listener error:', error);
        this.connected = false;
        this.emit('error', error);
        this.scheduleReconnect();
      });

      // Start the listener
      this.canListener.start();

    } catch (error) {
      console.error('TemperatureMonitoringService: Failed to setup CAN listener:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Handle incoming CAN messages
   */
  handleCANMessage(message) {
    try {
      // Look for THERMOSTAT_AMBIENT_STATUS messages (DGN 1FF9C)
      if (message.dgn === '1FF9C' || message.name === 'THERMOSTAT_AMBIENT_STATUS') {
        this.processThermostatAmbientStatus(message);
      }
      // Also handle THERMOSTAT_STATUS_1 messages (DGN 1FFE2) for setpoint temperatures
      else if (message.dgn === '1FFE2' || message.name === 'THERMOSTAT_STATUS_1') {
        this.processThermostatStatus(message);
      }
    } catch (error) {
      console.error('TemperatureMonitoringService: Error handling CAN message:', error);
    }
  }

  /**
   * Process thermostat ambient status messages
   * From CAN traffic: {"dgn": "1FF9C", "name": "THERMOSTAT_AMBIENT_STATUS", "instance": 161, "ambient temp": 23.0, "ambient temp F": 73.4}
   */
  processThermostatAmbientStatus(message) {
    try {
      const ambientTempC = message['ambient temp'];
      const ambientTempF = message['ambient temp F'];
      const instance = message.instance;

      if (ambientTempC !== undefined && ambientTempF !== undefined) {
        const newTemperature = {
          celsius: parseFloat(ambientTempC),
          fahrenheit: parseFloat(ambientTempF),
          lastUpdate: new Date(),
          instance: instance,
          source: 'ambient_sensor'
        };

        // Check if temperature actually changed (avoid noise)
        const tempChanged = Math.abs(this.currentTemperature.fahrenheit - newTemperature.fahrenheit) > 0.1;

        if (tempChanged) {
          console.log(`TemperatureMonitoringService: Temperature update - ${newTemperature.fahrenheit.toFixed(1)}°F / ${newTemperature.celsius.toFixed(1)}°C (Instance: ${instance})`);
          
          this.currentTemperature = newTemperature;
          
          // Emit temperature change event
          this.emit('temperatureChange', {
            temperature: newTemperature,
            previousTemperature: this.currentTemperature
          });
        }
      }
    } catch (error) {
      console.error('TemperatureMonitoringService: Error processing ambient status:', error);
    }
  }

  /**
   * Process thermostat status messages for setpoint temperatures
   * From CAN traffic: {"dgn": "1FFE2", "name": "THERMOSTAT_STATUS_1", "setpoint temp heat": 21.94, "setpoint temp cool": 21.94}
   */
  processThermostatStatus(message) {
    try {
      const setpointHeatC = message['setpoint temp heat'];
      const setpointCoolC = message['setpoint temp cool'];
      const setpointHeatF = message['setpoint temp heat F'];
      const setpointCoolF = message['setpoint temp cool F'];
      const operatingMode = message['operating mode definition'];
      const fanMode = message['fan mode definition'];
      const instance = message.instance;

      if (setpointHeatC !== undefined || setpointCoolC !== undefined) {
        const setpointData = {
          heatSetpoint: {
            celsius: setpointHeatC !== "n/a" ? parseFloat(setpointHeatC) : null,
            fahrenheit: setpointHeatF !== undefined ? parseFloat(setpointHeatF) : null
          },
          coolSetpoint: {
            celsius: setpointCoolC !== "n/a" ? parseFloat(setpointCoolC) : null,
            fahrenheit: setpointCoolF !== undefined ? parseFloat(setpointCoolF) : null
          },
          operatingMode: operatingMode,
          fanMode: fanMode,
          instance: instance,
          lastUpdate: new Date()
        };

        console.log(`TemperatureMonitoringService: Setpoint update - Heat: ${setpointData.heatSetpoint.fahrenheit}°F, Cool: ${setpointData.coolSetpoint.fahrenheit}°F, Mode: ${operatingMode}`);
        
        // Emit setpoint change event
        this.emit('setpointChange', setpointData);
      }
    } catch (error) {
      console.error('TemperatureMonitoringService: Error processing thermostat status:', error);
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('TemperatureMonitoringService: Maximum reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(30000, this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1));

    console.log(`TemperatureMonitoringService: Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.setupCANListener();
    }, delay);
  }

  /**
   * Get current temperature
   * @returns {Object} Current temperature data
   */
  getCurrentTemperature() {
    return {
      ...this.currentTemperature,
      isConnected: this.connected
    };
  }

  /**
   * Check if service is connected
   * @returns {boolean} Connection status
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Convert Celsius to Fahrenheit
   * @param {number} celsius - Temperature in Celsius
   * @returns {number} Temperature in Fahrenheit
   */
  static celsiusToFahrenheit(celsius) {
    return (celsius * 9/5) + 32;
  }

  /**
   * Convert Fahrenheit to Celsius
   * @param {number} fahrenheit - Temperature in Fahrenheit
   * @returns {number} Temperature in Celsius
   */
  static fahrenheitToCelsius(fahrenheit) {
    return (fahrenheit - 32) * 5/9;
  }

  /**
   * Format temperature for display
   * @param {number} temp - Temperature value
   * @param {string} unit - 'C' or 'F'
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted temperature string
   */
  static formatTemperature(temp, unit = 'F', decimals = 1) {
    if (temp === null || temp === undefined) {
      return '--°' + unit;
    }
    return `${temp.toFixed(decimals)}°${unit}`;
  }
}

// Create singleton instance
const temperatureMonitoringService = new TemperatureMonitoringService();

export { TemperatureMonitoringService };
export default temperatureMonitoringService;