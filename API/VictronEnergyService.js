// API/VictronEnergyService.js
import axios from 'axios';

// The Victron Cerbo GX IP address
const CERBO_IP = '192.168.8.242';

// Create axios instance for Victron API
const victronApi = axios.create({
  baseURL: `http://${CERBO_IP}`,
  timeout: 5000, // 5 second timeout
});

// Data storage for Victron data
const victronData = {
  battery: {
    soc: 50, // State of charge (percentage)
    voltage: 13.1, // Battery voltage
    current: -5.7, // Negative value means discharging, positive means charging
    power: -75, // Power in watts (negative = discharge)
    state: 'discharging', // Battery state
    timeToGo: '11:02', // Time remaining at current usage rate
  },
  acLoads: {
    power: 46, // Watts
    lines: ['L1', 'L2'], // Active lines
  },
  pvCharger: {
    power: 0, // Current power generation in watts
    dailyYield: 0, // kWh generated today
    state: 'idle', // Charger state
  },
  dcSystem: {
    power: 11, // Current DC power usage in watts
    source: 'battery', // Power source (e.g., 'battery', 'solar')
  },
  systemOverview: {
    name: 'HUB-1',
    state: 'Inverting', // System state
    acInput: '--', // AC input state
    mode: 'ON', // AC mode
    acLimit: 50.0, // AC current limit in amps
  },
  tanks: [],
  lastUpdate: new Date(),
  apiStatus: 'fallback', // 'connected', 'fallback', 'error'
};

// Configuration value to simulate changing data
let simulateChangingData = true;

/**
 * Function to simulate changing data values
 * This provides a more realistic test experience when real API isn't available
 */
const simulateDataChanges = () => {
  if (!simulateChangingData) return;
  
  // Simulate battery discharge
  victronData.battery.soc = Math.max(5, victronData.battery.soc - 0.1);
  victronData.battery.power = -75 - Math.floor(Math.random() * 15);
  victronData.battery.current = -5.7 - (Math.random() * 0.5);
  
  // Simulate PV charger fluctuations
  const isPVActive = Math.random() > 0.3; // 70% chance of solar being active
  victronData.pvCharger.power = isPVActive ? Math.floor(Math.random() * 200) : 0;
  victronData.pvCharger.state = isPVActive ? 'charging' : 'idle';
  
  // Simulate AC load changes
  victronData.acLoads.power = 40 + Math.floor(Math.random() * 20);
  
  // Update system overview based on simulated values
  victronData.systemOverview.state = victronData.pvCharger.power > 0 ? 'Charging' : 'Inverting';
  
  victronData.lastUpdate = new Date();
};

// Start the simulation for changing data
const simulationInterval = setInterval(simulateDataChanges, 5000);

/**
 * Try to fetch data from the Victron API (for future implementation)
 */
const attemptDataFetch = async () => {
  try {
    console.log('Connection to Victron API not implemented yet');
    // This is where we'll implement the API connection when we find the right approach
    return false;
  } catch (error) {
    console.error('Error connecting to Victron API:', error);
    return false;
  }
};

/**
 * Service to interact with Victron Energy Cerbo GX
 */
export const VictronEnergyService = {
  /**
   * Get current battery status
   * @returns {Promise<Object>} Battery data including SOC, voltage, current
   */
  getBatteryStatus: async () => {
    return victronData.battery;
  },

  /**
   * Get current AC loads information
   * @returns {Promise<Object>} AC loads data
   */
  getACLoads: async () => {
    return victronData.acLoads;
  },

  /**
   * Get current PV (solar) charger information
   * @returns {Promise<Object>} PV charger data
   */
  getPVCharger: async () => {
    return victronData.pvCharger;
  },

  /**
   * Get DC system information
   * @returns {Promise<Object>} DC system data
   */
  getDCSystem: async () => {
    return victronData.dcSystem;
  },

  /**
   * Get system overview including hub status
   * @returns {Promise<Object>} System overview data
   */
  getSystemOverview: async () => {
    return victronData.systemOverview;
  },

  /**
   * Get tank level information
   * @returns {Promise<Array>} Array of tank data
   */
  getTanks: async () => {
    return victronData.tanks;
  },

  /**
   * Get all system data in a single request
   * @returns {Promise<Object>} Comprehensive system data
   */
  getAllData: async () => {
    return {
      battery: victronData.battery,
      acLoads: victronData.acLoads,
      pvCharger: victronData.pvCharger,
      dcSystem: victronData.dcSystem,
      systemOverview: victronData.systemOverview,
      tanks: victronData.tanks,
      timestamp: new Date().toISOString(),
      refreshInterval: 5,
      apiStatus: victronData.apiStatus
    };
  },
  
  /**
   * Toggle data simulation
   * @param {boolean} enable Whether to enable simulation
   */
  toggleSimulation: (enable) => {
    simulateChangingData = enable;
    console.log(`Data simulation ${enable ? 'enabled' : 'disabled'}`);
    return simulateChangingData;
  },
  
  /**
   * Check API connection status
   * @returns {string} API status: 'connected', 'fallback', or 'error'
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
   * Try to connect to Victron API
   * @returns {Promise<boolean>} Success status
   */
  connectToApi: async () => {
    const success = await attemptDataFetch();
    victronData.apiStatus = success ? 'connected' : 'fallback';
    return success;
  },
  
  /**
   * Advanced option: use Modbus TCP to directly query the Victron devices
   * This would require a more complex implementation but provides more direct access
   * Refer to Victron Energy's Modbus-TCP documentation for specifics
   */
  queryModbusTCP: async (register, unit = 1) => {
    try {
      // This is a placeholder for a Modbus TCP implementation
      console.warn('Modbus TCP query not implemented');
      return null;
    } catch (error) {
      console.error('Error querying Modbus TCP:', error);
      return null;
    }
  }
};

export default VictronEnergyService;