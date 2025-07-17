// Service/TemperatureMonitoringService.js - Real-time temperature monitoring with simulation fallback
import { createCANBusListener } from './CANBusListener';
import { EventEmitter } from 'events';

/**
 * Service to monitor real-time temperature data from RV climate control system
 * Falls back to simulated data when CAN bus is unavailable
 */
class TemperatureMonitoringService extends EventEmitter {
  constructor() {
    super();
    this.canListener = null;
    this.connected = false;
    this.simulationMode = false;
    this.simulationInterval = null;
    this.simulationStartTime = null;
    
    this.currentTemperature = {
      celsius: 22.22, // Current temperature: 72°F = 22.22°C
      fahrenheit: 72,
      lastUpdate: new Date(),
      instance: null,
      source: 'initial'
    };
    
    this.currentSetpoints = {
      heatSetpoint: { celsius: 20, fahrenheit: 68 },
      coolSetpoint: { celsius: 24, fahrenheit: 75 },
      operatingMode: 'auto',
      fanMode: 'auto',
      instance: 161
    };
    
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    
    // Simulation parameters
    this.simulationConfig = {
      baseTemperature: { celsius: 22.22, fahrenheit: 72 },
      temperatureRange: { celsius: 3, fahrenheit: 5.4 }, // ±3°C or ±5.4°F
      updateInterval: 2000, // Update every 2 seconds
      cycleDuration: 300000, // 5 minute cycle
      noiseLevel: 0.1, // Small random fluctuations
      seasonalTrend: 0.5, // Slow warming/cooling trend
      hvacResponse: true // Simulate HVAC system response
    };
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
    
    this.stopSimulation();
    this.connected = false;
    this.simulationMode = false;
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
        this.simulationMode = false;
        this.stopSimulation();
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
        // Don't emit error - silently fall back to simulation
        this.scheduleReconnect();
      });

      // Start the listener
      this.canListener.start();

    } catch (error) {
      console.error('TemperatureMonitoringService: Failed to setup CAN listener:', error);
      // Don't emit error - silently fall back to simulation
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
          source: 'can_bus'
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
          lastUpdate: new Date(),
          source: 'can_bus'
        };

        // Update internal setpoints for simulation reference
        this.currentSetpoints = setpointData;

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
      console.log('TemperatureMonitoringService: Maximum reconnection attempts reached, starting simulation mode');
      this.startSimulation();
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
   * Start temperature simulation when CAN bus is unavailable
   */
  startSimulation() {
    if (this.simulationMode) return;

    console.log('TemperatureMonitoringService: Starting simulation mode');
    this.simulationMode = true;
    this.simulationStartTime = Date.now();
    this.connected = true; // Consider simulation as "connected"
    
    // Emit initial connection event
    this.emit('connected');
    
    // Start simulation loop
    this.simulationInterval = setInterval(() => {
      this.updateSimulatedTemperature();
    }, this.simulationConfig.updateInterval);

    // Emit initial setpoint data
    setTimeout(() => {
      this.emitSimulatedSetpoints();
    }, 1000);
  }

  /**
   * Stop temperature simulation
   */
  stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.simulationMode = false;
    this.simulationStartTime = null;
  }

  /**
   * Generate and emit simulated temperature data
   */
  updateSimulatedTemperature() {
    const now = Date.now();
    const elapsed = now - this.simulationStartTime;
    const cyclePosition = (elapsed % this.simulationConfig.cycleDuration) / this.simulationConfig.cycleDuration;
    
    // Base temperature with seasonal trend
    const seasonalOffset = Math.sin(elapsed / 3600000) * this.simulationConfig.seasonalTrend; // 1-hour cycle
    
    // Daily temperature cycle (warmer during day, cooler at night)
    const dailyCycle = Math.sin(cyclePosition * 2 * Math.PI) * this.simulationConfig.temperatureRange.celsius;
    
    // Random noise for realism
    const noise = (Math.random() - 0.5) * this.simulationConfig.noiseLevel;
    
    // HVAC system response (temperature moves toward setpoint)
    let hvacAdjustment = 0;
    if (this.simulationConfig.hvacResponse) {
      const currentTemp = this.currentTemperature.celsius;
      const heatSetpoint = this.currentSetpoints.heatSetpoint.celsius;
      const coolSetpoint = this.currentSetpoints.coolSetpoint.celsius;
      
      if (currentTemp < heatSetpoint - 0.5) {
        hvacAdjustment = 0.1; // Heating
      } else if (currentTemp > coolSetpoint + 0.5) {
        hvacAdjustment = -0.1; // Cooling
      }
    }
    
    // Calculate new temperature
    const newTempC = this.simulationConfig.baseTemperature.celsius + 
                    seasonalOffset + 
                    dailyCycle + 
                    noise + 
                    hvacAdjustment;
    
    const newTempF = this.celsiusToFahrenheit(newTempC);
    
    // Check if temperature changed significantly
    const tempChanged = Math.abs(this.currentTemperature.fahrenheit - newTempF) > 0.1;
    
    if (tempChanged) {
      const newTemperature = {
        celsius: parseFloat(newTempC.toFixed(2)),
        fahrenheit: parseFloat(newTempF.toFixed(1)),
        lastUpdate: new Date(),
        instance: 161,
        source: 'simulation'
      };
      
      console.log(`TemperatureMonitoringService: Simulated temperature - ${newTemperature.fahrenheit.toFixed(1)}°F / ${newTemperature.celsius.toFixed(1)}°C`);
      
      const previousTemperature = { ...this.currentTemperature };
      this.currentTemperature = newTemperature;
      
      // Emit temperature change event
      this.emit('temperatureChange', {
        temperature: newTemperature,
        previousTemperature: previousTemperature
      });
    }
  }

  /**
   * Emit simulated setpoint data
   */
  emitSimulatedSetpoints() {
    // Occasionally change setpoints to simulate user adjustments
    if (Math.random() < 0.1) { // 10% chance every update cycle
      const adjustment = (Math.random() - 0.5) * 2; // ±1°C adjustment
      this.currentSetpoints.heatSetpoint.celsius += adjustment;
      this.currentSetpoints.coolSetpoint.celsius += adjustment;
      this.currentSetpoints.heatSetpoint.fahrenheit = this.celsiusToFahrenheit(this.currentSetpoints.heatSetpoint.celsius);
      this.currentSetpoints.coolSetpoint.fahrenheit = this.celsiusToFahrenheit(this.currentSetpoints.coolSetpoint.celsius);
    }

    // Occasionally change operating mode
    if (Math.random() < 0.05) { // 5% chance
      const modes = ['auto', 'heat', 'cool', 'off'];
      this.currentSetpoints.operatingMode = modes[Math.floor(Math.random() * modes.length)];
    }

    const setpointData = {
      ...this.currentSetpoints,
      lastUpdate: new Date(),
      source: 'simulation'
    };

    this.emit('setpointChange', setpointData);
  }

  /**
   * Get current temperature
   * @returns {Object} Current temperature data
   */
  getCurrentTemperature() {
    return {
      ...this.currentTemperature,
      isConnected: this.connected,
      simulationMode: this.simulationMode
    };
  }

  /**
   * Check if service is connected (includes simulation mode)
   * @returns {boolean} Connection status
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Check if running in simulation mode
   * @returns {boolean} Simulation mode status
   */
  isSimulationMode() {
    return this.simulationMode;
  }

  /**
   * Update simulation configuration
   * @param {Object} config - New configuration options
   */
  updateSimulationConfig(config) {
    this.simulationConfig = { ...this.simulationConfig, ...config };
    console.log('TemperatureMonitoringService: Simulation config updated', this.simulationConfig);
  }

  /**
   * Convert Celsius to Fahrenheit
   * @param {number} celsius - Temperature in Celsius
   * @returns {number} Temperature in Fahrenheit
   */
  celsiusToFahrenheit(celsius) {
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