// API/VictronEnergyService.js - Simplified Version
import axios from 'axios';

// Configuration for Victron Venus OS connection
const CONFIG = {
  // Cerbo GX IP address - replace with your actual IP
  HOST: '192.168.8.242',
  // Connection timeout in ms
  TIMEOUT: 5000,
  // Refresh interval in ms
  REFRESH_INTERVAL: 5000
};

// State mapping functions
const BATTERY_STATE_MAP = {
  0: 'idle',
  1: 'charging',
  2: 'discharging'
};

const SYSTEM_STATE_MAP = {
  0: 'Off',
  1: 'Low power',
  2: 'VE.Bus Fault',
  3: 'Bulk charging',
  4: 'Absorption charging',
  5: 'Float charging',
  6: 'Storage mode',
  7: 'Equalisation charging',
  8: 'Passthru',
  9: 'Inverting',
  10: 'Assisting',
  11: 'Power supply mode',
  252: 'External control'
};

const PV_STATE_MAP = {
  0: 'off',
  2: 'fault',
  3: 'bulk',
  4: 'absorption',
  5: 'float',
  6: 'storage',
  7: 'equalize',
  252: 'external control'
};

// Data storage for Victron data
let victronData = {
  battery: {
    soc: 80, // State of charge (percentage)
    voltage: 13.2, // Battery voltage
    current: -2.5, // Negative value means discharging, positive means charging
    power: -30, // Power in watts (negative = discharge)
    state: 'discharging', // Battery state
    timeToGo: '8:45', // Time remaining at current usage rate
  },
  acLoads: {
    power: 120, // Watts
    lines: ['L1'], // Active lines
  },
  pvCharger: {
    power: 350, // Current power generation in watts
    dailyYield: 1.8, // kWh generated today
    state: 'charging', // Charger state
  },
  dcSystem: {
    power: 30, // Current DC power usage in watts
    source: 'solar', // Power source (e.g., 'battery', 'solar')
  },
  systemOverview: {
    name: 'Cerbo GX',
    state: 'Charging', // System state
    acInput: 'Grid', // AC input state
    mode: 'ON', // AC mode
    acLimit: 50.0, // AC current limit in amps
  },
  tanks: [],
  lastUpdate: new Date(),
  apiStatus: 'simulation', // 'connected', 'simulation', 'error'
};

// Always simulate changing data since we don't have direct access yet
let simulateChangingData = true;

// Connection status
let connectionStatus = {
  connected: false,
  lastAttempt: null,
  lastSuccess: null,
  failCount: 0
};

/**
 * Function to simulate changing data values
 * This provides a more realistic test experience when real API isn't available
 */
const simulateDataChanges = () => {
  if (!simulateChangingData) return;
  
  // Randomly determine if PV is active
  const isPVActive = Math.random() > 0.3; // 70% chance of solar being active
  
  // Simulate PV charger fluctuations
  victronData.pvCharger.power = isPVActive ? 300 + Math.floor(Math.random() * 100) : 0;
  victronData.pvCharger.state = isPVActive ? 'charging' : 'idle';
  
  // Simulate battery changes based on PV status
  if (isPVActive && victronData.battery.soc < 100) {
    // When PV is active and battery is not full, simulate charging
    victronData.battery.soc = Math.min(100, victronData.battery.soc + 0.1);
    victronData.battery.current = 2 + (Math.random() * 1);
    victronData.battery.power = 25 + Math.floor(Math.random() * 10);
    victronData.battery.state = 'charging';
  } else {
    // Otherwise simulate discharging
    victronData.battery.soc = Math.max(5, victronData.battery.soc - 0.1);
    victronData.battery.current = -(2 + Math.random() * 1);
    victronData.battery.power = -(25 + Math.floor(Math.random() * 10));
    victronData.battery.state = 'discharging';
  }
  
  // Update voltage based on SoC (simplified model)
  victronData.battery.voltage = 12.2 + (victronData.battery.soc / 100) * 1.6;
  
  // Simulate AC load changes
  victronData.acLoads.power = 100 + Math.floor(Math.random() * 50);
  
  // Update DC system power based on battery power (simplified)
  victronData.dcSystem.power = Math.abs(victronData.battery.power);
  victronData.dcSystem.source = isPVActive ? 'solar' : 'battery';
  
  // Update system overview based on simulated values
  victronData.systemOverview.state = isPVActive ? 'Charging' : 'Inverting';
  
  // Simulate time to go based on battery state and SoC
  if (victronData.battery.state === 'discharging') {
    const hours = Math.floor(victronData.battery.soc / 10);
    const minutes = Math.floor(Math.random() * 60);
    victronData.battery.timeToGo = `${hours}:${minutes.toString().padStart(2, '0')}`;
  } else {
    const timeToFull = Math.floor((100 - victronData.battery.soc) / 5);
    victronData.battery.timeToGo = `${timeToFull}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`;
  }
  
  // Update last update timestamp
  victronData.lastUpdate = new Date();
};

