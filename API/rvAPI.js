import axios from 'axios';

// Set your Raspberry Pi's IP address and port
// You'll need to change this to your Raspberry Pi's actual IP on your network
const API_URL = 'http://192.168.8.200:3000/api';

// Create an instance of axios with the base URL
const api = axios.create({
  baseURL: API_URL,
  timeout: 5000, // 5 second timeout
});

// API service for RV Control
export const RVControlService = {
  // Get all available commands
  getCommands: async () => {
    try {
      const response = await api.get('/commands');
      return response.data;
    } catch (error) {
      console.error('Error fetching commands:', error);
      throw error;
    }
  },

  // Execute a predefined command
  executeCommand: async (command) => {
    try {
      const response = await api.post('/execute', { command });
      return response.data;
    } catch (error) {
      console.error(`Error executing command ${command}:`, error);
      throw error;
    }
  },

  // Execute a raw CAN command
  executeRawCommand: async (canCommand) => {
    try {
      const response = await api.post('/raw', { canCommand });
      return response.data;
    } catch (error) {
      console.error(`Error executing raw command ${canCommand}:`, error);
      throw error;
    }
  },

  // Get system status
  getStatus: async () => {
    try {
      const response = await api.get('/status');
      return response.data;
    } catch (error) {
      console.error('Error fetching system status:', error);
      throw error;
    }
  }
};

// Utility functions for common actions
export const RVControls = {
  // Lighting
  turnOnKitchenLight: () => RVControlService.executeCommand('kitchen_light_on'),
  turnOffKitchenLight: () => RVControlService.executeCommand('kitchen_light_off'),
  turnOnBedroomLight: () => RVControlService.executeCommand('bedroom_light_on'),
  turnOffBedroomLight: () => RVControlService.executeCommand('bedroom_light_off'),
  turnOnBathroomLight: () => RVControlService.executeCommand('bathroom_light_on'),
  turnOffBathroomLight: () => RVControlService.executeCommand('bathroom_light_off'),

  setHighFanSpeed: () => RVControlService.executeCommand('high_fan'),
  setMediumFanSpeed: () => RVControlService.executeCommand('medium_fan'),
  // Low fan speed placeholder - will be updated when commands are available
  setLowFanSpeed: () => console.log('Low fan speed commands not yet available'),

  // Awning
  extendAwning: () => RVControlService.executeCommand('awning_extend'),
  retractAwning: () => RVControlService.executeCommand('awning_retract'),

  // Climate
  turnOnAC: () => RVControlService.executeCommand('ac_on'),
  turnOffAC: () => RVControlService.executeCommand('ac_off'),
  turnOnHeater: () => RVControlService.executeCommand('heater_on'),
  turnOffHeater: () => RVControlService.executeCommand('heater_off'),

  // Water systems
  turnOnWaterPump: () => RVControlService.executeCommand('water_pump_on'),
  turnOffWaterPump: () => RVControlService.executeCommand('water_pump_off'),
  turnOnWaterHeater: () => RVControlService.executeCommand('water_heater_on'),
  turnOffWaterHeater: () => RVControlService.executeCommand('water_heater_off'),

   // Add these thermostat controls
   increaseTemperature: () => RVControlService.executeCommand('temp_increase'),
   decreaseTemperature: () => RVControlService.executeCommand('temp_decrease'),
   
   // Climate presets
   setCoolingMode: () => RVControlService.executeCommand('cool_setting'),
   setFurnaceMode: () => RVControlService.executeCommand('furnace_setting'),
   setNightMode: () => RVControlService.executeCommand('night_setting'),
   setDehumidifyMode: () => RVControlService.executeCommand('dehumid_setting'),
   setToeKickMode: () => RVControlService.executeCommand('toe_kick_setting'),
   
};

export default RVControls;