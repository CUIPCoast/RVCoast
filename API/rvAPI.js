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
  // Lighting toggles
  toggleKitchenLights: () => RVControlService.executeCommand('kitchen_lights_toggle'),
  toggleBathroomLight: () => RVControlService.executeCommand('bath_light_toggle'),
  toggleBedroomLight: () => RVControlService.executeCommand('bed_ovhd_light_toggle'),
  toggleVibeLight: () => RVControlService.executeCommand('vibe_light_toggle'),
  toggleVanityLight: () => RVControlService.executeCommand('vanity_light_toggle'),
  toggleAwningLights: () => RVControlService.executeCommand('awning_lights_toggle'),
  toggleShowerLights: () => RVControlService.executeCommand('shower_lights_toggle'),
  toggleUnderCabinetLights: () => RVControlService.executeCommand('under_cab_lights_toggle'),
  toggleHitchLights: () => RVControlService.executeCommand('hitch_lights_toggle'),
  togglePorchLights: () => RVControlService.executeCommand('porch_lights_toggle'),
  toggleLeftReadingLights: () => RVControlService.executeCommand('left_reading_lights_toggle'),
  toggleRightReadingLights: () => RVControlService.executeCommand('right_reading_lights_toggle'),
  toggleDinetteLights: () => RVControlService.executeCommand('dinette_lights_toggle'),
  toggleStripLights: () => RVControlService.executeCommand('strip_lights_toggle'),
  
  // Main light controls
  allLightsOn: () => RVControlService.executeCommand('all_lights_on'),
  allLightsOff: () => RVControlService.executeCommand('all_lights_off'),
  
  // Fan controls
  toggleBathroomFan: () => RVControlService.executeCommand('bath_fan_toggle'),
  toggleBayVentFan: () => RVControlService.executeCommand('bay_vent_fan_toggle'),

  // AC Fan speed controls
  setHighFanSpeed: () => RVControlService.executeCommand('high_fan'),
  setMediumFanSpeed: () => RVControlService.executeCommand('medium_fan'),
  setLowFanSpeed: () => RVControlService.executeCommand('low_fan'),

  // Awning controls
  extendAwning: () => RVControlService.executeCommand('awning_extend'),
  retractAwning: () => RVControlService.executeCommand('awning_retract'),
  stopAwning: () => RVControlService.executeCommand('awning_stop'),

  // Bar lift controls
  barLiftUp: () => RVControlService.executeCommand('bar_lift_up'),
  barLiftDown: () => RVControlService.executeCommand('bar_lift_down'),

  // Water systems
  toggleWaterPump: () => RVControlService.executeCommand('water_pump_toggle'),
  toggleWaterHeater: () => RVControlService.executeCommand('water_heater_toggle'),

  // Thermostat controls
  increaseTemperature: () => RVControlService.executeCommand('temp_increase'),
  decreaseTemperature: () => RVControlService.executeCommand('temp_decrease'),
   
  // Climate presets
  setCoolingMode: () => RVControlService.executeCommand('cool_setting'),
  turnOffCooling: () => RVControlService.executeCommand('complete_cool_off'),
  setFurnaceOn: () => RVControlService.executeCommand('furnace_on'),
  setFurnaceOff: () => RVControlService.executeCommand('furnace_off'),
  setNightMode: () => RVControlService.executeCommand('night_setting'),
  setDehumidifyMode: () => RVControlService.executeCommand('dehumid_setting'),
  setToeKickMode: () => RVControlService.executeCommand('toe_kick'),
  turnOffToeKick: () => RVControlService.executeCommand('toe_kick_off'),
  setAutoMode: () => RVControlService.executeCommand('auto_setting'),
};

export default RVControls;