// Start the simulation for changing data
let simulationInterval = setInterval(simulateDataChanges, CONFIG.REFRESH_INTERVAL);

/**
 * Main function to fetch Victron data
 * @returns {Promise<boolean>} Success status
 */
const fetchVictronData = async () => {
  // Currently we only simulate data
  simulateDataChanges();
  return true;
};

// Periodically refresh data
let dataRefreshInterval = setInterval(fetchVictronData, CONFIG.REFRESH_INTERVAL);

/**
 * Service to interact with Victron Energy Cerbo GX
 */
export const VictronEnergyService = {
  /**
   * Get current battery status
   * @returns {Promise<Object>} Battery data including SOC, voltage, current
   */
  getBatteryStatus: async () => {
    await fetchVictronData();
    return victronData.battery;
  },

  /**
   * Get current AC loads information
   * @returns {Promise<Object>} AC loads data
   */
  getACLoads: async () => {
    await fetchVictronData();
    return victronData.acLoads;
  },

  /**
   * Get current PV (solar) charger information
   * @returns {Promise<Object>} PV charger data
   */
  getPVCharger: async () => {
    await fetchVictronData();
    return victronData.pvCharger;
  },

  /**
   * Get DC system information
   * @returns {Promise<Object>} DC system data
   */
  getDCSystem: async () => {
    await fetchVictronData();
    return victronData.dcSystem;
  },

  /**
   * Get system overview including hub status
   * @returns {Promise<Object>} System overview data
   */
  getSystemOverview: async () => {
    await fetchVictronData();
    return victronData.systemOverview;
  },

  /**
   * Get tank level information
   * @returns {Promise<Array>} Array of tank data
   */
  getTanks: async () => {
    await fetchVictronData();
    return victronData.tanks;
  },

  /**
   * Get all system data in a single request
   * @returns {Promise<Object>} Comprehensive system data
   */
  getAllData: async () => {
    await fetchVictronData();
    return {
      battery: victronData.battery,
      acLoads: victronData.acLoads,
      pvCharger: victronData.pvCharger,
      dcSystem: victronData.dcSystem,
      systemOverview: victronData.systemOverview,
      tanks: victronData.tanks,
      timestamp: new Date().toISOString(),
      refreshInterval: CONFIG.REFRESH_INTERVAL / 1000,
      apiStatus: victronData.apiStatus
    };
  },
  
  /**
   * Toggle data simulation
   * @param {boolean} enable Whether to enable simulation
   */
  toggleSimulation: (enable) => {
    simulateChangingData = enable;
    
    if (enable && !simulationInterval) {
      simulationInterval = setInterval(simulateDataChanges, CONFIG.REFRESH_INTERVAL);
    } else if (!enable && simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
    }
    
    console.log(`Data simulation ${enable ? 'enabled' : 'disabled'}`);
    return simulateChangingData;
  },
  
  /**
   * Check API connection status
   * @returns {string} API status: 'connected', 'simulation', or 'error'
   */
  getApiStatus: () => {
    return victronData.apiStatus;
  },
  
  /**
   * Get when data was last updated
   * @returns {Date} Timestamp of last update
   */
  getLastUpdate: () => {
    return victronData.lastUpdate;
  },
  
  /**
   * Try to connect to Victron API (not implemented yet)
   * @returns {Promise<boolean>} Success status
   */
  connectToApi: async () => {
    console.log("Real API connection not implemented. Using simulation data.");
    return true;
  },
  
  /**
   * Get current connection configuration
   * @returns {Object} Current configuration
   */
  getConfiguration: () => {
    return {
      host: CONFIG.HOST,
      refreshInterval: CONFIG.REFRESH_INTERVAL,
      connectionStatus: connectionStatus,
      simulationEnabled: simulateChangingData
    };
  },
  
  /**
   * Update configuration
   * @param {Object} newConfig - New configuration values
   * @returns {Promise<boolean>} Success status
   */
  updateConfiguration: async (newConfig) => {
    if (newConfig.refreshInterval && newConfig.refreshInterval !== CONFIG.REFRESH_INTERVAL) {
      CONFIG.REFRESH_INTERVAL = newConfig.refreshInterval;
      
      // Update refresh interval
      if (dataRefreshInterval) {
        clearInterval(dataRefreshInterval);
        dataRefreshInterval = setInterval(fetchVictronData, CONFIG.REFRESH_INTERVAL);
      }
      
      if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = setInterval(simulateDataChanges, CONFIG.REFRESH_INTERVAL);
      }
    }
    
    return true;
  },
  
  /**
   * Close all connections and clean up
   */
  cleanup: async () => {
    // Clear intervals
    if (dataRefreshInterval) {
      clearInterval(dataRefreshInterval);
      dataRefreshInterval = null;
    }
    
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
    }
    
    return true;
  }
};

export default VictronEnergyService;