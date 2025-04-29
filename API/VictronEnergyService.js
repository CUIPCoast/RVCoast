// API/VictronEnergyService.js - Updated with fallback simulation
import { VictronAPI } from './VictronAPI';

// Configuration
const CONFIG = {
  // Refresh interval in ms
  REFRESH_INTERVAL: 5000
};

// Data storage for simulated Victron data (for when API is unavailable)
let simulatedData = {
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

// Data storage for cached actual Victron data
let victronData = null;

// Connection status
let connectionStatus = {
  connected: false,
  lastAttempt: null,
  lastSuccess: null,
  failCount: 0,
  apiAvailable: false
};

// Refresh interval ID
let dataRefreshInterval = null;

// Flag to use simulation when API is unavailable
let useSimulation = true;

// Randomly simulate changing values to make the UI more realistic
const simulateChangingData = () => {
  // Randomly determine if PV is active
  const isPVActive = Math.random() > 0.3; // 70% chance of solar being active
  
  // Simulate PV charger fluctuations
  simulatedData.pvCharger.power = isPVActive ? 300 + Math.floor(Math.random() * 100) : 0;
  simulatedData.pvCharger.state = isPVActive ? 'charging' : 'idle';
  
  // Simulate battery changes based on PV status
  if (isPVActive && simulatedData.battery.soc < 100) {
    // When PV is active and battery is not full, simulate charging
    simulatedData.battery.soc = Math.min(100, simulatedData.battery.soc + 0.1);
    simulatedData.battery.current = 2 + (Math.random() * 1);
    simulatedData.battery.power = 25 + Math.floor(Math.random() * 10);
    simulatedData.battery.state = 'charging';
  } else {
    // Otherwise simulate discharging
    simulatedData.battery.soc = Math.max(5, simulatedData.battery.soc - 0.1);
    simulatedData.battery.current = -(2 + Math.random() * 1);
    simulatedData.battery.power = -(25 + Math.floor(Math.random() * 10));
    simulatedData.battery.state = 'discharging';
  }
  
  // Update voltage based on SoC (simplified model)
  simulatedData.battery.voltage = 12.2 + (simulatedData.battery.soc / 100) * 1.6;
  
  // Simulate AC load changes
  simulatedData.acLoads.power = 100 + Math.floor(Math.random() * 50);
  
  // Update DC system power based on battery power (simplified)
  simulatedData.dcSystem.power = Math.abs(simulatedData.battery.power);
  simulatedData.dcSystem.source = isPVActive ? 'solar' : 'battery';
  
  // Update system overview based on simulated values
  simulatedData.systemOverview.state = isPVActive ? 'Charging' : 'Inverting';
  
  // Simulate time to go based on battery state and SoC
  if (simulatedData.battery.state === 'discharging') {
    const hours = Math.floor(simulatedData.battery.soc / 10);
    const minutes = Math.floor(Math.random() * 60);
    simulatedData.battery.timeToGo = `${hours}:${minutes.toString().padStart(2, '0')}`;
  } else {
    const timeToFull = Math.floor((100 - simulatedData.battery.soc) / 5);
    simulatedData.battery.timeToGo = `${timeToFull}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`;
  }
  
  // Update last update timestamp
  simulatedData.lastUpdate = new Date();
};

// Simulation timer
let simulationInterval = null;

/**
 * Start simulation timer
 */
const startSimulation = () => {
  if (!simulationInterval) {
    console.log('Starting Victron data simulation');
    simulationInterval = setInterval(simulateChangingData, CONFIG.REFRESH_INTERVAL);
    useSimulation = true;
  }
};

/**
 * Stop simulation timer
 */
const stopSimulation = () => {
  if (simulationInterval) {
    console.log('Stopping Victron data simulation');
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
};

/**
 * Check if the API is available
 * @returns {Promise<boolean>} True if API is available
 */
const checkApiAvailability = async () => {
  try {
    // Check if the API is available
    connectionStatus.apiAvailable = await VictronAPI.checkApiAvailable();
    console.log('Victron API available:', connectionStatus.apiAvailable);
    return connectionStatus.apiAvailable;
  } catch (error) {
    console.error('Error checking API availability:', error);
    connectionStatus.apiAvailable = false;
    return false;
  }
};

/**
 * Fetch data from Victron API
 * @returns {Promise<boolean>} Success status
 */
const fetchVictronData = async () => {
  // If we're in simulation mode or the API is not available, don't try to fetch
  if (useSimulation || !connectionStatus.apiAvailable) {
    simulateChangingData();
    return true;
  }

  try {
    connectionStatus.lastAttempt = new Date();
    
    // Get all data from the API
    const data = await VictronAPI.getAllData();
    
    // Update the cached data
    victronData = data;
    
    // Update connection status
    connectionStatus.connected = true;
    connectionStatus.lastSuccess = new Date();
    connectionStatus.failCount = 0;
    
    return true;
  } catch (error) {
    console.error('Error fetching Victron data:', error);
    
    connectionStatus.connected = false;
    connectionStatus.failCount++;
    
    // If too many failures, check API availability and enable simulation if needed
    if (connectionStatus.failCount > 3) {
      const apiAvailable = await checkApiAvailability();
      if (!apiAvailable) {
        console.log('API not available after multiple failures, enabling simulation');
        useSimulation = true;
        startSimulation();
      }
    }
    
    // Always return success if we're in simulation mode
    if (useSimulation) {
      simulateChangingData();
      return true;
    }
    
    // If we have no cached data, return failure
    if (!victronData && !useSimulation) {
      return false;
    }
    
    // Otherwise, we can still use the cached data
    return true;
  }
};

/**
 * Service to interact with Victron Energy Cerbo GX
 */
export const VictronEnergyService = {
  /**
   * Initialize the service
   * @returns {Promise<boolean>} Success status
   */
  initialize: async () => {
    try {
      console.log('Initializing VictronEnergyService');
      
      // Check if the API is available
      const apiAvailable = await checkApiAvailability();
      
      if (!apiAvailable) {
        console.log('Victron API not available, using simulation');
        useSimulation = true;
        startSimulation();
      } else {
        console.log('Victron API available, using real data');
        useSimulation = false;
        stopSimulation();
      }
      
      // Get initial data
      await fetchVictronData();
      
      // Set up periodic refresh
      if (!dataRefreshInterval) {
        dataRefreshInterval = setInterval(fetchVictronData, CONFIG.REFRESH_INTERVAL);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Victron service:', error);
      
      // Fall back to simulation
      console.log('Falling back to simulation mode');
      useSimulation = true;
      startSimulation();
      
      return true; // Still return true since we can use simulation
    }
  },
  
  /**
   * Get current battery status
   * @returns {Promise<Object>} Battery data including SOC, voltage, current
   */
  getBatteryStatus: async () => {
    if (useSimulation) {
      return simulatedData.battery;
    }
    
    try {
      // Try to get fresh data
      const data = await VictronAPI.getBatteryStatus();
      // Update cached data
      if (victronData) victronData.battery = data;
      return data;
    } catch (error) {
      console.error('Error getting battery status:', error);
      
      // Fall back to cached or simulated data
      if (victronData && victronData.battery) {
        return victronData.battery;
      }
      return simulatedData.battery;
    }
  },

  /**
   * Get current AC loads information
   * @returns {Promise<Object>} AC loads data
   */
  getACLoads: async () => {
    if (useSimulation) {
      return simulatedData.acLoads;
    }
    
    try {
      // Try to get fresh data
      const data = await VictronAPI.getACLoadsData();
      // Update cached data
      if (victronData) victronData.acLoads = data;
      return data;
    } catch (error) {
      console.error('Error getting AC loads data:', error);
      
      // Fall back to cached or simulated data
      if (victronData && victronData.acLoads) {
        return victronData.acLoads;
      }
      return simulatedData.acLoads;
    }
  },

  /**
   * Get current PV (solar) charger information
   * @returns {Promise<Object>} PV charger data
   */
  getPVCharger: async () => {
    if (useSimulation) {
      return simulatedData.pvCharger;
    }
    
    try {
      // Try to get fresh data
      const data = await VictronAPI.getPVChargerData();
      // Update cached data
      if (victronData) victronData.pvCharger = data;
      return data;
    } catch (error) {
      console.error('Error getting PV charger data:', error);
      
      // Fall back to cached or simulated data
      if (victronData && victronData.pvCharger) {
        return victronData.pvCharger;
      }
      return simulatedData.pvCharger;
    }
  },

  /**
   * Get DC system information
   * @returns {Promise<Object>} DC system data
   */
  getDCSystem: async () => {
    if (useSimulation) {
      return simulatedData.dcSystem;
    }
    
    try {
      // Try to get fresh data
      const data = await VictronAPI.getDCSystemData();
      // Update cached data
      if (victronData) victronData.dcSystem = data;
      return data;
    } catch (error) {
      console.error('Error getting DC system data:', error);
      
      // Fall back to cached or simulated data
      if (victronData && victronData.dcSystem) {
        return victronData.dcSystem;
      }
      return simulatedData.dcSystem;
    }
  },

  /**
   * Get system overview including hub status
   * @returns {Promise<Object>} System overview data
   */
  getSystemOverview: async () => {
    if (useSimulation) {
      return simulatedData.systemOverview;
    }
    
    try {
      // Try to get fresh data
      const data = await VictronAPI.getSystemOverview();
      // Update cached data
      if (victronData) victronData.systemOverview = data;
      return data;
    } catch (error) {
      console.error('Error getting system overview:', error);
      
      // Fall back to cached or simulated data
      if (victronData && victronData.systemOverview) {
        return victronData.systemOverview;
      }
      return simulatedData.systemOverview;
    }
  },

  /**
   * Get tank level information
   * @returns {Promise<Array>} Array of tank data
   */
  getTanks: async () => {
    // Fall back to simulated data
    return simulatedData.tanks;
  },

  /**
   * Get all system data in a single request
   * @returns {Promise<Object>} Comprehensive system data
   */
  getAllData: async () => {
    try {
      // If using simulation, return simulated data
      if (useSimulation) {
        simulateChangingData();
        return {
          battery: simulatedData.battery,
          acLoads: simulatedData.acLoads,
          pvCharger: simulatedData.pvCharger,
          dcSystem: simulatedData.dcSystem,
          systemOverview: simulatedData.systemOverview,
          tanks: simulatedData.tanks,
          timestamp: new Date().toISOString(),
          refreshInterval: CONFIG.REFRESH_INTERVAL / 1000,
          apiStatus: 'simulation'
        };
      }
      
      // Otherwise try to fetch from API
      if (connectionStatus.apiAvailable) {
        const data = await VictronAPI.getAllData();
        victronData = data;
        
        return {
          battery: data.battery,
          acLoads: data.acLoads,
          pvCharger: data.pvCharger,
          dcSystem: data.dcSystem,
          systemOverview: data.systemOverview,
          tanks: data.tanks || [],
          timestamp: new Date().toISOString(),
          refreshInterval: CONFIG.REFRESH_INTERVAL / 1000,
          apiStatus: 'connected'
        };
      }
      
      // If we have cached data, return it
      if (victronData) {
        return {
          battery: victronData.battery,
          acLoads: victronData.acLoads,
          pvCharger: victronData.pvCharger,
          dcSystem: victronData.dcSystem,
          systemOverview: victronData.systemOverview,
          tanks: victronData.tanks || [],
          timestamp: victronData.timestamp || new Date().toISOString(),
          refreshInterval: CONFIG.REFRESH_INTERVAL / 1000,
          apiStatus: 'cached'
        };
      }
      
      // Fallback to simulation as a last resort
      useSimulation = true;
      startSimulation();
      simulateChangingData();
      
      return {
        battery: simulatedData.battery,
        acLoads: simulatedData.acLoads,
        pvCharger: simulatedData.pvCharger,
        dcSystem: simulatedData.dcSystem,
        systemOverview: simulatedData.systemOverview,
        tanks: simulatedData.tanks,
        timestamp: new Date().toISOString(),
        refreshInterval: CONFIG.REFRESH_INTERVAL / 1000,
        apiStatus: 'simulation'
      };
    } catch (error) {
      console.error('Error getting all Victron data:', error);
      
      // If API fails, switch to simulation mode
      useSimulation = true;
      startSimulation();
      
      return {
        battery: simulatedData.battery,
        acLoads: simulatedData.acLoads,
        pvCharger: simulatedData.pvCharger,
        dcSystem: simulatedData.dcSystem,
        systemOverview: simulatedData.systemOverview,
        tanks: simulatedData.tanks,
        timestamp: new Date().toISOString(),
        refreshInterval: CONFIG.REFRESH_INTERVAL / 1000,
        apiStatus: 'simulation'
      };
    }
  },
  
  /**
   * Toggle data simulation
   * @param {boolean} enable Whether to enable simulation
   */
  toggleSimulation: async (enable) => {
    useSimulation = enable;
    
    if (enable) {
      startSimulation();
    } else {
      stopSimulation();
      
      // Check if API is available when disabling simulation
      await checkApiAvailability();
      
      if (!connectionStatus.apiAvailable) {
        // If API is not available, go back to simulation
        console.log('API not available, re-enabling simulation');
        useSimulation = true;
        startSimulation();
      }
    }
    
    return useSimulation;
  },
  
  /**
   * Check API connection status
   * @returns {string} API status: 'connected', 'simulation', or 'error'
   */
  getApiStatus: () => {
    if (useSimulation) {
      return 'simulation';
    }
    
    if (connectionStatus.connected) {
      return 'connected';
    }
    
    return 'error';
  },
  
  /**
   * Get when data was last updated
   * @returns {Date} Timestamp of last update
   */
  getLastUpdate: () => {
    if (useSimulation) {
      return simulatedData.lastUpdate;
    }
    
    return connectionStatus.lastSuccess || new Date();
  },
  
  /**
   * Try to connect to Victron API
   * @returns {Promise<boolean>} Success status
   */
  connectToApi: async () => {
    try {
      // First check if API is available
      const apiAvailable = await checkApiAvailability();
      
      if (!apiAvailable) {
        console.log('API not available, cannot connect');
        useSimulation = true;
        startSimulation();
        return false;
      }
      
      // Try to reconnect
      await VictronAPI.reconnect();
      useSimulation = false;
      stopSimulation();
      
      // Fetch initial data
      await fetchVictronData();
      
      return true;
    } catch (error) {
      console.error('Error connecting to Victron API:', error);
      
      // Fall back to simulation
      useSimulation = true;
      startSimulation();
      
      return false;
    }
  },
  
  /**
   * Get current connection configuration
   * @returns {Object} Current configuration
   */
  getConfiguration: () => {
    return {
      refreshInterval: CONFIG.REFRESH_INTERVAL,
      connectionStatus,
      simulationEnabled: useSimulation
    };
  },
  
  /**
   * Update configuration
   * @param {Object} newConfig - New configuration values
   * @returns {Promise<boolean>} Success status
   */
  updateConfiguration: async (newConfig) => {
    try {
      // Update local configuration
      if (newConfig.refreshInterval && newConfig.refreshInterval !== CONFIG.REFRESH_INTERVAL) {
        CONFIG.REFRESH_INTERVAL = newConfig.refreshInterval;
        
        // Update refresh interval
        if (dataRefreshInterval) {
          clearInterval(dataRefreshInterval);
          dataRefreshInterval = setInterval(fetchVictronData, CONFIG.REFRESH_INTERVAL);
        }
        
        // Update simulation interval if active
        if (simulationInterval) {
          clearInterval(simulationInterval);
          simulationInterval = setInterval(simulateChangingData, CONFIG.REFRESH_INTERVAL);
        }
      }
      
      // If API is available, update remote configuration
      if (connectionStatus.apiAvailable && !useSimulation) {
        const apiConfig = {};
        
        // Only send API-specific config
        if (newConfig.host) apiConfig.host = newConfig.host;
        if (newConfig.port) apiConfig.port = newConfig.port;
        if (newConfig.timeout) apiConfig.timeout = newConfig.timeout;
        if (newConfig.pollInterval) apiConfig.pollInterval = newConfig.pollInterval;
        if (newConfig.debug !== undefined) apiConfig.debug = newConfig.debug;
        
        // Only update API config if there are values to update
        if (Object.keys(apiConfig).length > 0) {
          await VictronAPI.updateConfiguration(apiConfig);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error updating configuration:', error);
      return false;
    }
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

// Auto-initialize when imported
VictronEnergyService.initialize().catch(error => {
  console.error('Failed to initialize VictronEnergyService:', error);
  // Always ensure simulation is running if initialization fails
  useSimulation = true;
  startSimulation();
});

export default VictronEnergyService;